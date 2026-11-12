import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract, countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read = path => readSourceContract('../'+path, import.meta.url);
const catalog = read('native-godot/chairside-catalog.gd');
const app = read('native-godot/app.gd');
const replay = read('native-godot/composite-inspection-trial.gd');
const shared = read('native-godot/chairside-bench.gd');
const builder = read('native-godot/build-app.mjs');
const drills = read('native-godot/procedure-drills.gd');
const scenarios = read('native-godot/procedure-scenarios.gd');
const runner = read('native-godot/matrix-forceps-inspection-trial.gd');
const matrix = read('native-godot/assets/inventory/synthetic-sectional-matrix-forceps.tscn');
const clamp = read('native-godot/assets/inventory/synthetic-rubber-dam-clamp-forceps.tscn');

test('one extra forceps recognition lesson reuses original composite diagram chair', () => {
 assert.match(catalog, /^const MATRIX_FORCEPS := \{/m);
 assert.match(catalog, /"id": "sectional_matrix_vs_rubber_dam_forceps_intro"/);
 assert.match(catalog, /"scenario": "composite"/);
 assert.match(catalog, /"finish_event": "record_sectional_matrix_forceps_recognition"/);
 assert.match(catalog, /chair does NOT physically simulate matrix-ring engagement/);
 assert.match(catalog, /No matrix ring placement, contact point formation, rubber dam isolation/);
 assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm) || []).length, 20);
 for (const prior of ['FURCATION','BITEWING_HOLDER','ENDO_FILE','DENTURE_VS_WAX_RIM'])
   assert.match(catalog, new RegExp('^const '+prior+' := \\{', 'm'));
 assert.equal((drills.match(/^\s*\["[a-z_]+",/gm) || []).length, 20);
 assert.ok(scenarios.includes('"composite": ["crown", "Restorative handpiece", ["Remove marked defect", "Place virtual composite"], "restore"]'));
});

test('two original distinct 3D forceps and two instructor cards have correct expected IDs', () => {
 for (const id of ['tool.sectional_matrix_placement_forceps','tool.rubber_dam_clamp_forceps_alternative',
    'material.sectional_matrix_ring_reference','material.rubber_dam_clamp_reference'])
   assert.ok(catalog.includes('"'+id+'": {'), 'missing item '+id);
 assert.match(catalog, /"choices": \["tool.sectional_matrix_placement_forceps", "tool.rubber_dam_clamp_forceps_alternative"\]/);
 assert.match(catalog, /"expected": "tool.sectional_matrix_placement_forceps"/);
 assert.match(catalog, /"choices": \["material.sectional_matrix_ring_reference", "material.rubber_dam_clamp_reference"\]/);
 assert.match(catalog, /"expected": "material.sectional_matrix_ring_reference"/);
 assert.match(catalog, /"label": "assigned matrix-ring diagram key"/);
 assert.match(catalog, /"swatch": Color\("#abd6d4"\)/);
 assert.match(catalog, /"swatch": Color\("#edc8a7"\)/);
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-sectional-matrix-forceps.tscn"'));
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-rubber-dam-clamp-forceps.tscn"'));
 assert.match(matrix, /^\[node name="SchematicSectionalMatrixRingPlacementForceps" type="Node3D"\]/m);
 assert.match(clamp, /^\[node name="SchematicRubberDamClampPlacementForceps" type="Node3D"\]/m);
 for(const [file,scene] of [
   ['synthetic-sectional-matrix-forceps.tscn',matrix],
   ['synthetic-rubber-dam-clamp-forceps.tscn',clamp]
 ]) {
   assert.ok((scene.match(/type="MeshInstance3D"/g)||[]).length>=8, 'independent 3D geometry '+file);
   assert.ok(builder.includes('"'+file+'"'), 'already bundled asset '+file);
 }
});

test('Journey route and dedicated replay runner reuse composite without new procedure', () => {
 assert.match(app, /\["matrix_forceps", "Open sectional matrix forceps recognition bench", "KL_OPEN_MATRIX_FORCEPS_BENCH"\]/);
 assert.match(app, /\["Run sectional matrix forceps bench replay", "matrix_forceps_bench"\]/);
 assert.match(app, /elif mode == "matrix_forceps_bench":\s*\n\t\ttrial_script = "res:\/\/matrix-forceps-inspection-trial.gd"/);
 assert.match(app, /CHAIRSIDE_CATALOG\.MATRIX_FORCEPS if lesson_id == "matrix_forceps"/);
 assert.match(app, /str\(_chairside_bench\.get\("_lesson"\)\["scenario"\]\) != scenario/);
 assert.match(runner, /^extends "res:\/\/composite-inspection-trial.gd"/m);
 assert.match(runner, /await _run_lesson\("matrix_forceps"\)/);
 assert.ok(builder.includes("'matrix-forceps-inspection-trial.gd'"));
});

test('replay covers tool/card rejection and correction, chair rejection, finish and restart with journal guard', () => {
 for (const part of [
   'BENCH_CATALOG.MATRIX_FORCEPS if lesson_id == "matrix_forceps"',
   '"KL_OPEN_MATRIX_FORCEPS_BENCH" if lesson_id == "matrix_forceps"',
   'KL_BENCH_ROTATE_LEFT_tool_sectional_matrix_placement_forceps',
   'KL_BENCH_ROTATE_RIGHT_tool_rubber_dam_clamp_forceps_alternative',
   'wrong_tool = "tool.rubber_dam_clamp_forceps_alternative"',
   'wrong_material = "material.rubber_dam_clamp_reference"',
   'KL_BENCH_PICK_tool_rubber_dam_clamp_forceps_alternative" if lesson_id == "matrix_forceps"',
   'KL_BENCH_PICK_tool_sectional_matrix_placement_forceps" if lesson_id == "matrix_forceps"',
   'KL_BENCH_PICK_material_rubber_dam_clamp_reference" if lesson_id == "matrix_forceps"',
   'material_sectional_matrix_ring_reference" if lesson_id == "matrix_forceps"',
   'str(lab.get("scenario")["id"]) != str(config["scenario"])',
   'report.get("scenario") != config["scenario"]',
   'retries.has_all(["tool_choice", "material_choice", "chair"])',
   'seen_correct.has_all(["tool_choice", "material_choice"])',
   'event["event"] == config["finish_event"]',
   'retries["chair"]["selected_id"]',
   'retries["chair"]["expected_id"]',
   'KL_BENCH_RESET',
   'restarted["selection_score"] != 0',
   'journal_existed != FileAccess.file_exists(JOURNAL) or journal != FileAccess.get_file_as_bytes(JOURNAL)'
 ]) assert.ok(replay.includes(part), 'guarded replay fragment missing: '+part);
 assert.match(replay, /"composite", "matrix_forceps", "sealant"/);
 assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["selected_id"\]\) !=/);
});

test('original 19 tool records, original chair scoring and learner data isolation remain protected', () => {
 assert.equal(countOriginalBenchToolEntries(catalog), 19);
 assert.match(shared, /_event\("bench", kind \+ "_choice", id, expected, "correct" if accepted else "retry"/);
 assert.match(shared, /practice_requested.emit\(_lesson\["scenario"\]\)/);
 assert.match(shared, /"selected_id": selected, "expected_id": expected/);
 assert.match(shared, /_choices.clear\(\)/);
 assert.match(shared, /_chair_attempts.clear\(\)/);
 assert.doesNotMatch(shared, /user:\/\/kliniklab-native-progress-v2\.json/);
});
