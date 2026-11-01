# Hosted Windows PowerShell 5.1 subprocess environment inheritance regression.
# No actual Godot, scheduled tasks, GitHub, or archived-job files.
$ErrorActionPreference='Stop'
$node=(Get-Command node.exe -ErrorAction Stop).Source
$tmp=Join-Path $env:TEMP ('kl-env-contract-'+[guid]::NewGuid().ToString('n'))
[void][IO.Directory]::CreateDirectory($tmp)
$old=$env:KLINIKLAB_GODOT_EXE
try{
 $fakeExe=Join-Path $tmp 'godot_v4.7.2-stable_win64.exe'
 [IO.File]::WriteAllBytes($fakeExe,[byte[]]@(77,90,0,0))
 $source=Join-Path $tmp 'env-check.cjs'
 $src='const fs=require("node:fs"); const x=process.env.KLINIKLAB_GODOT_EXE; if(!x || !fs.existsSync(x) || !x.endsWith("godot_v4.7.2-stable_win64.exe")){ console.error("INHERITED_GODOT_PATH_MISSING");process.exit(4); } console.log("GODOT_PATH_RECEIVED_IN_CHILD="+x);'
 [IO.File]::WriteAllText($source,$src)
 $env:KLINIKLAB_GODOT_EXE=$fakeExe
 $out=Join-Path $tmp 'stdout.log';$err=Join-Path $tmp 'stderr.log'
 $p=Start-Process -FilePath $node -ArgumentList @($source) -PassThru -Wait -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err
 if($p.ExitCode -ne 0){throw "Node child did NOT inherit parent Godot environment; exit=$($p.ExitCode): $(Get-Content -LiteralPath $err -Raw)"}
 $response=Get-Content -LiteralPath $out -Raw
 if(-not $response.Contains("GODOT_PATH_RECEIVED_IN_CHILD=$fakeExe")){throw 'Node child inherited wrong Godot path'}
 Write-Host 'PASS: WinPS 5.1 scheduled-launcher pattern passes KLINIKLAB_GODOT_EXE to child Node via Start-Process'
}finally{
 if($null -eq $old){Remove-Item Env:KLINIKLAB_GODOT_EXE -ErrorAction SilentlyContinue}
 else{$env:KLINIKLAB_GODOT_EXE=$old}
 Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
