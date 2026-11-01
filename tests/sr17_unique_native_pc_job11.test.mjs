import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {validateGodotJob} from '../visual-qa/godot-job-core.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const job=p=>validateGodotJob(JSON.parse(read(p)));
const SOURCE='a33c31a9e1c364463f96c29a6004a7e625cd4e89';
const ID='pc-godot-exported-20261101-cc0-job11-a33c31';
const DOC='visual-qa/SR17_OWNER_PC_EXPORTED_APP_JOB11.md';
test('SR17 one unique job11 is pinned to successful new embedded capture export, not consumed job10',()=>{
 const active=job('visual-qa/jobs/godot-current.json');
 const old=job('visual-qa/jobs/godot-job10-original.json');
 const old09=job('visual-qa/jobs/godot-job09-original.json');
 assert.equal(active.schemaVersion,8);
 assert.equal(active.jobId,ID);
 assert.equal(active.commit,SOURCE);
 assert.equal(active.sceneMode,'native-exported-cc0');
 assert.equal(active.backgroundContract,'private-winsta0-vulkan-autocapture-no-foreground');
 assert.equal(active.capture,'native-exported-cc0-and-fdi36-two-pngs');
 assert.equal(old.jobId,'pc-godot-exported-20261101-cc0-job10-525457');
 assert.equal(old.commit,'525457796d0339d807de61293bc5ef65c15040fd');
 assert.equal(old09.jobId,'pc-godot-exported-20261101-cc0-job09-ed3239');
 assert.notEqual(active.jobId,old.jobId);
 assert.notEqual(active.commit,old.commit);
 assert.deepEqual(
  Object.fromEntries(Object.entries(active).filter(([k])=>!['jobId','commit'].includes(k))),
  Object.fromEntries(Object.entries(old).filter(([k])=>!['jobId','commit'].includes(k)))
 );
 assert.throws(()=>validateGodotJob({...active,commit:old.commit.slice(0,30)}));
});
test('SR17 exact Windows artifact and independent original pixel/GPU gate are documented',()=>{
 const doc=read(DOC);
 for(const s of [
  SOURCE,ID,'41307826872','13083573933',
  'RAW-SOURCE-SHA256SUMS.txt','godot-job10-original.json',
  '-- --kliniklab-exported-pc-capture','native-exported-app-result.json',
  'kliniklab-exported-cc0-environment.png','kliniklab-exported-fdi36-practical.png',
  'DXGI LUID','one-attempt','original','EVIDENCE_INCOMPLETE'
 ])assert(doc.includes(s),s);
 const launcher=read('visual-qa/sr1c-private-desktop.ps1');
 const exported=launcher.split('function Start-KLPrivateDesktopExportedApp')[1];
 assert(exported.includes('-- --kliniklab-exported-pc-capture'));
 assert(!exported.includes('--script res://exported-app-capture.gd'));
 const script=read('native-godot/exported-app-capture-node.gd');
 assert(script.includes('SR17_EXPORTED_APP_CAPTURE_NODE_ENTERED'));
 assert(script.includes('EXPORTED_APP_TWO_NATIVE_PNGS_PENDING_INDEPENDENT_PIXEL_GPU_REVIEW'));
 const app=read('native-godot/app.gd');
 assert(app.includes('--kliniklab-exported-pc-capture'));
});
