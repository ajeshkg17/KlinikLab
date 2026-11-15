import unreal
import os
import json
import sys
import importlib

PROJECT_DIR = unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_dir())
MAP_PATH = "/Game/KlinikLab/Maps/TreatmentRoom"
OUTPUT = os.path.join(PROJECT_DIR, "Saved", "KlinikLabMapVerification.json")

result = {"map": MAP_PATH, "success": False, "loaded": False, "actorCount": 0,
          "staticMeshComponentCount": 0, "assignedMeshCount": 0,
          "transientMeshCount": 0, "projectMeshCount": 0,
          "materialSlotCount": 0, "assignedMaterialSlotCount": 0,
          "emptyMaterialSlotCount": 0, "meshAssets": [], "importedAssetPaths": []}
result["wallShellVerification"] = {"success": False, "failure": "not run"}

level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
editor_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
if not level_editor.load_level(MAP_PATH):
    result["failure"] = "Could not load exported treatment-room map"
else:
    result["loaded"] = True
    actors = list(editor_actors.get_all_level_actors())
    result["actorCount"] = len(actors)
    meshes_by_path = {}
    for actor in actors:
        for component in actor.get_components_by_class(unreal.StaticMeshComponent):
            result["staticMeshComponentCount"] += 1
            mesh = component.get_editor_property("static_mesh")
            if mesh is not None:
                result["assignedMeshCount"] += 1
                path = mesh.get_path_name()
                meshes_by_path[path] = mesh
                if "Transient" in path:
                    result["transientMeshCount"] += 1
                if path.startswith("/Game/KlinikLab/Imported/"):
                    result["projectMeshCount"] += 1
    result["meshAssets"] = sorted(meshes_by_path)
    for path in sorted(meshes_by_path):
        for slot in meshes_by_path[path].get_editor_property("static_materials"):
            result["materialSlotCount"] += 1
            if slot.get_editor_property("material_interface") is None:
                result["emptyMaterialSlotCount"] += 1
            else:
                result["assignedMaterialSlotCount"] += 1
    result["importedAssetPaths"] = list(unreal.EditorAssetLibrary.list_assets(
        "/Game/KlinikLab/Imported", True, False))
    # Keep the original persisted-reference checks, then independently validate
    # treatment-bay placement and collision with the shared read-only helper.
    try:
        script_directory = os.path.join(PROJECT_DIR, "Scripts")
        if script_directory not in sys.path:
            sys.path.insert(0, script_directory)
        layout = importlib.import_module("treatment_room_layout")
        layout = importlib.reload(layout)
        result["layoutVerification"] = layout.validate_treatment_room()
        result["wallShellVerification"] = result["layoutVerification"].get(
            "wallShell", {"success": False, "failure": "wall shell check missing"})
    except Exception as exc:
        result["layoutVerification"] = {"success": False, "failure": str(exc)}
        result["wallShellVerification"] = {"success": False, "failure": str(exc)}

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
unreal.log("KLINIKLAB_MAP_VERIFY: loaded=%s actors=%d meshComponents=%d assigned=%d transient=%d importedAssets=%d materialSlots=%d assignedMaterials=%d emptyMaterials=%d" % (
    result.get("loaded"), result.get("actorCount", 0),
    result.get("staticMeshComponentCount", 0), result.get("assignedMeshCount", 0),
    result.get("transientMeshCount", 0), len(result.get("importedAssetPaths", [])),
    result.get("materialSlotCount", 0), result.get("assignedMaterialSlotCount", 0),
    result.get("emptyMaterialSlotCount", 0)))
reference_valid = (
    result.get("loaded")
    and result.get("staticMeshComponentCount", 0) > 0
    and result.get("assignedMeshCount") == result.get("staticMeshComponentCount")
    and result.get("transientMeshCount") == 0
    and result.get("projectMeshCount", 0) >= 300
    and len(result.get("importedAssetPaths", [])) >= 300
    and result.get("assignedMaterialSlotCount", 0) > 0
)
result["referenceChecksPassed"] = bool(reference_valid)
valid = (reference_valid
         and result.get("layoutVerification", {}).get("success") is True
         and result.get("wallShellVerification", {}).get("success") is True)
result["success"] = bool(valid)
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2)
if not valid:
    result["failure"] = (
        "Fresh-process load did not resolve the imported scene meshes to saved project assets"
        if not reference_valid else "Treatment-room layout or wall-shell validation failed; see layoutVerification"
    )
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    raise RuntimeError(result["failure"])
