import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const ps=read('../visual-qa/run-unity-clinic-render-pc.ps1');
const cs=read('../visual-qa/unity-probe/KlinikLabUnityClinicRender.cs');

test('whole native clinic prototype draws all seven environment/station subsystems',()=>{
 for(const marker of ['CreateRoom','CreateChair','CreateInstruments','CreateSpecimens',
   'CreateCaseStations','FDI16_BEFORE','FDI16_AFTER_SIMULATED_CUT',
   'KL_DENTAL_CHAIR','KL_NATIVE_PROCEDURE_LAMP','KL_INSTRUMENT_TRAY',
   'KL_ROOM_BACK_WALL','KL_TRAINING_STATION_','KL_CASE_METADATA_',
   'KL_CLINIC_SCREEN_PANEL','KL_SPECIMEN_PODIUM_']){
   assert.ok(cs.includes(marker),marker);
 }
 assert.match(cs,/caseCount==6 && data\.stationCount==7/);
 assert.match(cs,/Triangles\(originalBefore\),after=Triangles\(originalAfter\)/);
 assert.match(cs,/before==14856 && after==14936/);
 assert.match(cs,/caseSpecificNonFDI16MeshesPorted|fullKlinikLabApplicationMigrated=false/);
});
test('Unity GPU workload is real Camera.Render, native ReadPixels and three immutable captures',()=>{
 for(const marker of ['RenderTexture','cam.Render()','ReadPixels',
  'EncodeToPNG','FileMode.CreateNew','orbitRenderFrames++',
  'Thread.Sleep(1000)','ORBIT_SECONDS=40',
  'unity-whole-clinic-overview.png','unity-whole-clinic-angled.png',
  'unity-fdi16-cut-occlusal.png']){
  assert.ok(cs.includes(marker),marker);
 }
 assert.match(cs,/graphicsDeviceType!=GraphicsDeviceType\.Null/);
 assert.match(cs,/privateDesktopConfirmedByLauncher=false/);
 assert.match(cs,/independentProcessGpuCorroborated=false/);
 assert.match(cs,/imageIndependentlyReviewed=false/);
 assert.match(cs,/fullKlinikLabApplicationMigrated=false/);
});
test('Windows owner runner creates unique separate evidence, private desktop, live PID and independent DXGI/PDH mapping',()=>{
 for(const marker of ['KlinikLabUnityClinic','NewGuid','CreateDesktopRaw',
  'GetProcessWindowStation','WinSta0','CreateProcess','-force-d3d11',
  'Get-Counter','-MaxSamples 34','ConvertTo-KLGodotGpu3DRows',
  'FromGpuEnginePath','DxgiEvidence','session.pid',
  'validPeriods.Count -ge 5','unity-gpu-pdh.json','unity-owner-pc-result.json']){
  assert.ok(ps.includes(marker),marker);
 }
 assert.match(ps,/originalNativePngs=\$pngs/);
 assert.match(ps,/imageIndependentPixelReviewAccepted=\$false/);
 assert.match(ps,/fullKlinikLabApplicationMigrated=\$false/);
 for(const forbidden of ['SwitchDesktop','SetForegroundWindow','SendKeys',
  'Start-ScheduledTask','Stop-ScheduledTask','godot-job-result.json',
  'godot-ledger.json','godot-current.json','--headless',
  " -nographics -executeMethod KlinikLabUnityClinicRender.Run"]){
  assert.ok(!ps.includes(forbidden),'forbidden '+forbidden);
 }
});
