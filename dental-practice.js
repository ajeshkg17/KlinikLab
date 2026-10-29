'use strict';
/* Phase 6: deterministic, offline tooth-structure practice.
   Uses Phase 5 schematic terminology. This is NOT a clinical exam,
   diagnosis, patient record or medical skill certification.
   Never modifies KlinikLab case scoring, 3D source hit targets or Quest XR. */
(function(root){
  const TYPES=['incisor','canine','premolar','molar'];
  const TYPE_NAMES=['Incisor / Schneidezahn','Canine / Eckzahn','Premolar / Prämolar','Molar / Molar'];
  const ARCHES=['Upper jaw / Oberkiefer','Lower jaw / Unterkiefer'];
  const SIDES=['Right / Rechts','Left / Links'];
  const ROLES=['Cutting edge','Pointed cusp','Occlusal cusps','Broad multi-cusp crown'];
  const QUADRANTS=['Upper right permanent','Upper left permanent','Lower left permanent','Lower right permanent'];
  const TISSUES=[
    {id:'enamel',question:'Which tissue forms the outer covering of the anatomical crown?',
     correct:'Enamel / Zahnschmelz',explanation:'Enamel covers the crown and is highly mineralized.'},
    {id:'dentin',question:'Which tissue forms most of the bulk of a tooth?',
     correct:'Dentin / Zahnbein',explanation:'Dentin underlies enamel and cementum and makes up most tooth structure.'},
    {id:'pulp',question:'Which tissue space contains the dental nerves and blood vessels?',
     correct:'Pulp / Pulpa',explanation:'Pulp occupies the pulp chamber and the root canal system.'},
    {id:'cementum',question:'Which mineralized tissue covers the root surface?',
     correct:'Cementum / Wurzelzement',explanation:'Cementum covers the root, helping anchor periodontal attachment fibers.'},
    {id:'ligament',question:'Which connective tissue attaches the tooth root to alveolar bone?',
     correct:'Periodontal ligament / Desmodont',explanation:'Periodontal ligament fibers connect cementum and alveolar bone.'}
  ];
  const tissueOptions=TISSUES.map(t=>t.correct);
  const allowedIds=/^[1-4][1-8]$/;
  const status={version:1,open:false,started:false,selectedFDI:null,questionIndex:0,
    total:10,score:0,answered:false,completed:false,lastCorrect:null};
  let questions=[],panel=null,sourcePanel=null,startButton=null,answerButtons=[],feedback=null,nextButton=null;
  const explorer=()=>root.KlinikStructureExplorer;
  function rotate(options,seed){
    const offset=seed%options.length,out=options.slice(offset).concat(options.slice(0,offset));
    return seed%2?out.reverse():out;
  }
  function makeQuestion(id,text,options,correct,explanation,seed){
    if(!options.includes(correct)||new Set(options).size!==4)throw Error('Invalid educational question '+id);
    return Object.freeze({id,text,options:Object.freeze(rotate(options,seed)),correct,explanation});
  }
  function buildQuestions(fdi){
    const detail=explorer()?.descriptor(fdi);
    if(!detail||!allowedIds.test(detail.id))throw Error('Select a permanent FDI tooth before starting anatomy practice.');
    const kindIndex=TYPES.indexOf(detail.kind);
    const archIndex=detail.quadrant<=2?0:1,sideIndex=detail.quadrant===1||detail.quadrant===4?0:1;
    const questionsOut=TISSUES.map((t,i)=>makeQuestion('layer-'+t.id,t.question,
      [t.correct,...tissueOptions.filter(x=>x!==t.correct).slice(0,3)],t.correct,t.explanation,
      Number(fdi)+i*3));
    questionsOut.push(makeQuestion('fdi-class','Tooth FDI '+fdi+': which tooth class is it?',
      TYPE_NAMES,TYPE_NAMES[kindIndex],
      'The second FDI digit '+detail.ordinal+' identifies its position from the midline; tooth classes follow that position.',Number(fdi)+15));
    questionsOut.push(makeQuestion('fdi-arch','Tooth FDI '+fdi+': which jaw is it in?',
      [...ARCHES,'Primary / Milchgebiss','Unspecified jaw'],ARCHES[archIndex],
      'Permanent FDI quadrants 1 and 2 are maxillary; 3 and 4 are mandibular.',Number(fdi)+16));
    questionsOut.push(makeQuestion('fdi-side','Tooth FDI '+fdi+': which patient side is it on?',
      [...SIDES,'Both sides','Midline only'],SIDES[sideIndex],
      'Permanent FDI quadrants 1 and 4 are on the patient’s right; 2 and 3 on the patient’s left.',Number(fdi)+17));
    questionsOut.push(makeQuestion('fdi-role','Tooth FDI '+fdi+': which role best fits this crown class?',
      ROLES,ROLES[kindIndex],'This is a broad morphological teaching description, not an individualized bite assessment.',
      Number(fdi)+18));
    questionsOut.push(makeQuestion('fdi-quadrant','Tooth FDI '+fdi+': what does the first digit '+detail.quadrant+' encode?',
      QUADRANTS,QUADRANTS[detail.quadrant-1],
      'The first digit gives the permanent quadrant; the second digit counts teeth outward from the midline.',
      Number(fdi)+19));
    return Object.freeze(questionsOut);
  }
  function current(){return questions[status.questionIndex]||null}
  function updateHeader(){
    if(!panel)return;
    const progress=panel.querySelector('#practice-progress');
    if(progress)progress.textContent=status.completed?'Complete · '+status.total+' / '+status.total:
      (status.questionIndex+1)+' / '+status.total;
    const score=panel.querySelector('#practice-score');
    if(score)score.textContent='Score: '+status.score+' / '+status.total;
  }
  function render(){
    if(!panel)return;
    updateHeader();
    const q=current(),prompt=panel.querySelector('#practice-question'),
      options=panel.querySelector('#practice-options');
    const results=panel.querySelector('#practice-results');
    if(status.completed){
      if(prompt)prompt.textContent='Session complete';
      if(options)options.hidden=true;
      if(results){results.hidden=false;results.textContent='You answered '+status.score+
        ' of '+status.total+' correctly. Review the tissue diagrams, then try again.';}
      if(feedback){feedback.textContent='';feedback.hidden=true;}
      if(nextButton)nextButton.hidden=true;
      return;
    }
    if(!q)return;
    if(prompt)prompt.textContent=q.text;
    if(options)options.hidden=false;
    if(results)results.hidden=true;
    answerButtons.forEach((b,i)=>{
      b.textContent=String.fromCharCode(65+i)+'. '+q.options[i];
      b.disabled=status.answered;
      b.style.borderColor=status.answered&&q.options[i]===q.correct?'#7bcdb3':'#52717e';
      b.style.background=status.answered&&q.options[i]===q.correct?'#1f5b4b':'#1b3541';
      b.setAttribute('aria-label','Option '+String.fromCharCode(65+i)+': '+q.options[i]);
    });
    if(nextButton){
      nextButton.hidden=!status.answered;
      nextButton.textContent=status.questionIndex===status.total-1?'Finish practice':'Next question';
    }
    if(feedback){feedback.hidden=!status.answered;}
  }
  function start(fdi){
    const id=fdi||explorer()?.status?.selectedFDI||root.kliniklab?.selectedTooth;
    questions=buildQuestions(id);
    Object.assign(status,{open:true,started:true,selectedFDI:String(id),questionIndex:0,
      total:questions.length,score:0,answered:false,completed:false,lastCorrect:null});
    if(panel){
      panel.hidden=false;
      if(sourcePanel)sourcePanel.style.display='none';
      render();panel.scrollTop=0;
    }
    return current();
  }
  function answer(index){
    const q=current();
    if(!status.open||!q||status.answered||status.completed||!Number.isInteger(index)||
      index<0||index>=q.options.length)return null;
    status.answered=true;
    const correct=q.options[index]===q.correct;
    status.lastCorrect=correct;
    if(correct)status.score++;
    if(feedback){
      feedback.hidden=false;
      feedback.textContent=(correct?'Correct. ':'Not quite. Correct answer: '+q.correct+'. ')+q.explanation;
    }
    render();
    return correct;
  }
  function next(){
    if(!status.answered||status.completed)return false;
    if(status.questionIndex===status.total-1){status.completed=true;render();return true;}
    status.questionIndex++;status.answered=false;status.lastCorrect=null;
    render();if(panel)panel.scrollTop=0;return true;
  }
  function close(){
    if(panel)panel.hidden=true;
    if(sourcePanel)sourcePanel.style.display='';
    status.open=false;
  }
  function init(){
    if(panel||typeof document==='undefined')return;
    sourcePanel=document.getElementById('structure-panel');
    const stage=document.getElementById('stage');
    if(!sourcePanel||!stage)return;
    startButton=document.createElement('button');
    startButton.id='practice-toggle';startButton.type='button';
    startButton.textContent='Practice anatomy · 10 questions';
    startButton.title='Start a local educational challenge for the selected FDI tooth. No patient data or session history is saved.';
    startButton.style.cssText='display:block;margin:9px 0;padding:7px 9px;border:1px solid #679c95;border-radius:7px;background:#26545b;color:#f1fffc;font:650 11px system-ui;cursor:pointer;';
    startButton.addEventListener('click',()=>{
      try{start();}catch(e){
        const hint=sourcePanel.querySelector('#practice-start-hint');
        if(hint)hint.textContent=String(e.message||e);
      }
    });
    sourcePanel.appendChild(startButton);
    const hint=document.createElement('p');hint.id='practice-start-hint';
    hint.setAttribute('role','status');hint.style.cssText='font-size:10px;color:#c8d9db;margin:0;';
    sourcePanel.appendChild(hint);
    panel=document.createElement('section');panel.id='practice-panel';panel.hidden=true;
    panel.setAttribute('role','region');panel.setAttribute('aria-label','Dental anatomy practice');
    panel.style.cssText='position:absolute;right:15px;top:72px;z-index:9;width:min(315px,calc(100% - 30px));max-height:calc(100% - 120px);overflow:auto;border:1px solid #486a73;border-radius:13px;background:rgba(10,29,39,.98);color:#e8f3f0;padding:13px 14px;box-shadow:0 12px 28px #0008;pointer-events:auto;font:12px/1.45 system-ui,sans-serif;';
    const top=document.createElement('div');top.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:6px;';
    const title=document.createElement('strong');title.textContent='Anatomy practice / Anatomieübungen';title.style.cssText='font-size:13px;';
    const back=document.createElement('button');back.id='practice-close';back.type='button';back.textContent='Back to anatomy';
    back.style.cssText='padding:5px;background:#294651;border:1px solid #52717e;border-radius:6px;color:#e6f5f1;font-size:10px;';
    back.addEventListener('click',close);top.append(title,back);panel.appendChild(top);
    const subtitle=document.createElement('p');subtitle.textContent='10 questions · selected FDI tooth + tissue terminology. No score is stored.';
    subtitle.style.cssText='font-size:11px;color:#a9c9d0;';panel.appendChild(subtitle);
    const scoreRow=document.createElement('div');scoreRow.style.cssText='display:flex;justify-content:space-between;gap:8px;margin:8px 0;';
    const progress=document.createElement('strong');progress.id='practice-progress';
    const score=document.createElement('strong');score.id='practice-score';scoreRow.append(progress,score);panel.appendChild(scoreRow);
    const prompt=document.createElement('p');prompt.id='practice-question';prompt.style.cssText='font-size:13px;min-height:49px;font-weight:650;margin:8px 0;';panel.appendChild(prompt);
    const options=document.createElement('div');options.id='practice-options';options.style.cssText='display:grid;gap:7px;';
    answerButtons=[];
    for(let i=0;i<4;i++){
      const b=document.createElement('button');b.type='button';b.dataset.index=String(i);
      b.setAttribute('data-practice-option',String(i));
      b.style.cssText='padding:9px;text-align:left;background:#1b3541;color:#edf7f4;border:1px solid #52717e;border-radius:7px;font-size:11px;';
      b.addEventListener('click',()=>answer(i));options.appendChild(b);answerButtons.push(b);
    }
    panel.appendChild(options);
    feedback=document.createElement('p');feedback.id='practice-feedback';feedback.hidden=true;feedback.setAttribute('role','status');
    feedback.style.cssText='padding:9px 0;color:#d0e7df;font-size:11px;';panel.appendChild(feedback);
    const results=document.createElement('p');results.id='practice-results';results.hidden=true;
    results.setAttribute('role','status');results.style.cssText='font-size:12px;';panel.appendChild(results);
    nextButton=document.createElement('button');nextButton.id='practice-next';nextButton.type='button';nextButton.hidden=true;
    nextButton.textContent='Next question';nextButton.style.cssText='padding:8px;background:#28635a;border:1px solid #62998a;border-radius:7px;color:#f2fdf8;font:650 12px system-ui;';
    nextButton.addEventListener('click',next);panel.appendChild(nextButton);
    const restart=document.createElement('button');restart.id='practice-restart';restart.type='button';restart.textContent='Restart';
    restart.style.cssText='margin:8px 0 0 8px;padding:8px;background:#304650;border:1px solid #4b646b;border-radius:7px;color:#e6f4f1;font-size:11px;';
    restart.addEventListener('click',()=>start(status.selectedFDI));panel.appendChild(restart);
    const notice=document.createElement('p');notice.textContent='Educational recall only: not clinical diagnosis, operative assessment, or examination certification.';
    notice.style.cssText='font-size:10px;color:#b2c4c8;';panel.appendChild(notice);
    stage.appendChild(panel);
  }
  root.KlinikAnatomyPractice={version:1,status,buildQuestions,start,answer,next,close,init,
    get currentQuestion(){return current()}};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
  }
})(typeof window!=='undefined'?window:globalThis);
