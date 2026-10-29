import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTimings,rectIntersectionArea,reviewAccessibility} from '../qa-metrics.mjs';

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
