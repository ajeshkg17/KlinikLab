'use strict';
/* In-app orientation only: no case switching, practice scoring, drilling or XR actions. */
(function(root){
 const STEPS=Object.freeze([
  {id:'welcome',selector:'#help',title:'Welcome to KlinikLab',
   body:'KlinikLab combines clinical-case rehearsal, a 3D dental scene, FDI tooth identification, and German dental terminology. This guided tour identifies the controls without operating them for you.',
   tip:'Select Next to continue, Back to review, or Skip to close.'},
  {id:'stations',selector:'#training-nav',fallback:'#open-nav',title:'Choose a case and station',
   body:'Use the left navigation to select a fictional patient case and an FSP, KP, or clinic-workflow station. On smaller screens open Cases & stations first.',
   tip:'The tutorial does not change cases, stations, or stored training progress.'},
  {id:'scene',selector:'#scene',title:'Navigate the 3D scene',
   body:'Drag to orbit the dental model, scroll to zoom, and click a tooth or instrument to select it. On mobile, use the supported touch gestures.',
   tip:'The scene is educational and not a diagnostic imaging tool.'},
  {id:'views',selector:'#stage-controls .stage-controls',title:'Explore available views',
   body:'3D clinic displays the interactive model. Teeth focuses the dental arches; Both arches cycles jaw visibility; Occlusal changes the viewing angle. Image brief is only a schematic radiographic illustration.',
   tip:'3D Präparation opens a separate volume-training workspace; 2D Übung is a tracing exercise.'},
  {id:'fdi',selector:'#chart',fallback:'#case-quick',title:'Find a tooth with FDI numbering',
   body:'The chart under the scene lists 32 permanent teeth. First digit: quadrant 1 upper-right, 2 upper-left, 3 lower-left, 4 lower-right. The second digit counts teeth from the midline.',
   tip:'Try FDI 11 for an upper central incisor or 36 for a lower first molar.'},
  {id:'tools',selector:'#tray',fallback:'#chart',title:'Select instruments',
   body:'The instrument tray lists simulated tools. In the clinic view you can inspect the workspace and select instruments for supported activities.',
   tip:'Instrument selection does not simulate real tactile force or clinical skill.'},
  {id:'anatomy',selector:'#structure-toggle',fallback:'#focus',title:'Learn the tooth layers',
   body:'Select an FDI tooth and open Tooth layers · Schnittbild. Explore enamel, dentin, pulp, cementum, and periodontal ligament; optionally focus the selected tooth in the desktop anatomy renderer.',
   tip:'This cutaway is schematic; it is not a scan-derived root canal map.'},
  {id:'practice',selector:'#structure-toggle',fallback:'#focus',title:'Try anatomy practice',
   body:'Inside the tooth-layer explorer choose Practice anatomy · 10 questions. Answer each item, review its explanation and session score, and use Restart or Back to anatomy when finished.',
   tip:'The quiz is for recall only and does not certify clinical or examination competence.'},
  {id:'clinical',selector:'.right',fallback:'#jump-exercise',title:'Work through clinical stations',
   body:'The right panel shows a fictional case, tasks, terminology and feedback. Read the prompt, complete the activity in its workspace, and press Continue to advance.',
   tip:'The simulator is not affiliated with a German examination board.'},
  {id:'vr',selector:'#vr',title:'Quest VR and further help',
   body:'The Quest button starts a separate immersive pathway only on a compatible headset in a secure HTTPS context. Desktop anatomy, quiz and text-entry tasks may not be available in immersive VR.',
   tip:'Reopen this tutorial anytime from the Guide button. The tour never starts a VR session.'}
 ]);
 const status={version:1,open:false,index:0,total:STEPS.length,currentId:null};
 let card=null,ring=null,trigger=null,previousFocus=null;
 let counter=null,heading=null,body=null,tip=null,back=null,next=null;
 const css=[
 '#kl-tour-panel{position:fixed;right:22px;bottom:22px;width:min(375px,calc(100vw - 30px));max-height:min(72vh,560px);overflow:auto;z-index:10003;background:#0d2935;color:#e8f7f3;border:1px solid #70aaa7;border-radius:15px;box-shadow:0 18px 65px #000a;padding:16px 17px;font:13px/1.5 system-ui,-apple-system,sans-serif}',
 '#kl-tour-panel h2{font-size:17px;line-height:1.24;margin:8px 0 10px;color:#f1fffb}',
 '#kl-tour-panel p{margin:8px 0;color:#d0e5e5}',
 '#kl-tour-panel #kl-tour-tip{background:#1a4146;border-left:3px solid #77cdbb;border-radius:4px;padding:9px 10px;color:#cceee3;font-size:11px}',
 '#kl-tour-panel .kl-tour-controls{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:13px}',
 '#kl-tour-panel button{border-radius:8px;padding:8px 12px;border:1px solid #628b91;color:#f1fbf8;background:#244754;font-weight:650;cursor:pointer}',
 '#kl-tour-panel button:hover{background:#356272}',
 '#kl-tour-panel #kl-tour-next{background:#12877e;border-color:#45b8a8}',
 '#kl-tour-panel button:focus-visible{outline:3px solid #e4c86c;outline-offset:2px}',
 '#kl-tour-panel button:disabled{opacity:.45;cursor:default}',
 '#kl-tour-ring{position:fixed;pointer-events:none;z-index:10002;border:3px solid #e9ce7a;border-radius:10px;box-shadow:0 0 0 5px #1db6a733,0 0 22px #d8d78b80;transition:top .15s,left .15s,width .15s,height .15s}',
 '#kl-tour-bar{height:5px;border-radius:12px;background:#31505a;overflow:hidden;margin:8px 0 14px}',
 '#kl-tour-bar span{display:block;height:100%;background:#7bd6bf;transition:width .18s}',
 '@media(max-width:650px){#kl-tour-panel{left:15px;right:15px;bottom:12px;width:auto;max-height:52vh;padding:13px}#kl-tour-panel h2{font-size:15px}#kl-tour-ring{border-width:2px}}'
 ].join('');
 function element(tag,id,text){
  const e=document.createElement(tag);if(id)e.id=id;if(text!==undefined)e.textContent=text;return e;
 }
 function resolveTarget(step){
  const target=document.querySelector(step.selector);
  if(target){const rect=target.getBoundingClientRect();if(rect.width>0&&rect.height>0&&rect.right>0&&rect.left<(root.innerWidth||1024))return target;}
  return step.fallback?document.querySelector(step.fallback):null;
 }
 function place(){
  if(!status.open||!ring||!card)return;
  const t=resolveTarget(STEPS[status.index]);
  if(!t){ring.hidden=true;return}
  const rect=t.getBoundingClientRect();
  const width=root.innerWidth||1024,height=root.innerHeight||768;
  if(rect.width<1||rect.height<1||rect.bottom<0||rect.top>height){ring.hidden=true;return}
  const m=4;ring.hidden=false;
  ring.style.left=Math.max(0,rect.left-m)+'px';ring.style.top=Math.max(0,rect.top-m)+'px';
  ring.style.width=Math.max(0,Math.min(width,rect.right+m)-Math.max(0,rect.left-m))+'px';
  ring.style.height=Math.max(0,Math.min(height,rect.bottom+m)-Math.max(0,rect.top-m))+'px';
  if(width>900){
   const onRight=rect.left>width*.52&&rect.top>height*.30;
   card.style.left=onRight?'22px':'auto';card.style.right=onRight?'auto':'22px';
  }else{card.style.left='';card.style.right=''}
 }
 function render(){
  if(!status.open)return;
  const s=STEPS[status.index];status.currentId=s.id;
  counter.textContent='GUIDED TOUR · '+(status.index+1)+' / '+STEPS.length;
  heading.textContent=s.title;body.textContent=s.body;tip.textContent=s.tip;
  card.querySelector('#kl-tour-bar span').style.width=(100*(status.index+1)/STEPS.length)+'%';
  back.disabled=status.index===0;
  next.textContent=status.index===STEPS.length-1?'Finish':'Next →';
  const t=resolveTarget(s);
  if(t&&typeof t.scrollIntoView==='function')t.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  place();
  if(typeof root.setTimeout==='function')root.setTimeout(place,40);
 }
 function go(index){
  if(!status.open||!Number.isInteger(index)||index<0||index>=STEPS.length)return false;
  status.index=index;render();return true;
 }
 function open(){
  init();if(!card)return false;
  if(status.open){card.focus();return true}
  previousFocus=document.activeElement;
  status.index=0;status.open=true;card.hidden=false;ring.hidden=false;
  trigger?.setAttribute('aria-expanded','true');
  render();card.focus();return true;
 }
 function close(){
  if(!status.open)return false;
  status.open=false;status.currentId=null;card.hidden=true;ring.hidden=true;
  trigger?.setAttribute('aria-expanded','false');
  if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  else trigger?.focus();
  previousFocus=null;return true;
 }
 function advance(){
  if(!status.open)return false;
  if(status.index===STEPS.length-1){close();return true}
  return go(status.index+1);
 }
 function backStep(){return go(status.index-1)}
 function keydown(e){
  if(!status.open)return;
  if(e.key==='Escape'){e.preventDefault();close()}
  else if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)){
   e.preventDefault();if(e.key==='ArrowRight')advance();else backStep();
  }
 }
 function init(){
  if(card||typeof document==='undefined')return;
  trigger=document.getElementById('help');
  if(!trigger||!document.body)return;
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-controls','kl-tour-panel');
  trigger.setAttribute('aria-expanded','false');
  trigger.title='Start the guided tour of KlinikLab';
  const style=element('style','kl-tour-style');style.textContent=css;document.head.appendChild(style);
  ring=element('div','kl-tour-ring');ring.hidden=true;ring.setAttribute('aria-hidden','true');
  card=element('section','kl-tour-panel');card.hidden=true;card.tabIndex=-1;
  card.setAttribute('role','dialog');card.setAttribute('aria-modal','false');
  card.setAttribute('aria-labelledby','kl-tour-heading');
  card.setAttribute('aria-describedby','kl-tour-body');
  counter=element('div','kl-tour-counter');counter.setAttribute('aria-live','polite');counter.style.cssText='color:#95d6cd;font-size:10px;font-weight:850;letter-spacing:1.1px;';
  card.appendChild(counter);
  const bar=element('div','kl-tour-bar');bar.setAttribute('aria-hidden','true');bar.appendChild(element('span'));card.appendChild(bar);
  heading=element('h2','kl-tour-heading');card.appendChild(heading);
  body=element('p','kl-tour-body');card.appendChild(body);
  tip=element('p','kl-tour-tip');card.appendChild(tip);
  const row=element('div');row.className='kl-tour-controls';
  const skip=element('button','kl-tour-skip','Skip tour');skip.type='button';skip.addEventListener('click',close);
  back=element('button','kl-tour-back','← Back');back.type='button';back.addEventListener('click',backStep);
  next=element('button','kl-tour-next','Next →');next.type='button';next.addEventListener('click',advance);
  row.append(skip,back,next);card.appendChild(row);
  document.body.append(ring,card);
  document.addEventListener('keydown',keydown);
  root.addEventListener?.('resize',place);
  root.addEventListener?.('scroll',place,true);
 }
 root.KlinikTutorial={version:1,status,steps:STEPS,init,open,close,next:advance,back:backStep,go,place};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
 }
})(typeof window!=='undefined'?window:globalThis);
