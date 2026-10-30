import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateXRJob} from '../xr-job-core.mjs';
const valid=JSON.parse(fs.readFileSync(new URL('../jobs/xr-current.json',import.meta.url),'utf8'));
test('bounded ten-state XR request validates and preserves exact commit',()=>{const j=validateXRJob(valid);assert.equal(j.commit.length,40);assert.equal(j.captures.length,10)});
test('reject arbitrary actions and custom URLs',()=>{for(const extra of [{command:'rm -rf /'},{url:'https://elsewhere.test'},{script:'alert(1)'}])assert.throws(()=>validateXRJob({...valid,...extra}))});
test('require unique safe IDs and exact 40-character hexadecimal commits',()=>{for(const x of ['../unsafe','too short','id'])assert.throws(()=>validateXRJob({...valid,jobId:x}));assert.throws(()=>validateXRJob({...valid,commit:'main'}))});
test('reject omitted/extra scenes, timeouts and unknown suites',()=>{assert.throws(()=>validateXRJob({...valid,captures:['room-table']}));assert.throws(()=>validateXRJob({...valid,deadlineMs:130000}));assert.throws(()=>validateXRJob({...valid,suite:'shell'}))});
