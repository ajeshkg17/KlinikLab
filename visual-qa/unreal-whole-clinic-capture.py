"""SR1J UnrealEditor live private-desktop auto capture, not a commandlet render.
Three real native UE CameraActor captures, 42s continuously changed editor
viewport; never a synthetic PNG, headless/nullRHI, SendKeys or manual HighResShot.
This script is run ONLY inside actual UE5.8 Editor launched by owner PC.
"""
import hashlib
import json
import math
import os
import time
import traceback
from pathlib import Path
import unreal

SOURCE='f4d4d4151851a08342def08d9f2e461f5f5e7109'
LEVEL='/Game/Maps/L_KlinikLab_WholeClinic'
run=Path(os.environ.get('KLINIKLAB_SR1J_EVIDENCE_DIR','')).resolve()
capture=run/'Captures'
report_path=capture/'unreal-whole-clinic-native-report.json'
start=time.monotonic()
images=[
 ('unreal-whole-clinic-overview.png',3.0),
 ('unreal-whole-clinic-angled.png',24.0),
 ('unreal-fdi16-cut-occlusal.png',40.0)]
state={'requested':set(),'done':False,'frames':0,'error':None,'screenshotTasks':[],
 'selectionEvents':[],'captureContexts':{},'selectionIndex':-1}
active_case_actor=None
active_station_actor=None
case_rows=[]
station_rows=[]
_callback_handle=None

def digest(file):
 h=hashlib.sha256()
 with open(file,'rb') as f:
  for block in iter(lambda:f.read(1048576),b''):
   h.update(block)
 return h.hexdigest()

def select_workflow_preview(index,elapsed):
 """Native displayed selection preview; never modifies original tooth geometry."""
 ci,si=((0,0),(1,4),(0,4))[index]  # FDI16, FDI36 metadata, FDI16 cut
 c=case_rows[ci]
 station=station_rows[si]
 case_comp=active_case_actor.get_component_by_class(unreal.TextRenderComponent)
 station_comp=active_station_actor.get_component_by_class(unreal.TextRenderComponent)
 if case_comp is None or station_comp is None:
  raise RuntimeError('Native case/station status TextRender components missing')
 fdi=str(c['fdi'])
 case_comp.set_text('ACTIVE FDI '+fdi+' / '+str(c['id']).upper()+
  (' - ORIGINAL FDI16 MESH' if fdi=='16' else ' - METADATA ONLY, NO CASE MESH'))
 station_comp.set_text('STATION '+str(si+1)+'/7: '+str(station['id']).upper())
 state['selectionEvents'].append({
  'timeSec':round(elapsed,3),'caseId':str(c['id']),'selectedFDI':fdi,
  'stationId':str(station['id']),
  'originalFDI16GeometryCorrectlyAttributed':fdi=='16',
  'caseSpecificFDI36GeometryClaimed':False})
 state['selectionIndex']=index

def write_and_quit():
 if state['done']:
  return
 state['done']=True
 durations=time.monotonic()-start
 pngs={}
 for name,when in images:
  p=capture/name
  if p.is_file() and p.stat().st_size>25000:
   pngs[name]={'sha256':digest(p),'bytes':p.stat().st_size}
 report={
  'schemaVersion':1,'status':'EVIDENCE_INCOMPLETE',
  'sourceSHA':SOURCE,'nativeLevel':LEVEL,
  'engine':'UnrealEditor 5.8 D3D12 private desktop',
  'unrealPid':os.getpid(),
  'nativeScreenshotFiles':list(pngs),
  'originalNativePngs':pngs,
  'workflowSelectionEvents':state['selectionEvents'],
  'workflowCaptureContexts':state['captureContexts'],
  'workflowNativeSelectionVerified':(len(state['selectionEvents'])==3 and
    [v['selectedFDI'] for v in state['selectionEvents']]==['16','36','16'] and
    [v['stationId'] for v in state['selectionEvents']]==['interview','practical','practical'] and
    len(state['captureContexts'])==3 and
    [state['captureContexts'].get(n,{}).get('selectedFDI') for n,_ in images]==['16','36','16']),
  'threeViewImageFilesPresent':len(pngs)==3,
  'elapsedSeconds':round(durations,3),
  'orbitViewportTicks':state['frames'],
  'sourceTrianglesBefore':14856,'sourceTrianglesAfter':14936,
  'sourceDerivedCases':6,'sourceDerivedStations':7,
  'gpuPidRtx5060DxgiVerified':False,
  'nativePixelsIndependentlyReviewed':False,
  'fullKlinikLabApplicationMigrated':False,
  'clinicalAccuracyVerified':False,'questVerified':False,
  'headlessOrNullRHIFallback':False,'foregroundActivationRequested':False,
  'captureError':state['error'],
  'limitation':'Unreal schematic operatory with original FDI16, not the full application'
 }
 if len(pngs)==3 and durations>=40 and state['frames']>=30 and not state['error'] and report['workflowNativeSelectionVerified']:
  report['status']='UNREAL_NATIVE_THREE_IMAGES_PENDING_PID_DXGI_GPU_AND_PIXEL_REVIEW'
 report_path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 unreal.log('KL_SR1J_NATIVE_RENDER_STATUS='+report['status']+' pid='+str(os.getpid()))
 try:
  if _callback_handle is not None:
   unreal.unregister_slate_post_tick_callback(_callback_handle)
 except Exception:
  pass
 unreal.SystemLibrary.quit_editor()

try:
 if not capture.is_dir():
  raise RuntimeError('Owner PC private-desktop source-bound capture directory missing')
 if report_path.exists():
  raise RuntimeError('Immutable Unreal native result file already exists')
 stage=json.loads((run/'unreal-whole-clinic-build.json').read_text('utf-8-sig'))
 if (stage.get('sourceSHA')!=SOURCE or
     stage.get('status')!='UNREAL_WHOLE_CLINIC_SCENE_SAVED_NOT_GPU_RENDERED' or
     not stage.get('sourceTeethRetainedAfterLevelReload') or
     stage.get('wholeClinicObjectCount',0)<35):
  raise RuntimeError('Source-verified whole clinic scene never passed native build gate')
 sub=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
 if sub is None or not sub.load_level(LEVEL):
  raise RuntimeError('Actual UE native clinic level could not load in editor')
 actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
 camera=next((a for a in actors if a.get_actor_label()=='KL_CLINIC_OVERVIEW_CAMERA'),None)
 if camera is None:
  raise RuntimeError('Source-provenance native clinic camera actor absent')
 labels={a.get_actor_label() for a in actors}
 manifest=json.loads((run/'original-cases-stations.json').read_text('utf-8-sig'))
 case_rows=manifest.get('cases',[])
 station_rows=manifest.get('stations',[])
 if (manifest.get('sourceGitSHA')!=SOURCE or
     [x.get('id') for x in case_rows]!=['molar','endo','anterior','crown','surgery','perio'] or
     [str(x.get('fdi')) for x in case_rows]!=['16','36','11','26','48','46'] or
     [x.get('id') for x in station_rows]!=['interview','letter','handover','written','practical','viva','clinic']):
  raise RuntimeError('Original source six cases/seven stations mismatch')
 active_case_actor=next((a for a in actors if a.get_actor_label()=='KL_ACTIVE_CASE_STATUS'),None)
 active_station_actor=next((a for a in actors if a.get_actor_label()=='KL_ACTIVE_STATION_STATUS'),None)
 if active_case_actor is None or active_station_actor is None:
  raise RuntimeError('Whole clinic native active case/station status actors missing')
 select_workflow_preview(0,0.0)
 for label in ('KL_DENTAL_CHAIR_SEAT','KL_PROCEDURE_LIGHT_DIFFUSER',
  'KL_INSTRUMENT_TRAY','KL_FDI16_BEFORE_SOURCE_MESH',
  'KL_FDI16_AFTER_SIMULATED_CUT_SOURCE_MESH','KL_TRAINING_STATION_clinic'):
  if label not in labels:
   raise RuntimeError('Whole clinic native actor missing '+label)
 viewport=sub.get_active_viewport_config_key()
 sub.editor_set_viewport_realtime(True,viewport)
 sub.editor_set_game_view(True,viewport)
except Exception as exc:
 state['error']=str(exc)+'\n'+traceback.format_exc()
 unreal.log_error('SR1J native render preflight failed: '+str(exc))
 # Do not return apparently successful status.
 write_and_quit()

def _on_tick(delta):
 if state['done']:
  return
 try:
  elapsed=time.monotonic()-start
  # Native state transitions bracket the original image captures.
  if elapsed>=31.0 and state['selectionIndex']<2:
   select_workflow_preview(2,elapsed)
  elif elapsed>=15.0 and state['selectionIndex']<1:
   select_workflow_preview(1,elapsed)
  # sustained revolving live UE editor view on private WinSta0 desktop
  t=max(0.0,min(elapsed/42.0,1.0))
  yaw=-14.0 + 31.0*t
  x=-740.0*math.cos(math.radians(yaw))
  y=740.0*math.sin(math.radians(yaw))
  if elapsed>=36.0:
   # True elevated occlusal angle of original source-derived AFTER tooth,
   # still correctly FDI16. No other case geometry substituted.
   at=unreal.Vector(-145.0,65.0,280.0)
   target=unreal.Vector(0.0,65.0,74.0)
  else:
   at=unreal.Vector(x,y,210.0+180.0*t)
   target=unreal.Vector(90.0,0.0,95.0)
  camera.set_actor_location(at,False,False)
  facing=unreal.MathLibrary.find_look_at_rotation(at,target)
  camera.set_actor_rotation(facing,False)
  sub.set_level_viewport_camera_info(at,facing,viewport)
  sub.editor_invalidate_viewports()
  state['frames']+=1
  for index,(name,deadline) in enumerate(images):
   if elapsed>=deadline and name not in state['requested']:
    p=capture/name
    if p.exists():
     raise RuntimeError('Native original PNG would be overwritten: '+name)
    # Unreal native high-res capture requests actual Editor viewport/camera
    # pixels. Its output is independently verified by the WinPS collector.
    state['screenshotTasks'].append(unreal.AutomationLibrary.take_high_res_screenshot(1600,900,str(p),camera))
    state['requested'].add(name)
    event=state['selectionEvents'][-1]
    state['captureContexts'][name]={
     'caseId':event['caseId'],'selectedFDI':event['selectedFDI'],
     'stationId':event['stationId'],'atSec':round(elapsed,3)}
  if elapsed>=50.0:
   if len(state['requested'])!=3:
    raise RuntimeError('Native camera missed one or more automated capture requests')
   write_and_quit()
 except Exception as exc:
  state['error']=str(exc)+'\n'+traceback.format_exc()
  unreal.log_error('SR1J native private desktop render callback blocked: '+str(exc))
  write_and_quit()

if not state['done']:
 _callback_handle=unreal.register_slate_post_tick_callback(_on_tick)
 # Native scene has loaded; the external collector may NOW open its 1Hz PDH
 # query. This is an immutable readiness record, not GPU acceptance.
 ready=capture/'unreal-native-capture-ready.json'
 with ready.open('x',encoding='utf-8') as f:
  json.dump({'schemaVersion':1,'status':'NATIVE_UNREAL_EDITOR_CALLBACK_REGISTERED',
    'unrealPid':os.getpid(),'sourceSHA':SOURCE,
    'level':LEVEL,'durationTargetSec':42,
    'privateDesktopStatus':'OWNER_LAUNCHER_ATTESTATION_REQUIRED',
    'gpuProcessVerified':False},f,indent=2)
 unreal.log('SR1J live private native Unreal Editor orbit READY: '+str(capture))
