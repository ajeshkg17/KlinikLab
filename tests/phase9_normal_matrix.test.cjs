const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'engine.js'),'utf8');
const expr=source.slice(source.indexOf('const M3 = (() => {'),source.indexOf('\n\n\n\'use strict\';',source.indexOf('const M3 = (() => {')));
assert(expr.startsWith('const M3 ='));
const M3=vm.runInNewContext(expr+'; M3;',{}, {filename:'engine.js'});
const reference=m=>{const i=M3.inverse(m);return [i[0],i[4],i[8],i[1],i[5],i[9],i[2],i[6],i[10]];};
const nearly=(a,b,tol=1e-8)=>{assert.equal(a.length,9);assert.equal(b.length,9);for(let i=0;i<9;i++){assert(Number.isFinite(a[i]));const error=Math.abs(a[i]-b[i]);assert(error<tol*Math.max(1,Math.abs(b[i])),`matrix entry ${i}: ${a[i]} != ${b[i]}`);}};
test('Phase9 optimized normal matrices match exact 4x4 inverse-transpose for affine model transforms',()=>{
 const angles=[[0,0,0],[.6,-.7,1.3],[-1.2,.45,.14],[Math.PI/2,-Math.PI/3,Math.PI/8]];
 const scales=[[1,1,1],[.055,.075,.094],[.15,1.7,.018],[-1,.25,.8],[.045,-.12,.013]];
 for(const r of angles)for(const s of scales){
  const model=M3.trs([3,-2,7],r,s);
  nearly(Array.from(M3.normalMatrix(model)),Array.from(reference(model)));
  const rigid=M3.trs([1.2,-.5,-2.7],[.3,-.8,.2],[1,1,1]);
  const attached=M3.mm(rigid,model);
  nearly(Array.from(M3.normalMatrix(attached)),Array.from(reference(attached)));
 }
});
test('Phase9 normal calculation handles shear, reflection and singular fallback without invalid values',()=>{
 const shear=[1,.16,0,0,.25,1,.20,0,.11,0,2.1,0,4,-1,2,1];
 nearly(Array.from(M3.normalMatrix(shear)),Array.from(reference(shear)));
 assert.deepEqual(Array.from(M3.normalMatrix(M3.trs([1,2,3],[0,0,0],[0,1,1]))),[1,0,0,0,1,0,0,0,1]);
});
test('Phase9 render loop uses 3x3 model normals and preserves CPU source mirrors',()=>{
 assert(source.includes('M3.normalMatrix(model)'),'draw must call specialized normal matrix');
 assert(!source.includes('const inv=M3.inverse(model);gl.uniformMatrix3fv'),'no generic inverse for every draw');
 assert.equal(source,fs.readFileSync(path.join(root,'public/engine.js'),'utf8'));
 assert(fs.readFileSync(path.join(root,'KlinikLab_DesktopXR_Standalone.html'),'utf8').includes(source.replaceAll('</script>','<\\/script>')));
});
