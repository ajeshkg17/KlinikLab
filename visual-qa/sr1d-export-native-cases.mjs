#!/usr/bin/env node
/**
 * SR1D: Export actual production KlinikLab case/station definitions to a small,
 * strictly typed native Godot data contract. Only literal CASES/STATIONS from
 * app.js are evaluated in an isolated VM (the browser app is NOT executed).
 * App state, AI, clinical scoring and voxel editing are not ported here.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

function flag(name){
 const entry=process.argv.slice(2).find(x=>x.startsWith('--'+name+'='));
 return entry?.slice(name.length+3);
}
const sourceDir=flag('source-dir'),output=flag('output'),expectedSha=flag('expected-sha');
if(!sourceDir||!output||!expectedSha||!/^[a-f0-9]{40}$/.test(expectedSha))
 throw Error('Requires --source-dir, --output, --expected-sha (40 hex)');
const realDir=fs.realpathSync(sourceDir);
const actual=execFileSync('git',['-C',realDir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(actual!==expectedSha)throw Error('Native case export source revision is NOT exact pinned commit');
const input=path.join(realDir,'app.js'),src=fs.readFileSync(input,'utf8');
function literal(name){
 const start=src.indexOf('const '+name+'=[');
 if(start<0)throw Error('Missing production '+name);
 const end=src.indexOf('\n];',start);
 if(end<0||end-start>100000)throw Error('Unbounded source literal '+name);
 return src.slice(start,end+3);
}
const data=vm.runInNewContext(
 literal('CASES')+'\n'+literal('STATIONS')+'\n({cases:CASES,stations:STATIONS})',
 Object.create(null),{timeout:1500});
if(!Array.isArray(data.cases)||data.cases.length!==6||!Array.isArray(data.stations)||data.stations.length!==7)
 throw Error('Production native-case parity requires exactly six cases/seven stations');
const caseIds=['molar','endo','anterior','crown','surgery','perio'];
const caseFDI=['16','36','11','26','48','46'];
const uniqueIds=new Set(),uniqueStations=new Set();
const cases=data.cases.map((c,i)=>{
 if(c.id!==caseIds[i]||String(c.num)!==caseFDI[i]||uniqueIds.has(c.id))
  throw Error('Production case identity/order mismatch: '+i);
 uniqueIds.add(c.id);
 for(const key of ['title','subtitle','complaint','history','exam','risk','diagnosis','planA','planB','prepType']){
  if(typeof c[key]!=='string'||c[key].length<3||c[key].length>3000)
   throw Error('Missing or invalid production clinical text '+c.id+'/'+key);
 }
 // Deliberately do not export synthetic patient name, age, or dialogue history.
 const {id,num,title,subtitle,complaint,history,exam,risk,diagnosis,planA,planB,prepType}=c;
 return {id,fdi:String(num),title,subtitle,complaint,history,exam,risk,diagnosis,
  primaryPlan:planA,alternativePlan:planB,prepType};
});
const stations=data.stations.map((s,i)=>{
 if(typeof s.id!=='string'||uniqueStations.has(s.id)||!s.name||!s.track||!s.desc)
  throw Error('Production station identity mismatch: '+i);
 uniqueStations.add(s.id);
 return {id:s.id,track:s.track,title:s.name,subtitle:s.short,description:s.desc};
});
const manifest={
 schemaVersion:1,kind:'PRODUCTION_CASE_AND_STATION_METADATA_NOT_FULL_APP',
 sourceGitSHA:actual,sourceFile:'app.js',
 sourceFileSHA256:crypto.createHash('sha256').update(src).digest('hex'),
 caseCount:cases.length,stationCount:stations.length,cases,stations,
 missingNativeFeatures:['browser clinical journey','AI patient dialogue',
  'clinical scoring and reports','3D non-FDI16 production tooth volumes',
  'real drillable multi-tooth meshes','32-tooth atlas','Quest streaming'],
 syntheticCasesOnly:true,clinicalAssessmentValidated:false,
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('SR1D exact-source clinic cases exported, not full application: '+cases.length+' cases / '+stations.length+' stations');
