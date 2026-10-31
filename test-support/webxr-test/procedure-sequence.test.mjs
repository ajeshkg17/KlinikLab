import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STEPS,validateProcedureConfig} from './procedure-sequence.mjs';

const sha='0123456789abcdef0123456789abcdef01234567';
const id='fdi16-unit-20261031-01';
test('procedure opt-in defaults to off and requires a bounded unique ID and exact source commit',()=>{
 assert.equal(validateProcedureConfig({}),null);
 const v=validateProcedureConfig({KLINIKLAB_PROCEDURE_CAPTURE:'1',KLINIKLAB_PROCEDURE_RUN_ID:id,KLINIKLAB_BUILD_SHA:sha});
 assert.deepEqual(v,{id,sha});
 for(const bad of [{KLINIKLAB_PROCEDURE_RUN_ID:'../../temp'}, {KLINIKLAB_PROCEDURE_RUN_ID:'other'},
  {KLINIKLAB_BUILD_SHA:'main'}, {KLINIKLAB_BUILD_SHA:'f'.repeat(39)}]){
  assert.throws(()=>validateProcedureConfig({KLINIKLAB_PROCEDURE_CAPTURE:'1',KLINIKLAB_PROCEDURE_RUN_ID:id,KLINIKLAB_BUILD_SHA:sha,...bad}));
 }
});
test('procedure storyboard has six ordered distinct real-app FDI16 evidence checkpoints',()=>{
 assert.equal(STEPS.length,6);
 assert.equal(new Set(STEPS.map(x=>x[0])).size,6);
 assert(STEPS.every((x,i)=>x[0].startsWith('0'+(i+1)+'-')&&x[0].endsWith('.png')));
 assert(STEPS[1][0].includes('precut')&&STEPS[3][0].includes('cut'));
 assert(STEPS[5][0].includes('switchback'));
 const src=fs.readFileSync(new URL('./procedure-sequence.mjs',import.meta.url),'utf8');
 for(const required of ['await captureXR(filename,label,true)','updateButtonValue',
  'traceSurface(ray.o,ray.d)','manifest.pixelDifference=difference','assert.equal(manifest.steps[5].state.cuts',
  'sha256:createHash','record.eyes===2'])if(!src.includes(required)
  assert.fail('Missing evidence contract: '+required);
 assert(src.includes("KLINIKLAB_PROCEDURE_CAPTURE"));
});
test('default XR ten-checkpoint and existing gallery remain independent of optional procedure',()=>{
 const smoke=fs.readFileSync(new URL('./smoke.mjs',import.meta.url),'utf8');
 const worker=fs.readFileSync(new URL('../../visual-qa/xr-worker.mjs',import.meta.url),'utf8');
 assert(smoke.includes('if(procedureConfig){'));
 assert(smoke.indexOf("captureXR('10-tool-catalog-closed.png'")<smoke.indexOf('if(procedureConfig){'));
 assert(smoke.includes('result.captureManifest.push({file:filename'));
 assert(worker.includes("if(!result.passed||captures.length!==10)"));
 assert(worker.includes('if(job.procedureCapture){'));
 assert(worker.includes("'procedure-manifest.json','storyboard.md'"));
 const job=JSON.parse(fs.readFileSync(new URL('../../visual-qa/jobs/xr-current.json',import.meta.url),'utf8'));
 assert.equal(job.procedureCapture,undefined,'do not change processed job06');
});
