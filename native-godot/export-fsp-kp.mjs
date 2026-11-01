#!/usr/bin/env node
/**
 * SR11: exact-source bounded pure extraction from original FSP/KP studio.
 * Four independent fictional cases x four source phases; NOT 6 app cases.
 * Only source-provided keyword criteria; no clinical grade/LLM involved.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const args=Object.fromEntries(process.argv.slice(2).map(x=>{
 const i=x.indexOf('=');
 if(!x.startsWith('--')||i<3)throw Error('Expected --key=value');
 return [x.slice(2,i),x.slice(i+1)];
}));
const src=args['source-dir'],output=args.output,sha=args['expected-sha'];
if(!src||!output||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Require --source-dir --output --expected-sha');
const root=fs.realpathSync(src);
if(execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)
 throw Error('FSP/KP source Git HEAD mismatch');
if(fs.existsSync(output))throw Error('Refusing original source-derived FSP/KP overwrite');
const source=fs.readFileSync(path.join(root,'fsp-kp-training.js'),'utf8');
function bounded(from,to,max){
 const i=source.indexOf(from),j=source.indexOf(to,i+from.length);
 if(i<0||j<0||j-i>max||source.indexOf(from,i+1)>=0)throw Error('Unbounded/duplicate FSP source fragment: '+from);
 return source.slice(i,j);
}
const header=bounded(' const PHASES=[',' function taskFor(',28000);
const scoreFns=bounded(' function taskFor(',' const status=',5000);
if(!header.includes(' const CASES={')||!header.includes(' function criterion(')||
  !scoreFns.includes(' function safetyReview(')||!scoreFns.includes(' function score('))
 throw Error('Original FSP source contract changed');
const evaluate=header+'\n'+scoreFns+'\n({PHASES,CASES,score})';
const original=vm.runInNewContext(evaluate,Object.create(null),{timeout:1800});
const IDS=['perio','restoration','endo','surgery'];
const FDI={perio:'46',restoration:'16',endo:'36',surgery:'48'};
const phases=['anamnese','aufklaerung','brief','kollegen'];
if(original.PHASES.length!==4||Object.keys(original.CASES).length!==4)
 throw Error('Exact four FSP fictional cases/four phases required');
const clean=(x)=>JSON.parse(JSON.stringify(x));
const cases={};
const parityProbes=[];
for(const id of IDS){
 const entry=original.CASES[id];
 if(!entry||!entry.title.includes(FDI[id])||typeof entry.facts!=='string'||entry.facts.length<40||
   !Array.isArray(entry.glossary)||entry.glossary.length<3||
   Object.keys(entry.tasks).sort().join(',')!==phases.slice().sort().join(','))
  throw Error('Missing original FSP case '+id);
 const tasks={};
 for(const phase of phases){
  const t=entry.tasks[phase];
  if(!t||!['prompt','b2','c1','model'].every(k=>typeof t[k]==='string'&&t[k].length>=8)||
   !Array.isArray(t.checks)||t.checks.length!==5)throw Error('Original FSP task contract changed '+id+'/'+phase);
  for(const criterion of t.checks){
   if(!['label','tip','pattern'].every(k=>typeof criterion[k]==='string'&&k.length>2)||
     criterion.pattern.length>200)throw Error('Original FSP keyword criterion rejected');
   new RegExp(criterion.pattern,'iu'); // verify original source syntax
  }
  tasks[phase]=clean(t);
  // Reference probes produced by the ORIGINAL scorer, not a new evaluator.
  for(const answer of ['',t.b2,t.c1,t.model]){
   const truth=clean(original.score(id,phase,answer));
   parityProbes.push({caseId:id,phase,answer,lexicalScore:truth.lexicalScore,
    blank:truth.blank,flags:truth.safetyFlags,matched:truth.criteria.map(c=>c.matched)});
  }
 }
 cases[id]={id,fdi:FDI[id],title:entry.title,facts:entry.facts,glossary:clean(entry.glossary),tasks};
}
for(const [id,phase,answer] of [
 ['surgery','aufklaerung','Antibiotika sind immer notwendig.'],
 ['surgery','aufklaerung','Antibiotika sind nicht immer notwendig.'],
 ['surgery','anamnese','Atemnot: zu Hause bleiben.'],
 ['surgery','anamnese','Bei Atemnot keinesfalls abwarten.']
]){
 const truth=clean(original.score(id,phase,answer));
 parityProbes.push({caseId:id,phase,answer,lexicalScore:truth.lexicalScore,
  blank:truth.blank,flags:truth.safetyFlags,matched:truth.criteria.map(c=>c.matched)});
}
const out={schemaVersion:1,kind:'BOUNDED_ORIGINAL_FSP_KP_FORMATIVE_LEXICAL_TRAINING_NOT_CLINICAL_ASSESSMENT',
 sourceGitSHA:sha,sourceFile:'fsp-kp-training.js',
 sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),
 clinicalReviewPending:true,certifiedLanguageExam:false,
 caseOrder:IDS,phaseOrder:phases,phases:clean(original.PHASES),cases,
 parityProbes};
if(parityProbes.length!==68)throw Error('FSP scorer parity probe coverage lost');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log('SR11_SOURCE_FSP_KP_EXPORTED '+IDS.length+' cases x '+phases.length+' phases / '+parityProbes.length+' original scorer reference probes');
