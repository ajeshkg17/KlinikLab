from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
for js in ('engine','app','ai-ui'):
    src=(root/(js+'.js')).read_text()
    if js=='ai-ui':src=src.replace("hasServer:location.protocol==='http:'||location.protocol==='https:'","hasServer:true")
    html=html.replace(f'<script src="{js}.js"></script>', f'<script>\n{src}\n</script>')
mock="""<script>
window.fetch=async function(url,opts={}){
 if(String(url).includes('/api/health'))return {ok:true,json:async()=>({configured:true,model:'gemini-3.6-flash'})};
 if(String(url).includes('/api/ai')){
  const p=JSON.parse(opts.body);
  if(p.mode==='generate_patient')return {ok:true,json:async()=>({model:'gemini-3.6-flash',patient:{archetype:'molar',age:42,tooth:'16',name:'Frau Clara Winter',complaint:'Beim Kauen rechts oben tut es weh.',facts:'Kalte Getränke führen zu kurzem Schmerz.',history:'Seit zwei Wochen.',exam:'Klinische Untersuchung noch offen.',risk:'Medikation noch erfragen.',communication:'Etwas besorgt',hiddenFacts:'Keine nächtlichen Schmerzen.',treatmentGoal:'Zahnerhalt',redFlags:'Kein Fieber.'}})};
  return {ok:true,json:async()=>({model:'gemini-3.6-flash',reply:'Fokussiertes Feedback: Anamnese ergänzen und Optionen abwägen.'})};
 }
 return {ok:false,json:async()=>({error:'Not found'})}
};</script>"""
html=html.replace('<script>\n'+(root/'engine.js').read_text()+'\n</script>',mock+'\n<script>\n'+(root/'engine.js').read_text()+'\n</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-webgl','--disable-gpu','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':920})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded',timeout=12000)
    assert page.locator('#ai-open').count()==1
    page.locator('#ai-open').click()
    page.locator('#ai-generate').click()
    page.locator('#ai-talk-now').wait_for(timeout=4000)
    assert 'Frau Clara Winter' in page.locator('#ai-patient-details').inner_text()
    assert page.evaluate('window.kliniklab.caseData.name')=='Frau Clara Winter'
    page.locator('#ai-talk-now').click()
    page.locator('#ai-message').fill('Seit wann haben Sie Beschwerden?')
    page.locator('#ai-send').click()
    page.locator('.ai-msg.assistant').wait_for(timeout=4000)
    assert page.locator('.ai-msg.user').count()==1
    page.locator('[data-ai-tab="plan"]').click()
    page.locator('#ai-plan-text').fill('Verdachtsdiagnose Karies an Zahn 16. Zunächst Anamnese und Vitalität prüfen; direkte Füllung oder Teilkrone nach Befund, Einwilligung und Nachsorge.')
    page.locator('#ai-eval-plan').click()
    page.wait_for_timeout(300)
    assert 'Fokussiertes Feedback' in page.locator('#ai-plan-result').inner_text()
    page.locator('#ai-close').click()
    page.locator('[data-view="operative"]').click()
    canvas=page.locator('canvas#drill');canvas.scroll_into_view_if_needed();r=canvas.bounding_box()
    page.mouse.move(r['x']+r['width']*.49,r['y']+r['height']*.50)
    page.mouse.down();page.mouse.move(r['x']+r['width']*.56,r['y']+r['height']*.53,steps=15);page.mouse.up()
    m=page.evaluate('window.kliniklab.procedure.measures()')
    assert m['strokeCount']==1 and m['removedCells']>0, m
    page.locator('#ai-open').click()
    page.locator('[data-ai-tab="procedure"]').click()
    assert '%' in page.locator('#ai-metrics').inner_text()
    page.locator('#ai-eval-procedure').click()
    page.wait_for_timeout(300)
    assert 'Fokussiertes Feedback' in page.locator('#ai-proc-result').inner_text()
    page.screenshot(path=str(root/'preview_procedure_checked.png'),timeout=4000)
    assert not errors, errors
    print('BROWSER MOCK E2E PASS: generated patient, chat, plan, 2D procedure metrics, quality review',m)
    browser.close()
