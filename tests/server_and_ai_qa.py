import os,subprocess,time,urllib.request,json
from pathlib import Path
from playwright.sync_api import sync_playwright
B=Path(__file__).resolve().parent.parent
p=subprocess.Popen(['node','server/server.mjs'],cwd=str(B),env={**os.environ,'PORT':'8789'},stdout=subprocess.PIPE,stderr=subprocess.PIPE)
try:
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:8789/api/health') as r:health=json.load(r);break
  except Exception:time.sleep(.1)
 else:raise RuntimeError('server did not start')
 assert health['configured']==False
 for path,typ in [('/index.html','text/html'),('/clinical-pathway.js','text/javascript'),('/clinical-pathway.css','text/css')]:
  with urllib.request.urlopen('http://127.0.0.1:8789'+path) as r: assert typ in r.headers.get('content-type','')
 with sync_playwright() as pt:
  b=pt.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  page=b.new_page(viewport={'width':1280,'height':800});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content((B/'KlinikLab_Research_Edition_Standalone.html').read_text(),wait_until='domcontentloaded',timeout=60000)
  page.wait_for_timeout(1200)
  assert page.locator('#journey-open').count()==1
  page.locator('#journey-open').click()
  page.locator('button[data-action="stage"][data-id="5"]').click()
  page.locator('button[data-action="aiReview"]').click()
  page.wait_for_timeout(250)
  assert 'Keine Live-KI-Auswertung' in page.locator('.journey-ai-response').inner_text()
  # mock authorized server response; no Gemini key in front-end
  page.evaluate("window.fetch=async (...a)=>({ok:true,json:async()=>({reply:'Fiktives Feedback: weitere Befundabklärung erforderlich.'})})")
  page.locator('button[data-action="aiReview"]').click()
  page.wait_for_timeout(180)
  assert 'Fiktives Feedback' in page.locator('.journey-ai-response').inner_text()
  page.screenshot(path=str(B/'review'/'ai_mock_desktop.png'))
  print('Server health and AI error/mock success; JS errors',errs)
  assert not errs
  b.close()
finally:
 p.terminate();p.wait(timeout=5)
