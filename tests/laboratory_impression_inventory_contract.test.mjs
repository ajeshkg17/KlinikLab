import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read = filename => readSourceContract('../'+filename, import.meta.url);
const catalog = read('native-godot/tools-inventory-catalog.gd');
const build = read('native-godot/build-app.mjs');
const bench = read('native-godot/chairside-catalog.gd');
const panel = read('native-godot/tools-inventory-panel.gd');
const models = [
  ['alginate_bowl','synthetic-alginate-mixing-bowl.tscn','TaperedFlexibleRubberMixingBowl'],
  ['alginate_spatula','synthetic-alginate-mixing-spatula.tscn','BroadRoundedAlginateMixingBlade'],
  ['plaster_spatula','synthetic-plaster-mixing-spatula.tscn','BroadHeavyPlasterMixingBlade'],
  ['fahnenstock_wax_knife','synthetic-fahnenstock-wax-knife.tscn','BroadBluntWaxKnifeBladeStudy'],
  ['le_cron_wax_carver','synthetic-le-cron-wax-carver.tscn','LeCronSculptingHook0'],
  ['boley_caliper','synthetic-boley-caliper.tscn','SlidingVernierJaw'],
  ['denture_brush','synthetic-denture-cleaning-brush.tscn','LargeDentureCleaningBristleBase'],
  ['articulator_mounting_plate','synthetic-articulator-mounting-plate.tscn','CentralArticulatorMountingStud'],
  ['wax_bite_rim','synthetic-bite-registration-wax-rim.tscn','UpperWaxRimArchStudyCurve0'],
  ['wax_heater','synthetic-dental-wax-heater.tscn','DarkNonheatingWaxReservoir']
];

test('ten laboratory/impression entries extend inventory to 113 and retain all earlier model groups',()=>{
  const section = catalog.split('const LABORATORY_IMPRESSION_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section,'new catalog group must exist');
  assert.deepEqual([...section.matchAll(/^\t\t"id": "lab\.([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[1]));
  for (const key of ['name','german','kind','cue','purpose','source'])
    assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+key+'": "[^"]+",','gm'))].length,10,'missing '+key);
  for(const [group,expected] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],
   ['prostho_ortho',10],['perio_surgery',10],['finishing',10],['surgery_implant',10],
   ['diagnostic',10],['lab',10]])
    assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+group+'\\.[^"]+",','gm'))].length,expected,group);
  const ids = [...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing|surgery_implant|diagnostic|lab)\.[^"]+)",/gm)].map(x=>x[1]);
  assert.equal(ids.length,94,'original 6 imported plus 88 new schematics');
  assert.equal(new Set(ids).size,94,'no duplicate catalog IDs');
  assert.match(catalog,/for entry: Dictionary in LABORATORY_IMPRESSION_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  assert.equal(countOriginalBenchToolEntries(bench),19);
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});

test('each laboratory scene has unique geometry, a distinguishing feature, and valid local Godot resources',()=>{
  for(const [id,filename,feature] of models) {
    const scene = read('native-godot/assets/inventory/'+filename);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,id+' scene format');
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,id+' 3D root');
    assert.doesNotMatch(scene,/^\[ext_resource /m,id+' must be independent');
    const nodes = [...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(nodes.length>=10,id+' visible meshes');
    assert.equal(nodes.length,new Set(nodes).size,id+' duplicate node');
    assert.ok(nodes.includes(feature),id+' characteristic feature');
    const resources = [...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    assert.ok(resources.length>=8,id+' local resources');
    assert.equal(resources.length,new Set(resources).size,id+' duplicate resource');
    const links = [...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.ok(links.length>=20,id+' visual links');
    for(const name of links)assert.ok(resources.includes(name),id+' unresolved '+name);
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),resources.length+1,id+' load_steps');
    for(const [,attribute,val] of scene.matchAll(/^(top_radius|bottom_radius|radius|height|radial_segments) = ([^\n]+)$/gm))
      assert.ok(Number(val)>0,id+' nonpositive '+attribute);
  }
});

test('native builder copies all ten local lab models and inventory viewer remains read-only',()=>{
  const m = build.match(/const laboratoryImpressionScenes=(\[[^\n]+\]);/);
  assert.ok(m,'new build copy list required');
  assert.deepEqual(JSON.parse(m[1]),models.map(x=>x[1]));
  assert.match(build,/for\(const filename of laboratoryImpressionScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/user:\/\//);
  assert.doesNotMatch(panel,/record_practice|_save_progress/);
  assert.doesNotMatch(build,/\bfetch\(|\bhttps\.get\(/);
});
