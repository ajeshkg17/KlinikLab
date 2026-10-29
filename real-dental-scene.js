'use strict';
/* KlinikLab main-scene Dundee tooth crowns.
   University of Dundee School of Dentistry, CC BY 4.0; derived GLBs repacked
   by sameralseedbth-Dental/dental-3d-models, as attributed in the tooth atlas.
   Display-only: never replaces clinical selection geometry or drillable volume. */
(function(root){
  const DIR='assets/dundee/';
  const LOADER='https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js';
  const PAIRS=Object.freeze([
    ['maxillary_left_central_incisor','mandibular_left_central_incisor'],
    ['maxillary_lateral_incisor','mandibular_left_lateral_incisor'],
    ['maxillary_canine','mandibular_left_canine'],
    ['maxillary_first_premolar','mandibular_first_premolar'],
    ['maxillary_second_premolar','mandibular_left_second_premolar'],
    ['maxillary_first_molar','mandibular_first_molar'],
    ['maxillary_second_molar','mandibular_second_molar'],
    ['maxillary_third_molar','mandibular_third_molar']
  ]);
  const HEIGHTS=[0,.167,.181,.166,.153];
  const STYLE=Object.freeze([0,1,1,2,3,3,4,4,4]);
  const state={mode:'idle',ready:false,loaded:0,expected:16,instances:0,visibleInstances:0,triangles:0,surfaceDiagnostics:null,failures:[],error:null,
    source:'University of Dundee, School of Dentistry (CC BY 4.0)',surfaceOnly:true,webxr:false};
  root.KlinikRealTeeth=state;

  function filename(upper,tooth){
    if(!Number.isInteger(tooth)||tooth<1||tooth>8)throw Error('Invalid tooth index');
    return PAIRS[tooth-1][upper?0:1]+'.glb';
  }
  function parseKind(kind){
    const m=/^crown_([1-4])_([01])_([1-8])$/.exec(kind||'');
    return m?{style:Number(m[1]),upper:m[2]==='0',tooth:Number(m[3])}:null;
  }
  // Interpolate attributes so the gingival trim does not tear open triangles.
  function sliceTriangle(triangle,cut,upper){
    const inside=v=>upper?v.p[1]<=cut+1e-7:v.p[1]>=cut-1e-7;
    const lerp=(a,b)=>{
      const t=Math.max(0,Math.min(1,(cut-a.p[1])/(b.p[1]-a.p[1]||1e-9)));
      return {p:a.p.map((x,i)=>x+(b.p[i]-x)*t),uv:a.uv.map((x,i)=>x+(b.uv[i]-x)*t),
        n:a.n.map((x,i)=>x+(b.n[i]-x)*t)};
    };
    const out=[];
    for(let i=0;i<3;i++){
      const a=triangle[i],b=triangle[(i+1)%3],ia=inside(a),ib=inside(b);
      if(ia)out.push(a);
      if(ia!==ib)out.push(lerp(a,b));
    }
    const fans=[];
    for(let i=1;i+1<out.length;i++)fans.push([out[0],out[i],out[i+1]]);
    return fans;
  }
  function cropMesh(triangles,upper,style){
    if(!triangles.length)throw Error('Empty anatomical tooth model');
    const mins=[Infinity,Infinity,Infinity],maxs=[-Infinity,-Infinity,-Infinity];
    for(const t of triangles)for(const v of t)for(let d=0;d<3;d++){
      mins[d]=Math.min(mins[d],v.p[d]);maxs[d]=Math.max(maxs[d],v.p[d]);
    }
    const height=maxs[1]-mins[1];
    if(!(height>0.00001)||!(maxs[0]-mins[0]>0)||!(maxs[2]-mins[2]>0))throw Error('Invalid model bounds');
    // The Dundee maxillary files have occlusal crowns at negative world Y;
    // mandibular crown surfaces are at positive world Y. Roots are deliberately
    // cropped: our current arch does not include realistic alveolar bone.
    const cut=upper?mins[1]+height*.47:maxs[1]-height*.47;
    const capHeight=upper?cut-mins[1]:maxs[1]-cut;
    const width=maxs[0]-mins[0],depth=maxs[2]-mins[2];
    const zFactor=style===1?.76:style===2?.86:style===3?.93:1;
    const sx=1.84/width,sy=HEIGHTS[style]/capHeight,sz=1.84*zFactor/depth;
    const positions=[],normals=[],uvs=[],indices=[];
    for(const tri of triangles)for(const clipped of sliceTriangle(tri,cut,upper)){
      for(const v of clipped){
        positions.push((v.p[0]-(mins[0]+maxs[0])/2)/width*1.84,
          (v.p[1]-cut)/capHeight*HEIGHTS[style],
          (v.p[2]-(mins[2]+maxs[2])/2)/depth*1.84*zFactor);
        // The mesh is stretched independently along three axes. Transform
        // surface normals by inverse scale so enamel highlights remain correct.
        const n=[v.n[0]/sx,v.n[1]/sy,v.n[2]/sz];
        const len=Math.hypot(...n)||1;normals.push(n[0]/len,n[1]/len,n[2]/len);
        uvs.push(...v.uv);
        indices.push(indices.length);
      }
    }
    if(indices.length<15)throw Error('Anatomy model crop contains too few triangles');
    return {positions,normals,uvs,indices,trim:cut,originalHeight:height,crownHeight:HEIGHTS[style]};
  }
  function loadScript(url,ready){
    if(ready())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=url;script.async=true;script.crossOrigin='anonymous';
      const timer=setTimeout(()=>{script.remove();reject(Error('GLB loader timed out'))},14000);
      script.onload=()=>{clearTimeout(timer);ready()?resolve():reject(Error('GLB loader failed to initialize'))};
      script.onerror=()=>{clearTimeout(timer);reject(Error('Cannot load GLB loader'))};
      document.head.appendChild(script);
    });
  }
  function configureDecoder(B){
    const base=new URL('assets/draco/',location.href).href;
    const decoder={wasmUrl:base+'draco_wasm_wrapper_gltf.js',wasmBinaryUrl:base+'draco_decoder_gltf.wasm',fallbackUrl:base+'draco_decoder_gltf.js'};
    if(B.DracoDecoder?.DefaultConfiguration)Object.assign(B.DracoDecoder.DefaultConfiguration,decoder);
    if(B.DracoCompression){B.DracoCompression.Configuration={decoder};
      try{Object.assign(B.DracoCompression.Configuration.decoder,decoder)}catch{}}
  }
  async function replace(layer){
    if(state.mode==='loading'||state.mode==='ready')return;
    state.mode='loading';state.ready=false;state.error=null;state.failures=[];state.loaded=0;state.instances=0;state.triangles=0;state.vertexColoredInstances=0;state.surfaceDiagnostics=null;
    const B=layer.B;
    try{
      await loadScript(LOADER,()=>!!B.GLTFFileLoader);
      configureDecoder(B);
      const loadOne=async(upperIndex,tooth)=>{
          const upper=upperIndex===0;
          const kind=`crown_${STYLE[tooth]}_${upperIndex}_${tooth}`;
          const items=layer.items.filter(item=>item.source.kind===kind&&item.source.tag==='crown');
          if(!items.length)return;
          let result;
          try{
            result=await B.SceneLoader.ImportMeshAsync(null,DIR,filename(upper,tooth),layer.scene,undefined,'.glb');
            const meshes=result.meshes.filter(x=>typeof x.getTotalVertices==='function'&&x.getTotalVertices()>0);
            if(!meshes.length)throw Error('Empty dental mesh');
            const tris=[];
            for(const mesh of meshes){
              mesh.computeWorldMatrix(true);
              const world=mesh.getWorldMatrix(),positions=mesh.getVerticesData(B.VertexBuffer.PositionKind),
                normals=mesh.getVerticesData(B.VertexBuffer.NormalKind),
                uvs=mesh.getVerticesData(B.VertexBuffer.UVKind),index=mesh.getIndices();
              if(!positions||!index)continue;
              const vertices=[];
              for(let v=0;v<positions.length/3;v++){
                const p=B.Vector3.TransformCoordinates(B.Vector3.FromArray(positions,v*3),world),
                  n=normals?B.Vector3.TransformNormal(B.Vector3.FromArray(normals,v*3),world):new B.Vector3(0,1,0);
                vertices.push({p:[p.x,p.y,p.z],n:[n.x,n.y,n.z],uv:uvs?[uvs[v*2],uvs[v*2+1]]:[0,0]});
              }
              for(let i=0;i+2<index.length;i+=3)tris.push([vertices[index[i]],vertices[index[i+1]],vertices[index[i+2]]]);
            }
            const cropped=cropMesh(tris,upper,STYLE[tooth]);
            const template=new B.Mesh('licensed-tooth-template:'+kind,layer.scene);
            const data=new B.VertexData();Object.assign(data,cropped);delete data.trim;delete data.originalHeight;delete data.crownHeight;
            // Preserve Dundee geometry while providing a deterministic educational
            // enamel shade. No imported texture, palette network fetch or patient data.
            const appearance=root.KlinikDentalAppearance;
            if(appearance)data.colors=appearance.crownColors(cropped.positions,upper,STYLE[tooth]);
            data.applyToMesh(template,true);
            template.useVertexColors=!!data.colors;
            template.isVisible=false;template.isPickable=false;
            for(const item of items){
              const mesh=template.clone('dundee:'+item.source.key,null,true);
              mesh.isVisible=true;mesh.isPickable=false;
              mesh.alwaysSelectAsActiveMesh=true;
              // One common PBR appearance for licensed and procedural enamel.
              // Imported GLB materials remain on the hidden source mesh.
              mesh.material=layer.materialFor(item.source,0);
              item.realMesh=mesh;
              state.instances++;
              if(data.colors)state.vertexColoredInstances=(state.vertexColoredInstances||0)+1;
            }
            state.loaded++;
            state.triangles+=cropped.indices.length/3;
            // Hide source import, but keep its embedded material textures alive.
            for(const mesh of result.meshes){mesh.isVisible=false;mesh.isPickable=false;}
          }catch(error){
            if(result?.meshes)for(const mesh of result.meshes){mesh.isVisible=false;mesh.isPickable=false;}
            state.failures.push({file:filename(upper,tooth),message:String(error.message||error).slice(0,160)});
          }
      };
      // Four bounded loaders prevent a Draco/WebGL decode spike in the browser.
      // Every crown has an individual failure fallback to the procedural mesh.
      let next=0;
      await Promise.all(Array.from({length:4},async()=>{
        while(next<16){const i=next++;await loadOne(Math.floor(i/8),i%8+1)}
      }));
      state.archDiagnostics=layer.anatomyLayout?.diagnostics||null;
      state.appearanceVersion=root.KlinikDentalAppearance?.version||0;
      state.ready=state.instances>0;
      state.mode=state.ready?'ready':'error';
      if(!state.ready)state.error='None of the bundled Dundee crowns could be loaded.';
    }catch(error){state.mode='error';state.error=String(error.message||error).slice(0,180);}
  }

  // Mesh proximity is a sampled desktop QA metric in uncalibrated scene units.
  // It never changes FDI positions, drillable geometry, or hit-testing.
  const CONTACT_EDGES=[[0,1],[1,2],[2,0]];
  const subtract=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const squared=v=>dot(v,v);
  const clip01=x=>Math.max(0,Math.min(1,x));
  function pointSegmentSquared(p,a,b){
    const v=subtract(b,a),len=squared(v);
    const t=len>1e-15?clip01(dot(subtract(p,a),v)/len):0;
    return squared(subtract(p,a.map((x,i)=>x+t*v[i])));
  }
  function pointTriangleSquared(p,t){
    const [a,b,c]=t,ab=subtract(b,a),ac=subtract(c,a),n=cross(ab,ac),n2=squared(n);
    if(n2>1e-15){
      const projection=subtract(p,n.map(x=>dot(subtract(p,a),n)/n2*x));
      const v=subtract(projection,a);
      const d00=dot(ab,ab),d01=dot(ab,ac),d11=dot(ac,ac);
      const d20=dot(v,ab),d21=dot(v,ac),det=d00*d11-d01*d01;
      if(det>1e-15){
        const u=(d11*d20-d01*d21)/det,w=(d00*d21-d01*d20)/det;
        if(u>=-1e-10&&w>=-1e-10&&u+w<=1+1e-10)return squared(subtract(p,projection));
      }
    }
    return Math.min(...CONTACT_EDGES.map(([i,j])=>pointSegmentSquared(p,t[i],t[j])));
  }
  function segmentSegmentSquared(p,q,r,s){
    const u=subtract(q,p),v=subtract(s,r),w=subtract(p,r);
    let best=Math.min(pointSegmentSquared(p,r,s),pointSegmentSquared(q,r,s),
      pointSegmentSquared(r,p,q),pointSegmentSquared(s,p,q));
    const a=dot(u,u),b=dot(u,v),c=dot(v,v),d=dot(u,w),e=dot(v,w),den=a*c-b*b;
    if(den>1e-15){
      const x=(b*e-c*d)/den,y=(a*e-b*d)/den;
      if(x>=0&&x<=1&&y>=0&&y<=1)
        best=Math.min(best,squared(subtract(p.map((z,i)=>z+x*u[i]),r.map((z,i)=>z+y*v[i]))));
    }
    return best;
  }
  function segmentHitsTriangle(p,q,t){
    const direction=subtract(q,p),edge1=subtract(t[1],t[0]),edge2=subtract(t[2],t[0]);
    const h=cross(direction,edge2),det=dot(edge1,h);
    if(Math.abs(det)<1e-12)return false;
    const f=1/det,s=subtract(p,t[0]),u=f*dot(s,h);
    if(u<-1e-10||u>1+1e-10)return false;
    const qv=cross(s,edge1),v=f*dot(direction,qv),fraction=f*dot(edge2,qv);
    return v>=-1e-10&&u+v<=1+1e-10&&fraction>=-1e-10&&fraction<=1+1e-10;
  }
  function triangleBounds(t){
    return [0,1,2].map(k=>[Math.min(t[0][k],t[1][k],t[2][k]),
      Math.max(t[0][k],t[1][k],t[2][k])]);
  }
  function boxesDistanceSquared(a,b){
    let d=0;
    for(let i=0;i<3;i++){
      const gap=Math.max(0,a[i][0]-b[i][1],b[i][0]-a[i][1]);
      d+=gap*gap;
    }
    return d;
  }
  function surfaceDistance(trianglesA,trianglesB){
    for(const triangles of [trianglesA,trianglesB]){
      if(!Array.isArray(triangles)||!triangles.length)throw Error('Surface triangles required');
      for(const t of triangles){
        if(!Array.isArray(t)||t.length!==3||t.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))
          throw Error('Surface triangle coordinates must be finite xyz triples');
      }
    }
    const boundsA=trianglesA.map(triangleBounds),boundsB=trianglesB.map(triangleBounds);
    let best=Infinity,intersection=false,comparisons=0;
    for(let i=0;i<trianglesA.length&&best>0;i++)for(let j=0;j<trianglesB.length;j++){
      if(boxesDistanceSquared(boundsA[i],boundsB[j])>best)continue;
      const a=trianglesA[i],b=trianglesB[j];comparisons++;
      for(const [x,y] of CONTACT_EDGES){
        if(segmentHitsTriangle(a[x],a[y],b)||segmentHitsTriangle(b[x],b[y],a)){
          best=0;intersection=true;break;
        }
      }
      if(intersection)break;
      for(const p of a)best=Math.min(best,pointTriangleSquared(p,b));
      for(const p of b)best=Math.min(best,pointTriangleSquared(p,a));
      for(const [u,v] of CONTACT_EDGES)for(const [x,y] of CONTACT_EDGES)
        best=Math.min(best,segmentSegmentSquared(a[u],a[v],b[x],b[y]));
    }
    return {distance:Math.sqrt(best),intersectsSampledTriangles:intersection,
      sampledTrianglesA:trianglesA.length,sampledTrianglesB:trianglesB.length,
      comparedTrianglePairs:comparisons,units:'KlinikLab scene units (not mm)',
      limitations:'Deterministic subsampled surfaces; minimum is an upper bound on true separation. Intersection is not penetration depth.'};
  }
  function sampledMeshTriangles(mesh,B,maxTriangles=48){
    const vertices=mesh?.getVerticesData?.(B.VertexBuffer.PositionKind),indices=mesh?.getIndices?.();
    if(!vertices||!indices||indices.length<3)return null;
    const world=mesh.computeWorldMatrix(true),triangles=[],total=Math.floor(indices.length/3);
    const stride=Math.max(1,Math.ceil(total/maxTriangles));
    for(let i=0;i<total;i+=stride){
      const triangle=[];
      for(let j=0;j<3;j++){
        const k=indices[i*3+j],source=B.Vector3.FromArray(vertices,k*3);
        const p=B.Vector3.TransformCoordinates(source,world);
        triangle.push([p.x,p.y,p.z]);
      }
      triangles.push(triangle);
    }
    return triangles;
  }

  // Exact projected world-space Y extrema of the displayed crown's vertices.
  // This is only a 1D projection, not tooth collision/occlusal contact.
  function meshYBounds(mesh,B){
    const positions=mesh?.getVerticesData?.(B.VertexBuffer.PositionKind);
    if(!positions||positions.length<9||positions.length%3) return null;
    const matrix=mesh.computeWorldMatrix(true);
    let min=Infinity,max=-Infinity;
    for(let i=0;i<positions.length;i+=3){
      const v=B.Vector3.FromArray(positions,i);
      const y=B.Vector3.TransformCoordinates(v,matrix).y;
      if(!Number.isFinite(y))throw Error('Nonfinite world-space tooth vertex');
      min=Math.min(min,y);max=Math.max(max,y);
    }
    return {min,max};
  }
  function opposingFDIPairs(){
    const pairs=[];
    for(const [upper,lower] of [['1','4'],['2','3']])
      for(let n=1;n<=8;n++)pairs.push([upper+n,lower+n]);
    return pairs;
  }
  function measureArchSurfaces(layer){
    const byId=Object.create(null),cache=Object.create(null),pairs=[];
    for(const item of layer.items||[]){
      const id=/^tooth:([1-4][1-8])$/.exec(item.source?.key||'')?.[1];
      if(id&&item.realMesh)byId[id]=item.realMesh;
    }
    for(const arch of layer.anatomyLayout?.arches||[])for(let i=0;i+1<arch.length;i++){
      const first=arch[i].id,second=arch[i+1].id;
      if(!cache[first]&&byId[first])cache[first]=sampledMeshTriangles(byId[first],layer.B);
      if(!cache[second]&&byId[second])cache[second]=sampledMeshTriangles(byId[second],layer.B);
      const a=cache[first],b=cache[second],pair=first+'-'+second;
      if(!a||!b){pairs.push({pair,status:'unavailable'});continue;}
      const measurement=surfaceDistance(a,b);
      pairs.push({pair,distance:Number(measurement.distance.toFixed(6)),
        intersectsSampledTriangles:measurement.intersectsSampledTriangles,
        status:measurement.intersectsSampledTriangles?'sampled facet intersection':
          measurement.distance<=.008?'near in sample':'no near contact observed in sample',
        sampledTriangles:[a.length,b.length]});
    }
    const verticalBounds=Object.create(null),opposingPairs=[];
    for(const [first,second] of opposingFDIPairs()){
      const pair=first+'-'+second;
      if(!cache[first]&&byId[first])cache[first]=sampledMeshTriangles(byId[first],layer.B);
      if(!cache[second]&&byId[second])cache[second]=sampledMeshTriangles(byId[second],layer.B);
      const a=cache[first],b=cache[second];
      if(!a||!b){opposingPairs.push({pair,status:'unavailable'});continue;}
      if(!verticalBounds[first])verticalBounds[first]=meshYBounds(byId[first],layer.B);
      if(!verticalBounds[second])verticalBounds[second]=meshYBounds(byId[second],layer.B);
      const upper=verticalBounds[first],lower=verticalBounds[second];
      if(!upper||!lower){opposingPairs.push({pair,status:'no vertex bounds'});continue;}
      const gap=upper.min-lower.max,measurement=surfaceDistance(a,b);
      opposingPairs.push({
        pair,
        projectedVerticalClearance:Number(gap.toFixed(6)),
        sampledSurfaceDistance:Number(measurement.distance.toFixed(6)),
        intersectsSampledTriangles:measurement.intersectsSampledTriangles,
        status:measurement.intersectsSampledTriangles?'sampled facet intersection':
          gap>.008?'vertical projection separated':
          gap<-.008?'vertical projections overlap (not necessarily contact)':
          'near vertically (not necessarily contact)',
        sampledTriangles:[a.length,b.length]});
    }
    return {pairs,opposingPairs,teethMeasured:Object.keys(cache).length,units:'KlinikLab scene units (not mm)',
      contactThreshold:.008,source:'licensed Dundee crown display meshes, cropped and normalized',
      method:'3D sampled triangle-triangle proximity (48 triangles per crown maximum) with full-vertex vertical projection extrema for opposing FDI pairs',
      limitations:'Projected vertical clearance = minimum upper world Y minus maximum lower world Y; negative can reflect lateral separation despite Y overlap. No calibrated bite registration, complete contact analysis, penetration depth or clinical occlusion. Open cropped surfaces are not solid teeth.'};
  }

  function sync(layer){
    if(!state.ready)return;
    const B=layer.B;
    let visibleInstances=0;
    for(const item of layer.items){
      const mesh=item.realMesh;if(!mesh)continue;
      const source=item.source,original=item.mesh;
      const active=layer.visible&&layer.app.viewMode==='3d'&&!layer.source.xrSession&&!source.hidden;
      const useLicensed=layer.crownSource!=='procedural';
      original.isVisible=active&&!useLicensed;
      mesh.isVisible=active&&useLicensed;
      if(!active||!useLicensed)continue;
      visibleInstances++;
      const id=source.key?.split(':')[1]||'';
      // Existing source geometry is mirrored across the midline for contralateral teeth.
      // Preserve the stable tooth IDs and the original canvas's picking targets.
      const site=layer.anatomyLayout?.byId[id];
      const right=site?site.mirrored:(id[0]==='1'||id[0]==='4');
      const p=site?.p||source.p,scale=site?.s||source.s,rotation=site?.rot||source.rot;
      mesh.position.set(...p);
      mesh.scaling.set(right?-scale[0]:scale[0],scale[1],scale[2]);
      mesh.rotation.set(...rotation);
      const tint=source.key===layer.source.selectedKey?new B.Color3(.64,.96,.87):new B.Color3(1,1,1);
      if(mesh.material?.albedoColor)mesh.material.albedoColor=tint;
      if(mesh.material){
        const explorer=root.KlinikStructureExplorer?.status;
        const wanted=explorer?.focusSelected&&explorer.selectedFDI?'tooth:'+explorer.selectedFDI:null;
        mesh.material.alpha=wanted&&source.key!==wanted?Math.min(source.alpha,.19):source.alpha;
      }
    }
    state.visibleInstances=visibleInstances;
    // Run once on the fully visible desktop licensed arch; never inside XR.
    if(visibleInstances===32&&!state.surfaceDiagnostics&&layer.crownSource!=='procedural'){
      try{state.surfaceDiagnostics=measureArchSurfaces(layer)}
      catch(error){state.surfaceDiagnostics={error:String(error.message||error),units:'scene units'}}
    }
  }
  root.KlinikRealMesh={filename,parseKind,sliceTriangle,cropMesh,surfaceDistance,measureArchSurfaces,replace,sync,state};
})(typeof window!=='undefined'?window:globalThis);