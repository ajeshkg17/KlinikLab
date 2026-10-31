const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine.js'),'utf8');

test('Phase9 tools preserve five original XR grip anchors and distinct slim working ends',()=>{
 const a=source.indexOf('    this.xrTableTools=[];');
 const b=source.indexOf('    // Phase 4: opt-in VR catalog.',a);
 assert(a>=0&&b>a,'tool setup must precede catalog');
 const setup=vm.runInNewContext('(function(){'+source.slice(a,b)+'return this.xrTableTools;})');
 const scene={meshes:[],xrTableTools:[]};
 function add(kind,p,s,color,options={}){
  const m={kind,p,s,color, ...options};scene.meshes.push(m);return m;
 }
 scene.cy=(...args)=>add('cylinder',...args);
 scene.box=(...args)=>add('box',...args);
 scene.sphere=(...args)=>add('sphere',...args);
 scene.label=(...args)=>add('label',...args);
 const tools=setup.call(scene);
 assert.equal(tools.length,5);
 assert.deepEqual(Array.from(tools,v=>v.name),['mirror','probe','suction','excavator','composite']);
 const anchors=[-.31,-.11,.09,.29,.49];
 for(let i=0;i<5;i++){
  const t=tools[i],m=t.meshes[0];
  assert.equal(t.owner,null);assert.equal(t.home,null);assert.equal(t.hover,null);
  assert.deepEqual(Array.from(m.p),[anchors[i],1.08,-.68]);
  assert.equal(m.key,'tool:'+t.name);
  assert.equal(m.tag,'instrument-shaft');
  assert(m.s[0]<=.015&&m.s[2]<=.015,'shaft must be slim');
  const grip=t.meshes.find(x=>x.tag==='instrument-grip');
  assert(grip&&grip.s[0]<.027,'retained near-hand grip with compact diameter');
  const tip=t.meshes.filter(x=>x.tag==='working-tip');
  assert.equal(tip.length,1,t.name+' has precisely one distinct end');
  assert(tip[0].p[2]<-.80,'working end must extend beyond handle toward the patient');
  assert(tip[0].s[0]<.055,'no generic oversized working head');
  assert(t.meshes.every(x=>x.p.every(Number.isFinite)&&x.s.every(v=>Number.isFinite(v)&&v>0)));
  assert(t.meshes.length<=6,'bounded GPU mesh count per instrument');
 }
 assert.notEqual(tools[0].meshes.at(-2).kind,tools[4].meshes.at(-1).kind,'mirror and composite tips differ');
});

test('Phase9 instrument render copies and standalone remain bitwise consistent',()=>{
 const publicSource=fs.readFileSync(path.join(root,'public/engine.js'),'utf8');
 assert.equal(publicSource,source);
 const standalone=fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8');
 assert(standalone.includes(source.replaceAll('</script>','<\\/script>')));
});
