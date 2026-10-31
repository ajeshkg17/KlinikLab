// Pure geometry for aligning a measured IWER targetRaySpace pose to a tooth.
// Calibration takes place using an actual XRFrame inside requestAnimationFrame.
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
const unit=a=>{const n=norm(a);if(!Number.isFinite(n)||n<1e-8)throw Error('Zero or invalid ray');return a.map(x=>x/n)};
export const DOWN=Object.freeze([0,-1,0]);
export function rotateQuaternion(v,q){
 const u=q.slice(0,3),s=q[3],t=cross(u,v).map(x=>2*x);
 return v.map((x,i)=>x+s*t[i]+cross(u,t)[i]);
}
export function alignRayQuaternion(observedDirection,currentQuaternion,desiredDirection=DOWN){
 const q=currentQuaternion, inverse=[-q[0],-q[1],-q[2],q[3]];
 const local=unit(rotateQuaternion(unit(observedDirection),inverse));
 const target=unit(desiredDirection),d=Math.max(-1,Math.min(1,dot(local,target)));
 if(d>1-1e-9)return [0,0,0,1];
 if(d<-1+1e-8){
  let axis=cross(local,[1,0,0]);
  if(norm(axis)<1e-7)axis=cross(local,[0,1,0]);
  return [...unit(axis),0];
 }
 const c=cross(local,target),qNew=unit([...c,1+d]);
 return qNew;
}
export function translationCorrection(observedOrigin,desiredOrigin){
 if(observedOrigin.length!==3||desiredOrigin.length!==3)throw Error('Bad XR position');
 const delta=desiredOrigin.map((x,i)=>x-observedOrigin[i]);
 if(delta.some(x=>!Number.isFinite(x))||norm(delta)>3)throw Error('Invalid/implausible controller calibration');
 return delta;
}
