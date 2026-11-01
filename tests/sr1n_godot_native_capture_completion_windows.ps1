# Real Windows PowerShell 5.1 and PowerShell 7 delayed-producer regression.
# Uses a harmless child Node process, never Godot or a real job.
$ErrorActionPreference='Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'visual-qa\sr1n-godot-capture-completion.ps1')
$node=(Get-Command node.exe -ErrorAction Stop).Source
$tmp=Join-Path $env:TEMP ('kl-godot-completion-'+[guid]::NewGuid().ToString('n'))
[IO.Directory]::CreateDirectory($tmp)|Out-Null
$program=Join-Path $tmp 'delayed-producer.cjs'
$script=@'
const fs=require('node:fs');
const [where,mode]=process.argv.slice(2);
setTimeout(()=>{
 if(mode==='missing')process.exit(0);
 if(mode==='exit-bad')process.exit(7);
 if(mode==='malformed')fs.writeFileSync(where,'{bad json');
 else {
 const dir=require('node:path').dirname(where);
 fs.writeFileSync(require('node:path').join(dir,'godot-native-fdi16-frontal-12345.png'),'not a real screenshot');
 fs.writeFileSync(require('node:path').join(dir,'godot-native-fdi16-occlusal-12345.png'),'not a real screenshot');
 fs.writeFileSync(where,JSON.stringify({
 status:'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW',
 imageFile:'godot-native-fdi16-frontal-12345.png',
 angledImageFile:'godot-native-fdi16-occlusal-12345.png'}));
 }
},1200);
'@
[IO.File]::WriteAllText($program,$script,[Text.UTF8Encoding]::new($false))
try{
 foreach($mode in @('good','missing','exit-bad','malformed')){
  $dir=Join-Path $tmp $mode
  [IO.Directory]::CreateDirectory($dir)|Out-Null
  $target=Join-Path $dir 'godot-background-capture.json'
  $argsText='"{0}" "{1}" "{2}"' -f $program,$target,$mode
  $proc=Start-Process -FilePath $node -ArgumentList $argsText -PassThru -WindowStyle Hidden
  try{
   $clock=[Diagnostics.Stopwatch]::StartNew()
   if($mode -eq 'good'){
    if(Test-Path $target){throw 'Producer report existed before PID launched'}
    $result=Wait-KLNativeGodotCaptureCompletion -Process $proc -ReportPath $target -MaxWaitMilliseconds 10000
    $clock.Stop()
    if($clock.ElapsedMilliseconds -lt 800){throw 'Collector returned before producer completed'}
    if($result.status -cne 'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW'){
     throw 'Valid delayed native result was rejected'}
   }else{
    $failed=$false
    try{$null=Wait-KLNativeGodotCaptureCompletion -Process $proc -ReportPath $target -MaxWaitMilliseconds 10000}catch{$failed=$true}
    if(-not $failed){throw ('Fail-closed async case succeeded: '+$mode)}
   }
  }finally{if(-not $proc.HasExited){$proc.Kill()};$proc.Dispose()}
 }
 Write-Host ("PASS "+$PSVersionTable.PSVersion.ToString()+": bounded capture completion avoids false negative on late 42s report and fails closed on missing/invalid/exit-bad")
}finally{Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue}
