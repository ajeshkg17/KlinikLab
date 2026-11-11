import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const source = path => readSourceContract('../' + path, import.meta.url);
const catalog = source('native-godot/tools-inventory-catalog.gd');
const builder = source('native-godot/build-app.mjs');
const panel = source('native-godot/tools-inventory-panel.gd');
const bench = source('native-godot/chairside-catalog.gd');
const tools = [
  ['impression_dispenser','synthetic-impression-dispenser.tscn','DualCartridgeHolder'],
  ['articulating_paper_forceps','synthetic-articulating-paper-forceps.tscn','BlueDemoPaperStrip'],
  ['crown_remover','synthetic-crown-remover.tscn','SlidingWeight'],
  ['crown_bridge_scissors','synthetic-crown-bridge-scissors.tscn','ScissorsPivot'],
  ['bracket_holder','synthetic-bracket-holder.tscn','StudyBracketBody'],
  ['distal_end_cutter','synthetic-distal-end-cutter.tscn','DistalCutAndHoldPad'],
  ['ligature_cutter','synthetic-ligature-cutter.tscn','MicroLigatureCutterPivot'],
  ['weingart_pliers','synthetic-weingart-pliers.tscn','WeingartLeftJawSerration0'],
  ['bracket_remover','synthetic-bracket-remover.tscn','DemonstrationBracket'],
  ['orthodontic_band_pusher','synthetic-orthodontic-band-pusher.tscn','FlatBandSeatingWorkingPad']
];

test('all ten prosthodontic/orthodontic tools are uniquely catalogued alongside the previous 53', () => {
  const section = catalog.split('const PROSTHO_ORTHO_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section, 'missing new inventory group');
  assert.deepEqual([...section.matchAll(/^\t\t"id": "prostho_ortho\.([^"]+)",/gm)].map(x=>x[1]),
    tools.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),
    tools.map(x=>x[1]));
  for (const field of ['name','german','kind','cue','purpose'])
    assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+field+'": "[^"]+",','gm'))].length, 10, 'field '+field);
  assert.equal((section.match(/^\t\t"source": "https:\/\/[^"]+",/gm)||[]).length, 10);
  assert.match(catalog,/for entry: Dictionary in PROSTHO_ORTHO_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  for (const [prefix,count] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],['prostho_ortho',10]]) {
    assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+prefix+'\\.[^"]+",','gm'))].length,
      count, 'previous/new group count: '+prefix);
  }
  const allIds = [...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho)\.[^"]+)",/gm)].map(x=>x[1]);
  assert.equal(allIds.length,44);
  assert.equal(new Set(allIds).size,44);
  assert.equal(countOriginalBenchToolEntries(bench),19);
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});

test('ten Godot 3D instrument scenes are self-contained and have distinctive geometry', () => {
  for (const [id,file,feature] of tools) {
    const text=source('native-godot/assets/inventory/'+file);
    assert.match(text,/^\[gd_scene load_steps=\d+ format=3\]/m,'scene header: '+id);
    assert.match(text,/^\[node name="[^"]+" type="Node3D"\]/m,'3D root: '+id);
    assert.doesNotMatch(text,/^\[ext_resource /m,'unexpected external dependency: '+id);
    const names=[...text.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(names.length>=10,'too few visible mesh nodes: '+id);
    assert.equal(names.length,new Set(names).size,'duplicate node: '+id);
    assert.ok(names.includes(feature),'missing identifiable study feature: '+id);
    const resources=[...text.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    const used=[...text.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.equal(resources.length,new Set(resources).size,'duplicate subresources: '+id);
    assert.ok(used.length>=20,'insufficient mesh/material bindings: '+id);
    for(const ref of used)assert.ok(resources.includes(ref),'missing resource '+ref+': '+id);
    const steps=Number(text.match(/^\[gd_scene load_steps=(\d+) format=3\]/m)?.[1]);
    assert.equal(steps,resources.length+1,'wrong load_steps: '+id);
  }
});

test('Godot builder copies each new model, while viewer and learner data remain unchanged', () => {
  const list=builder.match(/const prosthoOrthoScenes=(\[[^\n]+\]);/);
  assert.ok(list,'missing extra inventory build list');
  assert.deepEqual(JSON.parse(list[1]),tools.map(x=>x[1]));
  assert.match(builder,/for\(const filename of prosthoOrthoScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/user:\/\//);
  assert.doesNotMatch(panel,/record_practice|_save_progress/);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/);
});
