import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const read=path=>readSourceContract('../'+path,import.meta.url);
const catalog=read('native-godot/tools-inventory-catalog.gd');
const builder=read('native-godot/build-app.mjs');
const original=read('native-godot/chairside-catalog.gd');
const panel=read('native-godot/tools-inventory-panel.gd');
const models=[
 ['unc15_probe','synthetic-unc15-periodontal-probe.tscn','UNC15GraduatedMeasuringBlade'],
 ['who_cpi_probe','synthetic-who-cpi-periodontal-probe.tscn','WHOStudyBallTip'],
 ['nabers_furcation_probe','synthetic-nabers-furcation-probe.tscn','CurvedNabersFurcationWorkingEnd0'],
 ['goldman_fox_pocket_marker','synthetic-goldman-fox-pocket-marker.tscn','PocketMarkerOpposingAnvilPad'],
 ['kirkland_knife','synthetic-kirkland-gingivectomy-knife.tscn','KirklandBroadKidneyBladeSilhouette'],
 ['orban_interdental_knife','synthetic-orban-interdental-knife.tscn','OrbanNarrowLeafStudyBlade'],
 ['goldman_fox_scissors','synthetic-goldman-fox-periodontal-scissors.tscn','ScissorsBoxJoint'],
 ['hirschfeld_periodontal_file','synthetic-hirschfeld-periodontal-file.tscn','HirschfeldLowerFileToothStudy0'],
 ['ochsenbein_chisel','synthetic-ochsenbein-periodontal-chisel.tscn','OchsenbeinFlatBluntChiselHead'],
 ['implant_plastic_scaler','synthetic-implant-polymer-scaler.tscn','PolymerScalerCurvedTerminal0']
];

test('ten periodontal instrument study entries increase inventory from 133 to 143, preserving earlier groups',()=>{
 const section=catalog.split('const PERIODONTAL_ASSESSMENT_TOOLS := [')[1]?.split('\n]\n')[0];
 assert.ok(section,'new periodontal assessment category');
 assert.deepEqual([...section.matchAll(/^\t\t"id": "perio_assessment\.([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[0]));
 assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[1]));
 for(const key of ['name','german','kind','cue','purpose','source'])
  assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+key+'": "[^"]+",','gm'))].length,10,'metadata '+key);
 for(const [prefix,n] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],
  ['prostho_ortho',10],['perio_surgery',10],['finishing',10],['surgery_implant',10],
  ['diagnostic',10],['lab',10],['advanced_endo',10],['ortho_alignment',10],['perio_assessment',10]])
  assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+prefix+'\\.[^"]+",','gm'))].length,n,prefix);
 const ids=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing|surgery_implant|diagnostic|lab|advanced_endo|ortho_alignment|perio_assessment)\.[^"]+)",/gm)].map(x=>x[1]);
 assert.equal(ids.length,124);
 assert.equal(new Set(ids).size,124,'all non-bench IDs must be unique');
 assert.match(catalog,/for entry: Dictionary in PERIODONTAL_ASSESSMENT_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
 assert.equal((original.match(/^\t"tool\.[^"]+": \{/gm)||[]).length,19);
 assert.equal((original.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});
test('ten periodontal meshes retain distinct identification features and complete standalone Godot scene resources',()=>{
 for(const [id,file,characteristic] of models){
  const scene=read('native-godot/assets/inventory/'+file);
  assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,id);
  assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,id);
  assert.doesNotMatch(scene,/^\[ext_resource /m,id);
  const meshes=[...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
  assert.ok(meshes.length>=12,'visible 3D mesh count '+id);
  assert.equal(meshes.length,new Set(meshes).size,'unique scene mesh nodes '+id);
  assert.ok(meshes.includes(characteristic),'distinctive landmark '+id);
  const res=[...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
  const refs=[...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
  assert.ok(res.length>=8,'local mesh+material resources '+id);
  assert.equal(res.length,new Set(res).size,'duplicate resource ID '+id);
  assert.ok(refs.length>=24,'all mesh and material bindings '+id);
  for(const ref of refs)assert.ok(res.includes(ref),'unresolved resource '+ref+' '+id);
  assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),res.length+1,'load_steps '+id);
  for(const [,field,value] of scene.matchAll(/^(top_radius|bottom_radius|radius|height|radial_segments) = ([^\n]+)$/gm))
   assert.ok(Number(value)>0,'nonpositive '+field+' in '+id);
 }
});
test('builder contains all ten local periodontal scene copies and cannot modify journal or learner progress',()=>{
 const match=builder.match(/const periodontalAssessmentScenes=(\[[^\n]+\]);/);
 assert.ok(match,'periodontal builder manifest');
 assert.deepEqual(JSON.parse(match[1]),models.map(x=>x[1]));
 assert.match(builder,/for\(const filename of periodontalAssessmentScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
 assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
 assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
 assert.doesNotMatch(panel,/user:\/\//);
 assert.doesNotMatch(panel,/record_practice|_save_progress/);
 assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
