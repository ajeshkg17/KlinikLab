"""Regression: UE5.8.4 StaticMesh drops 10320->6724/6721; explicit native
ProceduralMesh buffers must still contain all source faces per material."""
import ast
import importlib.util
import types
import unittest
from pathlib import Path

root=Path(__file__).resolve().parents[1]
source=root/'visual-qa/sr1b_procedural_buffers.py'
spec=importlib.util.spec_from_file_location('sr1b_procedural_buffers',source)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
builder=root/'visual-qa/sr1b-unreal-build-clinical-level.py'
MATERIALS=('enamel','dentin','pulp','cementum','caries')
TRIS={'enamel':10320,'dentin':112,'pulp':207,'cementum':4105,'caries':112}

def face(z=0):
    return ((0.,0.,z),(0.,1.,z),(1.,0.,z))

class FakeMaterial:
    def __init__(self,name):self.name=name
    def get_path_name(self):return '/Game/Materials/'+self.name

class FakeComponent:
    def __init__(self,owner):
        self.owner=owner;self.section=None;self.material=None;self.props={}
        owner.comps.append(self)
    def create_mesh_section_linear_color(self,index,verts,tris,normals,
                                          uv0,uv1,uv2,uv3,cols,tangents,collision,srgb):
        assert index==0 and not collision and not srgb
        assert len(verts)==len(tris)==len(normals)
        assert tris==list(range(len(verts)))
        self.section=(verts,tris)
    def get_num_sections(self):return int(self.section is not None)
    def is_mesh_section_visible(self,i):return i==0 and self.section is not None
    def set_material(self,i,mat):assert i==0;self.material=mat
    def get_material(self,i):return self.material
    def set_editor_property(self,key,value):self.props[key]=value
    def get_name(self):return 'NativeProc_'+str(len(self.owner.comps))

class FakeActor:
    def __init__(self):self.comps=[]
    def get_components_by_class(self,cls):return self.comps
    def get_actor_label(self):return 'KL_FDI16_BEFORE_SOURCE_MESH'

class FakeSubsystem:
    def __init__(self,root):self.root=root
    def k2_gather_subobject_data_for_instance(self,actor):return [actor]
    def add_new_subobject(self,params):
        component=FakeComponent(self.root)
        return component,None

class FakeLibrary:
    @staticmethod
    def is_handle_valid(handle):return isinstance(handle,FakeComponent)
    @staticmethod
    def get_data(handle):return handle
    @staticmethod
    def get_associated_object(handle):return handle

class FakeUnreal:
    class ProceduralMeshComponent(FakeComponent):pass
    class AddNewSubobjectParams:
        def __init__(self,**kw):self.kw=kw
    SubobjectDataSubsystem=FakeSubsystem
    SubobjectDataBlueprintFunctionLibrary=FakeLibrary
    Name=str
    Vector=staticmethod(lambda *x:tuple(x))
    def __init__(self,root):self.root=root;self.subsystem=FakeSubsystem(root)
    def get_engine_subsystem(self,cls):return self.subsystem
    def set_actor_factory(self,fn):self.spawn=fn

def extract_function(name,globals_):
    tree=ast.parse(builder.read_text(encoding='utf8'))
    function=next(x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name==name)
    exec(compile(ast.Module(body=[function],type_ignores=[]),str(builder),'exec'),globals_)
    return globals_[name]

def require(ok,message):
    if not ok:raise RuntimeError(message)

class SourceExactTests(unittest.TestCase):
    def test_10320_source_triangles_survive_even_when_static_render_has_6724_or_6721(self):
        source_faces=[face()]*10320
        buf=mod.exact_source_buffers(source_faces)
        for reported_static_count in (6724,6721):
            self.assertNotEqual(reported_static_count,buf['submittedTriangles'])
            self.assertEqual(buf['submittedTriangles'],10320)
            self.assertEqual(len(buf['indices']),30960)
            self.assertEqual(buf['indices'][0:6],[0,1,2,3,4,5])
        self.assertEqual(buf['sourceCoordinateSHA256'],
                         mod.exact_source_buffers(source_faces)['sourceCoordinateSHA256'])

    def test_five_material_index_buffers_preserve_before_fdi16_14856(self):
        self.assertEqual(sum(TRIS.values()),14856)
        for tissue,n in TRIS.items():
            buf=mod.exact_source_buffers([face()]*n)
            self.assertEqual(buf['submittedTriangles'],n,tissue)
            self.assertEqual(len(buf['positions']),3*n,tissue)
            self.assertEqual(len(buf['normals']),3*n,tissue)

    def test_zero_area_nonfinite_and_empty_source_fail(self):
        for triangles in ([],[((0,0,0),(1,0,0),(2,0,0))],
                          [((0,0,0),(1,0,0),(0,float('nan'),0))]):
            with self.assertRaises(ValueError):
                mod.exact_source_buffers(triangles)

    def test_mock_native_procedural_component_keeps_10320_not_static_6721(self):
        actor=FakeActor()
        fake=FakeUnreal(actor)
        # Ensure isinstance validation references the same component class.
        def add_component(params):
            comp=fake.ProceduralMeshComponent(actor)
            return comp,None
        fake.subsystem.add_new_subobject=add_component
        scope={'unreal':fake,'require':require,'MATERIALS':MATERIALS,
               'exact_source_buffers':mod.exact_source_buffers,
               'spawn':lambda cls,x,y,z,name:actor}
        build=extract_function('native_procedural_tooth_actor',scope)
        mats={name:{'materialInterface':FakeMaterial('KL_'+name)} for name in MATERIALS}
        geometry={name:[face()]*n for name,n in TRIS.items()}
        _,rows=build('KL_FDI16_BEFORE_SOURCE_MESH',-120,mats,geometry,TRIS)
        self.assertEqual(len(actor.comps),5)
        self.assertEqual(sum(x['proceduralTrianglesSubmitted'] for x in rows.values()),14856)
        self.assertEqual(len(actor.comps[0].section[1]),30960)
        for name,comp in zip(MATERIALS,actor.comps):
            self.assertEqual(len(comp.section[1])//3,TRIS[name])
            self.assertEqual(comp.get_material(0).name,'KL_'+name)

if __name__=='__main__':unittest.main()
