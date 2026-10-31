import test from 'node:test';
import assert from 'node:assert/strict';
import {alignRayQuaternion,rotateQuaternion,translationCorrection,DOWN} from './procedure-ray.mjs';
const near=(a,b,epsilon=1e-7)=>a.forEach((v,i)=>assert(Math.abs(v-b[i])<epsilon,JSON.stringify({a,b,i})));
test('identity-forward calibrated from actual targetRaySpace aims down',()=>{
 const q=alignRayQuaternion([0,0,-1],[0,0,0,1],DOWN);
 near(rotateQuaternion([0,0,-1],q),DOWN);
});
test('IWER off-axis target ray calibration handles local yaw and existing controller rotation',()=>{
 const pose=[0,Math.sin(Math.PI/8),0,Math.cos(Math.PI/8)];
 const local=[.18,.075,-.981].map((v,i,a)=>v/Math.hypot(...a));
 const observed=rotateQuaternion(local,pose);
 const corrected=alignRayQuaternion(observed,pose,DOWN);
 near(rotateQuaternion(local,corrected),DOWN);
});
test('target-ray position correction follows measured offset without modifying tooth world geometry',()=>{
 const origin=[.3,1.94,-1.03],reported=[.27,1.90,-.99];
 const d=translationCorrection(reported,origin);near(d,[.03,.04,-.04]);
 assert.throws(()=>translationCorrection([90,0,0],origin),/implausible/);
 assert.throws(()=>alignRayQuaternion([0,0,0],[0,0,0,1]),/Zero/);
});
test('procedure source probes pose inside real XR animation callback',async()=>{
 const fs=await import('node:fs');
 const source=fs.readFileSync(new URL('./procedure-sequence.mjs',import.meta.url),'utf8');
 assert(source.includes('session.requestAnimationFrame((_time,frame)=>'));
 assert(source.includes('scene.xrPrep.rayForFrame(frame,source)'));
 assert(!source.includes('scene.latestFrame'));
 assert(source.includes('manifest.aim='));
});
