/** Fail-closed owner-PC lease for a single Godot evidence worker.
 * A crash deliberately leaves the file behind: never auto-rerun an uncertain job.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export const LEASE_NAME='godot-worker-active.lock';

export async function readGodotWorkerLease(root){
 const file=path.join(root,LEASE_NAME);
 let raw;
 try { raw=await fs.readFile(file,'utf8'); }
 catch(e){if(e.code==='ENOENT')return {exists:false};throw e}
 let record=null;
 try {record=JSON.parse(raw)}catch{}
 let alive=null;
 if(record&&Number.isSafeInteger(record.pid)&&record.pid>0){
  try {process.kill(record.pid,0);alive=true}
  catch(e){alive=e.code==='ESRCH'?false:true}
 }
 return {exists:true,file,pid:record?.pid??null,startedAt:record?.startedAt??null,
  jobPoller:record?.jobPoller??null,processAlive:alive,malformed:!record};
}

export async function acquireGodotWorkerLease(root){
 await fs.mkdir(root,{recursive:true});
 const file=path.join(root,LEASE_NAME);
 let handle;
 try{handle=await fs.open(file,'wx',0o600)}
 catch(e){
  if(e.code!=='EEXIST')throw e;
  const prior=await readGodotWorkerLease(root);
  throw Error('Godot worker lease already exists; refusing concurrent watcher/--once. '+
   'PID='+String(prior.pid)+' alive='+String(prior.processAlive)+
   '. Inspect the lock and ledger; NEVER delete a live lock or rerun an executing job.');
 }
 try{
  const record={pid:process.pid,startedAt:new Date().toISOString(),
   jobPoller:'visual-qa/godot-worker.mjs',host:process.env.COMPUTERNAME||'unknown',
   processRun:'single-watcher-per-owner-PC'};
  await handle.writeFile(JSON.stringify(record,null,2),'utf8');
  await handle.sync();
 }catch(e){await handle.close();await fs.unlink(file).catch(()=>{});throw e}
 let closed=false;
 return {file,release:async()=>{
  if(closed)return;
  closed=true;
  await handle.close();
  // Never unlink another instance's lease if a user replaced this file.
  const active=await readGodotWorkerLease(root);
  if(active.exists&&active.pid===process.pid)await fs.unlink(file);
 }};
}
