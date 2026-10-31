"""Unreal-free tests: source OBJ parsing and direct StaticMeshDescription path."""
import ast
import importlib.util
import tempfile
import types
import unittest
from pathlib import Path

root=Path(__file__).resolve().parents[1]
source=root/'visual-qa/sr1b_topology_source.py'
spec=importlib.util.spec_from_file_location('sr1b_topology_source', str(source))
top=importlib.util.module_from_spec(spec)
spec.loader.exec_module(top)
unreal_script=root/'visual-qa/sr1b-unreal-build-clinical-level.py'

def tiny_obj():
    return ('mtllib kliniklab-fdi16.mtl\n'
      'o FDI16_BEFORE\ns 1\n'
      'g FDI16_enamel\nusemtl KL_enamel\n'
      'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 3 2\n'
      'g FDI16_cementum\nusemtl KL_cementum\n'
      'v 0 0 1\nv 1 0 1\nv 0 1 1\nf 4 6 5\n')

def fixture(tmp):
    p=Path(tmp)/'original.obj'
    p.write_text(tiny_obj(), encoding='utf8')
    return p

class FakeDescription:
    def __init__(self):
        self.vertices=[];self.instances=[];self.triangles=[];self.material=None
    def create_polygon_group(self):return 0
    def set_polygon_group_material_slot_name(self, group, name):
        assert group==0;self.material=str(name)
    def reserve_new_vertices(self,n):self.expected_vertices=n
    def reserve_new_vertex_instances(self,n):self.expected_instances=n
    def reserve_new_triangles(self,n):self.expected_triangles=n
    def create_vertex(self):
        x=len(self.vertices);self.vertices.append(None);return x
    def set_vertex_position(self,id,pos):self.vertices[id]=tuple(pos)
    def create_vertex_instance(self,id):
        i=len(self.instances);self.instances.append(id);return i
    def set_vertex_instance_uv(self,i,uv,k):pass
    def create_triangle(self,group,instances):self.triangles.append(tuple(instances))
    def get_triangle_count(self):return len(self.triangles)

class FakeMesh:
    def __init__(self,loss=0):self.loss=loss;self.num=0;self.descriptor=None
    def build_from_static_mesh_descriptions(self,desc,collision,fast):
        assert not collision and not fast
        self.descriptor=desc[0]
        self.num=len(self.descriptor.triangles)-self.loss
    def get_num_triangles(self,lod):assert lod==0;return self.num

class ReaderTests(unittest.TestCase):
    def test_exact_material_faces_no_decimation_or_axis_guess(self):
        with tempfile.TemporaryDirectory() as t:
            g=top.read_obj_triangles(fixture(t),{'enamel':1,'dentin':0,'pulp':0,
                                                'cementum':1,'caries':0})
            self.assertEqual(g['enamel'][0],((0.,0.,0.),(0.,1.,0.),(1.,0.,0.)))
            self.assertEqual(len(g['cementum']),1)
    def test_reject_source_manifest_mismatch(self):
        with tempfile.TemporaryDirectory() as t:
            with self.assertRaisesRegex(ValueError,'differ'):
                top.read_obj_triangles(fixture(t),{'enamel':2,'dentin':0,'pulp':0,
                                                   'cementum':1,'caries':0})
    def test_reject_degenerate_and_out_of_bounds_source_faces(self):
        with tempfile.TemporaryDirectory() as t:
            p=fixture(t)
            p.write_text(tiny_obj().replace('v 0 1 0','v 0 0 0'))
            with self.assertRaisesRegex(ValueError,'Degenerate'):
                top.read_obj_triangles(p,{'enamel':1,'dentin':0,'pulp':0,'cementum':1,'caries':0})
            p.write_text(tiny_obj().replace('f 1 3 2','f 1 3 999'))
            with self.assertRaisesRegex(ValueError,'index error'):
                top.read_obj_triangles(p,{'enamel':1,'dentin':0,'pulp':0,'cementum':1,'caries':0})
    def test_reject_unexpected_external_material(self):
        with tempfile.TemporaryDirectory() as t:
            p=fixture(t)
            p.write_text(tiny_obj().replace('KL_enamel','PatientScan'))
            with self.assertRaisesRegex(ValueError,'Unexpected source OBJ material'):
                top.read_obj_triangles(p,{'enamel':1,'dentin':0,'pulp':0,'cementum':1,'caries':0})

def load_build_under_fake_unreal():
    tree=ast.parse(unreal_script.read_text(encoding='utf8'))
    fn=next(x for x in tree.body if isinstance(x,ast.FunctionDef) and
            x.name=='rebuild_from_source_triangle_stream')
    class UM:
        class StaticMesh:
            create_static_mesh_description=staticmethod(lambda:FakeDescription())
        Name=str
        Vector=staticmethod(lambda *p: tuple(p))
        Vector2D=staticmethod(lambda *p: tuple(p))
        class EditorAssetLibrary:
            save_loaded_asset=staticmethod(lambda mesh:True)
    ns={'unreal':UM,'MATERIALS':top.MATERIALS,'require':lambda cond,msg:
         None if cond else (_ for _ in ()).throw(RuntimeError(msg))}
    exec(compile(ast.Module(body=[fn],type_ignores=[]),
                str(unreal_script),'exec'),ns)
    return ns['rebuild_from_source_triangle_stream']

class NativeBuildTests(unittest.TestCase):
    def test_owner_pc_source_triangle_stream_reconstructed_without_loss(self):
        build=load_build_under_fake_unreal()
        # We reproduce the exact actual-UE enamel source->import difference:
        # expected 10320; imported had 6724, so the direct builder must use all
        # 10320 source triangles, NOT imported render triangles.
        base=((0.,0.,0.),(0.,1.,0.),(1.,0.,0.))
        source=[base]*10320
        mesh=FakeMesh()
        report=build(mesh,source,'enamel')
        self.assertEqual(report['directInputTriangles'],10320)
        self.assertEqual(report['savedNativeTriangles'],10320)
        self.assertEqual(mesh.descriptor.material,'KL_enamel')
        self.assertEqual(len(mesh.descriptor.vertices),30960)
    def test_cementum_owner_pc_source_count_reconstruction(self):
        build=load_build_under_fake_unreal()
        base=((0.,0.,1.),(1.,0.,1.),(0.,1.,1.))
        mesh=FakeMesh()
        report=build(mesh,[base]*4105,'cementum')
        self.assertEqual(report['savedNativeTriangles'],4105)
        self.assertEqual(mesh.descriptor.material,'KL_cementum')
    def test_even_native_direct_build_loss_must_fail_closed(self):
        build=load_build_under_fake_unreal()
        base=((0.,0.,0.),(0.,1.,0.),(1.,0.,0.))
        with self.assertRaisesRegex(RuntimeError,'still removed source OBJ triangles'):
            build(FakeMesh(loss=1),[base]*20,'enamel')
    def test_invalid_tissue_material_must_not_be_synthesized(self):
        build=load_build_under_fake_unreal()
        base=((0.,0.,0.),(0.,1.,0.),(1.,0.,0.))
        with self.assertRaisesRegex(RuntimeError,'Unexpected original source material'):
            build(FakeMesh(),[base],'scan')

if __name__=='__main__': unittest.main()
