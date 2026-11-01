import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const SHA='525457796d0339d807de61293bc5ef65c15040fd';
const JOB='pc-godot-exported-20261101-cc0-job10-525457';
test('SR16: job10 requests exact successful repaired Windows export, not a job09 replay',()=>{
 const current=validateGodotJob(get('visual-qa/jobs/godot-job10-original.json'));
 const prior=validateGodotJob(get('visual-qa/jobs/godot-job09-original.json'));
 assert.equal(current.schemaVersion,8);
 assert.equal(current.jobId,JOB);assert.equal(current.commit,SHA);
 assert.notEqual(current.jobId,prior.jobId);assert.notEqual(current.commit,prior.commit);
 assert.equal(prior.jobId,'pc-godot-exported-20261101-cc0-job09-ed3239');
 assert.equal(prior.commit,'ed3239c85a499205bf76b13395dc54c87b8ffe75');
 assert.deepEqual(Object.fromEntries(Object.entries(current).filter(([k])=>!['commit','jobId'].includes(k))),
  Object.fromEntries(Object.entries(prior).filter(([k])=>!['commit','jobId'].includes(k))));
 assert.throws(()=>validateGodotJob({...current,timeoutSec:181}));
 assert.throws(()=>validateGodotJob({...current,suite:'ad-hoc-instrument-run'}));
});
test('SR16: human-readable owner-PC job10 handoff pins EXE/export identity and forbids synthetic acceptance',()=>{
 const doc=fs.readFileSync(path.join(root,'visual-qa/SR16_OWNER_PC_EXPORTED_APP_JOB10.md'),'utf8');
 for(const s of [SHA,JOB,'41306484755','13082973437','verified-raw-source','RAW-SOURCE-SHA256SUMS.txt','EVIDENCE_INCOMPLETE','NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW'])assert(doc.includes(s),s);
 assert(doc.includes('private WinSta0'));
 assert(doc.includes('kliniklab-exported-cc0-environment.png'));
 assert(doc.includes('kliniklab-exported-fdi36-practical.png'));
});
