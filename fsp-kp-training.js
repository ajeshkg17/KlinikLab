/* KlinikLab FSP/KP language studio — fictional formative cases, pending clinician review.
 * Rule-based keyword coverage, NOT language certification or clinical correctness.
 * Content references and review items: docs/fsp-kp-content-review.md
 * No browser storage, network calls, real patient data, or interference with existing scores.
 */
(function(root){
 'use strict';
 const PHASES=[
  {id:'anamnese',name:'Anamnese',audience:'Patientengespräch'},
  {id:'aufklaerung',name:'Aufklärung',audience:'Patientengespräch · zusätzliche Übung'},
  {id:'brief',name:'Befund / Arztbrief',audience:'Schriftliche Dokumentation'},
  {id:'kollegen',name:'Arzt-Arzt',audience:'Kollegengespräch'}
 ];
 function criterion(label,pattern,tip){return {label:label,pattern:pattern,tip:tip};}
 const CASES={
  endo:{
   title:'Zahn 36 · anhaltende Kälteschmerzen',
   facts:'Fiktiver Lehrfall: Seit Wochen Beschwerden links unten, seit gestern Spontan- und Nachtschmerz. Zahn 36 reagiert auf Kälte anhaltend, leichte Perkussionsempfindlichkeit. Fiktiver Röntgenbefundtext: tiefe Karies, kein eindeutig abgrenzbarer apikaler Befund. Allergien nicht bekannt; gelegentlich Schmerzmittel. Restaurierbarkeit und definitive Diagnose noch zu prüfen.',
   glossary:[['anhaltende Kältereaktion','lingering response to cold'],['Perkussionsempfindlichkeit','tenderness on percussion'],['Verdachtsdiagnose','working diagnosis'],['Erhaltungswürdigkeit','restorability']],
   tasks:{
    anamnese:{
     prompt:'Formulieren Sie patientengerechte Anamnesefragen mit der Höflichkeitsform Sie. Erfragen Sie noch nicht einfach die Musterdiagnose.',
     b2:'Könnten Sie mir bitte sagen, seit wann ...?',
     c1:'Treten die Beschwerden spontan oder ausschließlich reizabhängig auf?',
     model:'Seit wann haben Sie die Beschwerden? Wie lange hält der Schmerz nach Kälte an? Haben Sie auch nachts oder ohne Reiz Schmerzen? Haben Sie Fieber oder eine Schwellung bemerkt? Nehmen Sie Medikamente ein, und sind Allergien bekannt?',
     checks:[
      criterion('Zeitlicher Beginn','seit wann|wann.{0,30}begonn|wie lange.{0,25}beschwerd','Nach Beginn und Verlauf fragen.'),
      criterion('Kälteantwort','kälte|kalt','Art und Dauer der Kälteantwort erfragen.'),
      criterion('Spontan- oder Nachtschmerz','nachts|spontan|ohne reiz','Spontane und nächtliche Schmerzen erfragen.'),
      criterion('Warnzeichen','fieber|schwell|schluckbeschwerd','Mögliche Warnzeichen abklären.'),
      criterion('Medikamente und Allergien','medikament|allerg','Relevante Allgemeinanamnese erheben.')
     ]
    },
    aufklaerung:{
     prompt:'Erklären Sie der Patientin/dem Patienten in verständlichem Deutsch die Verdachtsdiagnose, mögliche Wege sowie die Notwendigkeit einer individuellen Risiko- und Einwilligungsbesprechung.',
     b2:'Die bisherigen Untersuchungen deuten darauf hin, dass ...',
     c1:'Nach Abklärung der Erhaltungswürdigkeit kommen folgende Alternativen in Betracht ...',
     model:'Die bisherigen Befunde sprechen für eine Entzündung im Zahninneren. Wir müssen die Diagnose und die Erhaltungswürdigkeit noch absichern. Eine mögliche Behandlung ist die Wurzelkanalbehandlung; als Alternative kann je nach Befund eine Entfernung des Zahns besprochen werden. Über Ablauf, Risiken, Prognose und Kosten sprechen wir vor Ihrer Entscheidung. Welche Fragen haben Sie? Erst danach dokumentieren wir Ihre Einwilligung.',
     checks:[
      criterion('Patientenverständliche Erklärung','entzünd|zahninner|zahnnerv|pulpa','Die vermutete Erkrankung verständlich erklären.'),
      criterion('Wurzelkanalbehandlung','wurzelkanal|endodont','Eine mögliche zahnerhaltende Option erwähnen.'),
      criterion('Alternative','alternativ|entfern|extraktion','Alternativen ohne automatische Festlegung ansprechen.'),
      criterion('Risiken und Prognose','risik|prognos|komplikation','Risiken und Prognose individualisiert besprechen.'),
      criterion('Fragen / Einwilligung','einwillig|einverstanden|fragen|entscheiden','Rückfragen und informierte Entscheidung ermöglichen.')
     ]
    },
    brief:{
     prompt:'Schreiben Sie einen knappen, fachsprachlichen Befund-/Arztbrief. Nutzen Sie ausschließlich die vorgegebenen fiktiven Befunde; benennen Sie Unsicherheit.',
     b2:'Bei Zahn 36 bestehen ... Die Untersuchung zeigte ...',
     c1:'Anamnestisch ...; klinisch ...; radiologisch ...; als Arbeitsdiagnose ...',
     model:'Zahn 36: Anamnestisch seit Wochen Kälteempfindlichkeit, seit gestern Spontan- und Nachtschmerz. Klinisch anhaltende Kälteantwort und leichte Perkussionsempfindlichkeit. Radiologisch laut fiktivem Befundtext tiefe Karies ohne sicheren apikalen Befund. Arbeitsdiagnose: V. a. symptomatische irreversible Pulpitis. Restaurierbarkeit und Indikation für eine endodontische Behandlung sind weiter zu prüfen; Optionen, Risiken und Einwilligung vor Behandlung besprechen.',
     checks:[
      criterion('FDI-Zahnnummer','(?:^|\\D)36(?:\\D|$)','Den betroffenen Zahn nach FDI nennen.'),
      criterion('Symptomverlauf','nachts|spontan|seit gestern|seit wochen','Beschwerden und zeitlichen Verlauf beschreiben.'),
      criterion('Klinischer Test','perkussion|kälteantwort|kältetest|sensibil','Konkrete klinische Untersuchungsbefunde notieren.'),
      criterion('Radiologischer Befund','röntgen|radiolog|apikal','Bildgebung nur als fiktiven Befundtext darstellen.'),
      criterion('Arbeitsdiagnose / Unsicherheit','pulpitis|verdacht|v. a.','Arbeitsdiagnose als solche kennzeichnen.')
     ]
    },
    kollegen:{
     prompt:'Übergeben Sie den Fall in präziser zahnärztlicher Fachsprache an eine Kollegin/einen Kollegen. Nennen Sie Diagnoseunsicherheit und weiteres Vorgehen. Erklären Sie anschließend den Begriff Pulpitis für eine Patientin oder einen Patienten.',
     b2:'Es handelt sich um einen Fall an Zahn ...',
     c1:'In Zusammenschau von Anamnese, Sensibilitätstest und radiologischem Befund besteht der Verdacht ...',
     model:'Bei Zahn 36 bestehen seit gestern spontane und nächtliche Schmerzen. Der Kältetest zeigt eine verlängerte Reizantwort, die Perkussion ist leicht empfindlich. Es besteht der Verdacht auf eine symptomatische irreversible Pulpitis. Die Restaurierbarkeit und definitive Diagnose sind noch abzuklären. Bei gesicherter Indikation wäre eine endodontische Behandlung unter Aufklärung und Einwilligung zu besprechen. Patientengerecht bedeutet Pulpitis: Entzündung im Zahninneren.',
     checks:[
      criterion('FDI-Zahnnummer','(?:^|\\D)36(?:\\D|$)','Zahnbezeichnung präzise nennen.'),
      criterion('Anamnestischer Verlauf','nachts|spontan|kälte','Leitsymptome kurz zusammenfassen.'),
      criterion('Befund / Test','perkussion|kältetest|sensibil|reizantwort','Relevante Untersuchungen benennen.'),
      criterion('Arbeitsdiagnose','pulpitis|verdacht','Arbeitsdiagnose samt Unsicherheit mitteilen.'),
      criterion('Plan / Bedingung','endodont|wurzelkanal|restaurier|erhaltungs','Indikation und geplantes weiteres Vorgehen erwähnen.')
     ]
    }
   }
  },
  surgery:{
   title:'Zahn 48 · lokale Perikoronitis',
   facts:'Fiktiver Lehrfall: Seit drei Tagen Schmerzen am Zahnfleisch hinten rechts unten, früher schon einmal ähnliche Beschwerden. Zahn 48 ist teilweise durchgebrochen; gereiztes Operculum. Im Fall kein Fieber, keine Dysphagie, keine Atemnot, kein Trismus. Keine bekannten Allergien oder Dauermedikamente. Keine reale Röntgenaufnahme verfügbar.',
   glossary:[['Perikoronitis','inflammation around a partly erupted tooth'],['Operculum','gum flap covering part of a tooth'],['Trismus','restricted mouth opening'],['Dysphagie','difficulty swallowing']],
   tasks:{
    anamnese:{
     prompt:'Formulieren Sie Anamnesefragen zu Beschwerden und gefährlichen Ausbreitungszeichen. Nehmen Sie eine mögliche akute Infektion ernst.',
     b2:'Können Sie den Mund normal öffnen?',
     c1:'Bestehen Dysphagie, Atembeschwerden oder eine progrediente Schwellung?',
     model:'Seit wann haben Sie die Schmerzen? Haben Sie Fieber oder eine Schwellung bemerkt? Können Sie den Mund normal öffnen, und haben Sie Probleme beim Schlucken oder Atmen? Nehmen Sie Medikamente und haben Sie Allergien? Sind solche Beschwerden früher schon einmal aufgetreten?',
     checks:[
      criterion('Beginn / Dauer','seit wann|wie lang|wann.{0,20}beginn','Dauer und Verlauf erfragen.'),
      criterion('Fieber / Schwellung','fieber|schwell','Systemische und lokale Ausbreitung prüfen.'),
      criterion('Atemweg / Schlucken / Mundöffnung','atmen|atemnot|schluck|mund öffn|mundöffnung|trismus','Akute Gefährdung priorisieren.'),
      criterion('Medikamente / Allergien','medikament|allerg','Risiken aus der Allgemeinanamnese erheben.'),
      criterion('Rezidiv','früher|wiederhol|schon einmal|erneut','Vorangegangene Episoden erfragen.')
     ]
    },
    aufklaerung:{
     prompt:'Erklären Sie die lokale Entzündung, das zunächst mögliche lokale Vorgehen, spätere Optionen sowie Warnzeichen. Stellen Sie keine pauschale Antibiotikaindikation.',
     b2:'Das Zahnfleisch um Ihren hinteren Zahn ist entzündet ...',
     c1:'Bei Ausbreitungszeichen wäre eine umgehende notfallmäßige Abklärung erforderlich.',
     model:'Das Zahnfleisch um den teilweise durchgebrochenen Weisheitszahn ist entzündet. Bei Ihrem heutigen Befund können zunächst lokale Maßnahmen und eine geeignete Mundhygiene helfen; Antibiotika sind ohne entsprechende Zeichen nicht automatisch notwendig. Wenn die Entzündung wiederkehrt, kann nach Untersuchung eine Entfernung des Zahns als Alternative besprochen werden. Bei Fieber, zunehmender Schwellung, Schluck- oder Atemproblemen ist sofortige Hilfe wichtig. Wir besprechen Risiken und beantworten Ihre Fragen, bevor Sie einwilligen.',
     checks:[
      criterion('Lokale Erkrankung erklären','zahnfleisch|entzünd|perikoronitis','Laienverständliche Erklärung geben.'),
      criterion('Lokales Vorgehen','lokal|spül|hygiene|reinig','Lokale Maßnahmen als erste Möglichkeit ansprechen.'),
      criterion('Antibiotika nicht pauschal','antibiotik','Indikationsabhängigkeit erklären; Stichwortprüfung kann Negation nicht erkennen.'),
      criterion('Warnzeichen / Notfall','atem|schluck|fieber|schwell|notfall','Warnzeichen und erforderliche Eskalation erläutern.'),
      criterion('Optionen / Einwilligung','entfern|extraktion|einwillig|fragen|alternativ','Spätere Optionen und Einwilligung besprechen.')
     ]
    },
    brief:{
     prompt:'Dokumentieren Sie die fiktive Vorstellung mit klinischem Befund, fehlenden Ausbreitungszeichen, Arbeitsdiagnose und Plan. Keine reale Bildinterpretation behaupten.',
     b2:'Bei Zahn 48 zeigt sich ...',
     c1:'Aktuell keine klinischen Hinweise auf systemische Ausbreitung im beschriebenen Übungsfall ...',
     model:'Zahn 48: Seit drei Tagen lokale Beschwerden retromolar rechts, rezidivierend. Teilweise durchgebrochener Zahn mit gereiztem Operculum; im simulierten Befund keine Dysphagie, kein Trismus, kein Fieber. Arbeitsdiagnose: lokale Perikoronitis ohne berichtete systemische Ausbreitungszeichen. Zunächst lokale Akutmaßnahmen, Hygieneberatung und Reevaluation; bei Rezidiven Prüfung einer Extraktionsindikation. Keine reale Röntgenaufnahme vorliegend.',
     checks:[
      criterion('FDI-Zahnnummer','(?:^|\\D)48(?:\\D|$)','FDI-Nummer dokumentieren.'),
      criterion('Lokaler Befund','operculum|teilweise durchgebroch|teilretin','Lokalen Untersuchungsbefund nennen.'),
      criterion('Ausbreitungszeichen','fieber|trismus|dysphag|schluck|atem','Gefahrenzeichen samt Negativbefund dokumentieren.'),
      criterion('Arbeitsdiagnose','perikoronitis|entzünd','Arbeitsdiagnose klar kennzeichnen.'),
      criterion('Lokale Maßnahme / Verlauf','lokal|hygiene|kontroll|reevalu','Initialplan und Kontrolle festhalten.')
     ]
    },
    kollegen:{
     prompt:'Geben Sie den Fall an eine Kollegin/einen Kollegen weiter. Trennen Sie aktuelle Befunde, Gefährdungsprüfung und Therapieplan. Erklären Sie anschließend den Fachbegriff Dysphagie allgemeinverständlich.',
     b2:'Am Zahn 48 zeigt sich eine lokale Entzündung ...',
     c1:'Im gegenwärtigen Fall bestehen keine berichteten systemischen Ausbreitungszeichen; bei Änderung sofortige Reevaluation ...',
     model:'An Zahn 48 besteht bei teilweise durchgebrochenem Weisheitszahn ein entzündetes Operculum mit rezidivierenden Beschwerden. Aktuell sind Fieber, Trismus, Dysphagie und Atemnot im fiktiven Fall verneint. Die Arbeitsdiagnose ist eine lokale Perikoronitis. Vorrangig sind lokale Maßnahmen und Verlaufskontrolle; bei Rezidiv ist die Extraktionsindikation zu prüfen. Warnzeichen erfordern eine umgehende erneute Beurteilung. Für Patientinnen und Patienten bedeutet Dysphagie: Schwierigkeiten beim Schlucken.',
     checks:[
      criterion('FDI-Zahnnummer','(?:^|\\D)48(?:\\D|$)','Betroffenen Zahn nennen.'),
      criterion('Lokaler Befund','operculum|teilweise durchgebroch|teilretin','Klinischen Befund übergeben.'),
      criterion('Gefährdungsprüfung','trismus|fieber|dysphag|atemnot','Ausbreitungszeichen beurteilen.'),
      criterion('Arbeitsdiagnose','perikoronitis','Fachdiagnose nennen.'),
      criterion('Plan / Reevaluation','lokal|kontroll|reevalu|extraktion','Indikationsabhängiges Vorgehen erläutern.')
     ]
    }
   }
  }
 };
 function taskFor(caseId,phaseId){
  const item=Object.prototype.hasOwnProperty.call(CASES,caseId)?CASES[caseId]:null;
  const task=item&&Object.prototype.hasOwnProperty.call(item.tasks,phaseId)?item.tasks[phaseId]:null;
  if(!task)throw new RangeError('Unknown fictional case or training phase');
  return task;
 }
 /* Selected phrases trigger a caution, not an overall clinical quality verdict. */
 function safetyReview(caseId,answer){
  if(caseId!=='surgery'||!answer)return [];
  const flags=[];
  const clauses=answer.toLocaleLowerCase('de-DE').split(/[.!?;\n]+/);
  for(const clause of clauses){
   if(/\b(?:antibiotika\s+sind\s+(?:immer|grundsätzlich|routinemäßig)\s+(?:notwendig|erforderlich|indiziert)|(?:immer|routinemäßig|grundsätzlich)\s+antibiotika\s+(?:geben|verordnen|verschreiben)|antibiotika\s+bei\s+jeder\s+perikoronitis)\b/iu.test(clause)&&
      !/\b(?:nicht|keine|niemals)\s+(?:immer|grundsätzlich|routinemäßig)\b/iu.test(clause)){
    flags.push('Pauschale Antibiotikagabe ist bei unkomplizierter Perikoronitis nicht gerechtfertigt. Bitte fachlich prüfen.');
   }
   if(/\b(?:atemnot|schluckbeschwerden|dysphagie)\b.{0,65}\b(?:abwarten|zu\s+hause\s+bleiben|keine\s+hilfe\s+holen)\b/iu.test(clause)&&
      !/\b(?:nicht|niemals|keinesfalls)\s+abwarten\b/iu.test(clause)){
    flags.push('Atem- oder relevante Schluckprobleme dürfen nicht mit Abwarten bagatellisiert werden. Bitte dringend fachlich prüfen.');
   }
  }
  return [...new Set(flags)];
 }
 function score(caseId,phaseId,value){
  const task=taskFor(caseId,phaseId);
  const answer=typeof value==='string'?value.normalize('NFKC').trim():'';
  const results=task.checks.map(function(x){
   return {label:x.label,matched:answer.length>0&&new RegExp(x.pattern,'iu').test(answer),tip:x.tip};
  });
  const safetyFlags=safetyReview(caseId,answer);
  const lexicalScore=results.filter(x=>x.matched).length*2;
  return {caseId:caseId,phaseId:phaseId,score:safetyFlags.length?null:lexicalScore,
   lexicalScore:lexicalScore,max:10,blank:answer.length===0,safetyFlags:safetyFlags,criteria:results,
   method:'Formative German keyword coverage only; selected explicit safety phrases can suspend the score. Does not establish diagnosis, overall clinical accuracy, negation handling, grammar, fluency, or certification.'};
 }
 const status={caseId:'endo',phaseId:'anamnese',answers:{},results:{},showModel:false,showGlossary:false,open:false};
 let panel=null,trigger=null,returnFocus=null;
 const escapeHTML=function(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
 const key=function(){return status.caseId+'|'+status.phaseId;};
 function render(){
  if(!panel)return;
  const item=CASES[status.caseId],task=taskFor(status.caseId,status.phaseId),result=status.results[key()];
  let html='<div class="fsp-shell" role="dialog" aria-modal="true" aria-label="FSP und KP Deutschtraining">';
  html+='<header class="fsp-header"><div><strong>✚ FSP/KP Sprachtraining</strong><p>Fiktive Fälle · lokale formative Übung · klinische Prüfung ausstehend</p></div><button type="button" data-fsp="close" aria-label="Training schließen">✕ Schließen</button></header>';
  html+='<p class="fsp-notice">Schleswig-Holstein FSP: Patientengespräch → handschriftlicher Arztbrief → kollegiales Gespräch. Aufklärung ist hier ein zusätzlicher Teil des Patientengesprächs, kein vierter offizieller Prüfungsteil. Andere Länder können abweichen. Keine staatliche Prüfung, keine Zertifizierung.</p>';
  html+='<div class="fsp-grid"><aside class="fsp-sidebar"><b>Übungsfälle</b>';
  Object.keys(CASES).forEach(function(id){html+='<button type="button" data-fsp="case" data-id="'+id+'" aria-pressed="'+(id===status.caseId)+'">'+escapeHTML(CASES[id].title)+'</button>';});
  html+='<p class="fsp-muted">Sämtliche Angaben sind erfunden; keine realen Patientenakten oder Röntgenbilder.</p></aside><main class="fsp-main">';
  html+='<h2>'+escapeHTML(item.title)+'</h2><p class="fsp-facts">'+escapeHTML(item.facts)+'</p><nav class="fsp-steps" aria-label="Sprachübungen">';
  PHASES.forEach(function(p){const r=status.results[status.caseId+'|'+p.id];const done=!!r&&r.score===10;html+='<button type="button" data-fsp="phase" data-id="'+p.id+'" aria-current="'+(p.id===status.phaseId?'step':'false')+'">'+escapeHTML(p.name)+(done?' ✓':r?' •':'')+'</button>';});
  html+='</nav><div class="fsp-task"><span class="fsp-kicker">'+escapeHTML(PHASES.find(x=>x.id===status.phaseId).audience)+' · B2/C1</span>';
  html+='<h3>'+escapeHTML(PHASES.find(x=>x.id===status.phaseId).name)+'</h3><p>'+escapeHTML(task.prompt)+'</p>';
  html+='<p class="fsp-scaffold"><strong>B2:</strong> '+escapeHTML(task.b2)+'<br><strong>C1:</strong> '+escapeHTML(task.c1)+'</p>';
  html+='<label for="fsp-answer"><strong>Ihre deutsche Antwort</strong></label><textarea id="fsp-answer" rows="6" maxlength="6000" spellcheck="true" placeholder="Formulieren Sie Ihre eigene Antwort auf Deutsch ...">'+escapeHTML(status.answers[key()]||'')+'</textarea>';
  html+='<div class="fsp-actions"><button type="button" data-fsp="submit">Formativ prüfen</button><button type="button" data-fsp="glossary" aria-expanded="'+status.showGlossary+'">Deutsch–Englisch Glossar</button><button type="button" data-fsp="retry">Erneut üben</button></div>';
  if(status.showGlossary){html+='<dl class="fsp-glossary">'+item.glossary.map(x=>'<div><dt>'+escapeHTML(x[0])+'</dt><dd>'+escapeHTML(x[1])+'</dd></div>').join('')+'</dl>';}
  if(result){
   html+='<section class="fsp-feedback" aria-live="polite"><h4>'+(result.safetyFlags.length?'Sicherheitswarnung · Punktwert ausgesetzt':'Rubrik: '+result.score+' / '+result.max+' Punkte')+'</h4>';
   if(result.safetyFlags.length)html+='<div role="alert" class="fsp-warning"><b>Bitte prüfen lassen:</b><ul>'+result.safetyFlags.map(x=>'<li>'+escapeHTML(x)+'</li>').join('')+'</ul>Die Begriffsdeckung ('+result.lexicalScore+' / 10) ist keine klinische Bewertung.</div>';
   html+='<p>Nur Schlüsselbegriff-Abdeckung (je 2 Punkte). Einzelne gefährliche Aussagen lösen Warnungen aus. Die Rubrik prüft weder Grammatik, klinische Richtigkeit, alle Negationen noch flüssiges Sprechen.</p>';
   if(result.blank)html+='<p role="alert">Keine Eingabe erkannt. Bitte einen deutschen Antworttext eintragen.</p>';
   html+='<ul>'+result.criteria.map(x=>'<li><b>'+(x.matched?'✓ ':'○ ')+escapeHTML(x.label)+'</b> — '+escapeHTML(x.matched?'Stichwort erkannt. Keine inhaltliche Validierung.':x.tip)+'</li>').join('')+'</ul>';
   if(result.score===null||result.score<result.max)html+='<p class="fsp-revise">Wiederholen Sie die nicht erkannten Begriffe und lassen Sie die medizinische Richtigkeit fachlich beurteilen.</p>';
   html+='<button type="button" data-fsp="model" aria-expanded="'+status.showModel+'">'+(status.showModel?'Musterantwort ausblenden':'Musterantwort anzeigen')+'</button>';
   if(status.showModel)html+='<blockquote>'+escapeHTML(task.model)+'</blockquote>';
   html+='</section>';
  }else html+='<p class="fsp-muted">Musterantwort und Kriterien erscheinen nach Abgabe. Freitext verlässt Ihren Browser nicht; es gibt keine automatische Speicherung.</p>';
  const remaining=PHASES.filter(p=>{const r=status.results[status.caseId+'|'+p.id];return !r||r.score!==10;});
  html+='<p class="fsp-muted">Wiederholen: '+(remaining.length?remaining.map(x=>escapeHTML(x.name)).join(', '):'Alle Schlüsselbegriff-Rubriken abgedeckt (keine fachliche Freigabe)')+'</p>';
  html+='</div></main></div><footer class="fsp-footer">Quellen: <a href="https://www.zahnaerzte-sh.de/zahnaerzte/praxisservice/beruflicher-nachwuchs/auslaendische-berufsqualifikationen/fachsprachpruefung/" target="_blank" rel="noopener">ZÄK SH – FSP</a> · <a href="https://sdcepdentalprescribing.nhs.scot/guidance/bacterial-infections/acute-periodontal-conditions/" target="_blank" rel="noopener">SDCEP</a>. Medizinische Inhalte: fachliche Endprüfung ausstehend.</footer></div>';
  panel.innerHTML=html;
 }
 function open(){if(!panel)return false;returnFocus=typeof document!=='undefined'?document.activeElement:null;status.open=true;panel.hidden=false;document.body.classList.add('fsp-open');render();panel.querySelector('[data-fsp="close"]').focus();return true;}
 function close(){if(!panel)return false;status.open=false;panel.hidden=true;document.body.classList.remove('fsp-open');if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus();else if(trigger)trigger.focus();return true;}
 function mount(){
  if(!document.getElementById||panel)return;
  const anchor=document.getElementById('journey-open');if(!anchor||!anchor.parentNode)return;
  trigger=document.createElement('button');trigger.id='fsp-kp-open';trigger.type='button';trigger.className=anchor.className;
  trigger.textContent='FSP/KP Deutsch';trigger.title='Strukturierte fiktive deutsche Zahnarzt-Kommunikation üben';
  trigger.addEventListener('click',open);anchor.parentNode.insertBefore(trigger,anchor.nextSibling);
  const style=document.createElement('style');style.textContent='.fsp-open{overflow:hidden}#fsp-kp-overlay[hidden]{display:none!important}#fsp-kp-overlay{position:fixed;inset:0;z-index:1100;background:rgba(6,26,33,.75);padding:clamp(8px,2vw,24px);overflow:auto}#fsp-kp-overlay .fsp-shell{background:#f5faf8;color:#18323b;max-width:1050px;min-height:min(680px,94vh);margin:auto;border-radius:14px;overflow:hidden;font:14px/1.5 system-ui,sans-serif}#fsp-kp-overlay .fsp-header{background:#143e48;color:white;padding:14px 20px;display:flex;justify-content:space-between;gap:12px;align-items:center}#fsp-kp-overlay .fsp-header p{margin:2px 0 0;font-size:12px}#fsp-kp-overlay button{cursor:pointer;border:1px solid #9bbab5;border-radius:7px;padding:8px 11px;background:white;color:#173a42}#fsp-kp-overlay button[aria-current="step"],#fsp-kp-overlay button[aria-pressed="true"]{background:#d3f4eb;border-color:#007e79;font-weight:700}#fsp-kp-overlay button:focus-visible,#fsp-kp-overlay textarea:focus-visible{outline:3px solid #00a68f;outline-offset:2px}#fsp-kp-overlay .fsp-notice{margin:13px 20px;background:#e2f2f2;padding:12px;border-radius:9px;font-size:12px}#fsp-kp-overlay .fsp-grid{display:grid;grid-template-columns:minmax(180px,240px) 1fr;gap:18px;padding:10px 20px}#fsp-kp-overlay .fsp-sidebar{display:flex;flex-direction:column;align-items:stretch;gap:9px}#fsp-kp-overlay .fsp-main{min-width:0}#fsp-kp-overlay h2{margin:0 0 5px;font-size:19px}#fsp-kp-overlay .fsp-facts{border-left:3px solid #6faeaa;padding:9px;background:white}#fsp-kp-overlay .fsp-steps,#fsp-kp-overlay .fsp-actions{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}#fsp-kp-overlay .fsp-task{background:white;border-radius:9px;padding:16px}#fsp-kp-overlay .fsp-task h3{margin:5px 0;font-size:18px}#fsp-kp-overlay .fsp-kicker,#fsp-kp-overlay .fsp-muted{font-size:12px;color:#596b70}#fsp-kp-overlay .fsp-scaffold{padding:9px;background:#edf5f4}#fsp-kp-overlay textarea{display:block;width:100%;min-height:130px;max-width:100%;padding:10px;border-radius:7px;border:1px solid #72959a}#fsp-kp-overlay .fsp-feedback{padding:12px;background:#eef8f6;border-radius:9px}#fsp-kp-overlay .fsp-warning{padding:10px;background:#fff1e8;border-left:4px solid #a44f1c}#fsp-kp-overlay .fsp-feedback ul{padding-left:22px}#fsp-kp-overlay .fsp-feedback li{margin:7px 0}#fsp-kp-overlay .fsp-glossary{display:grid;gap:5px}#fsp-kp-overlay .fsp-glossary div{display:flex;gap:12px}#fsp-kp-overlay .fsp-glossary dt{font-weight:700}#fsp-kp-overlay .fsp-glossary dd{margin:0}#fsp-kp-overlay .fsp-footer{padding:15px 20px;font-size:11px;color:#536b72}#fsp-kp-overlay a{color:#05665f}@media(max-width:650px){#fsp-kp-overlay .fsp-grid{grid-template-columns:1fr}#fsp-kp-overlay .fsp-sidebar{flex-direction:row;flex-wrap:wrap}#fsp-kp-overlay .fsp-header{align-items:flex-start}#fsp-kp-open{font-size:11px}}';
  document.head.appendChild(style);
  panel=document.createElement('section');panel.id='fsp-kp-overlay';panel.hidden=true;panel.setAttribute('aria-label','FSP/KP language training');document.body.appendChild(panel);
  panel.addEventListener('input',function(e){if(e.target&&e.target.id==='fsp-answer')status.answers[key()]=e.target.value;});
  panel.addEventListener('click',function(e){
   const button=e.target.closest('button[data-fsp]');if(!button)return;
   const action=button.getAttribute('data-fsp'),id=button.getAttribute('data-id');
   if(action==='close'){close();return;}
   if(action==='case'){status.caseId=id;status.phaseId='anamnese';status.showModel=false;render();return;}
   if(action==='phase'){status.phaseId=id;status.showModel=false;render();return;}
   if(action==='glossary'){status.showGlossary=!status.showGlossary;render();return;}
   if(action==='submit'){status.answers[key()]=panel.querySelector('#fsp-answer').value;status.results[key()]=score(status.caseId,status.phaseId,status.answers[key()]);status.showModel=false;render();return;}
   if(action==='model'){status.showModel=!status.showModel;render();return;}
   if(action==='retry'){delete status.results[key()];status.showModel=false;render();panel.querySelector('#fsp-answer').focus();}
  });
  document.addEventListener('keydown',function(e){if(status.open&&e.key==='Escape')close();});
 }
 root.KlinikFSPTraining={version:2,cases:CASES,phases:PHASES,score:score,safetyReview:safetyReview,taskFor:taskFor,status:status,open:open,close:close,mount:mount};
 if(typeof document!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
 }
})(typeof window!=='undefined'?window:globalThis);
