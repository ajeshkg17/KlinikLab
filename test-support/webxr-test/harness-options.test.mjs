import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHarnessOptions,chromeArgs} from './harness-options.mjs';
test('defaults use native graphics and bounded 45 s collection',()=>{
 const c=parseHarnessOptions({});
 assert.equal(c.collectionDeadlineMs,45000);
 assert.equal(c.graphicsMode,'default');
 assert(!chromeArgs(c).some(a=>a.includes('swiftshader')));
});
test('software graphics is explicitly opt-in',()=>{
 const c=parseHarnessOptions({KLINIKLAB_XR_GRAPHICS:'software',KLINIKLAB_XR_DEADLINE_MS:'70000'});
 assert.equal(c.collectionDeadlineMs,70000);
 assert(chromeArgs(c).some(a=>a.includes('swiftshader')));
});
test('collection deadline bounds and invalid graphics reject before launch',()=>{
 for(const v of ['0','14999','120001','12.5','-1','abc'])
   assert.throws(()=>parseHarnessOptions({KLINIKLAB_XR_DEADLINE_MS:v}));
 assert.throws(()=>parseHarnessOptions({KLINIKLAB_XR_GRAPHICS:'unknown'}));
});
test('performance threshold is advisory, independently configured',()=>{
 assert.equal(parseHarnessOptions({KLINIKLAB_XR_PERF_THRESHOLD_MS:'120'}).performanceThresholdMs,120);
 assert.throws(()=>parseHarnessOptions({KLINIKLAB_XR_PERF_THRESHOLD_MS:'0'}));
});
