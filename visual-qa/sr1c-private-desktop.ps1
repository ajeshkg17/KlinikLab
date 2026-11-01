# Real Windows desktop isolation for GPU-rendering Godot 4.7.
# Creates a NEW private WinSta0 desktop in the owner's interactive session.
# NEVER calls SwitchDesktop, SetForegroundWindow, SendKeys, or changes user desktop.
# Not Godot --headless (that would force dummy/no GPU rendering).
$ErrorActionPreference='Stop'
if(-not ('KlinikLab.PrivateDesktop' -as [type])){
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
namespace KlinikLab {
 public static class PrivateDesktop {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct STARTUPINFO {
   public int cb;
   [MarshalAs(UnmanagedType.LPWStr)] public string lpReserved;
   [MarshalAs(UnmanagedType.LPWStr)] public string lpDesktop;
   [MarshalAs(UnmanagedType.LPWStr)] public string lpTitle;
   public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars;
   public int dwFillAttribute, dwFlags;
   public short wShowWindow, cbReserved2;
   public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_INFORMATION {
   public IntPtr hProcess, hThread;
   public uint dwProcessId, dwThreadId;
  }
  [DllImport("user32.dll", EntryPoint="GetProcessWindowStation", SetLastError=true)]
  public static extern IntPtr GetProcessWindowStation();
  [DllImport("user32.dll", EntryPoint="GetUserObjectInformationW", CharSet=CharSet.Unicode, SetLastError=true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool GetUserObjectInformation(IntPtr handle, int index, StringBuilder info,
    int length, out int needed);
  [DllImport("user32.dll", EntryPoint="CreateDesktopW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern IntPtr CreateDesktop(string name, string device, IntPtr devmode,
    uint flags, uint desiredAccess, IntPtr securityAttributes);
  [DllImport("user32.dll", EntryPoint="CreateDesktopW", ExactSpelling=true, SetLastError=true)]
  public static extern IntPtr CreateDesktopRaw(IntPtr name, IntPtr device, IntPtr devmode,
    uint flags, uint desiredAccess, IntPtr securityAttributes);
  [DllImport("user32.dll", EntryPoint="CreateDesktopExW", ExactSpelling=true, SetLastError=true)]
  public static extern IntPtr CreateDesktopExRaw(IntPtr name, IntPtr device, IntPtr devmode,
    uint flags, uint desiredAccess, IntPtr securityAttributes, uint heapSizeKB, IntPtr reserved);
  [DllImport("user32.dll", SetLastError=true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool CloseDesktop(IntPtr desktop);
  [DllImport("kernel32.dll", EntryPoint="CreateProcessW", CharSet=CharSet.Unicode, SetLastError=true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool CreateProcess(string app, StringBuilder cmd, IntPtr processAttributes,
   IntPtr threadAttributes, bool inheritHandles, uint creationFlags, IntPtr environment,
   string currentDirectory, ref STARTUPINFO startup, out PROCESS_INFORMATION process);
  [DllImport("kernel32.dll", SetLastError=true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError=true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool TerminateProcess(IntPtr process, uint exitCode);
 }
}
'@ -ErrorAction Stop
}
function Start-KLPrivateDesktopGodot {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$GodotExecutable,
       [Parameter(Mandatory=$true)][string]$ProjectDir,
       [Parameter(Mandatory=$true)][string]$LogPath)
 if(-not(Test-Path -LiteralPath $GodotExecutable -PathType Leaf)){throw 'Godot executable missing'}
 if(-not(Test-Path -LiteralPath (Join-Path $ProjectDir 'project.godot'))){throw 'Godot project missing'}
 if(-not(Test-Path -LiteralPath (Join-Path $ProjectDir 'sr1c-godot-background-capture.gd'))){
  throw 'Fixed background capture runner missing from native Godot project'
 }
 if($GodotExecutable.Contains('"') -or $ProjectDir.Contains('"') -or $LogPath.Contains('"')){
  throw 'Unsupported Windows path contains quote'
 }
 $desktopName='KL_SR1C_'+[Guid]::NewGuid().ToString('N').Substring(0,12)
 # Diagnose the assigned process window station. Do NOT change it or switch desktops.
 $station=[KlinikLab.PrivateDesktop]::GetProcessWindowStation()
 if($station -eq [IntPtr]::Zero){
  $last=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "GetProcessWindowStation failed Win32=$last; cannot guarantee private WinSta0 capture"
 }
 $stationName=New-Object System.Text.StringBuilder 256
 $needed=0
 $stationOk=[KlinikLab.PrivateDesktop]::GetUserObjectInformation($station,2,
  $stationName,$stationName.Capacity*2,[ref]$needed) # UOI_NAME=2
 if(-not $stationOk){
  $last=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "GetUserObjectInformationW(UOI_NAME) failed Win32=$last"
 }
 if($stationName.ToString() -ne 'WinSta0'){
  throw "Current process window station is '$($stationName.ToString())', not WinSta0; no foreground fallback"
 }
 # Windows CI reproduced Win32 87 with the original string-marshaled
 # CreateDesktopW P/Invoke, but SUCCESS with the raw UTF-16 LPCWSTR pointer.
 # Explicit native marshaling is the evidenced fix, not silently relaxing the gate.
 # DESKTOP_CREATEWINDOW | READOBJECTS | WRITEOBJECTS | ENUMERATE = 0xC3.
 $desktopAccess=[uint32]0x000000C3
 $desktopNamePointer=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($desktopName)
 try{
  $desktop=[KlinikLab.PrivateDesktop]::CreateDesktopRaw($desktopNamePointer,
   [IntPtr]::Zero,[IntPtr]::Zero,[uint32]0,$desktopAccess,[IntPtr]::Zero)
  if($desktop -eq [IntPtr]::Zero){
   $last=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
   throw "CreateDesktopW raw UTF16 failed Win32=$last; station=$($stationName.ToString()); mask=0x$($desktopAccess.ToString('X8')); desktop=$desktopName; no foreground fallback"
  }
 }finally{
  [Runtime.InteropServices.Marshal]::FreeHGlobal($desktopNamePointer)
 }
 $start=New-Object KlinikLab.PrivateDesktop+STARTUPINFO
 $start.cb=[Runtime.InteropServices.Marshal]::SizeOf([type][KlinikLab.PrivateDesktop+STARTUPINFO])
 $start.lpDesktop='WinSta0\'+$desktopName
 # SW_SHOWNOACTIVATE=4 is additional protection; the private desktop is never switched in.
 $start.dwFlags=0x00000001
 $start.wShowWindow=4
 $pinfo=New-Object KlinikLab.PrivateDesktop+PROCESS_INFORMATION
 $cmd='"'+$GodotExecutable+'" --path "'+$ProjectDir+'" --windowed --resolution 1600x900'+
  ' --rendering-method forward_plus --rendering-driver vulkan --audio-driver Dummy'+
  ' --script res://sr1c-godot-background-capture.gd --verbose --log-file "'+$LogPath+'"'
 $command=New-Object System.Text.StringBuilder($cmd)
 $created=[KlinikLab.PrivateDesktop]::CreateProcess($GodotExecutable,$command,
  [IntPtr]::Zero,[IntPtr]::Zero,$false,[uint32]0,[IntPtr]::Zero,
  $ProjectDir,[ref]$start,[ref]$pinfo)
 if(-not $created){
  $code=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  [void][KlinikLab.PrivateDesktop]::CloseDesktop($desktop)
  throw "CreateProcess on PRIVATE WinSta0 desktop failed: $code"
 }
 if($pinfo.hThread -ne [IntPtr]::Zero){[void][KlinikLab.PrivateDesktop]::CloseHandle($pinfo.hThread)}
 return [PSCustomObject]@{
  Pid=[int]$pinfo.dwProcessId
  ProcessHandle=$pinfo.hProcess
  DesktopHandle=$desktop
  DesktopName=$desktopName
  WindowActivationRequested=$false
  HeadlessRequested=$false
  VulkanRequested=$true
  NativeCommandLine=$cmd
 }
}
function Stop-KLPrivateDesktopGodot {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)]$Session)
 if($Session.ProcessHandle -and $Session.ProcessHandle -ne [IntPtr]::Zero){
  $live=Get-Process -Id $Session.Pid -ErrorAction SilentlyContinue
  if($live -and -not $live.HasExited){
   [void][KlinikLab.PrivateDesktop]::TerminateProcess($Session.ProcessHandle,[uint32]1)
   try { Wait-Process -Id $Session.Pid -Timeout 8 -ErrorAction SilentlyContinue }catch{}
  }
  [void][KlinikLab.PrivateDesktop]::CloseHandle($Session.ProcessHandle)
 }
 if($Session.DesktopHandle -and $Session.DesktopHandle -ne [IntPtr]::Zero){
  [void][KlinikLab.PrivateDesktop]::CloseDesktop($Session.DesktopHandle)
 }
}

# SR14 exported Windows .exe launcher: original GPU/private-desktop WinSta0
# security properties, but NO --path to a source Godot project.
function Start-KLPrivateDesktopExportedApp {
 [CmdletBinding()]
 param([Parameter(Mandatory=$true)][string]$Executable,
       [Parameter(Mandatory=$true)][string]$WorkingDir,
       [Parameter(Mandatory=$true)][string]$LogPath,
       [Parameter(Mandatory=$true)][string]$CaptureId)
 if($CaptureId -notmatch '^pc-kliniklab-native-cc0-[a-z0-9-]{10,}
 if(-not(Test-Path -LiteralPath (Join-Path $WorkingDir 'native-build-manifest.json'))){
  throw 'Native release does not contain pinned native build manifest'
 }
 foreach($p in @($Executable,$WorkingDir,$LogPath)){
  if($p.Contains('"')){throw 'Unsupported quoted native export path'}
 }
 $station=[KlinikLab.PrivateDesktop]::GetProcessWindowStation()
 if($station -eq [IntPtr]::Zero){throw 'No WinSta0 process window station'}
 $name=New-Object System.Text.StringBuilder 256
 $needed=0
 if(-not [KlinikLab.PrivateDesktop]::GetUserObjectInformation($station,2,
  $name,$name.Capacity*2,[ref]$needed)){
  throw 'WinSta0 window station name could not be determined'
 }
 if($name.ToString() -ne 'WinSta0'){throw 'Refusing exported capture outside WinSta0'}
 $desktopName='KL_EXP_'+[Guid]::NewGuid().ToString('N').Substring(0,12)
 $ptr=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($desktopName)
 try{
  $desktop=[KlinikLab.PrivateDesktop]::CreateDesktopRaw($ptr,
   [IntPtr]::Zero,[IntPtr]::Zero,[uint32]0,[uint32]0x000000C3,[IntPtr]::Zero)
 }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)}
 if($desktop -eq [IntPtr]::Zero){throw ('CreateDesktop raw Win32='+[Runtime.InteropServices.Marshal]::GetLastWin32Error())}
 $start=New-Object KlinikLab.PrivateDesktop+STARTUPINFO
 $start.cb=[Runtime.InteropServices.Marshal]::SizeOf([type][KlinikLab.PrivateDesktop+STARTUPINFO])
 $start.lpDesktop='WinSta0\'+$desktopName
 $start.dwFlags=0x1;$start.wShowWindow=4
 $pi=New-Object KlinikLab.PrivateDesktop+PROCESS_INFORMATION
 # No source project override: exported executable must load embedded PCK.
 # Fixed capture GDScript is inside SHA-pinned compiled application.
 $cmd='"'+$Executable+'" --windowed --resolution 1600x900'+
   ' --rendering-method forward_plus --rendering-driver vulkan --audio-driver Dummy'+
   ' --verbose --log-file "'+$LogPath+'"'+
   ' -- --kliniklab-native-pc-capture='+$CaptureId
 $buffer=New-Object System.Text.StringBuilder($cmd)
 $ok=[KlinikLab.PrivateDesktop]::CreateProcess($Executable,$buffer,
  [IntPtr]::Zero,[IntPtr]::Zero,$false,[uint32]0,[IntPtr]::Zero,
  $WorkingDir,[ref]$start,[ref]$pi)
 if(-not $ok){
  $err=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  [void][KlinikLab.PrivateDesktop]::CloseDesktop($desktop)
  throw "Unable to launch EXPORTED standalone executable on private WinSta0: Win32=$err"
 }
 if($pi.hThread -ne [IntPtr]::Zero){[void][KlinikLab.PrivateDesktop]::CloseHandle($pi.hThread)}
 return [PSCustomObject]@{
  Pid=[int]$pi.dwProcessId;ProcessHandle=$pi.hProcess;DesktopHandle=$desktop;
  DesktopName=$desktopName;WindowActivationRequested=$false;HeadlessRequested=$false;
  VulkanRequested=$true;NativeCommandLine=$cmd;PackagedExecutable=$true
 }
}
){throw 'Invalid exact unique native capture ID'}
 if(-not(Test-Path -LiteralPath $Executable -PathType Leaf)){throw 'Native exported executable absent'}
 if(-not(Test-Path -LiteralPath (Join-Path $WorkingDir 'native-build-manifest.json'))){
  throw 'Native release does not contain pinned native build manifest'
 }
 foreach($p in @($Executable,$WorkingDir,$LogPath)){
  if($p.Contains('"')){throw 'Unsupported quoted native export path'}
 }
 $station=[KlinikLab.PrivateDesktop]::GetProcessWindowStation()
 if($station -eq [IntPtr]::Zero){throw 'No WinSta0 process window station'}
 $name=New-Object System.Text.StringBuilder 256
 $needed=0
 if(-not [KlinikLab.PrivateDesktop]::GetUserObjectInformation($station,2,
  $name,$name.Capacity*2,[ref]$needed)){
  throw 'WinSta0 window station name could not be determined'
 }
 if($name.ToString() -ne 'WinSta0'){throw 'Refusing exported capture outside WinSta0'}
 $desktopName='KL_EXP_'+[Guid]::NewGuid().ToString('N').Substring(0,12)
 $ptr=[Runtime.InteropServices.Marshal]::StringToHGlobalUni($desktopName)
 try{
  $desktop=[KlinikLab.PrivateDesktop]::CreateDesktopRaw($ptr,
   [IntPtr]::Zero,[IntPtr]::Zero,[uint32]0,[uint32]0x000000C3,[IntPtr]::Zero)
 }finally{[Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)}
 if($desktop -eq [IntPtr]::Zero){throw ('CreateDesktop raw Win32='+[Runtime.InteropServices.Marshal]::GetLastWin32Error())}
 $start=New-Object KlinikLab.PrivateDesktop+STARTUPINFO
 $start.cb=[Runtime.InteropServices.Marshal]::SizeOf([type][KlinikLab.PrivateDesktop+STARTUPINFO])
 $start.lpDesktop='WinSta0\'+$desktopName
 $start.dwFlags=0x1;$start.wShowWindow=4
 $pi=New-Object KlinikLab.PrivateDesktop+PROCESS_INFORMATION
 # No source project override: exported executable must load embedded PCK.
 # Fixed capture GDScript is inside SHA-pinned compiled application.
 $cmd='"'+$Executable+'" --windowed --resolution 1600x900'+
   ' --rendering-method forward_plus --rendering-driver vulkan --audio-driver Dummy'+
   ' --script res://exported-app-capture.gd --verbose --log-file "'+$LogPath+'"'
 $buffer=New-Object System.Text.StringBuilder($cmd)
 $ok=[KlinikLab.PrivateDesktop]::CreateProcess($Executable,$buffer,
  [IntPtr]::Zero,[IntPtr]::Zero,$false,[uint32]0,[IntPtr]::Zero,
  $WorkingDir,[ref]$start,[ref]$pi)
 if(-not $ok){
  $err=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
  [void][KlinikLab.PrivateDesktop]::CloseDesktop($desktop)
  throw "Unable to launch EXPORTED standalone executable on private WinSta0: Win32=$err"
 }
 if($pi.hThread -ne [IntPtr]::Zero){[void][KlinikLab.PrivateDesktop]::CloseHandle($pi.hThread)}
 return [PSCustomObject]@{
  Pid=[int]$pi.dwProcessId;ProcessHandle=$pi.hProcess;DesktopHandle=$desktop;
  DesktopName=$desktopName;WindowActivationRequested=$false;HeadlessRequested=$false;
  VulkanRequested=$true;NativeCommandLine=$cmd;PackagedExecutable=$true
 }
}
