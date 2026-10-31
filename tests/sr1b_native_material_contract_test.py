"""Regression for real owner UE5.8.4 MaterialInstanceConstant two_sided failure."""
import importlib.util
import unittest
from pathlib import Path

source = Path(__file__).resolve().parents[1] / 'visual-qa' / 'sr1b_native_material_contract.py'
spec = importlib.util.spec_from_file_location('sr1b_native_material_contract', source)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)


class Overrides:
    def __init__(self):
        self.fields={'override_two_sided':False,'two_sided':False}
    def set_editor_property(self,name,value):
        if name not in self.fields:
            raise RuntimeError('Unknown MaterialInstanceBasePropertyOverrides attribute: '+name)
        self.fields[name]=value
    def get_editor_property(self,name):
        return self.fields[name]


class MaterialInstanceConstant:
    def __init__(self,tissue='enamel'):
        self._name='KL_'+tissue
        self._path='/Game/KlinikLab/NativeMeshes/'+self._name+'.'+self._name
        self.overrides=Overrides()
        self.accesses=[]
        self.readback_corrupt=False
    def get_name(self):return self._name
    def get_path_name(self):return self._path
    def get_editor_property(self,name):
        self.accesses.append(('get',name))
        if name=='two_sided':
            raise RuntimeError("MaterialInstanceConstant: Failed to find property 'two_sided' "
                               "for attribute 'two_sided' on MaterialInstanceConstant")
        if name=='base_property_overrides':
            if self.readback_corrupt and self.overrides.fields['override_two_sided']:
                out=Overrides()
                out.fields['override_two_sided']=False
                return out
            return self.overrides
        raise RuntimeError('Unknown material instance property: '+name)
    def set_editor_property(self,name,value):
        self.accesses.append(('set',name))
        if name!='base_property_overrides':
            raise RuntimeError('Cannot set undeclared material instance property: '+name)
        self.overrides=value


class Material:
    def __init__(self,tissue='pulp'):
        self._name='KL_'+tissue
        self._path='/Game/KlinikLab/NativeMeshes/'+self._name+'.'+self._name
        self.values={'two_sided':False}
    def get_name(self):return self._name
    def get_path_name(self):return self._path
    def get_editor_property(self,name):return self.values[name]
    def set_editor_property(self,name,value):self.values[name]=value


class UnsupportedMaterial:
    def get_name(self):return 'KL_caries'
    def get_path_name(self):return '/Game/Bad.KL_caries'
    def get_class(self):
        class C:
            def get_name(self):return 'NonMaterial'
        return C()


class UnrealApi:
    MaterialInstanceConstant=MaterialInstanceConstant
    Material=Material
    class MaterialEditingLibrary:
        calls=[]
        @classmethod
        def update_material_instance(cls,instance):
            cls.calls.append(instance.get_path_name())
    class EditorAssetLibrary:
        saved=[]
        fail=False
        @classmethod
        def save_loaded_asset(cls,material):
            cls.saved.append(material.get_path_name())
            return not cls.fail


class TestCorrectNativeMaterialApi(unittest.TestCase):
    def setUp(self):
        UnrealApi.MaterialEditingLibrary.calls.clear()
        UnrealApi.EditorAssetLibrary.saved.clear()
        UnrealApi.EditorAssetLibrary.fail=False

    def test_exact_ue584_mic_error_is_avoided_and_original_instance_is_preserved(self):
        material=MaterialInstanceConstant('enamel')
        before_path=material.get_path_name()
        proof=policy.ensure_two_sided_native_material(material,'enamel',UnrealApi)
        self.assertEqual(material.get_path_name(),before_path)
        self.assertEqual(proof['materialClass'],'MaterialInstanceConstant')
        self.assertTrue(proof['materialIdentityPreserved'])
        self.assertTrue(proof['materialSavedAndReadbackVerified'])
        self.assertTrue(material.overrides.get_editor_property('override_two_sided'))
        self.assertTrue(material.overrides.get_editor_property('two_sided'))
        self.assertNotIn(('get','two_sided'),material.accesses)
        self.assertNotIn(('set','two_sided'),material.accesses)
        self.assertEqual(UnrealApi.MaterialEditingLibrary.calls,[before_path])
        self.assertEqual(UnrealApi.EditorAssetLibrary.saved,[before_path])

    def test_all_five_material_instance_tissue_identities(self):
        for tissue in ('enamel','dentin','pulp','cementum','caries'):
            m=MaterialInstanceConstant(tissue)
            result=policy.ensure_two_sided_native_material(m,tissue,UnrealApi)
            self.assertEqual(result['tissue'],tissue)
            self.assertEqual(result['materialAssetPath'],m.get_path_name())
            self.assertTrue(result['overrideTwoSided'])
            self.assertTrue(result['twoSided'])

    def test_direct_base_material_uses_material_two_sided(self):
        m=Material('pulp')
        proof=policy.ensure_two_sided_native_material(m,'pulp',UnrealApi)
        self.assertTrue(m.get_editor_property('two_sided'))
        self.assertEqual(proof['twoSidedPolicy'],'MATERIAL_BASE_TWO_SIDED')
        self.assertEqual(UnrealApi.MaterialEditingLibrary.calls,[])

    def test_wrong_material_tissue_and_generic_asset_must_fail(self):
        with self.assertRaisesRegex(RuntimeError,'identity does not match'):
            policy.ensure_two_sided_native_material(MaterialInstanceConstant('caries'),
                                                    'enamel',UnrealApi)
        with self.assertRaisesRegex(RuntimeError,'identity does not match'):
            policy.ensure_two_sided_native_material(Material('DefaultMaterial'), 'pulp',UnrealApi)

    def test_unknown_material_interface_cannot_bypass_contract(self):
        with self.assertRaisesRegex(RuntimeError,'Unsupported Unreal tissue material class'):
            policy.ensure_two_sided_native_material(UnsupportedMaterial(),'caries',UnrealApi)

    def test_failed_asset_save_is_blocking(self):
        UnrealApi.EditorAssetLibrary.fail=True
        with self.assertRaisesRegex(RuntimeError,'Could not persist'):
            policy.ensure_two_sided_native_material(MaterialInstanceConstant('dentin'),'dentin',UnrealApi)

    def test_missing_base_override_readback_is_blocking(self):
        m=MaterialInstanceConstant('cementum')
        m.readback_corrupt=True
        with self.assertRaisesRegex(RuntimeError,'did not retain explicit two-sided'):
            policy.ensure_two_sided_native_material(m,'cementum',UnrealApi)


if __name__=='__main__':
    unittest.main()
