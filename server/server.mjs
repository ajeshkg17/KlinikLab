/** Local standalone server: node server/server.mjs (Node >= 18). */
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runGemini,checkAccess,errorPayload,DEFAULT_MODEL} from './ai-core.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.env.PORT||8787);
const LIMIT=18000;
const hits=new Map();
function json(res,status,obj){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj))}
async function readJSON(req){let raw='',size=0;for await(const b of req){size+=b.length;if(size>LIMIT)throw Object.assign(new Error('Request too large.'),{status:413});raw+=b.toString('utf8')}try{return JSON.parse(raw)}catch{throw Object.assign(new Error('Invalid JSON.'),{status:400})}}
function rateLimit(ip){const now=Date.now(),h=hits.get(ip)||[];const fresh=h.filter(n=>now-n<300000);if(fresh.length>=30)throw Object.assign(new Error('Too many requests; try again in a few minutes.'),{status:429});fresh.push(now);hits.set(ip,fresh);if(hits.size>2000)for(const [k,v] of hits)if(!v.some(n=>now-n<300000))hits.delete(k)}
function assertSameOrigin(req){const origin=req.headers.origin;if(!origin)return;try{const u=new URL(origin);if(u.host!==req.headers.host)throw Error('bad origin')}catch{throw Object.assign(new Error('Cross-origin requests are disabled.'),{status:403})}}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon','.json':'application/json','.glb':'model/gltf-binary','.wasm':'application/wasm'};
createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/api/health'&&req.method==='GET')return json(res,200,{configured:!!process.env.GEMINI_API_KEY,model:process.env.GEMINI_MODEL||DEFAULT_MODEL,requiresCode:!!process.env.AI_ACCESS_CODE});
  if(u.pathname==='/api/ai'){
   if(req.method!=='POST')return json(res,405,{error:'Use POST.'});
   assertSameOrigin(req);rateLimit(req.socket.remoteAddress||'local');checkAccess(req.headers['x-ai-access-code'],process.env,!!process.env.GEMINI_API_KEY);
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Use application/json.'});
   const body=await readJSON(req);return json(res,200,await runGemini(body));
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
  let p=decodeURIComponent(u.pathname);if(p==='/')p='/index.html';
  // Only serve front-end files, never server scripts or configuration.
  const isDundeeModel=/^\/assets\/dundee\/(?:maxillary|mandibular)_[a-z_]+\.glb$/.test(p);
  const isDracoDecoder=/^\/assets\/draco\/(?:draco_wasm_wrapper_gltf\.js|draco_decoder_gltf\.(?:js|wasm))$/.test(p);
  if(!isDundeeModel && !isDracoDecoder && !['/index.html','/app.js','/engine.js','/fallback.js','/ai-ui.js','/video-guide.js','/volumetric-lab.js','/volumetric-lab.css','/clinical-pathway.js','/clinical-pathway.css','/desktop-suite.css','/desktop-suite.js','/xr-procedure.js','/xr-guide.js','/real-dental-scene.js','/babylon-preview.js','/babylon-anatomy.js','/dental-appearance.js','/dental-structures.js','/dental-practice.js','/dundee-atlas.js','/app-tutorial.js','/favicon.ico'].includes(p))return json(res,404,{error:'Not found.'});
  const full=path.join(ROOT,p);
  const data=await readFile(full);
  res.writeHead(200,{'content-type':mime[path.extname(full)]||'application/octet-stream','x-content-type-options':'nosniff','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self' https://cdn.babylonjs.com 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: https://cdn.babylonjs.com; worker-src 'self' blob:; frame-src https://www.youtube-nocookie.com https://www.youtube.com; frame-ancestors 'none'; base-uri 'self'"});
  res.end(req.method==='HEAD'?undefined:data);
 }catch(e){const {status,body}=errorPayload(e);return json(res,status,body)}
}).listen(PORT,'127.0.0.1',()=>console.log(`KlinikLab running on http://127.0.0.1:${PORT} | Gemini configured: ${Boolean(process.env.GEMINI_API_KEY)}`));