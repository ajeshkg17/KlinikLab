import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const source = file => readSourceContract('../'+file, import.meta.url);
const catalog = source('native-godot/tools-inventory-catalog.gd');
const builder = source('native-godot/build-app.mjs');
const bench = source('native-godot/chairside-catalog.gd');
const panel = source('native-godot/tools-inventory-panel.gd');
const models = [
  ['wired_cmos_sensor','synthetic-wired-cmos-sensor.tscn','CMOSSealedSensorCase'],
  ['psp_plate','synthetic-psp-radiography-plate.tscn','PhosphorImagingSurface'],
  ['bitewing_holder','synthetic-bitewing-receptor-holder.tscn','BitewingRedBiteblock'],
  ['aiming_ring_rod','synthetic-xcp-aiming-ring-and-arm.tscn','RadiographyAimingRing0'],
  ['endo_sensor_holder','synthetic-endo-radiograph-holder.tscn','EndoWorkingFileClearanceSlot'],
  ['intraoral_camera','synthetic-intraoral-camera.tscn','OpticLensDarkFace'],
  ['shade_guide','synthetic-tooth-shade-guide.tscn','UncalibratedToothSample0'],
  ['occlusal_mirror','synthetic-occlusal-photography-mirror.tscn','BroadOcclusalMirrorOval'],
  ['electric_pulp_tester','synthetic-electric-pulp-tester.tscn','DecorativeTestValueDisplay'],
  ['transillumination_probe','synthetic-transillumination-wand.tscn','UnlitFiberopticTip']
];

test('ten diagnostic and imaging models extend inventory from 93 to 103 while preserving all prior categories', () => {
  const section = catalog.split('const DIAGNOSTIC_IMAGING_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section, 'new diagnostic category missing');
  assert.deepEqual([...section.matchAll(/^\t\t"id": "diagnostic\.([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),models.map(x=>x[1]));
  for (const field of ['name','german','kind','cue','purpose','source'])
    assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+field+'": "[^"]+",','gm'))].length,10,field);
  for (const [prefix, n] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],
    ['prostho_ortho',10],['perio_surgery',10],['finishing',10],['surgery_implant',10],['diagnostic',10]])
    assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+prefix+'\\.[^"]+",','gm'))].length,n,prefix);
  const extraIds = [...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing|surgery_implant|diagnostic)\.[^"]+)",/gm)].map(x=>x[1]);
  assert.equal(extraIds.length,84);
  assert.equal(new Set(extraIds).size,84);
  assert.match(catalog,/for entry: Dictionary in DIAGNOSTIC_IMAGING_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  assert.equal((bench.match(/^\t"tool\.[^"]+": \{/gm)||[]).length,19);
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});

test('each new schematic diagnostic scene has identifiable features, 3D meshes and resolved subresources',()=>{
  for(const [name,file,feature] of models){
    const scene = source('native-godot/assets/inventory/'+file);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,name);
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,name);
    assert.doesNotMatch(scene,/^\[ext_resource /m,name);
    const nodes = [...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(nodes.length>=8,name+' visible meshes');
    assert.equal(nodes.length,new Set(nodes).size,name+' duplicate nodes');
    assert.ok(nodes.includes(feature),name+' distinguishing feature');
    const resources = [...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    const used = [...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.ok(resources.length>=6,name+' resources');
    assert.equal(new Set(resources).size,resources.length,name+' duplicate resources');
    assert.ok(used.length>=16,name+' resource references');
    for (const ref of used) assert.ok(resources.includes(ref),name+' missing '+ref);
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]), resources.length+1,name+' load_steps');
    for(const [,attr,val] of scene.matchAll(/^(top_radius|bottom_radius|radius|height|radial_segments) = ([^\n]+)$/gm))
      assert.ok(Number(val)>0,name+' nonpositive '+attr);
  }
});

test('Godot builder packages the ten new scenes and viewer cannot modify learner progress',()=>{
  const m = builder.match(/const diagnosticImagingScenes=(\[[^\n]+\]);/);
  assert.ok(m,'missing source-local build file manifest');
  assert.deepEqual(JSON.parse(m[1]),models.map(x=>x[1]));
  assert.match(builder,/for\(const filename of diagnosticImagingScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/user:\/\//);
  assert.doesNotMatch(panel,/record_practice|_save_progress/);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
