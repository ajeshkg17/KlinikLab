from playwright.sync_api import sync_playwright
from pathlib import Path
import json
B=Path(__file__).resolve().parent.parent
H=(B/'KlinikLab_Research_Edition_Standalone.html').read_text()
(B/'review').mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=swiftshader'])
 issues=[]; captures=0
 for w,h in [(1440,900),(1024,768),(390,844)]:
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errs=[]
  page.on('pageerror',lambda err:errs.append(str(err)))
  page.set_content(H,wait_until='domcontentloaded',timeout=90000)
  page.wait_for_timeout(1000)
  page.locator('#journey-open').click(timeout=10000)
  page.wait_for_timeout(300)
  assert page.locator('#clinical-journey.is-visible').count()==1
  for c in ['molar','endo','anterior','crown','surgery','perio']:
   page.locator(f'button[data-action="case"][data-id="{c}"]').click()
   page.screenshot(path=str(B/'review'/f'{w}_{c}_history.png'),full_page=False);captures+=1
   page.locator('button[data-action="question"]').first.click()
   assert page.locator('.journey-exchange').count()>=1
   page.locator('button[data-action="stage"][data-id="1"]').click()
   page.locator('button[data-action="test"]').first.click()
   assert page.locator('.journey-examresult').count()>=1
   page.locator('button[data-action="stage"][data-id="2"]').click()
   assert page.locator('select[data-model="diagnosis"]').count()==1
   page.locator('select[data-model="diagnosis"]').select_option('0')
   page.locator('textarea[data-model="diagnosisWhy"]').fill('Diese Hypothese muss mit anamnestischen und klinischen Befunden kritisch bestätigt werden.')
   page.locator('button[data-action="stage"][data-id="3"]').click()
   page.locator('select[data-model="primary"]').select_option('0')
   page.locator('select[data-model="alternative"]').select_option('1')
   page.locator('textarea[data-model="reasonA"]').fill('Diese Alternative ist nach vollständiger Diagnostik bei geeigneter Indikation zu erwägen.')
   page.locator('textarea[data-model="reasonB"]').fill('Diese Therapie hängt von Restsubstanz, Befund, Prognose und Patientenwunsch ab.')
   page.locator('input[data-model="consent"]').check()
   page.screenshot(path=str(B/'review'/f'{w}_{c}_plan.png'),full_page=False);captures+=1
   page.locator('button[data-action="stage"][data-id="4"]').click()
   for i in range(4):page.locator(f'button[data-action="procedure"][data-id="{i}"]').click()
   assert page.locator('.journey-procedure .passed').count()==4
   page.locator('button[data-action="stage"][data-id="5"]').click()
   assert page.locator('.journey-score').count()==1
   page.screenshot(path=str(B/'review'/f'{w}_{c}_report.png'),full_page=False);captures+=1
   width=page.evaluate('document.documentElement.scrollWidth')
   if width>w:issues.append(f'overflow {w}/{c}: {width}')
  # test integration - starts from case 6 report, navigate 3D from case 5
  page.locator('button[data-action="stage"][data-id="4"]').click()
  page.locator('button[data-action="launch3d"]').click()
  assert not page.locator('#clinical-journey').evaluate('(x)=>x.classList.contains("is-visible")')
  assert page.evaluate('window.kliniklab.caseData.id')=='perio'
  assert page.evaluate('window.kliniklab.station.id')=='practical'
  assert page.evaluate('window.kliniklab.viewMode')=='volume'
  if errs:issues.extend(errs)
  print('PASS',w,'captures',captures,'errors',len(errs))
  page.close()
 print('CAPTURES',captures,'ISSUES',issues)
 (B/'review'/'qa_result.json').write_text(json.dumps({'captures':captures,'issues':issues},indent=2))
 b.close()
