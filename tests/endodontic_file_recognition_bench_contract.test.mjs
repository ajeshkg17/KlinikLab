import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract, countOriginalBenchToolEntries} from './source-contract-text.mjs';

const source=path=>readSourceContract('../'+path,import.meta.url);
const catalog=source('native-godot/chairside-catalog.gd');
const app=source('native-godot/app.gd');
const replay=source('native-godot/composite-inspection-trial.gd');
const shared=source('native-godot/chairside-bench.gd');
const build=source('native-godot/build-app.mjs');
const drills=source('native-godot/procedure-drills.gd');
const scenario=source('native-godot/procedure-scenarios.gd');
const runner=source('native-godot/endo-file-inspection-trial.gd');
const hand=source('native-godot/assets/inventory/synthetic-hedstrom-h-file.tscn');
const rotary=source('native-godot/assets/inventory/synthetic-niti-rotary-file.tscn');

test('one separate manual H-file recognition lesson reuses the original root canal diagram chair',()=>{
 assert.match(catalog,/^const ENDO_FILE := \{/m);
 assert.match(catalog,/"id": "endo_manual_file_canal_reference_intro"/);
 assert.match(catalog,/"scenario": "endo"/);
 assert.match(catalog,/"finish_event": "record_manual_h_file_canal_reference_review"/);
 assert.match(catalog,/The chair uses a virtual diagram annotation pointer, NOT an H-file inserted into root anatomy/);
 assert.match(catalog,/No real root-canal instrumentation, diagnosis, working length/);
 assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
 assert.match(catalog,/^const FURCATION := \{/m);
 assert.match(catalog,/^const BITEWING_HOLDER := \{/m);
 assert.equal((drills.match(/^\s*\["[a-z_]+",/gm)||[]).length,20);
 assert.match(scenario,/"endo": \["canal", "Canal tracing instrument", \["Trace the chamber", "Trace the assigned canal"\], "mark"\]/);
});

test('two original independent 3D instrument families and two reference cards provide real distractor choices',()=>{
 const keys=['tool.hand_h_file_recognition','tool.niti_rotary_file_alternative',
  'material.manual_file_canal_reference','material.rotary_file_reference_alternative'];
 for(const id of keys)assert.ok(catalog.includes('"'+id+'": {'),'catalog choice '+id);
 assert.match(catalog,/"choices": \["tool.hand_h_file_recognition", "tool.niti_rotary_file_alternative"\]/);
 assert.match(catalog,/"expected": "tool.hand_h_file_recognition"/);
 assert.match(catalog,/"choices": \["material.manual_file_canal_reference", "material.rotary_file_reference_alternative"\]/);
 assert.match(catalog,/"expected": "material.manual_file_canal_reference"/);
 assert.match(catalog,/"label": "instructor canal reference key"/);
 assert.match(catalog,/"swatch": Color\("#c7c3e3"\)/);
 assert.match(catalog,/"swatch": Color\("#afd4cf"\)/);
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-hedstrom-h-file.tscn"'));
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-niti-rotary-file.tscn"'));
 assert.match(hand,/^\[node name="SchematicHedstromHandFile" type="Node3D"\]/m);
 assert.match(rotary,/^\[node name="SchematicNickelTitaniumRotaryFile" type="Node3D"\]/m);
 for(const [file,contents] of [['synthetic-hedstrom-h-file.tscn',hand],['synthetic-niti-rotary-file.tscn',rotary]]){
  assert.ok((contents.match(/type="MeshInstance3D"/g)||[]).length>=12,file+' geometry');
  assert.ok(build.includes('"'+file+'"'),file+' already packaged');
 }
});

test('Journey lesson and dedicated replay route bind to the existing endo chair',()=>{
 assert.match(app,/\["endo_file", "Open H-file recognition and canal diagram bench", "KL_OPEN_ENDO_FILE_BENCH"\]/);
 assert.match(app,/\["Run H-file recognition bench replay", "endo_file_bench"\]/);
 assert.match(app,/elif mode == "endo_file_bench":\s*\n\t\ttrial_script = "res:\/\/endo-file-inspection-trial.gd"/);
 assert.match(app,/CHAIRSIDE_CATALOG.ENDO_FILE if lesson_id == "endo_file"/);
 assert.match(app,/str\(_chairside_bench\.get\("_lesson"\)\["scenario"\]\) != scenario/);
 assert.match(runner,/^extends "res:\/\/composite-inspection-trial.gd"/m);
 assert.match(runner,/await _run_lesson\("endo_file"\)/);
 assert.ok(build.includes("'endo-file-inspection-trial.gd'"));
});

test('replay preserves distinctive IDs, wrong and right choices, chair rejection, finish event and clean restart',()=>{
 for(const fragment of [
  'BENCH_CATALOG.ENDO_FILE if lesson_id == "endo_file"',
  '"KL_OPEN_ENDO_FILE_BENCH" if lesson_id == "endo_file"',
  'KL_BENCH_ROTATE_LEFT_tool_hand_h_file_recognition',
  'KL_BENCH_ROTATE_RIGHT_tool_niti_rotary_file_alternative',
  'wrong_tool = "tool.niti_rotary_file_alternative"',
  'wrong_material = "material.rotary_file_reference_alternative"',
  'KL_BENCH_PICK_tool_niti_rotary_file_alternative" if lesson_id == "endo_file"',
  'KL_BENCH_PICK_tool_hand_h_file_recognition" if lesson_id == "endo_file"',
  'KL_BENCH_PICK_material_rotary_file_reference_alternative" if lesson_id == "endo_file"',
  'material_manual_file_canal_reference" if lesson_id == "endo_file"',
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
 ])assert.ok(replay.includes(fragment),'missing guarded replay check '+fragment);
 assert.match(replay,/"endo", "endo_file", "retreat"/);
 assert.match(replay,/str\(retries\[kind \+ "_choice"\]\["selected_id"\]\) !=/);
});

test('original model IDs, journal isolation and 20 procedure drills remain unchanged',()=>{
 assert.equal(countOriginalBenchToolEntries(catalog),19);
 assert.match(shared,/_event\("bench", kind \+ "_choice", id, expected, "correct" if accepted else "retry"/);
 assert.match(shared,/practice_requested.emit\(_lesson\["scenario"\]\)/);
 assert.match(shared,/"selected_id": selected, "expected_id": expected/);
 assert.match(shared,/_choices.clear\(\)/);
 assert.match(shared,/_chair_attempts.clear\(\)/);
 assert.doesNotMatch(shared,/user:\/\/kliniklab-native-progress-v2\.json/);
});
