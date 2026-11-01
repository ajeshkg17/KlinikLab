import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const get=p=>validateGodotJob(JSON.parse(fs.readFileSync(path.join(root,p),'utf8')));
test('SR21 unique job13 preserves consumed job12 and exact verified visual-UX Windows export',()=>{
 const active=get('visual-qa/jobs/godot-current.json');
 const job12=get('visual-qa/jobs/godot-job12-original.json');
 assert.equal(active.schemaVersion,8);
 assert.equal(active.jobId,'pc-godot-exported-20261101-cc0-job13-6a077f');
 assert.equal(active.commit,'6a077fc8781d9b51ea34a751986a0187cd163764');
 assert.equal(job12.jobId,'pc-godot-exported-20261101-cc0-job12-approved-678f92');
 assert.equal(job12.commit,'678f92e28dd3a1e1bb98c4d94e58028eefa5d9ec');
 assert.notEqual(active.jobId,job12.jobId);
 for(const key of Object.keys(active))if(key!=='jobId' && key!=='commit') assert.deepEqual(active[key],job12[key],key);
 assert.throws(()=>validateGodotJob({...active,timeoutSec:181}));
});
test('SR21 job13 must independently inspect actual revised exported UI original PNGs and PID GPU',()=>{
 const handoff=fs.readFileSync(path.join(root,'visual-qa/SR21_OWNER_PC_EXPORTED_APP_JOB13.md'),'utf8');
 for(const term of ['6a077fc8781d9b51ea34a751986a0187cd163764','pc-godot-exported-20261101-cc0-job13-6a077f','41310806861','13085058617','kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png','native-exported-app-result.json','RAW-SOURCE-SHA256SUMS.txt','NOT_ACCEPTED_PENDING_INDEPENDENT_PIXEL_REVIEW']) assert(handoff.includes(term),term);
 const app=fs.readFileSync(path.join(root,'native-godot/app.gd'),'utf8');
 assert(app.includes('historical_overlay.visible = false'));
 assert(app.includes('_style_panel(_left_panel)'));
 assert(app.includes('_style_panel(_right_panel)'));
 assert(app.includes('KlinikLab · FDI %s'));
});
