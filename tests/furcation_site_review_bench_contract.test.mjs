import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const read=path=>readSourceContract('../'+path,import.meta.url);
const catalog=read('native-godot/chairside-catalog.gd');
const app=read('native-godot/app.gd');
const bench=read('native-godot/chairside-bench.gd');
const builder=read('native-godot/build-app.mjs');
const trial=read('native-godot/composite-inspection-trial.gd');
const runner=read('native-godot/furcation-inspection-trial.gd');
const scenario=read('native-godot/procedure-scenarios.gd');
const drills=read('native-godot/procedure-drills.gd');
const nabers=read('native-godot/assets/inventory/synthetic-nabers-furcation-probe.tscn');
const unc15=read('native-godot/assets/inventory/synthetic-unc15-periodontal-probe.tscn');

test('new furcation landmark lesson is a distinct bench sharing an unchanged periodontal chart chair',()=>{
 assert.match(catalog,/const FURCATION := \{/);
 assert.match(catalog,/"id": "furcation_model_landmark_review_intro"/);
 assert.match(catalog,/"scenario": "chart"/);
 assert.match(catalog,/"title": "Furcation probe and model-site recording bench"/);
 assert.match(catalog,/"finish_event": "record_furcation_model_reference_locations"/);
 assert.match(catalog,/The existing chair is NOT a furcation anatomy model|That chair is NOT a furcation anatomy model/);
 assert.match(catalog,/No actual furcation anatomy, grade, pocket depth, probing force, diagnosis or treatment outcome was evaluated/);
 assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
 assert.equal((drills.match(/^\s*\["[a-z_]+",/gm)||[]).length,20);
 assert.equal(Object.keys(scenario.match(/"chart": \["arch", "Probe", \["Record left site", "Record right site"\], "mark"\]/)||{}).length>0,true);
 assert.match(scenario,/"chart": \["arch", "Probe", \["Record left site", "Record right site"\], "mark"\]/);
});

test('two existing separately rotatable 3D probes and instructor site key make a real choice with plausible distractors',()=>{
 for(const [key,scene] of [
  ['tool.nabers_furcation_study','synthetic-nabers-furcation-probe.tscn'],
  ['tool.unc15_furcation_distractor','synthetic-unc15-periodontal-probe.tscn']]){
   assert.match(catalog,new RegExp('"'+key.replaceAll('.','\\.')+'": \\{'));
   assert.ok(catalog.includes('"scene": "res://assets/inventory/'+scene+'"'));
   assert.ok(builder.includes('"'+scene+'"'),'native builder already packages '+scene);
 }
 assert.match(nabers,/CurvedNabersFurcationWorkingEnd0/);
 assert.match(unc15,/UNC15GraduatedMeasuringBlade/);
 assert.match(catalog,/"choices": \["tool.nabers_furcation_study", "tool.unc15_furcation_distractor"\]/);
 assert.match(catalog,/"expected": "tool.nabers_furcation_study"/);
 assert.match(catalog,/"choices": \["material.assigned_furcation_locator", "material.site_chart"\]/);
 assert.match(catalog,/"expected": "material.assigned_furcation_locator"/);
 assert.match(catalog,/"label": "site locator key"/);
 assert.match(catalog,/material\.assigned_furcation_locator/);
 assert.match(catalog,/"swatch": Color\("#a6d5ce"\)/);
});

test('Journey opens a distinct furcation bench and replay without a new chair drill',()=>{
 assert.match(app,/\["furcation", "Open furcation site-recording bench", "KL_OPEN_FURCATION_BENCH"\]/);
 assert.match(app,/\["Run furcation model-site bench replay", "furcation_bench"\]/);
 assert.match(app,/elif mode == "furcation_bench":\s*\n\t\ttrial_script = "res:\/\/furcation-inspection-trial.gd"/);
 assert.match(app,/lesson_id not in \["composite".*"furcation".*"extraction"\]/);
 assert.match(app,/CHAIRSIDE_CATALOG\.FURCATION if lesson_id == "furcation"/);
 assert.match(app,/str\(_chairside_bench\.get\("_lesson"\)\["scenario"\]\) != scenario/);
 assert.match(runner,/extends "res:\/\/composite-inspection-trial.gd"/);
 assert.match(runner,/await _run_lesson\("furcation"\)/);
 assert.match(builder,/'furcation-inspection-trial\.gd'/);
});

test('guarded replay verifies rejection, corrected picks, unchanged chart chair, case finish and reset',()=>{
 assert.match(trial,/lesson_id not in \["composite".*"furcation".*"extraction"\]/);
 assert.match(trial,/BENCH_CATALOG\.FURCATION if lesson_id == "furcation"/);
 assert.match(trial,/"KL_OPEN_FURCATION_BENCH" if lesson_id == "furcation"/);
 assert.match(trial,/KL_BENCH_ROTATE_LEFT_tool_nabers_furcation_study/);
 assert.match(trial,/KL_BENCH_ROTATE_RIGHT_tool_unc15_furcation_distractor/);
 assert.match(trial,/wrong_tool = "tool.unc15_furcation_distractor"/);
 assert.match(trial,/wrong_material = "material.site_chart"/);
 assert.match(trial,/KL_BENCH_PICK_tool_unc15_furcation_distractor" if lesson_id == "furcation"/);
 assert.match(trial,/KL_BENCH_PICK_tool_nabers_furcation_study" if lesson_id == "furcation"/);
 assert.match(trial,/var correct_material := "material_assigned_furcation_locator" if lesson_id == "furcation"/);
 assert.match(trial,/str\(lab\.get\("scenario"\)\["id"\]\) != str\(config\["scenario"\]\)/);
 assert.match(trial,/report\.get\("scenario"\) != config\["scenario"\]/);
 assert.match(trial,/chair_ref\.uri != config\["reference"\]/);
 assert.match(trial,/not retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
 assert.match(trial,/not seen_correct\.has_all\(\["tool_choice", "material_choice"\]\)/);
 assert.match(trial,/event\["event"\] == config\["finish_event"\]/);
 assert.match(trial,/retries\["chair"\]\["selected_id"\].*retries\["chair"\]\["expected_id"\]/);
 assert.match(trial,/KL_BENCH_RESET/);
 assert.match(trial,/restarted\["selection_score"\] != 0/);
 assert.match(trial,/journal_existed != FileAccess\.file_exists\(JOURNAL\) or journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
});

test('shared bench preserves rejection/finish audit IDs and the learner journal is not written',()=>{
 assert.match(bench,/_choices\[kind\] = id/);
 assert.match(bench,/_event\("bench", kind \+ "_choice", id, expected, "correct" if accepted else "retry"/);
 assert.match(bench,/practice_requested\.emit\(_lesson\["scenario"\]\)/);
 assert.match(bench,/_chair_attempts\.append\(/);
 assert.match(bench,/_event\("bench", str\(_lesson\.get\("finish_event", "simulate_cure"\)\)/);
 assert.match(bench,/"selected_id": selected, "expected_id": expected/);
 assert.match(bench,/"model[s]?_loaded": _model_import_ok/);
 assert.doesNotMatch(bench,/user:\/\/kliniklab-native-progress-v2\.json/);
});
