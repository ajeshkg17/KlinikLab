'use strict';
/* Quest 2 in-headset tutorial: generated entirely as scene meshes and labels.
   No DOM overlay, hand-tracking assumption, controller-button indexing, or medical action.
   WebXR selectstart is the primary trigger; squeezestart (grip) reopens help. */
(function(root){
  const PAGES=Object.freeze([
    {title:'QUEST 2 | GET STARTED',lines:[
      'Aim either controller at a button.',
      'Press INDEX TRIGGER to select.',
      'A visible ray shows your pointer.',
      'Use NEXT to practise the controls.',
      'Grip button reopens this guide.'
    ]},
    {title:'PICK A TRAINING MODULE',lines:[
      'Look to the LEFT lesson board.',
      'Aim at one of the seven modules.',
      'Press INDEX TRIGGER to choose.',
      'The status panel shows your task.',
      'VR menus are smaller for comfort.'
    ]},
    {title:'TEETH AND INSTRUMENTS',lines:[
      'Aim the controller ray at a tooth.',
      'Press INDEX TRIGGER to select it.',
      'You can also select instruments.',
      'Stay within your physical play area.',
      'No thumbstick movement is added.'
    ]},
    {title:'OPTIONAL VR TOOTH PREP',lines:[
      'Select the VR TOOTH PREP button.',
      'Aim at the virtual practice tooth.',
      'Hold TRIGGER to make a simulated cut.',
      'Release TRIGGER to stop cutting.',
      'No real depth or force calibration.'
    ]},
    {title:'READY TO PRACTISE',lines:[
      'BACK reviews earlier instructions.',
      'CLOSE returns to the VR workspace.',
      'Press either GRIP to reopen help.',
      'Use the Quest system menu to exit VR.',
      'Desktop tutorial is separate.'
    ]}
  ]);
  const spec=Object.freeze({panel:{p:[.08,1.56,-1.18],s:[.96,.80,.047]},
    placement:{panelYOffsetFromEyes:-.04,anchorOncePerSession:true},
    font:{title:43,progress:40,body:49,button:43},
    launcher:{p:[-1.12,1.40,-1.55],s:[.41,.13,.055]},
    controlSize:[.29,.116,.056],
    controls:{back:[-.20,1.263,-1.124],next:[.15,1.263,-1.124],close:[.48,1.263,-1.124]}});
  const state={version:1,active:false,open:false,index:0,pages:PAGES.length,controllerSelects:0,gripOpens:0};
  class XRControllerGuide{
    constructor(scene){
      this.scene=scene;this.state=state;this.meshes=[];this.panelMeshes=[];this.labels=[];
      const add=(mesh,panel=true)=>{this.meshes.push(mesh);if(panel)this.panelMeshes.push(mesh);mesh.hidden=true;return mesh};
      add(scene.box(spec.panel.p,spec.panel.s,'#143644'));
      add(scene.box([.08,1.926,-1.151],[.94,.064,.055],'#258578'));
      this.title=add(scene.label('QUEST 2 | GET STARTED',[.08,1.856,-1.141],[.87,.089,1],{font:spec.font.title,bold:true,color:'#e9fff6'}));
      this.progress=add(scene.label('1 / 5',[.08,1.775,-1.139],[.78,.065,1],{font:30,color:'#90d9ce'}));
      for(let i=0;i<5;i++){
        this.labels.push(add(scene.label('',[.08,1.686-i*.083,-1.139],[.875,.078,1],
          {font:spec.font.body,color:'#e3f4ef'})));
      }
      for(const [key,p] of Object.entries(spec.controls)){
        const color=key==='next'?'#197e72':'#2b5f68';
        add(scene.box(p,spec.controlSize,color,{key:'guide:'+key}));
        const label=key==='next'?'NEXT':key==='back'?'BACK':'CLOSE';
        add(scene.label(label,[p[0],p[1]+.003,p[2]+.038],[.255,.073,1],{font:spec.font.button,bold:true}));
      }
      this.launcher=add(scene.box(spec.launcher.p,spec.launcher.s,'#236f75',{key:'guide:open'}),false);
      this.launcherLabel=add(scene.label('VR HELP / GRIP',
        [spec.launcher.p[0],spec.launcher.p[1]+.005,spec.launcher.p[2]+.035],
        [.37,.080,1],{font:spec.font.button,color:'#e8fff3'}),false);
      // Snapshot the guide's positions AND its ray hit targets. Changes are XR-only.
      this.meshOrigins=this.meshes.map(mesh=>({mesh,p:mesh.p.slice()}));
      const guideMeshes=new Set(this.meshes);
      this.hitOrigins=(scene.pickables||[]).filter(hit=>guideMeshes.has(hit.mesh))
        .map(hit=>({hit,p:hit.p.slice()}));
      this.anchored=false;
    }
    placeForViewer(pose){
      if(!state.active||this.anchored)return false;
      const p=pose?.transform?.position;
      if(!p||![p.x,p.y,p.z].every(Number.isFinite))return false;
      // Anchor once per session to initial eye height and X/Z. No per-frame panel chase.
      const delta=[p.x,p.y+spec.placement.panelYOffsetFromEyes-spec.panel.p[1],p.z];
      for(const item of this.meshOrigins)item.mesh.p=item.p.map((v,i)=>v+delta[i]);
      for(const item of this.hitOrigins)item.hit.p=item.p.map((v,i)=>v+delta[i]);
      this.anchored=true;
      return true;
    }
    render(){
      const page=PAGES[state.index];if(!page)return;
      this.scene.replaceLabel(this.title,page.title,spec.font.title);
      this.scene.replaceLabel(this.progress,(state.index+1)+' / '+PAGES.length,spec.font.progress);
      for(let i=0;i<5;i++)this.scene.replaceLabel(this.labels[i],page.lines[i],spec.font.body);
      for(const mesh of this.panelMeshes)mesh.hidden=!state.open;
      this.launcher.hidden=!state.active;
      this.launcherLabel.hidden=!state.active;
    }
    open(){
      if(!state.active)return false;
      state.index=0;state.open=true;
      // Prevent a held trigger from continuing a cut when help opens by grip.
      this.scene.xrPrep?.triggers?.clear();
      if(this.scene.xrPrep){this.scene.xrPrep.lastCut=null;if(this.scene.xrPrep.tip)this.scene.xrPrep.tip.hidden=true}
      this.render();return true;
    }
    close(){if(!state.open)return false;state.open=false;this.render();return true}
    next(){if(!state.open)return false;if(state.index===PAGES.length-1)return this.close();state.index++;this.render();return true}
    back(){if(!state.open||state.index===0)return false;state.index--;this.render();return true}
    onEnter(){state.active=true;state.controllerSelects=0;state.gripOpens=0;this.open()}
    onExit(){
      state.active=false;state.open=false;state.index=0;
      for(const item of this.meshOrigins)item.mesh.p=item.p.slice();
      for(const item of this.hitOrigins)item.hit.p=item.p.slice();
      this.anchored=false;
      for(const mesh of this.meshes)mesh.hidden=true;
    }
    onSqueezeStart(){
      if(!state.active)return false;
      state.gripOpens++;
      if(!state.open)this.open();
      return true;
    }
    onSelectStart(event,frame){
      if(!state.active)return false;
      // Invisible panels never receive interaction, but the launcher always does.
      let pose=null;
      if(frame?.getPose&&event?.inputSource?.targetRaySpace&&this.scene.xrRef){
        try{pose=frame.getPose(event.inputSource.targetRaySpace,this.scene.xrRef)}catch{pose=null}
      }
      let key=null;
      if(pose){
        const q=pose.transform.orientation,p=pose.transform.position;
        const ray={o:[p.x,p.y,p.z],d:this.scene.rotateByQuat([0,0,-1],q)};
        key=this.scene.getRayHit(ray.o,ray.d,p=>p.key?.startsWith('guide:'))?.key||null;
      }
      if(key==='guide:open'){this.open();state.controllerSelects++;return true}
      if(!state.open)return false;
      // Suppress simulated drilling and background selections while the guide is up.
      state.controllerSelects++;
      if(key==='guide:next')this.next();
      else if(key==='guide:back')this.back();
      else if(key==='guide:close')this.close();
      return true;
    }
  }
  root.KlinikXRGuide={XRControllerGuide,state,pages:PAGES,spec};
  if(typeof window!=='undefined'&&typeof document!=='undefined'){
    window.addEventListener('DOMContentLoaded',()=>{
      const app=window.kliniklab;
      if(app?.scene?.gl&&!app.scene.xrGuide)app.scene.xrGuide=new XRControllerGuide(app.scene);
    });
  }
})(typeof window!=='undefined'?window:globalThis);
