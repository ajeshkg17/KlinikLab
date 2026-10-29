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
  const state={mode:'idle',ready:false,loaded:0,expected:16,instances:0,visibleInstances:0,triangles:0,failures:[],error:null,
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
    state.mode='loading';state.ready=false;state.error=null;state.failures=[];state.loaded=0;state.instances=0;state.triangles=0;state.vertexColoredInstances=0;
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
  }
  root.KlinikRealMesh={filename,parseKind,sliceTriangle,cropMesh,replace,sync,state};
})(typeof window!=='undefined'?window:globalThis);