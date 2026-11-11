import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const source = name => readSourceContract('../' + name, import.meta.url);
const catalog = source('native-godot/tools-inventory-catalog.gd');
const builder = source('native-godot/build-app.mjs');
const panel = source('native-godot/tools-inventory-panel.gd');
const bench = source('native-godot/chairside-catalog.gd');
const expected = [
  ['hedstrom_h_file', 'synthetic-hedstrom-h-file.tscn', 'HedstromConicalFluteMarker0'],
  ['niti_rotary_file', 'synthetic-niti-rotary-file.tscn', 'RotaryHelicalFluteStudy0'],
  ['gates_glidden_drill', 'synthetic-gates-glidden-drill.tscn', 'OliveShapedCoronalFlute'],
  ['peeso_reamer', 'synthetic-peeso-reamer.tscn', 'PeesoParallelCuttingBody'],
  ['endodontic_ruler', 'synthetic-endodontic-measuring-ruler.tscn', 'DecorativeRulerScaleTick0'],
  ['endodontic_file_stand', 'synthetic-endodontic-file-stand.tscn', 'FileOrganizerPerforatedTop'],
  ['gutta_percha_points', 'synthetic-gutta-percha-point-box.tscn', 'GuttaPerchaTaperedPoint0'],
  ['endomotor', 'synthetic-endodontic-motor.tscn', 'EndodonticMotorDisplay'],
  ['heated_obturation_pen', 'synthetic-heated-obturation-pen.tscn', 'NonfunctionalHeatingStatusDisplay'],
  ['obturation_gun', 'synthetic-gutta-percha-backfill-gun.tscn', 'ObturationGunHeaterHousing']
];

test('ten new endodontic models are uniquely catalogued alongside 113 prior inventory entries', () => {
  const section = catalog.split('const ADVANCED_ENDODONTIC_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section, 'advanced endodontic inventory collection missing');
  assert.deepEqual([...section.matchAll(/^\t\t"id": "advanced_endo\.([^"]+)",/gm)].map(x=>x[1]),
    expected.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),
    expected.map(x=>x[1]));
  for (const property of ['name','german','kind','cue','purpose','source'])
    assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+property+'": "[^"]+",','gm'))].length,
      10, 'missing '+property);
  assert.match(catalog,/for entry: Dictionary in ADVANCED_ENDODONTIC_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  for (const [group,count] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],
    ['prostho_ortho',10],['perio_surgery',10],['finishing',10],['surgery_implant',10],
    ['diagnostic',10],['lab',10],['advanced_endo',10]]) {
    assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+group+'\\.[^"]+",','gm'))].length,count,group);
  }
  const uniqueIds=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing|surgery_implant|diagnostic|lab|advanced_endo)\.[^"]+)",/gm)].map(x=>x[1]);
  assert.equal(uniqueIds.length,104,'104 additional inventory entries');
  assert.equal(new Set(uniqueIds).size,104,'unique inventory IDs');
  assert.equal(countOriginalBenchToolEntries(bench),19,'19 original bench study models');
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20,'20 unchanged chair scenarios');
});

test('all ten advanced endodontic scenes use distinct recognizable meshes and fully resolved Godot resources', () => {
  for(const [id,filename,feature] of expected) {
    const scene = source('native-godot/assets/inventory/'+filename);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,'scene header '+id);
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,'3D root '+id);
    assert.doesNotMatch(scene,/^\[ext_resource /m,'unexpected external geometry '+id);
    const nodes=[...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(nodes.length>=12,'distinct geometry '+id);
    assert.equal(nodes.length,new Set(nodes).size,'unique node names '+id);
    assert.ok(nodes.includes(feature),'recognition feature '+id);
    const resources=[...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    assert.equal(resources.length,new Set(resources).size,'unique resource names '+id);
    const refs=[...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.ok(refs.length>=24,'mesh and material refs '+id);
    for(const ref of refs)assert.ok(resources.includes(ref),'unresolved resource '+ref+' in '+id);
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),resources.length+1,'load_steps '+id);
    for(const [,dimension,value] of scene.matchAll(/^(top_radius|bottom_radius|radius|height|radial_segments) = ([^\n]+)$/gm))
      assert.ok(Number(value)>0,'non-positive '+dimension+' in '+id);
  }
});

test('all ten scenes are packaged locally and the inventory does not modify learner journals', () => {
  const m=builder.match(/const advancedEndodonticScenes=(\[[^\n]+\]);/);
  assert.ok(m, 'missing build manifest');
  assert.deepEqual(JSON.parse(m[1]),expected.map(x=>x[1]));
  assert.match(builder,/for\(const filename of advancedEndodonticScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/user:\/\//);
  assert.doesNotMatch(panel,/record_practice|_save_progress/);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
