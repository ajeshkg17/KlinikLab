const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const xr=fs.readFileSync(path.join(root,'xr-procedure.js'),'utf8');
const smoke=fs.readFileSync(path.join(root,'test-support/webxr-test/smoke.mjs'),'utf8');
test('Phase8 compact context displays selected FDI, jaw, side and cut count',()=>{
 for(const term of ["this.clinicalPanel=scene.box","this.clinicalTitle=scene.label","this.clinicalDetail=scene.label","this.clinicalStatus=scene.label","this.scene.replaceLabel(this.clinicalTitle,'FDI '+id","jaw,side,toothClass:cls,cuts","for(const m of this.clinicalUI)m.hidden=!show"])assert(xr.includes(term),term);
 assert(!xr.includes("this.scene.xrGuide?.state.open=true"));
 assert.equal(xr,fs.readFileSync(path.join(root,'public/xr-procedure.js'),'utf8'));
});
test('Phase8 stereo evidence covers two FDI contexts without changing 10 standard captures',()=>{
 for(const id of ['16','36'])assert(smoke.includes("'phase8-context-fdi-'+id+'.png'"));
 assert(smoke.includes("result.phase8ClinicalUI.push(clinical)"));
 assert(smoke.includes("assert.equal(clinical.fdi,id"));
 assert(smoke.includes("window.kliniklab.scene.xrFdiEvidence=false"));
});
