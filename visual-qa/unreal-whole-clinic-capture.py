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
state={'requested':set(),'done':False,'frames':0,'error':None}

def digest(file):
 h=hashlib.sha256()
 with open(file,'rb') as f:
  for block in iter(lambda:f.read(1048576),b''):
   h.update(block)
 return h.hexdigest()

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
 if len(pngs)==3 and durations>=40 and state['frames']>=30 and not state['error']:
  report['status']='UNREAL_NATIVE_THREE_IMAGES_PENDING_PID_DXGI_GPU_AND_PIXEL_REVIEW'
 report_path.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
 unreal.log('KL_SR1J_NATIVE_RENDER_STATUS='+report['status']+' pid='+str(os.getpid()))
 try:
  unreal.unregister_slate_post_tick_callback(callback)
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

def callback(delta):
 if state['done']:
  return
 try:
  elapsed=time.monotonic()-start
  # sustained revolving live UE editor view on private WinSta0 desktop
  t=max(0.0,min(elapsed/42.0,1.0))
  yaw=-14.0 + 31.0*t
  x=-740.0*math.cos(math.radians(yaw))
  y= 740.0*math.sin(math.radians(yaw))
  camera.set_actor_location(unreal.Vector(x,y,210.0+180.0*t),False,False)
  camera.set_actor_rotation(unreal.Rotator(-5.0-20.0*t,yaw,0),False)
  sub.set_level_viewport_camera_info(camera.get_actor_location(),
                                    camera.get_actor_rotation(),viewport)
  sub.editor_invalidate_viewports()
  state['frames']+=1
  for index,(name,deadline) in enumerate(images):
   if elapsed>=deadline and name not in state['requested']:
    p=capture/name
    if p.exists():
     raise RuntimeError('Native original PNG would be overwritten: '+name)
    # Unreal native high-res capture requests actual Editor viewport/camera
    # pixels. Its output is independently verified by the WinPS collector.
    unreal.AutomationLibrary.take_high_res_screenshot(1600,900,str(p),camera)
    state['requested'].add(name)
  if elapsed>=50.0:
   if len(state['requested'])!=3:
    raise RuntimeError('Native camera missed one or more automated capture requests')
   write_and_quit()
 except Exception as exc:
  state['error']=str(exc)+'\n'+traceback.format_exc()
  unreal.log_error('SR1J native private desktop render callback blocked: '+str(exc))
  write_and_quit()

if not state['done']:
 callback=unreal.register_slate_post_tick_callback(callback)
 unreal.log('SR1J private native Unreal Editor D3D12 orbit registered: '+str(capture))
