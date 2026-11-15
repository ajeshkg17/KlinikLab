"""Bounds-based layout shared by the exporter and the existing-map repair.

Changes level instances only. Source meshes, materials and GLBs are preserved.
No save operation or image capture happens here.
"""
import math
import unreal

MAP_PATH = "/Game/KlinikLab/Maps/TreatmentRoom"


def vector_list(v):
    return [v.x, v.y, v.z]


def actors():
    return list(unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors())


def require_map():
    level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).get_current_level()
    if not level or not level.get_path_name().startswith(MAP_PATH + ".TreatmentRoom:"):
        raise RuntimeError("TreatmentRoom must be the current level")


def unique(label):
    found = [a for a in actors() if a.get_actor_label() == label]
    if len(found) != 1:
        raise RuntimeError("Expected exactly one actor: " + label)
    return found[0]


def mesh_bounds(items):
    boxes = []
    for a in items:
        if a.get_components_by_class(unreal.StaticMeshComponent):
            o, e = a.get_actor_bounds(False)
            boxes.append((vector_list(o-e), vector_list(o+e)))
    if not boxes:
        raise RuntimeError("No mesh bounds found")
    return {"min": [min(b[0][i] for b in boxes) for i in range(3)],
            "max": [max(b[1][i] for b in boxes) for i in range(3)]}


def descendants(root):
    result = []
    for a in actors():
        p = a
        while p:
            if p == root:
                result.append(a)
                break
            p = p.get_attach_parent_actor()
    return result


def bay_geometry():
    """Use named source anchors; fail if hierarchy is still distorted."""
    require_map()
    chair = unique("KlinikLabClinic_091-dental-chair")
    tray = unique("KlinikLabClinic_100-instrument-tray")
    divider = unique("KlinikLabClinic_083-corridor-wall-module").get_actor_location()
    front = unique("KlinikLabClinic_056-glazed-partition-module").get_actor_location()
    back = unique("KlinikLabClinic_064-corridor-wall-module").get_actor_location()
    floor = mesh_bounds([a for a in actors() if "clinical-floor-tile" in a.get_actor_label()])
    cb = mesh_bounds(descendants(chair))
    tb = mesh_bounds(descendants(tray))
    # Main tile body surface, excluding thin painted/detail layers.
    bodies = [a for a in actors() if a.get_actor_label().endswith("clinical-floor-tile_0")]
    surface = mesh_bounds(bodies)["max"][2]
    bay_min = [floor["min"][0], back.y, surface]
    bay_max = [divider.x, front.y, surface]
    if not (500 < bay_max[0]-bay_min[0] < 700 and 500 < bay_max[1]-bay_min[1] < 700):
        raise RuntimeError("Source bay bounds are inconsistent; inspect import hierarchy")
    if not (abs(cb["min"][2]-surface) < 2 and cb["max"][2]-cb["min"][2] < 200):
        raise RuntimeError("Chair is not intact and seated on the source floor")
    return {"bayMin": bay_min, "bayMax": bay_max, "floorBounds": floor,
            "floorSurface": surface, "chairBounds": cb, "trayBounds": tb,
            "chairPath": chair.get_path_name(), "trayPath": tray.get_path_name()}


def get_or_spawn(label, cls, loc):
    found = [a for a in actors() if a.get_actor_label() == label]
    if len(found) > 1:
        raise RuntimeError("Duplicate layout actor: " + label)
    a = found[0] if found else unreal.get_editor_subsystem(unreal.EditorActorSubsystem).spawn_actor_from_class(cls, loc)
    if a is None or not isinstance(a, cls):
        raise RuntimeError("Incorrect layout actor class: " + label)
    a.modify()
    a.set_actor_label(label)
    return a


def pawn_capsule():
    gm = unreal.EditorAssetLibrary.load_blueprint_class("/Game/FirstPerson/Blueprints/BP_FirstPersonGameMode")
    pawn = unreal.get_default_object(unreal.get_default_object(gm).get_editor_property("default_pawn_class"))
    return pawn.get_component_by_class(unreal.CapsuleComponent).get_scaled_capsule_size()


def _ensure_shell_actor(label, template_label, location, rotation, collision_profile,
                        collision_enabled, material_override=None):
    """Create or repair one map-local shell instance without editing its source asset."""
    source = unique(template_label)
    source_component = source.get_component_by_class(unreal.StaticMeshComponent)
    if source_component is None or source_component.get_editor_property("static_mesh") is None:
        raise RuntimeError("Shell template has no assigned static mesh: " + template_label)
    found = [a for a in actors() if a.get_actor_label() == label]
    if len(found) > 1:
        raise RuntimeError("Duplicate shell actor: " + label)
    if found:
        actor = found[0]
    else:
        editor_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        actor = editor_actors.duplicate_actor(source, source.get_world())
        if actor is None:
            raise RuntimeError("Could not duplicate shell template: " + template_label)
    actor.modify()
    actor.set_actor_label(label)
    actor.set_actor_location(location, False, True)
    actor.set_actor_rotation(rotation, True)
    actor.set_actor_scale3d(source.get_actor_scale3d())
    actor.set_actor_hidden_in_game(False)
    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    if component is None:
        raise RuntimeError("Shell instance lost its StaticMeshComponent: " + label)
    component.modify()
    component.set_static_mesh(source_component.get_editor_property("static_mesh"))
    component.set_visibility(True, True)
    component.set_editor_property("hidden_in_game", False)
    component.set_collision_profile_name(collision_profile)
    component.set_collision_enabled(collision_enabled)
    for index in range(component.get_num_materials()):
        material = material_override or source_component.get_material(index)
        if material is None:
            raise RuntimeError("Shell template has an unassigned material slot: " + template_label)
        component.set_material(index, material)
    return actor


def configure_treatment_room_shell(geometry=None):
    """Build a repeatable shell around the measured 600 cm treatment bay.

    Imported north/south door and glazed modules and the east solid wall already
    line up with the bay. The source leaves its west edge open; duplicate the
    existing solid wall assembly there and cap the room with existing clinical
    tile meshes assigned the existing white clinic material. Only actor
    instances change; imported mesh and material assets remain untouched.
    """
    require_map()
    geometry = geometry or bay_geometry()
    lo, hi, floor_z = geometry["bayMin"], geometry["bayMax"], geometry["floorSurface"]
    wall_templates = [
        ("Panel", "KlinikLabClinic_083-corridor-wall-module_0"),
        ("Skirting", "KlinikLabClinic_083-corridor-wall-module_1"),
        ("Accent", "KlinikLabClinic_083-corridor-wall-module_2"),
    ]
    wall_instances = []
    segment_count = int(round((hi[1] - lo[1]) / 200.0))
    if segment_count != 3 or abs((hi[1] - lo[1]) - 600.0) > 1.0:
        raise RuntimeError("Expected three existing 200 cm modules along the exposed bay side")
    for segment in range(segment_count):
        center_y = lo[1] + 100.0 + segment * 200.0
        for role, template_label in wall_templates:
            template = unique(template_label)
            template_location = template.get_actor_location()
            actor = _ensure_shell_actor(
                "KlinikLabShell_WestWall_Seg%02d_%s" % (segment + 1, role),
                template_label,
                unreal.Vector(lo[0], center_y, template_location.z),
                unreal.Rotator(pitch=0, yaw=90, roll=0),
                "BlockAll", unreal.CollisionEnabled.QUERY_AND_PHYSICS)
            wall_instances.append(actor.get_path_name())

    ceiling_template = "KlinikLabClinic_000-clinical-floor-tile_0"
    white = unreal.EditorAssetLibrary.load_asset(
        "/Game/KlinikLab/Imported/Clinic/whole-clinic-starter-v1-float32/Materials/white.white")
    if white is None:
        raise RuntimeError("Existing clinic white material is unavailable for the ceiling")
    ceiling_instances = []
    for row in range(3):
        for column in range(3):
            x = lo[0] + 100.0 + column * 200.0
            y = lo[1] + 100.0 + row * 200.0
            actor = _ensure_shell_actor(
                "KlinikLabShell_Ceiling_R%dC%d" % (row + 1, column + 1),
                ceiling_template,
                unreal.Vector(x, y, floor_z + 273.0),
                unreal.Rotator(pitch=0, yaw=0, roll=0),
                "NoCollision", unreal.CollisionEnabled.NO_COLLISION,
                material_override=white)
            ceiling_instances.append(actor.get_path_name())
    return {"success": True, "bounds": {"min": lo, "max": hi},
            "floorSurface": floor_z, "wallHeight": 270.0,
            "westWallModules": segment_count, "westWallActors": wall_instances,
            "ceilingTiles": len(ceiling_instances), "ceilingActors": ceiling_instances,
            "sourceAssetsModified": False}


def configure_treatment_room():
    geometry = bay_geometry()
    lo, hi, z = geometry["bayMin"], geometry["bayMax"], geometry["floorSurface"]
    # Clear aisle inside this source bay; distances are proportions of measured bay.
    spawn_x = lo[0] + (hi[0]-lo[0]) * (7.0/12.0)
    spawn_y = lo[1] + (hi[1]-lo[1]) * 0.25
    radius, half_height = pawn_capsule()
    start_loc = unreal.Vector(spawn_x, spawn_y, z + half_height + 3.0)
    cb, tb = geometry["chairBounds"], geometry["trayBounds"]
    target = [(cb["min"][i]+cb["max"][i]+tb["min"][i]+tb["max"][i])/4 for i in range(3)]
    yaw = math.degrees(math.atan2(target[1]-spawn_y, target[0]-spawn_x))
    start = get_or_spawn("KlinikLab_TreatmentRoom_PlayerStart", unreal.PlayerStart, start_loc)
    start.set_actor_location(start_loc, False, True)
    start.set_actor_rotation(unreal.Rotator(pitch=0, yaw=yaw, roll=0), True)
    slab = get_or_spawn("KlinikLab_Uncalibrated_Navigation_Floor", unreal.StaticMeshActor,
                        unreal.Vector((lo[0]+hi[0])/2, (lo[1]+hi[1])/2, z-10))
    slab.set_actor_location(unreal.Vector((lo[0]+hi[0])/2, (lo[1]+hi[1])/2, z-10), False, True)
    slab.set_actor_scale3d(unreal.Vector((hi[0]-lo[0]-20)/100, (hi[1]-lo[1]-20)/100, 0.2))
    slab.set_actor_hidden_in_game(True)
    c = slab.get_component_by_class(unreal.StaticMeshComponent)
    c.modify()
    c.set_static_mesh(unreal.EditorAssetLibrary.load_asset("/Engine/BasicShapes/Cube.Cube"))
    c.set_visibility(False, True)
    c.set_collision_profile_name("BlockAll")
    c.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
    # The existing directional/sky lights are now explicitly dynamic.
    for label, cls, intensity in [("KlinikLab_Key_Directional_Light", unreal.DirectionalLight, 500.0),
                                  ("KlinikLab_Sky_Light", unreal.SkyLight, 1.0)]:
        a = get_or_spawn(label, cls, unreal.Vector(0, 0, z+1200))
        comp = a.get_component_by_class(unreal.LightComponentBase)
        comp.modify()
        comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        comp.set_intensity(intensity)
        if cls == unreal.DirectionalLight:
            a.set_actor_rotation(unreal.Rotator(pitch=-45, yaw=-35, roll=0), True)
    lights = []
    # Reuse the imported ceiling-panel positions. Each is a small dynamic fill;
    # this avoids relying on baked lightmaps or an empty captured black sky.
    panels = [a for a in actors() if a.get_class().get_name() == "Actor"
              and a.get_actor_label().startswith("KlinikLabClinic_")
              and "ceiling-light-panel" in a.get_actor_label()]
    for panel in panels:
        loc = panel.get_actor_location()
        label = "KlinikLab_Fill_" + panel.get_actor_label().split("_", 1)[1]
        a = get_or_spawn(label, unreal.PointLight, unreal.Vector(loc.x, loc.y, loc.z-25))
        a.set_actor_location(unreal.Vector(loc.x, loc.y, loc.z-25), False, True)
        comp = a.get_component_by_class(unreal.PointLightComponent)
        comp.modify()
        comp.set_mobility(unreal.ComponentMobility.MOVABLE)
        comp.set_editor_property("intensity_units", unreal.LightUnits.LUMENS)
        comp.set_intensity(1800)
        comp.set_editor_property("attenuation_radius", 650.0)
        comp.set_editor_property("source_radius", 40.0)
        comp.set_cast_shadows(True)
        lights.append(a.get_path_name())
    if not lights:
        raise RuntimeError("Imported ceiling panel anchors missing")
    pp = get_or_spawn("KlinikLab_Exposure", unreal.PostProcessVolume, start_loc)
    pp.set_editor_property("unbound", True)
    settings = pp.get_editor_property("settings")
    settings.set_editor_property("override_auto_exposure_min_brightness", True)
    settings.set_editor_property("override_auto_exposure_max_brightness", True)
    # More highlight headroom and neutral compensation. These values are a
    # provisional balance until the live viewport receives visual acceptance.
    settings.set_editor_property("auto_exposure_min_brightness", 4.0)
    settings.set_editor_property("auto_exposure_max_brightness", 9.0)
    settings.set_editor_property("override_auto_exposure_bias", True)
    settings.set_editor_property("auto_exposure_bias", 0.0)
    pp.set_editor_property("settings", settings)
    glass = []
    for a in actors():
        for comp in a.get_components_by_class(unreal.StaticMeshComponent):
            mesh = comp.get_editor_property("static_mesh")
            if mesh is None or not mesh.get_path_name().startswith("/Game/KlinikLab/Imported/"):
                continue
            materials = [comp.get_material(i) for i in range(comp.get_num_materials())]
            if mesh.get_editor_property("nanite_settings").get_editor_property("enabled") and any(
                    m and m.get_blend_mode() not in (unreal.BlendMode.BLEND_OPAQUE, unreal.BlendMode.BLEND_MASKED)
                    for m in materials):
                a.modify()
                comp.modify()
                comp.set_editor_property("disallow_nanite", True)
                glass.append({"actor": a.get_path_name(), "component": comp.get_path_name(), "mesh": mesh.get_path_name()})
    wall_shell = configure_treatment_room_shell(geometry)
    # The level retains this camera when saved. Use the same chair/tray view as
    # the player with a slight downward angle; no camera actor or screenshot.
    editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    key = editor.get_active_viewport_config_key()
    editor.set_level_viewport_camera_info(unreal.Vector(spawn_x, spawn_y, z+160), unreal.Rotator(pitch=-12, yaw=yaw, roll=0), key)
    editor.set_level_viewport_fov(100.0, key)
    # Keep the user's realtime setting. UE 5.9's subsystem setter removes a
    # named override and emits an ensure if that override does not exist.
    editor.editor_invalidate_viewports()
    return {"geometry": geometry, "start": vector_list(start_loc), "yaw": yaw,
            "capsuleRadius": radius, "capsuleHalfHeight": half_height,
            "fillLights": lights, "glassComponents": glass, "wallShell": wall_shell,
            "sourceAssetsModified": False}


def _actor_aabb(actor):
    origin, extent = actor.get_actor_bounds(False)
    return {"min": [origin.x-extent.x, origin.y-extent.y, origin.z-extent.z],
            "max": [origin.x+extent.x, origin.y+extent.y, origin.z+extent.z]}


def _aabb_overlaps(a, b):
    return all(a["max"][i] > b["min"][i] and b["max"][i] > a["min"][i]
               for i in range(3))


def _mesh_component_report(actor):
    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    if component is None:
        return None
    mesh = component.get_editor_property("static_mesh")
    materials = [component.get_material(i) for i in range(component.get_num_materials())]
    return {"component": component, "mesh": mesh,
            "materials": materials,
            "materialPaths": [m.get_path_name() if m else None for m in materials],
            "visible": bool(component.get_editor_property("visible")),
            "hiddenInGame": bool(component.get_editor_property("hidden_in_game")),
            "collisionProfile": str(component.get_collision_profile_name()),
            "collisionEnabled": component.get_collision_enabled()}


def validate_treatment_room_shell(geometry=None):
    """Check full room enclosure, assignments, visibility, collision and clear areas."""
    geometry = geometry or bay_geometry()
    lo, hi, floor_z = geometry["bayMin"], geometry["bayMax"], geometry["floorSurface"]
    wall_actors = [a for a in actors() if a.get_actor_label().startswith("KlinikLabShell_WestWall_")]
    ceiling_actors = [a for a in actors() if a.get_actor_label().startswith("KlinikLabShell_Ceiling_")]
    wall_panels = sorted([a for a in wall_actors if a.get_actor_label().endswith("_Panel")],
                         key=lambda a: a.get_actor_label())
    wall_components = [_mesh_component_report(a) for a in wall_actors]
    ceiling_components = [_mesh_component_report(a) for a in ceiling_actors]
    wall_components = [item for item in wall_components if item]
    ceiling_components = [item for item in ceiling_components if item]

    west_module_labels = ["KlinikLabClinic_083-corridor-wall-module_0",
                          "KlinikLabClinic_084-corridor-wall-module_0",
                          "KlinikLabClinic_085-corridor-wall-module_0"]
    north_south_labels = [
        "KlinikLabClinic_056-glazed-partition-module_0",
        "KlinikLabClinic_057-surgery-door-module_0",
        "KlinikLabClinic_058-glazed-partition-module_0",
        "KlinikLabClinic_064-corridor-wall-module_0",
        "KlinikLabClinic_065-surgery-door-module-open_0",
        "KlinikLabClinic_066-glazed-partition-module_0",
    ]
    perimeter_labels = west_module_labels + north_south_labels
    boundary_modules = []
    for label in perimeter_labels:
        actor = unique(label)
        item = _mesh_component_report(actor)
        if item is None or item["mesh"] is None:
            boundary_modules.append({"label": label, "valid": False, "reason": "missing mesh"})
            continue
        bounds = _actor_aabb(actor)
        height = bounds["max"][2]-bounds["min"][2]
        assigned = bool(item["materials"]) and all(item["materials"])
        visible = item["visible"] and not item["hiddenInGame"]
        collision = (item["collisionProfile"] == "BlockAll" and
                     item["collisionEnabled"] == unreal.CollisionEnabled.QUERY_AND_PHYSICS)
        boundary_modules.append({"label": label, "mesh": item["mesh"].get_path_name(),
                                 "bounds": bounds, "height": height,
                                 "materials": item["materialPaths"],
                                 "visible": visible, "collision": collision,
                                 "valid": (abs(height-270.0) <= 2.0 and assigned and visible and collision)})

    wall_intervals = []
    wall_placement = len(wall_panels) == 3
    for actor in wall_panels:
        bounds = _actor_aabb(actor)
        x_center = (bounds["min"][0]+bounds["max"][0])/2.0
        height = bounds["max"][2]-bounds["min"][2]
        y_span = bounds["max"][1]-bounds["min"][1]
        wall_intervals.append((bounds["min"][1], bounds["max"][1]))
        wall_placement = (wall_placement and abs(x_center-lo[0]) <= 1.0
                          and abs(bounds["min"][2]-floor_z) <= 1.0
                          and abs((bounds["max"][2]-floor_z)-270.0) <= 2.0
                          and 198.0 <= y_span <= 202.0)
    wall_intervals.sort()
    wall_gaps = [wall_intervals[i+1][0]-wall_intervals[i][1]
                 for i in range(len(wall_intervals)-1)] if len(wall_intervals) == 3 else [9999.0]
    wall_coverage = (len(wall_intervals) == 3 and
                     abs(wall_intervals[0][0]-lo[1]) <= 1.0 and
                     abs(wall_intervals[-1][1]-hi[1]) <= 1.0 and
                     all(-1.0 <= gap <= 1.0 for gap in wall_gaps))
    west_wall_state = (len(wall_actors) == 9 and len(wall_components) == 9 and
                       all(item["mesh"] is not None and item["visible"] and not item["hiddenInGame"]
                           and bool(item["materials"]) and all(item["materials"])
                           and item["collisionProfile"] == "BlockAll"
                           and item["collisionEnabled"] == unreal.CollisionEnabled.QUERY_AND_PHYSICS
                           for item in wall_components))

    ceiling_box = {"min": [lo[0], lo[1], floor_z+270.0],
                   "max": [hi[0], hi[1], floor_z+276.0]}
    actual_ceiling = mesh_bounds(ceiling_actors) if ceiling_actors else None
    white_path = "/Game/KlinikLab/Imported/Clinic/whole-clinic-starter-v1-float32/Materials/white.white"
    ceiling_state = (len(ceiling_actors) == 9 and len(ceiling_components) == 9 and
                     all(item["mesh"] is not None and item["visible"] and not item["hiddenInGame"]
                         and item["materialPaths"] and all(path == white_path for path in item["materialPaths"])
                         and item["collisionEnabled"] == unreal.CollisionEnabled.NO_COLLISION
                         for item in ceiling_components))
    ceiling_placement = bool(actual_ceiling) and all(
        abs(actual_ceiling[side][axis]-ceiling_box[side][axis]) <= 1.0
        for side in ("min", "max") for axis in range(3))

    glass_labels = ["KlinikLabClinic_056-glazed-partition-module_1",
                    "KlinikLabClinic_058-glazed-partition-module_1",
                    "KlinikLabClinic_066-glazed-partition-module_1"]
    glazing = []
    for label in glass_labels:
        actor = unique(label)
        item = _mesh_component_report(actor)
        glazing.append({"label": label, "mesh": item["mesh"].get_path_name() if item and item["mesh"] else None,
                        "materials": item["materialPaths"] if item else [],
                        "visible": bool(item and item["visible"] and not item["hiddenInGame"]),
                        "assigned": bool(item and item["materials"] and all(item["materials"]))})
    glazed_present = all(g["visible"] and g["assigned"] and
                         any(path and path.endswith("/Materials/glass.glass")
                             for path in (g["materials"] or [])) for g in glazing)
    door_labels = ["KlinikLabClinic_057-surgery-door-module_door-a_white",
                   "KlinikLabClinic_065-surgery-door-module-open_door-a"]
    doors = []
    for label in door_labels:
        actor = unique(label)
        item = _mesh_component_report(actor)
        doors.append({"label": label, "visible": bool(item and item["visible"] and not item["hiddenInGame"]),
                      "assigned": bool(item and item["materials"] and all(item["materials"]))})
    door_assets_present = all(d["visible"] and d["assigned"] for d in doors)

    player_start = unique("KlinikLab_TreatmentRoom_PlayerStart")
    pos = player_start.get_actor_location()
    radius, half_height = pawn_capsule()
    target_boxes = {
        "playerCapsule": {"min": [pos.x-radius, pos.y-radius, pos.z-half_height],
                          "max": [pos.x+radius, pos.y+radius, pos.z+half_height]},
        "chair": geometry["chairBounds"],
        "tray": geometry["trayBounds"],
    }
    shell_clearance = []
    for actor in wall_actors + ceiling_actors:
        bounds = _actor_aabb(actor)
        for name, target in target_boxes.items():
            if _aabb_overlaps(bounds, target):
                shell_clearance.append({"shellActor": actor.get_actor_label(), "blockedArea": name})

    open_door_clearance = []
    world = player_start.get_world()
    for y in (-2380.0, -2400.0, -2420.0):
        point = unreal.Vector(-700.0, y, floor_z+half_height+3.0)
        hits = unreal.SystemLibrary.capsule_overlap_actors(
            world, point, radius, half_height,
            [unreal.ObjectTypeQuery.ECC_WORLD_STATIC, unreal.ObjectTypeQuery.ECC_WORLD_DYNAMIC],
            unreal.Actor, [player_start]) or []
        open_door_clearance.append({"position": vector_list(point),
                                    "overlaps": [actor.get_actor_label() for actor in hits]})
    circulation_clear = all(not p["overlaps"] for p in open_door_clearance)

    all_boundary_valid = len(boundary_modules) == 9 and all(m["valid"] for m in boundary_modules)
    success = (west_wall_state and wall_placement and wall_coverage and ceiling_state and
               ceiling_placement and all_boundary_valid and glazed_present and door_assets_present and
               not shell_clearance and circulation_clear)
    return {"success": bool(success), "bayBounds": {"min": lo, "max": hi},
            "wallHeight": 270.0, "westWallActorCount": len(wall_actors),
            "westWallPanelCount": len(wall_panels), "westWallPlacementValid": wall_placement,
            "westWallCoverageValid": wall_coverage, "westWallIntervals": wall_intervals,
            "westWallGaps": wall_gaps, "westWallVisibilityMaterialsCollisionValid": west_wall_state,
            "existingBoundaryModuleCount": len(boundary_modules),
            "existingBoundaryModules": boundary_modules,
            "ceilingTileCount": len(ceiling_actors), "ceilingExpectedBounds": ceiling_box,
            "ceilingActualBounds": actual_ceiling, "ceilingPlacementValid": ceiling_placement,
            "ceilingVisibilityMaterialsCollisionValid": ceiling_state,
            "glazedPartitions": glazing, "glazedPartitionsValid": glazed_present,
            "doors": doors, "doorAssetsValid": door_assets_present,
            "shellClearanceFailures": shell_clearance,
            "openDoorCapsuleChecks": open_door_clearance,
            "circulationClear": circulation_clear}


def validate_treatment_room():
    geometry = bay_geometry()
    start = unique("KlinikLab_TreatmentRoom_PlayerStart")
    slab = unique("KlinikLab_Uncalibrated_Navigation_Floor")
    pos = start.get_actor_location()
    radius, half_height = pawn_capsule()
    world = start.get_world()
    overlaps = unreal.SystemLibrary.capsule_overlap_actors(world, pos, radius, half_height,
        [unreal.ObjectTypeQuery.ECC_WORLD_STATIC, unreal.ObjectTypeQuery.ECC_WORLD_DYNAMIC], unreal.Actor, [start]) or []
    # Also check visual mesh AABBs: imported furniture may have no collision.
    # Capsule bounds are deliberately conservative, so thin geometry cannot hide an overlap.
    visual_overlaps = []
    for a in actors():
        if not a.get_actor_label().startswith(("KlinikLabClinic_", "KlinikLabChair_", "KlinikLabTray_")):
            continue
        if not a.get_components_by_class(unreal.StaticMeshComponent):
            continue
        o, e = a.get_actor_bounds(False)
        if (o.z+e.z > pos.z-half_height+1 and o.z-e.z < pos.z+half_height and
                o.x+e.x > pos.x-radius and o.x-e.x < pos.x+radius and
                o.y+e.y > pos.y-radius and o.y-e.y < pos.y+radius):
            visual_overlaps.append(a.get_path_name())
    s_o, s_e = slab.get_actor_bounds(False)
    floor_contains = (s_o.x-s_e.x+radius < pos.x < s_o.x+s_e.x-radius and
                      s_o.y-s_e.y+radius < pos.y < s_o.y+s_e.y-radius)
    vertical_gap = pos.z-half_height-(s_o.z+s_e.z)
    floor_component = slab.get_component_by_class(unreal.StaticMeshComponent)
    profile = str(floor_component.get_collision_profile_name())
    collision_enabled = floor_component.get_collision_enabled() == unreal.CollisionEnabled.QUERY_AND_PHYSICS
    floor_hit = unreal.SystemLibrary.line_trace_single(world, pos, unreal.Vector(pos.x, pos.y, pos.z-200),
        unreal.TraceTypeQuery.ECC_VISIBILITY, False, [start], unreal.DrawDebugTrace.NONE)
    hit = floor_hit.to_dict() if floor_hit else {}
    blocking_floor = (hit.get("blocking_hit", False) and hit.get("hit_actor") == slab
                      and abs(hit["distance"]-half_height-vertical_gap) < 0.1)
    incompatible = []
    for a in actors():
        for comp in a.get_components_by_class(unreal.StaticMeshComponent):
            mesh = comp.get_editor_property("static_mesh")
            if mesh and mesh.get_editor_property("nanite_settings").get_editor_property("enabled"):
                if any(comp.get_material(i) and comp.get_material(i).get_blend_mode() not in
                       (unreal.BlendMode.BLEND_OPAQUE, unreal.BlendMode.BLEND_MASKED)
                       for i in range(comp.get_num_materials())) and not comp.get_editor_property("disallow_nanite"):
                    incompatible.append(comp.get_path_name())
    fills = [a for a in actors() if a.get_actor_label().startswith("KlinikLab_Fill_")]
    movable_lights = all(a.get_component_by_class(unreal.PointLightComponent).get_editor_property("mobility")
                         == unreal.ComponentMobility.MOVABLE and
                         a.get_component_by_class(unreal.PointLightComponent).get_editor_property("intensity") > 0
                         for a in fills)
    exposure = unique("KlinikLab_Exposure")
    settings = exposure.get_editor_property("settings")
    exposure_enabled = (exposure.get_editor_property("unbound") and
                        settings.get_editor_property("override_auto_exposure_min_brightness") and
                        settings.get_editor_property("override_auto_exposure_max_brightness"))
    wall_shell = validate_treatment_room_shell(geometry)
    success = (not overlaps and not visual_overlaps and floor_contains and 1 < vertical_gap < 5 and
               not incompatible and profile == "BlockAll" and collision_enabled and blocking_floor and
               len(fills) == 9 and movable_lights and exposure_enabled and wall_shell["success"])
    result = {"success": success, "geometry": geometry, "start": vector_list(pos),
              "slabBounds": mesh_bounds([slab]), "floorContainsCapsule": floor_contains,
              "startFloorGap": vertical_gap, "collisionOverlaps": [a.get_path_name() for a in overlaps],
              "visualBoundsOverlaps": visual_overlaps, "incompatibleNaniteComponents": incompatible,
              "floorCollisionProfile": profile, "queryAndPhysics": collision_enabled,
              "blockingFloorTrace": bool(blocking_floor), "floorTraceDistance": hit.get("distance"),
              "movableFillLightCount": len(fills), "movableLightsValid": movable_lights,
              "boundedExposureEnabled": bool(exposure_enabled), "wallShell": wall_shell}
    if not success:
        raise RuntimeError("Treatment bay validation failed: " + str(result))
    return result
