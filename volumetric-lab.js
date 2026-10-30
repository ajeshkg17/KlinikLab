'use strict';
/* KlinikLab Procedural Volume Lab v1.0. Original sampled implicit solid geometry.
   Voxel sampled/meshed with marching tetrahedra, with true 3D spherical subtraction.
   Anatomical surfaces are artistically approximated; NOT medical scans and NOT validated. */
(function(){
const $=id=>document.getElementById(id);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const SQ=x=>x*x;
const CASES={
  molar:{label:'16 · MOD / Komposit',name:'Große dreiflächige Kavität',procedure:'restoration',structure:'Vierhöckriger Molar',steps:['Indikation und Röntgen prüfen','Kofferdam / Isolation','Okklusalen Zugang eröffnen','Approximale Box ausformen','Marginalbereiche kontrollieren','Matrix und Adhäsivprotokoll','Schichttechnik / Okklusion'], tip:'Simuliertes Präparationsziel: zentraler Zugang und mesiale Box. Pulpanahe Bereiche schonen; selektive Kariesentfernung ist indikationsabhängig.'},
  endo:{label:'36 · Endodontie',name:'Trepanation und Kanaleingänge',procedure:'endo',structure:'Mehrwurzeliger Molar',steps:['Anamnese und Vitalitätsdiagnostik','Röntgen / Anatomie / Einwilligung','Kofferdam anlegen','Zugang entlang der Zahnachse','Kammerdach entfernen','Orifizien suchen / Arbeitslänge','Desinfektion und dichter Verschluss'],tip:'Zentraler Zugang zum Pulpakavum. Die simulierte Kammer dient der 3D-Orientierung, nicht der Darstellung individueller Wurzelkanalanatomie.'},
  anterior:{label:'11 · Frontzahn',name:'Approximale Kompositrestauration',procedure:'anterior',structure:'Schneidezahn',steps:['Trauma- und Pulpa-Status','Isolation und Zugang','Defekt begrenzt präparieren','Schmelzrand beurteilen','Adhäsiv / Schichtung','Kontur, Funktion, Nachkontrolle'],tip:'Kleiner approximaler Defekt, gesunde Zahnsubstanz schonen. Die Traumatologieentscheidung wird separat im Falltraining geübt.'},
  crown:{label:'26 · Prothetik',name:'Kronenpräparation',procedure:'crown',structure:'Vierhöckriger Molar',steps:['Indikation / Erhaltungswürdigkeit','Achse und Einschubrichtung','Okklusale Reduktion','Axiale Reduktion','Präparationsgrenze prüfen','Abformung / Scan','Provisorium und Okklusion'],tip:'Gleichmäßige Reduktion ohne Pulpaexposition. Die Darstellung ist nicht auf klinische Millimeterwerte kalibriert.'},
  surgery:{label:'48 · Oralchirurgie',name:'Anatomie und chirurgische Planung',procedure:'surgery',structure:'Mehrwurzeliger Molar',steps:['Befund / Risiko / Aufklärung','Bildgebung und Lagebeziehung','Instrumente bereitstellen','Zahnhartsubstanz darstellen','Kontrolliertes Vorgehen','Wundversorgung / Nachsorge'],tip:'Anatomie-Inspektion und konservative Volumenänderung. Keine Simulation einer echten Weisheitszahnextraktion.'},
  perio:{label:'46 · Parodontologie',name:'Wurzeloberfläche und Subgingivalraum',procedure:'perio',structure:'Mehrwurzeliger Molar',steps:['PSI / PA-Befund','Sondierung und Instrumentenwahl','Wurzeloberfläche erkennen','Atraumatische Instrumentenführung','Reevaluation'],tip:'3D Orientierung an Zahnkrone und Wurzel. Die Bürsteninteraktion ist keine Simulation des subgingivalen Scalings.'}
};
const mapping={molar:'molar',restoration:'molar',endo:'endo',anterior:'anterior',crown:'crown',surgery:'surgery',perio:'perio'};
const V3={add:(a,b)=>a.map((q,i)=>q+b[i]),sub:(a,b)=>a.map((q,i)=>q-b[i]),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>Math.hypot(...a)};
function smoothMin(a,b,k){const h=clamp(.5+.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h)}
class ToothSolid{
 constructor(caseKey,fdi=null){this.caseKey=caseKey;this.fdi=/^[1-4][1-8]$/.test(String(fdi))?String(fdi):null;this.mode=CASES[caseKey]?.procedure||'restoration';this.bur=[];this.crownDepth=1.13;this.rootLength=1.52}
 toothClass(){const n=Number(this.fdi?.[1]);return !n?null:n<=2?'incisor':n===3?'canine':n<=5?'premolar':'molar'}
 isUpper(){return this.fdi?Number(this.fdi[0])<=2:this.isUpperMolar()}
 isLeft(){return this.fdi?['2','3'].includes(this.fdi[0]):false}
 isAnterior(){return this.fdi?this.toothClass()==='incisor'||this.toothClass()==='canine':this.caseKey==='anterior'}
 isUpperMolar(){return this.fdi?this.toothClass()==='molar'&&this.isUpper():this.caseKey==='molar'||this.caseKey==='crown'}
 rootCenters(){return this.toothClass()==='premolar'?[[0,-.13],[0,.15]]:this.isAnterior()?[[0,0]]:this.isUpperMolar()?[[-.49,-.33],[.47,-.34],[.02,.41]]:[[-.41,-.10],[.41,-.10]]}
 profile(x,z){const cls=this.toothClass();const a=cls==='incisor'?.70:cls==='canine'?.78:cls==='premolar'?.84:this.isAnterior()?.76:1.00,b=cls==='incisor'?.42:cls==='canine'?.57:cls==='premolar'?.72:this.isAnterior()?.56:.86;return Math.pow(Math.pow(Math.abs(x)/a,4)+Math.pow(Math.abs(z)/b,4),.25)}
 height(x,z){const a=this.isAnterior()?0:.242;
   const cusp=(u,w)=>Math.exp(-SQ((x-u)/.32)-SQ((z-w)/.31));
   let h=1.016+a*(cusp(-.53,-.45)+.96*cusp(.53,-.45)+.90*cusp(-.53,.45)+.83*cusp(.53,.45));
   if(!this.isAnterior()){
     h-=.088*Math.exp(-SQ(x/.27)-SQ(z/.27)); // mesial/central fossa
     h-=.059*Math.exp(-SQ(x/.075)-SQ(z/.70)); // central fissure
     h-=.034*Math.exp(-SQ(x/.68)-SQ(z/.082)); // intersecting groove
   }
   if(this.isAnterior())h=this.toothClass()==='canine'?.89+.18*Math.exp(-SQ(x/.32)-SQ(z/.36)):.99+.024*Math.cos(x*3.0)-.022*SQ(z/.55);
   if(this.toothClass()==='premolar')h=1.02+.23*Math.exp(-SQ(x/.41)-SQ((z+.38)/.32))+.14*Math.exp(-SQ(x/.41)-SQ((z-.39)/.34));
   if(this.toothClass()==='molar'&&!this.isUpper())h+=.09*Math.exp(-SQ((x-.72)/.28)-SQ(z/.30));
   return h;
 }
 crown(x,y,z,inner=0){const r=this.profile(x,z);const vertical=clamp((y+.20)/1.44,0,1);const bulge=.79+.24*Math.sin(vertical*Math.PI*.88);const p=(r/bulge-1+inner);const top=y-this.height(x,z)+inner*.65;
   const base=-y-.20+inner*.20;let f=Math.max(p,top,base);const edge=.040;return f-edge;}
 roots(x,y,z,inner=0){const an=this.isAnterior(),roots=this.rootCenters();
   let result=10;for(const [cx,cz] of roots){const t=clamp(-y/1.53,0,1),rad=(an?.40:this.isUpperMolar()?.285:.37)*(1-t*.82)-inner*.45;
     const bend=(an?.065:.18)*t*t*(cx<0?-1:1);const dx=x-cx-bend, dz=z-cz-(an?.02:.12)*t;
     const tapered=rad*(1-.09*Math.sin(Math.PI*t));
     const root=Math.max(Math.hypot(dx,dz)-Math.max(.055,tapered),y-.08,-y-1.55);
     result=Math.min(result,root);
   }
   return result;
 }
 outer(x,y,z){return smoothMin(this.crown(x,y,z,0),this.roots(x,y,z,0),.12)}
 dentin(x,y,z){return smoothMin(this.crown(x,y,z,.15),this.roots(x,y,z,.12),.09)}
 pulp(x,y,z){const chamber=Math.hypot(x/(this.isAnterior()?.235:.36),z/(this.isAnterior()?.20:.32),(y-.11)/.42)-1;
   let rootCanal=10;const centers=this.rootCenters();
   for(const [cx,cz] of centers){const t=clamp(-y/1.35,0,1);const r=(this.isAnterior()?.11:.12)*(1-.68*t);
     rootCanal=Math.min(rootCanal,Math.max(Math.hypot(x-cx-(cx<0?-.08:.08)*t*t,z-cz)-r,y+.01,-y-1.36));}
   return smoothMin(chamber*.30,rootCanal,.07);
 }
 caries(x,y,z){if(this.mode==='crown'||this.mode==='surgery'||this.mode==='perio')return 10;
   if(this.mode==='endo')return 10;
   if(this.mode==='anterior')return Math.hypot((x+.63)/.21,(z-.08)/.23,(y-.82)/.29)-1;
   return Math.hypot((x-.60)/.32,(z+.03)/.32,(y-.86)/.34)-1;
 }
 cut(x,y,z){let d=10;for(const b of this.bur){const a=b.p;const q=Math.hypot(x-a[0],y-a[1],z-a[2])-b.r;if(q<d)d=q;}return d}
 field(x,y,z,section){let d=Math.max(this.outer(x,y,z),-this.cut(x,y,z));if(section)d=Math.max(d,z);return d}
 tissue(x,y,z){if(this.pulp(x,y,z)<0)return 'pulp';if(this.dentin(x,y,z)<0)return 'dentin';if(y<-.17)return 'cementum';if(this.caries(x,y,z)<0)return 'caries';return 'enamel';}
 target(x,y,z){if(this.outer(x,y,z)>0)return false;
  if(this.mode==='restoration'){const occl=Math.hypot(x/.41,z/.37)<1&&y>.50;const box=(x>.36&&x<.88&&Math.abs(z)<.38&&y>.37);return occl||box;}
  if(this.mode==='endo')return Math.hypot(x/.39,z/.34)<1&&y>.13&&y<1.23;
  if(this.mode==='anterior')return x<-.39&&z<.25&&z>-.23&&y>.50;
  if(this.mode==='crown')return y>-.05&&this.dentin(x,y,z)>.028;
  return false;
 }
 addCut(x,y,z,r){const b={p:[x,y,z],r};this.bur.push(b);return b}
}
window.KlinikLabVolumeModels={ToothSolid,CASES};
class VoxelMesher{
 static build(solid,section=false,res=26){const N=res,Ny=Math.round(res*1.42), pts=[],values=[];
  const min=[-1.39,-1.67,-1.22],max=[1.39,1.44,1.22];const dx=(max[0]-min[0])/N,dy=(max[1]-min[1])/Ny,dz=(max[2]-min[2])/N;
  const idx=(x,y,z)=>((x*(Ny+1)+y)*(N+1)+z);
  const positions=new Float32Array((N+1)*(Ny+1)*(N+1)*3),field=new Float32Array((N+1)*(Ny+1)*(N+1));
  for(let i=0;i<=N;i++)for(let j=0;j<=Ny;j++)for(let k=0;k<=N;k++){const p=idx(i,j,k),x=min[0]+i*dx,y=min[1]+j*dy,z=min[2]+k*dz;positions[3*p]=x;positions[3*p+1]=y;positions[3*p+2]=z;field[p]=solid.field(x,y,z,section)}
  const tess=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],faces=[];
  const cube=(i,j,k)=>[idx(i,j,k),idx(i+1,j,k),idx(i+1,j+1,k),idx(i,j+1,k),idx(i,j,k+1),idx(i+1,j,k+1),idx(i+1,j+1,k+1),idx(i,j+1,k+1)];
  const vertex=(a,b)=>{const t=clamp(field[a]/(field[a]-field[b]||1e-10),0,1);return [positions[3*a]+t*(positions[3*b]-positions[3*a]),positions[3*a+1]+t*(positions[3*b+1]-positions[3*a+1]),positions[3*a+2]+t*(positions[3*b+2]-positions[3*a+2])]};
  for(let i=0;i<N;i++)for(let j=0;j<Ny;j++)for(let k=0;k<N;k++){
   const c=cube(i,j,k),minv=Math.min(...c.map(a=>field[a])),maxv=Math.max(...c.map(a=>field[a]));if(minv>=0||maxv<=0)continue;
   for(const tet of tess){const q=tet.map(a=>c[a]),inside=q.filter(a=>field[a]<0),outside=q.filter(a=>field[a]>=0);
    if(!inside.length||inside.length===4)continue;
    if(inside.length===1||inside.length===3){const A=inside.length===1?inside[0]:outside[0],others=inside.length===1?outside:inside;
      const v=others.map(t=>vertex(A,t));faces.push(v);
    }else if(inside.length===2){const [a,b]=inside,[c,d]=outside;const p=vertex(a,c),q0=vertex(a,d),r=vertex(b,c),s=vertex(b,d);faces.push([p,q0,r],[q0,s,r]);}
   }
  }
  const materialFaces=faces.map(t=>{const p=[0,1,2].map(i=>t.reduce((s,q)=>s+q[i],0)/t.length);const material=solid.tissue(...p);return {p:t,material,center:p}});
  return {faces:materialFaces,res,size:[N,Ny,N],geometry:'marching-tetrahedra',count:faces.length};
 }
}
// Desktop GPU rasterization for the SAME editable marching-tetrahedra mesh.
// This avoids the painter's-algorithm transparency/overdraw seams on Canvas 2D.
// Uses only WebGL1 features so desktop Chrome and many WebXR-capable browsers work.
class VolumeMeshWebGL{
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:true,premultipliedAlpha:false})||canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false});
  if(!this.gl)throw Error('WebGL not available');
  const gl=this.gl;
  const compile=(type,code)=>{const sh=gl.createShader(type);gl.shaderSource(sh,code);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh};
  const vert=`attribute vec3 aPos,aNormal,aColor;uniform vec4 uOrbit;uniform vec3 uScale;varying vec3 vNormal,vColor,vView;void main(){float cy=uOrbit.x,sy=uOrbit.y,cp=uOrbit.z,sp=uOrbit.w;float xx=cy*aPos.x+sy*aPos.z,zz=-sy*aPos.x+cy*aPos.z;float yy=cp*aPos.y-sp*zz,depth=sp*aPos.y+cp*zz;gl_Position=vec4(xx*uScale.x,yy*uScale.y-.04,-depth*.18,1.);vec3 n=aNormal;float nx=cy*n.x+sy*n.z,nz=-sy*n.x+cy*n.z;vNormal=normalize(vec3(nx,cp*n.y-sp*nz,sp*n.y+cp*nz));vColor=aColor;vView=vec3(xx,yy,depth);}`;
  const frag=`precision mediump float;varying vec3 vNormal,vColor,vView;void main(){vec3 n=normalize(vNormal);vec3 key=normalize(vec3(-.47,.86,1.0));vec3 fill=normalize(vec3(.65,.32,-.60));float sun=max(0.,dot(n,key)),bounce=max(0.,dot(n,fill));float ambient=.51+.08*max(n.y,0.);float spec=pow(max(dot(reflect(-key,n),normalize(vec3(.2,1.0,3.0)-vView)),0.),28.)*.20;vec3 rgb=vColor*(ambient+.48*sun+.17*bounce)+vec3(1.,.98,.90)*spec;gl_FragColor=vec4(rgb,1.);}`;
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vert));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,frag));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
  this.attrs=['aPos','aNormal','aColor'].map(n=>gl.getAttribLocation(this.program,n));
  this.orbit=gl.getUniformLocation(this.program,'uOrbit');this.scale=gl.getUniformLocation(this.program,'uScale');
  this.buffer=gl.createBuffer();this.count=0;this.mesh=null;this.failed=false;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.failed=true;canvas.style.display='none'});
  canvas.addEventListener('webglcontextrestored',()=>{this.failed=true;canvas.style.display='none'});
 }
 update(mesh,solid){
  if(this.failed)return;
  const gl=this.gl,colors={enamel:[.955,.915,.826],dentin:[.876,.676,.392],pulp:[.75,.30,.37],cementum:[.64,.48,.38],caries:[.37,.23,.21]};
  const adjacent=new Map(),indices=[],faceNormals=[];
  const key=p=>`${p[0].toFixed(5)},${p[1].toFixed(5)},${p[2].toFixed(5)}`;
  for(const f of mesh.faces){
   const e=V3.sub(f.p[1],f.p[0]),d=V3.sub(f.p[2],f.p[0]);let n=V3.cross(e,d),length=V3.norm(n)||1;
   n=n.map(v=>v/length);
   // Tetrahedron triangles arrive with inconsistent winding: orient via SDF sign.
   const c=f.center,delta=.026;
   const ahead=solid.field(c[0]+n[0]*delta,c[1]+n[1]*delta,c[2]+n[2]*delta,solid.section||false);
   const behind=solid.field(c[0]-n[0]*delta,c[1]-n[1]*delta,c[2]-n[2]*delta,solid.section||false);
   if(ahead<behind)n=n.map(x=>-x);
   faceNormals.push(n);
   for(const vertex of f.p){const k=key(vertex),v=adjacent.get(k)||[0,0,0];adjacent.set(k,[v[0]+n[0]*length,v[1]+n[1]*length,v[2]+n[2]*length]);}
  }
  for(let i=0;i<mesh.faces.length;i++){
   const f=mesh.faces[i],material=colors[f.material]||colors.enamel;
   for(const point of f.p){let normal=adjacent.get(key(point))||faceNormals[i];const l=V3.norm(normal)||1;normal=normal.map(x=>x/l);indices.push(...point,...normal,...material);}
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(indices),gl.DYNAMIC_DRAW);this.count=indices.length/9;this.mesh=mesh;
 }
 render(mesh,solid,yaw,pitch,zoom,width,height,size){
  if(this.failed)return false;
  try{
   if(this.mesh!==mesh)this.update(mesh,solid);
   const gl=this.gl,c=this.canvas;if(c.width!==width||c.height!==height){c.width=width;c.height=height;}
   gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
   gl.useProgram(this.program);gl.uniform4f(this.orbit,Math.cos(yaw),Math.sin(yaw),Math.cos(pitch),Math.sin(pitch));
   gl.uniform3f(this.scale,2*size/width,2*size/height,1);
   gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
   for(let i=0;i<3;i++){gl.enableVertexAttribArray(this.attrs[i]);gl.vertexAttribPointer(this.attrs[i],3,gl.FLOAT,false,36,i*12)}
   gl.drawArrays(gl.TRIANGLES,0,this.count);return true;
  }catch(e){console.warn('KlinikLab WebGL volume fallback:',e);this.failed=true;this.canvas.style.display='none';return false}
 }
}
class ProceduralVolumeLab{
 constructor(host,app){this.host=host;this.app=app;this.caseKey='molar';this.fdiTooth=null;this.fdiRecords={};try{this.fdiRecords=JSON.parse(localStorage.getItem('kliniklab-fdi-treatment-v1')||'{}')||{}}catch{}this.solid=new ToothSolid('molar');this.mesh=null;this.section=false;this.yaw=-.42;this.pitch=.35;this.zoom=1.0;this.mode='orbit';this.depth=.93;this.burRadius=.125;this.strokes=0;this.distance=0;this.demoRunning=false;this.demoTick=0;this.history=[];this.physics={speed:.65,load:.45,tilt:0,trace:[],model:'normalized-surrogate-v1',calibrated:false};this.active=false;this.previewPoint=null;this.lastPointer=null;this.status='Bereit';this.init();this.reset();}
 init(){this.host.innerHTML=`<div class="vl-inner">
 <div class="vl-topline"><div><span class="vl-eyebrow">KP PRAKTISCH · 3D VOLUME ENGINE</span><h2 id="vl-title">16 · MOD / Komposit</h2><div class="vl-sub" id="vl-sub">Originales 3D-Zahnmodell · modellhafte Anatomie</div></div><div class="vl-top-actions"><button id="vl-back" class="vl-chip">← Klinik</button><button id="vl-section" class="vl-chip" title="Open an anatomical cross section">◒ Schnittbild</button><button id="vl-reset" class="vl-chip" title="Restore the uncut tooth">↺ Neustart</button></div></div>
 <div class="vl-viewport"><canvas id="vl-canvas" width="900" height="640" aria-label="Rotatable three-dimensional tooth with editable enamel dentin and pulp layers" tabindex="0"></canvas><canvas id="vl-gpu" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none"></canvas><div class="vl-legend"><span><i style="background:#f2e9d5"></i> Schmelz</span><span><i style="background:#e0b572"></i> Dentin</span><span><i style="background:#b64a58"></i> Pulpa</span><span><i style="background:#a17b63"></i> Wurzel</span></div><div id="vl-pointer" class="vl-bur-indicator" aria-hidden="true"></div><div id="vl-slice-frame" class="vl-slice-frame" hidden><span>ORIGINALER SCHNITT · z = 0</span><canvas id="vl-slice" width="180" height="220" aria-label="Computed layer-by-layer longitudinal tooth section"></canvas></div><div id="vl-render-message" class="vl-render-message">3D-VOLUMEN · Drehen zum Inspizieren</div></div>
 <div class="vl-bottom"><div class="vl-toolbar"><button id="vl-orbit" class="vl-chip is-on">⟳ 3D drehen</button><button id="vl-drill" class="vl-chip">◉ Präparieren</button><button id="vl-top" class="vl-chip">↑ Okklusal</button><button id="vl-demo" class="vl-chip demo">▶ Demonstration</button><button id="vl-undo" class="vl-chip">↶ Undo</button><button id="vl-report" class="vl-chip">↓ Bericht</button><button id="vl-ai-review" class="vl-chip">✦ KI-Feedback</button></div>
 <div class="vl-sliders"><label>Arbeitstiefe <b id="vl-depth-label">0.93</b><input id="vl-depth" type="range" min="-0.10" max="1.21" step="0.025" value="0.93" aria-label="Cutting plane depth, in normalized model units"/></label><label>Bohrer-Radius <b id="vl-radius-label">0.125</b><input id="vl-radius" type="range" min="0.055" max="0.215" step="0.01" value="0.125" aria-label="Spherical simulated cutting tool radius in model units"/></label></div>
 <div class="vl-metrics"><div><b id="vl-coverage">0%</b><span>Zielvolumen entfernt</span></div><div><b id="vl-precision">—</b><span>Präzision</span></div><div><b id="vl-offcut">0%</b><span>Außerhalb des Ziels</span></div><div><b id="vl-pulp">Nein</b><span>Simulierte Pulpaeröffnung</span></div></div>
 <div class="vl-stepper"><span class="vl-eyebrow">THERAPIEABLAUF</span><div id="vl-steps"></div><div class="vl-tip" id="vl-tip"></div><p class="vl-clinical">Modellbasierte Lernmessung, nicht klinisch kalibriert oder zahnärztlich begutachtet. Die Präparationsbewegung wird nur bei <b>Okklusal</b> plus <b>Präparieren</b> erfasst. Keine Kraft-, Drehzahl-, Angulations- oder Kollisionsmessung. Für die KP-Vorbereitung ergänzend am Phantom üben.</p></div></div></div>`;
  this.canvas=$('vl-canvas');this.ctx=this.canvas.getContext('2d',{alpha:false});this.sliceCanvas=$('vl-slice');
  this.gpu=null;try{this.gpu=new VolumeMeshWebGL($('vl-gpu'))}catch(e){$('vl-gpu').style.display='none'}
  $('vl-back').onclick=()=>this.app.setView('3d');$('vl-orbit').onclick=()=>this.setMode('orbit');$('vl-drill').onclick=()=>this.setMode('drill');$('vl-top').onclick=()=>this.topView();$('vl-section').onclick=()=>this.toggleSection();$('vl-reset').onclick=()=>this.reset();$('vl-demo').onclick=()=>this.demo();$('vl-undo').onclick=()=>this.undo();$('vl-report').onclick=()=>this.exportReport();$('vl-ai-review').onclick=()=>{this.app?.setView('volume');$('ai-open')?.click();document.querySelector('[data-ai-tab="procedure"]')?.click();};
  $('vl-depth').oninput=e=>{this.depth=+e.target.value;$('vl-depth-label').textContent=this.depth.toFixed(2);this.render()};$('vl-radius').oninput=e=>{this.burRadius=+e.target.value;$('vl-radius-label').textContent=this.burRadius.toFixed(3);this.render()};
  let pointer=null,last=null;this.canvas.addEventListener('pointerdown',e=>{if(this.demoRunning)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};this.canvas.setPointerCapture(e.pointerId);if(this.mode==='drill'){this.applyPointer(e,true);last=this.mapPointer(e)}});
  this.canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;if(this.mode==='orbit'){this.yaw=pointer.yaw+(e.clientX-pointer.x)*.008;this.pitch=clamp(pointer.pitch+(e.clientY-pointer.y)*.006,-1.28,1.28);this.render()}else{this.applyPointer(e,false,last);last=this.mapPointer(e)}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(type,()=>{const finished=!!pointer;pointer=null;last=null;if(finished&&this.mode==='drill'&&this.solid.bur.length&&!this.demoRunning)this.rebuild(true)});
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*Math.exp(-e.deltaY*.001),.55,2.4);this.render()},{passive:false});
  this.canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){this.yaw+=(e.key==='ArrowLeft'?-1:1)*.12;this.render()}if(e.key==='ArrowUp'||e.key==='ArrowDown'){this.pitch=clamp(this.pitch+(e.key==='ArrowUp'?-1:1)*.12,-1.28,1.28);this.render()}});
  new ResizeObserver(()=>{if(this.active)this.render()}).observe(this.host);
 }
 // Each FDI tooth has an independent durable normalized teaching record.
 // No patient data are stored here. Malformed/blocked storage is ignored.
 persistTooth(){
  if(!this.fdiTooth||!this.solid)return;
  this.fdiRecords[this.fdiTooth]={bur:this.solid.bur.map(b=>({p:b.p.slice(),r:b.r})),strokes:this.strokes,distance:this.distance};
  try{localStorage.setItem('kliniklab-fdi-treatment-v1',JSON.stringify(this.fdiRecords))}catch{}
 }
 setTooth(fdi){
  if(!/^[1-4][1-8]$/.test(String(fdi)))return false;
  fdi=String(fdi);if(this.fdiTooth===fdi)return true;
  this.persistTooth();
  this.fdiTooth=fdi;
  this.solid=new ToothSolid(this.caseKey,fdi);
  const saved=this.fdiRecords[fdi];
  if(saved){this.solid.bur=(saved.bur||[]).filter(b=>Array.isArray(b.p)&&b.p.length===3&&b.p.every(Number.isFinite)&&Number.isFinite(b.r)&&b.r>0).slice(0,260).map(b=>({p:b.p.slice(),r:b.r}));this.strokes=saved.strokes||0;this.distance=saved.distance||0}
  else{this.strokes=0;this.distance=0}
  this.rebuild();return true;
 }
 setCase(key){key=mapping[key]||'molar';if(key===this.caseKey)return;this.persistTooth();this.caseKey=key;this.solid=new ToothSolid(key,this.fdiTooth);this.reset();}
 setMode(mode){if(mode==='drill'){this.topView(true);}this.mode=mode;$('vl-orbit').classList.toggle('is-on',mode==='orbit');$('vl-drill').classList.toggle('is-on',mode==='drill');this.status=mode==='drill'?'Zeiger ziehen → sphärischen Fräser am gewählten Niveau führen':'Mit Maus/Touch drehen · Scrollen zum Zoomen';this.render()}
 topView(quiet=false){this.yaw=0;this.pitch=1.52;this.render();if(!quiet)this.status='Okklusale Ansicht · Präparieren für Materialabtrag wählen'}
 toggleSection(){this.section=!this.section;$('vl-section').classList.toggle('is-on',this.section);$('vl-slice-frame').hidden=!this.section;if(this.section){this.yaw=0;this.pitch=.08;}else{this.yaw=-.48;this.pitch=.32;}this.rebuild();}
 activate(){this.active=true;this.render()}
 reset(){this.solid.bur=[];this.strokes=0;this.distance=0;this.history=[];if(this.physics)this.physics.trace=[];this.section=false;this.demoRunning=false;this.previewPoint=null;this.mode='orbit';this.yaw=-.48;this.pitch=.32;this.zoom=1;this.depth=.93;this.burRadius=.125;this.status='Originales 3D-Modell · Schmelz, Dentin, Pulpa und Wurzel';$('vl-depth').value=this.depth;$('vl-radius').value=this.burRadius;$('vl-depth-label').textContent=this.depth.toFixed(2);$('vl-radius-label').textContent=this.burRadius.toFixed(3);$('vl-orbit').classList.add('is-on');$('vl-drill').classList.remove('is-on');$('vl-section').classList.remove('is-on');$('vl-slice-frame').hidden=true;this.rebuild();}
 exportReport(){const metrics=this.measures();const data={project:'KlinikLab – volumetric procedure lab',case:this.caseKey,procedure:CASES[this.caseKey].name,createdAt:new Date().toISOString(),geometry:{method:'sampled implicit solid; marching tetrahedra',meshTriangles:this.mesh?.count||0,units:'normalized, not calibrated',clinicallyReviewed:false},metrics,virtualBurPhysics:{parameters:{speed:this.physics.speed,load:this.physics.load,tilt:this.physics.tilt},trace:this.physics.trace,units:'arbitrary/uncalibrated',measurementsFromRealHardware:false},burPath:this.solid.bur.map(v=>({x:+v.p[0].toFixed(3),y:+v.p[1].toFixed(3),z:+v.p[2].toFixed(3),radius:+v.r.toFixed(3)})),limitations:['Does not measure forces, RPM, bur angulation, haptics, anatomy-specific clinical depth or infection control','Model has not been validated by a licensed dentist','For endodontics, modeled pulp chamber access is expected, not automatically a complication']};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`KlinikLab_${this.caseKey}_3D_training_report.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);this.status='Trainingsbericht exportiert';}
 undo(){if(this.solid.bur.length){this.solid.bur.pop();this.physics.trace.pop();this.strokes=Math.max(0,this.strokes-1);this.rebuild();}}
 rebuild(fullDetail=false){this.persistTooth();this.revision=(this.revision||0)+1;
  const moving=this.mode==='drill'&&this.solid.bur.length>0&&!fullDetail;
  this.mesh=VoxelMesher.build(this.solid,this.section,moving?27:35);
  if(this.gpu){this.solid.section=this.section;this.gpu.update(this.mesh,this.solid);}this.updateMetrics();if(this.section)this.drawSectionSlice();if(this.active)this.render()}
 mapPointer(e){const rect=this.canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,z=(e.clientY-rect.top)/rect.height;const w=Math.min(rect.width/2.05,rect.height/3.3)*this.zoom;return {x:(x-.5)*rect.width/w, z:(z-.50)*rect.height/w};}
 applyPointer(e,first,last){const p=this.mapPointer(e);if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>1.17||Math.abs(p.z)>1.06)return;
  const steps=last?Math.min(8,Math.max(1,Math.ceil(Math.hypot(p.x-last.x,p.z-last.z)/.11))):1;
  const before=this.solid.bur.length;for(let i=0;i<steps;i++){const t=steps===1?1:(i+1)/steps;const x=last?last.x+(p.x-last.x)*t:p.x,z=last?last.z+(p.z-last.z)*t:p.z;
   if(this.solid.outer(x,this.depth,z)>.15)continue;
   const tiss=this.solid.tissue(x,this.depth,z),resist={enamel:1,dentin:.55,caries:.20,pulp:.08,cementum:.67}[tiss]??.75;
   const ph=this.physics,virtualForce=ph.load*resist*(1+ph.tilt/85)/(0.25+ph.speed*1.2);
   const effectiveRadius=this.burRadius*clamp(.45+ph.speed*ph.load/(.3+resist*.7),.35,1.20);
   this.solid.addCut(x,this.depth,z,effectiveRadius);ph.trace.push({tissue:tiss,speed:ph.speed,load:ph.load,tilt:ph.tilt,resistance:+virtualForce.toFixed(4),effectiveRadius:+effectiveRadius.toFixed(4),position:[x,this.depth,z]});
   this.previewPoint=[x,this.depth,z];
  }if(this.solid.bur.length>before){if(first)this.strokes++;this.distance+=last?Math.hypot(p.x-last.x,p.z-last.z):0;
   if(this.solid.bur.length>260){const removed=this.solid.bur.length-260;this.solid.bur.splice(0,removed);this.physics.trace.splice(0,removed)}this.rebuild();}
 }
 calcMetrics(){const N=32,Ny=24,sz=32;let target=0,covered=0,removed=0,off=0,pulp=0;const stepX=2.55/(N-1),stepY=1.5/(Ny-1),stepZ=2.25/(sz-1);
  for(let ix=0;ix<N;ix++)for(let iy=0;iy<Ny;iy++)for(let iz=0;iz<sz;iz++){
    const x=-1.275+stepX*ix,y=-.2+stepY*iy,z=-1.125+stepZ*iz;if(this.solid.outer(x,y,z)>0)continue;
    const yes=this.solid.target(x,y,z),was=this.solid.cut(x,y,z)<0;
    if(yes)target++;if(was){removed++;if(yes)covered++;else off++;if(this.solid.pulp(x,y,z)<=0)pulp++;}
   }
   return {coveragePct:Math.round(covered*100/Math.max(1,target)),precisionPct:removed?Math.round(covered*100/removed):0,offTargetPct:removed?Math.round(off*100/removed):0,pulpExposure:pulp>0,pulpCells:pulp,targetCells:target,removedCells:removed,overcutCells:off,strokeCount:this.strokes,pathLengthPx:0,cutSpheres:this.solid.bur.length,pathLengthModelUnits:+this.distance.toFixed(2),virtualForceProxyIndex:this.physics.trace.length?+(this.physics.trace.reduce((sum,p)=>sum+p.resistance,0)/this.physics.trace.length).toFixed(3):null,virtualForceUnits:'arbitrary, not newtons',parameterSource:'manually selected, not instrument measured',engine:'3d-implicit-volume-sampled',modelUnits:'normalized/not clinically calibrated',clinicalValidation:'pending',procedure:this.solid.mode};
 }
 measures(){return this.calcMetrics()}
 updateMetrics(){const m=this.calcMetrics();if(!$('vl-coverage'))return;$('vl-coverage').textContent=m.targetCells?m.coveragePct+'%':'—';$('vl-precision').textContent=m.cutSpheres&&m.targetCells?m.precisionPct+'%':'—';$('vl-offcut').textContent=m.targetCells?m.offTargetPct+'%':'—';const endo=this.solid.mode==='endo';$('vl-pulp').textContent=m.pulpExposure?(endo?'JA · Zugang':'JA · Warnung'):'Nein';$('vl-pulp').style.color=m.pulpExposure?(endo?'#8ce0c6':'#ed7d83'):'#8ce0c6';$('vl-title').textContent=CASES[this.caseKey].label;$('vl-sub').textContent=CASES[this.caseKey].structure+' · '+CASES[this.caseKey].name;$('vl-tip').textContent=CASES[this.caseKey].tip;
   $('vl-steps').innerHTML=CASES[this.caseKey].steps.map((v,i)=>`<span class="vl-step ${i===this.demoTick?'is-on':''}"><b>${i+1}</b> ${v}</span>`).join('');
   const pm=$('proc-metrics');if(pm)pm.textContent=`3D Ziel ${m.coveragePct}% · Außerhalb ${m.offTargetPct}%`;
 }
 async demo(){if(this.demoRunning)return;this.reset();this.demoRunning=true;this.section=false;this.topView();this.mode='orbit';this.status='DEMONSTRATION · schematische Eingriffsfolge';$('vl-demo').textContent='▶ Wird gezeigt …';
   const mode=this.solid.mode,sequence=[];
   if(mode==='restoration'){for(let j=0;j<5;j++)for(let k=0;k<5;k++)sequence.push([-.36+j*.18,.96-j%2*.05,-.30+k*.15,.12]);for(let j=0;j<4;j++)for(let k=0;k<4;k++)sequence.push([.40+j*.12,.75,-.22+k*.15,.11]);}
   else if(mode==='endo'){for(let j=0;j<5;j++)for(let k=0;k<5;k++)sequence.push([-.28+j*.14,1.02,-.28+k*.14,.13]);for(let j=0;j<4;j++)for(let k=0;k<4;k++)sequence.push([-.22+j*.14,.61,-.21+k*.14,.14]);}
   else if(mode==='anterior'){for(let j=0;j<5;j++)for(let k=0;k<3;k++)sequence.push([-.64+j*.10,.86,-.15+k*.15,.10]);}
   else if(mode==='crown'){for(let j=0;j<16;j++){const a=2*Math.PI*j/16;for(let y of [.95,.73,.49])sequence.push([Math.cos(a)*.92,y,Math.sin(a)*.80,.12]);}}
   else{this.status='ANATOMIEDEMONSTRATION · Kein simulierter Eingriff';for(let i=0;i<20;i++){if(!this.demoRunning)break;this.yaw=-.45+i*.12;this.demoTick=Math.min(CASES[this.caseKey].steps.length-1,Math.floor(i/20*CASES[this.caseKey].steps.length));this.updateMetrics();this.render();await new Promise(r=>setTimeout(r,100));}this.demoRunning=false;$('vl-demo').textContent='▶ Demonstration';return;}
   this.demoTick=0;
   for(let i=0;i<sequence.length;i++){
     if(!this.demoRunning)break;const [x,y,z,r]=sequence[i];this.solid.addCut(x,y,z,r);
     this.previewPoint=[x,y,z];if(i%3===0||i===sequence.length-1){this.demoTick=Math.min(CASES[this.caseKey].steps.length-1,Math.floor(i/sequence.length*CASES[this.caseKey].steps.length));this.rebuild();this.render()}
     await new Promise(res=>setTimeout(res,mode==='crown'?68:95));
   }
   this.demoRunning=false;this.previewPoint=null;this.status='DEMONSTRATION BEENDET · Neustart und eigene Präparation durchführen';$('vl-demo').textContent='▶ Demonstration';this.render();
 }

 drawSectionSlice(){const c=this.sliceCanvas,g=c.getContext('2d');const w=c.width,h=c.height,im=g.createImageData(w,h),rgba=im.data;
  const tissue={enamel:[250,241,218],dentin:[227,169,97],pulp:[196,65,91],cementum:[168,140,123],caries:[86,62,63]};
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=(i/w-.5)*2.8,y=1.45-j/h*3.25,k=(j*w+i)*4;
    let a=[20,45,57];if(this.solid.outer(x,y,0)<0){a=tissue[this.solid.tissue(x,y,0)];if(this.solid.cut(x,y,0)<0)a=[26,51,62];}
    rgba[k]=a[0];rgba[k+1]=a[1];rgba[k+2]=a[2];rgba[k+3]=255;
  }
  g.putImageData(im,0,0);g.strokeStyle='#c4e9dd';g.lineWidth=1.5;g.strokeRect(.5,.5,w-1,h-1);
  g.font='10px system-ui';g.fillStyle='#eef7ed';g.fillText('Schmelz / Dentin / Pulpa',8,14);
 }
 transform(p){const [x,y,z]=p;const ca=Math.cos(this.yaw),sa=Math.sin(this.yaw),ce=Math.cos(this.pitch),se=Math.sin(this.pitch);const xx=ca*x+sa*z,zz=-sa*x+ca*z;return [xx,ce*y-se*zz,se*y+ce*zz]}
 render(){if(!this.active||!this.mesh)return;const c=this.canvas,ctx=this.ctx,rect=c.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,1.3),W=Math.max(100,Math.round(rect.width*dpr)),H=Math.max(100,Math.round(rect.height*dpr));if(c.width!==W||c.height!==H){c.width=W;c.height=H}
  const grad=ctx.createRadialGradient(W*.48,H*.36,15,W*.5,H*.5,Math.max(W,H)*.75);grad.addColorStop(0,'#294b58');grad.addColorStop(.72,'#102c39');grad.addColorStop(1,'#071924');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  const size=Math.min(W/3.65,H/3.8)*this.zoom, cx=W*.50,cy=H*.52;
  ctx.save();ctx.strokeStyle='#5877871e';ctx.lineWidth=1;for(let x=0;x<W;x+=Math.max(23,W/22)){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=Math.max(23,H/20)){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.restore();
  if(this.gpu?.render(this.mesh,this.solid,this.yaw,this.pitch,this.zoom,W,H,size)){
    const label=$('vl-render-message');
    label.textContent=(this.mode==='drill'?'● MATERIALABTRAG · Tiefe '+this.depth.toFixed(2):this.section?'◒ GPU-SCHNITT · Materialschichten sichtbar':'◉ GPU 3D-ZAHN · '+this.mesh.count+' Dreiecke');
    return;
  }
  const color={enamel:[244,235,213],dentin:[221,170,98],pulp:[180,69,90],cementum:[152,129,110],caries:[100,72,66]};
  const draw=[];for(const f of this.mesh.faces){const p=f.p.map(q=>this.transform(q));const center=p.reduce((s,q)=>s+q[2],0)/3;
    const v0=p[0],v1=p[1],v2=p[2],u=V3.sub(v1,v0),v=V3.sub(v2,v0),n=V3.cross(u,v);const length=V3.norm(n)||1;
    // Cull faces only when safe: face orientation may flip at tetra edges.
    const light=clamp(.76+(Math.max(-1.3,Math.min(1.3,p[0][0]))*-.035)+p[0][1]*.075+(p[0][2]+.7)*.065,.56,1.01);
    const base=color[f.material]||color.enamel,shade=base.map(q=>clamp(Math.round(q*light),0,255));
    draw.push({p:p.map(q=>[cx+size*q[0],cy-size*q[1]]),depth:center,fill:`rgb(${shade.join(',')})`,stroke:`rgba(45,54,62,.10)`});
  }
  
  draw.sort((a,b)=>a.depth-b.depth);
  for(const f of draw){ctx.beginPath();ctx.moveTo(f.p[0][0],f.p[0][1]);ctx.lineTo(f.p[1][0],f.p[1][1]);ctx.lineTo(f.p[2][0],f.p[2][1]);ctx.closePath();ctx.fillStyle=f.fill;ctx.fill();ctx.strokeStyle=f.fill;ctx.lineWidth=.65;ctx.stroke();}
  if(this.previewPoint){const a=this.transform(this.previewPoint),bx=cx+size*a[0],by=cy-size*a[1];
   ctx.save();ctx.strokeStyle='#0719249a';ctx.lineWidth=16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx+67,by-104);ctx.lineTo(bx+7,by-13);ctx.stroke();
   ctx.strokeStyle='#c8e3e6';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(bx+60,by-99);ctx.lineTo(bx+7,by-13);ctx.stroke();
   ctx.strokeStyle='#7ba0a8';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(bx+15,by-25);ctx.lineTo(bx,by);ctx.stroke();
   ctx.fillStyle='#64f0d2';ctx.beginPath();ctx.arc(bx,by,Math.max(4,size*this.burRadius),0,2*Math.PI);ctx.globalAlpha=.65;ctx.fill();ctx.restore();}
  const tag=$('vl-render-message');tag.textContent=(this.mode==='drill'?'● MATERIALABTRAG · Tiefe '+this.depth.toFixed(2):this.section?'◒ 3D-SCHNITT · Materialschichten sichtbar':'◉ ORIGINAL 3D-GEOMETRIE · '+this.mesh.count+' Dreiecke');
 }
}
window.KlinikVolumeLab=ProceduralVolumeLab;
window.KlinikVoxelMesher=VoxelMesher;
window.KlinikToothSolid=ToothSolid;
window.addEventListener('DOMContentLoaded',()=>{if(!window.kliniklab||!$('volume-root'))return;const app=window.kliniklab;app.volLab=new ProceduralVolumeLab($('volume-root'),app);app.volLab.setCase(app.caseData.archetype||app.caseData.id);});
})();