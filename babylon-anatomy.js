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
        const ridge=.0066*Math.exp(-(((z+.035)/.17)**2));
        const scallop=.0012*(Math.cos(x*PI*2.2)+1);
        return ridge-scallop-.006*(1-r*r);
      }
      if(style===2){ // Single rounded canine cusp.
        return .0145*gauss(x,z,0,-.11,.33,.32)-.0045*(1-r*r);
      }
      if(style===3){ // Two cusps separated by a narrow central groove.
        const cusp=.019*gauss(x,z,-.06,-.44,.39,.30)+.015*gauss(x,z,.06,.43,.40,.30);
        const fissure=-.010*Math.exp(-((z/.095)**2))*Math.exp(-((x/.64)**2));
        return cusp+fissure-.0017*(1-r*r);
      }
      // Four rounded cusp ridges and a Y-like fissure network.
      let cusp=0;
      for(const [cx,cz,amp] of [[-.49,-.47,.023],[.47,-.47,.020],[-.46,.47,.0185],[.45,.44,.021]])
        cusp+=amp*gauss(x,z,cx,cz,.34,.31);
      const fossa=-.0105*gauss(x,z,0,0,.38,.35);
      const groove=-.004*Math.exp(-((x/.095)**2))*Math.exp(-((z/.65)**2))
                  -.003*Math.exp(-((z/.09)**2))*Math.exp(-((x/.66)**2));
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
  function createTemplate(B,scene,kind){
    const match=/^crown_([1-4])_([01])$/.exec(kind);
    if(!match)return null;
    const data=crownData(Number(match[1]),match[2]==='0');
    const template=new B.Mesh('anatomical:'+kind,scene),v=new B.VertexData();
    v.positions=data.positions;v.indices=data.indices;v.normals=data.normals;
    v.applyToMesh(template,true);
    template.isVisible=false;template.isPickable=false;
    template.metadata={synthetic:true,anatomyVersion:2,vertices:data.vertices};
    return template;
  }
  root.KlinikBabylonAnatomy={crownData,createTemplate,version:2,notes:'Educational procedural tooth morphology; not an anatomical scan'};
})(typeof window!=='undefined'?window:globalThis);