# WinPS 5.1 + pwsh7 regression on original job08 REMOTE vs local ledger
# Authorizing missing ledger requires a genuine remote report; no Git/Godot.
$ErrorActionPreference='Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'visual-qa\sr1p-job08-publication-gate.ps1')
$source='f4d4d4151851a08342def08d9f2e461f5f5e7109'
$worker='f41078e3fc7049adb9158f1122adca7298168df8'
$old='pc-godot-clinic-20261101-job07'
$new='pc-godot-clinic-20261101-job08'
function Fixture {
 $oldValue=@{commit=$source;status='published';recoveryOnly=$true;
 result=@{reexecuted=$false;gpuProcessCorroborated=$false;overallStatus='EVIDENCE_INCOMPLETE'}}
 $n=@{commit=$source;status='published';
 result=@{workerGitSHA=$worker;overallStatus='EVIDENCE_INCOMPLETE';
  imageExists=$false;gpuProcessCorroborated=$false}}
 # Use JSON ConvertFrom-Json to model the REAL Node ledger PSObject.
 $l=@{completed=@{$old=$oldValue;$new=$n}}|ConvertTo-Json -Depth 8|ConvertFrom-Json
 $remote=@{jobId=$new;sourceGitSHA=$source;workerGitSHA=$worker;
  overallStatus='EVIDENCE_INCOMPLETE';imageExists=$false;angledImageExists=$false;
  gpuProcessCorroborated=$false;fullKlinikLabApplicationMigrated=$false;
  nativeSceneMode='clinic-cases';distinctRtx5060Gpu3DPeriods=34;
  rtx5060DxgiLuid='0x00000000_0x00013049'}|ConvertTo-Json -Depth 5|ConvertFrom-Json
 return [pscustomobject]@{ledger=$l;remote=$remote}
}
$f=Fixture
$before=ConvertTo-Json -InputObject $f.ledger -Depth 10
$r=Assert-KLJob08OriginalPublicationGate -Ledger $f.ledger -RemoteJob $f.remote -ExpectedSourceSha $source -ExpectedWorkerSha $worker
if($r -cne 'LOCAL_JOB08_ENTRY_PRESENT_AND_REMOTE_ORIGINAL_PUBLISHED'){throw 'Original present job08 should pass'}
if((ConvertTo-Json -InputObject $f.ledger -Depth 10) -cne $before){throw 'Gate modified the ledger'}
$f=Fixture
[void]$f.ledger.completed.PSObject.Properties.Remove($new)
$before=ConvertTo-Json -InputObject $f.ledger -Depth 10
$r=Assert-KLJob08OriginalPublicationGate -Ledger $f.ledger -RemoteJob $f.remote -ExpectedSourceSha $source -ExpectedWorkerSha $worker
if($r -cne 'LOCAL_JOB08_ENTRY_ABSENT_REMOTE_ORIGINAL_PUBLISHED'){throw 'Missing local job08 should be remotely attestable'}
if((ConvertTo-Json -InputObject $f.ledger -Depth 10) -cne $before){throw 'Absent ledger was silently repaired'}
$changes=@(
 @{which='remote';field='jobId';value='pc-godot-clinic-20261101-job09'},
 @{which='remote';field='sourceGitSHA';value=('0'*40)},
 @{which='remote';field='workerGitSHA';value=('f'*40)},
 @{which='remote';field='overallStatus';value='SUCCESS'},
 @{which='remote';field='imageExists';value=$true},
 @{which='remote';field='angledImageExists';value=$true},
 @{which='remote';field='gpuProcessCorroborated';value=$true},
 @{which='remote';field='rtx5060DxgiLuid';value='0xBAD'},
 @{which='remote';field='distinctRtx5060Gpu3DPeriods';value=0},
 @{which='remote';field='fullKlinikLabApplicationMigrated';value=$true},
 @{which='ledger-old';field='status';value='executing'},
 @{which='ledger-old';field='recoveryOnly';value=$false}
)
foreach($change in $changes){
 $f=Fixture
 if($change.which -eq 'remote'){$f.remote.($change.field)=$change.value}
 else{$f.ledger.completed.PSObject.Properties[$old].Value.($change.field)=$change.value}
 [void]$f.ledger.completed.PSObject.Properties.Remove($new)
 $fail=$false
 try{$null=Assert-KLJob08OriginalPublicationGate -Ledger $f.ledger -RemoteJob $f.remote -ExpectedSourceSha $source -ExpectedWorkerSha $worker}
 catch{$fail=$true}
 if(-not $fail){throw ('Gate wrongly accepted '+$change.which+'/'+$change.field)}
}
$f=Fixture
$f.ledger.completed.PSObject.Properties[$new].Value.status='executing'
$failed=$false
try{$null=Assert-KLJob08OriginalPublicationGate -Ledger $f.ledger -RemoteJob $f.remote -ExpectedSourceSha $source -ExpectedWorkerSha $worker}
catch{$failed=$true}
if(-not $failed){throw 'Conflicting PRESENT local job08 entry must fail'}
Write-Host ('PASS '+$PSVersionTable.PSVersion.ToString()+' original job08 remote ledger reconciliation: present, absent, 13 fail-closed cases; no ledger mutation')
