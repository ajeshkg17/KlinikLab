'use strict';
/* KlinikLab — optional, fully procedural Babylon desktop crown models.
   Original educational illustrations, NOT scan-derived dental anatomy.
   Kept separate from the original WebGL/WebXR renderer and the cutting engine. */
(function(root){
  const TAU=Math.PI*2, PI=Math.PI;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const smooth=(x)=>x*x*(3-2*x);
  const gauss=(x,z,cx,cz,sx,sz)=>Math.exp(-((x-cx)**2/(sx*sx)+(z-cz)**2/(sz*sz)));
  const sizes={1:0.164,2:0.186,3:0.169,4:0.160};
  function crownData(style,upper,quality=1){
    style=Number(style);if(!sizes[style])throw Error('Unsupported crown type');
    const seg=quality<1?32:72, heightRings=quality<1?10:24,radialRings=quality<1?9:20;
    const d=upper?-1:1,height=sizes[style],pos=[],indices=[];
    const s=(a,p)=>{const c=Math.cos(a),t=Math.sin(a),e=2/p;return [Math.sign(c)*Math.abs(c)**e,Math.sign(t)*Math.abs(t)**e]};
    const shape=style===1?4.2:style===2?2.6:style===3?3.3:3.8;
    const depth=style===1?.80:style===2?.89:style===3?.94:1;
    function outline(theta,r=1){const [x,z]=s(theta,shape);return [r*x,r*z*depth]}
    function relief(x,z,r){
      const edge=1-smooth(clamp((r-.69)/.31,0,1));
      if(style===1){ // Incisal enamel ridge and slight scalloping, not a hollow cap.
        const ridge=.0046*Math.exp(-(((z+.035)/.17)**2));
        const scallop=.0012*(Math.cos(x*PI*2.2)+1);
        return ridge-scallop-.006*(1-r*r);
      }
      if(style===2){ // Single rounded canine cusp.
        return .0105*gauss(x,z,0,-.11,.38,.38)-.0045*(1-r*r);
      }
      if(style===3){ // Two cusps separated by a narrow central groove.
        const cusp=.014*gauss(x,z,-.06,-.44,.42,.33)+.011*gauss(x,z,.06,.43,.44,.34);
        const fissure=-.006*Math.exp(-((z/.095)**2))*Math.exp(-((x/.64)**2));
        return cusp+fissure-.0017*(1-r*r);
      }
      // Four rounded cusp ridges and a Y-like fissure network.
      let cusp=0;
      for(const [cx,cz,amp] of [[-.49,-.47,.016],[.47,-.47,.015],[-.46,.47,.0135],[.45,.44,.0155]])
        cusp+=amp*gauss(x,z,cx,cz,.34,.31);
      const fossa=-.0065*gauss(x,z,0,0,.38,.35);
      const groove=-.0025*Math.exp(-((x/.095)**2))*Math.exp(-((z/.65)**2))
                  -.002*Math.exp(-((z/.09)**2))*Math.exp(-((x/.66)**2));
      return cusp+fossa+groove+.0025*edge;
    }
    const vertex=(x,y,z)=>{pos.push(x,y,z);return pos.length/3-1};
    const side=[];
    for(let k=0;k<=heightRings;k++){
      const t=k/heightRings;
      // Cervical narrowing, convex middle and rounded approach to occlusal surface.
      const width=.755+.265*Math.sin(PI*(.10+.74*t))-.095*smooth(clamp((t-.81)/.19,0,1));
      const ring=[];
      for(let j=0;j<seg;j++){
        const a=TAU*j/seg,[xx,zz]=outline(a,width);
        const proximal=style===1?.027*Math.cos(2*a):.012*Math.cos(2*a);
        const perikymata=.0011*Math.sin(t*TAU*4.1)*Math.sin(PI*t);
        const lean=(style===2?.032:style===1?.008:0)*t*t;
        ring.push(vertex(xx*(1+proximal)+lean,d*(height*t+perikymata),zz));
      }
      side.push(ring);
    }
    for(let k=0;k<heightRings;k++)for(let j=0;j<seg;j++){
      const n=(j+1)%seg,a=side[k][j],b=side[k][n],c=side[k+1][n],e=side[k+1][j];
      if(upper)indices.push(a,b,c,a,c,e);else indices.push(a,c,b,a,e,c);
    }
    // The occlusal surface joins the axial wall at its outer edge; no open/hollow tip.
    // Add concentric rings from the centre out and merge the final ring into the wall.
    const cap=[];
    const topWidth=.755+.265*Math.sin(PI*(.10+.74))-.095;
    const occlusalY=(x,z,r)=>d*(height+relief(x,z,r)*smooth(clamp((1-r)/.17,0,1)));
    const center=vertex(0,occlusalY(0,0,0),0);
    for(let k=1;k<radialRings;k++){
      const r=k/radialRings,ring=[];
      for(let j=0;j<seg;j++){
        const [x,z]=outline(TAU*j/seg,topWidth*r);
        const theta=TAU*j/seg;
        const proximal=style===1?.027*Math.cos(2*theta):.012*Math.cos(2*theta);
        const lean=(style===2?.032:style===1?.008:0)*r*r;
        ring.push(vertex(x*(1+proximal)+lean,occlusalY(x,z,r),z));
      }
      cap.push(ring);
    }
    // Avoid cracks: side top ring shares indices with the outer cap ring.
    const rings=[null,...cap,side[heightRings]];
    for(let k=1;k<=radialRings;k++){
      const outer=rings[k],inner=k===1?null:rings[k-1];
      for(let j=0;j<seg;j++){
        const n=(j+1)%seg,a=inner?inner[j]:center,b=outer[j],c=outer[n],e=inner?inner[n]:center;
        if(upper){indices.push(a,b,c);if(inner)indices.push(a,c,e)}
        else {indices.push(a,c,b);if(inner)indices.push(a,e,c)}
      }
    }
    const normals=new Array(pos.length).fill(0);
    for(let k=0;k<indices.length;k+=3){
      const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
      const ab=[pos[b]-pos[a],pos[b+1]-pos[a+1],pos[b+2]-pos[a+2]];
      const ac=[pos[c]-pos[a],pos[c+1]-pos[a+1],pos[c+2]-pos[a+2]];
      const nx=ab[1]*ac[2]-ab[2]*ac[1],ny=ab[2]*ac[0]-ab[0]*ac[2],nz=ab[0]*ac[1]-ab[1]*ac[0];
      for(const i of [a,b,c]){normals[i]+=nx;normals[i+1]+=ny;normals[i+2]+=nz;}
    }
    for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
      normals[i]/=l;normals[i+1]/=l;normals[i+2]/=l;
    }
    // For review/QA, the mesh reports the same source-independent crown geometry.
    return {positions:pos,indices,normals,vertices:pos.length/3,triangles:indices.length/3,style,upper};
  }
  // Continuous synthetic gingival ridge with a broad attached-tissue skirt,
  // a narrow cervical crest and interpolated interdental papillae.
  // Educational approximation only; not a periodontal reconstruction.
  function gingivaData(upper){
    const path=upper?
      [[.105,-1.26],[.260,-1.275],[.406,-1.335],[.535,-1.485],[.643,-1.672],[.713,-1.862],[.741,-2.080],[.750,-2.303]]:
      [[.095,-1.292],[.237,-1.305],[.371,-1.363],[.496,-1.504],[.602,-1.685],[.665,-1.879],[.691,-2.091],[.699,-2.307]];
    const points=[...path.slice().reverse().map(p=>[-p[0],p[1]]),...path.map(p=>[p[0],p[1]])];
    const d=upper?1:-1,base=upper?1.759:1.332,seg=240,around=24,pos=[],indices=[];
    const spline=(u)=>{
      const k=Math.min(points.length-2,Math.floor(u)),t=u-k;
      const p0=points[Math.max(0,k-1)],p1=points[k],p2=points[k+1],p3=points[Math.min(points.length-1,k+2)];
      const f=(j)=>.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t*t+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t*t*t);
      return [f(0),f(1)];
    };
    // Cross section: cervical crest at the top, soft rounded shoulder,
    // attached gingiva extending toward the vestibule/lingual side.
    for(let i=0;i<=seg;i++){
      const u=(points.length-1)*i/seg,xy=spline(u),prev=spline(Math.max(0,u-.008)),next=spline(Math.min(points.length-1,u+.008));
      let tx=next[0]-prev[0],tz=next[1]-prev[1],len=Math.hypot(tx,tz)||1;tx/=len;tz/=len;
      const nx=-tz,nz=tx;
      const nearest=Math.abs(u-Math.round(u));
      const papilla=Math.exp(-(nearest/.16)**2);
      const crest=base+d*(.009+.018*papilla);
      for(let j=0;j<around;j++){
        const a=TAU*j/around,cs=Math.cos(a),sn=Math.sin(a);
        const lateral=(.039+.011*Math.max(0,-sn))*cs;
        const shoulder=.019*Math.max(0,sn);
        const attached=.075*Math.max(0,-sn);
        const y=crest+d*(shoulder-attached);
        pos.push(xy[0]+nx*lateral,y,xy[1]+nz*lateral);
      }
    }
    for(let i=0;i<seg;i++)for(let j=0;j<around;j++){
      const a=i*around+j,b=i*around+(j+1)%around,c=(i+1)*around+(j+1)%around,e=(i+1)*around+j;
      if(upper)indices.push(a,c,b,a,e,c);else indices.push(a,b,c,a,c,e);
    }
    const normals=new Array(pos.length).fill(0);
    for(let k=0;k<indices.length;k+=3){
      const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
      const u=[pos[b]-pos[a],pos[b+1]-pos[a+1],pos[b+2]-pos[a+2]];
      const v=[pos[c]-pos[a],pos[c+1]-pos[a+1],pos[c+2]-pos[a+2]];
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      for(const x of [a,b,c])for(let t=0;t<3;t++)normals[x+t]+=n[t];
    }
    for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
      for(let k=0;k<3;k++)normals[i+k]/=l;
    }
    return {positions:pos,indices,normals,vertices:pos.length/3,triangles:indices.length/3,upper};
  }
  function createTemplate(B,scene,kind){
    const match=/^crown_([1-4])_([01])$/.exec(kind);
    if(!match&&!/^gingiva[01]$/.test(kind))return null;
    const data=match?crownData(Number(match[1]),match[2]==='0'):gingivaData(kind==='gingiva0');
    const template=new B.Mesh('anatomical:'+kind,scene),v=new B.VertexData();
    v.positions=data.positions;v.indices=data.indices;v.normals=data.normals;
    v.applyToMesh(template,true);
    template.isVisible=false;template.isPickable=false;
    template.metadata={synthetic:true,anatomyVersion:4,vertices:data.vertices};
    return template;
  }
  root.KlinikBabylonAnatomy={crownData,gingivaData,createTemplate,version:4,notes:'Educational procedural tooth morphology; not an anatomical scan'};
})(typeof window!=='undefined'?window:globalThis);