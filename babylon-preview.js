'use strict';
/* KlinikLab Babylon.js desktop preview. Does not alter WebXR or cutting logic.
   Experimental rendering; reuses intentionally synthetic existing geometry.
   Third-party Babylon.js script is fetched only after the user opts in.
   If loading/rendering fails, the original canvas remains fully functional. */
(() => {
  const LIBRARY = 'https://cdn.babylonjs.com/babylon.js';
  const status = {mode:'classic', ready:false, loading:false, meshes:0, frames:0, error:null,environment:'disabled',
    library:'Babylon.js (official learning CDN)', headsetRendering:'legacy-WebXR',enhancedCrowns:0,enhancedGingiva:0,anatomyVersion:0,appearance:'balanced',appearanceVersion:0,vertexColoredTemplates:0,jawVisible:false,jawMeshes:0,fineCrownTemplates:0,fineCrownVertices:0,crownSource:'dundee'};
  window.KlinikBabylon = status;
  let layer = null;
  let loadingPromise = null;

  function loadLibrary() {
    if (window.BABYLON?.Engine && window.BABYLON?.Mesh) return Promise.resolve(window.BABYLON);
    if (loadingPromise) return loadingPromise;
    loadingPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      script.src = LIBRARY;
      script.async = true;
      script.crossOrigin = 'anonymous';
      let done = false;
      const fail = reason => { if(done)return; done=true; clearTimeout(timer);script.remove();reject(new Error(reason)); };
      const timer = setTimeout(() => fail('Babylon CDN timed out; original graphics retained.'), 14000);
      script.onload = () => {
        if(done)return;
        done=true; clearTimeout(timer);
        if(window.BABYLON?.Engine)resolve(window.BABYLON);
        else reject(new Error('Babylon global was not installed by the script.'));
      };
      script.onerror = () => fail('Babylon CDN unavailable or blocked by Content Security Policy.');
      document.head.appendChild(script);
    }).catch(error => {loadingPromise=null;throw error});
    return loadingPromise;
  }

  class BabylonDesktopLayer {
    constructor(app,B) {
      if(!app?.scene?.geom || !app.scene.meshes || !document.querySelector('#stage canvas#scene'))
        throw new Error('KlinikLab desktop WebGL scene is not available.');
      this.source=app.scene;
      this.app=app;
      this.B=B;
      this.stage=document.getElementById('stage');
      this.canvas=document.createElement('canvas');
      this.canvas.id='babylon-preview';
      this.canvas.setAttribute('aria-hidden','true');
      this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none;touch-action:none;';
      // Sibling order preserves the original canvas hit testing and HTML overlay controls.
      this.source.canvas.insertAdjacentElement('afterend',this.canvas);
      this.engine=new B.Engine(this.canvas,true,{preserveDrawingBuffer:true,stencil:true,doNotHandleContextLost:false},true);
      this.scene=new B.Scene(this.engine);
      this.scene.useRightHandedSystem=true;
      this.scene.clearColor=new B.Color4(.037,.070,.100,1);
      this.scene.ambientColor=new B.Color3(.30,.36,.41);
      this.scene.imageProcessingConfiguration.contrast=1.10;
      this.scene.imageProcessingConfiguration.exposure=1.20;
      this.scene.imageProcessingConfiguration.toneMappingEnabled=true;
      this.scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
      // Environment maps are disabled until a self-hosted, verified asset is available.
      // Avoid relying on external textures that failed to initialize during QA.
      this.camera=new B.FreeCamera('matchingOriginalCamera',new B.Vector3(0,1,4),this.scene);
      this.camera.fov=.87;
      this.camera.minZ=.05;
      this.camera.maxZ=100;
      this.camera.inputs.clear(); // Original canvas owns orbit, scroll, and selection.
      this.scene.activeCamera=this.camera;
      const soft=new B.HemisphericLight('clinicalFill',new B.Vector3(.18,1,.25),this.scene);
      soft.intensity=.69;
      soft.groundColor=new B.Color3(.22,.26,.34);
      const key=new B.DirectionalLight('clinicalKey',new B.Vector3(-.38,-.75,-.67),this.scene);
      key.intensity=1.26;
      key.diffuse=new B.Color3(1,.95,.86);
      const fill=new B.DirectionalLight('clinicalCoolFill',new B.Vector3(.72,-.38,.68),this.scene);
      fill.intensity=.30;
      fill.diffuse=new B.Color3(.69,.83,1);
      const rim=new B.PointLight('dentalRim',new B.Vector3(1.7,2.8,.8),this.scene);
      rim.intensity=.44;
      rim.range=9;
      this.lights={hemi:soft,key,fill,rim};
      this.appearanceMode=status.appearance;
      window.KlinikDentalAppearance?.applyLighting(this.scene,this.lights,this.appearanceMode);
      status.appearanceVersion=window.KlinikDentalAppearance?.version||0;
      this.geometry=new Map();
      this.items=[];
      this.materials=new Map();
      this.frame=0;
      this.lastSize='';
      this.realTeethStarted=false;
      this.build();
      this.engine.runRenderLoop(()=>{
        if(!this.visible)return;
        try{
          this.sync();this.scene.render();status.frames++;
        }catch(e){this.disable();status.mode='classic';status.error=String(e.message||e).slice(0,220);}
      });
      window.addEventListener('resize',()=>{if(this.visible)this.engine.resize()});
      this.visible=false;
    }
    color(rgb){const B=this.B;return new B.Color3(rgb[0],rgb[1],rgb[2])}
    baseMesh(kind){
      if(this.geometry.has(kind))return this.geometry.get(kind);
      // Replace only the Babylon preview's crown meshes; the original browser,
      // VR selection geometry, and actual preparation volume stay untouched.
      if((kind.startsWith('crown_')||kind.startsWith('gingiva')||kind.startsWith('jaw')) && window.KlinikBabylonAnatomy?.createTemplate){
        try {
          const anatomy=window.KlinikBabylonAnatomy.createTemplate(this.B,this.scene,kind,this.anatomyLayout);
          if(anatomy){this.geometry.set(kind,anatomy);
            if(anatomy.metadata?.appearanceVersion)status.vertexColoredTemplates++;
            if(kind.startsWith('crown_')){
              status.enhancedCrowns++;
              if(anatomy.metadata?.vertices>3169){
                status.fineCrownTemplates++;
                status.fineCrownVertices+=anatomy.metadata.vertices;
              }
            }
            else if(kind.startsWith('gingiva')) {status.enhancedGingiva++;status.gingivalVertices=(status.gingivalVertices||0)+(anatomy.metadata?.vertices||0);status.gingivalTriangles=(status.gingivalTriangles||0)+(anatomy.metadata?.triangles||0);}
            status.anatomyVersion=window.KlinikBabylonAnatomy.version;
            return anatomy;}
        }catch(e){status.error='Anatomy fallback: '+String(e.message||e).slice(0,100);}
      }
      const g=this.source.geom[kind];if(!g?.cpu)throw new Error('CPU geometry missing for '+kind);
      const B=this.B,flat=g.cpu;
      const positions=[],normals=[],uvs=[],indices=[];
      for(let i=0;i<flat.length;i+=8){
        positions.push(flat[i],flat[i+1],flat[i+2]);
        normals.push(flat[i+3],flat[i+4],flat[i+5]);
        uvs.push(flat[i+6],flat[i+7]);indices.push(i/8);
      }
      const mesh=new B.Mesh('template:'+kind,this.scene),vertex=new B.VertexData();
      vertex.positions=positions;vertex.normals=normals;vertex.uvs=uvs;vertex.indices=indices;
      vertex.applyToMesh(mesh,true);mesh.isVisible=false;mesh.isPickable=false;
      this.geometry.set(kind,mesh);
      return mesh;
    }
    materialFor(m,index){
      const B=this.B;
      if(m.tex){
        const mat=new B.StandardMaterial('labelMaterial:'+index,this.scene);
        mat.backFaceCulling=false;
        mat.disableLighting=true;
        mat.emissiveColor=new B.Color3(1,1,1);
        mat.diffuseColor=new B.Color3(1,1,1);
        const sourceCanvas=this.source.labelCanvases?.get(m.tex);
        if(sourceCanvas){
          const tex=new B.DynamicTexture('labelTexture:'+index,{width:sourceCanvas.width,height:sourceCanvas.height},this.scene,false,B.Texture.BILINEAR_SAMPLINGMODE);
          tex.hasAlpha=true;
          const context=tex.getContext();context.clearRect(0,0,tex.getSize().width,tex.getSize().height);
          context.drawImage(sourceCanvas,0,0);tex.update();
          mat.diffuseTexture=tex;
          mat.useAlphaFromDiffuseTexture=true;
          mat.emissiveTexture=tex;
        }
        mat.alpha=m.alpha;
        return mat;
      }
      const tooth=m.tag==='crown'||m.kind.startsWith('crown_');
      const gum=m.kind.startsWith('gingiva');
      // Selection changes crown color at runtime; keep those materials independent.
      const cacheKey=tooth?null:JSON.stringify([m.color,m.finish,m.alpha,gum,m.unlit]);
      if(cacheKey&&this.materials.has(cacheKey))return this.materials.get(cacheKey);
      const mat=new B.PBRMaterial((tooth?'enamel:':gum?'gingiva:':'surface:')+index,this.scene);
      mat.backFaceCulling=false;
      mat.albedoColor=this.color(m.color);
      mat.metallic=0;
      mat.roughness=tooth?.31:gum?.59:.65;
      mat.environmentIntensity=.42;
      if(tooth){
        mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=.57;mat.clearCoat.roughness=.19;
        // Soft enamel fill restores shade when no licensed IBL asset is available.
        mat.emissiveColor=new B.Color3(.082,.078,.066);
      }else if(gum){mat.emissiveColor=new B.Color3(.035,.014,.019);}
      if(m.unlit){mat.emissiveColor=this.color(m.color);}
      if((tooth||gum)&&window.KlinikDentalAppearance)
        window.KlinikDentalAppearance.applyMaterial(B,mat,tooth?'enamel':'gingiva',this.appearanceMode);
      mat.alpha=m.alpha;
      if(cacheKey)this.materials.set(cacheKey,mat);
      return mat;
    }
    applyAppearancePreset(mode){
      const appearance=window.KlinikDentalAppearance;
      this.appearanceMode=appearance?.modeName(mode)||'balanced';
      status.appearance=this.appearanceMode;
      if(!appearance)return;
      appearance.applyLighting(this.scene,this.lights,this.appearanceMode);
      const changed=new Set();
      for(const item of this.items){
        for(const mesh of [item.mesh,item.realMesh]){
          const mat=mesh?.material;
          if(!mat||changed.has(mat))continue;
          const kind=item.source.tag==='crown'?'enamel':item.source.kind.startsWith('gingiva')?'gingiva':null;
          if(kind&&appearance.applyMaterial(this.B,mat,kind,this.appearanceMode))changed.add(mat);
        }
      }
      status.materialsUpdated=changed.size;
    }
    setCrownSource(mode){
      this.crownSource=mode==='procedural'?'procedural':'dundee';
      status.crownSource=this.crownSource;
    }
    showJaw(visible){
      this.jawVisible=Boolean(visible);
      status.jawVisible=this.jawVisible;
    }
    build(){
      const source=this.source;
      this.anatomyLayout=window.KlinikBabylonAnatomy?.archPlacement?.(source.meshes)||null;
      status.archDiagnostics=this.anatomyLayout?.diagnostics||null;
      source.meshes.forEach((m,index)=>{
        // XR preparation meshes are registered before their voxel geometry exists.
        // They are hidden in desktop mode and should never block the preview.
        if(!source.geom[m.kind]?.cpu)return;
        const template=this.baseMesh(m.kind);
        const copy=template.clone('dentalscene:'+index,null,true);
        copy.isVisible=true;
        copy.isPickable=false; // preserve source canvas picking and XR controller handling
        copy.material=this.materialFor(m,index);
        copy.alwaysSelectAsActiveMesh=true;
        this.items.push({source:m,mesh:copy,lastColor:m.color.slice(),lastAlpha:m.alpha});
      });
      // Licensed whole-mandible files are intentionally excluded: this
      // *synthetic* alveolar ridge is optional and separate from the crowns.
      this.jawMeshes=[];
      if(this.anatomyLayout?.diagnostics?.teeth===32){
        for(let arch=0;arch<2;arch++){
          try{
            const mesh=this.baseMesh('jaw'+arch).clone('synthetic-alveolar:'+arch,null,true);
            const bone=new this.B.PBRMaterial('illustrative-cortical-bone:'+arch,this.scene);
            bone.albedoColor=new this.B.Color3(.80,.71,.61);
            bone.metallic=0;bone.roughness=.84;bone.environmentIntensity=0;
            bone.backFaceCulling=false;
            mesh.material=bone;mesh.isPickable=false;mesh.isVisible=false;
            mesh.alwaysSelectAsActiveMesh=true;
            this.jawMeshes.push(mesh);
          }catch(e){status.jawError=String(e.message||e).slice(0,170)}
        }
      }
      status.jawMeshes=this.jawMeshes.length;
      this.jawVisible=status.jawVisible;
      this.crownSource=status.crownSource;
      status.meshes=this.items.length;
    }
    sync(){
      const B=this.B,source=this.source;
      const eye=source.camera();
      this.camera.position.set(eye[0],eye[1],eye[2]);
      this.camera.setTarget(new B.Vector3(...source.target));
      this.camera.fov=.87;
      this.camera.minZ=.05;
      const current=this.canvas.clientWidth+'x'+this.canvas.clientHeight;
      if(current!==this.lastSize){this.lastSize=current;this.engine.resize()}
      const in3D=(this.app.viewMode==='3d'&&!source.xrSession);
      this.canvas.style.display=in3D?'block':'none';
      if(!in3D){
        for(const m of this.jawMeshes)m.isVisible=false;
        return;
      }
      for(let arch=0;arch<this.jawMeshes.length;arch++){
        this.jawMeshes[arch].isVisible=Boolean(this.jawVisible)
          && !(source.archMode==='upper'&&arch===1)
          && !(source.archMode==='lower'&&arch===0);
      }
      for(const {source:m,mesh,lastColor} of this.items){
        mesh.isVisible=!m.hidden && !(m.tag==='caries'&&window.KlinikRealTeeth?.ready);
        if(m.hidden||!mesh.isVisible)continue;
        const site=m.tag==='crown'?this.anatomyLayout?.byId[m.key?.split(':')[1]]:null;
        const p=site?.p||m.p,scale=site?.s||m.s,rotation=site?.rot||m.rot;
        mesh.position.set(p[0],p[1],p[2]);
        mesh.scaling.set(scale[0],scale[1],scale[2]);
        mesh.rotation.set(rotation[0],rotation[1],rotation[2]);
        if(m.tag==='crown'&&window.KlinikDentalAppearance){
          // A selection overlay multiplies the vertex palette rather than
          // replacing its cervical/incisal tonal gradient.
          const selected=m.key===source.selectedKey;
          mesh.material.albedoColor=selected?new B.Color3(.70,.94,.85):new B.Color3(1,1,1);
        }else if(m.color.some((v,i)=>v!==lastColor[i])){
          if(mesh.material?.albedoColor)mesh.material.albedoColor=this.color(m.color);
          lastColor.splice(0,3,...m.color);
        }
        if(mesh.material.alpha!==m.alpha)mesh.material.alpha=m.alpha;
      }
      // The Babylon display replaces the synthetic crown only once its matching
      // licensed tooth GLB has loaded. The original source still owns picking.
      window.KlinikRealMesh?.sync(this);
    }
    startRealTeeth(){
      if(this.realTeethStarted||!window.KlinikRealMesh)return;
      this.realTeethStarted=true;
      const btn=document.getElementById('renderer-toggle');
      if(btn&&this.visible)btn.textContent='🦷 Loading real teeth…';
      Promise.resolve(window.KlinikRealMesh.replace(this)).then(()=>{
        const result=window.KlinikRealTeeth;
        status.realTeeth=result?.instances||0;
        status.realModels=result?.loaded||0;
        if(btn&&this.visible)btn.textContent=result?.ready?'🦷 Real teeth ON':'✨ Babylon ON';
        if(btn&&result?.failures?.length)btn.title=result.failures.length+' model(s) not loaded; procedural fallback retained.';
      }).catch(e=>{
        status.realError=String(e.message||e).slice(0,180);
        if(btn&&this.visible)btn.textContent='✨ Babylon ON';
      });
    }
    enable(){this.visible=true;this.canvas.style.display='block';this.engine.resize();status.mode='babylon';status.ready=true;status.error=null;this.startRealTeeth()}
    disable(){this.visible=false;this.canvas.style.display='none';status.mode='classic'}
  }

  function init(){
    const titleCard=document.querySelector('#stage-controls .float-title');
    if(!titleCard||document.getElementById('renderer-toggle'))return;
    const button=document.createElement('button');
    button.id='renderer-toggle';button.type='button';
    button.textContent='🦷 Real teeth';
    button.title='Show licensed Dundee crowns in the main dental scene with Babylon.js. Desktop preview; VR and cutting remain unchanged.';
    button.setAttribute('aria-pressed','false');
    button.style.cssText='display:block;margin-top:8px;padding:7px 10px;background:#163c4a;border:1px solid #52717e;border-radius:7px;color:#dff7f0;font:750 11px system-ui;pointer-events:auto;';
    titleCard.appendChild(button);
    const lighting=document.createElement('button');
    lighting.id='appearance-toggle';lighting.type='button';
    lighting.textContent='☀ Lighting: Balanced';
    lighting.title='Switch between balanced and studio direct-light presets. Both are synthetic display styles, not optical calibration.';
    lighting.style.cssText='display:block;margin-top:6px;padding:7px 10px;background:#203e4a;border:1px solid #52717e;border-radius:7px;color:#dff7f0;font:750 11px system-ui;pointer-events:auto;';
    lighting.addEventListener('click',()=>{
      const next=status.appearance==='balanced'?'studio':'balanced';
      status.appearance=next;
      layer?.applyAppearancePreset(next);
      lighting.textContent=next==='studio'?'☀ Lighting: Studio':'☀ Lighting: Balanced';
      lighting.setAttribute('aria-pressed',String(next==='studio'));
    });
    lighting.setAttribute('aria-pressed','false');
    titleCard.appendChild(lighting);
    const jawButton=document.createElement('button');
    jawButton.id='jaw-layer-toggle';jawButton.type='button';
    jawButton.textContent='◡ Jaw support: Off';
    jawButton.title='Show/hide a synthetic alveolar ridge for anatomy orientation. Not a scan or a clinical jaw model.';
    jawButton.style.cssText='display:block;margin-top:6px;padding:7px 10px;background:#203e4a;border:1px solid #52717e;border-radius:7px;color:#dff7f0;font:750 11px system-ui;pointer-events:auto;';
    jawButton.setAttribute('aria-pressed','false');
    jawButton.addEventListener('click',()=>{
      status.jawVisible=!status.jawVisible;
      layer?.showJaw(status.jawVisible);
      jawButton.textContent=status.jawVisible?'◡ Jaw support: On':'◡ Jaw support: Off';
      jawButton.setAttribute('aria-pressed',String(status.jawVisible));
    });
    titleCard.appendChild(jawButton);
    const detail=document.createElement('button');
    detail.id='crown-detail-toggle';detail.type='button';
    detail.textContent='Teeth: Dundee';
    detail.title='Switch between original licensed low-LOD Dundee crown surfaces and higher-tessellation synthetic fine crowns. Fine does not mean clinically more accurate.';
    detail.style.cssText='display:block;margin-top:6px;padding:7px 10px;background:#203e4a;border:1px solid #52717e;border-radius:7px;color:#dff7f0;font:750 11px system-ui;pointer-events:auto;';
    detail.setAttribute('aria-pressed','false');
    detail.addEventListener('click',()=>{
      const next=status.crownSource==='dundee'?'procedural':'dundee';
      status.crownSource=next;
      layer?.setCrownSource(next);
      detail.textContent=next==='procedural'?'Teeth: Fine model':'Teeth: Dundee';
      detail.setAttribute('aria-pressed',String(next==='procedural'));
    });
    titleCard.appendChild(detail);
    button.addEventListener('click',async()=>{
      if(status.loading)return;
      if(layer?.visible){layer.disable();button.classList.remove('active');button.style.background='#163c4a';button.setAttribute('aria-pressed','false');button.textContent='🦷 Real teeth';return}
      if(window.kliniklab?.viewMode!=='3d')window.kliniklab?.setView?.('3d');
      status.loading=true;status.error=null;button.textContent='Loading 3D…';button.disabled=true;
      try{
        const B=await loadLibrary();
        if(!layer)layer=new BabylonDesktopLayer(window.kliniklab,B);
        layer.enable();button.textContent=window.KlinikRealTeeth?.ready?'🦷 Real teeth ON':'🦷 Loading real teeth…';button.classList.add('active');button.style.background='#187e70';button.setAttribute('aria-pressed','true');
      }catch(error){
        status.error=String(error.message||error).slice(0,250);
        status.mode='classic';button.textContent='🦷 Real teeth';button.title='Preview unavailable: '+status.error;
      }finally{status.loading=false;button.disabled=false;}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
  else setTimeout(init,0);
})();