import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const source = name => readSourceContract('../'+name,import.meta.url);
const catalog=source('native-godot/tools-inventory-catalog.gd');
const builder=source('native-godot/build-app.mjs');
const viewer=source('native-godot/tools-inventory-panel.gd');
const original=source('native-godot/chairside-catalog.gd');
const models=[
 ['bird_beak_pliers','synthetic-bird-beak-pliers.tscn','RoundedConicalBirdBeak'],
 ['three_prong_pliers','synthetic-three-prong-pliers.tscn','CentralWorkingBeak'],
 ['adams_pliers','synthetic-adams-pliers.tscn','LeftParallelFlatJaw'],
 ['mathieu_ligature_pliers','synthetic-mathieu-ligature-pliers.tscn','MathieuThumbRatchetLeft'],
 ['elastic_separator_pliers','synthetic-elastic-separating-pliers.tscn','DecorativeElasticSeparatorRing0'],
 ['boone_bracket_height_gauge','synthetic-boone-bracket-height-gauge.tscn','BooneGaugeCrossbar'],
 ['ligature_director','synthetic-orthodontic-ligature-director.tscn','BluntLigatureDirectorNotch'],
 ['tweed_loop_forming_pliers','synthetic-tweed-loop-pliers.tscn','TweedLoopFormingShoulder'],
 ['torquing_turret','synthetic-orthodontic-torquing-turret.tscn','CentralTurretCylinder'],
 ['aligner_removal_hook','synthetic-aligner-removal-hook.tscn','BluntRetainerRetrievalHook0']
];
const prior=[['inventory',6],['handtool',8],['rotary',10],['assistant',10],['prostho_ortho',10],
 ['perio_surgery',10],['finishing',10],['surgery_implant',10],['diagnostic',10],['lab',10],['advanced_endo',10]];
test('ten new orthodontic categories raise inventory to 133 with 114 unique additional IDs',()=>{
 const section=catalog.split('const ORTHO_ALIGNMENT_TOOLS := [')[1]?.split('\n]\n')[0];
 assert.ok(section,'new category missing');
 assert.deepEqual([...section.matchAll(/^\t\t"id": "ortho_alignment\.([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[0]));
 assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[1]));
 for(const k of ['name','german','kind','cue','purpose','source'])
  assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+k+'": "[^"]+",','gm'))].length,10,k);
 for(const [id,n] of [...prior,['ortho_alignment',10]])
  assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+id+'\\.[^"]+",','gm'))].length,n,id);
 const allIds=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing|surgery_implant|diagnostic|lab|advanced_endo|ortho_alignment)\.[^"]+)",/gm)].map(x=>x[1]);
 assert.equal(allIds.length,114);
 assert.equal(new Set(allIds).size,114);
 assert.match(catalog,/for entry: Dictionary in ORTHO_ALIGNMENT_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
 assert.equal((original.match(/^\t"tool\.[^"]+": \{/gm)||[]).length,19);
 assert.equal((original.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});
test('all ten original Godot study scenes have unique mesh nodes and complete resource references',()=>{
 for(const [id,filename,feature] of models){
  const text=source('native-godot/assets/inventory/'+filename);
  assert.match(text,/^\[gd_scene load_steps=\d+ format=3\]/m,id);
  assert.match(text,/^\[node name="[^"]+" type="Node3D"\]/m,id);
  assert.doesNotMatch(text,/^\[ext_resource /m,id);
  const nodes=[...text.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(m=>m[1]);
  assert.ok(nodes.length>=12,id+' mesh node count');
  assert.equal(nodes.length,new Set(nodes).size,id+' unique mesh nodes');
  assert.ok(nodes.includes(feature),id+' distinguishing feature');
  const resources=[...text.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(m=>m[1]);
  const refs=[...text.matchAll(/SubResource\("([^"]+)"\)/gm)].map(m=>m[1]);
  assert.equal(resources.length,new Set(resources).size,id+' resource IDs unique');
  assert.ok(refs.length>=24,id+' visual resource bindings');
  for(const ref of refs)assert.ok(resources.includes(ref),id+' unresolved '+ref);
  assert.equal(Number(text.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),resources.length+1,id+' scene load steps');
  for(const [,key,val] of text.matchAll(/^(top_radius|bottom_radius|radius|height|radial_segments) = ([^\n]+)$/gm))
   assert.ok(Number(val)>0,id+' '+key+' must be positive');
 }
});
test('native builder includes all ten local models while 20 benches and learner data remain isolated',()=>{
 const m=builder.match(/const orthoAlignmentScenes=(\[[^\n]+\]);/);
 assert.ok(m,'ortho local build manifest missing');
 assert.deepEqual(JSON.parse(m[1]),models.map(x=>x[1]));
 assert.match(builder,/for\(const filename of orthoAlignmentScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
 assert.match(viewer,/_selector\.item_selected\.connect\(_select_item\)/);
 assert.match(viewer,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
 assert.doesNotMatch(viewer,/user:\/\//);
 assert.doesNotMatch(viewer,/record_practice|_save_progress/);
 assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
