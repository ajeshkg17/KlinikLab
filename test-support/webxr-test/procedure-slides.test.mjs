import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStory,slidesHTML} from './procedure-slides.mjs';
const files=['01-select-fdi16.png','02-precut.png','03-aim.png','04-cut.png','05-postcut.png','06-switchback.png'];
function example(){return {passed:true,testedCommit:'a'.repeat(40),pixelDifference:{changedPixels:[541,500]},
 steps:files.map((file,i)=>({file,n:i+1,eyes:2,frame:100+2*i,sha256:'c'.repeat(64),
 label:'Training step '+(i+1),state:{fdi:'16',cuts:i>=3?1:0}}))};}
test('Only six original stereo frames produce a navigable educational viewer',()=>{
 const m=example(),out=slidesHTML(m);
 assert.equal(validateStory(m),m);
 for(const file of files)assert(out.includes(file));
 assert(out.includes('ILLUSTRATIVE')&&out.includes('ArrowRight'));
 assert(!out.includes('data:image/png;base64'));
});
test('Missing, malformed, unsaved or non-binocular evidence is refused',()=>{
 for(const fn of [x=>x.passed=false,x=>x.steps.pop(),x=>x.steps[0].eyes=1,
  x=>x.steps[2].file='invalid.png',x=>x.steps[4].frame=x.steps[3].frame,
  x=>x.steps[3].state.cuts=0,x=>x.steps[5].state.cuts=2,
  x=>x.pixelDifference.changedPixels=[0,0]]){
   const m=example();fn(m);assert.throws(()=>slidesHTML(m));
  }
});
