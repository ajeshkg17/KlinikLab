from playwright.sync_api import sync_playwright
import json,time
from pathlib import Path
OUT=Path('/mnt/data/KlinikLab_Procedural_3D/test-visuals');OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
 for width,height in [(1440,900),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  start=time.time()
  page.set_content(Path('/mnt/data/KlinikLab_Procedural_3D/KlinikLab_3D_Procedures_Standalone.html').read_text(),wait_until='domcontentloaded');page.wait_for_timeout(1000)
  print('Ready',width,'app',page.evaluate('!!window.kliniklab'), 'volume',page.evaluate('!!window.kliniklab?.volLab'),'time',round(time.time()-start,2),'errors',errors)
  if not page.evaluate('!!window.kliniklab?.volLab'):continue
  page.locator('[data-view="volume"]').click();page.wait_for_timeout(900)
  print('mesh',page.evaluate('window.kliniklab.volLab.mesh.count'),'metrics',page.evaluate('window.kliniklab.volLab.measures()'))
  page.screenshot(path=str(OUT/f'volume_{width}_start.png'))
  page.locator('#vl-section').click();page.wait_for_timeout(500);page.screenshot(path=str(OUT/f'volume_{width}_section.png'))
  page.locator('#vl-section').click();page.locator('#vl-drill').click();page.wait_for_timeout(400)
  rc=page.locator('#vl-canvas').bounding_box();print('rect',rc)
  xx=rc['x']+rc['width']*.50; yy=rc['y']+rc['height']*.50
  page.mouse.move(xx,yy);page.mouse.down()
  for j in range(8):page.mouse.move(xx+4*j, yy+5*j,steps=1)
  page.mouse.up();page.wait_for_timeout(400)
  print('cut',page.evaluate('window.kliniklab.volLab.measures()'),'errors',errors)
  page.screenshot(path=str(OUT/f'volume_{width}_cut.png'))
  if width==1440:
   for case in ['endo','anterior','crown']:
    page.evaluate('(c)=>window.kliniklab.volLab.setCase(c)',case)
    page.wait_for_timeout(400)
    page.screenshot(path=str(OUT/f'volume_{width}_{case}.png'))
  page.close()
 browser.close()
