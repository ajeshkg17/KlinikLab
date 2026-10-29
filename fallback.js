'use strict';
/* CPU-projected 3D anatomical teaching model.
   Used when WebGL is blocked, disabled or unavailable; fully interactive
   on ordinary 2D Canvas browsers. It is not a clinical surface scan. */
class DentalSceneFallback {
 constructor(canvas,onPick){
  this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw Error('Canvas rendering unavailable');
  this.onPick=onPick;this.mode='teeth';this.archMode='both';this.selectedKey='';this.caseTooth='16';this.xrSession=null;this.frameCount=0;
  this.yaw=.22;this.pitch=.35;this.distance=3.3;this.markers=[];
  this.teeth=this.makeTeeth();this.setVRState=()=>{};this.installEvents();this.draw();
 }
 makeTeeth(){const arr=[];for(const upper of [true,false])for(const side of [-1,1])for(let n=1;n<=8;n++){
  const u=(n-1)/7, kind=n<=2?'incisor':n===3?'canine':n<=5?'premolar':'molar';
  const base=upper?.45:-.45, width=(kind==='molar'?.188:kind==='premolar'?.155:kind==='canine'?.135:.132)*(n===1?.94:1);
  const depth=kind==='molar'?.192:kind==='premolar'?.157:kind==='canine'?.139:.118;
  const x=side*(.10+.99*Math.pow(u,.85)),z=.72-1.35*Math.pow(u,1.55),id=upper?(side<0?'1':'2')+(n):((side<0?'4':'3')+(n));
  // The clinical FDI convention is from the patient's perspective.
  const tangent=Math.atan2(-side*1.24*(.2+u),.5+u);
  arr.push({id,x,z,base,upper,kind,width,depth,tangent,height:kind==='canine'?.235:kind==='incisor'?.215:.189});
 }return arr}
 project(p,w,h){const a=this.yaw,el=this.pitch;
  // Orbit camera: x right, y up, z toward the anterior teeth.
  const ca=Math.cos(a),sa=Math.sin(a),ce=Math.cos(el),se=Math.sin(el);
  const [x0,y0,z0]=p;const x=x0,y=y0-(this.mode==='clinic'?.15:0),z=z0+(this.mode==='clinic'?1.55:0);const xr=ca*x-sa*z,zr=sa*x+ca*z;
  const yr=ce*y-se*zr,depth=se*y+ce*zr;
  const angularFit=1-.33*Math.max(0,(Math.abs(el)-.5)/.85)-.14*Math.max(0,(Math.abs(a)-.85)/.75);const scale=Math.min(w*1.08,h*1.45)*1.65*Math.max(.61,angularFit)/(this.distance+1.5-depth*.19);
  return {x:w/2+xr*scale,y:h*.54-yr*scale,z:depth,s:scale};
 }
 poly(ctx,pts,fill,stroke=null,line=1){if(pts.length<3)return;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}}
 lighter(c,m){const a=c.match(/\w\w/g).map(x=>parseInt(x,16));return `rgb(${a.map(v=>Math.max(0,Math.min(255,Math.round(v*m)))).join(',')})`}
 makePrimitives(w,h){let pieces=[];this.markers=[];const P=p=>this.project(p,w,h);const push=(world,color,stroke=null,alpha=1,tag=null)=>{const pp=world.map(P);if(pp.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;const depth=pp.reduce((a,p)=>a+p.z,0)/pp.length;pieces.push({pp,color,stroke,alpha,depth,tag})};
  const path=(upper)=>this.teeth.filter(x=>x.upper===upper).sort((a,b)=>a.x-b.x);
  for(const upper of [true,false]){if(this.archMode!=='both'&&this.archMode!==(upper?'upper':'lower'))continue;
   const teeth=path(upper),base=upper?.45:-.45;
   // Two subtly layered gum ribbons follow the dental arch and remain open centrally.
   for(let i=0;i<teeth.length-1;i++){
    const a=teeth[i],b=teeth[i+1],dir=upper?-1:1;
    for(const [offset,width,color] of [[.015,.093,'#995d6b'],[-.027,.073,'#d0929b']]){
      push([[a.x,base+offset,a.z-width],[b.x,base+offset,b.z-width],[b.x,base+offset,b.z+width],[a.x,base+offset,a.z+width]],color,'#d6a0a5',1);
    }
   }
   for(const t of teeth){
    const sign=t.upper?-1:1,wid=t.width/2,dep=t.depth/2;
    const ang=Math.atan2(t.x,Math.abs(t.z)+.54)*.58;
    const ca=Math.cos(ang),sa=Math.sin(ang);
    const xyz=(dx,y,dz)=>[t.x+dx*ca+dz*sa,y,t.z-dx*sa+dz*ca];
    const vertex=(level,k)=>{
      const angle=k/12*Math.PI*2,co=Math.cos(angle),si=Math.sin(angle);
      const border=level===0?.79:level===1?1.0:.91;
      const gy=level===0?t.base:level===1?t.base+sign*t.height*.32:t.base+sign*t.height;
      const edge=t.kind==='incisor'?Math.sign(co)*Math.pow(Math.abs(co),.56):co;
      return xyz(edge*wid*border,gy,si*dep*border);
    };
    const topColor=t.kind==='incisor'?'#faf5e7':'#f4ebd5',sideColor='#ead9b9';
    // Tooth crown: 12 circumferential panels x 2 elevation rings.
    for(let lev=0;lev<2;lev++)for(let k=0;k<12;k++){
      const a=k/12*Math.PI*2,brightness=.84+.14*Math.cos(a-.4)+.05*(lev===1);
      push([vertex(lev,k),vertex(lev,(k+1)%12),vertex(lev+1,(k+1)%12),vertex(lev+1,k)],this.lighter(lev===0?'#e4d4bf':sideColor,brightness),'#ffffff15',1,'tooth:'+t.id);
    }
    const top=[];for(let k=0;k<12;k++)top.push(vertex(2,k));
    push(top,topColor,'#d4c5aa',1,'tooth:'+t.id);
    // Cusp ridges, central fossa and natural incisal edges drawn in projected space.
    if(t.kind==='molar'||t.kind==='premolar'){
      const c=xyz(0,t.base+sign*(t.height+.001),0),q=wid*.56;
      for(const [xx,zz] of [[-q,-dep*.48],[q,-dep*.48],[-q,dep*.46],[q,dep*.46]]){
       const cusp=xyz(xx,t.base+sign*(t.height+.015),zz);const mid=xyz(0,t.base+sign*(t.height-.006),0);
       push([cusp,xyz(xx*.62,t.base+sign*(t.height+.018),zz*.6),mid],t.kind==='molar'?'#fff7e7':'#fff3df',null,.95,'tooth:'+t.id);
      }
    }else if(t.kind==='canine'){
       const cusp=xyz(0,t.base+sign*(t.height+.036),0),l=xyz(-wid*.8,t.base+sign*t.height,0),r=xyz(wid*.8,t.base+sign*t.height,0);
       push([l,cusp,r],'#fff7e4',null,1,'tooth:'+t.id);
    }else{
       const A=xyz(-wid*.67,t.base+sign*(t.height+.009),0),B=xyz(wid*.67,t.base+sign*(t.height+.009),0);
       push([A,B,xyz(wid*.64,t.base+sign*(t.height+.011),dep*.14),xyz(-wid*.64,t.base+sign*(t.height+.011),dep*.14)],'#fff9ed',null,.96,'tooth:'+t.id);
    }
    const key='tooth:'+t.id,center=P(xyz(0,t.base+sign*t.height*.80,0));
    this.markers.push({key,x:center.x,y:center.y,r:Math.max(12,wid*center.s*1.2),z:center.z});
    if(this.selectedKey===key){const p=P(xyz(0,t.base+sign*(t.height+.07),0));this.markers[this.markers.length-1].selected={x:p.x,y:p.y}}
   }
  }
  pieces.sort((a,b)=>a.depth-b.depth);return pieces;
 }
 makeRoomPrimitives(w,h){
  const P=p=>this.project(p,w,h),pieces=[];
  const push=(pts,color,stroke='#ffffff10')=>{const pp=pts.map(P);pieces.push({pp,color,stroke,alpha:1,depth:pp.reduce((s,q)=>s+q.z,0)/pp.length})};
  const box=(x,y,z,ww,hh,dd,color)=>{
    const a=x-ww/2,b=x+ww/2,l=y-hh/2,u=y+hh/2,n=z-dd/2,f=z+dd/2;
    push([[a,l,n],[b,l,n],[b,u,n],[a,u,n]],this.lighter(color,.76));
    push([[a,l,f],[b,l,f],[b,u,f],[a,u,f]],color);
    push([[a,l,n],[a,l,f],[a,u,f],[a,u,n]],this.lighter(color,.70));
    push([[b,l,n],[b,l,f],[b,u,f],[b,u,n]],this.lighter(color,.84));
    push([[a,u,n],[b,u,n],[b,u,f],[a,u,f]],this.lighter(color,1.1));
  };
  const orb=(x,y,z,rx,ry,rz,color)=>{
    // Polarized ellipsoid made of silhouette panels.
    for(let row=0;row<8;row++)for(let i=0;i<12;i++){
      const p=(tt,aa)=>[x+rx*Math.sin(tt)*Math.cos(aa),y+ry*Math.cos(tt),z+rz*Math.sin(tt)*Math.sin(aa)];
      const t=row/8*Math.PI,T=(row+1)/8*Math.PI,a=i/12*Math.PI*2,A=(i+1)/12*Math.PI*2;
      push([p(t,a),p(t,A),p(T,A),p(T,a)],this.lighter(color,.78+.18*Math.cos(a)+.15*Math.cos(t)));
    }
  };
  // Room shell and cabinetry are kept diffuse and understated.
  box(0,-1.63,-1.9,7,.14,7,'#65818a');box(0,1.27,-5.48,7,5.8,.11,'#c0d4d4');
  box(-3.35,1.24,-1.9,.12,5.8,7,'#97b7b9');
  box(-2.45,-.42,-4.84,1.28,1.5,.47,'#d3e1de');box(-2.45,.36,-4.8,1.45,.11,.52,'#edf6ec');
  box(2.40,-.42,-4.75,1.29,1.4,.64,'#d0dedf');box(2.4,.34,-4.72,1.44,.12,.69,'#f2f6ec');
  box(1.85,1.5,-5.40,1.6,1.0,.13,'#f5f6eb');box(1.85,1.51,-5.27,1.42,.84,.04,'#1e6170');
  box(-.55,2.20,-5.37,1.68,.65,.11,'#c2e4dc');
  // Operating chair with articulated back and head rest.
  box(0,-1.02,-1.7,1.2,.21,2.20,'#2c5c69');box(0,-.89,-1.65,1.16,.19,2.08,'#369897');
  box(0,-.22,-2.50,1.12,1.33,.22,'#1d6271');box(0,-.19,-2.36,1.02,1.21,.18,'#42a9a1');
  box(0,.59,-2.73,.70,.45,.20,'#337f84');
  box(0,-1.42,-1.68,.21,.74,.21,'#c9d8d5');box(0,-1.53,-1.68,.84,.17,.86,'#8aaead');
  for(const x of [-.67,.67])box(x,-.77,-1.65,.15,.12,1.45,'#bfd9d2');
  // Patient mannequin, visually distinct from the teaching jaw.
  orb(0,.65,-2.74,.30,.38,.28,'#c6a28b');orb(0,.91,-2.81,.29,.13,.26,'#484951');
  orb(0,-.71,-1.68,.38,.24,.69,'#b5ccc8');
  // Assistant stool and dental instrument table.
  box(2.0,-1.27,-.70,.14,.62,.14,'#bdd8d3');orb(2.0,-.96,-.70,.37,.10,.35,'#2a8991');
  box(-1.90,-.82,-.95,1.1,.10,.65,'#e9f5ee');box(-1.90,-1.18,-.95,.12,.75,.12,'#b3c9cb');
  for(const x of [-2.27,-2,-1.74,-1.49])box(x,-.70,-.95,.11,.18,.06,'#a5c8d0');
  // Light and arm assembly.
  box(1.48,1.80,-2.55,.13,1.40,.13,'#bbd2d0');box(.70,2.42,-2.44,1.47,.10,.13,'#bdd5d1');
  box(.05,2.15,-2.21,.60,.17,.52,'#eaf4e8');box(.05,2.05,-2.17,.46,.06,.38,'#e9dcad');
  pieces.sort((a,b)=>a.depth-b.depth);return pieces;
 }
 draw(){if(!this.ctx)return;const c=this.canvas,bb=c.getBoundingClientRect();if(!bb.width||!bb.height)return;const dpr=Math.min(window.devicePixelRatio||1,2),w=bb.width,h=bb.height;
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const ctx=this.ctx;ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#203e4d');bg.addColorStop(.6,'#102e3e');bg.addColorStop(1,'#0c1f2c');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // The vignette and floor-grid establish depth without cluttering clinical anatomy.
  ctx.save();ctx.strokeStyle='#73aaa82b';ctx.lineWidth=.75;
  for(let i=-10;i<=10;i++){const x=w/2+i*w*.069;ctx.beginPath();ctx.moveTo(x,h*.71);ctx.lineTo(w/2+(x-w/2)*1.8,h);ctx.stroke()}
  for(let j=0;j<8;j++){const y=h*.73+j*j*h*.0045;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.restore();
  const pulse=ctx.createRadialGradient(w/2,h*.48,30,w/2,h*.5,Math.max(w,h)*.7);pulse.addColorStop(0,'#9cccc714');pulse.addColorStop(1,'#07192500');ctx.fillStyle=pulse;ctx.fillRect(0,0,w,h);
  // Cast shadow beneath the arches.
  ctx.fillStyle='#06162275';ctx.beginPath();ctx.ellipse(w*.5,h*.76,Math.min(w*.34,255),Math.min(h*.075,40),0,0,Math.PI*2);ctx.fill();
  const polys=this.mode==='clinic'?this.makeRoomPrimitives(w,h):this.makePrimitives(w,h);for(const poly of polys){ctx.globalAlpha=poly.alpha;this.poly(ctx,poly.pp,poly.color,poly.stroke,.55)}ctx.globalAlpha=1;
  if(this.mode!=='clinic')for(const mark of this.markers)if(mark.key==='tooth:'+this.caseTooth){ctx.beginPath();ctx.arc(mark.x,mark.y,mark.r+5,0,Math.PI*2);ctx.strokeStyle='#f5d18e';ctx.lineWidth=2.5;ctx.stroke();}
  if(this.mode!=='clinic')for(const mark of this.markers)if(this.selectedKey===mark.key){ctx.beginPath();ctx.arc(mark.x,mark.y,mark.r+7,0,Math.PI*2);ctx.strokeStyle='#7bf4cd';ctx.lineWidth=2.3;ctx.stroke();ctx.beginPath();ctx.arc(mark.x,mark.y,mark.r+13,0,Math.PI*2);ctx.strokeStyle='#7bf4cd63';ctx.lineWidth=1;ctx.stroke()}
  // The identity and active case are always visible, including when no 3D GPU is present.
  ctx.fillStyle='#a6d3d0';ctx.font='600 11px system-ui';ctx.textAlign='left';ctx.fillText(this.mode==='clinic'?'VIRTUELLE ZAHNARZTPRAXIS · ORIENTIERUNG':'INTERAKTIVES 3D-LEHRMODELL',18,h-61);
  ctx.font='10px system-ui';ctx.fillStyle='#82acb1';ctx.fillText(w<560?'Schematisch · nicht klinisch validiert':this.mode==='clinic'?'Training clinic · simplified spatial model':'Schematisch · keine gescannten Patientenzähne',18,h-43);
  ctx.textAlign='right';ctx.font='700 11px system-ui';ctx.fillStyle='#a8e5d8';if(w>560)ctx.fillText(this.mode==='clinic'?'PRAXIS-ANSICHT':this.archMode==='both'?'OBER- UND UNTERKIEFER':this.archMode==='upper'?'OBERKIEFER':'UNTERKIEFER',w-18,h-44);ctx.textAlign='left';
  this.frameCount++;
 }
 installEvents(){let down=null;this.canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};this.canvas.setPointerCapture(e.pointerId)});
  this.canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>3){this.yaw=down.yaw+dx*.008;this.pitch=Math.min(1.39,Math.max(-1.39,down.pitch+dy*.008));this.draw()}});
  this.canvas.addEventListener('pointerup',e=>{if(!down)return;const dist=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(dist<9){const rect=this.canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let hit=null,best=30;for(const p of this.markers){const d=Math.hypot(x-p.x,y-p.y);if(d<best){best=d;hit=p}}if(hit)this.onPick(hit.key)}down=null;this.draw()});
  this.canvas.addEventListener('pointercancel',()=>down=null);
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(1.65,Math.min(6.5,this.distance*Math.exp(e.deltaY*.001)));this.draw()},{passive:false});
  window.addEventListener('resize',()=>this.resize());
 }
 resize(){this.draw()}
 focusTeeth(){this.mode='teeth';this.distance=3.3;this.yaw=.22;this.pitch=.35;this.draw()}
 focusRoom(){this.mode='clinic';this.distance=7.4;this.yaw=.29;this.pitch=.22;this.draw()}
 occlusalView(){if(this.archMode==='both')this.archMode='lower';this.yaw=0;this.pitch=this.archMode==='upper'?-1.3:1.3;this.distance=3.1;this.draw()}
 cycleArches(){this.archMode=this.archMode==='both'?'upper':this.archMode==='upper'?'lower':'both';this.draw();return this.archMode}
 setArchMode(mode){this.archMode=mode;this.draw()}
 setCaseTooth(id){this.caseTooth=String(id);this.draw()}
 select(key){this.selectedKey=key;this.draw()}
 async enterVR(){throw Error('Immersive VR needs WebGL and a compatible headset. The interactive 3D desktop fallback is active.')}
}
