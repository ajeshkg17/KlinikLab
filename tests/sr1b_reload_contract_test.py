"""Focused regression: reported UE5.8.4 actor-label dict-KEY bug.

The production contract requires exact two original tooth root LABEL VALUES,
different native paths, native Actor class and five visible original tissue
sections/material interfaces for BOTH before and after. No source count changes.
"""
import ast
import copy
import importlib.util
import unittest
from pathlib import Path

root = Path(__file__).resolve().parents[1]
helper = root / 'visual-qa/sr1b_reload_contract.py'
builder = root / 'visual-qa/sr1b-unreal-build-clinical-level.py'
spec = importlib.util.spec_from_file_location('sr1b_reload_contract', str(helper))
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
bspec=importlib.util.spec_from_file_location('sr1b_native_bounds',root/'visual-qa/sr1b_native_bounds.py')
bounds=importlib.util.module_from_spec(bspec)
bspec.loader.exec_module(bounds)
SOURCE_SECTIONS={state:{t:{'sourceLocalBoundsCm':{'min':[-.5,-.5,-.5],'max':[.5,.5,.5]},'targetWorldTranslationCm':[0.,float(y),74.]} for t in contract.MATERIALS} for state,y in [('before',-65),('after',65)]}

EXPECTED = {
    'before': 'KL_FDI16_BEFORE_SOURCE_MESH',
    'after': 'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH'
}
COUNTS = {
    'before': {'enamel': 10320, 'dentin': 112, 'pulp': 207,
               'cementum': 4105, 'caries': 112},
    'after': {'enamel': 10308, 'dentin': 205, 'pulp': 207,
              'cementum': 4105, 'caries': 111}
}


def inventory():
    rows = []
    for state, label in EXPECTED.items():
        components = []
        for tissue in contract.MATERIALS:
            material = 'KL_' + tissue
            components.append({
                'componentName': 'SR1B_' + state + '_' + tissue,
                'componentClass': 'ProceduralMeshComponent',
                'componentTags': ['KL_TISSUE_' + tissue.upper()],
                'componentVisible':True,'componentHiddenInGame':False,
                'worldBoundsOriginCm':[0.,-65. if state=='before' else 65.,74.],
                'worldBoundsExtentCm':[.5,.5,.5],
                'sectionCount': 1, 'sectionVisible': True,
                'materialName': material,
                'materialPath': '/Game/KlinikLab/NativeMeshes/' +
                                material + '.' + material
            })
        rows.append({'actorLabel': label, 'actorClass': 'Actor',
                     'actorName': 'Actor_' + state,
                     'actorPath': '/Game/Maps/L_KlinikLab_FDI16.PersistentLevel.' +
                                  'KL_FDI16_' + state,
                     'proceduralComponents': components,
                     'componentClasses': [{'componentName': c['componentName'],
                                           'componentClass': c['componentClass']}
                                          for c in components]})
    rows.append({'actorLabel': 'KL_FDI16_CASE_ID', 'actorClass': 'TextRenderActor',
                 'actorName': 'TextRenderActor_0',
                 'actorPath': '/Game/Maps/L_KlinikLab_FDI16.PersistentLevel.Case',
                 'proceduralComponents': [], 'componentClasses': []})
    return rows


class StrictReloadContractTests(unittest.TestCase):
    def test_actual_failure_exactly_reproduced_and_corrected(self):
        rows = inventory()
        # Original bug: label compared to dictionary KEYS ('before','after').
        old_bug = [r for r in rows if r['actorLabel'] in EXPECTED]
        self.assertEqual(old_bug, [])
        # Correct new contract resolves VALUES and validates both tooth sections.
        output = contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        self.assertEqual(set(output), {'before', 'after'})
        for state in ('before', 'after'):
            self.assertEqual(set(output[state]), set(contract.MATERIALS))
            self.assertTrue(all(v['savedSectionCount'] == 1 and
                                v['savedSectionVisible'] for v in output[state].values()))

    def test_lost_actor_diagnostic_exposes_observed_labels_and_classes(self):
        rows = inventory()
        rows.pop(1)
        with self.assertRaisesRegex(ValueError, 'enumerated=.*KL_FDI16_BEFORE_SOURCE_MESH.*Actor'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_changed_label_suffix_must_fail_not_guess(self):
        rows = inventory()
        rows[1]['actorLabel'] += '_1'
        with self.assertRaisesRegex(ValueError, 'occurred 0 times'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_duplicate_actor_label_and_identity_must_fail(self):
        rows = inventory()
        rows.append(copy.deepcopy(rows[0]))
        with self.assertRaisesRegex(ValueError, 'occurred 2 times'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_native_class_and_actor_paths_are_strict(self):
        rows = inventory()
        rows[0]['actorClass'] = 'StaticMeshActor'
        with self.assertRaisesRegex(ValueError, 'class is not native Actor'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        rows = inventory()
        rows[1]['actorPath'] = rows[0]['actorPath']
        with self.assertRaisesRegex(ValueError, 'same native path'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_exact_five_tissue_components_and_classes_required(self):
        rows = inventory()
        rows[1]['proceduralComponents'].pop()
        with self.assertRaisesRegex(ValueError, 'section count differs'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        rows = inventory()
        rows[0]['proceduralComponents'][0]['componentClass'] = 'StaticMeshComponent'
        with self.assertRaisesRegex(ValueError, 'not native ProceduralMeshComponent'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_missing_ambiguous_or_duplicate_tissue_tag_must_fail(self):
        rows = inventory()
        rows[0]['proceduralComponents'][0]['componentTags'] = []
        with self.assertRaisesRegex(ValueError, 'missing/ambiguous'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        rows = inventory()
        rows[0]['proceduralComponents'][0]['componentTags'] = [
            'KL_TISSUE_ENAMEL','KL_TISSUE_CARIES']
        with self.assertRaisesRegex(ValueError, 'missing/ambiguous'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        rows = inventory()
        rows[0]['proceduralComponents'][1]['componentTags'] = ['KL_TISSUE_ENAMEL']
        with self.assertRaisesRegex(ValueError, 'duplicated'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_invisible_or_missing_procedural_section_must_fail(self):
        rows = inventory()
        rows[0]['proceduralComponents'][0]['sectionVisible'] = False
        with self.assertRaisesRegex(ValueError, 'not visible'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        rows = inventory()
        rows[0]['proceduralComponents'][0]['sectionCount'] = 0
        with self.assertRaisesRegex(ValueError, 'section missing'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_material_name_and_asset_path_must_match_original_tissue(self):
        rows = inventory()
        rows[0]['proceduralComponents'][1]['materialName'] = 'KL_enamel'
        with self.assertRaisesRegex(ValueError, 'material identity mismatch'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)
        rows = inventory()
        rows[0]['proceduralComponents'][1]['materialPath'] = '/Game/Default.Default'
        with self.assertRaisesRegex(ValueError, 'material identity mismatch'):
            contract.validate_loaded_actor_inventory(rows, EXPECTED, COUNTS)

    def test_manifest_counts_five_groups_and_two_states_strict(self):
        counts = copy.deepcopy(COUNTS)
        del counts['after']['caries']
        with self.assertRaisesRegex(ValueError, 'source tissue groups unavailable'):
            contract.validate_loaded_actor_inventory(inventory(), EXPECTED, counts)
        bad = dict(EXPECTED, after=EXPECTED['before'])
        with self.assertRaisesRegex(ValueError, 'labels must differ'):
            contract.validate_loaded_actor_inventory(inventory(), bad, COUNTS)


def extract_function(name, namespace):
    tree = ast.parse(builder.read_text(encoding='utf8'))
    fn = next(x for x in tree.body if isinstance(x, ast.FunctionDef) and x.name == name)
    exec(compile(ast.Module(body=[fn], type_ignores=[]), str(builder), 'exec'), namespace)
    return namespace[name]


class FakeLevel:
    def __init__(self, succeed=True):
        self.succeed=succeed
        self.loaded=[]
    def load_level(self, path):
        self.loaded.append(path)
        return self.succeed


class FakeUnreal:
    class LevelEditorSubsystem:
        pass
    def __init__(self, level):
        self.level=level
    def get_editor_subsystem(self, cls):
        return self.level


class LiveFunctionIntegrationTests(unittest.TestCase):
    def test_before_after_inventories_persisted_and_exact_matching(self):
        level=FakeLevel()
        inventories=[
            {'actors': inventory(), 'selectedEnumerationAPI': 'EditorActorSubsystem'},
            {'actors': inventory(), 'selectedEnumerationAPI': 'EditorActorSubsystem'}
        ]
        def get_inventory():
            return inventories.pop(0)
        ns={'unreal':FakeUnreal(level),
            'LEVEL':'/Game/Maps/L_KlinikLab_FDI16',
            'editor_actor_inventory':get_inventory,
            'validate_loaded_actor_inventory':contract.validate_loaded_actor_inventory,
            'check_native_component_bounds':bounds.check_native_component_bounds,
            'require':lambda ok,msg:None if ok else (_ for _ in ()).throw(RuntimeError(msg))}
        verifier=extract_function('verify_reloaded_procedural_scene',ns)
        diagnostics={}
        result=verifier(EXPECTED,COUNTS,diagnostics,SOURCE_SECTIONS)
        self.assertEqual(set(result),{'before','after'})
        self.assertEqual(level.loaded,['/Game/Maps/L_KlinikLab_FDI16'])
        self.assertTrue(diagnostics['bothToothActorsAndTenTissueSectionsValidated'])
        self.assertEqual(len(diagnostics['beforeReload']['actors']),3)
        self.assertEqual(len(diagnostics['afterReload']['actors']),3)

    def test_failed_reloaded_inventory_retained_for_json_report(self):
        level=FakeLevel()
        after=inventory()
        after[1]['actorLabel'] += '_2'
        sequences=iter([{'actors':inventory()}, {'actors':after}])
        ns={'unreal':FakeUnreal(level),
            'LEVEL':'/Game/Maps/L_KlinikLab_FDI16',
            'editor_actor_inventory':lambda:next(sequences),
            'validate_loaded_actor_inventory':contract.validate_loaded_actor_inventory,
            'require':lambda ok,msg:None if ok else (_ for _ in ()).throw(RuntimeError(msg))}
        verifier=extract_function('verify_reloaded_procedural_scene',ns)
        diagnostics={}
        with self.assertRaisesRegex(ValueError, 'occurred 0 times'):
            verifier(EXPECTED,COUNTS,diagnostics,SOURCE_SECTIONS)
        self.assertEqual(diagnostics['afterReload']['actors'][1]['actorLabel'],
                         EXPECTED['after']+'_2')
        self.assertIn('beforeReload',diagnostics)
        self.assertNotIn('bothToothActorsAndTenTissueSectionsValidated',diagnostics)


class ClassDescriptor:
    def __init__(self,name): self.name=name
    def get_name(self): return self.name


class FakeNativeComponent:
    def __init__(self,tissue,state):
        self.tissue=tissue
        self.state=state
    def get_name(self): return 'KL_Section_'+self.tissue
    def get_class(self): return ClassDescriptor('ProceduralMeshComponent')
    def get_editor_property(self,key):
        if key=='component_tags':return ['KL_TISSUE_'+self.tissue.upper()]
        if key=='hidden_in_game':return False
        raise RuntimeError('Unexpected component property')
    def is_visible(self):return True
    def get_num_sections(self): return 1
    def is_mesh_section_visible(self,index): return index==0
    def get_material(self,index):
        if index!=0: raise RuntimeError('Wrong material slot')
        tissue=self.tissue
        class Mat:
            def get_name(self): return 'KL_'+tissue
            def get_path_name(self):
                return '/Game/KlinikLab/NativeMeshes/KL_'+tissue+'.KL_'+tissue
        return Mat()


class FakeNativeActor:
    def __init__(self,state,label):
        self.state=state
        self.label=label
        self.comps=[FakeNativeComponent(t,state) for t in contract.MATERIALS]
    def get_actor_label(self): return self.label
    def get_class(self): return ClassDescriptor('Actor')
    def get_name(self): return 'Actor_'+self.state
    def get_path_name(self): return '/Game/Maps/L_KlinikLab_FDI16.PersistentLevel.Actor_'+self.state
    def get_components_by_class(self,cls): return list(self.comps)


class FakeVector:
    def __init__(self,x,y,z):self.x=x;self.y=y;self.z=z


class FakeEditorUniverse:
    class SystemLibrary:
        @staticmethod
        def get_component_bounds(comp):
            return FakeVector(0.,float(-65 if comp.state=='before' else 65),74.),FakeVector(.5,.5,.5),.87
    class EditorActorSubsystem: pass
    class ActorComponent: pass
    class ProceduralMeshComponent: pass
    def __init__(self, actors, modern=None):
        self.actors=actors
        self.modern=modern
        owner=self
        class Actors:
            def get_all_level_actors(self): return list(owner.actors if owner.modern is None else owner.modern)
        self.subsystem=Actors()
        class Legacy:
            @staticmethod
            def get_all_level_actors(): return list(owner.actors)
        self.EditorLevelLibrary=Legacy
    def get_editor_subsystem(self,cls): return self.subsystem


class ActualActorInventoryTests(unittest.TestCase):
    def test_editor_actor_inventory_records_real_labels_classes_and_five_tissues(self):
        actors=[FakeNativeActor(state,label) for state,label in EXPECTED.items()]
        env=FakeEditorUniverse(actors)
        ns={'unreal':env,
            'require':lambda ok,msg:None if ok else (_ for _ in ()).throw(RuntimeError(msg))}
        collect=extract_function('editor_actor_inventory',ns)
        report=collect()
        self.assertEqual(report['selectedEnumerationAPI'],
                         'EditorActorSubsystem.get_all_level_actors')
        self.assertEqual(report['actorCount'],2)
        self.assertEqual([a['actorLabel'] for a in report['actors']],
                         list(EXPECTED.values()))
        self.assertEqual([a['actorClass'] for a in report['actors']],['Actor','Actor'])
        for row in report['actors']:
            self.assertEqual(len(row['proceduralComponents']),5)
            self.assertEqual(len(row['componentClasses']),5)
            self.assertEqual(row['proceduralComponents'][0]['materialName'],'KL_enamel')
        contract.validate_loaded_actor_inventory(report['actors'],EXPECTED,COUNTS)

    def test_enumeration_fallback_diagnostics_not_silent(self):
        actors=[FakeNativeActor(state,label) for state,label in EXPECTED.items()]
        env=FakeEditorUniverse(actors,modern=[])
        ns={'unreal':env,
            'require':lambda ok,msg:None if ok else (_ for _ in ()).throw(RuntimeError(msg))}
        collect=extract_function('editor_actor_inventory',ns)
        report=collect()
        self.assertEqual(report['selectedEnumerationAPI'],
                         'EditorLevelLibrary.get_all_level_actors')
        self.assertEqual(report['enumerationAttempts'][0]['count'],0)
        self.assertEqual(report['enumerationAttempts'][1]['count'],2)
        contract.validate_loaded_actor_inventory(report['actors'],EXPECTED,COUNTS)


if __name__=='__main__':
    unittest.main()
