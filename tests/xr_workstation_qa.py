"""Behavioral verification of shared voxel and tracked-ray interactions without a physical headset.
The scene graphics/WebXR APIs are intentionally mocked; this is NOT a Quest 2 acceptance test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader'])
    page=b.new_page(viewport={'width':1480,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'KlinikLab_DesktopXR_Standalone.html').read_text(),wait_until='domcontentloaded',timeout=30000)
    page.wait_for_timeout(500)
    summary=page.evaluate('''() => {
      const a=window.kliniklab;
      if(!window.KlinikXRToothPractice||!a?.volLab)throw Error('XR class or volumetric engine missing');
      const scene={
        geom:{},gl:{deleteBuffer(){}},xrRef:{},xrSession:null,
        rgb:c=>c,geometry:arr=>({count:arr.length/8,buffer:{}}),
        tri:(p,q,r)=>[...p,0,1,0,0,0,...q,0,1,0,0,0,...r,0,1,0,0,0],
        box:(p,s,c,o={})=>({p,s,color:c,hidden:false,key:o.key}),
        label:(text,p,s,o={})=>({p,s,text,hidden:false}),
        sphere:(p,s,c,o={})=>({p,s,hidden:false}),
        add:(kind,p,s,color,o={})=>({kind,p,s,color,hidden:false}),
        replaceLabel:(m,text)=>{m.text=text},
        getRayHit:()=>null,
        rotateByQuat:(v,q)=>v
      };
      const xr=new window.KlinikXRToothPractice(scene,a);
      xr.onEnter();xr.toggle();
      const origin=[.28,1.65,0],direction=[0,0,-1];
      const contact=xr.traceSurface(origin,direction);
      if(!contact)throw Error('Expected synthetic tooth ray hit from eye level');
      if(xr.visibleTriangles<=0)throw Error('Marching tetrahedra mesh missing');
      const source={targetRayMode:'tracked-pointer',targetRaySpace:{},gamepad:{hapticActuators:[{pulse:()=>Promise.resolve()}]}};
      const frame={getPose:()=>({transform:{position:{x:origin[0],y:origin[1],z:origin[2]},orientation:{x:0,y:0,z:0,w:1}}}),session:{inputSources:[source]}};
      const before=a.volLab.solid.bur.length;
      const accepted=xr.onSelectStart({inputSource:source},frame);
      const after=a.volLab.solid.bur.length;
      if(!accepted||after!==before+1)throw Error('VR select did not remove shared material');
      if(a.volLab.physics.trace.at(-1)?.source!=='WebXR tracked target ray')throw Error('Input source attribution missing');
      xr.onSelectEnd({inputSource:source});
      const priorRevision=a.volLab.revision;
      a.volLab.reset();
      xr.syncCase();
      if(a.volLab.revision<=priorRevision||!xr.dirty||a.volLab.solid.bur.length!==0)throw Error('Reset not synchronized');
      xr.updateMesh();
      if(xr.dirty)throw Error('XR mesh remained dirty after rebuild');
      scene.getRayHit=()=>({key:'module:0',distance:.1});
      const blocked=xr.onSelectStart({inputSource:source},frame);
      if(blocked||a.volLab.solid.bur.length!==0)throw Error('Interactive controls were drilled through');
      xr.toggle();
      a.volLab.setCase('endo');xr.syncCase();
      if(xr.currentCase!=='endo'||!xr.dirty)throw Error('Case switch not synchronized');
      xr.updateMesh();
      if(xr.visibleTriangles<=0)throw Error('Endodontic mesh absent');
      return {accepted,removed:after-before,blocked,meshTriangles:xr.visibleTriangles,
        reportUnits:a.volLab.measures().modelUnits,case:xr.currentCase,errors:[]};
    }''')
    assert not errors, errors
    print(json.dumps(summary))
    b.close()