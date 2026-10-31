import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {acquireGodotWorkerLease,readGodotWorkerLease,LEASE_NAME} from '../visual-qa/godot-single-instance.mjs';

test('one persistent watcher owns the exclusive lease; --once cannot race it',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kl-godot-lease-'));
 try{
  const first=await acquireGodotWorkerLease(dir);
  const data=await readGodotWorkerLease(dir);
  assert.equal(data.exists,true);
  assert.equal(data.pid,process.pid);
  assert.equal(data.processAlive,true);
  await assert.rejects(acquireGodotWorkerLease(dir),/refusing concurrent watcher/);
  await first.release();
  assert.equal((await readGodotWorkerLease(dir)).exists,false);
  const second=await acquireGodotWorkerLease(dir);
  await second.release();
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});

test('stale PID and malformed lease fail closed: no automatic rerender',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kl-godot-stale-'));
 try{
  await fs.writeFile(path.join(dir,LEASE_NAME),JSON.stringify({pid:2147483647,startedAt:'old'}));
  const status=await readGodotWorkerLease(dir);
  assert.equal(status.exists,true);
  assert.equal(status.processAlive,false);
  await assert.rejects(acquireGodotWorkerLease(dir),/lease already exists/);
  await fs.writeFile(path.join(dir,LEASE_NAME),'{malformed');
  assert.equal((await readGodotWorkerLease(dir)).malformed,true);
  await assert.rejects(acquireGodotWorkerLease(dir),/lease already exists/);
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});

test('--watch polls unique GitHub request; never sends F12 or activates Godot foreground',async()=>{
 const worker=await fs.readFile(new URL('../visual-qa/godot-worker.mjs',import.meta.url),'utf8');
 const core=await fs.readFile(new URL('../visual-qa/godot-job-core.mjs',import.meta.url),'utf8');
 assert.match(worker,/setInterval\(cycle,10000\)/);
 assert.match(worker,/await currentJob\(\)/);
 assert.match(worker,/acquireGodotWorkerLease\(ROOT\)/);
 assert.match(worker,/--lock-status/);
 assert.match(core,/pc-godot-clinic-/);
 assert.match(worker,/sr1c-capture-godot-background-pc\.ps1/);
 assert.match(worker,/\/git\/blobs/);
 assert.match(worker,/GODOT_PC_LATEST\.md/);
 assert.doesNotMatch(worker,/SendKeys|SwitchDesktop\(|SetForegroundWindow\(/);
});
