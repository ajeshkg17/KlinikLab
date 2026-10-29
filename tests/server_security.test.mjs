import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {test} from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
const port=18961;
const base=`http://127.0.0.1:${port}`;
async function checkReady(child){for(let i=0;i<60;i++){
  if(child.exitCode!==null)throw new Error('Server exited before ready');
  try{const r=await fetch(base+'/api/health');if(r.ok)return r.json();}catch{}
  await sleep(80);
}throw new Error('Server did not start');}
test('Gemini endpoint requires an access code whenever API key is configured',async()=>{
 const child=spawn(process.execPath,['server/server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),GEMINI_API_KEY:'not-a-real-key',AI_ACCESS_CODE:''},stdio:'ignore'});
 try{const health=await checkReady(child);assert.equal(health.configured,true);assert.equal(health.requiresCode,false);
  const xrModule=await fetch(base+'/xr-procedure.js');assert.equal(xrModule.status,200);assert.match(await xrModule.text(),/KlinikXRToothPractice/);
  const r=await fetch(base+'/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:'{"mode":"invalid"}'});
  assert.equal(r.status,503);assert.match((await r.json()).error,/AI_ACCESS_CODE/);
 }finally{child.kill();await sleep(120)}
 const child2=spawn(process.execPath,['server/server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:String(port),GEMINI_API_KEY:'not-a-real-key',AI_ACCESS_CODE:'sample-test-access-code'},stdio:'ignore'});
 try{const health=await checkReady(child2);assert.equal(health.requiresCode,true);
  const send=async code=>fetch(base+'/api/ai',{method:'POST',headers:{'content-type':'application/json',...(code?{'x-ai-access-code':code}:{})},body:'{"mode":"invalid"}'});
  assert.equal((await send(null)).status,401);
  assert.equal((await send('incorrect')).status,401);
  const ok=await send('sample-test-access-code');assert.notEqual(ok.status,401);assert.equal(ok.status,400);
 }finally{child2.kill()}
});
