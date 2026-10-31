# Real Windows Win32 private desktop creation smoke; NO window activation,
# no Godot, no switch, no input, no GPU claims.
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '..\visual-qa\sr1c-private-desktop.ps1')
$station=[KlinikLab.PrivateDesktop]::GetProcessWindowStation()
if($station -eq [IntPtr]::Zero){throw 'GetProcessWindowStation returned zero'}
$buffer=New-Object System.Text.StringBuilder 256
$required=0
$ok=[KlinikLab.PrivateDesktop]::GetUserObjectInformation($station,2,$buffer,512,[ref]$required)
if(-not $ok){throw ('Station name read failed: '+[Runtime.InteropServices.Marshal]::GetLastWin32Error())}
Write-Host "Current window station: $($buffer.ToString())"
if($buffer.ToString() -ne 'WinSta0'){
 Write-Host "SKIP: hosted runner window station is not WinSta0; cannot verify private interactive desktop"
 exit 0
}
$name='KL_SR1C_CONTRACT_'+[Guid]::NewGuid().ToString('N')
$mask=[uint32]0xC3
$desktop=[KlinikLab.PrivateDesktop]::CreateDesktop($name,$null,[IntPtr]::Zero,[uint32]0,$mask,[IntPtr]::Zero)
if($desktop -eq [IntPtr]::Zero){
 $last=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
 throw "Private WinSta0 CreateDesktopW failed Win32=$last minimalMask=0xC3; no foreground fallback"
}
try{
 Write-Host "PASS: actual CreateDesktopW minimal rights mask without switching/foreground"
}finally{
 if(-not [KlinikLab.PrivateDesktop]::CloseDesktop($desktop)){throw 'CloseDesktop failed'}
}
