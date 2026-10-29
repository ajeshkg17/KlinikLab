import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTimings,rectIntersectionArea,reviewAccessibility,checkBaselineApproval} from '../qa-metrics.mjs';

test('timing summary is deterministic and ignores nonfinite samples',()=>{
 assert.deepEqual(summarizeTimings([40,10,20,30,Infinity,-4,NaN]),{
   count:4,medianMs:20,p95Ms:40,minMs:10,maxMs:40
 });
 assert.deepEqual(summarizeTimings([]),{
   count:0,medianMs:null,p95Ms:null,minMs:null,maxMs:null
 });
});
test('overlay intersection handles non-overlap, clipping and invalid rectangles',()=>{
 const a={x:0,y:0,width:100,height:50};
 assert.equal(rectIntersectionArea(a,{x:50,y:20,width:60,height:50}),1500);
 assert.equal(rectIntersectionArea(a,{x:200,y:200,width:20,height:20}),0);
 assert.equal(rectIntersectionArea(a,{x:NaN,y:0,width:2,height:3}),0);
});
test('accessibility scoring distinguishes blocking DOM errors from advisory deficits',()=>{
 const ok=reviewAccessibility({duplicateIds:[],brokenAriaControls:[],unnamedControls:['#x'],smallTargets:['#y'],horizOverflowPx:20});
 assert.equal(ok.pass,true);
 assert.deepEqual(ok.advisory.map(x=>x.id),['A11Y-UNNAMED-CONTROL','A11Y-SMALL-TOUCH-TARGET','A11Y-HORIZONTAL-OVERFLOW']);
 const bad=reviewAccessibility({duplicateIds:['feedback'],brokenAriaControls:['#help -> missing']});
 assert.equal(bad.pass,false);assert.equal(bad.blocking.length,2);
});

test('baseline registry refuses unapproved, changed and mismatched environments',()=>{
 const sha='a'.repeat(64);
 const observation={sha256:sha,browserMajor:142,viewport:{width:1440,height:900}};
 const entry={sha256:sha,sourceCommit:'b'.repeat(40),
   sourceRun:'https://github.com/ajeshkg17/KlinikLab/actions/runs/1234',
   approvedBy:'qa-reviewer',approvedAt:'2026-10-29',
   browserMajor:142,viewport:{width:1440,height:900}};
 assert.equal(checkBaselineApproval(null,observation).reason,'NO_APPROVAL');
 assert.deepEqual(checkBaselineApproval(entry,observation),{ok:true,reason:'APPROVED_METADATA_MATCH'});
 assert.equal(checkBaselineApproval({...entry,sha256:'c'.repeat(64)},observation).reason,'BASELINE_HASH_MISMATCH');
 assert.equal(checkBaselineApproval({...entry,approvedBy:''},observation).reason,'INCOMPLETE_APPROVAL_PROVENANCE');
 assert.equal(checkBaselineApproval({...entry,browserMajor:143},observation).reason,'BROWSER_VERSION_MISMATCH');
 assert.equal(checkBaselineApproval({...entry,viewport:{width:390,height:844}},observation).reason,'VIEWPORT_MISMATCH');
});
