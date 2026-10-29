'use strict';
/* Phase 5: schematic tooth-structure teaching explorer.
   Illustrative layers only: NOT extracted Dundee anatomy, CT, drill paths,
   clinical root-count predictions, or patient-specific measurements.
   The original pick targets, procedural workspaces and XR are untouched. */
(function(root){
  const FDI=/^[1-4][1-8]$/;
  const LAYERS=Object.freeze({
    enamel:{name:'Enamel / Zahnschmelz',color:'#e9f3f9',description:'Highly mineralized outer crown tissue. The drawing does not represent true enamel thickness or translucency.'},
    dentin:{name:'Dentin / Zahnbein',color:'#ebca86',description:'The bulk of the tooth below the enamel and cementum; dentinal tubules are not individually modeled.'},
    pulp:{name:'Pulp / Pulpa',color:'#b96068',description:'Schematic pulp chamber and root-canal space containing vessels and nerves; not an endodontic map.'},
    cementum:{name:'Cementum / Wurzelzement',color:'#c9ae83',description:'Thin covering of the root surface. Its thickness is exaggerated for visibility.'},
    ligament:{name:'Periodontal ligament / Desmodont',color:'#87bda8',description:'Connective-tissue attachment between root and alveolar socket; not shown at scale.'}
  });
  const kinds=Object.freeze({
    incisor:{name:'Incisor / Schneidezahn',role:'Cutting edge',roots:'Single-root illustration'},
    canine:{name:'Canine / Eckzahn',role:'Pointed cusp',roots:'Single-root illustration'},
    premolar:{name:'Premolar / Prämolar',role:'Occlusal cusps',roots:'Simplified root illustration'},
    molar:{name:'Molar / Molar',role:'Broad multi-cusp crown',roots:'Simplified branching-root illustration'}
  });
  function descriptor(value){
    const id=String(value||'');
    if(!FDI.test(id))return null;
    const q=Number(id[0]),number=Number(id[1]);
    const kind=number<=2?'incisor':number===3?'canine':number<=5?'premolar':'molar';
    return {id,quadrant:q,ordinal:number,kind,name:kinds[kind].name,role:kinds[kind].role,
      rootDescription:kinds[kind].roots,arch:q<=2?'Maxilla / Oberkiefer':'Mandible / Unterkiefer',
      side:(q===1||q===4)?'right / rechts':'left / links'};
  }
  const CROWN={
    incisor:'M80 111 L80 71 Q82 63 97 62 L157 62 Q174 63 178 72 L178 111 Q178 123 168 127 L90 127 Q80 121 80 111Z',
    canine:'M81 112 L86 91 Q98 85 116 64 L130 39 L145 65 Q168 88 172 93 L176 111 Q173 126 160 129 L95 129 Q82 124 81 112Z',
    premolar:'M73 111 L79 77 Q85 58 105 64 L121 85 L138 62 Q157 55 170 74 L185 109 Q184 128 166 132 L91 132 Q74 125 73 111Z',
    molar:'M61 112 L64 76 Q67 62 85 65 L99 79 L111 61 Q123 54 135 67 L149 82 L162 62 Q183 59 194 79 L199 110 Q198 133 174 138 L86 138 Q62 134 61 112Z'
  };
  const DENTIN={
    incisor:'M91 102 L91 121 Q90 147 105 162 L109 244 Q109 270 128 289 Q148 270 149 244 L153 162 Q169 148 167 121 L167 102Z',
    canine:'M91 107 Q89 136 104 150 L108 256 Q111 282 130 303 Q149 281 152 256 L158 150 Q171 137 168 107Z',
    premolar:'M86 111 Q84 143 101 156 L104 250 Q111 280 128 291 Q146 274 151 250 L154 156 Q174 142 171 111Z',
    molar:'M78 115 Q75 142 98 157 L98 213 Q95 242 83 278 Q79 292 92 299 Q106 297 115 280 L124 238 L135 239 L144 277 Q151 297 165 300 Q180 292 173 276 L161 215 L161 157 Q182 145 180 115Z'
  };
  const PULP={
    incisor:'M121 119 Q126 113 133 119 L137 160 L136 245 Q136 260 129 272 Q120 259 120 245 L120 161Z',
    canine:'M121 117 Q130 106 138 118 L140 160 L137 266 Q135 277 130 286 Q124 276 120 266 L118 160Z',
    premolar:'M114 129 Q127 116 141 129 L143 162 L139 248 Q134 264 130 273 Q124 264 117 249 L113 164Z',
    molar:'M105 133 Q128 120 154 134 L152 177 L141 207 L155 277 L150 280 L131 213 L126 205 L119 210 L98 280 L92 277 L108 204 L105 177Z'
  };
  function diagram(kind){
    if(!Object.hasOwn(CROWN,kind))throw Error('Unsupported schematic tooth type');
    // Explicit SVG geometry: never interpolate user-controlled text/attributes.
    const crown=CROWN[kind],body=DENTIN[kind],pulp=PULP[kind];
    return '<svg viewBox="0 0 260 324" role="img" aria-label="Illustrative longitudinal section of a '+kind+' showing enamel, dentin, pulp and root attachments" style="width:100%;max-height:260px" xmlns="http://www.w3.org/2000/svg">'+
      '<path d="M67 111 Q52 145 76 168 L76 247 Q72 301 119 315 L151 315 Q191 294 185 244 L185 170 Q207 142 190 109" fill="#334c48" opacity=".53"/>'+
      '<g data-structure-layer="ligament"><path d="'+body+'" transform="translate(0 0)" fill="none" stroke="'+LAYERS.ligament.color+'" stroke-width="15" stroke-linejoin="round"/></g>'+
      '<g data-structure-layer="cementum"><path d="'+body+'" fill="none" stroke="'+LAYERS.cementum.color+'" stroke-width="7" stroke-linejoin="round"/></g>'+
      '<g data-structure-layer="dentin"><path d="'+body+'" fill="'+LAYERS.dentin.color+'" stroke="#6e5745" stroke-width="2"/></g>'+
      '<g data-structure-layer="enamel"><path d="'+crown+'" fill="'+LAYERS.enamel.color+'" stroke="#94b1c1" stroke-width="2.4"/></g>'+
      '<g data-structure-layer="pulp"><path d="'+pulp+'" fill="'+LAYERS.pulp.color+'" stroke="#7b3741" stroke-width="2"/></g>'+
      '<path d="M40 148 H220" stroke="#e09baa" stroke-dasharray="5 5" stroke-width="1" opacity=".58"/>'+
      '<text x="20" y="143" font-size="9" fill="#aacbd2">cervical line (schematic)</text>'+
      '</svg>';
  }
  const status={version:1,open:false,focusSelected:false,selectedFDI:null,layer:'enamel',kind:null};
  let panel=null,button=null,timer=null;
  function setLayer(layer){
    if(!Object.hasOwn(LAYERS,layer))return false;
    status.layer=layer;
    if(!panel)return true;
    for(const el of panel.querySelectorAll('[data-structure-layer]')){
      const active=el.getAttribute('data-structure-layer')===layer;
      el.style.opacity=active?'1':'.36';
    }
    for(const el of panel.querySelectorAll('[data-layer]')){
      const active=el.getAttribute('data-layer')===layer;
      el.setAttribute('aria-pressed',String(active));
      el.style.borderColor=active?'#83ddce':'#425b65';
      el.style.background=active?'#24535a':'#18303c';
    }
    const explanation=panel.querySelector('#structure-description');
    if(explanation)explanation.textContent=LAYERS[layer].description;
    const title=panel.querySelector('#structure-layer-name');
    if(title)title.textContent=LAYERS[layer].name;
    return true;
  }
  function updateSelected(id){
    const valid=descriptor(id);
    if(!valid){
      status.selectedFDI=null;status.kind=null;
      if(panel){
        panel.querySelector('#structure-tooth-name').textContent='Select an FDI tooth below';
        panel.querySelector('#structure-tooth-details').textContent='Use the permanent-tooth chart or click a tooth in the 3D scene.';
        panel.querySelector('#structure-diagram').innerHTML=diagram('incisor');
        panel.querySelector('#structure-diagram').style.opacity='.58';
        setLayer(status.layer);
      }
      return false;
    }
    if(status.selectedFDI===valid.id&&status.kind===valid.kind)return true;
    status.selectedFDI=valid.id;status.kind=valid.kind;
    if(panel){
      panel.querySelector('#structure-tooth-name').textContent='FDI '+valid.id+' · '+valid.name;
      panel.querySelector('#structure-tooth-details').textContent=valid.arch+' · '+valid.side+' · '+valid.role+' · '+valid.rootDescription;
      panel.querySelector('#structure-diagram').innerHTML=diagram(valid.kind);
      panel.querySelector('#structure-diagram').style.opacity='1';
      setLayer(status.layer);
    }
    return true;
  }
  function syncSelection(){const tooth=root.kliniklab?.selectedTooth;updateSelected(tooth)}
  function open(){
    if(!panel||status.open)return;
    status.open=true;panel.hidden=false;
    button?.setAttribute('aria-expanded','true');
    syncSelection();
    timer=root.setInterval(syncSelection,220);
  }
  function close(){
    status.open=false;
    if(panel)panel.hidden=true;
    if(button)button.setAttribute('aria-expanded','false');
    if(timer!==null){root.clearInterval(timer);timer=null}
    status.focusSelected=false;
    const focus=panel?.querySelector('#structure-focus');
    if(focus){focus.setAttribute('aria-pressed','false');focus.textContent='Focus selected tooth: Off'}
  }
  function init(){
    if(panel)return;
    const stage=document.getElementById('stage'),head=document.querySelector('#stage-controls .float-title');
    if(!stage||!head)return;
    button=document.createElement('button');
    button.id='structure-toggle';button.type='button';
    button.textContent='Tooth layers · Schnittbild';
    button.title='Open schematic enamel, dentin, pulp and periodontal anatomy for the selected FDI tooth';
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','structure-panel');
    button.style.cssText='display:block;margin-top:6px;padding:7px 10px;background:#203e4a;border:1px solid #52717e;border-radius:7px;color:#dff7f0;font:750 11px system-ui;pointer-events:auto;';
    button.addEventListener('click',()=>status.open?close():open());
    head.appendChild(button);
    panel=document.createElement('section');panel.id='structure-panel';panel.hidden=true;
    panel.setAttribute('role','region');
    panel.setAttribute('aria-label','Tooth structure explorer, educational schematic');
    panel.style.cssText='position:absolute;right:15px;top:72px;z-index:8;width:min(315px,48vw);max-height:calc(100% - 133px);overflow:auto;border:1px solid #486a73;border-radius:13px;background:rgba(10,29,39,.97);color:#e8f3f0;padding:13px 14px;box-shadow:0 12px 28px #0008;pointer-events:auto;font:12px/1.45 system-ui,sans-serif;';
    const intro=document.createElement('div');
    intro.style.cssText='display:flex;gap:8px;align-items:start;justify-content:space-between;';
    const heading=document.createElement('strong');heading.id='structure-tooth-name';heading.textContent='Select an FDI tooth below';
    heading.style.cssText='font-size:13px;line-height:1.3;';
    const exit=document.createElement('button');exit.id='structure-close';exit.type='button';
    exit.textContent='×';exit.setAttribute('aria-label','Close tooth anatomy explorer');
    exit.style.cssText='font-size:19px;color:#fff;background:transparent;border:0;cursor:pointer;';
    exit.addEventListener('click',close);
    intro.append(heading,exit);
    panel.appendChild(intro);
    const details=document.createElement('p');details.id='structure-tooth-details';
    details.style.cssText='color:#a9cbce;margin:5px 0 2px;font-size:11px;';panel.appendChild(details);
    const figure=document.createElement('div');figure.id='structure-diagram';
    figure.style.cssText='margin:2px auto 3px;text-align:center;';panel.appendChild(figure);
    const controls=document.createElement('div');controls.id='structure-layers';
    controls.style.cssText='display:flex;flex-wrap:wrap;gap:5px;margin:8px 0;';
    for(const [key,meta] of Object.entries(LAYERS)){
      const b=document.createElement('button');
      b.type='button';b.dataset.layer=key;b.textContent=meta.name.split(' / ')[0];
      b.setAttribute('data-layer',key);b.setAttribute('aria-pressed','false');
      b.style.cssText='padding:5px 7px;border:1px solid #425b65;border-radius:7px;color:#eff8f6;background:#18303c;font:600 11px system-ui;';
      b.addEventListener('click',()=>setLayer(key));controls.appendChild(b);
    }
    panel.appendChild(controls);
    const title=document.createElement('strong');title.id='structure-layer-name';panel.appendChild(title);
    const explanation=document.createElement('p');explanation.id='structure-description';
    explanation.style.cssText='margin:3px 0 9px;color:#c4d9df;font-size:11px;';panel.appendChild(explanation);
    const focus=document.createElement('button');focus.id='structure-focus';
    focus.type='button';focus.textContent='Focus selected tooth: Off';
    focus.setAttribute('aria-pressed','false');
    focus.style.cssText='padding:7px 8px;background:#25505c;color:#ecfffa;border:1px solid #668c90;border-radius:7px;font:600 11px system-ui;';
    focus.addEventListener('click',()=>{
      status.focusSelected=!status.focusSelected;
      focus.textContent='Focus selected tooth: '+(status.focusSelected?'On':'Off');
      focus.setAttribute('aria-pressed',String(status.focusSelected));
    });
    panel.appendChild(focus);
    const note=document.createElement('p');note.textContent='Schematic longitudinal section only. Root forms, tissue thickness, canals and materials are not taken from the Dundee meshes or patient scans. Focus affects only Babylon desktop display.';
    note.style.cssText='margin:9px 0 0;color:#a9c5cb;font-size:10px;';
    panel.appendChild(note);
    stage.appendChild(panel);
    updateSelected(null);setLayer('enamel');
  }
  root.KlinikStructureExplorer={version:1,status,descriptor,layers:LAYERS,diagram,open,close,setLayer,updateSelected,init};
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
  }
})(typeof window!=='undefined'?window:globalThis);
