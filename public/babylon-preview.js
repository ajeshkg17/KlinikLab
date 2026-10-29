'use strict';
/* KlinikLab Babylon.js desktop preview. Does not alter WebXR or cutting logic.
   Experimental rendering; reuses intentionally synthetic existing geometry.
   Third-party Babylon.js script is fetched only after the user opts in.
   If loading/rendering fails, the original canvas remains fully functional. */
(() => {
  const LIBRARY = 'https://cdn.babylonjs.com/babylon.js';
  const STUDIO_ENV = 'https://assets.babylonjs.com/environments/environmentSpecular.env';
  const status = {mode:'classic', ready:false, loading:false, meshes:0, frames:0, error:null,environment:'not-requested',
    library:'Babylon.js (official learning CDN)', headsetRendering:'legacy-WebXR'};
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
      // PBR clearcoat needs a surrounding environment to reflect; direct lights alone
      // made our teeth look like matte gray blocks. The image is a public Babylon demo
      // asset, fetched only after opt-in and never required for the classic renderer.
      try{
        const environment=B.CubeTexture.CreateFromPrefilteredData(STUDIO_ENV,this.scene);
        environment.gammaSpace=false;
        environment.level=.66;
        this.scene.environmentTexture=environment;
        status.environment='loading';
        environment.onLoadObservable.addOnce(()=>{status.environment='ready'});
        environment.onErrorObservable?.addOnce(()=>{status.environment='failed'});
      }catch(error){status.environment='failed';}

      this.camera=new B.FreeCamera('matchingOriginalCamera',new B.Vector3(0,1,4),this.scene);
      this.camera.fov=.87;
      this.camera.minZ=.05;
      this.camera.maxZ=100;
      this.camera.inputs.clear(); // Original canvas owns orbit, scroll, and selection.
      this.scene.activeCamera=this.camera;
      const soft=new B.HemisphericLight('clinicalFill',new B.Vector3(.18,1,.25),this.scene);
      soft.intensity=.54;
      soft.groundColor=new B.Color3(.22,.26,.34);
      const key=new B.DirectionalLight('clinicalKey',new B.Vector3(-.38,-.75,-.67),this.scene);
      key.intensity=1.15;
      key.diffuse=new B.Color3(1,.95,.86);
      const fill=new B.DirectionalLight('clinicalCoolFill',new B.Vector3(.72,-.38,.68),this.scene);
      fill.intensity=.24;
      fill.diffuse=new B.Color3(.69,.83,1);
      const rim=new B.PointLight('dentalRim',new B.Vector3(1.7,2.8,.8),this.scene);
      rim.intensity=.42;
      rim.range=9;
      this.geometry=new Map();
      this.items=[];
      this.materials=new Map();
      this.frame=0;
      this.lastSize='';
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
      mat.roughness=tooth?.30:gum?.59:.65;
      mat.environmentIntensity=.42;
      if(tooth){mat.clearCoat.isEnabled=true;mat.clearCoat.intensity=.64;mat.clearCoat.roughness=.13;}
      if(m.unlit){mat.emissiveColor=this.color(m.color);}
      mat.alpha=m.alpha;
      if(cacheKey)this.materials.set(cacheKey,mat);
      return mat;
    }
    build(){
      const source=this.source;
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
      if(!in3D)return;
      for(const {source:m,mesh,lastColor} of this.items){
        mesh.isVisible=!m.hidden;
        if(m.hidden)continue;
        mesh.position.set(m.p[0],m.p[1],m.p[2]);
        mesh.scaling.set(m.s[0],m.s[1],m.s[2]);
        mesh.rotation.set(m.rot[0],m.rot[1],m.rot[2]);
        if(m.color.some((v,i)=>v!==lastColor[i])){
          mesh.material.albedoColor=this.color(m.color);
          lastColor.splice(0,3,...m.color);
        }
        if(mesh.material.alpha!==m.alpha)mesh.material.alpha=m.alpha;
      }
    }
    enable(){this.visible=true;this.canvas.style.display='block';this.engine.resize();status.mode='babylon';status.ready=true;status.error=null}
    disable(){this.visible=false;this.canvas.style.display='none';status.mode='classic'}
  }

  function init(){
    const titleCard=document.querySelector('#stage-controls .float-title');
    if(!titleCard||document.getElementById('renderer-toggle'))return;
    const button=document.createElement('button');
    button.id='renderer-toggle';button.type='button';
    button.textContent='✨ Babylon';
    button.title='Compare improved Babylon.js lighting on your RTX GPU. Desktop preview only; VR stays on original renderer.';
    button.setAttribute('aria-pressed','false');
    button.style.cssText='display:block;margin-top:8px;padding:7px 10px;background:#163c4a;border:1px solid #52717e;border-radius:7px;color:#dff7f0;font:750 11px system-ui;pointer-events:auto;';
    titleCard.appendChild(button);
    button.addEventListener('click',async()=>{
      if(status.loading)return;
      if(layer?.visible){layer.disable();button.classList.remove('active');button.style.background='#163c4a';button.setAttribute('aria-pressed','false');button.textContent='✨ Babylon';return}
      if(window.kliniklab?.viewMode!=='3d')window.kliniklab?.setView?.('3d');
      status.loading=true;status.error=null;button.textContent='Loading 3D…';button.disabled=true;
      try{
        const B=await loadLibrary();
        if(!layer)layer=new BabylonDesktopLayer(window.kliniklab,B);
        layer.enable();button.textContent='✨ Babylon ON';button.classList.add('active');button.style.background='#187e70';button.setAttribute('aria-pressed','true');
      }catch(error){
        status.error=String(error.message||error).slice(0,250);
        status.mode='classic';button.textContent='✨ Babylon';button.title='Preview unavailable: '+status.error;
      }finally{status.loading=false;button.disabled=false;}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));
  else setTimeout(init,0);
})();