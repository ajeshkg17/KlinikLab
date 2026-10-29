'use strict';
/* KlinikLab XR procedure workstation v2.
 * Shares the SAME implicit solid as the 2D/desktop preparation module.
 * WebXR targetRaySpace drives 6DoF pointing; cuts are model-space sphere subtractions.
 * Explicitly NOT calibrated force, depth in mm, or clinical drilling simulation.
 */
(()=>{
const CLAMP=(v,a,b)=>Math.max(a,Math.min(b,v));
const COLORS={enamel:'#efe6cd',dentin:'#dda66a',pulp:'#b64c61',cementum:'#9f826d',caries:'#654444'};
const WORLD={center:[.28,1.42,-1.03],scale:.25};
const materials=Object.keys(COLORS);
class XRToothPractice {
  constructor(scene,app){
    this.scene=scene;this.app=app;this.active=false;this.triggers=new Set();this.lastCut=null;this.lastMeshAt=0;
    this.dirty=true;this.currentCase='';this.lastRevision=-1;this.cutCount=0;this.lastHapticAt=0;this.sourceKind='controller-target-ray';
    this.presentation=[];
    this.toggleButton=scene.box([.73,1.85,-1.90],[.64,.14,.055],'#246b71',{key:'xrprep:toggle',radius:.39});
    this.toggleText=scene.label('VR TOOTH PREP',[.73,1.855,-1.861],[.60,.082,1],{font:34,color:'#effff8'});
    this.toggleButton.hidden=true;this.toggleText.hidden=true;
    this.meshes=materials.map((material)=>{
      const kind='xrvol-'+material;
      const m=scene.add(kind,WORLD.center,[WORLD.scale,WORLD.scale,WORLD.scale],COLORS[material],{});
      m.hidden=true;
      m.xrMaterial=material;
      return m;
    });
    this.tip=scene.sphere([0,-20,0],[.025,.025,.025],'#46ead5',{alpha:.82});
    this.tip.hidden=true;
    this.info=scene.label('VR PRACTICE | NOT CALIBRATED',[.43,2.03,-1.76],[1.10,.12,1],{font:32,color:'#e7fff1'});
    this.info.hidden=true;
  }
  get lab(){return this.app.volLab}
  onEnter(){this.toggleButton.hidden=false;this.toggleText.hidden=false;this.syncCase();if(this.active)this.showActive(true)}
  onExit(){this.triggers.clear();this.toggleButton.hidden=true;this.toggleText.hidden=true;this.showActive(false);this.active=false;this.finish();}
  syncCase(){const lab=this.lab;if(!lab)return;const next=lab.caseKey;if(next!==this.currentCase){this.currentCase=next;this.dirty=true;this.cutCount=0;this.lastCut=null;}
    if(this.lastRevision!==lab.revision){this.lastRevision=lab.revision;this.dirty=true;if(!lab.solid.bur.length){this.cutCount=0;this.lastCut=null;}}}
  toggle(){this.syncCase();this.active=!this.active;this.triggers.clear();this.showActive(this.active);if(!this.active)this.finish();return this.active}
  showActive(show){this.scene.geom.xrvol_enamel;this.tip.hidden=!show;this.info.hidden=!show;for(const m of this.meshes)m.hidden=!show;
    this.toggleButton.color=this.scene.rgb(show?'#189783':'#246b71');
    if(show){this.updateMesh();this.scene.replaceLabel(this.info,'XR PREP · 6DoF ray · trigger to cut',25);}
  }
  finish(){if(!this.lab)return;this.lab.rebuild();this.lastCut=null;this.tip.p=[0,-20,0];this.dirty=true;}
  updateMesh(){if(!this.lab||!window.KlinikVoxelMesher)return false;const scene=this.scene;
    // Lower mesh detail while the controller trigger is held to reduce Quest main-thread stalls.
    const result=window.KlinikVoxelMesher.build(this.lab.solid,false,this.triggers.size?14:19);
    const groups=Object.fromEntries(materials.map(m=>[m,[]]));
    for(const f of result.faces){const group=groups[f.material]||groups.enamel;group.push(...scene.tri(f.p[0],f.p[1],f.p[2]));}
    for(const material of materials){const kind='xrvol-'+material;const old=scene.geom[kind];if(old)scene.gl.deleteBuffer(old.buffer);
      scene.geom[kind]=scene.geometry(groups[material]);}
    this.dirty=false;this.lastRevision=this.lab.revision;this.lastMeshAt=performance.now();this.visibleTriangles=result.count;return true;
  }
  poseRay(pose){const q=pose.transform.orientation,p=pose.transform.position;return {o:[p.x,p.y,p.z],d:this.scene.rotateByQuat([0,0,-1],q)}}
  // Intentionally works with normalized *model* coordinates, not millimetres.
  worldToModel(world){return world.map((v,i)=>(v-WORLD.center[i])/WORLD.scale)}
  modelToWorld(p){return p.map((v,i)=>v*WORLD.scale+WORLD.center[i])}
  traceSurface(o,d){if(!this.lab)return null;const solid=this.lab.solid;
    // Sphere bound plus small constant increments prevents cuts through unseen rear surfaces.
    const bound=window.M3?window.M3.raySphere(o,d,WORLD.center,.47):null;
    let from=bound===null?0:Math.max(0,bound-.02);
    if(bound===null){const oc=[o[0]-WORLD.center[0],o[1]-WORLD.center[1],o[2]-WORLD.center[2]];
      const b=oc[0]*d[0]+oc[1]*d[1]+oc[2]*d[2],h=b*b-(oc[0]**2+oc[1]**2+oc[2]**2)+.47**2;
      if(h<0)return null;from=Math.max(0,-b-Math.sqrt(h)-.02);
    }
    for(let t=from;t<Math.min(2.5,from+.98);t+=.010){const p=this.worldToModel([o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t]);
      if(Math.abs(p[0])>1.43||p[1]>1.49||p[1]<-1.73||Math.abs(p[2])>1.26)continue;
      if(solid.field(p[0],p[1],p[2],false)<=0)return {p,world:this.modelToWorld(p),distance:t};
    }return null;
  }
  rayForFrame(frame,source){if(!frame?.getPose||!source?.targetRaySpace||!this.scene.xrRef)return null;
    try{const pose=frame.getPose(source.targetRaySpace,this.scene.xrRef);return pose?this.poseRay(pose):null}catch{return null}
  }
  onSelectStart(event,frame){
    const ray=this.rayForFrame(frame,event?.inputSource);if(!ray)return false;
    const hit=this.scene.getRayHit(ray.o,ray.d);
    if(hit?.key==='xrprep:toggle'){this.toggle();return true}
    if(!this.active)return false;
    const contact=this.traceSurface(ray.o,ray.d);
    if(!contact)return false;
    // Avoid cutting through another interactive object closer than the tooth.
    if(hit&&hit.distance<contact.distance-.025)return false;
    this.triggers.add(event.inputSource);this.cut(contact,event.inputSource);return true;
  }
  onSelectEnd(e){this.triggers.delete(e.inputSource);this.lastCut=null;this.dirty=true;}
  onDesktopClick(ray){if(!this.active||this.scene.xrSession)return false;const c=this.traceSurface(ray.o,ray.d);if(!c)return false;const hit=this.scene.getRayHit(ray.o,ray.d);if(hit&&hit.distance<c.distance-.025)return false;this.cut(c,null);this.updateMesh();return true}
  onXRFrame(frame,t){if(!this.active)return;
    if(this.scene.xrGuide?.state?.open){this.triggers.clear();this.tip.hidden=true;return;}
    this.syncCase();if(this.dirty&&t-this.lastMeshAt>230)this.updateMesh();
    let best=null;
    for(const source of frame.session.inputSources){const ray=this.rayForFrame(frame,source);if(!ray){this.triggers.delete(source);continue;}
      const hit=this.traceSurface(ray.o,ray.d);if(hit){const obstacle=this.scene.getRayHit(ray.o,ray.d);if(obstacle&&obstacle.distance<hit.distance-.025)continue;if(!best)best=hit;
        if(this.triggers.has(source)&&t-(this.lastCut?.time||0)>125){this.cut(hit,source);}
      }}
    if(best){this.tip.hidden=false;this.tip.p=best.world}else this.tip.hidden=true;
  }
  cut(contact,source){const lab=this.lab;if(!lab||lab.demoRunning)return;
    const p=contact.p,solid=lab.solid;if(solid.field(...p,false)>0.04)return;
    const last=this.lastCut?.p,dist=last?Math.hypot(...p.map((v,i)=>v-last[i])):1;
    if(dist<.035&&this.lastCut&&performance.now()-this.lastCut.time<500)return;
    const tissue=solid.tissue(...p),resistance={enamel:1,dentin:.55,caries:.20,pulp:.08,cementum:.67}[tissue]||.7;
    const physics=lab.physics,radius=lab.burRadius*CLAMP(.45+physics.speed*physics.load/(.3+resistance*.7),.35,1.20);
    solid.addCut(...p,radius);physics.trace.push({tissue,speed:physics.speed,load:physics.load,tilt:physics.tilt,resistance:+(physics.load*resistance*(1+physics.tilt/85)/(.25+physics.speed*1.2)).toFixed(4),effectiveRadius:+radius.toFixed(4),position:p.slice(),source:source?'WebXR tracked target ray':'desktop XR preview',calibrated:false});
    if(solid.bur.length>200){const removed=solid.bur.length-200;solid.bur.splice(0,removed);physics.trace.splice(0,removed);}
    lab.strokes++;lab.distance+=last?dist:0;
    this.lastCut={p:p.slice(),time:performance.now()};this.cutCount++;this.dirty=true;
    if(source&&performance.now()-this.lastHapticAt>260){this.lastHapticAt=performance.now();const actuator=source.gamepad?.hapticActuators?.[0]||source.gamepad?.vibrationActuator;
      try{const result=actuator?.pulse?.(.12,35)||actuator?.playEffect?.('dual-rumble',{duration:35,strongMagnitude:.12,weakMagnitude:.08});result?.catch?.(()=>{});}catch{}}
    if(this.cutCount%5===0)this.scene.replaceLabel(this.info,`${this.cutCount} cuts · ${tissue} · NOT CALIBRATED`,27);
  }
}
window.KlinikXRToothPractice=XRToothPractice;
window.addEventListener('DOMContentLoaded',()=>{
 const app=window.kliniklab;if(!app?.scene||!app.scene.gl)return;
 const xr=new XRToothPractice(app.scene,app);app.scene.xrPrep=xr;app.xrPrep=xr;
 // Desktop preview supplements existing 2D volume; never substitutes a headset acceptance test.
 const parent=document.getElementById('ds-quest-result');if(parent){const b=document.createElement('button');b.className='ds-btn secondary';b.id='ds-xr-preview';b.textContent='Preview XR tooth mesh on PC';parent.before(b);b.onclick=()=>{const on=xr.toggle();app.setView('3d');app.scene.mode=on?'teeth':'clinic';app.scene.target=on?[.28,1.42,-1.03]:[0,1.52,-2.6];app.scene.distance=on?1.9:4.4;app.scene.pitch=.16;app.scene.yaw=.12;b.textContent=on?'Hide XR tooth preview':'Preview XR tooth mesh on PC';};}
});
})();