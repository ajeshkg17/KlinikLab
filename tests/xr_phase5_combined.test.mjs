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
 assert(catalog.includes("[-.60,1.075,-.99],[.79,.145,1]"),'two-line purpose has dedicated taller surface');
 assert(catalog.includes('this.replaceCatalogPurpose(cat.status,catalogSpecs[0][2]);'),'initial purpose must use wrapped texture');
 assert(src.includes('ctx.measureText(next).width>570'),'purpose wrapping must be width-aware');
 assert(catalog.includes("[x,.87,-.985],[.27,.115,.05]"),'control row moved unexpectedly');
 const purposeBottom=1.075-.145/2,controlTop=.87+.115/2;
 assert(purposeBottom-controlTop>=.06,'purpose surface and action controls must have physical separation');
 assert(catalog.includes("['spawn',-.90,'RETURN']"));
});

test('compact Touch-like silhouettes preserve two-hand pose attachment and working-tip clearance',()=>{
 const method=src.slice(src.indexOf('  updateXRController(slot,source,frame){'),src.indexOf('  replaceLabel(mesh',src.indexOf('  updateXRController(slot,source,frame){')));
 assert(method.includes('source.gripSpace')&&method.includes('source.targetRaySpace'));
 assert(method.includes('this.controllerMatrix(grip)'));
 assert(method.includes('holding&&i===2'),'tracking ring must remain hidden while holding');
 assert(method.includes('c.ray.model'),'independent aim ray must remain');
 const grip=method.match(/\{p:\[0,-\.046,\.018\],s:\[([^\]]+)\]/);
 const ring=method.match(/\{p:\[0,\.054,-\.010\],s:\[([^\]]+)\]/);
 assert(grip&&ring,'expected compact grip and ring dimensions');
 const gripDims=grip[1].split(',').map(Number),ringDims=ring[1].split(',').map(Number);
 assert(gripDims.every(x=>x<=.12),'grip must remain compact');
 assert(ringDims.every(x=>x<=.083),'ring must remain compact');
 assert(src.includes('gripOffset=[side*.025,-.025,-.25]'),'working-end clearance must remain');
});
