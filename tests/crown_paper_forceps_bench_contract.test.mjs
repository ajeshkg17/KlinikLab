import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read=path=>readSourceContract('../'+path,import.meta.url);
const catalog=read('native-godot/chairside-catalog.gd');
const app=read('native-godot/app.gd');
const replay=read('native-godot/composite-inspection-trial.gd');
const shared=read('native-godot/chairside-bench.gd');
const builder=read('native-godot/build-app.mjs');
const drills=read('native-godot/procedure-drills.gd');
const scenarios=read('native-godot/procedure-scenarios.gd');
const runner=read('native-godot/crown-paper-forceps-inspection-trial.gd');
const paperForceps=read('native-godot/assets/inventory/synthetic-articulating-paper-forceps.tscn');
const cottonPliers=read('native-godot/assets/inventory/synthetic-college-pliers.tscn');

test('one distinct crown paper forceps lesson uses unchanged crown diagram chair',()=>{
 assert.match(catalog,/^const CROWN_PAPER_FORCEPS := \{/m);
 assert.match(catalog,/"id": "crown_articulating_paper_forceps_recognition_intro"/);
 assert.match(catalog,/"scenario": "crown"/);
 assert.match(catalog,/"finish_event": "record_crown_paper_forceps_recognition"/);
 assert.match(catalog,/chair does NOT perform articulating-paper placement, occlusal contact mapping/);
 assert.match(catalog,/No actual articulating paper placement, occlusal contact, adjustment/);
 assert.equal((catalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
 for(const prior of ['FURCATION','BITEWING_HOLDER','ENDO_FILE','DENTURE_VS_WAX_RIM','MATRIX_FORCEPS'])
  assert.match(catalog,new RegExp('^const '+prior+' := \\{','m'));
 assert.equal((drills.match(/^\s*\["[a-z_]+",/gm)||[]).length,20);
 assert.ok(scenarios.includes('"crown": ["crown", "Crown", ["Seat on the prepared model", "Check the margin landmark"], "seat"]'));
});

test('two pre-existing rotatable 3D forceps and two distinct instructor cards are appropriately identified',()=>{
 for(const id of ['tool.articulating_paper_forceps_study','tool.college_cotton_pliers_alternative',
    'material.crown_articulating_forceps_reference','material.cotton_isolation_reference_alternative'])
  assert.ok(catalog.includes('"'+id+'": {'),'missing catalog id '+id);
 assert.match(catalog,/"choices": \["tool.articulating_paper_forceps_study", "tool.college_cotton_pliers_alternative"\]/);
 assert.match(catalog,/"expected": "tool.articulating_paper_forceps_study"/);
 assert.match(catalog,/"choices": \["material.crown_articulating_forceps_reference", "material.cotton_isolation_reference_alternative"\]/);
 assert.match(catalog,/"expected": "material.crown_articulating_forceps_reference"/);
 assert.match(catalog,/"label": "assigned crown model reference key"/);
 assert.match(catalog,/"swatch": Color\("#afd7d4"\)/);
 assert.match(catalog,/"swatch": Color\("#e7c7a3"\)/);
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-articulating-paper-forceps.tscn"'));
 assert.ok(catalog.includes('"scene": "res://assets/inventory/synthetic-college-pliers.tscn"'));
 assert.match(paperForceps,/^\[node name="SchematicMillerArticulatingPaperForceps" type="Node3D"\]/m);
 assert.match(cottonPliers,/^\[node name="SyntheticCollegeCottonPliersSchematic" type="Node3D"\]/m);
 for(const [file,scene] of [
   ['synthetic-articulating-paper-forceps.tscn',paperForceps],
   ['synthetic-college-pliers.tscn',cottonPliers]
 ]){
  assert.ok((scene.match(/type="MeshInstance3D"/g)||[]).length>=10,'source 3D parts '+file);
  assert.ok(builder.includes(file),'previously packaged local study model '+file);
 }
});

test('Journey and dedicated replay route the additional lesson to existing crown without new procedure',()=>{
 assert.match(app,/\["crown_paper_forceps", "Open crown tray forceps recognition bench", "KL_OPEN_CROWN_PAPER_FORCEPS_BENCH"\]/);
 assert.match(app,/\["Run crown tray forceps recognition bench replay", "crown_paper_forceps_bench"\]/);
 assert.match(app,/elif mode == "crown_paper_forceps_bench":\s*\n\t\ttrial_script = "res:\/\/crown-paper-forceps-inspection-trial.gd"/);
 assert.match(app,/CHAIRSIDE_CATALOG\.CROWN_PAPER_FORCEPS if lesson_id == "crown_paper_forceps"/);
 assert.match(app,/str\(_chairside_bench\.get\("_lesson"\)\["scenario"\]\) != scenario/);
 assert.match(runner,/^extends "res:\/\/composite-inspection-trial.gd"/m);
 assert.match(runner,/await _run_lesson\("crown_paper_forceps"\)/);
 assert.ok(builder.includes("'crown-paper-forceps-inspection-trial.gd'"));
});

test('replay checks tool and key rejection/correction, chair rejection, finish and reset with journal check',()=>{
 for(const part of [
  'BENCH_CATALOG.CROWN_PAPER_FORCEPS if lesson_id == "crown_paper_forceps"',
  '"KL_OPEN_CROWN_PAPER_FORCEPS_BENCH" if lesson_id == "crown_paper_forceps"',
  'KL_BENCH_ROTATE_LEFT_tool_articulating_paper_forceps_study',
  'KL_BENCH_ROTATE_RIGHT_tool_college_cotton_pliers_alternative',
  'wrong_tool = "tool.college_cotton_pliers_alternative"',
  'wrong_material = "material.cotton_isolation_reference_alternative"',
  'KL_BENCH_PICK_tool_college_cotton_pliers_alternative" if lesson_id == "crown_paper_forceps"',
  'KL_BENCH_PICK_tool_articulating_paper_forceps_study" if lesson_id == "crown_paper_forceps"',
  'KL_BENCH_PICK_material_cotton_isolation_reference_alternative" if lesson_id == "crown_paper_forceps"',
  'material_crown_articulating_forceps_reference" if lesson_id == "crown_paper_forceps"',
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
 ]) assert.ok(replay.includes(part),'missing replay assertion '+part);
 assert.match(replay,/"crown", "crown_paper_forceps", "bridge"/);
 assert.match(replay,/str\(retries\[kind \+ "_choice"\]\["selected_id"\]\) !=/);
});

test('original nineteen tools and all original chair scoring remain isolated from extra lesson',()=>{
 assert.equal(countOriginalBenchToolEntries(catalog),19);
 assert.match(shared,/_event\("bench", kind \+ "_choice", id, expected, "correct" if accepted else "retry"/);
 assert.match(shared,/practice_requested.emit\(_lesson\["scenario"\]\)/);
 assert.match(shared,/"selected_id": selected, "expected_id": expected/);
 assert.match(shared,/_choices.clear\(\)/);
 assert.match(shared,/_chair_attempts.clear\(\)/);
 assert.doesNotMatch(shared,/user:\/\/kliniklab-native-progress-v2\.json/);
});
