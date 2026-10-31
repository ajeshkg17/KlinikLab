# Unreal 5.8 Python Editor Script: local KlinikLab FDI16 clinical mesh proof.
# Runs ONLY in a distinct native UE clinical-slice project. No Pixel Streaming/Quest.
# Creates native .uasset/.umap from SOURCE-GENERATED OBJ, never a fake screenshot.
# All source/evidence directories supplied by the external source-pinned runner.
import hashlib
import json
import os
import traceback
from pathlib import Path
import sys

import unreal

helper_dir = os.environ.get('KLINIKLAB_SR1B_SCRIPT_DIR', '')
if not helper_dir or not (Path(helper_dir) / 'sr1b_section_contract.py').is_file():
    raise RuntimeError('Missing source-pinned SR1B tissue section contract')
sys.path.insert(0, helper_dir)
from sr1b_section_contract import MATERIALS, validate_sections, tissue_from_name
from sr1b_topology_source import read_obj_triangles

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

def report_mesh_source_build(mesh):
    """Instrument translator/source vs LOD0 render triangles and strict build settings.

    UE's imported render LOD can differ from source MeshDescription because of
    mesh build optimization/welding/removal. Never suppress that discrepancy.
    """
    result = {
        'assetPath': mesh.get_path_name(),
        'renderLOD0Before': int(mesh.get_num_triangles(0)),
        'sourceMeshDescriptionTriangles': None,
        'renderLOD0After': None,
        'buildSettingsBefore': {},
        'buildSettingsAfter': {},
        'potentialLossStage': 'UNKNOWN'
    }
    try:
        src = mesh.get_static_mesh_description(0)
        if src is not None:
            result['sourceMeshDescriptionTriangles'] = int(src.get_triangle_count())
    except Exception as e:
        result['sourceDescriptionQueryError'] = str(e)
    subsystem = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    require(subsystem is not None, 'StaticMeshEditorSubsystem unavailable; cannot validate build policy')
    settings = subsystem.get_lod_build_settings(mesh, 0)
    flags = ('remove_degenerates', 'use_mikk_t_space',
             'generate_lightmap_u_vs', 'build_reversed_index_buffer')
    result['buildSettingsBefore'] = {
        key: bool(settings.get_editor_property(key)) for key in flags
    }
    # This is a controlled causal test, not an excuse to accept lossy geometry:
    # remove_degenerates=False avoids Unreals default welded triangle deletion.
    # Mikk/UV/reversed-buffer generation are disabled only for this native
    # source-verified topology diagnostic. Explicit polygon parity still required.
    for flag in flags:
        settings.set_editor_property(flag, False)
    subsystem.set_lod_build_settings(mesh, 0, settings)
    effective = subsystem.get_lod_build_settings(mesh, 0)
    result['buildSettingsAfter'] = {
        key: bool(effective.get_editor_property(key)) for key in flags
    }
    require(not any(result['buildSettingsAfter'].values()),
            'Unreal did not retain explicit topology-preserving LOD build flags: ' + mesh.get_name())
    result['renderLOD0After'] = int(mesh.get_num_triangles(0))
    require(bool(unreal.EditorAssetLibrary.save_loaded_asset(mesh)),
            'Failed to save native imported StaticMesh after topology-preserving LOD rebuild: ' + mesh.get_name())
    saved_settings = subsystem.get_lod_build_settings(mesh, 0)
    result['savedBuildSettings'] = {
        key: bool(saved_settings.get_editor_property(key)) for key in flags
    }
    result['renderLOD0Saved'] = int(mesh.get_num_triangles(0))
    require(not any(result['savedBuildSettings'].values()),
            'Topology-preserving build policy not retained in saved native StaticMesh: ' + mesh.get_name())
    require(result['renderLOD0Saved'] == result['renderLOD0After'],
            'Saved native StaticMesh render triangle count differs from rebuilt LOD: ' + mesh.get_name())
    src_tri = result['sourceMeshDescriptionTriangles']
    if src_tri is None:
        result['potentialLossStage'] = 'SOURCE_MESHDESCRIPTION_UNAVAILABLE'
    elif src_tri != result['renderLOD0After']:
        result['potentialLossStage'] = 'SOURCE_VS_RENDER_BUILD_DISAGREE'
    else:
        result['potentialLossStage'] = 'SOURCE_AND_RENDER_MATCH_POST_REBUILD'
    return result


def rebuild_from_source_triangle_stream(mesh, triangles, material):
    """Bypass lossy OBJ translator/build with the ORIGINAL source-pinned OBJ faces.

    Native Unreal StaticMeshDescription is populated triangle by triangle.
    No mesh decimation, no artificial face insertion and no count rebaselining.
    Any Python API incompatibility or native geometry loss aborts stage 1.
    """
    require(triangles and material in MATERIALS, 'Unexpected original source material')
    smd = unreal.StaticMesh.create_static_mesh_description()
    require(smd is not None, 'UE StaticMeshDescription factory unavailable')
    group = smd.create_polygon_group()
    smd.set_polygon_group_material_slot_name(group, unreal.Name('KL_' + material))
    smd.reserve_new_vertices(len(triangles) * 3)
    smd.reserve_new_vertex_instances(len(triangles) * 3)
    smd.reserve_new_triangles(len(triangles))
    for triangle in triangles:
        instances = []
        for x, y, z in triangle:
            vertex = smd.create_vertex()
            smd.set_vertex_position(vertex, unreal.Vector(x, y, z))
            instance = smd.create_vertex_instance(vertex)
            smd.set_vertex_instance_uv(instance, unreal.Vector2D(0, 0), 0)
            instances.append(instance)
        smd.create_triangle(group, instances)
    require(int(smd.get_triangle_count()) == len(triangles),
            'Direct native MeshDescription lost source OBJ triangles before build: ' + material)
    mesh.build_from_static_mesh_descriptions([smd], False, False)
    require(int(mesh.get_num_triangles(0)) == len(triangles),
            'Direct native StaticMesh build still removed source OBJ triangles: ' + material +
            ', source=' + str(len(triangles)) +
            ', native=' + str(mesh.get_num_triangles(0)))
    require(bool(unreal.EditorAssetLibrary.save_loaded_asset(mesh)),
            'Failed to save native source-reconstructed StaticMesh: ' + material)
    require(int(mesh.get_num_triangles(0)) == len(triangles),
            'Direct native mesh triangle count changed after saving: ' + material)
    return {'method': 'SOURCE_OBJ_NATIVE_STATICMESHDESCRIPTION_NO_REDUCTION',
            'directInputTriangles': len(triangles),
            'savedNativeTriangles': int(mesh.get_num_triangles(0)),
            'sourceMaterial': 'KL_' + material}


def import_native_obj(path, name, expected_counts, expected_total, diagnostics):
    """Preserve each tissue group when UE imports multi-material OBJ as N meshes."""
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
    meshes = [obj for obj in objects if isinstance(obj, unreal.StaticMesh)]
    original_triangles = read_obj_triangles(path, expected_counts)
    rows = []
    by_path = {}
    for mesh in meshes:
        require(mesh.get_num_lods() >= 1,
                'Imported native mesh has no LOD: ' + mesh.get_name())
        diag = report_mesh_source_build(mesh)
        diagnostics.append(diag)
        material_entries = list(mesh.get_editor_property('static_materials'))
        require(len(material_entries) == 1,
                'Native tissue mesh must have exactly one original source material: ' + mesh.get_name())
        source_interface = material_entries[0].get_editor_property('material_interface')
        require(source_interface is not None,
                'Native mesh missing imported tissue material interface: ' + mesh.get_name())
        material = tissue_from_name(source_interface.get_name())
        require(material in expected_counts and expected_counts[material] > 0,
                'Native mesh interface is not a source-identified tissue material: ' + mesh.get_name())
        require(tissue_from_name(mesh.get_name()) == material,
                'Native section name and material identity disagree: ' + mesh.get_name())
        # Original KlinikLab marching-tetrahedra renderer explicitly disables
        # back-face culling because tetra surface triangle winding varies.
        # Match that native visibility contract; this is a two-sided shading
        # option, NOT a mesh decimation or source topology change.
        if isinstance(source_interface, unreal.Material):
            source_interface.set_editor_property('two_sided', True)
            require(bool(source_interface.get_editor_property('two_sided')),
                    'Native teaching tissue material cannot render both sides: ' + material)
            require(bool(unreal.EditorAssetLibrary.save_loaded_asset(source_interface)),
                    'Could not persist native two-sided tissue material: ' + material)
            diag['nativeMaterialTwoSided'] = True
        else:
            diag['nativeMaterialTwoSided'] = False
            diag['twoSidedMaterialTypeUnverified'] = str(source_interface.get_class().get_name())
        diag['sourceExpectedForMaterial'] = int(expected_counts[material])
        if diag['renderLOD0Saved'] != int(expected_counts[material]):
            diag['lossAfterConservativeRebuild'] = (
                int(expected_counts[material]) - diag['renderLOD0Saved'])
            diag['directSourceMeshDescriptionReconstruction'] = (
                rebuild_from_source_triangle_stream(mesh, original_triangles[material], material))
        diag['finalNativeRenderLOD0'] = int(mesh.get_num_triangles(0))
        row = {
            'assetName': mesh.get_name(),
            'assetPath': mesh.get_path_name(),
            'triangleCount': int(mesh.get_num_triangles(0)),
            'sourceMeshDescriptionTriangles': diag['sourceMeshDescriptionTriangles'],
            'importRenderTrianglesBeforeRebuild': diag['renderLOD0Before'],
            'materialSlots': [str(slot.get_editor_property('material_slot_name'))
                              for slot in material_entries],
            'materialInterfaces': [
                slot.get_editor_property('material_interface').get_name()
                if slot.get_editor_property('material_interface') is not None
                else None for slot in material_entries
            ]
        }
        rows.append(row)
        by_path[row['assetPath']] = mesh
    # Source manifest contains all five tissue counts; require one native
    # StaticMesh per nonempty group with exact material interface and LOD0 parity.
    # Do not guess identity from import order or merge/recolor silently.
    try:
        sections = validate_sections(rows, expected_counts, expected_total)
    except ValueError as exc:
        raise RuntimeError(
            'Unreal multi-material OBJ import contract failed for ' + name +
            ': ' + str(exc) + '; observed=' + json.dumps(rows, sort_keys=True))
    return {material: by_path[row['assetPath']] for material, row in sections.items()}, sections


def mesh_actor(sections, name, y_offset):
    """One logical labelled tooth, five native material-section mesh actors.

    Root carries enamel StaticMesh; other material actors attach to this root,
    all at the same source-derived world transform. No mesh is discarded.
    """
    require('enamel' in sections, 'Cannot anchor tooth: enamel group absent')
    root = spawn(unreal.StaticMeshActor, 0, y_offset, 74, name)
    children = {}
    for material in MATERIALS:
        if material not in sections:
            continue
        mesh = sections[material]
        if material == 'enamel':
            actor = root
        else:
            actor = spawn(unreal.StaticMeshActor, 0, y_offset, 74,
                          name + '_SECTION_' + material.upper())
        component = actor.get_component_by_class(unreal.StaticMeshComponent)
        require(component is not None, 'No native StaticMeshComponent: ' + material)
        component.set_static_mesh(mesh)
        assigned = component.get_editor_property('static_mesh')
        require(assigned is not None and
                assigned.get_path_name() == mesh.get_path_name(),
                'Wrong native StaticMesh component binding: ' + material)
        if actor is not root:
            attached = actor.attach_to_actor(
                root, unreal.Name('None'), unreal.AttachmentRule.KEEP_WORLD,
                unreal.AttachmentRule.KEEP_WORLD, unreal.AttachmentRule.KEEP_WORLD,
                False)
            require(bool(attached) and actor.get_attach_parent_actor() == root,
                    'Could not attach source tissue section under tooth root: ' + material)
        children[material] = actor
    attached_labels = {x.get_actor_label() for x in root.get_attached_actors()}
    expected_labels = {x.get_actor_label() for material, x in children.items()
                       if material != 'enamel'}
    require(attached_labels == expected_labels,
            'Logical tooth attachment hierarchy incomplete')
    require(len(children) == len(sections), 'Tooth sections lost after actor assembly')
    return root, children


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
        'importedMaterialSections': {},
        'importStageDiagnostics': {'before': [], 'after': []},
        'actorHierarchy': {},
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
        before, before_rows = import_native_obj(
            folder / MODEL_NAMES[0], 'KL_FDI16_Before',
            manifest['sceneStates']['before']['byMaterial'],
            manifest['sceneStates']['before']['triangles'],
            report['importStageDiagnostics']['before'])
        after, after_rows = import_native_obj(
            folder / MODEL_NAMES[1], 'KL_FDI16_AfterCut',
            manifest['sceneStates']['after']['byMaterial'],
            manifest['sceneStates']['after']['triangles'],
            report['importStageDiagnostics']['after'])
        report['importedMaterialSections'] = {'before': before_rows,
                                              'after': after_rows}
        report['importedMeshes'] = [
            r['assetPath'] for rows in (before_rows, after_rows) for r in rows.values()]
        report['importedTrianglesLOD0'] = {
            'before': sum(row['triangleCount'] for row in before_rows.values()),
            'after': sum(row['triangleCount'] for row in after_rows.values())
        }
        for state in ('before', 'after'):
            require(report['importedTrianglesLOD0'][state] ==
                    int(manifest['sceneStates'][state]['triangles']),
                    'Aggregate native triangle mismatch for ' + state)

        level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        require(level.new_level(LEVEL), 'Native Unreal Editor failed to create a new level')
        a, a_children = mesh_actor(before, 'KL_FDI16_BEFORE_SOURCE_MESH', -120)
        b, b_children = mesh_actor(after, 'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH', 120)
        report['actorHierarchy'] = {
            'before': {'rootActor': a.get_actor_label(),
                       'sections': {m: x.get_actor_label()
                                    for m, x in a_children.items()}},
            'after': {'rootActor': b.get_actor_label(),
                      'sections': {m: x.get_actor_label()
                                   for m, x in b_children.items()}}
        }
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
