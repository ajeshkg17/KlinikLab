"""Unreal-free regression fixtures for native grouped OBJ imports."""
import importlib.util
import unittest
from pathlib import Path

source=Path(__file__).resolve().parents[1] / 'visual-qa' / 'sr1b_section_contract.py'
spec=importlib.util.spec_from_file_location('sr1b_section_contract', str(source))
contract=importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)

BEFORE={'enamel':12000,'dentin':1800,'pulp':80,'cementum':900,'caries':76}
AFTER={'enamel':12080,'dentin':1800,'pulp':80,'cementum':900,'caries':76}

def native_rows(counts, prefix='KL_FDI16_Before'):
    return [
        {'assetName':prefix+'_'+mat,
         'assetPath':'/Game/KlinikLab/NativeMeshes/'+prefix+'_'+mat+'.'+prefix+'_'+mat,
         'triangleCount':count,
         'materialSlots':['KL_'+mat],
         'materialInterfaces':['KL_'+mat]}
        for mat,count in counts.items() if count>0
    ]

class SectionContractTest(unittest.TestCase):
    def test_actual_reported_total_fixture_before_after(self):
        self.assertEqual(sum(BEFORE.values()),14856)
        self.assertEqual(sum(AFTER.values()),14936)
        for counts, name in [(BEFORE,'before'),(AFTER,'after')]:
            rows=native_rows(counts, 'KL_FDI16_'+name)
            result=contract.validate_sections(rows, counts, sum(counts.values()))
            self.assertEqual(list(result),list(contract.MATERIALS))
            self.assertEqual(sum(x['triangleCount'] for x in result.values()),sum(counts.values()))
            self.assertEqual(result['enamel']['materialInterfaces'],['KL_enamel'])

    def test_importer_order_is_irrelevant(self):
        rows=native_rows(BEFORE)
        self.assertEqual(list(contract.validate_sections(rows[::-1],BEFORE,14856)),list(contract.MATERIALS))

    def test_incomplete_missing_group_fails(self):
        rows=native_rows(BEFORE)[:-1]
        with self.assertRaisesRegex(ValueError,'section count'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_missing_or_generic_material_interface_fails(self):
        rows=native_rows(BEFORE)
        rows[0]['materialInterfaces']=['WorldGridMaterial']
        with self.assertRaisesRegex(ValueError,'interface'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_interface_swapped_to_other_tissue_fails_even_when_triangle_total_matches(self):
        rows=native_rows(BEFORE)
        rows[0]['materialInterfaces']=['KL_dentin']
        with self.assertRaisesRegex(ValueError,'Ambiguous'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_triangle_parity_not_merely_aggregate(self):
        rows=native_rows(BEFORE)
        rows[0]['triangleCount']+=3
        rows[1]['triangleCount']-=3
        with self.assertRaisesRegex(ValueError,'per-material triangle mismatch'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_one_asset_with_mixed_material_slots_rejected(self):
        rows=native_rows(BEFORE)
        rows[0]['materialInterfaces']=['KL_enamel','KL_dentin']
        rows[0]['materialSlots']=['KL_enamel','KL_dentin']
        with self.assertRaisesRegex(ValueError,'exactly one'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_duplicated_asset_path_and_group_rejected(self):
        rows=native_rows(BEFORE)
        rows[1]['assetPath']=rows[0]['assetPath']
        with self.assertRaisesRegex(ValueError,'Duplicate native StaticMesh path'):
            contract.validate_sections(rows,BEFORE,14856)
        rows=native_rows(BEFORE)
        rows[1]['assetName']=rows[0]['assetName']
        rows[1]['materialInterfaces']=['KL_enamel']
        rows[1]['materialSlots']=['KL_enamel']
        with self.assertRaisesRegex(ValueError,'Duplicate native tissue group'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_unexpected_sixth_section_is_rejected(self):
        rows=native_rows(BEFORE)+[{'assetName':'Default','assetPath':'/Game/Default.Default',
                                   'triangleCount':1,'materialSlots':['WorldGrid'],
                                   'materialInterfaces':['WorldGrid']}]
        with self.assertRaisesRegex(ValueError,'section count'):
            contract.validate_sections(rows,BEFORE,14856)

    def test_source_manifest_is_nonempty_and_exact(self):
        rows=native_rows(BEFORE)
        for counts,total in [(dict(BEFORE,enamel=-1),14856),
                             (dict(BEFORE,enamel=0),14856),
                             (dict(BEFORE,unknown=1),14857),
                             (BEFORE,14857)]:
            with self.assertRaises(ValueError):
                contract.validate_sections(rows,counts,total)

if __name__=='__main__':
    unittest.main()
