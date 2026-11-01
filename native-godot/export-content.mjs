#!/usr/bin/env node
/**
 * KlinikLab native application CONTENT export: exact commit pinned, no eval of
 * executable browser code or runtime imports. Only seven bounded literal data
 * tables from the original production app.js are evaluated in isolated VM.
 * This is source content, not a claim that all browser systems were migrated.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const flags=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{
 const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)];
}));
const dir=flags['source-dir'],output=flags.output,sha=flags['expected-sha'];
if(!dir||!output||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('Require --source-dir --output --expected-sha');
const real=fs.realpathSync(dir),actual=execFileSync('git',['-C',real,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(actual!==sha)throw Error('Original production Git HEAD source mismatch');
const file=path.join(real,'app.js'),source=fs.readFileSync(file,'utf8');
const names=['CASES','STATIONS','TOOLS','FSP_DIALOGUE','HANDOVER','VIVA','CLINIC'];
function literal(name){
 const array=name!=='TOOLS';
 const marker='const '+name+'='+ (array?'[':'{');
 const start=source.indexOf(marker);
 if(start<0||source.indexOf(marker,start+1)>=0)throw Error('Missing or duplicate production '+name);
 const end=source.indexOf('\n'+(array?'];':'};'),start);
 if(end<0||end-start>80000)throw Error('Unbounded source table '+name);
 return source.slice(start,end+3);
}
const parsed=vm.runInNewContext(names.map(literal).join('\n')+
  '\n({'+names.map(n=>n+':'+n).join(',')+'})',
 Object.create(null),{timeout:1400});
const expectedCases=['molar','endo','anterior','crown','surgery','perio'];
const expectedFDI=['16','36','11','26','48','46'];
const expectedStations=['interview','letter','handover','written','practical','viva','clinic'];
if(parsed.CASES.length!==6||parsed.STATIONS.length!==7)throw Error('Production six cases seven stations required');
function plain(v){
 if(typeof v==='string'){if(v.length>5000)throw Error('Overlong production string');return v}
 if(typeof v==='number'||typeof v==='boolean'||v===null)return v;
 if(Array.isArray(v)){if(v.length>60)throw Error('Overlong source table');return Array.from(v,plain)}
 if(v&&typeof v==='object'){
  const out=Object.create(null);
  for(const [key,value]of Object.entries(v)){
   if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(key))throw Error('Unsafe source data key');
   out[key]=plain(value);
  }
  return out;
 }
 throw Error('Unsupported source data type');
}
const cases=parsed.CASES.map((c,i)=>{
 if(c.id!==expectedCases[i]||String(c.num)!==expectedFDI[i])throw Error('Wrong source case/order');
 for(const k of ['title','subtitle','complaint','history','exam','risk','diagnosis','planA','planB','qp','prepType','name']){
  if(typeof c[k]!=='string'||c[k].length<3)throw Error('Missing case field '+c.id+'/'+k);
 }
 if(!Number.isInteger(c.age)||c.age<18||c.age>110||
    !Array.isArray(c.patientReply)||c.patientReply.length!==7||
    c.patientReply.some(t=>typeof t!=='string'||t.length<8))
   throw Error('Original guided patient responses missing '+c.id);
 return plain({id:c.id,fdi:String(c.num),title:c.title,subtitle:c.subtitle,
  patientName:c.name,patientAge:c.age,patientReply:c.patientReply,
  complaint:c.complaint,
  history:c.history,exam:c.exam,risk:c.risk,diagnosis:c.diagnosis,
  primaryPlan:c.planA,alternativePlan:c.planB,question:c.qp,prepType:c.prepType,
  vocab:c.vocab,keywords:c.keywords});
});
const stations=parsed.STATIONS.map((s,i)=>{
 if(s.id!==expectedStations[i]||!s.name||!s.desc||!s.track)throw Error('Wrong source station '+i);
 return plain({id:s.id,title:s.name,subtitle:s.short,description:s.desc,track:s.track});
});
const normalizedQuiz=(rows,id)=>{
 if(!Array.isArray(rows)||rows.length<5)throw Error('Quiz missing '+id);
 return Array.from(rows,(r,i)=>{
  const question=r.prompt||r.question||r.q;
  const explanation=r.why||r.explain;
  if(typeof question!=='string'||question.length<8||
   !Array.isArray(r.options)||r.options.length!==3||
   r.options.some(x=>typeof x!=='string'||x.length<5)||
   !Number.isInteger(r.correct)||r.correct<0||r.correct>2||
   typeof explanation!=='string'||explanation.length<9)throw Error('Invalid source exercise '+id+'/'+i);
  return plain({title:String(r.title||r.topic||id),question,options:r.options,correct:r.correct,explanation});
 });
};
const quiz={
 interview:normalizedQuiz(parsed.FSP_DIALOGUE,'interview'),
 handover:normalizedQuiz(parsed.HANDOVER,'handover'),
 viva:normalizedQuiz(parsed.VIVA,'viva'),
 clinic:normalizedQuiz(parsed.CLINIC,'clinic')
};
const practicalStart=source.indexOf('function getPractical(caseData){');
const practicalEnd=source.indexOf('\nclass PrepCanvas',practicalStart);
if(practicalStart<0||practicalEnd<practicalStart||practicalEnd-practicalStart>16000)
 throw Error('No bounded production case-specific practical task function');
const taskFunction=source.slice(practicalStart,practicalEnd);
if(/\b(?:fetch|eval|Function|require|import|process|globalThis|document|window)\b/.test(taskFunction))
 throw Error('Unexpected browser/runtime dependency in original practical-task builder');
const rawPractical=vm.runInNewContext(literal('CASES')+'\n'+taskFunction+
 '\nCASES.map(c=>getPractical(c))',Object.create(null),{timeout:1400});
if(rawPractical.length!==6)throw Error('All six original clinical practical workflows required');
const practical=rawPractical.map((steps,i)=>{
 if(!Array.isArray(steps)||steps.length<5||steps.length>20)throw Error('Missing practical steps for '+expectedCases[i]);
 return steps.map((t,j)=>{
  if(!['tooth','tool','choice','drill'].includes(t.type)||
     typeof t.title!=='string'||t.title.length<3||
     typeof t.detail!=='string'||t.detail.length<5)
   throw Error('Invalid original practical task '+expectedCases[i]+'/'+j);
  if(t.type==='choice'&&(!Array.isArray(t.options)||t.options.length!==3||
    !Number.isInteger(t.correct)||t.correct<0||t.correct>2||
    typeof t.explain!=='string'))throw Error('Malformed original practical decision');
  if(t.type==='tooth'&&String(t.target)!==expectedFDI[i])throw Error('Wrong tooth identity in original practical task');
  if(t.type==='tool'&&(typeof t.target!=='string'||!Object.hasOwn(parsed.TOOLS,t.target)))throw Error('Unrecognized source tool target');
  // Drill remains narrative only: exporting steps does NOT port physical or voxel behavior.
  return plain({type:t.type,title:t.title,detail:t.detail,
   target:t.target??'',success:t.success??'',options:t.options??[],
   correct:t.correct??-1,explanation:t.explain??''});
 });
});
const tools=Object.entries(parsed.TOOLS).map(([id,label])=>{
 if(!/^[a-z]{2,20}$/.test(id)||!Array.isArray(label)||label.length!==2)throw Error('Source instrument invalid');
 return plain({id,german:label[0],english:label[1]});
});
if(tools.length<15)throw Error('Instrument catalog too small');
const manifest={
 schemaVersion:2,kind:'SOURCE_DERIVED_NATIVE_APP_CONTENT_NOT_FUNCTIONAL_PARITY',
 sourceGitSHA:sha,sourceAppSHA256:crypto.createHash('sha256').update(source).digest('hex'),
 syntheticCasesOnly:true,clinicalAssessmentValidated:false,
 cases,stations,quiz,tools,practical,
 migrationGates:{
  clinicalCases:'SOURCE_CONTENT_EXPORTED',
  stationExercises:'SOURCE_QUIZ_CONTENT_EXPORTED',
  guidedPatientResponse:'ORIGINAL_PATIENT_REPLIES_EXPORTED_MCQ_TRIGGERED',
  caseSpecificPracticalChoices:'SOURCE_TASKS_EXPORTED_NATIVE_INTERACTION_PARTIAL',
  interactiveThreeDPreparation:'NOT_PORTED',
  fspKpFormativeRubric:'NOT_PORTED',
  scanImportAndRadiography:'NOT_PORTED',
  reportingAndExport:'NOT_PORTED',
  optionalServerAI:'NOT_PORTED',
  immersiveQuestInput:'NOT_PORTED',
  anatomyAtlas:'NOT_PORTED'
 }
};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('NATIVE_APP_SOURCE_CONTENT_EXPORTED cases='+cases.length+' stations='+stations.length+
 ' quizzes='+Object.values(quiz).reduce((n,a)=>n+a.length,0)+' tools='+tools.length);
