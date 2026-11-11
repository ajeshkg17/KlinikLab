import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read=p=>readSourceContract('../'+p,import.meta.url);
const catalog=read('native-godot/tools-inventory-catalog.gd');
const builder=read('native-godot/build-app.mjs');
const original=read('native-godot/chairside-catalog.gd');
const panel=read('native-godot/tools-inventory-panel.gd');
const expected=[
  ['gracey_curette','synthetic-gracey-curette.tscn','GraceyOffsetTerminalShank'],
  ['universal_curette','synthetic-universal-curette.tscn','SymmetricUniversalWorkingFace'],
  ['hoe_scaler','synthetic-hoe-scaler.tscn','HoeFlatBluntWorkEnd'],
  ['scalpel_handle','synthetic-scalpel-handle.tscn','BluntSafetyGuard'],
  ['periosteal_elevator','synthetic-periosteal-elevator.tscn','BroadBluntMoltEnd'],
  ['surgical_tissue_forceps','synthetic-tissue-forceps.tscn','AdsonSpringJoin'],
  ['needle_holder','synthetic-needle-holder.tscn','HeavyNeedleHolderJoint'],
  ['hemostat','synthetic-mosquito-hemostat.tscn','HemostatBoxLock'],
  ['endodontic_plugger','synthetic-endo-plugger.tscn','FlatBluntCondensationEnd'],
  ['irrigation_syringe','synthetic-endo-irrigation-syringe.tscn','ProtectiveBluntNeedleCap']
];

test('ten new instrument entries extend inventory to 73 without modifying 20 original benches',()=>{
  const section=catalog.split('const PERIO_SURGERY_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section);
  assert.deepEqual([...section.matchAll(/^\t\t"id": "perio_surgery\.([^"]+)",/gm)].map(x=>x[1]),expected.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),expected.map(x=>x[1]));
  for(const key of ['name','german','kind','cue','purpose','source'])
    assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+key+'": "[^"]+",','gm'))].length,10,key);
  assert.match(catalog,/for entry: Dictionary in PERIO_SURGERY_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  for(const [key,count] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],['prostho_ortho',10],['perio_surgery',10]])
    assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+key+'\\.[^"]+",','gm'))].length,count,key);
  const ids=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery)\.[^"]+)",/gm)].map(x=>x[1]);
  assert.equal(ids.length,54);
  assert.equal(new Set(ids).size,54);
  assert.equal(countOriginalBenchToolEntries(original),19);
  assert.equal((original.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});

test('ten distinct self-contained 3D study models contain identifiable geometry and valid mesh resources',()=>{
  for(const [id,file,feature] of expected){
    const scene=read('native-godot/assets/inventory/'+file);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,id);
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,id);
    assert.doesNotMatch(scene,/^\[ext_resource /m,id);
    const nodes=[...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(nodes.length>=9,id+' mesh count');
    assert.equal(nodes.length,new Set(nodes).size,id+' unique mesh nodes');
    assert.ok(nodes.includes(feature),id+' feature');
    const resources=[...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    const referenced=[...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.equal(resources.length,new Set(resources).size,id+' resource IDs');
    assert.ok(referenced.length>=18,id+' mesh/material references');
    assert.ok(referenced.every(x=>resources.includes(x)),id+' unresolved refs');
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),resources.length+1,id+' load_steps');
  }
});

test('new models are packaged read-only without network imports, scoring or learner changes',()=>{
  const match=builder.match(/const perioSurgeryScenes=(\[[^\n]+\]);/);
  assert.ok(match,'new builder list');
  assert.deepEqual(JSON.parse(match[1]),expected.map(x=>x[1]));
  assert.match(builder,/for\(const filename of perioSurgeryScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/_save_progress|record_practice|user:\/\//);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
