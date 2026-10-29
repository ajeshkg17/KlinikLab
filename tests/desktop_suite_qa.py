from pathlib import Path
from playwright.sync_api import sync_playwright
import json
base=Path(__file__).resolve().parents[1]
url=(base/'KlinikLab_DesktopXR_Standalone.html').resolve().as_uri()
shot=base/'qa_screens';shot.mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu-sandbox','--use-gl=angle','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1600,'height':950},device_scale_factor=1,accept_downloads=True)
 problems=[]
 page.on('pageerror',lambda e:problems.append(str(e)))
 page.set_content((base/'KlinikLab_DesktopXR_Standalone.html').read_text(),wait_until='domcontentloaded',timeout=30000)
 page.wait_for_timeout(1800)
 assert page.locator('#desktop-open').count()==1, 'missing desktop suite button'
 page.locator('#desktop-open').click()
 for tab in ['radiology','anatomy','physics','quest','review','evidence']:
  page.locator(f'[data-dstab="{tab}"]').click()
  page.wait_for_timeout(250)
  page.screenshot(path=str(shot/f'{tab}.png'))
  assert page.locator(f'#ds-{tab}').is_visible(),tab
 page.locator('[data-dstab="radiology"]').click()
 page.locator('#ds-interpret').select_option('caries')
 page.locator('#ds-film').click(position={'x':300,'y':180})
 page.locator('#ds-rad-eval').click()
 assert 'Interpretation matches' in page.locator('#ds-rad-feedback').inner_text()
 page.locator('[data-dstab="anatomy"]').click()
 obj='''v 0 0 0\nv 1 0 0\nv 0 1 0\nv 0 0 1\nf 1 2 3\nf 1 2 4\nf 2 3 4\nf 1 3 4\n'''
 page.locator('#ds-file').set_input_files({'name':'test.obj','mimeType':'text/plain','buffer':obj.encode()})
 assert '4 triangles' in page.locator('#ds-scan-metadata').inner_text(),page.locator('#ds-scan-metadata').inner_text()
 page.screenshot(path=str(shot/'imported_mesh.png'))
 page.locator('[data-dstab="physics"]').click()
 page.locator('#ds-speed').fill('90');page.locator('#ds-load').fill('70');page.locator('#ds-angle').fill('18')
 page.locator('#ds-go-volume').click()
 page.wait_for_timeout(800)
 assert page.locator('#volume-root').evaluate('(e)=>e.classList.contains("active")')
 page.locator('#vl-drill').click()
 canvas=page.locator('#vl-canvas');bb=canvas.bounding_box()
 page.mouse.move(bb['x']+bb['width']*.5,bb['y']+bb['height']*.48)
 page.mouse.down();page.mouse.move(bb['x']+bb['width']*.55,bb['y']+bb['height']*.48,steps=6);page.mouse.up()
 page.wait_for_timeout(500)
 physics=page.evaluate('''() => ({model:window.kliniklab.volLab.physics, metrics:window.kliniklab.volLab.measures()})''')
 assert physics['model']['speed']==.9,physics
 assert physics['model']['load']==.7,physics
 assert len(physics['model']['trace'])>0,physics
 assert physics['metrics']['cutSpheres']>0,physics
 page.screenshot(path=str(shot/'cutting.png'))
 page.locator('#desktop-open').click();page.locator('[data-dstab="review"]').click()
 page.locator('#ds-reviewer').fill('Example clinician (fictional)')
 page.locator('[data-criterion="anatomy"]').select_option('2')
 page.locator('#ds-review-text').fill('Unvalidated anatomical outline; check against phantom-head preparation.')
 with page.expect_download() as dl:page.locator('#ds-review-export').click()
 report=json.loads(dl.value.path().read_text())
 assert report['identityVerified'] is False
 assert report['ratings']['anatomy']==2
 page.locator('[data-dstab="quest"]').click();page.locator('#ds-quest-check').click();page.wait_for_timeout(300)
 assert 'WebXR API:' in page.locator('#ds-quest-result').inner_text()
 assert not problems,problems
 print(json.dumps({'screenshots':len(list(shot.glob('*.png'))),'physicsSamples':len(physics['model']['trace']),'removedSpheres':physics['metrics']['cutSpheres'],'issues':problems,'reviewType':report['type']}))
 browser.close()
