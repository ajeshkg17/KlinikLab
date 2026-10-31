import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const capture=read('../visual-qa/sr1c-godot-background-capture.gd');
const pc=read('../visual-qa/sr1c-capture-godot-background-pc.ps1');
const pdhFilter=read('../visual-qa/sr1c-pdh-filter.ps1');
const dxgi=read('../visual-qa/sr1c-dxgi-luid.cs');
const worker=read('../visual-qa/godot-worker.mjs');
const desktop=read('../visual-qa/sr1c-private-desktop.ps1');

test('Godot native scene performs 42-second active camera orbit and ORIGINAL independent frontal/occlusal GPU readbacks',()=>{
 for(const marker of [
  'while Time.get_ticks_msec() - start_msec < 42000',
  'camera.global_position = midpoint + Vector3',
  'camera.look_at(midpoint, Vector3.UP)',
  'elapsed >= 3.0','elapsed >= 32.0',
  '_write_gpu_frame("frontal")','_write_gpu_frame("occlusal")',
  '"godot-native-fdi16-" + label + "-"',
  'get_texture().get_image()','image.save_png(output)',
  'orbitDurationSeconds','orbitSubmittedFrames',
  'duration_sec < 40.0 or duration_sec > 45.0',
  '"tissueSurfacesPerTooth":5',
  '"sourceTrianglesBefore":14856','"sourceTrianglesAfter":14936',
  '"gpuProcessVerified":false','"pixelReviewed":false'
 ])assert(capture.includes(marker),marker);
 assert(!capture.includes('create_timer(16.0)'));
 assert(!capture.includes('DisplayServer.set_window_foreground'));
 assert(!capture.includes('--headless'));
});

test('ONE persistent Windows PDH query at one-second intervals counts distinct sample periods and not raw engine rows',()=>{
 assert.equal((pc.match(/Get-Counter -Counter/g)||[]).length,1);
 assert(pc.includes("-SampleInterval 1 -MaxSamples 34"));
 assert(pdhFilter.includes("collectionIndex=$index"));
 assert(pdhFilter.includes(".ToUniversalTime().ToString('o')"));
 assert(pc.includes("Select-Object -ExpandProperty utc -Unique"));
 assert(pc.includes('process3DPositiveDistinctPeriods'));
 assert(pc.includes('-ErrorAction Continue -ErrorVariable +pdhPowerShellErrors'));
 assert(pc.includes('ConvertTo-KLGodotGpu3DRows'));
 assert(pc.includes('godot-gpu-pdh-diagnostics.json'));
 assert(pc.includes('process3DPositiveRtx5060DistinctPeriods'));
 assert(pc.includes("if($report.process3DPositiveDistinctPeriods -lt 3)"));
 assert(pc.includes('getGpu')===false);
 assert(pc.includes("EVIDENCE_INCOMPLETE"));
 assert(pc.includes('nativePixelReviewAccepted=$false'));
});

test('RTX5060 identity requires matching normalized GPU Engine LUID to independently enumerated DXGI GetDesc1 LUID',()=>{
 for(const marker of [
  'INativeDxgiFactory1','INativeDxgiAdapter1','CreateDXGIFactory1',
  'void GetDesc1(out NativeAdapterDesc1 desc)',
  'Normalized','DxgiEvidence',
  'AdapterLuid', 'vendorId=desc.VendorId',
  'Marshal.ReleaseComObject'
 ]) {
  if(marker==='Normalized')continue;
  assert(dxgi.includes(marker),marker);
 }
 assert(pc.includes("[KlinikLab.DxgiEvidence]::Enumerate()"));
 assert(pc.includes("[KlinikLab.DxgiEvidence]::FromGpuEnginePath"));
 assert(pc.includes("$_.vendorId -eq 4318"));
 assert(pc.includes("$_.engineLuid -eq $report.rtx5060DxgiLuid"));
 assert(pc.includes('$report.gpuAdapterLuidMatchedToNvidia'));
 assert(pc.includes('$report.process3DPositiveRtx5060DistinctPeriods -ge 3'));
 assert(pc.includes('DXGI GetDesc1 LUID map failed'));
 assert(!pc.includes('gpuAdapterLuidMatchedToNvidia=$true'));
});

test('Both frontal and angled original SHA-confirmed PNGs must publish; no old job rerun or foreground',()=>{
 assert(worker.includes("'godot-native-fdi16-occlusal.png'"));
 assert(worker.includes("'godot-native-fdi16.png'"));
 assert(worker.includes('native.nativeAngledImagePresent'));
 assert(worker.includes("!native?.nativeAngledImagePresent"));
 assert(pc.includes('nativeAngledImagePresent=$false'));
 assert(pc.includes('if(-not $report.nativeAngledImagePresent)'));
 assert(pc.includes('if($report.orbitDurationSeconds -lt 40 -or $report.orbitDurationSeconds -gt 45)'));
 assert(pc.includes('$report.nativeAngledImagePresent -and'));
 assert(worker.includes("'pc-godot-fdi16-20261031-job02'"));
 assert(worker.includes("'pc-godot-fdi16-20261031-job03'"));
 for(const disallowed of ['SwitchDesktop(','SetForegroundWindow(','SendKeys','--headless'])
  assert(!desktop.includes(disallowed)||desktop.split('\n').some(x=>x.trimStart().startsWith('#')&&x.includes(disallowed)));
});
