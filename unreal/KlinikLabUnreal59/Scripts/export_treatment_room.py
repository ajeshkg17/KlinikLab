import unreal
import os
import json
import traceback
import sys
import hashlib
import importlib

PROJECT_DIR = os.path.realpath(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir()))
MAP_PATH = "/Game/KlinikLab/Maps/TreatmentRoom"
CLINIC_SOURCE = os.path.join(PROJECT_DIR, "SourceAssets", "whole-clinic-starter-v1-float32.glb")
CHAIR_SOURCE = os.path.join(PROJECT_DIR, "SourceAssets", "operatory-chair-v1-float32.glb")
TRAY_SOURCE = os.path.join(PROJECT_DIR, "SourceAssets", "instrument-tray-v1-float32.glb")
REPORT_PATH = os.path.join(PROJECT_DIR, "Saved", "KlinikLabExportReport.json")
GLTF_SCENE_ASSET_PIPELINE_TEMPLATE = "/Interchange/Pipelines/DefaultGLTFSceneAssetsPipeline.DefaultGLTFSceneAssetsPipeline"
GLTF_SCENE_ASSET_PIPELINE = "/Game/KlinikLab/Interchange/GLTFSceneAssets_NoAnimationReimport.GLTFSceneAssets_NoAnimationReimport"
GLTF_SCENE_PIPELINES = (
    GLTF_SCENE_ASSET_PIPELINE,
    "/Interchange/Pipelines/DefaultGLTFPipeline.DefaultGLTFPipeline",
    "/Interchange/Pipelines/DefaultSceneLevelPipeline.DefaultSceneLevelPipeline",
)
report = {
    "engine": "Unreal Engine 5.9.0",
    "map": MAP_PATH,
    "sourcePreviewSHA": "e707c9c32afe5bfda870d137e28a8dc1e7851969",
    "clinicalCalibrationVerified": False,
    "fullApplicationParity": False,
    "imports": [],
    "actors": [],
}
OWNED_PREFIXES = ("KlinikLabClinic_", "KlinikLabChair_", "KlinikLabTray_", "KlinikLab_")


def source_hashes():
    """Source GLBs and provenance manifests are inputs, never export outputs."""
    root = os.path.join(PROJECT_DIR, "SourceAssets")
    hashes = {}
    for directory, _, filenames in os.walk(root):
        for filename in sorted(filenames):
            path = os.path.join(directory, filename)
            digest = hashlib.sha256()
            with open(path, "rb") as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b""):
                    digest.update(block)
            hashes[os.path.relpath(path, PROJECT_DIR).replace("\\", "/")] = digest.hexdigest()
    return hashes


def actor_state(actor):
    """Record the exact placement and asset assignments checked before saving."""
    parent = actor.get_attach_parent_actor()
    location = actor.get_actor_location()
    rotation = actor.get_actor_rotation()
    scale = actor.get_actor_scale3d()
    return {
        "label": actor.get_actor_label(),
        "class": actor.get_class().get_name(),
        "transform": {
            "location": [location.x, location.y, location.z],
            "rotation": {"pitch": rotation.pitch, "yaw": rotation.yaw, "roll": rotation.roll},
            "scale": [scale.x, scale.y, scale.z],
        },
        "parent": parent.get_path_name() if parent else None,
        "meshComponents": mesh_references(actor),
    }


def mesh_references(actor):
    references = {}
    for component in actor.get_components_by_class(unreal.StaticMeshComponent):
        mesh = component.get_editor_property("static_mesh")
        references[component.get_path_name()] = {
            "mesh": mesh.get_path_name() if mesh else None,
            "materials": [material.get_path_name() if material else None
                          for material in component.get_materials()],
        }
    return references


def dirty_packages():
    return {
        "maps": sorted(package.get_path_name() for package in
                       unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages()),
        "content": sorted(package.get_path_name() for package in
                          unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()),
    }


def require_treatment_map(level_editor):
    level = level_editor.get_current_level()
    if level is None or level.get_outermost().get_path_name() != MAP_PATH:
        fail("Refusing to edit or save a level other than " + MAP_PATH)

def fail(message):
    unreal.log_error("KLINIKLAB_EXPORT_FAIL: " + message)
    report["failure"] = message
    os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    raise RuntimeError(message)

def configure_animation_safe_gltf_pipeline():
    """Use this project's GLTF scene pipeline with sequence import disabled.

    UE 5.9's GLTF Interchange factory reports LevelSequence reimport as
    unsupported. The static treatment-room export does not consume animation
    tracks, so disable animation import. Interchange may still reserialize
    generated sequence packages when replace_existing is enabled; byte-level
    preservation is checked separately from this pipeline setting.
    """
    template = unreal.EditorAssetLibrary.load_asset(GLTF_SCENE_ASSET_PIPELINE_TEMPLATE)
    if template is None:
        fail("UE GLTF scene asset pipeline template is unavailable")
    pipeline = unreal.EditorAssetLibrary.load_asset(GLTF_SCENE_ASSET_PIPELINE)
    if pipeline is None:
        pipeline = unreal.EditorAssetLibrary.duplicate_asset(
            GLTF_SCENE_ASSET_PIPELINE_TEMPLATE, GLTF_SCENE_ASSET_PIPELINE)
    if pipeline is None or pipeline.get_class().get_name() != "InterchangeGenericAssetsPipeline":
        fail("Could not create the project-local GLTF scene pipeline copy")
    if pipeline.get_path_name() == template.get_path_name():
        fail("Refusing to edit the engine's shared GLTF pipeline")
    animation_pipeline = pipeline.get_editor_property("animation_pipeline")
    if animation_pipeline is None or animation_pipeline.get_outer() != pipeline:
        fail("Project-local animation pipeline is not independent from the engine template")
    animation_pipeline.modify()
    animation_pipeline.set_editor_property("import_animations", False)
    pipeline.modify()
    if not unreal.EditorAssetLibrary.save_asset(GLTF_SCENE_ASSET_PIPELINE, False):
        fail("Could not save the project-local GLTF pipeline")
    if animation_pipeline.get_editor_property("import_animations"):
        fail("Project-local GLTF pipeline still imports animations")
    report["sequenceImportPolicy"] = {
        "pipelineTemplate": GLTF_SCENE_ASSET_PIPELINE_TEMPLATE,
        "pipelineAsset": GLTF_SCENE_ASSET_PIPELINE,
        "importAnimations": False,
        "sequencePackagesMayBeReserialized": True,
        "scenePipelines": list(GLTF_SCENE_PIPELINES),
    }
    return GLTF_SCENE_PIPELINES


def import_scene_into_current_level(source_path, destination, offset, actor_prefix,
                                    override_pipelines=None):
    if not os.path.isfile(source_path):
        fail("Missing source GLB: " + source_path)
    level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    editor_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    level = level_editor.get_current_level()
    if level is None:
        fail("No current editor level is loaded")
    before = list(editor_actors.get_all_level_actors())
    source = unreal.InterchangeManager.create_source_data(source_path)
    params = unreal.ImportAssetParameters()
    params.set_editor_property("is_automated", True)
    params.set_editor_property("import_level", level)
    params.set_editor_property("replace_existing", True)
    if override_pipelines:
        params.set_editor_property("override_pipelines", [
            unreal.SoftObjectPath(path) for path in override_pipelines
        ])
    manager = unreal.InterchangeManager.get_interchange_manager_scripted()
    if manager is None:
        fail("Interchange manager is unavailable")
    started = manager.import_scene(destination, source, params)
    unreal.log("KLINIKLAB_INTERCHANGE_STARTED: %s=%s" % (actor_prefix, str(started)))
    if not started:
        fail("Interchange refused scene import: " + source_path)
    after = list(editor_actors.get_all_level_actors())
    before_ids = set([a.get_path_name() for a in before])
    added = [a for a in after if a.get_path_name() not in before_ids]
    added_ids = {actor.get_path_name() for actor in added}
    roots = [actor for actor in added if actor.get_attach_parent_actor() is None
             or actor.get_attach_parent_actor().get_path_name() not in added_ids]
    # Interchange adds an attached scene hierarchy. Moving every actor applies
    # the same offset again at every hierarchy depth and tears the room apart.
    # Translate only the roots; their descendants inherit the offset once.
    for actor in roots:
        loc = actor.get_actor_location()
        new_loc = unreal.Vector(loc.x + offset[0], loc.y + offset[1], loc.z + offset[2])
        actor.set_actor_location(new_loc, False, True)
    for actor in added:
        try:
            actor.set_actor_label(actor_prefix + "_" + actor.get_actor_label())
        except Exception:
            pass
    imported_assets = list(unreal.EditorAssetLibrary.list_assets(destination, True, False))
    assets_saved = unreal.EditorAssetLibrary.save_directory(destination, False, True)
    report["imports"].append({
        "source": os.path.basename(source_path),
        "started": bool(started),
        "destination": destination,
        "addedActorCount": len(added),
        "addedActors": [a.get_actor_label() for a in added],
        "translatedRootPaths": [a.get_path_name() for a in roots],
        "translatedRootCount": len(roots),
        "importedAssetCount": len(imported_assets),
        "importedAssetPaths": imported_assets,
        "saveDirectorySucceeded": bool(assets_saved),
        "offsetCentimeters": list(offset),
    })
    unreal.log("KLINIKLAB_IMPORT_CHECK: %s actors=%d assets=%d save=%s" % (
        actor_prefix, len(added), len(imported_assets), str(assets_saved)))
    if not added:
        fail("Import reported success but added no actors: " + source_path)
    if not roots:
        fail("Imported actors contain no independently placeable scene root: " + source_path)
    if not assets_saved:
        fail("Could not save imported assets in " + destination)
    return added

def main():
    try:
        # Resolve all inputs before touching the level. This exporter belongs to
        # this copy; its neighboring original project and Godot sources are inputs
        # outside its write scope.
        script_directory = os.path.join(PROJECT_DIR, "Scripts")
        if os.path.realpath(os.path.dirname(__file__)) != os.path.realpath(script_directory):
            fail("Exporter script is not inside the opened project's Scripts directory")
        if script_directory not in sys.path:
            sys.path.insert(0, script_directory)
        layout = importlib.import_module("treatment_room_layout")
        layout = importlib.reload(layout)
        for source_path in (CLINIC_SOURCE, CHAIR_SOURCE, TRAY_SOURCE):
            if not os.path.isfile(source_path):
                fail("Missing source GLB: " + source_path)
        source_before = source_hashes()
        report["projectDirectory"] = PROJECT_DIR
        report["sourceFileSHA256Before"] = source_before
        level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        editor_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        report["dirtyPackagesAtStart"] = dirty_packages()
        if (report["dirtyPackagesAtStart"]["maps"]
                or report["dirtyPackagesAtStart"]["content"]):
            fail("Refusing to export with unsaved map or content changes; audit and save or discard them first")
        if unreal.EditorAssetLibrary.does_asset_exist(MAP_PATH):
            current = level_editor.get_current_level()
            if current is None or current.get_outermost().get_path_name() != MAP_PATH:
                if report["dirtyPackagesAtStart"]["maps"]:
                    fail("Refusing to discard an unsaved open map while loading TreatmentRoom")
                if not level_editor.load_level(MAP_PATH):
                    fail("Could not load the existing treatment-room map")
        elif not level_editor.new_level(MAP_PATH):
            fail("Could not create the treatment-room map")
        require_treatment_map(level_editor)
        animation_safe_pipeline = configure_animation_safe_gltf_pipeline()
        before_actors = list(editor_actors.get_all_level_actors())
        before_states = {actor.get_path_name(): actor_state(actor) for actor in before_actors}
        protected_states = {path: state for path, state in before_states.items()
                            if not state["label"].startswith(OWNED_PREFIXES)}
        report["actorsBeforeExport"] = before_states
        report["removedOwnedActors"] = []
        if before_actors:
            # Remove only actors owned by this exporter so repeated runs are safe.
            for actor in before_actors:
                if actor.get_actor_label().startswith(OWNED_PREFIXES):
                    report["removedOwnedActors"].append(actor.get_path_name())
                    if not editor_actors.destroy_actor(actor):
                        fail("Could not remove an exporter-owned actor")
        imported_actors = import_scene_into_current_level(
            CLINIC_SOURCE,
            "/Game/KlinikLab/Imported/Clinic",
            (0.0, -2000.0, -300.0),
            "KlinikLabClinic",
        )
        imported_actors += import_scene_into_current_level(
            CHAIR_SOURCE,
            "/Game/KlinikLab/Imported/Chair",
            (300.0, -2000.0, -300.0),
            "KlinikLabChair",
            animation_safe_pipeline,
        )
        imported_actors += import_scene_into_current_level(
            TRAY_SOURCE,
            "/Game/KlinikLab/Imported/Tray",
            (-250.0, -1900.0, -280.0),
            "KlinikLabTray",
        )

        # Shared geometry-derived layout is also used by the in-place repair and
        # verifier. It must leave imported mesh/material asset assignments intact.
        references_before_layout = {
            actor.get_path_name(): mesh_references(actor) for actor in imported_actors
        }
        report["dirtyPackagesBeforeLayout"] = dirty_packages()
        require_treatment_map(level_editor)
        report["layout"] = layout.configure_treatment_room()
        report["layoutValidation"] = layout.validate_treatment_room()
        validation = report["layoutValidation"]
        if validation is False or (isinstance(validation, dict)
                                   and validation.get("success") is False):
            fail("Geometry-derived treatment-room layout failed validation")

        actors = editor_actors.get_all_level_actors()
        mesh_component_count = 0
        assigned_mesh_count = 0
        for actor in actors:
            for component in actor.get_components_by_class(unreal.StaticMeshComponent):
                mesh_component_count += 1
                if component.get_editor_property("static_mesh") is not None:
                    assigned_mesh_count += 1
        report["meshVerification"] = {
            "staticMeshComponentCount": mesh_component_count,
            "assignedMeshCount": assigned_mesh_count,
        }
        if assigned_mesh_count != mesh_component_count or not assigned_mesh_count:
            fail("Imported level contains empty StaticMeshComponents (%d/%d assigned)" % (
                assigned_mesh_count, mesh_component_count))
        after_states = {actor.get_path_name(): actor_state(actor) for actor in actors}
        references_after_layout = {
            actor.get_path_name(): mesh_references(actor) for actor in imported_actors
        }
        report["saveAudit"] = {
            "actorsAfterExport": after_states,
            "protectedActorPaths": sorted(protected_states),
            "changedProtectedActors": sorted(path for path, state in protected_states.items()
                                             if after_states.get(path) != state),
            "unexpectedOwnedActors": sorted(path for path, state in after_states.items()
                                            if path not in protected_states
                                            and not state["label"].startswith(OWNED_PREFIXES)),
            "importedMeshMaterialAssignmentsBeforeLayout": references_before_layout,
            "importedMeshMaterialAssignmentsAfterLayout": references_after_layout,
            "importedMeshMaterialAssignmentsPreserved":
                references_after_layout == references_before_layout,
            "dirtyPackagesBeforeMapSave": dirty_packages(),
            "saveTarget": MAP_PATH,
        }
        audit = report["saveAudit"]
        audit["newDirtyContentPackagesDuringLayout"] = sorted(
            set(audit["dirtyPackagesBeforeMapSave"]["content"])
            - set(report["dirtyPackagesBeforeLayout"]["content"]))
        report["sourceFileSHA256After"] = source_hashes()
        report["sourceFilesPreserved"] = report["sourceFileSHA256After"] == source_before
        if audit["changedProtectedActors"] or audit["unexpectedOwnedActors"]:
            fail("Export changed actors outside the exporter-owned scope")
        if not audit["importedMeshMaterialAssignmentsPreserved"]:
            fail("Treatment-room layout changed imported mesh or material assignments")
        if audit["newDirtyContentPackagesDuringLayout"]:
            fail("Treatment-room layout unexpectedly modified content assets")
        if not report["sourceFilesPreserved"]:
            fail("SourceAssets input bytes changed during export")
        require_treatment_map(level_editor)
        report["actors"] = [{
            "label": actor.get_actor_label(),
            "class": actor.get_class().get_name(),
            "location": [actor.get_actor_location().x, actor.get_actor_location().y, actor.get_actor_location().z],
        } for actor in actors]
        if not level_editor.save_current_level():
            fail("Could not save the treatment-room map")
        report["saveAudit"]["dirtyPackagesAfterMapSave"] = dirty_packages()
        report["success"] = True
        os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        unreal.log("KLINIKLAB_EXPORT_SUCCESS: map=%s actors=%d" % (MAP_PATH, len(actors)))
    except Exception as exc:
        report["failure"] = str(exc)
        report["traceback"] = traceback.format_exc()
        os.makedirs(os.path.dirname(REPORT_PATH), exist_ok=True)
        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        unreal.log_error("KLINIKLAB_EXPORT_EXCEPTION: " + traceback.format_exc())
        raise


if __name__ == "__main__":
    main()
