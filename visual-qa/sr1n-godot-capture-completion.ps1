# Wait for the SAME native engine process to finish producing capture evidence.
# Never infer capture failure from a missing report while the 42s orbit is
# still running. Bounded; no process launch, focus change or rerender.
function Wait-KLNativeGodotCaptureCompletion {
 [CmdletBinding()]
 param(
  [Parameter(Mandatory=$true)][System.Diagnostics.Process]$Process,
  [Parameter(Mandatory=$true)][string]$ReportPath,
  [ValidateRange(1000,100000)][int]$MaxWaitMilliseconds=70000
 )
 $pidExpected=[int]$Process.Id
 if($pidExpected -le 0){throw 'Invalid native Godot process PID'}
 if(-not $Process.WaitForExit($MaxWaitMilliseconds)){
  throw "Original native Godot PID $pidExpected did not exit within $MaxWaitMilliseconds ms after PDH; preserve existing files, never rerun this ID"
 }
 $Process.Refresh()
 if(-not $Process.HasExited -or $Process.Id -ne $pidExpected){
  throw 'Native Godot process identity changed while waiting for capture completion'
 }
 if($Process.ExitCode -ne 0){
  throw "Original native Godot PID $pidExpected exited $($Process.ExitCode); preserve original partial capture, no rerun"
 }
 if(-not(Test-Path -LiteralPath $ReportPath -PathType Leaf)){
  throw "Original native Godot PID $pidExpected exited zero but did not write final capture report"
 }
 try{
  $data=Get-Content -LiteralPath $ReportPath -Raw -ErrorAction Stop|ConvertFrom-Json -ErrorAction Stop
 }catch{throw "Original Godot capture JSON malformed after PID $pidExpected exit: $($_.Exception.Message)"}
 if($data.status -cne 'BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW'){
  throw "Original Godot final capture report status not complete: $($data.status)"
 }
 foreach($name in @([string]$data.imageFile,[string]$data.angledImageFile)){
  if($name -notmatch '^godot-native-fdi16-(frontal|occlusal)-[0-9]+\.png$'){
   throw "Original Godot capture missing valid output PNG name: $name"
  }
  $imageFile=Join-Path (Split-Path -Parent $ReportPath) $name
  if(-not(Test-Path -LiteralPath $imageFile -PathType Leaf)){
   throw "Native Godot named PNG absent after original PID $pidExpected exit: $name"
  }
 }
 return $data
}
