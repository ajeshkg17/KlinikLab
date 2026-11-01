import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateGodotJob,EXACT_SOURCE_SHA} from '../visual-qa/godot-job-core.mjs';
import {JOB07_ID,JOB07_SOURCE} from '../visual-qa/godot-job07-forensics.mjs';
import {PROBE_JOB_ID} from '../visual-qa/godot-next-job-admission.mjs';

const job=JSON.parse(readFileSync(new URL('../visual-qa/jobs/godot-job08-original.json',import.meta.url),'utf8'));
const reserved='pc-godot-clinic-20261101-job08';
test('SR1M: unique new job08 is ONLY a schema7 private-desktop native clinic request',()=>{
 const j=validateGodotJob(job);
 assert.equal(j.jobId,reserved);
 assert.notEqual(j.jobId,JOB07_ID);
 assert.notEqual(j.jobId,PROBE_JOB_ID);
 assert.equal(j.commit,EXACT_SOURCE_SHA);
 assert.equal(j.commit,JOB07_SOURCE); // same immutable SOURCE, different immutable job ID
 assert.equal(j.schemaVersion,7);
 assert.equal(j.sceneMode,'clinic-cases');
 assert.equal(j.suite,'sr1d-clinic-case-station-migration');
 assert.equal(j.graphics,'forward_plus-vulkan');
 assert.equal(j.timeoutSec,150);
 assert.equal(j.capture,'native-clinic-case-switch-orbit');
 assert.equal(j.backgroundContract,'private-winsta0-vulkan-autocapture-no-foreground');
 assert.equal(j.telemetryContract,'persistent-pdh-valid-rows-dxgi-luid-42s-orbit-v2');
 assert.equal(Object.hasOwn(j,'command'),false);
 assert.equal(Object.hasOwn(j,'recoveryOnly'),false);
});
test('Job08 request does not claim a full migrated app, three approved PNGs, or GPU acceptance in JSON',()=>{
 for(const field of ['gpuAccepted','imageIndependentlyReviewed','fullKlinikLabApplicationMigrated',
    'nativeCutFocusedImage','pixelReviewAccepted','shell','script','host','run']){
   assert.equal(Object.hasOwn(job,field),false,field);
 }
 const archived=validateGodotJob({...job,jobId:JOB07_ID});
 assert.equal(archived.jobId,JOB07_ID); // only historical schema validation; NEVER executed by this PR
 assert.throws(()=>validateGodotJob({...job,jobId:PROBE_JOB_ID,commit:'0'.repeat(40)}));
});
