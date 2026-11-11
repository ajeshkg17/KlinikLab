import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const read = path => readSourceContract('../' + path, import.meta.url);
const catalog = read('native-godot/tools-inventory-catalog.gd');
const builder = read('native-godot/build-app.mjs');
const panel = read('native-godot/tools-inventory-panel.gd');
const bench = read('native-godot/chairside-catalog.gd');
const expected = [
  ['air_water_syringe','synthetic-air-water-syringe.tscn','AirPushButton'],
  ['hve_tip','synthetic-hve-evacuator-tip.tscn','WideMouthPiece'],
  ['saliva_ejector','synthetic-saliva-ejector.tscn','PerforatedAspiratorCap'],
  ['cartridge_aspirating_syringe','synthetic-aspirating-cartridge-syringe.tscn','AspiratingThumbRing_1'],
  ['tofflemire_retainer','synthetic-tofflemire-matrix-retainer.tscn','OuterKnurledKnob'],
  ['sectional_matrix_ring','synthetic-sectional-matrix-ring.tscn','LeftContactFoot'],
  ['interdental_wedge','synthetic-interdental-wooden-wedge.tscn','TaperedWedgeMainBody'],
  ['rubber_dam_frame','synthetic-rubber-dam-frame.tscn','LeftDamRetentionStud0'],
  ['apex_locator','synthetic-endodontic-apex-locator.tscn','DarkDisplayBezel'],
  ['bite_block','synthetic-dental-bite-block.tscn','UpperBiteRest']
];

test('catalog extends 43 prior models with ten labelled and distinct assistant/restorative study entries', () => {
  const section = catalog.split('const ASSISTANT_RESTORATIVE_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section, 'missing assistant/restorative catalog');
  assert.deepEqual([...section.matchAll(/^\t\t"id": "assistant\.([^"]+)",/gm)].map(m=>m[1]),
    expected.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(m=>m[1]),
    expected.map(x=>x[1]));
  assert.equal((section.match(/^\t\t"german": "[^"]+",/gm)||[]).length,10);
  assert.equal((section.match(/^\t\t"purpose": "[^"]+",/gm)||[]).length,10);
  assert.equal((section.match(/^\t\t"source": "https:\/\/[^"]+",/gm)||[]).length,10);
  assert.match(catalog,/for entry: Dictionary in ASSISTANT_RESTORATIVE_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  assert.equal((catalog.match(/^\t\t"id": "inventory\.[^"]+",/gm)||[]).length,6);
  assert.equal((catalog.match(/^\t\t"id": "handtool\.[^"]+",/gm)||[]).length,8);
  assert.equal((catalog.match(/^\t\t"id": "rotary\.[^"]+",/gm)||[]).length,10);
  assert.equal((bench.match(/^\t"tool\.[^"]+": \{/gm)||[]).length,19);
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
  const allIds=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant)\.[^"]+)",/gm)].map(m=>m[1]);
  assert.equal(allIds.length,34,'six CC0 + eight handheld + ten rotary + ten assistant');
  assert.equal(new Set(allIds).size,34,'inventory IDs must be unique');
});

test('ten new schematic scenes have Node3D roots, distinct visible features and resolved resources', () => {
  for(const [id,file,landmark] of expected) {
    const scene=read('native-godot/assets/inventory/'+file);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,'scene header: '+id);
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,'root: '+id);
    assert.doesNotMatch(scene,/^\[ext_resource /m,'unexpected external scene dependency: '+id);
    const nodes=[...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(m=>m[1]);
    assert.ok(nodes.length>=9,'too few visible meshes: '+id);
    assert.equal(nodes.length,new Set(nodes).size,'duplicate mesh names: '+id);
    assert.ok(nodes.includes(landmark),'distinguishing feature absent: '+id);
    const resources=[...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(m=>m[1]);
    assert.equal(new Set(resources).size,resources.length,'duplicate subresources: '+id);
    const refs=[...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(m=>m[1]);
    assert.ok(refs.length>=18,'insufficient mesh/material binding: '+id);
    for(const ref of refs)assert.ok(resources.includes(ref),'unresolved '+ref+' in '+id);
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),resources.length+1,
      'Godot load_steps mismatch: '+id);
  }
});

test('all ten source scenes are copied into Godot build; shared bench and learner data stay isolated', () => {
  const copyList=builder.match(/const assistantRestorativeScenes=(\[[^\n]+\]);/);
  assert.ok(copyList,'build manifest missing');
  assert.deepEqual(JSON.parse(copyList[1]),expected.map(x=>x[1]));
  assert.match(builder,/for\(const filename of assistantRestorativeScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/record_practice|_save_progress|user:\/\//);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/,'build must not download unpinned assets');
});
