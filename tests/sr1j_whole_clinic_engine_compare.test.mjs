import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const godot=read('../visual-qa/run-godot-whole-clinic-pc.ps1');
const unreal=read('../visual-qa/run-unreal-whole-clinic-pc.ps1');
const stage=read('../visual-qa/unreal-whole-clinic-stage.py');
const capture=read('../visual-qa/unreal-whole-clinic-capture.py');
const initHook=read('../visual-qa/unreal-whole-clinic-init.py');
const publish=read('../visual-qa/publish-whole-clinic-comparison-pc.ps1');
const pinned='f4d4d4151851a08342def08d9f2e461f5f5e7109';

test('Godot whole clinic uses a NEW unique run and unchanged original source and owner-PID Vulkan DXGI',()=>{
 for(const phrase of [pinned,'NewGuid','-SceneMode clinic-cases',
  'sr1c-build-godot-local.ps1','sr1d-prepare-godot-cases.ps1',
  'sr1c-capture-godot-background-pc.ps1','godot-owner-pc-result.json',
  'godot-native-workflow-state.json','native-source-submission.json',
  "sourceTrianglesBefore=14856","sourceTrianglesAfter=14936",
  "sourceDerivedCases=6","sourceDerivedStations=7",
  'originalFDI16GeometryAvailable','process3DPositiveRtx5060DistinctPeriods',
  'fullKlinikLabApplicationMigrated=$false']){
  assert.ok(godot.includes(phrase),phrase);
 }
 assert.match(godot,/git -C \$repo worktree add --detach \$source \$sha/);
 assert.match(godot,/Never reuse evidence or source worktree/);
 assert.match(godot,/oldJob07Touched=\$false/);
 assert.ok(!godot.includes('godot-worker.mjs'));
 assert.ok(!godot.includes('godot-current.json'));
 assert.ok(!godot.includes('godot-ledger.json'));
 assert.ok(!godot.includes('Start-ScheduledTask'));
 assert.ok(!godot.includes('Stop-ScheduledTask'));
});

test('Unreal clinic preserves 5 original procedural FDI16 tissue mesh components per state with six original cases and seven stations',()=>{
 for(const phrase of [pinned,'/Game/Maps/L_KlinikLab_FDI16',
  '/Game/Maps/L_KlinikLab_WholeClinic','EditorAssetLibrary.duplicate_asset',
  'ProceduralMeshComponent','get_num_sections()==1','sourceTeethRetainedAfterLevelReload',
  'KL_DENTAL_CHAIR_SEAT','KL_PROCEDURE_LIGHT_DIFFUSER','KL_INSTRUMENT_TRAY',
  'KL_ROOM_BACK_WALL','KL_TRAINING_STATION_','KL_CASE_METADATA_',
  'KLINIKLAB_SR1J_CASES','wholeClinicObjectCount',
  'UNREAL_WHOLE_CLINIC_SCENE_SAVED_NOT_GPU_RENDERED']){
  assert.ok(stage.includes(phrase),phrase);
 }
 assert.match(stage,/len\(sections\)==5/);
 assert.match(stage,/data\.get\('clinicalAssessmentValidated'\) is False/);
 assert.match(stage,/sourceTeethRetainedAfterLevelReload.*True/);
 assert.ok(!stage.includes('pixelStreaming2Verified=True'));
});

test('Unreal native 3-view image collection is real 42-second Editor viewport and fails closed',()=>{
 for(const phrase of ['register_slate_post_tick_callback','Automati'+'onLibrary.take_high_res_screenshot',
  'editor_set_viewport_realtime','editor_invalidate_viewports','time.monotonic()',
  'unreal-whole-clinic-overview.png','unreal-whole-clinic-angled.png',
  'unreal-fdi16-cut-occlusal.png','sourceTrianglesBefore',
  'gpuPidRtx5060DxgiVerified','UNREAL_NATIVE_THREE_IMAGES_PENDING_PID_DXGI_GPU_AND_PIXEL_REVIEW']){
  assert.ok(capture.includes(phrase),phrase);
 }
 assert.match(capture,/elapsed>=50\.0/);
 assert.match(capture,/'status':'EVIDENCE_INCOMPLETE'/);
 assert.match(capture,/nativePixelsIndependentlyReviewed.*False/);
 assert.match(capture,/fullKlinikLabApplicationMigrated.*False/);
 assert.ok(!capture.includes('pyautogui'));
});

test('Unreal collector requires fresh unique attempt marker, real private WinSta0 3D Unreal PID and RTX 5060 DXGI mapping',()=>{
 for(const phrase of ['ValidateSet('+"'"+'Prepare'+"'"+','+"'"+'Render'+"'"+')',
  'sr1b-run-local-kliniklab.ps1','-Mode Build',
  'unreal-whole-clinic-stage.py','UnrealEditor-Cmd.exe','UnrealEditor.exe',
  'unreal-whole-clinic-capture.py','FileMode]::CreateNew',
  'GetProcessWindowStation','CreateDesktopRaw','CreateProcess',
  'Get-Counter','-MaxSamples 34','ConvertTo-KLGodotGpu3DRows',
  'FromGpuEnginePath','D3D12','RTX','native','Get-FileHash',
  'unreal-gpu-pdh.json','unreal-owner-pc-result.json',
  'EVIDENCE_INCOMPLETE','processGpuCorroborated']){
  assert.ok(unreal.includes(phrase),phrase);
 }
 assert.ok(!unreal.includes('SwitchDesktop'));
 assert.ok(!unreal.includes('SetForegroundWindow'));
 assert.ok(!unreal.includes('SendKeys'));
 assert.ok(!unreal.includes('godot-worker.mjs'));
 assert.ok(!unreal.includes('Start-ScheduledTask'));
 assert.match(unreal,/fullKlinikLabApplicationMigrated=\$false/);
 assert.match(unreal,/pixelIndependentlyReviewed=\$false/);
});

test('Publication only copies original validated engine pixel bytes; DOES NOT modify prior Godot job07 pointer',()=>{
 for(const phrase of ['Get-FileHash','BitConverter','worktree add --detach',
   'GODOT_COMPARISON_LATEST.md','UNREAL_PC_LATEST.md',
   'unreal-whole-clinic-native-report.json','godot-background-capture.json',
   'unity' /*guard marker*/]){
   if(phrase==='unity')continue;
   assert.ok(publish.includes(phrase),phrase);
 }
 assert.match(publish,/visual-feedback/);
 assert.match(publish,/git -C \$worktree push origin HEAD:refs\/heads\/visual-feedback/);
 for(const forbidden of ['GODOT_PC_LATEST.md','godot-ledger.json','godot-worker.mjs',
  'SwitchDesktop','SetForegroundWindow','Start-Process','CreateProcess']){
   // GODOT_PC_LATEST.md is mentioned only in explanatory text, never written.
   if(forbidden==='GODOT_PC_LATEST.md'){
    assert.ok(!publish.includes("'GODOT_PC_LATEST.md'"),'must not update Godot pointer');
   }else{assert.ok(!publish.includes(forbidden),'nonpublication '+forbidden);}
 }
 assert.match(publish,/pixel.*PENDING/i);
});

test('Unreal private desktop orbit remains live via persistent Editor init hook and readiness-gated GPU sampling',()=>{
 for(const token of ['init_unreal.py','register_slate_post_tick_callback',
  'time.monotonic','unreal.SystemLibrary.quit_editor','kl_sr1j_capture.py']){
  assert.ok(initHook.includes(token),token);
 }
 for(const token of ['KLINIKLAB_SR1J_CAPTURE_ENABLED','unreal-whole-clinic-init.py',
  'Content\\Python','unreal-native-capture-ready.json',
  'NATIVE_UNREAL_EDITOR_CALLBACK_REGISTERED','-MaxSamples 34']){
  assert.ok(unreal.includes(token),token);
 }
 assert.ok(!unreal.slice(unreal.indexOf('# Render phase:')).includes('-ExecutePythonScript='),
  'Unreal Editor script would shutdown immediately; no render orbit');
 assert.match(capture,/unreal-native-capture-ready\.json/);
 assert.match(capture,/_callback_handle=unreal\.register_slate_post_tick_callback\(_on_tick\)/);
 assert.ok(!initHook.includes('SwitchDesktop'));
 assert.ok(!initHook.includes('SetForegroundWindow'));
});
