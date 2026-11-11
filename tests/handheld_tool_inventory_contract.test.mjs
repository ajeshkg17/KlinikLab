import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const inventory = get('native-godot/tools-inventory-catalog.gd');
const builder = get('native-godot/build-app.mjs');
const panel = get('native-godot/tools-inventory-panel.gd');
const originalBench = get('native-godot/chairside-catalog.gd');

const handheld = [
  ['handtool.explorer_23', 'synthetic-explorer-23.tscn', 'HookFineTerminal'],
  ['handtool.college_pliers', 'synthetic-college-pliers.tscn', 'LeftFineHoldingTip'],
  ['handtool.spoon_excavator', 'synthetic-spoon-excavator.tscn', 'OvalSpoonBowl'],
  ['handtool.ball_burnisher', 'synthetic-ball-burnisher.tscn', 'PolishedBallTerminal'],
  ['handtool.k_file', 'synthetic-k-file.tscn', 'IllustrativeHelicalFluteMarker'],
  ['handtool.finger_spreader', 'synthetic-finger-spreader.tscn', 'SmoothGradualTaperNotFlutedFile'],
  ['handtool.sickle_scaler', 'synthetic-sickle-scaler.tscn', 'LowerCurvedSickleTip'],
  ['handtool.composite_spatula', 'synthetic-composite-spatula.tscn', 'BroadFlatCompositePlacementTip']
];

test('add eight individually selectable 3D instruments while preserving six imported and nineteen existing tools', () => {
  const fresh = [...inventory.matchAll(/^\t\t"id": "(handtool\.[^"]+)",/gm)].map(x => x[1]);
  assert.deepEqual(fresh, handheld.map(x => x[0]));
  const section = inventory.split('const HAND_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section, 'missing separate hand-instrument definitions');
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)"/gm)].map(x => x[1]),
    handheld.map(x => x[1]));
  assert.match(inventory, /for entry: Dictionary in HAND_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  assert.equal((inventory.match(/^\t\t"id": "inventory\.[^"]+",/gm) || []).length, 6,
    'old six CC0 imported entries must remain');
  assert.equal(countOriginalBenchToolEntries(originalBench), 19,
    'original bench instrument set must not drift');
  assert.equal((originalBench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm) || []).length, 20);
});

test('all eight self-contained schematic scenes have distinct visible mesh, source and packed path', () => {
  for (const [id, file, landmark] of handheld) {
    const scene = get('native-godot/assets/inventory/' + file);
    assert.match(scene, /^\[gd_scene load_steps=\d+ format=3\]/m, 'Godot scene header: ' + id);
    assert.match(scene, /^\[node name="[^"]+" type="Node3D"\]/m, 'Node3D root: ' + id);
    assert.match(scene, /^\[node name="[^"]+" type="MeshInstance3D" parent="\."\]/m,
      'visible mesh: ' + id);
    assert.ok(scene.includes(landmark), 'distinctive working end missing: ' + id);
    const resources = [...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x => x[1]);
    const references = [...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x => x[1]);
    assert.equal(new Set(resources).size, resources.length, 'duplicate resource ID: ' + id);
    assert.ok(references.length >= 4, 'insufficient model parts: ' + id);
    for (const ref of references) {
      assert.ok(resources.includes(ref), 'unresolved scene resource: ' + id + ' / ' + ref);
    }
    const steps = Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]);
    assert.equal(steps, resources.length + 1, 'incorrect resource load_steps: ' + id);
    assert.ok(builder.includes("'" + file + "'"), 'model not copied by build: ' + file);
  }
  assert.match(builder, /copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
});

test('inventory remains a read-only browser and does not introduce a 21st lesson or profile changes', () => {
  assert.match(panel, /_entries = CATALOG\.entries\(\)/);
  assert.match(panel, /_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel, /_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.match(panel, /View asset source or instrument reference/);
  assert.doesNotMatch(panel, /_save_progress|record_practice|user:\/\//);
  assert.match(inventory, /original schematic teaching geometry/);
  assert.doesNotMatch(builder, /fetch\(|https\.get\(/, 'new build should not download unpinned models');
});
