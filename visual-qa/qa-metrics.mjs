/** QA-only scoring helpers. Input is observed browser evidence, not a clinical score. */
export function summarizeTimings(values) {
  if (!Array.isArray(values)) throw new TypeError('timings must be an array');
  const sorted=values.filter(x=>Number.isFinite(x)&&x>=0).slice().sort((a,b)=>a-b);
  if(!sorted.length)return {count:0,medianMs:null,p95Ms:null,minMs:null,maxMs:null};
  const percentile=p=>sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
  return {count:sorted.length,medianMs:percentile(.5),p95Ms:percentile(.95),
    minMs:sorted[0],maxMs:sorted.at(-1)};
}
export function rectIntersectionArea(a,b) {
  if(!a||!b)return 0;
  for(const v of [a.x,a.y,a.width,a.height,b.x,b.y,b.width,b.height])
    if(!Number.isFinite(v))return 0;
  return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
    Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
}
export function reviewAccessibility(snapshot) {
  if(!snapshot||typeof snapshot!=='object')throw new TypeError('snapshot required');
  const blocking=[],advisory=[];
  if((snapshot.duplicateIds||[]).length)
    blocking.push({id:'A11Y-DUPLICATE-ID',elements:snapshot.duplicateIds});
  if((snapshot.brokenAriaControls||[]).length)
    blocking.push({id:'A11Y-BROKEN-ARIA-CONTROLS',elements:snapshot.brokenAriaControls});
  if((snapshot.unnamedControls||[]).length)
    advisory.push({id:'A11Y-UNNAMED-CONTROL',elements:snapshot.unnamedControls});
  if((snapshot.smallTargets||[]).length)
    advisory.push({id:'A11Y-SMALL-TOUCH-TARGET',elements:snapshot.smallTargets});
  if((snapshot.horizOverflowPx||0)>8)
    advisory.push({id:'A11Y-HORIZONTAL-OVERFLOW',pixels:snapshot.horizOverflowPx});
  return {pass:blocking.length===0,blocking,advisory};
}
