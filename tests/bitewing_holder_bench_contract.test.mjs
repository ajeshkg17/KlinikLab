import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read = p => readSourceContract('../'+p, import.meta.url);
const catalog = read('native-godot/chairside-catalog.gd');
const app = read('native-godot/app.gd');
const shared = read('native-godot/chairside-bench.gd');
const builder = read('native-godot/build-app.mjs');
const replay = read('native-godot/composite-inspection-trial.gd');
const runner = read('native-godot/bitewing-holder-inspection-trial.gd');
const scenario = read('native-godot/procedure-scenarios.gd');
const drills = read('native-godot/procedure-drills.gd');
const holder = read('native-godot/assets/inventory/synthetic-bitewing-receptor-holder.tscn');
const alternative = read('native-godot/assets/inventory/synthetic-endo-radiograph-holder.tscn');

test('one additional bitewing receptor bench reuses existing bitewing chair and retains 20 original lessons', () => {
 assert.match(catalog,/const BITEWING_HOLDER := \{/);
 assert.match(catalog,/"id": "bitewing_receptor_holder_reference_intro"/);
 assert.match(catalog,/"scenario": "bitewing"/);
 assert.match(catalog,/"finish_event": "record_bitewing_holder_and_image_reference"/);
 assert.match(catalog,/There is no actual X-ray image, sensor placement, radiation exposure/);
 assert.match(catalog,/No real radiographic placement, exposure, diagnostic interpretation or patient treatment was performed/);
 assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
 assert.match(catalog,/const FURCATION := \{/);
 assert.equal((drills.match(/^\s*\["[a-z_]+",/gm)||[]).length,20);
 assert.match(scenario,/"bitewing": \["image", "Image pointer", \["Identify proximal surfaces", "Flag overlap"\], "mark"\]/);
});

test('two real preexisting, distinct rotating 3D study-holder scenes and record choices resolve',()=>{
 assert.match(catalog,/"choices": \["tool.bitewing_receptor_holder_study", "tool.endo_receptor_holder_study"\]/);
 assert.match(catalog,/"expected": "tool.bitewing_receptor_holder_study"/);
 assert.match(catalog,/"choices": \["material.bitewing_receptor_reference_key", "material.endodontic_apical_reference_key"\]/);
 assert.match(catalog,/"expected": "material.bitewing_receptor_reference_key"/);
 assert.match(catalog,/"label": "assigned image location key"/);
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-bitewing-receptor-holder.tscn"'));
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-endo-radiograph-holder.tscn"'));
 assert.match(holder,/^\[node name="SchematicBitewingSensorPositioner" type="Node3D"\]/m);
 assert.match(alternative,/^\[node name="SchematicEndodonticImagingHolder" type="Node3D"\]/m);
 assert.ok((holder.match(/type="MeshInstance3D"/g)||[]).length>=8);
 assert.ok((alternative.match(/type="MeshInstance3D"/g)||[]).length>=8);
 for(const filename of ['synthetic-bitewing-receptor-holder.tscn','synthetic-endo-radiograph-holder.tscn'])
  assert.ok(builder.includes('"'+filename+'"'),'already-shipped local inventory source '+filename);
 assert.match(catalog,/"swatch": Color\("#b7dbe9"\)/);
 assert.match(catalog,/"swatch": Color\("#e6c9a7"\)/);
});

test('new Journey and dedicated replay routes are packaged without adding a 21st chair scenario',()=>{
 assert.match(app,/\["bitewing_holder", "Open bitewing receptor selection bench", "KL_OPEN_BITEWING_HOLDER_BENCH"\]/);
 assert.match(app,/\["Run bitewing receptor selection bench replay", "bitewing_holder_bench"\]/);
 assert.match(app,/elif mode == "bitewing_holder_bench":\s*\n\t\ttrial_script = "res:\/\/bitewing-holder-inspection-trial.gd"/);
 assert.match(app,/CHAIRSIDE_CATALOG.BITEWING_HOLDER if lesson_id == "bitewing_holder"/);
 assert.match(app,/str\(_chairside_bench\.get\("_lesson"\)\["scenario"\]\) != scenario/);
 assert.match(runner,/^extends "res:\/\/composite-inspection-trial.gd"/m);
 assert.match(runner,/await _run_lesson\("bitewing_holder"\)/);
 assert.ok(builder.includes("'bitewing-holder-inspection-trial.gd'"));
});

test('guarded replay logs wrong and correct holder/key choices, chair rejection, finish and reset',()=>{
 for(const s of [
  'BENCH_CATALOG.BITEWING_HOLDER if lesson_id == "bitewing_holder"',
  '"KL_OPEN_BITEWING_HOLDER_BENCH" if lesson_id == "bitewing_holder"',
  'KL_BENCH_ROTATE_LEFT_tool_bitewing_receptor_holder_study',
  'KL_BENCH_ROTATE_RIGHT_tool_endo_receptor_holder_study',
  'wrong_tool = "tool.endo_receptor_holder_study"',
  'wrong_material = "material.endodontic_apical_reference_key"',
  'KL_BENCH_PICK_tool_endo_receptor_holder_study" if lesson_id == "bitewing_holder"',
  'KL_BENCH_PICK_tool_bitewing_receptor_holder_study" if lesson_id == "bitewing_holder"',
  'KL_BENCH_PICK_material_endodontic_apical_reference_key" if lesson_id == "bitewing_holder"',
  'material_bitewing_receptor_reference_key" if lesson_id == "bitewing_holder"',
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
 ]) assert.ok(replay.includes(s), 'guarded replay fragment missing: '+s);
 assert.match(replay,/"bitewing_holder", "oral_exam"/);
 assert.match(replay,/str\(retries\[kind \+ "_choice"\]\["selected_id"\]\) !=/);
});

test('original 20 chair procedures and 19 core model IDs remain; only isolated lesson report is written',()=>{
 assert.equal(countOriginalBenchToolEntries(catalog),19);
 assert.match(shared,/_event\("bench", kind \+ "_choice", id, expected, "correct" if accepted else "retry"/);
 assert.match(shared,/practice_requested.emit\(_lesson\["scenario"\]\)/);
 assert.match(shared,/"selected_id": selected, "expected_id": expected/);
 assert.match(shared,/_event\("bench", str\(_lesson.get\("finish_event", "simulate_cure"\)\)/);
 assert.match(shared,/_choices.clear\(\)/);
 assert.match(shared,/_chair_attempts.clear\(\)/);
 assert.doesNotMatch(shared,/user:\/\/kliniklab-native-progress-v2\.json/);
});
