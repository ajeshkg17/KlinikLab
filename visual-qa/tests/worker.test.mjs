import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateJob,validatedBase,localRequestAllowed,safeRunFolder} from '../worker-core.mjs';
const sample=JSON.parse(readFileSync(new URL('../jobs/current.json',import.meta.url),'utf8'));
test('first screenshot job validates',()=>assert.equal(validateJob(sample).scenes.length,11));
test('refuse remote URLs',()=>{
 assert.throws(()=>validatedBase('https://evil.example.com:8787/'));
 assert.equal(localRequestAllowed('https://google.com/'),false);
 assert.equal(localRequestAllowed('http://127.0.0.1:8787/engine.js'),true);
 assert.equal(localRequestAllowed('http://localhost:8787/'),false);
});
test('prevent arbitrary source and commands',()=>{
 assert.throws(()=>validateJob({...sample,scenes:[{name:'malicious',capture:'page',steps:[{action:'eval',script:'process.exit()'}]}]}));
 assert.throws(()=>validateJob({...sample,scenes:[{name:'malicious',capture:'page',steps:[{action:'click',control:'#ai-open'}]}]}));
 assert.throws(()=>safeRunFolder('../secrets'));
});
test('prevent job collision and unbounded shots',()=>{
 assert.throws(()=>validateJob({...sample,scenes:[...sample.scenes,...sample.scenes]}));
 assert.throws(()=>validateJob({...sample,viewport:{width:8000,height:5000}}));
 assert.throws(()=>validateJob({...sample,jobId:'../test'}));
});