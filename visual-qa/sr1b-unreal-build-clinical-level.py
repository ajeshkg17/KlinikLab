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
from sr1b_procedural_buffers import exact_source_buffers
from sr1b_native_material_contract import ensure_two_sided_native_material

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


def import_native_materials_only(obj_file, name, expected_counts, diagnostics):
    """Import materials and original mesh-source diagnostics, NOT render geometry.

    UE5.8's StaticMesh build reproducibly drops 10320 -> 6724 (and 6721
    with direct mesh description), despite retaining 10320 source polygons.
    The discarded static render LOD MUST NOT be the clinical render input.
    """
    task = unreal.AssetImportTask()
    for key, value in {
        'filename': str(obj_file),
        'destination_path': '/Game/KlinikLab/NativeMeshes',
        'destination_name': name,
        'automated': True,
        'replace_existing': False,
        'save': True
    }.items():
        task.set_editor_property(key, value)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    meshes = [x for x in list(task.get_objects()) if isinstance(x, unreal.StaticMesh)]
    wanted = {m for m, n in expected_counts.items() if n > 0}
    require(len(meshes) == len(wanted),
            'Native material asset import did not yield exactly one mesh per tissue')
    found = {}
    for mesh in meshes:
        slots = list(mesh.get_editor_property('static_materials'))
        require(len(slots) == 1, 'Expected exactly one tissue material slot: ' + mesh.get_name())
        material = slots[0].get_editor_property('material_interface')
        require(material is not None, 'Missing imported native material interface: ' + mesh.get_name())
        tissue = tissue_from_name(material.get_name())
        require(tissue == tissue_from_name(mesh.get_name()) and tissue in wanted,
                'Native imported material/mesh group mismatch: ' + mesh.get_name())
        require(tissue not in found, 'Duplicate native imported material group: ' + tissue)
        source_desc = mesh.get_static_mesh_description(0)
        require(source_desc is not None, 'Native OBJ source MeshDescription unavailable: ' + tissue)
        source_count = int(source_desc.get_triangle_count())
        require(source_count == int(expected_counts[tissue]),
                'Native OBJ source MeshDescription differs from SHA-verified OBJ: ' +
                tissue + ', source=' + str(expected_counts[tissue]) +
                ', description=' + str(source_count))
        static_count = int(mesh.get_num_triangles(0))
        two_sided_proof = ensure_two_sided_native_material(material, tissue, unreal)
        require(two_sided_proof['materialIdentityPreserved'] and
                two_sided_proof['materialSavedAndReadbackVerified'],
                'Native tissue material was not independently persisted: ' + tissue)
        diagnostics.append({
            'twoSidedMaterialVerification':two_sided_proof,
            'material':tissue,'sourceMeshDescriptionTriangles':source_count,
            'staticMeshRenderLOD0Triangles_DIAGNOSTIC_NOT_USED':static_count,
            'lostStaticFaces_DIAGNOSTIC':source_count-static_count,
            'nativeMaterialInterface':material.get_path_name(),
            'renderGeometrySource':'EXACT_SOURCE_OBJ_PROCEDURAL_INDEX_BUFFER',
            'sourceVsStaticDiscrepancyAcceptedForRendering':False
        })
        found[tissue] = {
            'materialInterface':material,
            'staticMesh':mesh,'staticLOD0DiagnosticOnly':static_count,
            'originalSourceTriangles':source_count
        }
    require(set(found) == wanted, 'Missing native clinical material source group')
    return found


def native_procedural_tooth_actor(name, y_offset, materials, source_triangles,
                                 expected_counts):
    """A SINGLE named native Actor with five ProceduralMeshComponent sections.

    The buffers never call StaticMesh build/LOD/simplification. This preserves
    the original triangle index stream, unlike the observed UE5.8 StaticMesh
    path. Section presence is rechecked after saving and reloading the level.
    """
    root = spawn(unreal.Actor, 0, y_offset, 74, name)
    subsystem = unreal.get_engine_subsystem(unreal.SubobjectDataSubsystem)
    require(subsystem is not None, 'SubobjectDataSubsystem unavailable')
    handles = list(subsystem.k2_gather_subobject_data_for_instance(root))
    require(handles, 'Native actor root SubobjectDataHandle missing')
    actor_handle = handles[0]
    lib = unreal.SubobjectDataBlueprintFunctionLibrary
    per_tissue = {}
    wanted = {m for m in MATERIALS if int(expected_counts[m]) > 0}
    for tissue in MATERIALS:
        if tissue not in wanted:
            continue
        source = source_triangles[tissue]
        buffers = exact_source_buffers(source)
        require(buffers['submittedTriangles'] == int(expected_counts[tissue]),
                'Procedural source index count mismatch: ' + tissue)
        params = unreal.AddNewSubobjectParams(
            parent_handle=actor_handle,
            new_class=unreal.ProceduralMeshComponent,
            blueprint_context=None)
        handle, failure = subsystem.add_new_subobject(params)
        require(lib.is_handle_valid(handle),
                'Cannot create native persistent ProceduralMeshComponent: ' + str(failure))
        data = lib.get_data(handle)
        component = lib.get_associated_object(data)
        require(isinstance(component, unreal.ProceduralMeshComponent),
                'Subobject actor instance did not produce a procedural mesh: ' + tissue)
        # Separate material-specific components; one exact topology section per
        # group. No smoothing/welding; normals derived face-by-face from OBJ.
        vertices = [unreal.Vector(*xyz) for xyz in buffers['positions']]
        normals = [unreal.Vector(*xyz) for xyz in buffers['normals']]
        component.create_mesh_section_linear_color(
            0, vertices, buffers['indices'], normals,
            [], [], [], [], [], [], False, False)
        require(component.get_num_sections() == 1 and
                component.is_mesh_section_visible(0),
                'Native procedural tissue mesh section unavailable after source upload: ' + tissue)
        mat = materials[tissue]['materialInterface']
        component.set_material(0, mat)
        assigned = component.get_material(0)
        require(assigned is not None and assigned.get_path_name() == mat.get_path_name(),
                'Native procedural material source lost: ' + tissue)
        component.set_editor_property('component_tags', [unreal.Name('KL_TISSUE_'+tissue.upper())])
        per_tissue[tissue] = {
            'sourceTriangles':len(source),
            'proceduralIndicesSubmitted':len(buffers['indices']),
            'proceduralTrianglesSubmitted':buffers['submittedTriangles'],
            'sourceCoordinateSHA256':buffers['sourceCoordinateSHA256'],
            'minDoubledAreaCm2':buffers['minDoubledAreaCm2'],
            'materialInterface':mat.get_path_name(),
            'sectionCountAfterUpload':int(component.get_num_sections()),
            'sectionVisibleAfterUpload':bool(component.is_mesh_section_visible(0)),
            'componentName':component.get_name()
        }
    require(set(per_tissue) == wanted, 'Missing procedural tooth tissue section')
    require(sum(x['proceduralTrianglesSubmitted'] for x in per_tissue.values()) ==
            sum(int(n) for n in expected_counts.values()),
            'Native procedural actor total submitted triangles differ from the original source')
    require(len(root.get_components_by_class(unreal.ProceduralMeshComponent)) == len(wanted),
            'Native actor does not own all original tissue procedural mesh components')
    return root, per_tissue


def verify_reloaded_procedural_scene(expected_actors, counts_by_state):
    """Verify components survive native .umap save/load, without inventing raster evidence.

    UE Python exposes get_num_sections and section visibility but not the
    non-Blueprint GetProcMeshSection raw index buffer. Accordingly full
    persisted index parity must remain PENDING until visual and/or C++ review.
    """
    level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    require(bool(level.load_level(LEVEL)), 'Saved clinical level could not be reloaded')
    actors = list(unreal.EditorLevelLibrary.get_all_level_actors())
    by_name = {a.get_actor_label():a for a in actors
               if a.get_actor_label() in expected_actors}
    require(set(by_name) == set(expected_actors),
            'Reloaded native clinical scene lost either tooth actor')
    results = {}
    for state, label in expected_actors.items():
        actor = by_name[label]
        comps = list(actor.get_components_by_class(unreal.ProceduralMeshComponent))
        count = len([m for m, n in counts_by_state[state].items() if n > 0])
        require(len(comps) == count,
                'Reloaded procedural tooth lost tissue components: ' + state)
        observed = {}
        for comp in comps:
            tags = [str(t).lower() for t in list(comp.get_editor_property('component_tags'))]
            tissues = [m for m in MATERIALS if 'kl_tissue_'+m in tags]
            require(len(tissues) == 1 and tissues[0] not in observed,
                    'Reloaded native tooth component tissue tag invalid or duplicated: ' + state)
            tissue = tissues[0]
            require(comp.get_num_sections() == 1 and comp.is_mesh_section_visible(0),
                    'Reloaded native tooth lost its visible triangle section: ' + tissue)
            mat = comp.get_material(0)
            require(mat is not None and tissue_from_name(mat.get_name()) == tissue,
                    'Reloaded native tooth material identity incorrect: ' + tissue)
            observed[tissue] = {
                'savedSectionCount':int(comp.get_num_sections()),
                'savedSectionVisible':bool(comp.is_mesh_section_visible(0)),
                'savedMaterial':mat.get_path_name()
            }
        require(set(observed) == {m for m, n in counts_by_state[state].items() if n > 0},
                'Reloaded tooth has wrong tissue group set')
        results[state] = observed
    return results



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
        'renderPath': 'NATIVE_PROCEDURAL_MESH_EXACT_OBJ_FACE_INDEX_BUFFERS',
        'nativeProceduralSourceTrianglesSubmitted': {},
        'nativeProceduralSections': {},
        'nativeProceduralReloadedSections': {},
        'sourceTopologyAcceptedInProceduralInput': False,
        'savedProceduralTriangleIndexReadbackVerified': False,
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
        # Native StaticMesh OBJ import is MATERIAL/SOURCE DIAGNOSTICS ONLY.
        # UE5.8.4 reported source MeshDescription enamel 10320 but render LOD0
        # 6724 after flags and 6721 after direct StaticMesh rebuild. The actual
        # dental renderer below feeds original indexed triangles directly into
        # ProceduralMeshComponent, bypassing the lossy StaticMesh render build.
        before_source = read_obj_triangles(
            folder / MODEL_NAMES[0], manifest['sceneStates']['before']['byMaterial'])
        after_source = read_obj_triangles(
            folder / MODEL_NAMES[1], manifest['sceneStates']['after']['byMaterial'])
        before_mat = import_native_materials_only(
            folder / MODEL_NAMES[0], 'KL_FDI16_Before',
            manifest['sceneStates']['before']['byMaterial'],
            report['importStageDiagnostics']['before'])
        after_mat = import_native_materials_only(
            folder / MODEL_NAMES[1], 'KL_FDI16_AfterCut',
            manifest['sceneStates']['after']['byMaterial'],
            report['importStageDiagnostics']['after'])
        report['importedMaterialSections'] = {
            state: {
                tissue: {
                    'assetPath':source[tissue]['staticMesh'].get_path_name(),
                    'triangleCount':len(faces[tissue]),
                    'staticRenderLOD0Triangles_DIAGNOSTIC_ONLY':
                        source[tissue]['staticLOD0DiagnosticOnly'],
                    'sourceMeshDescriptionTriangles':source[tissue]['originalSourceTriangles'],
                    'materialInterface':source[tissue]['materialInterface'].get_path_name()
                }
                for tissue in source
            }
            for state,source,faces in (
                ('before',before_mat,before_source),('after',after_mat,after_source))
        }
        report['importedMeshes'] = [
            part['assetPath'] for state in report['importedMaterialSections'].values()
            for part in state.values()]
        report['importedTrianglesLOD0'] = {
            'before': sum(x['staticLOD0DiagnosticOnly'] for x in before_mat.values()),
            'after': sum(x['staticLOD0DiagnosticOnly'] for x in after_mat.values())
        }
        # Never compare a lossy STATIC LOD to the source as though that static
        # mesh is the selected native clinical render path.
        level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        require(level.new_level(LEVEL), 'Native Unreal Editor failed to create a new level')
        a, before_proc = native_procedural_tooth_actor(
            'KL_FDI16_BEFORE_SOURCE_MESH', -120, before_mat, before_source,
            manifest['sceneStates']['before']['byMaterial'])
        b, after_proc = native_procedural_tooth_actor(
            'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH', 120, after_mat, after_source,
            manifest['sceneStates']['after']['byMaterial'])
        report['nativeProceduralSections'] = {
            'before':before_proc,'after':after_proc}
        report['nativeProceduralSourceTrianglesSubmitted'] = {
            state:sum(item['proceduralTrianglesSubmitted'] for item in groups.values())
            for state,groups in report['nativeProceduralSections'].items()
        }
        for state in ('before','after'):
            require(report['nativeProceduralSourceTrianglesSubmitted'][state] ==
                    int(manifest['sceneStates'][state]['triangles']),
                    'Native procedural indexed original source triangle parity failed: '+state)
        report['sourceTopologyAcceptedInProceduralInput'] = True
        report['actorHierarchy'] = {
            'before':{'rootActor':a.get_actor_label(),
                      'sections':{m:'KL_TISSUE_'+m.upper() for m in before_proc}},
            'after':{'rootActor':b.get_actor_label(),
                     'sections':{m:'KL_TISSUE_'+m.upper() for m in after_proc}}
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
        report['nativeProceduralReloadedSections'] = verify_reloaded_procedural_scene(
            {'before':'KL_FDI16_BEFORE_SOURCE_MESH',
             'after':'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH'},
            {'before':manifest['sceneStates']['before']['byMaterial'],
             'after':manifest['sceneStates']['after']['byMaterial']})
        # Python's exposed ProceduralMeshComponent has no triangle-index
        # readback. Submission is strict; persistence of sections is verified;
        # original native pixels and exact post-reload index bytes are NOT.
        report['savedProceduralTriangleIndexReadbackVerified'] = False
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
