"""Static graphics regression: independent dental crown topology and volume fallback.
No GPU or headset validation is inferred from these checks.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':850})
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content((ROOT/'KlinikLab_DesktopXR_Standalone.html').read_text(),wait_until='domcontentloaded')
    result=page.evaluate('''() => {
      const renderer=Object.create(DentalScene.prototype),morphology=[];
      for(const upper of [true,false])for(const style of [1,2,3,4]){
        const t=renderer.crownData(style,upper,3);
        if(t.length===0 || t.length%24!==0)throw Error('Malformed crown triangles');
        for(let k=0;k<t.length;k+=8){
          for(let n=0;n<6;n++)if(!Number.isFinite(t[k+n]))throw Error('Nonfinite vertex or normal');
          const len=Math.hypot(t[k+3],t[k+4],t[k+5]);
          if(len<.001||Math.abs(len-1)>.04)throw Error('Invalid smooth surface normal '+len);
        }
        morphology.push({style,upper,triangles:t.length/24});
      }
      const lab=window.kliniklab.volLab;
      if(!lab?.mesh?.faces?.length)throw Error('Missing volume');
      if(!document.getElementById('vl-gpu'))throw Error('Missing GPU overlay');
      lab.activate();lab.toggleSection();lab.toggleSection();lab.solid.addCut(0,.9,0,.12);lab.rebuild();
      if(!lab.mesh.faces.length)throw Error('No cut mesh');
      return {morphology,volumeTriangles:lab.mesh.count, gpuAvailable:!!lab.gpu};
    }''')
    assert not errors,errors
    assert result['volumeTriangles']>1000,result
    print(result)
    browser.close()