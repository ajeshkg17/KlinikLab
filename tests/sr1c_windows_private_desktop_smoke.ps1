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
$mask=[uint32]0xC3
$errors=@()
$desktop=[IntPtr]::Zero
$method=''
$types=@('marshaled','raw','exraw')
foreach($variant in $types){
 $name='KLX_'+[Guid]::NewGuid().ToString('N').Substring(0,12)
 $ptr=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($name)
 try{
  if($variant -eq 'marshaled'){
   $desktop=[KlinikLab.PrivateDesktop]::CreateDesktop($name,$null,[IntPtr]::Zero,[uint32]0,$mask,[IntPtr]::Zero)
  }elseif($variant -eq 'raw'){
   $desktop=[KlinikLab.PrivateDesktop]::CreateDesktopRaw($ptr,[IntPtr]::Zero,[IntPtr]::Zero,[uint32]0,$mask,[IntPtr]::Zero)
  }else{
   $desktop=[KlinikLab.PrivateDesktop]::CreateDesktopExRaw($ptr,[IntPtr]::Zero,[IntPtr]::Zero,[uint32]0,$mask,[IntPtr]::Zero,[uint32]512,[IntPtr]::Zero)
  }
  if($desktop -ne [IntPtr]::Zero){$method=$variant;break}
  $win32=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  $errors+=("$variant : Win32=$win32")
 }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)}
}
if($desktop -eq [IntPtr]::Zero){
 throw ("No WinSta0 private-desktop variant succeeded, "+($errors -join '; '))
}
try{Write-Host "PASS: CreateDesktopW/$method on private WinSta0 without switching, prior errors: $($errors -join '; ')"}finally{
 if(-not [KlinikLab.PrivateDesktop]::CloseDesktop($desktop)){throw 'CloseDesktop failed'}
}
