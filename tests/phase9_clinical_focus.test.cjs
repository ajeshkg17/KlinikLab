const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const prep=fs.readFileSync(path.join(root,'xr-procedure.js'),'utf8');
const start=engine.indexOf('  setXRClinicalFocus(active){');
const end=engine.indexOf('  getRayHit(o,d,allow=null){',start);
assert(start>0&&end>start,'dedicated clinical focus method');
const setFocus=vm.runInNewContext('({'+engine.slice(start,end)+'}).setXRClinicalFocus');
test('Phase9 clinical view suppresses only cartoon patient props, never tray or chair',()=>{
 const start=engine.indexOf('    const patientStart=this.meshes.length;');
 const end=engine.indexOf('    this.xrPatientMeshes=this.meshes.slice(patientStart);',start);
 assert(start>0&&end>start,'patient group is explicit and bounded');
 const patient=engine.slice(start,end);
 assert.equal((patient.match(/this\.sphere\(/g)||[]).length,6,'only six schematic face/hair parts');
 assert(!patient.includes('this.cy(')&&!patient.includes('this.box('),'do not conceal chair or lamp');
 const faces=Array.from({length:6},()=>({hidden:false})),tray={hidden:false},chair={hidden:false};
 const s={xrPatientMeshes:faces,xrSession:{},xrClinicalFocusActive:false,setXRClinicalFocus:setFocus};
 assert.equal(s.setXRClinicalFocus(true),true);
 assert(faces.every(f=>f.hidden));assert.equal(tray.hidden,false);assert.equal(chair.hidden,false);
 assert.equal(s.setXRClinicalFocus(true),true);
 assert.equal(s.setXRClinicalFocus(false),false);
 assert(faces.every(f=>!f.hidden));
 s.xrSession=null;
 assert.equal(s.setXRClinicalFocus(true),false,'desktop mode cannot hide patient');
});
test('XR session focus stays active through help/catalog and restores only after session exit',()=>{
 assert(prep.includes('this.scene.setXRClinicalFocus?.(this.active||!!this.scene.xrSession)'));
 const exit=prep.match(/onExit\(\)\{([^\n]+)\}/)?.[1]||'';
 assert(exit.indexOf('this.active=false')<exit.indexOf('this.showActive(false)'),'deactivate before visibility update');
 const sync=prep.slice(prep.indexOf('  syncModalVisibility(){'),prep.indexOf('  syncCase(){'));
 assert(sync.includes('this.scene.setXRClinicalFocus?.(this.active||!!this.scene.xrSession)'),'focus persists through entire immersive session, independent of modal owner');
 assert(sync.includes("this.modalOwner=modal||'treatment'"));
 assert(engine.includes('this.setXRComfort(true);this.initXRTools();this.setXRClinicalFocus?.(true);'),'XR entry must hide cartoon face');
 assert(engine.includes('this.setXRClinicalFocus?.(false);'),'XR end must restore desktop face');
 const focusTarget={xrPatientMeshes:Array.from({length:6},()=>({hidden:false})),xrSession:{},xrClinicalFocusActive:false,setXRClinicalFocus:setFocus};
 // Model actual entry -> idle modal -> procedure off -> session end sequence.
 assert.equal(focusTarget.setXRClinicalFocus(true),true);
 for(const active of [false,true,false]){
   assert.equal(focusTarget.setXRClinicalFocus(active||!!focusTarget.xrSession),true);
   assert(focusTarget.xrPatientMeshes.every(x=>x.hidden),'XR presence must keep all schematic patient parts hidden');
 }
 focusTarget.xrSession=null;
 assert.equal(focusTarget.setXRClinicalFocus(false),false);
 assert(focusTarget.xrPatientMeshes.every(x=>!x.hidden),'leaving XR restores desktop presentation');

 assert.equal(engine,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
 assert.equal(prep,fs.readFileSync(path.join(root,'public/xr-procedure.js'),'utf8'));
 const bundle=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(bundle.includes(engine.replaceAll('</script>','<\\/script>')));
 assert(bundle.includes(prep.replaceAll('</script>','<\\/script>')));
});
