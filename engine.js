
'use strict';
const M3 = (() => {
  const v=(x=0,y=0,z=0)=>[x,y,z];
  const add=(a,b)=>a.map((t,i)=>t+b[i]); const sub=(a,b)=>a.map((t,i)=>t-b[i]);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const mul=(a,s)=>a.map(x=>x*s);const len=a=>Math.hypot(...a);const unit=a=>mul(a,1/(len(a)||1));
  const I=()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  function mm(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
  function trs(p=[0,0,0],rot=[0,0,0],s=[1,1,1]){
    const [x,y,z]=rot,[cx,sx]=[Math.cos(x),Math.sin(x)],[cy,sy]=[Math.cos(y),Math.sin(y)],[cz,sz]=[Math.cos(z),Math.sin(z)];
    const Rx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1];
    const Ry=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1];
    const Rz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];
    const T=I();T[12]=p[0];T[13]=p[1];T[14]=p[2];
    const S=I();S[0]=s[0];S[5]=s[1];S[10]=s[2];return mm(T,mm(Ry,mm(Rx,mm(Rz,S))))
  }
  function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2), nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]}
  function lookAt(eye,target,up=[0,1,0]){
    const z=unit(sub(eye,target)),x=unit(cross(up,z)),y=cross(z,x);
    return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]
  }
  // Generic Gauss-Jordan inverse, column-major.
  function inverse(m){const a=[];for(let r=0;r<4;r++){a[r]=[];for(let c=0;c<4;c++)a[r][c]=m[c*4+r];for(let c=0;c<4;c++)a[r][4+c]=+(c===r)}for(let i=0;i<4;i++){let k=i;for(let j=i+1;j<4;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;if(Math.abs(a[k][i])<1e-12)return I();[a[i],a[k]]=[a[k],a[i]];let t=a[i][i];for(let j=0;j<8;j++)a[i][j]/=t;for(let r=0;r<4;r++)if(r!==i){const f=a[r][i];for(let j=0;j<8;j++)a[r][j]-=f*a[i][j]}}const o=[];for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r][4+c];return o}
  function transform(m,p,w=1){const q=[...p,w],r=[0,0,0,0];for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[row]+=m[k*4+row]*q[k];return r}
  function raySphere(o,d,c,r){const oc=sub(o,c),b=dot(oc,d),h=b*b-dot(oc,oc)+r*r;if(h<0)return null;const t=-b-Math.sqrt(h);return t>=0?t:null}
  return {v,add,sub,dot,cross,mul,len,unit,I,mm,trs,perspective,lookAt,inverse,transform,raySphere};
})();



'use strict';
/* Dependency-free WebGL 3D renderer and native WebXR input layer.
   All patient anatomy is schematic and intended for teaching recognition. */
class DentalScene {
  constructor(canvas,onPick){
    this.canvas=canvas;this.onPick=onPick;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,xrCompatible:true})||canvas.getContext('webgl',{antialias:true,alpha:false,xrCompatible:true});
    if(!this.gl)throw Error('WebGL unavailable. Enable hardware acceleration in your browser.');
    const gl=this.gl;this.meshes=[];this.pickables=[];this.dynamicMeshes=[];this.textures=[];this.started=false;
    const vs=`attribute vec3 aPos;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uModel,uView,uProj;uniform mat3 uNormal;varying vec3 vNormal,vWorld;varying vec2 vUV;void main(){vec4 p=uModel*vec4(aPos,1.);vWorld=p.xyz;vNormal=uNormal*aNormal;vUV=aUV;gl_Position=uProj*uView*p;}`;
    const fs=`precision mediump float;varying vec3 vNormal,vWorld;varying vec2 vUV;uniform vec3 uColor;uniform float uAlpha,uTextured,uUnlit,uFinish;uniform sampler2D uTexture;void main(){vec3 n=normalize(vNormal);vec3 view=normalize(vec3(0.35,2.6,3.2)-vWorld);vec3 key=normalize(vec3(-0.52,0.85,0.77));vec3 fillLight=normalize(vec3(.81,.34,-.48));vec3 rim=normalize(vec3(-.72,.40,-.65));float a=max(dot(n,key),0.),b=max(dot(n,fillLight),0.),r=max(dot(n,rim),0.);float sky=.45+.15*max(n.y,0.);vec3 light=vec3(sky)+vec3(.65,.62,.57)*a+vec3(.24,.28,.34)*b+vec3(.14,.17,.19)*r;float shine=pow(max(dot(reflect(-key,n),view),0.),37.)*(.05+.13*uFinish);shine+=pow(max(dot(reflect(-fillLight,n),view),0.),72.)*(.025+.09*uFinish);vec4 tx=texture2D(uTexture,vUV);if(uTextured>.5&&tx.a<.04)discard;vec3 base=mix(uColor,tx.rgb,clamp(uTextured,0.,1.));vec3 lit=base*light+vec3(1.,.98,.92)*shine;gl_FragColor=vec4(mix(lit,base,clamp(uUnlit,0.,1.)),uAlpha*mix(1.,tx.a,clamp(uTextured,0.,1.)));}`;
    const compile=(kind,src)=>{const sh=gl.createShader(kind);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;};
    this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));
    gl.useProgram(this.program);this.loc={};for(const n of ['uModel','uView','uProj','uNormal','uColor','uAlpha','uTextured','uUnlit','uFinish','uTexture'])this.loc[n]=gl.getUniformLocation(this.program,n);
    this.attr={pos:gl.getAttribLocation(this.program,'aPos'),normal:gl.getAttribLocation(this.program,'aNormal'),uv:gl.getAttribLocation(this.program,'aUV')};
    this.geom={box:this.geometry(this.boxData()),sphere:this.geometry(this.sphereData(20,28)),cylinder:this.geometry(this.cylinderData(16)),torus:this.geometry(this.torusData(24,9)),quad:this.geometry(this.quadData())};
    this.labelCanvases=new Map();this.whiteTex=this.makeTexture(null);
    this.target=[0,1.33,-2.28];this.yaw=.28;this.pitch=.27;this.distance=3.8;this.selectedKey='';this.hoverKey='';this.mode='clinic';this.xrSession=null;this.xrRef=null;this.frameCount=0;
    this.installEvents();this.buildScene();this.loop();
  }
  geometry(data){const gl=this.gl,b=gl.createBuffer(),cpu=new Float32Array(data);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,cpu,gl.STATIC_DRAW);return {buffer:b,count:cpu.length/8,cpu};}
  tri(a,b,c,n=null){const A=a.p||a,B=b.p||b,C=c.p||c;const normal=n||M3.unit(M3.cross(M3.sub(B,A),M3.sub(C,A)));return [...A,...normal,...(a.uv||[0,0]),...B,...normal,...(b.uv||[1,0]),...C,...normal,...(c.uv||[1,1])];}
  quadData(){return [...this.tri({p:[-.5,-.5,0],uv:[0,0]},{p:[.5,-.5,0],uv:[1,0]},{p:[.5,.5,0],uv:[1,1]},[0,0,1]),...this.tri({p:[-.5,-.5,0],uv:[0,0]},{p:[.5,.5,0],uv:[1,1]},{p:[-.5,.5,0],uv:[0,1]},[0,0,1])];}
  boxData(){const p=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],v=[];for(let ax=0;ax<3;ax++)for(const dir of [-1,1]){const n=[0,0,0];n[ax]=dir;const other=[0,1,2].filter(x=>x!==ax),corners=[];for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const q=[0,0,0];q[ax]=dir*.5;q[other[0]]=a*.5;q[other[1]]=b*.5;corners.push(q)}if(dir*(ax===1?-1:1)<0)corners.reverse();v.push(...this.tri(corners[0],corners[1],corners[2],n),...this.tri(corners[0],corners[2],corners[3],n));}return v}
  sphereData(lat,long){const v=[],point=(t,p)=>{const st=Math.sin(t);return [st*Math.cos(p),Math.cos(t),st*Math.sin(p)]};for(let i=0;i<lat;i++)for(let j=0;j<long;j++){const t=i*Math.PI/lat,t2=(i+1)*Math.PI/lat,p=j*2*Math.PI/long,p2=(j+1)*2*Math.PI/long;const a=point(t,p),b=point(t2,p),c=point(t2,p2),d=point(t,p2);for(const [x,y,z]of [[a,b,c],[a,c,d]]){for(const q of [x,y,z])v.push(...q,...q,0,0)}}return v}
  cylinderData(segments){let a=[],r=(i)=>i/segments*Math.PI*2;for(let i=0;i<segments;i++){const th=r(i),th2=r(i+1),x=Math.cos(th),z=Math.sin(th),X=Math.cos(th2),Z=Math.sin(th2);const A=[x*.5,-.5,z*.5],B=[X*.5,-.5,Z*.5],C=[X*.5,.5,Z*.5],D=[x*.5,.5,z*.5];a.push(...this.tri(A,B,C,M3.unit([x+X,0,z+Z])),...this.tri(A,C,D,M3.unit([x+X,0,z+Z])),...this.tri([0,.5,0],D,C,[0,1,0]),...this.tri([0,-.5,0],B,A,[0,-1,0]));}return a}
  torusData(M,N){const v=[],pos=(a,b)=>[(.73+.24*Math.cos(b))*Math.cos(a),.24*Math.sin(b),(.73+.24*Math.cos(b))*Math.sin(a)];for(let i=0;i<M;i++)for(let j=0;j<N;j++){const a=i/M*Math.PI*2,A=(i+1)/M*Math.PI*2,b=j/N*Math.PI*2,B=(j+1)/N*Math.PI*2;const p=[pos(a,b),pos(A,b),pos(A,B),pos(a,B)];const center=q=>M3.unit([q[0],q[1],q[2]]);v.push(...this.tri(p[0],p[1],p[2],null),...this.tri(p[0],p[2],p[3],null))}return v}
  // Preserve the silhouette, but share vertex normals across individual triangles.
  // Without welding, each triangle is independently lit and teeth resemble low-poly blocks.
  smoothSurfaceData(data){
    const normals=new Map(),key=(i)=>`${data[i].toFixed(5)},${data[i+1].toFixed(5)},${data[i+2].toFixed(5)}`;
    for(let i=0;i<data.length;i+=24){
      const a=data.slice(i,i+3),c=data.slice(i+8,i+11),d=data.slice(i+16,i+19);
      const n=M3.cross(M3.sub(c,a),M3.sub(d,a));
      for(let j=0;j<3;j++){const at=i+j*8,k=key(at),sum=normals.get(k)||[0,0,0];normals.set(k,M3.add(sum,n));}
    }
    for(let i=0;i<data.length;i+=8){const n=M3.unit(normals.get(key(i))||[0,1,0]);data[i+3]=n[0];data[i+4]=n[1];data[i+5]=n[2];}
    return data;
  }
  // Four distinct synthetic crown morphologies: incisors (incisal ridge), canines
  // (single cusp), premolars (buccal/lingual cusps), molars (four-cusp fossa).
  // Morphology is educational artwork, NOT a tooth scan or calibrated anatomy.
  crownData(style,upper,individual=0){
    const v=[],dir=upper?-1:1,n=52,rings=16,capRings=16;
    const height=[0,.167,.181,.166,.153][style],power=[0,3.5,2.65,2.65,2.77][style];
    const oval=style===1?.70:style===2?.82:style===3?.91:1.0;
    const seed=individual*.61;
    const squircle=a=>{const c=Math.cos(a),s=Math.sin(a),e=2/power;
      return [Math.sign(c)*Math.pow(Math.abs(c),e),Math.sign(s)*Math.pow(Math.abs(s),e)];};
    const ringWidth=t=>.75+.19*Math.sin(Math.PI*(.22+.73*t))+.018*Math.sin(Math.PI*t);
    const point=(t,a)=>{
      const [u,w]=squircle(a),f=ringWidth(t);
      const lobe=style===1?1+.017*Math.cos(3*a+.3*seed)*Math.pow(t,2):1+.019*Math.cos((style===4?5:3)*a+seed)*Math.pow(t,2);
      const tipNarrow=style===2?1-.075*t*t:1;
      return [u*f*lobe*tipNarrow,dir*height*t,w*f*oval*lobe];
    };
    for(let k=0;k<rings;k++)for(let j=0;j<n;j++){
      const a=j*2*Math.PI/n,b=(j+1)*2*Math.PI/n,t=k/rings,T=(k+1)/rings;
      const A=point(t,a),B=point(t,b),C=point(T,b),D=point(T,a);
      if(upper)v.push(...this.tri(A,B,C),...this.tri(A,C,D));
      else v.push(...this.tri(A,C,B),...this.tri(A,D,C));
    }
    const sq=x=>x*x,peak=(x,z,cx,cz,sx,sz)=>Math.exp(-sq((x-cx)/sx)-sq((z-cz)/sz));
    const cap=(r,a)=>{
      const [u,w]=squircle(a),f=ringWidth(1),x=u*f*r,z=w*f*oval*r;
      // Envelope gives a continuous join to the crown wall instead of a sharp ledge.
      const envelope=Math.pow(Math.max(0,1-r*r),.70);
      let relief=0;
      if(style===4){
        // Educational upper-four / lower-five cusp distinction. In the lower
        // molar the smaller distal cusp is offset toward the distal edge.
        // Individual molars retain subtle variation; neither is a dental scan.
        const cusps=upper
          ? [[-.47,-.43,.061],[.46,-.43,.058],[-.46,.43,.067],[.45,.44,.054]]
          : [[-.51,-.44,.065],[.13,-.46,.060],[-.51,.43,.062],[.18,.43,.057],[.68,-.03,.039]];
        const detail=individual===8?.82:individual===7?.94:1;
        for(const [cx,cz,amp] of cusps)
          relief+=detail*amp*peak(x,z,cx,cz,upper?.30:.265,upper?.29:.285);
        relief-=.025*peak(x,z,0,0,.28,.27); // central fossa
        relief-=.014*peak(x,z,0,0,.072,.60); // developmental fissure
        relief-=.010*peak(x,z,0,0,.64,.075); // transverse groove
        if(!upper)relief-=.008*peak(x,z,.49,-.10,.16,.17); // distal groove
      }else if(style===3){
        // Buccal/lingual peaks (local depth axis) and a central fissure.
        // Lower lingual cusp is deliberately smaller than its upper counterpart.
        relief+=(upper?.058:.060)*peak(x,z,0,-.43,.43,.32)
          +(upper?.047:.029)*peak(x,z,0,.43,.43,.34);
        relief-=.020*peak(x,z,0,0,.58,.095);
      }else if(style===2){
        relief+=.073*peak(x,z,-.05,0,.45,.53)-.009*peak(x,z,.60,0,.27,.30);
      }else{
        // Smooth incisal ridge and shallow three-lobed mamelons, not a molar cap.
        relief+=.017*peak(x,z,0,0,.78,.26)+.003*Math.cos(3.5*x+seed)*Math.exp(-sq(z/.34));
      }
      const rootSlope=style===1?0:style===2?.014:.018;
      const crownTop=height+envelope*(relief-rootSlope*(1-r*r));
      return [x,dir*crownTop,z];
    };
    // Polar fan from the center, with a small center cap to avoid zero-area triangles.
    for(let k=0;k<capRings;k++)for(let j=0;j<n;j++){
      const a=j*2*Math.PI/n,b=(j+1)*2*Math.PI/n,r=k/capRings,R=(k+1)/capRings;
      const A=cap(r,a),B=cap(r,b),C=cap(R,b),D=cap(R,a);
      if(upper)v.push(...this.tri(A,C,B),...this.tri(A,D,C));
      else v.push(...this.tri(A,B,C),...this.tri(A,C,D));
    }
    return this.smoothSurfaceData(v);
  }
  // Thin, scalloped gingival collars. The old thick circular tube obscured
  // much of the crowns and looked like a pink horseshoe-shaped plastic bumper.
  gingivaData(positions,y,wide=.064,thick=.023){
    const V=[],steps=9,sides=20,points=[];
    const cat=(p0,p1,p2,p3,t)=>{
      const t2=t*t,t3=t2*t;
      return [0,1,2].map(i=>.5*((2*p1[i])+(-p0[i]+p2[i])*t+(2*p0[i]-5*p1[i]+4*p2[i]-p3[i])*t2+(-p0[i]+3*p1[i]-3*p2[i]+p3[i])*t3));
    };
    for(let i=0;i<positions.length-1;i++)for(let k=0;k<steps;k++)points.push({p:cat(positions[Math.max(i-1,0)],positions[i],positions[i+1],positions[Math.min(i+2,positions.length-1)],k/steps),t:k/steps});
    points.push({p:positions.at(-1),t:1});
    const section=(i,j)=>{
      const {p,t}=points[i],p0=points[Math.max(0,i-1)].p,p1=points[Math.min(points.length-1,i+1)].p;
      const tangent=M3.unit([p1[0]-p0[0],0,p1[2]-p0[2]]),lat=M3.unit([-tangent[2],0,tangent[0]]);
      const a=j*2*Math.PI/sides;
      // Raise interdental papillae toward the corresponding crowns (down
      // on the maxilla, up on the mandible), while narrowing the collar near
      // the cervical mid-face. This remains a synthetic gingival illustration.
      const interdental=Math.pow(Math.abs(Math.sin(Math.PI*t)),3);
      const taper=.84+.16*interdental;
      const side=Math.cos(a),surface=Math.sin(a);
      const crownward=y>1.5?-1:1;
      const papilla=crownward*.012*interdental*(.55+.45*Math.abs(surface));
      return [p[0]+lat[0]*side*wide*taper,y+surface*thick+papilla,p[2]+lat[2]*side*wide*taper];
    };
    for(let i=0;i<points.length-1;i++)for(let j=0;j<sides;j++){
      const A=section(i,j),B=section(i,j+1),C=section(i+1,j+1),D=section(i+1,j);
      V.push(...this.tri(A,C,B),...this.tri(A,D,C));
    }
    return this.smoothSurfaceData(V);
  }
  makeTexture(canvas){const gl=this.gl,tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));if(canvas)this.updateTexture(tex,canvas);this.textures.push(tex);return tex;}
  updateTexture(tex,canvas){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);this.labelCanvases?.set(tex,canvas)}
  makeLabel(text,opts={}){const w=opts.width||512,h=opts.height||100;const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(opts.background){ctx.fillStyle=opts.background;ctx.fillRect(0,0,w,h)}ctx.fillStyle=opts.color||'#e2f8ec';ctx.font=`${opts.bold?'700':'550'} ${opts.font||32}px system-ui, sans-serif`;ctx.textAlign=opts.align||'center';ctx.textBaseline='middle';ctx.fillText(text,opts.align==='left'?14:w/2,h/2,w-24);return this.makeTexture(c)}
  add(kind,p,s,c,opts={}){const m={kind,p:p.slice(),s:s.slice(),rot:opts.rot||[0,0,0],color:this.rgb(c),alpha:opts.alpha??1,tex:opts.tex||null,unlit:!!opts.unlit,finish:opts.finish??0,key:opts.key||null,tag:opts.tag||'',hidden:false};this.meshes.push(m);if(m.key)this.pickables.push({key:m.key,p:m.p.slice(),radius:opts.radius||Math.max(...s)*.7,kind,mesh:m});return m}
  rgb(h){if(Array.isArray(h))return h;const x=parseInt(h.replace('#',''),16);return [(x>>16&255)/255,(x>>8&255)/255,(x&255)/255]}
  box(p,s,c,o={}){return this.add('box',p,s,c,o)}sphere(p,s,c,o={}){return this.add('sphere',p,s,c,o)}cy(p,s,c,o={}){return this.add('cylinder',p,s,c,o)}tor(p,s,c,o={}){return this.add('torus',p,s,c,o)}label(text,p,s,o={}){return this.add('quad',p,s,'#ffffff',{...o,unlit:true,tex:this.makeLabel(text,o)})}
  // Scale only dental anatomy. Tool tray, XR controllers and room remain at
  // physical world size. The gum is a world-coordinate mesh, so its mesh
  // translation differs from the origin-relative tooth crowns.
  rescaleAnatomy(factor){
    if(!(factor>0&&Number.isFinite(factor)))throw Error('Invalid anatomy factor');
    const pivot=this.anatomyPivot||[0,1.545,-1.78];
    const transform=p=>p.map((v,i)=>pivot[i]+(v-pivot[i])*factor);
    const members=new Set(this.archMeshes.flat());
    for(const m of members){
      m.p=m.kind.startsWith('gingiva')
        ?m.p.map((v,i)=>pivot[i]*(1-factor)+v*factor)
        :transform(m.p);
      m.s=m.s.map(v=>v*factor);
      m.model=null;
    }
    for(const pick of this.pickables.filter(p=>members.has(p.mesh))){
      pick.p=transform(pick.p);pick.radius*=factor;
    }
    for(const t of Object.values(this.teeth))t.pos=transform(t.pos);
  }
  // Translate dental meshes and all corresponding FDI targets in lockstep.
  // A translation does not change normal-scale dimensions or XR tool homes.
  translateAnatomy(delta){
    const members=new Set(this.archMeshes.flat());
    for(const m of members){
      for(let i=0;i<3;i++)m.p[i]+=delta[i];
      m.model=null;
    }
    for(const hit of this.pickables.filter(p=>members.has(p.mesh)))
      for(let i=0;i<3;i++)hit.p[i]+=delta[i];
    for(const tooth of Object.values(this.teeth))
      for(let i=0;i<3;i++)tooth.pos[i]+=delta[i];
  }
  // Compute the REAL world bounds of all post-transform mesh vertices,
  // including world-coordinate gingiva, not an inferred arch centre.
  anatomyWorldBounds(){
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    let vertices=0;
    for(const mesh of this.archMeshes.flat()){
      if(mesh.hidden)continue;
      const data=this.geom[mesh.kind]?.cpu;
      if(!data)continue;
      const m=mesh.model||M3.trs(mesh.p,mesh.rot,mesh.s);
      for(let i=0;i<data.length;i+=8){
        const x=data[i],y=data[i+1],z=data[i+2];
        for(let k=0;k<3;k++){
          const v=m[k]*x+m[4+k]*y+m[8+k]*z+m[12+k];
          lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);
        }
        vertices++;
      }
    }
    if(!vertices)throw Error('No anatomy vertices for XR examination placement');
    return {min:lo,max:hi,center:lo.map((v,i)=>(v+hi[i])/2),vertices};
  }
  // Anchor the teaching arch once in the actual viewer's forward gaze.
  // Never chase head movement every frame: that would be uncomfortable.
  placeTeachingAnatomy(pose){
    if(!this.teachingPlacementPending||this.anatomyDisplayMagnification!==12)return;
    const p=pose.transform.position,q=pose.transform.orientation;
    const forward=this.rotateByQuat([0,0,-1],q);
    const up=this.rotateByQuat([0,1,0],q);
    const target=[p.x,p.y,p.z].map((v,i)=>v+.98*forward[i]+.025*up[i]);
    const before=this.anatomyWorldBounds();
    const delta=target.map((v,i)=>v-before.center[i]);
    this.translateAnatomy(delta);
    this.teachingPlacementOffset=delta;
    this.teachingPlacementInfo={target,delta,bounds:this.anatomyWorldBounds(),mode:'viewer-gaze-anchored'};
    this.teachingPlacementPending=false;
  }
  // Explicit 12x teaching enlargement is independent of the physical-scale
  // anatomy. Restore the exact original world transforms on exit.
  setTeachingMagnification(on){
    const next=on?12:1;
    if(this.anatomyDisplayMagnification===next)return;
    const relative=next/this.anatomyDisplayMagnification;
    if(on){
      this.rescaleAnatomy(relative);
      this.anatomyDisplayMagnification=next;
      this.teachingPlacementOffset=[0,0,0];
      this.teachingPlacementPending=!!this.xrSession;
      this.teachingPlacementInfo=null;
    }else{
      if(this.teachingPlacementOffset)this.translateAnatomy(this.teachingPlacementOffset.map(v=>-v));
      this.rescaleAnatomy(relative);
      this.anatomyDisplayMagnification=next;
      this.teachingPlacementPending=false;
      this.teachingPlacementOffset=[0,0,0];
      this.teachingPlacementInfo=null;
    }
  }
  buildScene(){const C={floor:'#547078',wall:'#88a6ad',accent:'#4c8f92',white:'#e3ece8',steel:'#a6c0c5',chair:'#2b7d7d',dark:'#183b49',wood:'#87685e',gum:'#ba7682',tooth:'#f5e8c9',crown:'#f2e0b7'};
    // Environment: room, floor, side cabinetry, architectural framing.
    this.box([0,-.06,-2.6],[7,.12,8],'#627b82');this.box([0,2.52,-6.1],[7,5,.12],'#88a3aa');this.leftWall=this.box([-3.6,2,-2.6],[.1,4.4,7.8],'#728d95');this.rightWall=this.box([3.6,2,-2.6],[.1,4.4,7.8],'#809ba1');
    for(let i=-3;i<=3;i++)this.box([i,0.003,-2.65],[.012,.005,8],'#435f68');for(let i=-6;i<=1;i++)this.box([0,.004,i],[7,.005,.012],'#435f68');
    this.box([0,3.75,-5.96],[2.55,.08,.15],'#d8efdf');this.box([0,2.4,-5.96],[.08,2.8,.1],'#bfd2d0');this.box([0,2.15,-5.91],[2.15,1.45,.02],'#acc3c3');this.box([0,2.15,-5.87],[1.87,1.17,.023],'#598f9e');
    this.box([0,1.5,-5.85],[2.2,.08,.11],'#e2eddf');this.box([-2.3,.72,-4.6],[1.8,1.3,.65],'#c3d1d0');this.box([-2.3,1.4,-4.55],[1.8,.10,.78],'#eaf0e5');
    for(let i=0;i<3;i++){this.box([-2.85+i*.55,.86,-4.24],[.48,.35,.027],'#a8bdbf');this.cy([-2.85+i*.55,.88,-4.213],[.025,.018,.025],'#75979b',{rot:[Math.PI/2,0,0]})}
    this.box([2.4,.84,-4.35],[1.2,1.35,.6],'#d4e0dc');this.box([2.4,1.49,-4.38],[1.3,.08,.69],'#f4f3e7');this.cy([2.4,1.52,-4.28],[.37,.045,.37],'#9dbabd');this.cy([2.4,1.52,-4.28],[.21,.063,.21],'#ebf3ee');
    this.box([2.42,2.52,-5.91],[1.45,.95,.07],'#f1f4e8');this.box([2.42,2.52,-5.86],[1.28,.78,.03],'#18465a');this.label('IMAGING', [2.42,2.73,-5.825],[.88,.16,1],{font:35,color:'#b9efdb'});
    // Chair: base, backrest, articulated headrest, cushions, overhead operating lamp.
    this.cy([0,.17,-3.5],[.95,.27,.95],'#aec8c9');this.cy([0,.55,-3.5],[.26,.8,.26],'#d5e4df');
    this.box([0,.93,-3.5],[1.04,.24,1.95],'#244c5b',{rot:[-.14,0,0]});this.box([0,1.04,-3.44],[.96,.25,1.73],'#3a9b98',{rot:[-.14,0,0]});
    this.box([0,1.43,-4.37],[.94,1.4,.24],'#295969',{rot:[-.49,0,0]});this.box([0,1.44,-4.24],[.87,1.26,.19],'#2f9091',{rot:[-.49,0,0]});this.box([0,1.94,-4.6],[.56,.48,.2],'#20636d',{rot:[-.45,0,0]});
    for(const x of [-.68,.68]){this.box([x,1.09,-3.55],[.18,.12,1.3],'#a7c4c2');this.box([x,1.11,-3.53],[.15,.08,1.1],'#347b7d')}
    // Stylized patient silhouette, separate from teaching models.
    this.sphere([0,2.17,-4.43],[.29,.37,.27],'#d5ad94');this.sphere([0,2.43,-4.54],[.29,.16,.28],'#493e3c');this.sphere([0,2.08,-4.15],[.12,.045,.04],'#915b65');this.sphere([-.115,2.24,-4.186],[.028,.023,.025],'#433c42');this.sphere([.115,2.24,-4.186],[.028,.023,.025],'#433c42');this.sphere([0,2.17,-4.138],[.047,.09,.057],'#c99b86');
    this.box([0,1.12,-3.55],[.66,.27,1.18],'#c4d2c7');this.box([0,1.0,-2.81],[.53,.18,.62],'#bdcfd0');
    this.cy([1.38,2.82,-3.95],[.07,1.5,.07],'#b5c9c8');this.cy([.72,3.42,-3.82],[.064,1.35,.064],'#b5c9c8',{rot:[0,0,1.05]});this.cy([.10,3.39,-3.69],[.065,.75,.065],'#9fb8b8',{rot:[-.65,0,.35]});this.sphere([-.02,3.11,-3.42],[.33,.13,.33],'#e4ece6');this.cy([-.02,3.055,-3.42],[.24,.065,.24],'#f6e1a8');
    this.roomMeshes=this.meshes.slice();
    const vrPropsStart=this.meshes.length;
    // Table and pedestal for enlarged, schematic anatomy.
    this.cy([0,.56,-1.88],[.12,1.08,.12],'#acc0c2');this.cy([0,.13,-1.88],[.73,.11,.73],'#9cb6b8');this.box([0,1.08,-1.83],[2.00,.09,1.6],'#ecf1e7');this.box([0,1.025,-1.83],[2.02,.04,1.63],'#93babc');
    this.label('ANATOMY MODEL', [0,1.13,-1.012],[1.23,.17,1],{font:33,color:'#365b60'});
    // Separate U-shaped maxillary and mandibular arches with anatomically
    // differentiated incisors, canines, premolars and molars.
    this.teeth={};this.archMeshes=[[],[]];this.archMode='both';
    const upperPath=[[.105,-1.26],[.260,-1.275],[.406,-1.335],[.535,-1.485],[.643,-1.672],[.713,-1.862],[.741,-2.080],[.750,-2.303]];
    const lowerPath=[[.095,-1.292],[.237,-1.305],[.371,-1.363],[.496,-1.504],[.602,-1.685],[.665,-1.879],[.691,-2.091],[.699,-2.307]];
    const toothColors=['#eee8da','#f3ebdb','#eee5d4','#f0e8d7'];
    for(let upperIndex=0;upperIndex<2;upperIndex++){
      const archStart=this.meshes.length;
      const upper=upperIndex===0,base=upper?1.759:1.332,path=upper?upperPath:lowerPath;
      const archPoints=[...path.slice().reverse().map(v=>[-v[0],base,v[1]]),...path.map(v=>[v[0],base,v[1]])];
      const gumGeo='gingiva'+upperIndex;
      this.geom[gumGeo]=this.geometry(this.gingivaData(archPoints,upper?1.776:1.304,upper?.054:.052,.018));
      this.add(gumGeo,[0,0,0],[1,1,1],upper?'#b9838c':'#bf8990');
      // Palatal/lingual support, recessed behind the gingival collar.
      // Keep the occlusal opening unobstructed for anatomical instruction.
      for(let q of (upper?[1,2]:[4,3])){
        const sign=(q===1||q===4)?-1:1;
        for(let i=1;i<=8;i++){
          const [xx,z]=path[i-1],id=String(q)+i,style=i<=2?1:i===3?2:i<=5?3:4;
          const at=path[Math.max(0,i-2)],bt=path[Math.min(7,i)],dx=bt[0]-at[0],dz=bt[1]-at[1];
          const orientation=sign<0?Math.atan2(dz,dx):-Math.atan2(dz,dx);
          const width=(i===1?.090:i===2?.076:i===3?.082:i<=5?.085:.105)*(upper?1:i<=2?.68:.95);
          const depth=(i<=2?.074:i===3?.079:i<=5?.094:.113);
          const pos=[sign*xx,base,z];const key='crown_'+style+'_'+upperIndex+'_'+i;
          if(!this.geom[key])this.geom[key]=this.geometry(this.crownData(style,upper,i));
          const crown=this.add(key,pos,[width,1,depth],toothColors[style-1],{finish:.78,key:'tooth:'+id,radius:Math.max(width,depth)+.034,rot:[0,orientation,0],tag:'crown'});
          const picker=this.pickables[this.pickables.length-1];picker.p=[pos[0],base+(upper?-.080:.080),pos[2]];picker.radius=Math.max(width,depth)+.042;
          // Pit-and-fissure discoloration on two illustrative molars. Surface marker
          // intentionally subdued rather than a misleading cavity diagnosis.
          if(id==='16'||id==='36'){
            const occlusalY=base+(upper?-.173:.173);
            this.sphere([sign*xx,occlusalY,z],[.020,.008,.027],'#95775d',{key:'tooth:'+id,radius:.027,tag:'caries'});
          }
          this.teeth[id]={id,pos,kind:['','Incisor','Canine','Premolar','Molar'][style],upper,mesh:crown};
        }
      }
      this.archMeshes[upperIndex]=this.meshes.slice(archStart);
    }
    // The legacy teaching arch was roughly 1.5 m wide. Shrink the complete
    // anatomy as a single rigid, uniformly scaled group (including FDI hit
    // spheres and gingiva) around a fixed laboratory-model origin. Dental
    // dimensions are educational approximations, not patient measurements.
    this.anatomyOverviewScale=.055;
    this.anatomyPivot=[0,1.545,-1.78];
    this.anatomyDisplayMagnification=1;
    this.rescaleAnatomy(this.anatomyOverviewScale);
    this.box([0,1.275,-1.8],[1.76,.065,1.16],'#acc8c4');
    // XR-reachable tray directly ahead, distinct instruments (ray/select targets include multiple pieces).
    this.box([.09,.97,-.69],[1.16,.085,.75],'#e5ece6');this.cy([.09,.53,-.69],[.075,.85,.075],'#adc6c6');
    this.box([.09,1.02,-.69],[1.06,.014,.64],'#91b0b2');
    this.xrTableTools=[];
    const tools=[['mirror',-.31,'#c4d9d6'],['probe',-.11,'#d6e2dd'],['suction',.09,'#89d5d1'],['excavator',.29,'#e1c69e'],['composite',.49,'#c5a8d7']];
    for(const [name,x,color] of tools){const toolStart=this.meshes.length;this.cy([x,1.08,-.68],[.027,.35,.027],color,{rot:[Math.PI/2,0,0],key:`tool:${name}`,radius:.19});this.cy([x,1.09,-.47],[.034,.09,.034],'#6b8591',{rot:[Math.PI/2,0,0],key:`tool:${name}`,radius:.12});
      if(name==='mirror'){this.cy([x,1.085,-.84],[.12,.025,.12],'#d9eff1',{key:`tool:${name}`,radius:.12});}
      if(name==='probe'||name==='excavator'){this.cy([x+.03,1.09,-.89],[.012,.13,.012],'#cedce0',{rot:[0,0,.55],key:`tool:${name}`,radius:.08});}
      if(name==='suction'){this.cy([x,1.11,-.90],[.064,.18,.064],'#76b1ad',{rot:[1.03,0,0],key:`tool:${name}`,radius:.1});}
      if(name==='composite'){this.cy([x,1.09,-.89],[.068,.13,.068],'#e6d3ed',{rot:[Math.PI/2,0,0],key:`tool:${name}`,radius:.1});}
      this.xrTableTools.push({name,meshes:this.meshes.slice(toolStart),owner:null,home:null,hover:null});
      this.label(name.toUpperCase(),[x,.985,-.28],[.24,.085,1],{font:34,color:'#47707b',width:400,height:110,tag:'tool-label'});
    }
    // Phase 4: opt-in VR catalog. Tool instances remain unique: spawning restores
    // an unheld tool to its physical tray slot, never clones a held instrument.
    const catalogSpecs=[
      ['mirror','MIRROR','Indirect vision and cheek retraction'],
      ['probe','PROBE','Explore surfaces and margins gently'],
      ['suction','SUCTION','Remove fluid from the working field'],
      ['excavator','EXCAVATOR','Remove softened tooth material'],
      ['composite','COMPOSITE','Place and shape restorative material']
    ];
    this.xrCatalog={open:false,selected:'mirror',specs:catalogSpecs,panels:[],rows:[],status:null};
    const cat=this.xrCatalog,register=(m,row=false)=>{cat.panels.push(m);m.hidden=true;if(row)cat.rows.push(m);return m};
    // A narrow tab near the top of the workspace, clear of the tool tray and ?.
    cat.launcher=this.box([-.60,1.98,-1.02],[.36,.14,.06],'#225e70',{key:'catalog:toggle'});
    cat.launcherLabel=this.label('TOOLS',[-.60,1.99,-.98],[.32,.10,1],{font:39,bold:true,color:'#f4ffff'});
    register(this.box([-.60,1.47,-1.03],[.88,1.30,.045],'#173b48'));
    register(this.label('INSTRUMENTS',[-.60,1.84,-.995],[.81,.10,1],{font:38,bold:true}));
    for(let i=0;i<catalogSpecs.length;i++){
      const y=1.71-i*.12;
      register(this.box([-.60,y,-.985],[.81,.105,.04],'#285869',{key:'catalog:tool:'+catalogSpecs[i][0]}),true);
      register(this.label(catalogSpecs[i][1],[-.60,y,-.952],[.75,.08,1],{font:35}),true);
    }
    cat.status=register(this.label('Indirect vision and cheek retraction',[-.60,1.075,-.99],[.79,.085,1],{font:25,color:'#f1efe5'}));
    for(const [key,x,label] of [['spawn',-.90,'RETURN'],['reset',-.59,'RESET'],['close',-.29,'CLOSE']]){
      register(this.box([x,.87,-.985],[.27,.115,.05],'#1d7975',{key:'catalog:'+key}));
      register(this.label(label,[x,.875,-.95],[.25,.075,1],{font:30,bold:true}));
    }
    this.setXRCatalogOpen?.(false);
    // Other procedure items displayed on the side trolley.
    this.box([1.55,.51,-1.65],[1.1,.09,.65],'#799b9d');
    this.box([-1.54,.9,-2.5],[.89,.08,.68],'#b5cccc');this.cy([-1.54,.45,-2.5],[.1,.84,.1],'#aec7c6');
    for(const [i,n]of ['putty','lightbody','heavybody','mediumbody'].entries()){let x=-1.83+i*.19;this.cy([x,1.015,-2.5],[.105,.16,.105],['#e2b88d','#8bb7e2','#aad7a5','#cda6d0'][i],{key:`tool:${n}`,radius:.135});this.cy([x,1.103,-2.5],[.11,.035,.11],'#ebebe0',{key:`tool:${n}`,radius:.09})}
    this.vrCompactMeshes=this.meshes.slice(vrPropsStart);
    this.xrComfortConfig={furniture:{scale:.78,pivot:[0,1.02,-1.83]},lessonBoard:{scale:.68,pivot:[-1.66,1.51,-2.13]}};
    this.xrComfortScale=this.xrComfortConfig.furniture.scale;this.xrComfort={active:false,scale:1,objects:0,lessonScale:1};this.xrComfortSnapshot=null;
    this.focusDecor=this.meshes.filter(m=>!this.archMeshes[0].includes(m)&&!this.archMeshes[1].includes(m));
    const vrMeshesStart=this.meshes.length;
    // Interactive XR lesson board - all its buttons are also available via standard HTML.
    this.box([-1.66,1.48,-2.2],[.88,2.35,.065],'#143345');this.box([-1.66,2.56,-2.16],[.87,.13,.08],'#237269');
    this.label('KLINIKLAB',[-1.66,2.565,-2.105],[.80,.13,1],{font:40,bold:true});
    this.label('TRAINING MODULES',[-1.66,2.36,-2.105],[.74,.11,1],{font:43,color:'#b6e7df'});
    this.menuButtons=[];for(let i=0;i<7;i++){const y=2.17-i*.182;const item=this.box([-1.66,y,-2.095],[.79,.177,.048],i===0?'#2c8b7b':'#265064',{key:`module:${i}`,radius:.33});this.menuButtons.push(item);this.label(`${i+1}. ${['FSP Interview','FSP Arztbrief','FSP Handover','KP Written','KP Practical','KP Viva','Praxis German'][i]}`,[-1.66,y,-2.057],[.74,.115,1],{font:49,color:'#f5fff5'})}
    // Answer buttons for VR only, populated by setVRState().
    this.answerMeshes=[];for(let i=0;i<4;i++){const yy=.79-i*.17,m=this.box([-1.66,yy,-2.08],[.79,.15,.048],'#225a5f',{key:`answer:${i}`,radius:.31});m.hidden=true;this.answerMeshes.push(m);this.label(['Option A','Option B','Option C','Option D'][i],[-1.66,yy,-2.041],[.75,.115,1],{font:47,tag:`answerlabel:${i}`})}
    // Live status board and current objective for in-headset reading.
    this.box([0,2.72,-2.32],[1.62,.43,.07],'#183647');this.liveTitle=this.label('SELECT A LESSON',[0,2.805,-2.272],[1.49,.15,1],{font:32,bold:true});this.liveStep=this.label('Choose a module on the left', [0,2.65,-2.272],[1.49,.15,1],{font:32});
    this.xrBoardMeshes=this.meshes.slice(vrMeshesStart);
    for(const m of this.xrBoardMeshes)m.hidden=true;
    this.buildXRControllers();
  }
  // Original, schematic Quest 2 Touch silhouettes, not Meta-owned 3D assets.
  // Local geometry is anchored to gripSpace; the independent laser uses targetRaySpace.
  setXRCatalogOpen(open){
    if(!this.xrCatalog)return false;
    const cat=this.xrCatalog;cat.open=!!open;
    for(const m of cat.panels)m.hidden=!cat.open;
    for(const m of cat.rows){
      if(m.key?.startsWith('catalog:tool:'))
        m.color=this.rgb(m.key==='catalog:tool:'+cat.selected?'#22998e':'#285869');
    }
    // Launcher is available throughout the XR session, without covering the tray.
    cat.launcher.hidden=!this.xrSession;
    cat.launcherLabel.hidden=!this.xrSession;
    return true;
  }
  onXRCatalogSelect(event,frame){
    if(!this.xrSession||this.xrGuide?.state?.open)return false;
    const pose=this.getXRInputPose(frame,event?.inputSource);
    if(!pose)return false;
    const p=pose.transform.position,q=pose.transform.orientation;
    const ray={o:[p.x,p.y,p.z],d:this.rotateByQuat([0,0,-1],q)};
    const hit=this.getRayHit(ray.o,ray.d,item=>item.key?.startsWith('catalog:'));
    const key=hit?.key;if(!key)return false;
    const cat=this.xrCatalog;
    if(key==='catalog:toggle'){this.setXRCatalogOpen(!cat.open);return true}
    if(!cat.open)return false;
    if(key==='catalog:close'){this.setXRCatalogOpen?.(false);return true}
    if(key.startsWith('catalog:tool:')){
      const name=key.slice('catalog:tool:'.length);
      const spec=cat.specs.find(s=>s[0]===name);if(!spec)return false;
      cat.selected=name;
      this.setXRCatalogOpen(true);
      this.replaceLabel(cat.status,spec[2],25);
      return true;
    }
    if(key==='catalog:reset'){
      this.resetXRTools();
      this.replaceLabel(cat.status,'All instruments returned to tray',28);
      return true;
    }
    if(key==='catalog:spawn'){
      const tool=this.xrTableTools.find(t=>t.name===cat.selected);
      if(!tool||tool.owner){
        this.replaceLabel(cat.status,'Release held tool before return',28);
        return true;
      }
      this.resetXRTool(tool);
      this.replaceLabel(cat.status,cat.selected.toUpperCase()+' ready on table: grip to pick up',28);
      return true;
    }
    return false;
  }
  buildXRControllers(){
    this.xrControllers=[];
    for(const handedness of ['left','right']){
      const side=handedness==='left'?-1:1;
      const parts=[
        this.cy([0,-20,0],[.039,.125,.044],'#303b49',{finish:.4}),
        this.sphere([0,-20,0],[.055,.040,.061],'#b5bcc6'),
        this.tor([0,-20,0],[.108,.110,.108],'#c2c8cf'),
        this.box([0,-20,0],[.027,.035,.041],'#3b4e5f'),
        this.cy([0,-20,0],[.023,.025,.023],'#252c39'),
        this.sphere([0,-20,0],[.014,.014,.014],handedness==='left'?'#5caaf4':'#f49d7a')
      ];
      const ray=this.cy([0,-20,0],[.008,1.5,.008],handedness==='left'?'#76baff':'#80dec9',{alpha:.56});
      this.xrControllers.push({handedness,side,parts,ray,active:false,gripValid:false,aimValid:false,buttons:{trigger:false,grip:false,thumbstick:false,primary:false,secondary:false},profiles:[]});
    }
  }
  controllerMatrix(pose){
    const {position:p,orientation:q}=pose.transform;
    const x=q.x,y=q.y,z=q.z,w=q.w;
    return [1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,
      2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,
      2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,p.x,p.y,p.z,1];
  }
  updateXRController(slot,source,frame){
    const c=this.xrControllers[slot],gp=source.gripSpace,aim=source.targetRaySpace;
    const side=c.side;
    let grip=null,rayPose=null;
    try{if(gp)grip=frame.getPose(gp,this.xrRef);if(aim)rayPose=frame.getPose(aim,this.xrRef)}catch{}
    c.active=true;c.profiles=Array.from(source.profiles||[]);
    c.gripValid=!!grip;c.aimValid=!!rayPose;
    const buttons=source.gamepad?.buttons||[];
    const pressed=i=>!!buttons[i]?.pressed;
    c.buttons={trigger:pressed(0),grip:pressed(1),thumbstick:pressed(3),primary:pressed(4),secondary:pressed(5)};
    // Left/right mirrored handle, cap, tracking ring, grip/trigger, thumbstick, face button.
    const layouts=[
      {p:[0,-.046,.018],s:[.050,.120,.056],rot:[-.21,0,0]},
      {p:[0,.024,-.007],s:[.064,.035,.065]},
      {p:[0,.054,-.010],s:[.083,.075,.080],rot:[Math.PI/2,0,0]},
      {p:[side*.026,-.018,-.031],s:[.022,.033,.029]},
      {p:[side*.026,.043,-.034],s:[.021,.019,.021]},
      {p:[-side*.025,.043,-.035],s:[.016,.016,.016]}
    ];
    for(let i=0;i<c.parts.length;i++){
      const m=c.parts[i],layout=layouts[i];
      const holding=(this.xrTableTools||[]).some(tool=>tool.owner===c.handedness);
      // Hide the oversized tracking ring while carrying a tool: keep the
      // grip silhouette and buttons for handedness/interaction feedback.
      m.hidden=!grip||(holding&&i===2);
      if(grip){
        const shape=holding&&i===0?layout.s.map(v=>v*.78):layout.s;
        const local=M3.trs(layout.p,layout.rot||[0,0,0],shape);
        m.model=M3.mm(this.controllerMatrix(grip),local);
        if(i===3)m.color=this.rgb(c.buttons.trigger?'#75d6ff':'#3b4e5f');
        if(i===4)m.color=this.rgb(c.buttons.thumbstick?'#75d6ff':'#252c39');
      }else m.model=null;
    }
    if(!rayPose){c.ray.hidden=true;c.ray.model=null;return}
    c.ray.hidden=false;
    const t=rayPose.transform,point=[t.position.x,t.position.y,t.position.z];
    const dir=this.rotateByQuat([0,0,-1],t.orientation),center=M3.add(point,M3.mul(dir,.75));
    const xAxis=M3.unit(M3.cross(Math.abs(dir[2])>.95?[0,1,0]:[0,0,1],dir));
    const zAxis=M3.unit(M3.cross(xAxis,dir)),e=.006,L=1.5;
    c.ray.model=[xAxis[0]*e,xAxis[1]*e,xAxis[2]*e,0,dir[0]*L,dir[1]*L,dir[2]*L,0,zAxis[0]*e,zAxis[1]*e,zAxis[2]*e,0,center[0],center[1],center[2],1];
  }
  replaceLabel(mesh,text,size=31){const canvas=document.createElement('canvas');canvas.width=600;canvas.height=105;const ctx=canvas.getContext('2d');ctx.fillStyle='#def7ef';ctx.font=`700 ${size}px system-ui`;ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillText(text.slice(0,56),300,52,566);this.updateTexture(mesh.tex,canvas)}
  setVRState(info){this.replaceLabel(this.liveTitle,info.title||'KLINIKLAB');this.replaceLabel(this.liveStep,info.step||'Choose a lesson',28);for(let i=0;i<7;i++)this.menuButtons[i].color=this.rgb(i===info.module?'#2b9984':'#265064');const answers=info.answers||[];for(let i=0;i<4;i++){const m=this.answerMeshes[i];m.hidden=i>=answers.length;const t=this.meshes.find(x=>x.tag===`answerlabel:${i}`);if(t){t.hidden=m.hidden;if(!m.hidden)this.replaceLabel(t,`${i+1}. ${answers[i]}`,45)}}}
  select(key){this.selectedKey=key;const col=this.rgb('#90ffee');for(const p of this.pickables){if(p.key.startsWith('tooth:') && p.mesh.tag==='crown'){const is=p.key===key;p.mesh.color=this.rgb(is?'#b9fff0':['#eee8da','#f3ebdb','#eee5d4','#f0e8d7'][Number(p.mesh.kind.split('_')[1])-1]||'#eee8da')}}}
  getRayHit(o,d,allow=null){let hit=null;for(const p of this.pickables){if(p.mesh.hidden||(allow&&!allow(p)))continue;let r=null;
      // In-world lesson controls are true rectangular targets; overlapping selection
      // spheres would otherwise make adjacent menu buttons select the wrong lesson.
      if(p.key.startsWith('module:')||p.key.startsWith('answer:')||p.key.startsWith('guide:')||p.key.startsWith('catalog:')){
        // A tutorial panel can face the headset at any yaw. Intersect the
        // front plane and check its actual rotated rectangular dimensions.
        const yaw=p.mesh.rot?.[1]||0,c=Math.cos(yaw),s=Math.sin(yaw);
        const denom=d[0]*s+d[2]*c;
        if(Math.abs(denom)>1e-6){
          const t=((p.p[0]-o[0])*s+(p.p[2]-o[2])*c+p.mesh.s[2]*.5)/denom;
          if(t>=0){
            const dx=o[0]+t*d[0]-p.p[0],dz=o[2]+t*d[2]-p.p[2];
            const localX=c*dx-s*dz,y=o[1]+t*d[1];
            if(Math.abs(localX)<=p.mesh.s[0]*.5&&Math.abs(y-p.p[1])<=p.mesh.s[1]*.5)r=t;
          }
        }
      }else r=M3.raySphere(o,d,p.p,p.radius);
      if(r!==null&&(!hit||r<hit.distance))hit={key:p.key,distance:r,point:M3.add(o,M3.mul(d,r))}
    }return hit}


  // Restore desktop transforms and hit targets exactly after the XR session.
  setXRComfort(active){
    if(Boolean(active)===this.xrComfort.active)return;
    if(active){
      const snapshot=[];
      const layout=this.xrComfortConfig||{furniture:{scale:this.xrComfortScale,pivot:[0,1.02,-1.83]},lessonBoard:{scale:.68,pivot:[-1.66,1.51,-2.13]}};
      const groups=[
        {meshes:this.vrCompactMeshes,pivot:layout.furniture.pivot,factor:layout.furniture.scale},
        {meshes:this.xrBoardMeshes,pivot:layout.lessonBoard.pivot,factor:layout.lessonBoard.scale}
      ];
      for(const group of groups){
        const members=new Set(group.meshes);
        for(const mesh of group.meshes){
          snapshot.push({kind:'mesh',object:mesh,p:mesh.p.slice(),s:mesh.s.slice(),model:mesh.model||null});
          for(let i=0;i<3;i++){
            mesh.p[i]=group.pivot[i]+(mesh.p[i]-group.pivot[i])*group.factor;
            mesh.s[i]*=group.factor;
          }
          mesh.model=null;
        }
        for(const hit of this.pickables.filter(p=>members.has(p.mesh))){
          snapshot.push({kind:'pick',object:hit,p:hit.p.slice(),radius:hit.radius});
          for(let i=0;i<3;i++)hit.p[i]=group.pivot[i]+(hit.p[i]-group.pivot[i])*group.factor;
          hit.radius*=group.factor;
        }
      }
      this.xrComfortSnapshot=snapshot;
      this.xrComfort={active:true,scale:groups[0].factor,objects:snapshot.filter(v=>v.kind==='mesh').length,lessonScale:groups[1].factor};
    }else{
      for(const item of this.xrComfortSnapshot||[]){
        item.object.p=item.p.slice();
        if(item.kind==='mesh'){item.object.s=item.s.slice();item.object.model=item.model}
        else item.object.radius=item.radius;
      }
      this.xrComfortSnapshot=null;this.xrComfort={active:false,scale:1,objects:0,lessonScale:1};
    }
  }
  installEvents(){const canvas=this.canvas;let down=null,dragged=false;canvas.addEventListener('pointerdown',e=>{if(this.xrSession)return;down={x:e.clientX,y:e.clientY,yaw:this.yaw,pitch:this.pitch};dragged=false;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!down||this.xrSession)return;let dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>5){dragged=true;canvas.classList.add('dragging')}if(dragged){this.yaw=down.yaw+dx*.008;this.pitch=Math.max(-1.2,Math.min(1.2,down.pitch+dy*.006))}});canvas.addEventListener('pointerup',e=>{if(!dragged){const ray=this.desktopRay(e.clientX,e.clientY);if(this.xrPrep?.onDesktopClick(ray)){down=null;canvas.classList.remove('dragging');return;}const hit=this.getRayHit(ray.o,ray.d);if(hit)this.onPick(hit.key)}down=null;canvas.classList.remove('dragging')});canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.min(7.5,Math.max(1.15,this.distance*Math.exp(e.deltaY*.001)))},{passive:false});window.addEventListener('resize',()=>this.resize());}
  camera(){const y=this.target[1]+this.distance*Math.sin(this.pitch);const h=this.distance*Math.cos(this.pitch),x=this.target[0]+Math.sin(this.yaw)*h,z=this.target[2]+Math.cos(this.yaw)*h;return [x,y,z]}
  view(){return M3.lookAt(this.camera(),this.target)}
  desktopRay(cx,cy){const b=this.canvas.getBoundingClientRect(),x=2*(cx-b.left)/b.width-1,y=1-2*(cy-b.top)/b.height;const P=M3.perspective(.87,b.width/b.height,.05,100),inv=M3.inverse(M3.mm(P,this.view()));const a=M3.transform(inv,[x,y,-1]),c=M3.transform(inv,[x,y,1]);const v=a.slice(0,3).map(q=>q/a[3]),w=c.slice(0,3).map(q=>q/c[3]);return {o:v,d:M3.unit(M3.sub(w,v))}}
  occlusalView(){this.focusTeeth();if(this.archMode==='both')this.setArchMode('lower');this.pitch=this.archMode==='upper'?-1.08:1.08;this.distance=1.93;this.yaw=.04}
  cycleArches(){this.archMode=this.archMode==='both'?'upper':this.archMode==='upper'?'lower':'both';this.setArchMode(this.archMode);return this.archMode}
  setArchMode(mode){this.archMode=mode;for(let i=0;i<this.archMeshes.length;i++)for(const m of this.archMeshes[i])m.hidden=mode==='upper'&&i===1||mode==='lower'&&i===0}
  focusTeeth(){this.mode='teeth';this.target=[0,1.49,-1.77];this.distance=2.25;this.yaw=.10;this.pitch=.38}
  focusRoom(){this.mode='clinic';this.target=[0,1.52,-2.6];this.distance=4.4;this.yaw=.37;this.pitch=.22}
  resetCamera(){this.target=[0,1.53,-2.23];this.distance=3.65;this.yaw=.22;this.pitch=.28}
  resize(){if(this.xrSession)return;const gl=this.gl,c=this.canvas;const w=Math.max(1,Math.round(c.clientWidth* Math.min(devicePixelRatio||1,1.6))),h=Math.max(1,Math.round(c.clientHeight*Math.min(devicePixelRatio||1,1.6)));if(c.width!==w||c.height!==h){c.width=w;c.height=h}gl.viewport(0,0,w,h)}
  draw(view,proj){const gl=this.gl,L=this.loc;gl.uniformMatrix4fv(L.uView,false,new Float32Array(view));gl.uniformMatrix4fv(L.uProj,false,new Float32Array(proj));const visible=this.xrFdiEvidence?this.meshes.filter(m=>m.kind.startsWith('xrvol-')):this.anatomyDisplayMagnification>1?this.archMeshes.flat():this.meshes;const opaque=visible.filter(m=>!m.hidden&&m.alpha>=1),transparent=visible.filter(m=>!m.hidden&&m.alpha<1);for(const m of [...opaque,...transparent]){if(m.alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false)}else{gl.disable(gl.BLEND);gl.depthMask(true)}const g=this.geom[m.kind];gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);for(const [a,k] of [[this.attr.pos,0],[this.attr.normal,3],[this.attr.uv,6]]){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,k===6?2:3,gl.FLOAT,false,32,k*4)}const model=m.model||M3.trs(m.p,m.rot,m.s);gl.uniformMatrix4fv(L.uModel,false,new Float32Array(model));const inv=M3.inverse(model);gl.uniformMatrix3fv(L.uNormal,false,new Float32Array([inv[0],inv[4],inv[8],inv[1],inv[5],inv[9],inv[2],inv[6],inv[10]]));gl.uniform3fv(L.uColor,m.color);gl.uniform1f(L.uAlpha,m.alpha);gl.uniform1f(L.uTextured,m.tex?1:0);gl.uniform1f(L.uUnlit,m.unlit?1:0);gl.uniform1f(L.uFinish,m.finish);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,m.tex||this.whiteTex);gl.uniform1i(L.uTexture,0);gl.drawArrays(gl.TRIANGLES,0,g.count)}gl.disable(gl.BLEND);gl.depthMask(true)}
  // A single desktop RAF chain owns flat rendering; XR owns only session.requestAnimationFrame.
  loop(){
    this.gl.enable(this.gl.DEPTH_TEST);this.gl.clearColor(.038,.09,.13,1);
    this.desktopRafPending=false;this.desktopLoopCount=0;this.xrFrameCount=0;
    this.animation=(time)=>{
      if(this.xrSession)return;
      this.resize();
      const eye=this.camera();
      for(const m of this.focusDecor)m.hidden=this.mode==='teeth';
      if(this.mode!=='teeth'){this.leftWall.hidden=eye[0]<-3.5;this.rightWall.hidden=eye[0]>3.5;}
      const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      this.draw(this.view(),M3.perspective(.87,this.canvas.width/this.canvas.height,.05,100));
      this.frameCount++;this.desktopLoopCount++;
    };
    this.scheduleDesktopFrame();
  }
  scheduleDesktopFrame(){
    if(this.desktopRafPending||this.xrSession)return;
    this.desktopRafPending=true;
    requestAnimationFrame(time=>{
      this.desktopRafPending=false;
      if(this.xrSession)return;
      this.animation(time);
      this.scheduleDesktopFrame();
    });
  }
  async enterVR(){
    if(this.xrSession)return this.xrSession;
    if(this.xrStarting)throw Error('A VR session is already starting; finish the headset prompt before trying again.');
    if(typeof isSecureContext!=='undefined'&&!isSecureContext)throw Error('Quest VR requires HTTPS (localhost is allowed for development). Open the secure page in Meta Quest Browser.');
    if(!navigator.xr?.requestSession)throw Error('Immersive VR is unavailable on this browser/device. Use Meta Quest Browser on a compatible headset.');
    this.xrStarting=true;
    // requestSession must begin INSIDE the click's transient user activation.
    // Do not await a support check or makeXRCompatible before requesting it.
    let session,ended=false;
    try{
      const promise=navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});
      session=await promise;session.addEventListener('end',()=>{ended=true;this.handleXREnd(session)});const gl=this.gl;
      if(gl.makeXRCompatible)await gl.makeXRCompatible();
      if(ended)throw Error('VR session ended during startup. Use Enter VR to try again.');
      session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl,{antialias:true,alpha:false,depth:true})});
      let ref;try{ref=await session.requestReferenceSpace('local-floor')}catch{ref=await session.requestReferenceSpace('local')}
      if(ended)throw Error('VR session ended during startup. Use Enter VR to try again.');
      this.xrSession=session;this.xrRef=ref;this.xrVisualDiagnostics={frames:0,eyes:{},world:{},referenceSpace:'same XRReferenceSpace throughout session'};
      this.setXRComfort(true);this.initXRTools();
      for(const m of this.focusDecor)m.hidden=false;for(const m of this.xrBoardMeshes)m.hidden=false;
      this.setXRCatalogOpen?.(false);
      this.xrGuide?.onEnter();
      const acceptsInput=()=>this.xrSession===session&&(!session.visibilityState||session.visibilityState==='visible');
      session.addEventListener('visibilitychange',()=>{if(this.xrSession!==session||session.visibilityState==='visible')return;this.clearControllers();this.resetXRTools();this.setXRCatalogOpen?.(false);this.xrPrep?.triggers?.clear();if(this.xrPrep){this.xrPrep.lastCut=null;if(this.xrPrep.tip)this.xrPrep.tip.hidden=true;}});
      session.addEventListener('selectstart',e=>{if(!acceptsInput())return;const frame=e.frame||this.latestFrame;if(frame?.session&&frame.session!==session)return;if(this.xrGuide?.onSelectStart(e,frame))return;if(this.onXRCatalogSelect?.(e,frame))return;if(this.xrPrep?.onSelectStart(e,frame))return;const pose=this.getXRInputPose(frame,e.inputSource);if(pose)this.pickXR(pose)});session.addEventListener('squeezestart',e=>{if(!acceptsInput())return;const frame=e.frame||this.latestFrame;this.onXRGripStart(e,frame)});session.addEventListener('squeezeend',e=>{if(this.xrSession===session)this.onXRGripEnd(e)});session.addEventListener('selectend',e=>{if(this.xrSession===session)this.xrPrep?.onSelectEnd(e)});this.xrPrep?.onEnter();
      session.requestAnimationFrame(this.xrLoop.bind(this));return session;
    }catch(err){
      if(session){try{await session.end()}catch{}this.handleXREnd(session)}
      if(err?.name==='NotAllowedError'||err?.name==='SecurityError')throw Error('Quest VR permission was denied or blocked. Use the Enter VR button in Meta Quest Browser.');
      if(err?.name==='NotSupportedError')throw Error('Immersive VR is not supported by this headset/browser.');
      throw err;
    }finally{this.xrStarting=false}
  }
  handleXREnd(session){
    if(this.xrSession!==session)return;
    this.xrGuide?.onExit();this.xrPrep?.onExit();this.resetXRTools();this.setXRComfort(false);
    this.xrSession=null;this.xrRef=null;this.latestFrame=null;this.clearControllers();
    for(const m of this.xrBoardMeshes)m.hidden=true;
    this.scheduleDesktopFrame();
  }
  resumeDesktop(){this.scheduleDesktopFrame()}
  xrLoop(t,frame){const session=this.xrSession;if(!session||frame?.session!==session)return;this.latestFrame=frame;this.xrFrame(t,frame);this.xrFrameCount++;if(this.xrSession===session)session.requestAnimationFrame(this.xrLoop.bind(this))}
  // Grip is intentionally separate from trigger/select and dental preparation.
  toolGripPose(frame,source){
    try{return source?.gripSpace&&frame?.getPose?.(source.gripSpace,this.xrRef)||null}catch{return null}
  }
  resetXRTool(tool){
    if(!tool?.home)return;
    for(let i=0;i<tool.meshes.length;i++){
      const m=tool.meshes[i],h=tool.home[i];
      m.p=h.p.slice();m.s=h.s.slice();m.rot=h.rot.slice();m.model=h.model;
      m.color=h.color.slice();
    }
    tool.owner=null;tool.hover=null;
  }
  resetXRTools(){for(const tool of this.xrTableTools||[])this.resetXRTool(tool)}
  initXRTools(){
    for(const tool of this.xrTableTools||[]){
      tool.home=tool.meshes.map(m=>({p:m.p.slice(),s:m.s.slice(),rot:m.rot.slice(),model:m.model||null,color:m.color.slice()}));
      tool.owner=null;tool.hover=null;
    }
  }
  // Within hand reach of a real grip pose, not an unlimited ray grab.
  nearestXRTool(position){
    let best=null,dist=.23;
    for(const tool of this.xrTableTools||[]){
      if(tool.owner)continue;
      const p=tool.home?.[0]?.p||tool.meshes[0]?.p;
      if(!p)continue;
      const d=Math.hypot(...p.map((v,i)=>v-position[i]));
      if(d<dist){dist=d;best=tool}
    }
    return best;
  }
  onXRGripStart(event,frame){
    const source=event?.inputSource,hand=source?.handedness;
    if(!['left','right'].includes(hand)||!this.xrSession)return false;
    const existing=(this.xrTableTools||[]).find(t=>t.owner===hand);
    if(existing)return true;
    const pose=this.toolGripPose(frame,source);
    if(!pose)return false;
    const p=pose.transform.position,point=[p.x,p.y,p.z];
    const tool=this.nearestXRTool(point);
    if(!tool)return false;
    tool.owner=hand;tool.hover=null;
    // A dental instrument sits in the pinch grip with its working end extending
    // forward along controller -Z. The handle begins ahead of the controller ring,
    // rather than retaining the tray's world-space offset inside the controller.
    // Store immutable grip-local models once: subsequent frames are pure 6DoF.
    const anchor=tool.home[0].p;
    const side=hand==='left'?-1:1;
    const gripOffset=[side*.025,-.025,-.25];
    tool.localModels=tool.home.map(h=>{
      const relative=h.p.map((v,i)=>v-anchor[i]+gripOffset[i]);
      return M3.trs(relative,h.rot,h.s);
    });
    return true;
  }
  onXRGripEnd(event){
    const hand=event?.inputSource?.handedness;
    const tool=(this.xrTableTools||[]).find(t=>t.owner===hand);
    if(!tool)return false;
    this.resetXRTool(tool);return true;
  }
  updateXRTools(frame){
    const connected=new Set([...frame.session.inputSources].map(source=>source.handedness));
    for(const tool of this.xrTableTools||[]){if(tool.owner&&!connected.has(tool.owner))this.resetXRTool(tool);tool.hover=null;}
    for(const source of frame.session.inputSources){
      const hand=source.handedness;
      if(!['left','right'].includes(hand))continue;
      const pose=this.toolGripPose(frame,source);
      const held=(this.xrTableTools||[]).find(t=>t.owner===hand);
      if(!pose){if(held)this.resetXRTool(held);continue}
      const p=pose.transform.position,point=[p.x,p.y,p.z];
      if(held){
        const matrix=this.controllerMatrix(pose);
        held.meshes.forEach((m,i)=>{m.model=M3.mm(matrix,held.localModels[i])});
      }else{
        const nearby=this.nearestXRTool(point);
        if(nearby)nearby.hover=hand;
      }
    }
    for(const tool of this.xrTableTools||[]){
      // Hover tint is a view-only cue; ownership never changes from hovering.
      const base=tool.home?.[0]?.color;
      if(base)tool.meshes[0].color=tool.hover?this.rgb('#87ffce'):base.slice();
    }
  }
  getXRInputPose(frame,source){
    if(!frame?.getPose||!source?.targetRaySpace||!this.xrRef)return null;
    try{return frame.getPose(source.targetRaySpace,this.xrRef)||null}catch{return null}
  }
  pickXR(pose){const q=pose.transform.orientation,p=pose.transform.position;const origin=[p.x,p.y,p.z],dir=this.rotateByQuat([0,0,-1],q),hit=this.getRayHit(origin,dir);if(hit)this.onPick(hit.key)}
  rotateByQuat(v,q){const u=[q.x,q.y,q.z],t=M3.mul(M3.cross(u,v),2);return M3.add(v,M3.add(M3.mul(t,q.w),M3.cross(u,t)))}
  clearControllers(){for(const c of this.xrControllers){c.active=false;c.gripValid=false;c.aimValid=false;c.profiles=[];c.buttons={trigger:false,grip:false,thumbstick:false,primary:false,secondary:false};for(const m of c.parts){m.hidden=true;m.model=null;}c.ray.hidden=true;c.ray.model=null;}}
  xrFrame(t,frame){const gl=this.gl;let pose;try{pose=frame.getViewerPose(this.xrRef)}catch{pose=null}if(!pose){this.clearControllers();this.xrPrep?.triggers?.clear();if(this.xrPrep){this.xrPrep.lastCut=null;if(this.xrPrep.tip)this.xrPrep.tip.hidden=true;}return}this.placeTeachingAnatomy?.(pose);this.xrGuide?.placeForViewer(pose);this.updateXRTools(frame);const used=new Set();for(const source of frame.session.inputSources){const slot=source.handedness==='left'?0:source.handedness==='right'?1:[0,1].find(i=>!used.has(i));if(slot===undefined||used.has(slot))continue;used.add(slot);this.updateXRController(slot,source,frame);}
    for(let i=0;i<this.xrControllers.length;i++)if(!used.has(i)){const c=this.xrControllers[i];c.active=false;c.gripValid=false;c.aimValid=false;for(const m of c.parts){m.hidden=true;m.model=null;}c.ray.hidden=true;c.ray.model=null;}
    this.xrPrep?.onXRFrame(frame,t);
    // Phase 2: measure matrices actually submitted to rendering, separate from input pose.
    // A fixed world mesh is sampled after tutorial/controller updates; no pose smoothing.
    if(!this.xrVisualDiagnostics)this.xrVisualDiagnostics={frames:0,eyes:{},world:{},referenceSpace:'same XRReferenceSpace throughout session'};
    const diag=this.xrVisualDiagnostics;
    const track=(stat,matrix)=>{
      if(!matrix||matrix.length!==16)return;
      const value=Array.from(matrix);
      if(!stat.first)stat.first=value;
      if(stat.last)stat.maxStep=Math.max(stat.maxStep||0,...value.map((v,i)=>Math.abs(v-stat.last[i])));
      stat.maxFromFirst=Math.max(stat.maxFromFirst||0,...value.map((v,i)=>Math.abs(v-stat.first[i])));
      stat.last=value;stat.samples=(stat.samples||0)+1;
    };
    const fixed=this.meshes?.[0];
    if(fixed)track(diag.world,fixed.model||M3.trs(fixed.p,fixed.rot,fixed.s));
    diag.frames++;
    for(const [index,view] of pose.views.entries())track(diag.eyes[index]||(diag.eyes[index]={}),view.transform.inverse.matrix);
    const layer=frame.session.renderState.baseLayer;gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);for(const view of pose.views){const vp=layer.getViewport(view);gl.viewport(vp.x,vp.y,vp.width,vp.height);this.draw(view.transform.inverse.matrix,view.projectionMatrix)}
  }
}
