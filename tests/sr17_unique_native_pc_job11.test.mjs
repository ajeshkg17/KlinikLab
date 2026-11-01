import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const SHA='a33c31a9e1c364463f96c29a6004a7e625cd4e89', JOB='pc-godot-exported-20261101-cc0-job11-a33c31';
test('SR17: approved new job11 uses exact successfully exported app SHA and never repeats immutable job09/10',()=>{
 const actual=validateGodotJob(get('visual-qa/jobs/godot-current.json'));
 const job10=validateGodotJob(get('visual-qa/jobs/godot-job10-original.json'));
 const job09=validateGodotJob(get('visual-qa/jobs/godot-job09-original.json'));
 assert.equal(actual.schemaVersion,8);assert.equal(actual.jobId,JOB);assert.equal(actual.commit,SHA);
 assert.equal(job10.jobId,'pc-godot-exported-20261101-cc0-job10-525457');
 assert.equal(job10.commit,'525457796d0339d807de61293bc5ef65c15040fd');
 assert.equal(job09.jobId,'pc-godot-exported-20261101-cc0-job09-ed3239');
 assert.equal(job09.commit,'ed3239c85a499205bf76b13395dc54c87b8ffe75');
 assert.notEqual(actual.jobId,job09.jobId);assert.notEqual(actual.jobId,job10.jobId);
 assert.notEqual(actual.commit,job10.commit);
 assert.deepEqual(Object.fromEntries(Object.entries(actual).filter(([k])=>!['jobId','commit'].includes(k))),
  Object.fromEntries(Object.entries(job10).filter(([k])=>!['jobId','commit'].includes(k))));
 assert.throws(()=>validateGodotJob({...actual,graphics:'compatibility'}));
});
test('SR17: job11 handoff and watched app guarantee original pixels, opt-in in-app capture and exact artifact ID',()=>{
 const doc=fs.readFileSync(path.join(root,'visual-qa/SR17_OWNER_PC_EXPORTED_APP_JOB11.md'),'utf8');
 for(const s of [SHA,JOB,'41307826872','13083573933','verified-raw-source','RAW-SOURCE-SHA256SUMS.txt',
  'EVIDENCE_INCOMPLETE','NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW',
  'kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png'])assert(doc.includes(s),s);
 const app=fs.readFileSync(path.join(root,'native-godot/app.gd'),'utf8');
 const launch=fs.readFileSync(path.join(root,'visual-qa/sr1c-private-desktop.ps1'),'utf8');
 assert(app.includes('res://exported-app-capture-node.gd'));
 assert(launch.includes('-- --kliniklab-exported-pc-capture'));
 assert(!launch.includes(' --script res://exported-app-capture.gd'));
});
