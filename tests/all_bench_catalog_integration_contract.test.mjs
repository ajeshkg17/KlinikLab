import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const read = path => readSourceContract('../' + path, import.meta.url);
const catalog = read('native-godot/chairside-catalog.gd');
const app = read('native-godot/app.gd');
const builder = read('native-godot/build-app.mjs');
const drills = read('native-godot/procedure-drills.gd');
const replay = read('native-godot/composite-inspection-trial.gd');
const scenarios = [
  'composite','sealant','fluoride','cleaning','root_planing',
  'chart','bitewing','oral_exam','veneer','inlay',
  'crown','bridge','full_denture','partial_denture','implant',
  'endo','retreat','aligner','mouthguard','extraction'
];
const lessons = [...catalog.matchAll(/^const ([A-Z_]+) := \{([\s\S]*?)^\}/gm)]
  .filter(([, name]) => name !== 'ITEMS');
const itemSource = catalog.split(/^const COMPOSITE := \{/m)[0];
const itemNames = [...itemSource.matchAll(/^\t"((?:tool|material)\.[^"]+)": \{/gm)].map(x => x[1]);

test('all and only twenty existing chair scenarios have distinct stable lesson and finish ids', () => {
  assert.equal(lessons.length, 20);
  assert.deepEqual(lessons.map(x => x[2].match(/^\t"scenario": "([^"]+)"/m)?.[1]), scenarios);
  const ids = lessons.map(x => x[2].match(/^\t"id": "([^"]+)"/m)?.[1]);
  const finish = lessons.map(x => x[2].match(/^\t"finish_event": "([^"]+)"/m)?.[1]);
  assert.ok(ids.every(x => typeof x === 'string' && x.endsWith('_intro')));
  assert.ok(finish.every(x => typeof x === 'string' && x.length > 0));
  assert.equal(new Set(ids).size, 20, 'duplicate lesson identity');
  assert.equal(new Set(finish).size, 20, 'duplicate finish event');
  assert.equal((drills.match(/^\s*\["[a-z_]+",/gm) || []).length, 20);
  for (const scenario of scenarios) {
    assert.ok(drills.includes('["' + scenario + '",'), 'drill missing: ' + scenario);
    assert.ok(replay.includes('"' + scenario + '"'), 'replay route missing: ' + scenario);
  }
});

test('all twenty tools and case-specific reference choices resolve to shared item keys', () => {
  assert.equal(itemNames.length, 41);
  assert.equal(new Set(itemNames).size, 41, 'duplicate item key');
  const keys = new Set(itemNames);
  for (const [name, , lesson] of lessons) {
    const steps = [...lesson.matchAll(/^\t"(tool|material)": \{([\s\S]*?)^\t\},/gm)];
    assert.equal(steps.length, 2, 'missing tool/material step: ' + name);
    for (const [, kind, body] of steps) {
      const choiceString = body.match(/"choices": \[([^\]]+)\]/)?.[1];
      assert.ok(choiceString, 'missing choices: ' + name);
      const choices = [...choiceString.matchAll(/"([^"]+)"/g)].map(x => x[1]);
      const expected = body.match(/"expected": "([^"]+)"/)?.[1];
      assert.equal(choices.length, 2, 'two options required: ' + name);
      assert.equal(new Set(choices).size, 2, 'distractor repeats correct item: ' + name);
      assert.ok(choices.includes(expected), 'expected choice is absent: ' + name);
      for (const id of choices) {
        assert.ok(id.startsWith(kind + '.'), 'wrong category: ' + id);
        assert.ok(keys.has(id), 'missing catalog item: ' + id);
      }
    }
  }
});

test('all original synthetic 3D scenes exist and are packed; the two CC0 GLBs stay source pinned', () => {
  const tools = [...itemSource.matchAll(/^\t"(tool\.[^"]+)": \{([\s\S]*?)^\t\},/gm)];
  assert.equal(tools.length, 19);
  let synthetic = 0, convertedGlb = 0;
  for (const [, id, body] of tools) {
    const filename = body.match(/"scene": "res:\/\/assets\/bench\/([^"]+)"/)?.[1];
    assert.ok(filename, 'missing scene path: ' + id);
    if (filename.endsWith('.tscn')) {
      synthetic++;
      const scene = read('native-godot/assets/bench/' + filename);
      assert.match(scene, /^\[node name="[^"]+" type="Node3D"\]/m, 'missing model root: ' + id);
      assert.ok(builder.includes("copy('native-godot/assets/bench/" + filename +
        "','assets/bench/" + filename + "')"), 'not packaged: ' + filename);
    } else {
      convertedGlb++;
      assert.ok(['curing-light.glb','ultrasonic-scaler.glb'].includes(filename), 'unknown GLB: ' + id);
      assert.ok(builder.includes("['" + filename + "'"), 'unlisted GLB: ' + filename);
    }
  }
  assert.equal(synthetic, 17);
  assert.equal(convertedGlb, 2);
  assert.match(builder, /Bench model provenance mismatch/);
  assert.match(builder, /Bench model does not match the catalogued source/);
});

test('all twenty Journey and trial entries are packed and shared replay enforces evidence guards', () => {
  for (const [, constant, lesson] of lessons) {
    const scenario = lesson.match(/^\t"scenario": "([^"]+)"/m)?.[1];
    assert.ok(app.includes('KL_OPEN_' + constant + '_BENCH'), 'Journey opener absent: ' + scenario);
    const stem = scenario === 'extraction' ? 'extraction-bench' : scenario.replaceAll('_','-');
    const trialName = stem + '-inspection-trial.gd';
    assert.ok(builder.includes("'" + trialName + "'"), 'trial not packaged: ' + trialName);
    const trial = read('native-godot/' + trialName);
    if (scenario !== 'composite') {
      assert.match(trial, /^extends "res:\/\/composite-inspection-trial.gd"/m);
      assert.ok(trial.includes('_run_lesson("' + scenario + '")'), 'bad trial entry: ' + scenario);
    }
  }
  assert.match(replay, /journal != FileAccess\.get_file_as_bytes\(JOURNAL\)/);
  assert.match(replay, /not user_data\.begins_with\(profile\)/);
  assert.match(replay, /Bench replay selected\/expected ID mismatch/);
  assert.match(replay, /if not retries\.has_all\(\["tool_choice", "material_choice", "chair"\]\)/);
  assert.match(replay, /if restarted\["selection_score"\] != 0/);
});
