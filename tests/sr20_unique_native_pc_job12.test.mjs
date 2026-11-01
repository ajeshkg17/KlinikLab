import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const j=p=>validateGodotJob(JSON.parse(read(p)));
test('SR20 job12 source-unique schema8 from verified Windows export, preserving consumed job11',()=>{
 const active=j('visual-qa/jobs/godot-job12-original.json'),archived=j('visual-qa/jobs/godot-job11-original.json');
 assert.equal(active.jobId,'pc-godot-exported-20261101-cc0-job12-approved-678f92');assert.equal(active.commit,'678f92e28dd3a1e1bb98c4d94e58028eefa5d9ec');
 assert.equal(archived.jobId,'pc-godot-exported-20261101-cc0-job11-a33c31');
 assert.equal(archived.commit,'a33c31a9e1c364463f96c29a6004a7e625cd4e89');
 assert.notEqual(active.jobId,archived.jobId);
 for(const key of Object.keys(active))if(key!=='jobId' && key!=='commit') assert.deepEqual(active[key],archived[key],key);
 assert.throws(()=>validateGodotJob({...active,timeoutSec:181}));
});
test('SR20 exact artifact and capture bootstrap evidence contract documented',()=>{
 const d=read('visual-qa/SR20_OWNER_PC_EXPORTED_APP_JOB12.md');
 for(const s of ['678f92e28dd3a1e1bb98c4d94e58028eefa5d9ec','pc-godot-exported-20261101-cc0-job12-approved-678f92','41308852512','13084885466','verified-raw-source','RAW-SOURCE-SHA256SUMS.txt','SR20_NATIVE_CAPTURE_SYNC_REPORT_WRITTEN','native-exported-app-result.json','kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png','EVIDENCE_INCOMPLETE','NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW'])assert(d.includes(s),s);
 assert(read('native-godot/app.gd').includes('capture_runner.run(self)'));
 assert(read('native-godot/exported-app-capture-node.gd').includes('synchronous_bootstrap'));
});
