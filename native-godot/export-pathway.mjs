#!/usr/bin/env node
/**
 * Bounded, source-pinned export of the original six fictional browser
 * clinical-pathway.js scenarios. Never executes DOM code or remote calls.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {extractClinicalPathwayLiteral} from './pathway-literal.mjs';
import {execFileSync} from 'node:child_process';
const o=Object.fromEntries(process.argv.slice(2).map(s=>{
 const i=s.indexOf('=');
 if(!s.startsWith('--')||i<3)throw Error('Expected --key=value');
 return [s.slice(2,i),s.slice(i+1)];
}));
const dir=o['source-dir'],out=o.output,sha=o['expected-sha'];
if(!dir||!out||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Expected --source-dir --output --expected-sha');
const root=fs.realpathSync(dir);
if(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)
 throw Error('Source revision differs from native clinical journey export');
const source=fs.readFileSync(path.join(root,'clinical-pathway.js'),'utf8');
const fragment=extractClinicalPathwayLiteral(source);
const scenarios=vm.runInNewContext(fragment+'\n data',Object.create(null),{timeout:1000});
const IDs=['molar','endo','anterior','crown','surgery','perio'];
if(Object.keys(scenarios).sort().join(',')!==[...IDs].sort().join(','))
 throw Error('Original six clinical pathway identities changed');
function checkedText(x){if(typeof x!=='string'||x.length<3||x.length>4000)throw Error('Invalid clinical source text');return x}
const data={};
for(const id of IDs){
 const x=scenarios[id];
 for(const prop of ['chief','why','safety'])checkedText(x[prop]);
 for(const type of ['history','tests']){
  if(!Array.isArray(x[type])||x[type].length<4||x[type].length>15)throw Error(id+' '+type+' not bounded');
  for(const row of x[type]){
   if(!Array.isArray(row)||row.length!==4)throw Error('Wrong source '+type+' row');
   for(let i=0;i<3;i++)checkedText(row[i]);
   if(!['yes','no','bad'].includes(row[3]))throw Error('Unknown source step safety tag');
  }
 }
 for(const type of ['differential','options','procedure']){
  if(!Array.isArray(x[type])||x[type].length<3||x[type].length>10||
     x[type].some(t=>typeof t!=='string'||t.length<3||t.length>1000))
   throw Error('Wrong source '+type);
 }
 for(const prop of ['correct','primary','alternative'])
  if(!Number.isInteger(x[prop])||x[prop]<0||
     x[prop]>=(prop==='correct'?x.differential:x.options).length)
   throw Error('Invalid original '+id+' '+prop+' index');
 if(x.primary===x.alternative)throw Error('Source treatment alternatives identical');
 data[id]=JSON.parse(JSON.stringify(x));
}
const output={schemaVersion:1,kind:'SYNTHETIC_SOURCE_CLINICAL_PATHWAYS_NOT_CERTIFIED',
 sourceGitSHA:sha,sourceFile:'clinical-pathway.js',
 sourceFileSHA256:crypto.createHash('sha256').update(source).digest('hex'),
 clinicalAssessmentValidated:false,cases:data};
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log('KLINIKLAB_ORIGINAL_NATIVE_CLINICAL_PATHWAY_EXPORT 6 cases / 6 stages, SHA='+sha);
