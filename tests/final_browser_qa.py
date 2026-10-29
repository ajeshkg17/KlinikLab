from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('/mnt/data/KlinikLab_Procedural_3D')
html=(root/'KlinikLab_3D_Procedures_Standalone.html').read_text()
vis=root/'preview';vis.mkdir(exist_ok=True)
summary=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'])
 for width,height in [(1440,900),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded');page.locator('[data-view="volume"]').click()
  for case in range(6):
   page.evaluate('(i)=>window.kliniklab.selectCase(i)',case);page.locator('[data-view="volume"]').click()
   m=page.evaluate('window.kliniklab.volLab.measures()')
   assert m['removedCells']==0 and m['strokeCount']==0
   caseId=page.evaluate('window.kliniklab.volLab.caseKey')
   page.screenshot(path=str(vis/f'{width}_case{case}_{caseId}.png'))
   page.locator('#vl-section').click();assert page.locator('#vl-slice-frame').is_visible()
   page.screenshot(path=str(vis/f'{width}_case{case}_slice.png'))
   page.locator('#vl-section').click();assert not page.locator('#vl-slice-frame').is_visible()
   overflow=page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1')
   summary.append((width,case,caseId,m['targetCells'],overflow))
  # final repeat interactive cutting case 16
  page.evaluate('window.kliniklab.selectCase(0)');page.locator('[data-view="volume"]').click()
  page.locator('#vl-drill').click()
  box=page.locator('#vl-canvas').bounding_box()
  cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
  page.mouse.move(cx-15,cy-15);page.mouse.down();page.mouse.move(cx+20,cy+22,steps=12);page.mouse.up()
  m=page.evaluate('window.kliniklab.volLab.measures()')
  assert m['cutSpheres']>0 and m['removedCells']>0 and m['strokeCount']>0,m
  page.screenshot(path=str(vis/f'{width}_volume_removed.png'))
  with page.expect_download() as download:
   page.locator('#vl-report').click()
  assert download.value.suggested_filename.endswith('.json')
  page.locator('#vl-reset').click();assert page.evaluate('window.kliniklab.volLab.measures().removedCells')==0
  page.locator('#vl-back').click();assert page.evaluate('window.kliniklab.viewMode')=='3d'
  assert not errors,errors
  page.close()
 browser.close()
print('QA passed:',len(summary),'case viewport combinations, 24 case and section screenshots, 2 cut screenshots, report export, reset, navigation; zero errors')
print('Per case checks:',summary)
