'use strict';
/**
 * KlinikLab licensed tooth anatomy atlas — optional, display-only study viewer.
 * Source tooth anatomy: University of Dundee School of Dentistry, CC BY 4.0.
 * GLB distribution: sameralseedbth-Dental/dental-3d-models (repacked/optimized).
 * Never treat GLB surface topology as enamel, dentin, pulp or a cutting solid.
 */
(() => {
  const BURL = 'https://cdn.babylonjs.com/babylon.js';
  const LURL = 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js';
  const ROOT = 'assets/dundee/';
  const models = Object.freeze([
    ['maxillary_first_molar', '26 · Upper left first molar', 'https://sketchfab.com/3d-models/maxillary-first-molar-e719a474ef7e4bd7abec508f85f1e984'],
    ['maxillary_first_premolar', '24 · Upper left first premolar', 'https://sketchfab.com/3d-models/maxillary-first-premolar-f9b48a29d34f4923b683433f030c5c70'],
    ['maxillary_canine', '23 · Upper left canine', 'https://sketchfab.com/3d-models/maxillary-canine-bd930c9b9da14f2a9a8c9b130b0e08a2'],
    ['maxillary_left_central_incisor', '21 · Upper central incisor', 'https://sketchfab.com/3d-models/maxillary-left-central-incisor-c8a7c2d9280d4c92bc651cfa1459866a'],
    ['maxillary_lateral_incisor', '22 · Upper lateral incisor', 'https://sketchfab.com/DundeeDental'],
    ['maxillary_second_premolar', '25 · Upper left second premolar', 'https://sketchfab.com/DundeeDental'],
    ['maxillary_second_molar', '27 · Upper left second molar', 'https://sketchfab.com/DundeeDental'],
    ['maxillary_third_molar', '28 · Upper left third molar', 'https://sketchfab.com/DundeeDental'],
    ['mandibular_first_molar', '36 · Lower left first molar', 'https://sketchfab.com/3d-models/mandibular-first-molar-e1c919d6603846eca873154eeededdd6'],
    ['mandibular_first_premolar', '34 · Lower left first premolar', 'https://sketchfab.com/DundeeDental'],
    ['mandibular_left_canine', '33 · Lower left canine', 'https://sketchfab.com/DundeeDental'],
    ['mandibular_left_central_incisor', '31 · Lower central incisor', 'https://sketchfab.com/3d-models/mandibular-left-central-incisor-90dcbf474e5a4d97b8783b7eb2b9c4b7'],
    ['mandibular_left_lateral_incisor', '32 · Lower lateral incisor', 'https://sketchfab.com/DundeeDental'],
    ['mandibular_left_second_premolar', '35 · Lower left second premolar', 'https://sketchfab.com/3d-models/mandibular-left-second-premolar-fe59fe04725446479bc1115bb12d0ad8'],
    ['mandibular_second_molar', '37 · Lower left second molar', 'https://sketchfab.com/DundeeDental'],
    ['mandibular_third_molar', '38 · Lower left third molar', 'https://sketchfab.com/3d-models/mandibular-third-molar-561bb06b3b084b84978163906de1c2b5']
  ]);
  const state = {mode:'idle',ready:false,selected:0,asset:null,meshes:0,triangles:0,error:null,engine:'Babylon.js',source:'University of Dundee (CC BY 4.0)',clinicalValidation:false};
  window.KlinikDundeeAtlas = state;
  let canvas, modal, engine, scene, camera, previousFocus, assetGeneration=0;
  const scripts = new Map();
  function loadScript(url, ready){
    if(ready())return Promise.resolve();
    if(scripts.has(url))return scripts.get(url);
    const p=new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=url;s.async=true;s.crossOrigin='anonymous';
      const timer=setTimeout(()=>{s.remove();reject(Error('Timed out loading '+url))},15000);
      s.onload=()=>{clearTimeout(timer);ready()?resolve():reject(Error('Library did not initialize: '+url))};
      s.onerror=()=>{clearTimeout(timer);reject(Error('Network or CSP blocked '+url))};
      document.head.appendChild(s);
    });scripts.set(url,p);p.catch(()=>scripts.delete(url));return p;
  }
  async function loadLibraries(){
    await loadScript(BURL,()=>!!window.BABYLON?.Engine);
    await loadScript(LURL,()=>!!window.BABYLON?.GLTFFileLoader);
  }
  function showStatus(message,isError=false){
    const el=document.getElementById('dundee-atlas-status');
    if(el){el.textContent=message;el.style.color=isError?'#ffb5b5':'#c6dedc';}
  }
  function disposeScene(){
    assetGeneration++;
    if(engine){try{engine.stopRenderLoop();engine.dispose()}catch{}}
    engine=null;scene=null;camera=null;
  }
  function boundsFor(meshes,B){
    const min=new B.Vector3(Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY,Number.POSITIVE_INFINITY);
    const max=new B.Vector3(Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY,Number.NEGATIVE_INFINITY);
    for(const mesh of meshes){
      mesh.computeWorldMatrix(true);
      mesh.refreshBoundingInfo?.();
      const bb=mesh.getBoundingInfo().boundingBox;
      min.minimizeInPlace(bb.minimumWorld);max.maximizeInPlace(bb.maximumWorld);
    }
    const dimensions=max.subtract(min);
    if(!Number.isFinite(dimensions.length())||dimensions.length()<0.0001)throw Error('Imported model has no valid geometry bounds');
    return {center:max.add(min).scale(.5),dimensions};
  }
  async function select(index){
    if(!modal||modal.hidden)return;
    index=((index%models.length)+models.length)%models.length;
    state.selected=index;state.ready=false;state.error=null;state.mode='loading';
    const item=models[index];state.asset=item[0];
    const selectNode=document.getElementById('dundee-atlas-select');
    if(selectNode)selectNode.value=String(index);
    const source=document.getElementById('dundee-atlas-source');
    if(source){source.href=item[2];source.textContent='Original Dundee model ↗';}
    showStatus('Loading '+item[1]+'…');
    const requested=++assetGeneration;
    try{
      await loadLibraries();
      if(requested!==assetGeneration||modal.hidden)return;
      disposeScene();
      const token=assetGeneration;
      const B=window.BABYLON;
      // Babylon 9's versioned decoder URL can 404 on its learning CDN.
      // Explicitly use the documented, unversioned Draco distribution.
      const draco={wasmUrl:'https://cdn.babylonjs.com/draco_wasm_wrapper_gltf.js',wasmBinaryUrl:'https://cdn.babylonjs.com/draco_decoder_gltf.wasm',fallbackUrl:'https://cdn.babylonjs.com/draco_decoder_gltf.js'};
      state.decoderDiagnostic={
        names:Object.keys(B).filter(name=>/draco/i.test(name)).slice(0,16),
        initial:B.DracoDecoder?.DefaultConfiguration?.wasmBinaryUrl||null,
        hasCompression:!!B.DracoCompression
      };
      if(B.DracoDecoder){
        // In current Babylon versions this is a mutable, shared configuration.
        Object.assign(B.DracoDecoder.DefaultConfiguration,draco);
      }
      if(B.DracoCompression){
        B.DracoCompression.Configuration={decoder:draco};
        try{Object.assign(B.DracoCompression.Configuration.decoder,draco)}catch{}
      }
      state.decoderDiagnostic.after=B.DracoDecoder?.DefaultConfiguration?.wasmBinaryUrl||null;
      state.decoderDiagnostic.compression=B.DracoCompression?.Configuration?.decoder?.wasmBinaryUrl||null;
      engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true},true);
      scene=new B.Scene(engine);
      scene.useRightHandedSystem=true;
      scene.clearColor=new B.Color4(.031,.055,.071,1);
      scene.imageProcessingConfiguration.toneMappingEnabled=true;
      scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
      scene.imageProcessingConfiguration.exposure=1.31;
      scene.imageProcessingConfiguration.contrast=1.10;
      const fill=new B.HemisphericLight('soft-fill',new B.Vector3(.2,1,.3),scene);
      fill.intensity=.88;fill.groundColor=new B.Color3(.34,.36,.4);
      const key=new B.DirectionalLight('studio-key',new B.Vector3(-.46,-.77,.33),scene);
      key.intensity=1.65;key.diffuse=new B.Color3(1,.96,.88);
      const rim=new B.DirectionalLight('studio-rim',new B.Vector3(.4,-.3,-.7),scene);
      rim.intensity=.62;rim.diffuse=new B.Color3(.75,.87,1);
      camera=new B.ArcRotateCamera('orbit',-Math.PI/2,Math.PI/2.4,5,new B.Vector3(0,0,0),scene);
      camera.minZ=.02;camera.lowerRadiusLimit=2.2;camera.upperRadiusLimit=11;
      camera.wheelPrecision=42;camera.panningSensibility=0;camera.attachControl(canvas,true);
      engine.runRenderLoop(()=>{if(scene&&modal&&!modal.hidden)scene.render();});
      engine.resize();
      // The 16 filenames are fixed in this file; no user-provided path is fetched.
      const result=await B.SceneLoader.ImportMeshAsync(null,ROOT,item[0]+'.glb',scene,undefined,'.glb');
      if(token!==assetGeneration||!scene)return;
      const geometry=result.meshes.filter(x=>typeof x.getTotalVertices==='function'&&x.getTotalVertices()>0);
      if(!geometry.length)throw Error('GLB loaded without visible tooth geometry');
      const {center,dimensions}=boundsFor(geometry,B);
      const pivot=new B.TransformNode('atlas-centering',scene);
      for(const root of result.meshes.filter(x=>!x.parent))root.parent=pivot;
      const dimension=Math.max(dimensions.x,dimensions.y,dimensions.z);
      const scale=2.85/dimension;
      pivot.scaling.setAll(scale);
      pivot.position.copyFrom(center.scale(-scale));
      state.meshes=geometry.length;
      state.triangles=geometry.reduce((sum,m)=>sum+Math.floor((m.getTotalIndices?.()||0)/3),0);
      for(const m of geometry){
        m.isPickable=false;
        if(m.material instanceof B.PBRMaterial){
          m.material.metallic=0;
          m.material.roughness=.29;
          m.material.environmentIntensity=.7;
          m.material.clearCoat.isEnabled=true;
          m.material.clearCoat.intensity=.34;
          m.material.clearCoat.roughness=.2;
        }
      }
      state.mode='rendering';state.ready=true;
      showStatus(item[1]+' · '+state.triangles.toLocaleString()+' triangles · source GLB surface (no internal tissues)');
    }catch(e){
      if(modal.hidden)return;
      state.mode='error';state.error=String(e.message||e).slice(0,300);
      showStatus('Model could not load: '+state.error,true);
    }
  }
  function close(){if(!modal||modal.hidden)return;modal.hidden=true;state.mode='idle';state.ready=false;disposeScene();previousFocus?.focus?.()}
  function open(){
    if(!modal)return;
    previousFocus=document.activeElement;modal.hidden=false;
    document.getElementById('dundee-atlas-close').focus();
    select(state.selected);
  }
  function init(){
    if(document.getElementById('dundee-atlas-open'))return;
    const stageControls=document.querySelector('#stage-controls .float-title');
    if(!stageControls)return;
    const trigger=document.createElement('button');
    trigger.type='button';trigger.id='dundee-atlas-open';trigger.textContent='🦷 Real tooth atlas';
    trigger.title='Inspect licensed Dundee anatomical surfaces; does not modify the preparation simulator';
    trigger.style.cssText='display:block;margin-top:8px;padding:7px 10px;border-radius:7px;border:1px solid #658894;background:#174552;color:#e0f4f0;font:750 11px system-ui;cursor:pointer;pointer-events:auto';
    stageControls.appendChild(trigger);
    const style=document.createElement('style');
    style.textContent=`#dundee-atlas[hidden]{display:none!important}#dundee-atlas{position:fixed;inset:0;z-index:1900;background:#07151edb;display:grid;place-items:center;padding:20px;box-sizing:border-box}#dundee-atlas-dialog{display:flex;flex-direction:column;gap:10px;width:min(1050px,97vw);height:min(860px,94vh);box-sizing:border-box;padding:18px;border:1px solid #456875;border-radius:16px;background:#102b39;color:#e9f8f7;box-shadow:0 24px 70px #0009;font:14px system-ui}#dundee-atlas-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#dundee-atlas-toolbar select,#dundee-atlas-toolbar button{border:1px solid #567989;border-radius:8px;background:#1f4754;color:#efffff;padding:9px 10px;font:600 13px system-ui;cursor:pointer}#dundee-atlas-toolbar select{flex:1;min-width:180px}#dundee-atlas-canvas{display:block;width:100%;height:100%;min-height:260px;outline:none;touch-action:none;border-radius:12px;background:#0a1c29}#dundee-atlas-vp{flex:1;min-height:260px;overflow:hidden}#dundee-atlas small{font-size:12px;line-height:1.5;color:#c3d3d9}#dundee-atlas a{color:#7bdbec}#dundee-atlas-status{min-height:18px}`;
    document.head.appendChild(style);
    modal=document.createElement('div');modal.id='dundee-atlas';modal.hidden=true;
    modal.innerHTML=`<section id="dundee-atlas-dialog" role="dialog" aria-modal="true" aria-label="Licensed 3D dental anatomy"><div style="display:flex;justify-content:space-between;gap:15px;align-items:center"><div><strong style="font-size:20px">Anatomical tooth atlas</strong><div style="font-size:12px;color:#a9c6cd">CT-informed source models · Babylon.js WebGL · Educational viewer only</div></div><button type="button" id="dundee-atlas-close" style="background:#295563;color:white;border:0;border-radius:8px;padding:11px;cursor:pointer">Close ✕</button></div><div id="dundee-atlas-toolbar"><button type="button" id="dundee-atlas-prev" aria-label="Previous tooth">◀</button><select id="dundee-atlas-select" aria-label="Choose tooth model"></select><button type="button" id="dundee-atlas-next" aria-label="Next tooth">Next tooth ▶</button></div><div id="dundee-atlas-vp"><canvas id="dundee-atlas-canvas" aria-label="Interactive imported tooth model; drag to rotate and scroll to zoom"></canvas></div><div id="dundee-atlas-status" role="status">Choose a tooth to load its licensed model.</div><small>3D models © University of Dundee, School of Dentistry · CC BY 4.0 · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">license</a> · Repacked GLB files from <a href="https://github.com/sameralseedbth-Dental/dental-3d-models" target="_blank" rel="noopener">dental-3d-models</a> · <a id="dundee-atlas-source" target="_blank" rel="noopener">Original Dundee model ↗</a>. This is a surface-only educational reference, not a clinically validated model, scanned patient data or a drillable enamel/dentin/pulp volume.</small></section>`;
    document.body.appendChild(modal);
    canvas=document.getElementById('dundee-atlas-canvas');
    const selectNode=document.getElementById('dundee-atlas-select');
    models.forEach(([file,label],i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=label;selectNode.appendChild(o)});
    selectNode.addEventListener('change',()=>select(Number(selectNode.value)));
    trigger.addEventListener('click',open);
    document.getElementById('dundee-atlas-prev').addEventListener('click',()=>select(state.selected-1));
    document.getElementById('dundee-atlas-next').addEventListener('click',()=>select(state.selected+1));
    document.getElementById('dundee-atlas-close').addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();