import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read=path=>readSourceContract('../'+path,import.meta.url);
const catalog=read('native-godot/tools-inventory-catalog.gd');
const builder=read('native-godot/build-app.mjs');
const bench=read('native-godot/chairside-catalog.gd');
const viewer=read('native-godot/tools-inventory-panel.gd');
const instruments=[
 ['minnesota_retractor','synthetic-minnesota-retractor.tscn','OffsetCheekRetractorPaddle'],
 ['frazier_aspirator','synthetic-frazier-aspirator.tscn','ControlVentCollar'],
 ['friedman_rongeur','synthetic-friedman-rongeur.tscn','RobustRongeurJoint'],
 ['miller_colburn_bone_file','synthetic-miller-colburn-bone-file.tscn','BoneFileSerrationMarker0'],
 ['lucas_bone_curette','synthetic-lucas-bone-curette.tscn','LowerRoundedLucasSpoonStudyEnd'],
 ['implant_torque_wrench','synthetic-implant-torque-wrench.tscn','RatchetCircularHead'],
 ['implant_manual_driver','synthetic-implant-hand-driver.tscn','IllustrativeHexDriverTip'],
 ['implant_tissue_punch','synthetic-implant-tissue-punch.tscn','BluntPunchSafetyCover'],
 ['bone_graft_packer','synthetic-bone-graft-packer.tscn','WideGraftPackingFace'],
 ['bone_graft_syringe','synthetic-bone-grafting-syringe.tscn','BoneGraftCarrierBarrel']
];

test('surgery and implant inventory expands 83 study models to 93 while keeping original twenty chair lessons',()=>{
 const group=catalog.split('const SURGICAL_IMPLANT_TOOLS := [')[1]?.split('\n]\n')[0];
 assert.ok(group,'missing independent surgery/implant study group');
 assert.deepEqual([...group.matchAll(/^\t\t"id": "surgery_implant\.([^"]+)",/gm)].map(x=>x[1]),
  instruments.map(x=>x[0]));
 assert.deepEqual([...group.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),
  instruments.map(x=>x[1]));
 for(const property of ['name','german','kind','cue','purpose'])
  assert.equal([...group.matchAll(new RegExp('^\\t\\t"'+property+'": "[^"]+",','gm'))].length,10,property+' labels');
 assert.equal((group.match(/^\t\t"source": "https:\/\/[^"]+",/gm)||[]).length,10);
 for(const [prefix,count] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],['prostho_ortho',10],['perio_surgery',10],['finishing',10],['surgery_implant',10]])
  assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+prefix+'\\.[^"]+",','gm'))].length,count,'inventory group '+prefix);
 const extraIds=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing|surgery_implant)\.[^"]+)",/gm)].map(x=>x[1]);
 assert.equal(extraIds.length,74);
 assert.equal(new Set(extraIds).size,74);
 assert.match(catalog,/for entry: Dictionary in SURGICAL_IMPLANT_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
 assert.equal(countOriginalBenchToolEntries(bench),19);
 assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});

test('all ten new self-contained Godot 3D scenes contain unique mesh nodes, feature cues, and resolved references',()=>{
 for(const [id,filename,landmark] of instruments){
  const scene=read('native-godot/assets/inventory/'+filename);
  assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,id+' scene header');
  assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,id+' Node3D root');
  assert.doesNotMatch(scene,/^\[ext_resource /m,id+' should be self-contained');
  const nodes=[...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
  assert.ok(nodes.length>=10,id+' mesh density');
  assert.equal(nodes.length,new Set(nodes).size,id+' unique nodes');
  assert.ok(nodes.includes(landmark),id+' identifying physical feature');
  const resources=[...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
  const use=[...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
  assert.ok(resources.length>=8,id+' local subresources');
  assert.equal(resources.length,new Set(resources).size,id+' duplicate resource id');
  assert.ok(use.length>=20,id+' referenced mesh and material count');
  for(const ref of use)assert.ok(resources.includes(ref),id+' unresolved '+ref);
  assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),resources.length+1,id+' load_steps');
  for(const [,property,value] of scene.matchAll(/^(top_radius|bottom_radius|radius|height|radial_segments) = ([^\n]+)$/gm))
   assert.ok(Number(value)>0,id+' nonpositive '+property);
 }
});

test('build packages exactly ten new study models and viewer does not write progress',()=>{
 const m=builder.match(/const surgeryImplantScenes=(\[[^\n]+\]);/);
 assert.ok(m,'missing build copy list');
 assert.deepEqual(JSON.parse(m[1]),instruments.map(x=>x[1]));
 assert.match(builder,/for\(const filename of surgeryImplantScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
 assert.match(viewer,/_selector\.item_selected\.connect\(_select_item\)/);
 assert.match(viewer,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
 assert.doesNotMatch(viewer,/user:\/\//);
 assert.doesNotMatch(viewer,/record_practice|_save_progress/);
 assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
