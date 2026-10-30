import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../engine.js',import.meta.url),'utf8');
const smoke=fs.readFileSync(new URL('../test-support/webxr-test/smoke.mjs',import.meta.url),'utf8');
test('Phase 5 retains complete catalog, help and bilateral tool regressions',()=>{
 for(const x of ['catalog:toggle','catalog:tool:','catalog:spawn','catalog:reset','catalog:close','this.xrGuide?.onSelectStart','this.onXRGripStart','this.onXRGripEnd'])
  assert(src.includes(x),'missing runtime path '+x);
 for(const x of ['left-hand-mirror-pickup','right-hand-composite-pickup','help-opened-by-question-mark','help-closed-after-close','tool-catalog-open','tool-catalog-closed'])
  assert(smoke.includes(x),'missing capture '+x);
 assert(smoke.includes('hiddenCenters.length'),'both-eye visibility assertion missing');
 assert(smoke.includes('frame-synchronized')||smoke.includes('Frame-synchronized'),'input event acknowledgement missing');
});
test('catalog purpose/control vertical clearance and tray isolation',()=>{
 const catalog=src.slice(src.indexOf('this.xrCatalog={'),src.indexOf('this.setXRCatalogOpen?.(false);'));
 assert(catalog.includes("[-.60,1.075,-.99],[.79,.085,1]"),'dedicated purpose line');
 assert(catalog.includes("[x,.87,-.985],[.27,.115,.05]"),'control row moved unexpectedly');
 const purposeBottom=1.075-.085/2,controlTop=.87+.115/2;
 assert(purposeBottom-controlTop>=.1,'purpose text and action buttons too close');
 assert(catalog.includes("['spawn',-.90,'RETURN']"));
});
