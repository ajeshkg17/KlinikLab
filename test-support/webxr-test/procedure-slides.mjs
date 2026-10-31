// Evidence-only procedure slideshow; never synthesizes application imagery.
const NAMES=['01-select-fdi16.png','02-precut.png','03-aim.png','04-cut.png','05-postcut.png','06-switchback.png'];
const escapeText=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export function validateStory(m){
 if(!m||m.passed!==true||!(/^[a-f0-9]{40}$/).test(m.testedCommit||'')||m.steps?.length!==6)throw Error('Incomplete original procedure evidence');
 for(let i=0;i<6;i++){
  const s=m.steps[i];
  if(s.file!==NAMES[i]||s.n!==i+1||s.eyes!==2||!(/^[a-f0-9]{64}$/).test(s.sha256||'')||
    !Number.isInteger(s.frame)||(i>0&&s.frame<=m.steps[i-1].frame)||String(s.state?.fdi)!=='16')
   throw Error('Invalid original XR step '+(i+1));
 }
 if(!(m.steps[3].state.cuts>m.steps[1].state.cuts)||
    m.steps[5].state.cuts!==m.steps[4].state.cuts||
    m.pixelDifference?.changedPixels?.length!==2||
    m.pixelDifference.changedPixels.some(v=>v<=120))
  throw Error('In-app tooth change or persistence unverified');
 return m;
}
export function slidesHTML(input){
 const m=validateStory(input);
 const stages=m.steps.map(s=>({file:s.file,title:s.label,frame:s.frame,cuts:s.state.cuts,sha:s.sha256}));
 const data=JSON.stringify(stages).replace(/</g,'\\u003c');
 return [
 '<!doctype html><html lang="en"><head><meta charset="utf-8">',
 '<meta name="viewport" content="width=device-width,initial-scale=1"><title>KlinikLab FDI16 XR procedure</title>',
 '<style>body{font:16px system-ui;margin:0;background:#12303b;color:#eafff6}header,footer,main{padding:18px 24px}header,footer{background:#1b4149}main{max-width:1250px;margin:auto}img{display:block;width:100%;height:auto;max-height:70vh;object-fit:contain;background:#071b23}button{padding:12px;border-radius:6px;background:#286c6e;color:white;border:1px solid #a5d5c5;cursor:pointer}nav{display:flex;gap:18px;align-items:center}figure{margin:0}.warning{color:#ffd68e;font-weight:bold}code{overflow-wrap:anywhere}</style>',
 '</head><body><header><h1>FDI 16 — actual-app XR procedure</h1>',
 '<p class="warning">ILLUSTRATIVE, NOT DENTIST-PERFORMED OR CLINICALLY VALIDATED</p>',
 '<p>These are original left/right XR framebuffer screenshots. No AI images. Tested source: <code>'+escapeText(m.testedCommit)+'</code></p></header>',
 '<main><h2 id="title"></h2><figure><img id="slide" alt="Actual stereo app screenshot"><figcaption id="meta"></figcaption></figure>',
 '<nav><button id="prev">Previous</button><b id="counter"></b><button id="next">Next</button></nav><p id="digest"></p></main>',
 '<footer>Uncalibrated model and automated tracked-controller teaching input. Actual anatomy, clinical technique, video, and physical Quest 2 acceptance require separate review.</footer>',
 '<script>',
 'const stages='+data+';let index=0;',
 'function show(){const s=stages[index];document.getElementById("title").textContent=(index+1)+". "+s.title;',
 'document.getElementById("slide").src="./"+s.file;',
 'document.getElementById("meta").textContent="True XR frame "+s.frame+" | FDI 16 | "+s.cuts+" recorded cuts";',
 'document.getElementById("digest").textContent="Original PNG SHA256: "+s.sha;',
 'document.getElementById("counter").textContent=(index+1)+" / 6";',
 'document.getElementById("prev").disabled=index===0;document.getElementById("next").disabled=index===5}',
 'document.getElementById("prev").onclick=()=>{index=Math.max(0,index-1);show()};',
 'document.getElementById("next").onclick=()=>{index=Math.min(5,index+1);show()};',
 'document.onkeydown=e=>{if(e.key==="ArrowLeft")document.getElementById("prev").click();if(e.key==="ArrowRight")document.getElementById("next").click()};show();',
 '</script></body></html>'
 ].join('\n');
}
