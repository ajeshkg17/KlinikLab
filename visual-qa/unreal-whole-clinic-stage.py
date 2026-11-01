"""SR1J add whole schematic dental operatory to a COPY of verified UE5.8 FDI16 level.
This stages a new native .umap only. Original OBJ/source geometry, Godot job07,
full KlinikLab clinical logic and GPU/pixel acceptance are NEVER substituted.
Executed ONLY by the bounded separate Unreal Editor build phase.
"""
import hashlib
import json
import os
import traceback
from pathlib import Path
import unreal

SOURCE = 'f4d4d4151851a08342def08d9f2e461f5f5e7109'
ORIGINAL = '/Game/Maps/L_KlinikLab_FDI16'
WHOLE = '/Game/Maps/L_KlinikLab_WholeClinic'
EXPECTED_CASES = ('molar','endo','anterior','crown','surgery','perio')
EXPECTED_FDI = ('16','36','11','26','48','46')
EXPECTED_STATIONS = ('interview','letter','handover','written','practical','viva','clinic')

def check(pred, reason):
    if not pred:
        raise RuntimeError('SR1J UNREAL WHOLE CLINIC BLOCKED: '+reason)

def spawn(klass, label, xyz, rotation=None):
    obj=unreal.EditorLevelLibrary.spawn_actor_from_class(
        klass, unreal.Vector(*[float(v) for v in xyz]),
        rotation or unreal.Rotator(0,0,0))
    check(obj is not None, 'actor spawn failed '+label)
    obj.set_actor_label(label)
    return obj

def shape(kind,label,location,scale):
    asset = unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/'+kind+'.'+kind)
    check(asset is not None,'built-in source-only '+kind+' mesh asset missing')
    a=spawn(unreal.StaticMeshActor,label,location)
    comp=a.get_component_by_class(unreal.StaticMeshComponent)
    check(comp is not None,'no native StaticMeshComponent '+label)
    comp.set_static_mesh(asset)
    a.set_actor_scale3d(unreal.Vector(*[float(x) for x in scale]))
    check(comp.get_editor_property('static_mesh') is not None,'missing placed mesh '+label)
    return a

def label(name,txt,xyz,size=12):
    a=spawn(unreal.TextRenderActor,name,xyz,unreal.Rotator(0,180,0))
    c=a.get_component_by_class(unreal.TextRenderComponent)
    check(c is not None,'TextRenderComponent unavailable')
    c.set_text(str(txt))
    c.set_world_size(float(size))
    return a

def proof(actors):
    items={a.get_actor_label():a for a in actors}
    for state in ('BEFORE','AFTER_SIMULATED_CUT'):
        name='KL_FDI16_'+state+'_SOURCE_MESH'
        check(name in items,'source-preserved procedural tooth missing: '+name)
        a=items[name]
        sections=list(a.get_components_by_class(unreal.ProceduralMeshComponent))
        check(len(sections)==5,'source FDI16 must retain five procedural tissue components: '+name)
        for c in sections:
            check(c.get_num_sections()==1 and c.is_mesh_section_visible(0) and c.is_visible(),
                'native original tooth tissue hidden/lost: '+name)
    return True

def main():
    evidence=Path(os.environ.get('KLINIKLAB_SR1J_EVIDENCE_DIR','')).resolve()
    cases_path=Path(os.environ.get('KLINIKLAB_SR1J_CASES','')).resolve()
    check(str(evidence) not in ('.',''),'required unique source-bound evidence directory')
    check(evidence.is_dir() and cases_path.is_file(),'new evidence/case manifest unavailable')
    report_path=evidence/'unreal-whole-clinic-build.json'
    check(not report_path.exists(),'immutable Unreal clinic build already attempted')
    record={'schemaVersion':1,'engine':'Unreal Engine 5.8','sourceSHA':SOURCE,
      'sourceLevel':ORIGINAL,'nativeLevel':WHOLE,'status':'EVIDENCE_INCOMPLETE',
      'sourceExactProceduralBeforeTriangles':14856,
      'sourceExactProceduralAfterTriangles':14936,
      'sixSourceCasesVerified':False,'sevenStationsVerified':False,
      'sourceTeethRetainedAfterLevelReload':False,
      'wholeClinicObjectCount':0,'fullKlinikLabApplicationMigrated':False,
      'nativeImagesCaptured':False,'gpuPidLuidVerified':False,'questVerified':False,
      'imageIndependentlyReviewed':False,'errors':[]}
    try:
        data=json.loads(cases_path.read_text(encoding='utf-8-sig'))
        check(data.get('sourceGitSHA')==SOURCE and
              data.get('kind')=='PRODUCTION_CASE_AND_STATION_METADATA_NOT_FULL_APP',
              'source-bound original app.js cases/stations mismatch')
        case_rows=data.get('cases',[])
        station_rows=data.get('stations',[])
        check(len(case_rows)==6 and len(station_rows)==7 and
              data.get('syntheticCasesOnly') is True and
              data.get('clinicalAssessmentValidated') is False,
              'synthetic source metadata counts/claims invalid')
        check(tuple(c['id'] for c in case_rows)==EXPECTED_CASES and
              tuple(c['fdi'] for c in case_rows)==EXPECTED_FDI,'case/FDi order wrong')
        check(tuple(c['id'] for c in station_rows)==EXPECTED_STATIONS,'station identities wrong')
        record['sixSourceCasesVerified']=True
        record['sevenStationsVerified']=True

        existing=unreal.EditorAssetLibrary.load_asset(ORIGINAL)
        check(existing is not None,'source-derived original UE clinical level missing')
        check(not unreal.EditorAssetLibrary.does_asset_exist(WHOLE),'whole-clinic destination level already exists')
        check(bool(unreal.EditorAssetLibrary.duplicate_asset(ORIGINAL,WHOLE)),
              'could not create immutable second clinical level')
        subsystem=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        check(subsystem is not None and subsystem.load_level(WHOLE),
              'new Unreal whole clinic level did not load')
        actor_api=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        check(actor_api is not None,'editor actor subsystem unavailable')
        proof(list(actor_api.get_all_level_actors()))
        # Native built-in Engine basic-shape assets only. cm units are schematic.
        objects=[]
        def B(name,xyz,scale):objects.append(shape('Cube',name,xyz,scale))
        def C(name,xyz,scale):objects.append(shape('Cylinder',name,xyz,scale))
        def T(name,text,xyz,size=12):objects.append(label(name,text,xyz,size))
        B('KL_ROOM_FLOOR',(80,0,-35),(8,8,.25))
        B('KL_ROOM_BACK_WALL',(450,0,175),(.16,8,4.5))
        B('KL_CLINIC_WALL_ACCENT',(440,0,320),(.3,8,.08))
        B('KL_LEFT_STORAGE_CABINET',(330,-410,40),(1.7,1.5,1.5))
        B('KL_RIGHT_STORAGE_CABINET',(330,410,40),(1.7,1.5,1.5))
        B('KL_WALL_SCREEN_FRAME',(430,0,225),(.2,3,1.45))
        B('KL_WALL_SCREEN_PANEL',(416,0,225),(.2,2.8,1.27))
        T('KL_SCREEN_TITLE','KLINIKLAB / UE NATIVE CLINIC',(402,0,270),15)
        T('KL_SCREEN_SCOPE','EDUCATIONAL WORKSPACE - NOT FULL APPLICATION',(402,0,230),8)
        # In native captures these two labels change as the educational
        # case/station preview advances; static catalog labels alone do
        # not demonstrate workflow selection. No simulated FDI36 mesh.
        T('KL_ACTIVE_CASE_STATUS','ACTIVE FDI 16 / MOLAR - ORIGINAL FDI16 MESH',(403,0,210),8)
        T('KL_ACTIVE_STATION_STATUS','STATION 1/7: INTERVIEW',(403,0,193),8)
        # Chair is a visually identified educational schematic model.
        C('KL_CHAIR_BASE',(165,330,-4),(1.7,1.7,.35))
        B('KL_DENTAL_CHAIR_SEAT',(190,330,75),(2,1.15,.28))
        back=shape('Cube','KL_DENTAL_CHAIR_BACK',(290,330,150),(.35,1.15,2.4))
        back.set_actor_rotation(unreal.Rotator(0,-37,0),False)
        objects.append(back)
        B('KL_DENTAL_CHAIR_HEADREST',(330,330,235),(.8,1,.18))
        for k,d in enumerate((-115,115)):
            B('KL_CHAIR_ARMREST_'+str(k),(180,330+d,116),(1.55,.17,.2))
        C('KL_PROCEDURE_LIGHT_POST',(280,550,165),(.1,.1,4.2))
        B('KL_PROCEDURE_LIGHT_ARM',(150,470,355),(2.9,.15,.12))
        B('KL_PROCEDURE_LIGHT_DIFFUSER',(85,390,335),(.95,.65,.2))
        C('KL_INSTRUMENT_CART_POST',(240,-345,24),(.15,.15,1.15))
        B('KL_INSTRUMENT_TRAY',(240,-345,105),(2.8,1.8,.14))
        for i,tool in enumerate(('mirror','explorer','bur','syringe','composite')):
            C('KL_TOOL_'+tool,(170+i*35,-345,120),(.055,.055,.6))
            T('KL_TOOL_LABEL_'+tool,tool,(160+i*35,-425,139),5)
        for i,y in enumerate((-65,65)):
            B('KL_FDI16_PODIUM_'+str(i),(10,y,12),(2,1,.2))
            T('KL_FDI16_LABEL_'+str(i),
              'FDI16 BEFORE' if i==0 else 'FDI16 SIMULATED CUT',(22,y,33),9)
        for i,c in enumerate(case_rows):
            T('KL_CASE_METADATA_'+c['id'],'FDI '+c['fdi']+' '+c['id'].upper(),
              (390,-330+i*105,215),8)
        for i,s in enumerate(station_rows):
            B('KL_TRAINING_STATION_'+s['id'],(-310,-320+i*100,-15),(1.3,.8,.15))
            T('KL_STATION_LABEL_'+s['id'],s['id'].upper(),
              (-300,-320+i*100,5),7)
        light=spawn(unreal.DirectionalLight,'KL_ROOM_DIRECTIONAL_LIGHT',(-170,0,340),
                    unreal.Rotator(-48,20,0))
        objects.append(light)
        objects.append(spawn(unreal.PointLight,'KL_WORKSPACE_FILL_LIGHT',(0,0,310)))
        camera=spawn(unreal.CameraActor,'KL_CLINIC_OVERVIEW_CAMERA',(-740,0,250),
                     unreal.Rotator(-7,0,0))
        objects.append(camera)
        record['wholeClinicObjectCount']=len(objects)
        check(len(objects)>=35,'whole-clinic environment actor count too small')
        check(subsystem.save_current_level(),'failed to save generated native Unreal whole clinic map')
        check(subsystem.load_level(WHOLE),'new UE level could not be reloaded')
        all_actors=list(actor_api.get_all_level_actors())
        proof(all_actors)
        actor_names={a.get_actor_label() for a in all_actors}
        for required in ('KL_ACTIVE_CASE_STATUS','KL_ACTIVE_STATION_STATUS',
                         'KL_CLINIC_OVERVIEW_CAMERA'):
            check(required in actor_names,'case/station preview actor missing after level reload: '+required)
        record['nativeWorkflowPreviewActorsVerified']=True
        record['sourceTeethRetainedAfterLevelReload']=True
        record['status']='UNREAL_WHOLE_CLINIC_SCENE_SAVED_NOT_GPU_RENDERED'
        unreal.log('SR1J source-provenance native whole clinic level SAVED, GPU proof pending')
    except Exception as e:
        record['errors'].append(str(e))
        record['errors'].append(traceback.format_exc())
        unreal.log_error('SR1J WHOLE CLINIC BLOCKED: '+str(e))
        raise
    finally:
        report_path.write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')

main()
