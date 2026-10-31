# Windows-native proof that stderr can be archived without aborting a watcher.
# Does not run Godot, jobs, or modify a real Scheduled Task.
$ErrorActionPreference='Stop'
$node=(Get-Command node.exe -ErrorAction Stop).Source
$tmp=Join-Path $env:TEMP ('kl-godot-stderr-'+[guid]::NewGuid().ToString('n'))
[void][IO.Directory]::CreateDirectory($tmp)
try{
 $test=Join-Path $tmp 'counter-warning-probe.cjs'
 [IO.File]::WriteAllText($test,'process.stdout.write("SOURCE_PREPARED\\n");process.stderr.write("PDH_INVALID_DATA synthetic stderr\\n");process.stdout.write("CAPTURE_COMPLETE\\n")')
 $out=Join-Path $tmp 'stdout.log'
 $err=Join-Path $tmp 'stderr.log'
 $p=Start-Process -FilePath $node -ArgumentList @($test) -PassThru -Wait -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError $err
 if($p.ExitCode -ne 0){throw 'Synthetic owner-PC Node child did not exit cleanly'}
 if(-not((Get-Content -LiteralPath $out -Raw).Contains('CAPTURE_COMPLETE'))){throw 'Missing expected complete stdout evidence'}
 if(-not((Get-Content -LiteralPath $err -Raw).Contains('PDH_INVALID_DATA'))){throw 'Native stderr diagnostics missing'}
 Write-Host 'PASS: native Node stderr preserved without PowerShell pipeline termination; child completed'
}finally{
 Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
