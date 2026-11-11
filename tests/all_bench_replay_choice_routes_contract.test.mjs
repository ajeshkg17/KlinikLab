import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract} from './source-contract-text.mjs';

const get = path => readSourceContract('../' + path, import.meta.url);
const catalog = get('native-godot/chairside-catalog.gd');
const replay = get('native-godot/composite-inspection-trial.gd');

// This intentionally accepts only the tiny, source-used subset of GDScript
// conditional expressions. Unknown syntax fails closed instead of producing
// a false green route. It does not execute Godot or claim a gameplay result.
function selectForCase(expression, scenario) {
  const branches = expression.split(' else ');
  assert.ok(branches.length > 1, 'conditional chain absent');
  let selected;
  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    if (i === branches.length - 1) {
      const fallback = branch.match(/^"([^"]+)"$/);
      assert.ok(fallback, 'malformed fallback: ' + branch);
      if (selected === undefined) selected = fallback[1];
      continue;
    }
    const matched = branch.match(
      /^"([^"]+)" if lesson_id (?:== "([^"]+)"|in \[([^\]]+)\])$/
    );
    assert.ok(matched, 'unsupported condition: ' + branch);
    if (matched[3] !== undefined) {
      assert.match(matched[3], /^"[a-z_][a-z_0-9]*"(?:, "[a-z_][a-z_0-9]*")*$/,
        'malformed case list: ' + branch);
    }
    const cases = matched[2] ? [matched[2]]
      : [...matched[3].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    assert.ok(cases.length > 0, 'empty case condition');
    if (selected === undefined && cases.includes(scenario)) selected = matched[1];
  }
  return selected;
}

function capture(pattern, label) {
  const match = replay.match(pattern);
  assert.ok(match, 'missing replay route: ' + label);
  return match[1];
}

const expressions = {
  wrongTool: capture(/^\tvar wrong_tool := (.+)$/m, 'wrong tool record'),
  wrongMaterial: capture(/^\tvar wrong_material := (.+)$/m, 'wrong material record'),
  wrongToolClick: capture(
    /^\tif not await _click\(bench, (.+)\):\s*\n\t\treturn \{\}\s*\n\tif bench\.call\("summary"\)\["selection_score"\] != 0:/m,
    'wrong tool click'
  ),
  rightToolClick: capture(
    /^\tif not await _click\(bench, (.+)\):\s*\n\t\treturn \{\}\s*\n\tif not await _click\(bench, "KL_BENCH_PICK_material_/m,
    'right tool click'
  ),
  wrongMaterialClick: capture(
    /^\tif not await _click\(bench, (.+)\):\s*\n\t\treturn \{\}\s*\n\tif bench\.call\("summary"\)\["selection_score"\] != 1:/m,
    'wrong material click'
  ),
  correctMaterial: capture(/^\tvar correct_material := (.+)$/m, 'correct material record')
};

test('all 20 benches replay the catalog-selected right and wrong IDs in six routes each', () => {
  const lessons = [...catalog.matchAll(/^const ([A-Z_]+) := \{([\s\S]*?)^\}/gm)]
    .filter(([, name]) => name !== 'ITEMS');
  assert.equal(lessons.length, 20);
  const uniqueScenarios = new Set();
  for (const [, constant, body] of lessons) {
    const scenario = body.match(/^\t"scenario": "([^"]+)"/m)?.[1];
    assert.ok(scenario, 'missing scenario: ' + constant);
    assert.ok(!uniqueScenarios.has(scenario), 'duplicate scenario: ' + scenario);
    uniqueScenarios.add(scenario);

    const steps = {};
    for (const [, kind, section] of body.matchAll(
      /^\t"(tool|material)": \{([\s\S]*?)^\t\},/gm
    )) {
      const choiceList = section.match(/"choices": \[([^\]]+)\]/)?.[1];
      const expected = section.match(/"expected": "([^"]+)"/)?.[1];
      assert.ok(choiceList && expected, 'missing catalog selection: ' + scenario);
      const choices = [...choiceList.matchAll(/"([^"]+)"/g)].map(x => x[1]);
      assert.equal(choices.length, 2, 'exactly two choices: ' + scenario);
      assert.ok(choices.includes(expected), 'expected choice absent: ' + scenario);
      steps[kind] = {expected, distractor: choices.find(x => x !== expected)};
      assert.ok(steps[kind].distractor, 'distractor missing: ' + scenario);
    }
    assert.ok(steps.tool && steps.material, 'tool/material missing: ' + scenario);

    const clickId = id => 'KL_BENCH_PICK_' + id.replaceAll('.', '_');
    const expected = {
      wrongTool: steps.tool.distractor,
      wrongMaterial: steps.material.distractor,
      wrongToolClick: clickId(steps.tool.distractor),
      rightToolClick: clickId(steps.tool.expected),
      wrongMaterialClick: clickId(steps.material.distractor),
      correctMaterial: steps.material.expected.replaceAll('.', '_')
    };
    for (const [route, id] of Object.entries(expected)) {
      assert.equal(selectForCase(expressions[route], scenario), id,
        'replay/catalog mismatch: ' + scenario + ' · ' + route);
    }
  }
  assert.equal(uniqueScenarios.size, 20);
  assert.match(replay, /_click\(bench, "KL_BENCH_PICK_" \+ correct_material\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["selected_id"\]\)/);
  assert.match(replay, /str\(retries\[kind \+ "_choice"\]\["expected_id"\]\)/);
});


test('route parser accepts valid matches and rejects malformed late or list clauses', () => {
  assert.equal(selectForCase('"A" if lesson_id == "composite" else "B"', 'composite'), 'A');
  assert.equal(selectForCase('"A" if lesson_id == "composite" else "B"', 'sealant'), 'B');
  assert.equal(selectForCase('"A" if lesson_id in ["composite", "sealant"] else "B"', 'sealant'), 'A');
  assert.throws(() =>
    selectForCase('"A" if lesson_id in ["composite", INVALID] else "B"', 'composite'),
    /malformed case list/
  );
  assert.throws(() =>
    selectForCase('"A" if lesson_id == "composite" else "X" if lesson_id != "sealant" else "B"', 'composite'),
    /unsupported condition/
  );
  assert.throws(() =>
    selectForCase('"A" if lesson_id == "composite" else NO_FALLBACK', 'composite'),
    /malformed fallback/
  );
});
