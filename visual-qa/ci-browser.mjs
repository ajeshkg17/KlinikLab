/** GitHub-hosted Chromium QA; no Quest/headset or clinical claims. */
import {chromium} from 'playwright';
import {reviewAccessibility,summarizeTimings,checkBaselineApproval} from './qa-metrics.mjs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'visual-qa','ci-artifacts');
const report={schemaVersion:1,source:'github-actions-or-local-chromium',environment:{},
  evidence:{unit:false,desktopBrowser:true,mockedXR:false,physicalQuest2:false,clinicianReviewed:false},
  checks:[],screenshots:[],accessibility:[],timings:[],pageErrors:[],localAssetFailures:[],externalAssetFailures:[],
  notes:['Browser interaction does not validate clinical accuracy, physical XR tracking or haptics.']};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function check(id,condition,detail=''){
  report.checks.push({id,ok:Boolean(condition),detail:String(detail).slice(0,400)});
  if(!condition)throw new Error(id+': '+detail);
}
function watch(page,kind){
  page.on('pageerror',err=>report.pageErrors.push({kind,error:String(err.message||err).slice(0,350)}));
  page.on('requestfailed',req=>{
    const item={kind,url:req.url().slice(0,200),reason:String(req.failure()||'unknown')};
    (req.url().startsWith('http://127.0.0.1:')?report.localAssetFailures:report.externalAssetFailures).push(item);
  });
  page.on('response',response=>{
    if(response.url().startsWith('http://127.0.0.1:') &&
       /\.(?:js|css)(?:\?|$)/.test(response.url()) && response.status()>=400)
      report.localAssetFailures.push({kind,url:response.url(),status:response.status()});
  });
}
async function freePort(){
  return new Promise((resolve,reject)=>{
    const server=createServer();
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>{
      const port=server.address().port;
      server.close(()=>resolve(port));
    });
  });
}
async function ready(url,proc){
  for(let i=0;i<80;i++){
    if(proc.exitCode!==null)throw Error('Local server exited early: '+proc.exitCode);
    try{const result=await fetch(url+'/api/health');if(result.ok)return;}catch{}
    await pause(100);
  }
  throw Error('Local server did not start within 8 seconds');
}
async function compareSnapshot(page,name,actual){
  const baselinePath=path.join(ROOT,'visual-qa','baselines',name+'.png');

  const registry=JSON.parse(await readFile(path.join(ROOT,'visual-qa','baselines','manifest.json'),'utf8'));
  if(registry.schemaVersion!==1||!registry.captures||typeof registry.captures!=='object')
    throw Error('Invalid baseline approval manifest schema');
  const entry=registry.captures[name];
  if(!entry){
    // An unregistered PNG must never silently become an approved comparison.
    try{
      await readFile(baselinePath);
      throw Error('Unregistered screenshot baseline: '+name);
    }catch(e){
      if(e.code!=='ENOENT')throw e;
    }
    return {status:'NO_APPROVED_BASELINE',note:'Candidate image only; no visual-diff acceptance asserted.'};
  }
  const base=await readFile(baselinePath);
  const verified=checkBaselineApproval(entry,{
    sha256:createHash('sha256').update(base).digest('hex'),
    browserMajor:Number(report.environment.browser.match(/chromium (\d+)/)?.[1]),
    viewport:page.viewportSize()
  });
  if(!verified.ok)throw Error('Baseline approval refused for '+name+': '+verified.reason);
  const score=await page.evaluate(async({original,current})=>{
    const image=async encoded=>{
      const element=new Image();element.src='data:image/png;base64,'+encoded;
      await element.decode();return element;
    };
    const [a,b]=await Promise.all([image(original),image(current)]);
    if(a.width!==b.width||a.height!==b.height)
      return {error:'dimensions differ',baseline:[a.width,a.height],current:[b.width,b.height]};
    const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(a,0,0);const first=ctx.getImageData(0,0,a.width,a.height).data;
    ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);
    const second=ctx.getImageData(0,0,b.width,b.height).data;
    let changed=0;
    for(let i=0;i<first.length;i+=4){
      const d=Math.max(Math.abs(first[i]-second[i]),Math.abs(first[i+1]-second[i+1]),Math.abs(first[i+2]-second[i+2]));
      if(d>35)changed++;
    }
    return {changedPixelRatio:changed/(a.width*a.height),size:[a.width,a.height]};
  },{original:base.toString('base64'),current:actual.toString('base64')});
  const pass=!score.error&&score.changedPixelRatio<=0.05;
  report.checks.push({id:'QA-VISUAL-'+name,ok:pass,detail:JSON.stringify(score)});
  if(!pass)throw Error('Screenshot differs from approved baseline: '+name+' '+JSON.stringify(score));
  return {status:'COMPARED_PASS',...score};
}
async function screenshot(page,name){
  const png=await page.screenshot({fullPage:true,animations:'disabled',timeout:20000});
  await writeFile(path.join(OUT,name+'.png'),png);
  const comparison=await compareSnapshot(page,name,png);
  report.screenshots.push({name,file:name+'.png',bytes:png.byteLength,
    sha256:createHash('sha256').update(png).digest('hex'),comparison});
}

async function auditAccessibility(page,label){
  // Deterministic DOM audit. A positive result is NOT screen-reader certification.
  const snapshot=await page.evaluate(()=>{
    const visible=el=>{
      if(!el.getClientRects().length)return false;
      const style=getComputedStyle(el);
      return style.display!=='none'&&style.visibility!=='hidden';
    };
    const all=[...document.querySelectorAll('[id]')],count=new Map();
    for(const el of all)count.set(el.id,(count.get(el.id)||0)+1);
    const duplicateIds=[...count].filter(([,n])=>n>1).map(([id,n])=>id+' ('+n+')');
    const brokenAriaControls=[...document.querySelectorAll('[aria-controls]')]
      .filter(el=>el.getAttribute('aria-controls')?.split(/\s+/).some(id=>id&&!document.getElementById(id)))
      .map(el=>(el.id||el.tagName)+' -> '+el.getAttribute('aria-controls'));
    const controls=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')]
      .filter(visible).filter(el=>!el.disabled);
    const nameOf=el=>{
      const ids=(el.getAttribute('aria-labelledby')||'').trim().split(/\s+/).filter(Boolean);
      const labelled=ids.map(id=>document.getElementById(id)?.textContent||'').join(' ');
      return (el.getAttribute('aria-label')||labelled||el.getAttribute('title')||
        el.textContent||el.getAttribute('alt')||'').trim();
    };
    const unnamedControls=controls.filter(el=>!nameOf(el))
      .map(el=>el.id||el.outerHTML.slice(0,90)).slice(0,30);
    const smallTargets=controls.filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0&&r.width<32&&r.height<32;
    }).map(el=>el.id||el.textContent.trim().slice(0,25)).slice(0,30);
    return {duplicateIds,brokenAriaControls,unnamedControls,smallTargets,
      viewport:innerWidth,horizOverflowPx:Math.max(0,document.documentElement.scrollWidth-innerWidth)};
  });
  const result=reviewAccessibility(snapshot);
  report.accessibility.push({label,snapshot,...result});
  // Preserve all remaining regression evidence even if a pre-existing DOM
  // accessibility defect is detected. The job still fails at final status.
  report.checks.push({id:'QA-A11Y-DOM-'+label.toUpperCase(),
    ok:result.pass,detail:JSON.stringify(result.blocking).slice(0,1000)});
  return result;
}
async function assertTopmost(page,selector,id){
  await page.locator(selector).scrollIntoViewIfNeeded();
  const hit=await page.evaluate(sel=>{
    const e=document.querySelector(sel);
    if(!e)return {reason:'missing element'};
    const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    const top=document.elementFromPoint(x,y);
    return {withinViewport:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,
      hit:!!top&&(top===e||e.contains(top)),top:top?.id||top?.tagName||null};
  },selector);
  check(id,hit.withinViewport&&hit.hit,JSON.stringify(hit));
}
async function samplePerformance(browser,url){
  const samples=[];
  for(let index=0;index<3;index++){
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    try{
      const started=Date.now();
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
      await page.locator('#chart [data-tooth]').first().waitFor({timeout:15000});
      const rows=await page.locator('#chart [data-tooth]').count();
      check('QA-PERF-LOAD-'+(index+1),rows===32,'FDI controls at readiness: '+rows);
      samples.push(Date.now()-started);
    }finally{await page.close()}
  }
  const summary=summarizeTimings(samples);
  report.timings.push({name:'fresh-Chromium-page-until-FDI32',unit:'ms',samples,summary,
    note:'CI software renderer and runner scheduling; not Quest FPS or controller latency'});
  check('QA-PERF-3-SAMPLES',summary.count===3&&summary.p95Ms<20000,JSON.stringify(summary));
}

async function desktop(browser,url){
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  watch(page,'desktop');
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#chart [data-tooth]').first().waitFor({timeout:16000});
    await auditAccessibility(page,'desktop');
    const fdi=await page.evaluate(()=>{
      const expected=[];
      for(let quadrant=1;quadrant<=4;quadrant++)
        for(let tooth=1;tooth<=8;tooth++)expected.push(String(quadrant)+String(tooth));
      const actual=[...document.querySelectorAll('#chart [data-tooth]')].map(el=>el.dataset.tooth);
      const bad=[];
      for(const id of expected){
        const button=document.querySelector('#chart [data-tooth="'+id+'"]');
        if(!button){bad.push('missing-'+id);continue;}
        button.click();
        if(window.kliniklab?.selectedTooth!==id)bad.push('selection-'+id);
      }
      return {total:actual.length,unique:new Set(actual).size,bad};
    });
    check('QA-BROWSER-FDI32',fdi.total===32&&fdi.unique===32&&fdi.bad.length===0,JSON.stringify(fdi));
    // Real key dispatch, not DOM .click(), guards FDI keyboard operability.
    await page.locator('#chart [data-tooth="11"]').focus();
    await page.keyboard.press('Enter');
    const chosen=await page.evaluate(()=>window.kliniklab?.selectedTooth);
    check('QA-A11Y-FDI-ENTER',chosen==='11','Selected tooth='+chosen);
    await page.locator('#help').click();
    await page.locator('#kl-tour-panel').waitFor({state:'visible',timeout:6000});
    check('QA-BROWSER-TOUR-OPEN',
      await page.locator('#help').getAttribute('aria-expanded')==='true','Tutorial button expansion');
    await page.locator('#kl-tour-next').click();
    const advanced=await page.evaluate(()=>window.KlinikTutorial?.status?.index);
    check('QA-BROWSER-TOUR-NEXT',advanced===1,'index='+advanced);
    await page.keyboard.press('ArrowLeft');
    check('QA-A11Y-TOUR-BACK',await page.evaluate(()=>window.KlinikTutorial?.status?.index)===0,
      'ArrowLeft returns to welcome');
    await page.keyboard.press('ArrowRight');
    check('QA-A11Y-TOUR-FORWARD',await page.evaluate(()=>window.KlinikTutorial?.status?.index)===1,
      'ArrowRight advances tour');
    await assertTopmost(page,'#kl-tour-next','QA-A11Y-TOUR-NEXT-NOT-OCCLUDED');
    await screenshot(page,'desktop-tutorial');
    await page.keyboard.press('Escape');
    check('QA-BROWSER-TOUR-ESCAPE',
      await page.locator('#kl-tour-panel').isHidden(),'Escape should dismiss guide');
    check('QA-A11Y-FOCUS-RETURN',await page.evaluate(()=>document.activeElement?.id)==='help',
      'Escape returns focus to original tutorial trigger');
    await page.locator('#structure-toggle').click();
    await page.locator('#practice-toggle').click();
    await page.locator('#practice-panel').waitFor({state:'visible',timeout:6000});
    check('QA-BROWSER-QUIZ-FOUR',
      await page.locator('#practice-options [data-practice-option]').count()===4,'Four answer controls');
    for(let i=0;i<10;i++){
      if(i===0){
        const correct=await page.evaluate(()=>{
          const q=window.KlinikAnatomyPractice?.currentQuestion;
          return q?.options.indexOf(q.correct);
        });
        const option=page.locator('#practice-options [data-practice-option="'+correct+'"]');
        await option.focus();
        await page.keyboard.press('Enter');
        check('QA-A11Y-PRACTICE-ENTER',
          await page.evaluate(()=>window.KlinikAnatomyPractice?.status?.score)===1,
          'Keyboard Enter awards the correctly selected answer');
        await page.locator('#practice-next').click();
        continue;
      }
      const done=await page.evaluate(()=>{
        const api=window.KlinikAnatomyPractice;
        const q=api?.currentQuestion;
        if(!q)return {error:'no question'};
        const index=q.options.indexOf(q.correct);
        document.querySelector('#practice-options [data-practice-option="'+index+'"]')?.click();
        document.querySelector('#practice-next')?.click();
        return {score:api.status.score,completed:api.status.completed};
      });
      if(done.error)throw Error('QA-BROWSER-QUIZ: '+done.error);
    }
    const score=await page.evaluate(()=>({...window.KlinikAnatomyPractice.status}));
    check('QA-BROWSER-QUIZ10',score.completed&&score.score===10,
      '10 question scores, completed='+score.completed+', score='+score.score);
    await screenshot(page,'desktop-practice');
    await auditAccessibility(page,'desktop-practice');
    await assertTopmost(page,'#practice-close','QA-A11Y-PRACTICE-CLOSE-NOT-OCCLUDED');
    await page.locator('#practice-close').click();
    check('QA-BROWSER-PRACTICE-CLEANUP',
      await page.locator('#practice-panel').isHidden(),'Close restores anatomy panel');
    const nav=await page.evaluate(()=>performance.getEntriesByType('navigation')[0]?.toJSON()||{});
    report.environment.navigation={durationMs:Math.round(nav.duration||0),domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd||0)};
  }catch(error){
    try{
      const file='desktop-failure.png';
      await page.screenshot({path:path.join(OUT,file),fullPage:true,animations:'disabled',timeout:12000});
      report.screenshots.push({name:'desktop-failure',file,kind:'failure-evidence'});
    }catch(captureError){report.notes.push('Desktop failure screenshot unavailable: '+String(captureError).slice(0,250))}
    throw error;
  }finally{await page.close()}
}
async function mobile(browser,url){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  watch(page,'mobile');
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.locator('#open-nav').waitFor({state:'visible',timeout:12000});
    await auditAccessibility(page,'mobile');
    const open=page.locator('#open-nav');
    const size=await open.boundingBox();
    check('QA-MOBILE-NAV-TARGET',Boolean(size&&size.width>=32&&size.height>=32),JSON.stringify(size));
    await open.click();
    check('QA-MOBILE-NAV-EXPANDED',await open.getAttribute('aria-expanded')==='true',
      'Mobile Cases menu should expand');
    await screenshot(page,'mobile-navigation');
    await assertTopmost(page,'#close-nav','QA-A11Y-MOBILE-CLOSE-NOT-OCCLUDED');
    await page.locator('#close-nav').click();
    check('QA-MOBILE-NAV-CLOSE',await open.getAttribute('aria-expanded')==='false',
      'Mobile Cases menu should close');
    report.environment.mobile=await page.evaluate(()=>({
      innerWidth:innerWidth,documentWidth:document.documentElement.scrollWidth,
      buttonsWithoutAccessibleName:[...document.querySelectorAll('button')].filter(b=>{
        const style=getComputedStyle(b);
        return style.display!=='none' && !b.disabled &&
          !(b.getAttribute('aria-label')||b.getAttribute('title')||b.innerText||'').trim();
      }).length
    }));
  }catch(error){
    try{
      const file='mobile-failure.png';
      await page.screenshot({path:path.join(OUT,file),fullPage:true,animations:'disabled',timeout:12000});
      report.screenshots.push({name:'mobile-failure',file,kind:'failure-evidence'});
    }catch(captureError){report.notes.push('Mobile failure screenshot unavailable: '+String(captureError).slice(0,250))}
    throw error;
  }finally{await page.close()}
}
async function main(){
  await mkdir(OUT,{recursive:true});
  let proc,browser;
  try{
    const port=await freePort(),url='http://127.0.0.1:'+port;
    proc=spawn(process.execPath,['server/server.mjs'],{cwd:ROOT,env:{...process.env,PORT:String(port),GEMINI_API_KEY:'',AI_ACCESS_CODE:''},stdio:'inherit'});
    await ready(url,proc);
    browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
    report.environment={browser:'chromium '+browser.version(),node:process.version,origin:url};
    for(const [name,runner] of [['desktop',desktop],['mobile',mobile]]){
      try{await runner(browser,url);}catch(e){
        report.checks.push({id:'QA-BROWSER-'+name.toUpperCase()+'-EXCEPTION',ok:false,detail:String(e.stack||e).slice(0,1400)});
      }
    }
    check('QA-BROWSER-LOCAL-ASSETS',report.localAssetFailures.length===0,
      JSON.stringify(report.localAssetFailures.slice(0,5)));
    await samplePerformance(browser,url);
    // Third-party CDN failures are reported, not disguised as local-source regression.
    report.notes.push('External asset failures: '+report.externalAssetFailures.length);
  }catch(e){
    report.checks.push({id:'QA-BROWSER-SETUP',ok:false,detail:String(e.stack||e).slice(0,1400)});
  }finally{
    if(browser)await browser.close();
    if(proc){
      proc.kill('SIGTERM');
      await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),pause(2000)]);
      if(proc.exitCode===null)proc.kill('SIGKILL');
    }
    report.passed=report.checks.filter(x=>x.ok).length;
    report.failed=report.checks.filter(x=>!x.ok).length;
    await writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,failed:report.failed,artifacts:OUT,
      checks:report.checks,accessibility:report.accessibility,timings:report.timings,
      screenshots:report.screenshots},null,2));
    if(report.failed)process.exitCode=1;
  }
}
await main();
