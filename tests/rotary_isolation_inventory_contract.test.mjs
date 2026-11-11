import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read = path => readSourceContract('../' + path, import.meta.url);
const catalog = read('native-godot/tools-inventory-catalog.gd');
const builder = read('native-godot/build-app.mjs');
const panel = read('native-godot/tools-inventory-panel.gd');
const bench = read('native-godot/chairside-catalog.gd');
const newTools = [
  ['high_speed_turbine','synthetic-high-speed-handpiece.tscn','TurbineHeadHousing'],
  ['contra_angle','synthetic-contra-angle-handpiece.tscn','ContraAngledDriveSegment'],
  ['straight_handpiece','synthetic-straight-handpiece.tscn','NoseChuck'],
  ['round_bur','synthetic-round-bur.tscn','SphericalRoundBurHead'],
  ['pear_bur_330','synthetic-pear-bur-330.tscn','RoundedPearBulb'],
  ['endo_z_bur','synthetic-endo-z-bur.tscn','SchematicRoundedNonCuttingTip'],
  ['rubber_dam_clamp','synthetic-rubber-dam-clamp.tscn','LeftClampJaw'],
  ['rubber_dam_forceps','synthetic-rubber-dam-clamp-forceps.tscn','LeftFingerRing_1'],
  ['straight_elevator','synthetic-straight-elevator.tscn','RoundedWedgeBladeStudyShape'],
  ['extraction_forceps','synthetic-extraction-forceps.tscn','HeavyArticulationHinge']
];

test('ten new categorized models extend inventory to 43 without changing 20 original benches', () => {
  const section = catalog.split('const ROTARY_ISOLATION_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section, 'missing rotary/isolation/extraction group');
  const ids = [...section.matchAll(/^\t\t"id": "rotary\.([^"]+)",/gm)].map(x=>x[1]);
  const files = [...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)]
    .map(x=>x[1]);
  assert.deepEqual(ids, newTools.map(x=>x[0]));
  assert.deepEqual(files, newTools.map(x=>x[1]));
  assert.equal(new Set(ids).size, 10);
  assert.equal(new Set(files).size, 10);
  assert.match(catalog, /for entry: Dictionary in ROTARY_ISOLATION_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  assert.equal((catalog.match(/^\t\t"id": "handtool\.[^"]+",/gm)||[]).length, 8);
  assert.equal((catalog.match(/^\t\t"id": "inventory\.[^"]+",/gm)||[]).length, 6);
  assert.equal(countOriginalBenchToolEntries(bench), 19);
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
  // English/German labels and caution notes exist for every new study prop.
  assert.equal((section.match(/^\t\t"german": "[^"]+",/gm)||[]).length,10);
  assert.equal((section.match(/^\t\t"purpose": "[^"]+",/gm)||[]).length,10);
  assert.equal((section.match(/^\t\t"source": "https:\/\/[^"]+",/gm)||[]).length,10);
});

test('every new Godot model has a distinct working feature and consistent scene resources', () => {
  for(const [id,file,feature] of newTools) {
    const scene = read('native-godot/assets/inventory/'+file);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,'scene header: '+id);
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,'root: '+id);
    const visualNodes = [...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(visualNodes.length>=9,'insufficient visible geometry: '+id);
    assert.equal(visualNodes.length,new Set(visualNodes).size,'duplicate mesh node: '+id);
    assert.ok(visualNodes.includes(feature),'distinguishing geometry missing: '+id);
    const resources = [...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    assert.ok(resources.length>=6,'insufficient subresources: '+id);
    assert.equal(resources.length,new Set(resources).size,'duplicate resource id: '+id);
    const used = [...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.ok(used.length>=18,'insufficient geometry/material links: '+id);
    for(const reference of used)
      assert.ok(resources.includes(reference),'unresolved '+reference+' in '+id);
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]), resources.length+1,
      'scene load_steps mismatch: '+id);
    assert.doesNotMatch(scene,/^\[ext_resource /m,'external dependency forbidden: '+id);
  }
});

test('Godot packaging includes all ten models; inventory stays nonclinical and read-only', () => {
  const match = builder.match(/const additionalHandToolScenes=(\[[^\n]+\]);/);
  assert.ok(match,'missing ten-tool packaging list');
  const packaged = JSON.parse(match[1]);
  assert.deepEqual(packaged,newTools.map(x=>x[1]));
  assert.match(builder,/for\(const filename of additionalHandToolScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/_save_progress|record_practice|user:\/\//);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/,'no unpinned downloads');
});
