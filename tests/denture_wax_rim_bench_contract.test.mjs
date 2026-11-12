import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract, countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read = p => readSourceContract('../'+p, import.meta.url);
const catalog = read('native-godot/chairside-catalog.gd');
const app = read('native-godot/app.gd');
const replay = read('native-godot/composite-inspection-trial.gd');
const shared = read('native-godot/chairside-bench.gd');
const builder = read('native-godot/build-app.mjs');
const drills = read('native-godot/procedure-drills.gd');
const scenarios = read('native-godot/procedure-scenarios.gd');
const runner = read('native-godot/denture-wax-rim-inspection-trial.gd');
const denture = read('native-godot/assets/bench/synthetic-complete-denture.tscn');
const wax = read('native-godot/assets/inventory/synthetic-bite-registration-wax-rim.tscn');

test('one new denture-versus-wax-rim lesson reuses the twenty-scenario original full denture chair',()=>{
 assert.match(catalog,/^const DENTURE_VS_WAX_RIM := \{/m);
 assert.match(catalog,/"id": "complete_denture_vs_wax_rim_recognition_intro"/);
 assert.match(catalog,/"scenario": "full_denture"/);
 assert.match(catalog,/"finish_event": "record_finished_denture_vs_wax_rim_review"/);
 assert.match(catalog,/No impression, actual jaw relation, vertical dimension, functional fit/);
 assert.match(catalog,/No patient fit, retention, jaw-relation measurement, occlusion, treatment or clinical outcome was assessed/);
 assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
 for(const prior of ['FURCATION','BITEWING_HOLDER','ENDO_FILE'])
  assert.match(catalog,new RegExp('^const '+prior+' := \\{','m'));
 assert.equal((drills.match(/^\s*\["[a-z_]+",/gm)||[]).length,20);
 assert.match(scenarios,/"full_denture": \["soft", "Complete denture", \["Seat the complete arch", "Check the posterior landmark"\], "seat"\]/);
});

test('completed denture and wax rim remain two distinct original rotatable 3D choices, with two case-specific cards',()=>{
 for(const id of ['tool.complete_denture_arch','tool.wax_occlusion_rim_study',
    'material.finished_denture_posterior_key','material.wax_rim_jaw_relation_key'])
  assert.ok(catalog.includes('"'+id+'": {'),'missing item '+id);
 assert.match(catalog,/"choices": \["tool.complete_denture_arch", "tool.wax_occlusion_rim_study"\]/);
 assert.match(catalog,/"expected": "tool.complete_denture_arch"/);
 assert.match(catalog,/"choices": \["material.finished_denture_posterior_key", "material.wax_rim_jaw_relation_key"\]/);
 assert.match(catalog,/"expected": "material.finished_denture_posterior_key"/);
 assert.match(catalog,/"label": "assigned finished-denture marker key"/);
 assert.match(catalog,/"swatch": Color\("#b0d6d0"\)/);
 assert.match(catalog,/"swatch": Color\("#e4c5a0"\)/);
 assert.ok(catalog.includes('"scene": "res://assets/bench/synthetic-complete-denture.tscn"'));
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-bite-registration-wax-rim.tscn"'));
 assert.match(denture,/^\[node name="SyntheticCompleteRemovableDentureArch" type="Node3D"\]/m);
 assert.match(wax,/^\[node name="SchematicDentureWaxOcclusionRim" type="Node3D"\]/m);
 for(const [filename,content] of [['synthetic-complete-denture.tscn',denture],
    ['synthetic-bite-registration-wax-rim.tscn',wax]]){
  assert.ok((content.match(/type="MeshInstance3D"/g)||[]).length>=10,'3D mesh parts '+filename);
  assert.ok(builder.includes(filename),'already packaged original study scene '+filename);
 }
});

test('Journey open, dedicated replay and source packaging all map to full_denture without a new chair',()=>{
 assert.match(app,/\["denture_wax_rim", "Open completed denture versus wax rim bench", "KL_OPEN_DENTURE_WAX_RIM_BENCH"\]/);
 assert.match(app,/\["Run denture versus wax rim bench replay", "denture_wax_rim_bench"\]/);
 assert.match(app,/elif mode == "denture_wax_rim_bench":\s*\n\t\ttrial_script = "res:\/\/denture-wax-rim-inspection-trial.gd"/);
 assert.match(app,/CHAIRSIDE_CATALOG\.DENTURE_VS_WAX_RIM if lesson_id == "denture_wax_rim"/);
 assert.match(app,/str\(_chairside_bench\.get\("_lesson"\)\["scenario"\]\) != scenario/);
 assert.match(runner,/^extends "res:\/\/composite-inspection-trial.gd"/m);
 assert.match(runner,/await _run_lesson\("denture_wax_rim"\)/);
 assert.ok(builder.includes("'denture-wax-rim-inspection-trial.gd'"));
});

test('shared guarded replay checks wrong/correct denture picks, reference picks, chair rejection, finish and clean restart',()=>{
 for(const fragment of [
  'BENCH_CATALOG.DENTURE_VS_WAX_RIM if lesson_id == "denture_wax_rim"',
  '"KL_OPEN_DENTURE_WAX_RIM_BENCH" if lesson_id == "denture_wax_rim"',
  'KL_BENCH_ROTATE_LEFT_tool_complete_denture_arch',
  'KL_BENCH_ROTATE_RIGHT_tool_wax_occlusion_rim_study',
  'wrong_tool = "tool.wax_occlusion_rim_study"',
  'wrong_material = "material.wax_rim_jaw_relation_key"',
  'KL_BENCH_PICK_tool_wax_occlusion_rim_study" if lesson_id == "denture_wax_rim"',
  'KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "denture_wax_rim"',
  'KL_BENCH_PICK_material_wax_rim_jaw_relation_key" if lesson_id == "denture_wax_rim"',
  'material_finished_denture_posterior_key" if lesson_id == "denture_wax_rim"',
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
 ]) assert.ok(replay.includes(fragment),'replay guard missing '+fragment);
 assert.match(replay,/"full_denture", "denture_wax_rim", "partial_denture"/);
 assert.match(replay,/str\(retries\[kind \+ "_choice"\]\["selected_id"\]\) !=/);
});

test('existing 19 original bench tools and isolated learner journal remain protected',()=>{
 assert.equal(countOriginalBenchToolEntries(catalog),19);
 assert.match(shared,/_event\("bench", kind \+ "_choice", id, expected, "correct" if accepted else "retry"/);
 assert.match(shared,/practice_requested.emit\(_lesson\["scenario"\]\)/);
 assert.match(shared,/"selected_id": selected, "expected_id": expected/);
 assert.match(shared,/_choices.clear\(\)/);
 assert.match(shared,/_chair_attempts.clear\(\)/);
 assert.doesNotMatch(shared,/user:\/\/kliniklab-native-progress-v2\.json/);
});
