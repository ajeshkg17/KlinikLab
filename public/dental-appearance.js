'use strict';
/* KlinikLab Phase 3 — reproducible, stylized dental appearance.
   The enamel/gingiva palette and lighting are educational approximations,
   not measured reflectance, biological tissue shaders or medical diagnosis.
   Works offline after Babylon loads; creates no textures or network requests. */
(function(root){
  const VERSION=1;
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const VALID=Object.freeze(['balanced','studio']);
  function modeName(mode){return VALID.includes(mode)?mode:'balanced'}
  function colorGradient(positions,upper,style=4){
    if(!positions||positions.length%3)throw Error('Crown positions must be xyz triples');
    let minimum=Infinity,maximum=-Infinity;
    for(let i=1;i<positions.length;i+=3){
      const y=positions[i];
      if(!Number.isFinite(y))throw Error('Invalid crown vertex coordinate');
      minimum=Math.min(minimum,y);maximum=Math.max(maximum,y);
    }
    const span=maximum-minimum||1;
    const colors=[];
    // Near cervical enamel: warmer, slightly less reflective; incisal/occlusal
    // enamel: brighter. No claim of wavelength-resolved optical realism.
    for(let i=0;i<positions.length;i+=3){
      const x=positions[i],y=positions[i+1],z=positions[i+2];
      if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Invalid crown vertex coordinate');
      const height=upper?(maximum-y)/span:(y-minimum)/span;
      const shade=smooth((height-.04)/.92);
      const gentle=clamp(.986+.009*Math.sin(7.1*x+3.7*z)*Math.sin(4.3*z-2*x),.965,1);
      const ridge=style>=3?.010*smooth((height-.78)/.22):0;
      const base=[lerp(.925,.995,shade),lerp(.827,.966,shade),lerp(.716,.903,shade)];
      colors.push(clamp(base[0]*gentle-ridge*.4),
        clamp(base[1]*gentle-ridge*.7),
        clamp(base[2]*gentle-ridge),1);
    }
    return colors;
  }
  function gingivaGradient(positions,around=24){
    if(!Number.isInteger(around)||around<8||!positions||positions.length%3)
      throw Error('Invalid gingival vertex array');
    const count=positions.length/3,colors=[];
    for(let i=0;i<count;i++){
      const j=i%around;
      // Tube-top/crest is lighter; attached tissue toward the skirt is darker.
      // End-cap center colors are neutral to avoid conspicuous bright disks.
      const crest=i>=count-2?.42:(1-Math.sin(2*Math.PI*j/around))/2;
      const shade=smooth(crest),x=positions[i*3],z=positions[i*3+2];
      if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(positions[i*3+1]))
        throw Error('Invalid gingival vertex coordinate');
      const natural=clamp(.995+.013*Math.sin(9*x+4*z),.978,1);
      colors.push(lerp(.95,.82,shade)*natural,
                  lerp(.64,.48,shade)*natural,
                  lerp(.62,.49,shade)*natural,1);
    }
    return colors;
  }
  function profile(kind,mode='balanced'){
    mode=modeName(mode);
    if(kind==='enamel')return mode==='studio'?
      {roughness:.28,clearCoat:.40,clearRoughness:.17,sheen:0,emissive:.018}:
      {roughness:.36,clearCoat:.28,clearRoughness:.25,sheen:0,emissive:.025};
    if(kind==='gingiva')return mode==='studio'?
      {roughness:.57,clearCoat:.06,clearRoughness:.46,sheen:.10,emissive:.016}:
      {roughness:.68,clearCoat:.03,clearRoughness:.55,sheen:.055,emissive:.021};
    return null;
  }
  function applyMaterial(B,material,kind,mode='balanced'){
    const p=profile(kind,mode);if(!p||!material)return false;
    material.metallic=0;
    material.roughness=p.roughness;
    material.environmentIntensity=0; // no unlicensed/remote environment map
    material.backFaceCulling=false;
    material.albedoColor=new B.Color3(1,1,1);
    material.emissiveColor=kind==='gingiva'
      ?new B.Color3(p.emissive*3.25,p.emissive*1.45,p.emissive*1.95)
      :new B.Color3(p.emissive,p.emissive,p.emissive);
    material.useVertexColors=true;
    if(material.clearCoat){
      material.clearCoat.isEnabled=p.clearCoat>0;
      material.clearCoat.intensity=p.clearCoat;
      material.clearCoat.roughness=p.clearRoughness;
    }
    if(material.sheen){
      material.sheen.isEnabled=p.sheen>0;
      material.sheen.intensity=p.sheen;
      material.sheen.color=new B.Color3(.88,.55,.59);
    }
    material.metadata={...(material.metadata||{}),phase3Appearance:VERSION,kind,mode:modeName(mode)};
    return true;
  }
  const LIGHTING=Object.freeze({
    balanced:Object.freeze({hemi:.88,key:1.02,fill:.43,rim:.27,exposure:1.12,contrast:1.04}),
    studio:Object.freeze({hemi:.69,key:1.24,fill:.30,rim:.48,exposure:1.10,contrast:1.11})
  });
  function applyLighting(scene,lights,mode='balanced'){
    const p=LIGHTING[modeName(mode)];
    if(lights.hemi)lights.hemi.intensity=p.hemi;
    if(lights.key)lights.key.intensity=p.key;
    if(lights.fill)lights.fill.intensity=p.fill;
    if(lights.rim)lights.rim.intensity=p.rim;
    if(scene?.imageProcessingConfiguration){
      scene.imageProcessingConfiguration.exposure=p.exposure;
      scene.imageProcessingConfiguration.contrast=p.contrast;
    }
    return {...p};
  }
  root.KlinikDentalAppearance={version:VERSION,modes:VALID,modeName,
    crownColors:colorGradient,gingivaColors:gingivaGradient,
    profile,applyMaterial,applyLighting,lighting:LIGHTING,
    notes:'Reproducible non-clinical vertex palette and direct-light presets; no IBL or texture downloads'};
})(typeof window!=='undefined'?window:globalThis);
