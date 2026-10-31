# Unreal 5.8 Python Editor Script: local KlinikLab FDI16 clinical mesh proof.
# Runs ONLY in a distinct native UE clinical-slice project. No Pixel Streaming/Quest.
# Creates native .uasset/.umap from SOURCE-GENERATED OBJ, never a fake screenshot.
# All source/evidence directories supplied by the external source-pinned runner.
import hashlib
import json
import os
import traceback
from pathlib import Path

import unreal

MODEL_NAMES = ('fdi16-before.obj', 'fdi16-after-cut.obj')
LEVEL = '/Game/Maps/L_KlinikLab_FDI16'
REPORT_NAME = 'unreal-clinical-level-build.json'

def hash_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as f:
        for part in iter(lambda: f.read(1024 * 1024), b''):
            digest.update(part)
    return digest.hexdigest()

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def spawn(actor_type, x, y, z, label, rot=None):
    if rot is None:
        rot = unreal.Rotator(0, 0, 0)
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
        actor_type, unreal.Vector(float(x), float(y), float(z)), rot)
    require(actor is not None, 'Failed to spawn native actor: ' + label)
    actor.set_actor_label(label)
    return actor

def import_native_obj(path, name, expected_triangles):
    task = unreal.AssetImportTask()
    for key, value in {
        'filename': str(path),
        'destination_path': '/Game/KlinikLab/NativeMeshes',
        'destination_name': name,
        'automated': True,
        'replace_existing': False,
        'save': True
    }.items():
        task.set_editor_property(key, value)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    objects = list(task.get_objects())
    meshes = [x for x in objects if isinstance(x, unreal.StaticMesh)]
    require(len(meshes) == 1, 'Native OBJ import failed or did not produce exactly one StaticMesh: ' + name + ' (got ' + str([str(x) for x in objects]) + ')')
    mesh = meshes[0]
    require(mesh.get_num_lods() >= 1, 'Imported native mesh has no LOD: ' + name)
    actual_triangles = int(mesh.get_num_triangles(0))
    require(actual_triangles == int(expected_triangles),
            'UE native OBJ triangle count differs from source mesher for ' + name +
            ': exported=' + str(expected_triangles) + ', imported=' + str(actual_triangles))
    return mesh

def mesh_actor(mesh, name, y_offset):
    actor = spawn(unreal.StaticMeshActor, 0, y_offset, 74, name)
    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    require(component is not None, 'No native StaticMeshComponent: ' + name)
    component.set_static_mesh(mesh)
    require(component.get_editor_property('static_mesh') is not None, 'Native mesh binding failed: ' + name)
    return actor

def native_text(name, txt, x, y, z):
    actor = spawn(unreal.TextRenderActor, x, y, z, name, unreal.Rotator(0, 180, 0))
    comp = actor.get_component_by_class(unreal.TextRenderComponent)
    require(comp is not None, 'TextRender component absent: ' + name)
    comp.set_text(txt)
    comp.set_world_size(12.0)
    comp.set_horizontal_alignment(unreal.HorizTextAligment.EHTA_CENTER)
    return actor

def point_light(name, xyz, intensity):
    actor = spawn(unreal.PointLight, *xyz, label=name)
    comp = actor.get_component_by_class(unreal.PointLightComponent)
    require(comp is not None, 'Point light missing native component')
    comp.set_editor_property('intensity', intensity)
    comp.set_editor_property('attenuation_radius', 1100.0)
    return actor

def main():
    evidence = os.environ.get('KLINIKLAB_SR1B_EVIDENCE_DIR', '')
    mesh_dir = os.environ.get('KLINIKLAB_SR1B_MESH_DIR', '')
    expected = os.environ.get('KLINIKLAB_SR1B_SHA', '').lower()
    require(evidence and mesh_dir, 'KLINIKLAB_SR1B_EVIDENCE_DIR / _MESH_DIR required')
    require(len(expected) == 40 and all(c in '0123456789abcdef' for c in expected),
            'KLINIKLAB_SR1B_SHA exact 40-hex commit required')
    out = Path(evidence).resolve()
    folder = Path(mesh_dir).resolve()
    require(out.is_dir() and folder.is_dir(), 'Output and immutable OBJ export directories must exist')
    report_file = out / REPORT_NAME
    require(not report_file.exists(), 'Refusing to overwrite existing UE clinical build report')
    report = {
        'schemaVersion': 1,
        'kind': 'SR1B native UE5.8 KlinikLab clinical level BUILD (NOT a rendered GPU frame)',
        'status': 'BLOCKED',
        'sourceGitSHA': expected,
        'clinicalMeshManifestSHA256': None,
        'nativeLevelPackage': LEVEL,
        'importedMeshes': [],
        'importedTrianglesLOD0': {},
        'actorLabels': [],
        'actualNativeViewportScreenshot': False,
        'verifiedProcessGPUEngineActivity': False,
        'independentPixelReviewAccepted': False,
        'pixelStreaming2Verified': False,
        'quest2Verified': False,
        'errors': []
    }
    try:
        manifest_file = folder / 'kliniklab-export-manifest.json'
        manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
        require(manifest.get('sourceGitSHA') == expected, 'Mesh source SHA mismatch')
        require(manifest.get('fdi') == '16' and manifest.get('procedure') == 'restoration', 'Unexpected non-FDI16 clinical source')
        require(manifest.get('scaleIsClinicallyCalibrated') is False, 'Incorrect clinical scale declaration')
        require(manifest.get('importedThirdPartyAssets') == [], 'Unexpected third-party model in native proof')
        for name, digest in manifest['originals'].items():
            require((folder / name).is_file() and hash_file(folder / name) == digest,
                    'Original OBJ/MTL SHA-256 mismatch: ' + name)
        report['clinicalMeshManifestSHA256'] = hash_file(manifest_file)
        # These are verified source-generated meshes; no third-party Dundee assets.
        before = import_native_obj(folder / MODEL_NAMES[0], 'KL_FDI16_Before',
                                   manifest['sceneStates']['before']['triangles'])
        after = import_native_obj(folder / MODEL_NAMES[1], 'KL_FDI16_AfterCut',
                                  manifest['sceneStates']['after']['triangles'])
        report['importedMeshes'] = [str(before.get_path_name()), str(after.get_path_name())]
        report['importedTrianglesLOD0'] = {
            'before': int(before.get_num_triangles(0)),
            'after': int(after.get_num_triangles(0))
        }

        level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        require(level.new_level(LEVEL), 'Native Unreal Editor failed to create a new level')
        a = mesh_actor(before, 'KL_FDI16_BEFORE_SOURCE_MESH', -120)
        b = mesh_actor(after, 'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH', 120)
        report['actorLabels'] += [str(a.get_actor_label()), str(b.get_actor_label())]

        # Minimal LOCAL teaching workspace with source-labelled native actors.
        native_text('KL_FDI16_CASE_ID', 'KlinikLab  /  FDI 16  /  MOD COMPOSITE', 0, 0, 165)
        native_text('KL_BEFORE_TITLE', 'BEFORE', 0, -120, 125)
        native_text('KL_AFTER_TITLE', 'AFTER  /  SIMULATED CUT', 0, 120, 125)
        native_text('KL_EDUCATION_NOTICE', 'EDUCATIONAL GEOMETRY  |  NOT CLINICALLY CALIBRATED', 0, 0, 7)
        report['actorLabels'] += ['KL_FDI16_CASE_ID', 'KL_BEFORE_TITLE', 'KL_AFTER_TITLE', 'KL_EDUCATION_NOTICE']

        point_light('KL_CHAIR_LIGHT_LEFT', (-80, -170, 270), 65000)
        point_light('KL_CHAIR_LIGHT_RIGHT', (-80, 170, 270), 65000)
        daylight = spawn(unreal.DirectionalLight, -80, 0, 350, 'KL_PROCEDURE_DIRECTIONAL_LIGHT',
                         unreal.Rotator(-45, 22, 0))
        report['actorLabels'].append(daylight.get_actor_label())

        camera = spawn(unreal.CameraActor, -470, 0, 185, 'KL_NATIVE_CAMERA_FDI16_COMPARISON',
                       unreal.Rotator(-12, 0, 0))
        report['actorLabels'].append(camera.get_actor_label())
        require(level.save_current_level(), 'Failed to save native UE clinical level')
        require(unreal.EditorAssetLibrary.does_asset_exist(LEVEL),
                'Native level asset not found after save')
        report['levelSaved'] = True
        report['status'] = 'NATIVE_LEVEL_CREATED_PENDING_GPU_AND_PIXEL_EVIDENCE'
        unreal.log('SR1B KlinikLab source-derived clinical level saved: ' + LEVEL)
    except Exception as exc:
        report['errors'].append(str(exc))
        report['errors'].append(traceback.format_exc())
        unreal.log_error('SR1B native clinical level import FAILED: ' + str(exc))
        raise
    finally:
        report_file.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')

main()
