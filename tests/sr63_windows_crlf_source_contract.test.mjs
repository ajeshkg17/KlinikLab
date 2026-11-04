import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeSourceLineEndings, readSourceContract } from './source-contract-text.mjs';

const original = readFileSync(new URL('../native-godot/app.gd', import.meta.url), 'utf8');
const lfSource = normalizeSourceLineEndings(original);

const strictContracts = [
  ['node exit releases owned pointer', /func _exit_tree\(\) -> void:\n\t_release_walk_mouse\(\)/],
  ['walk stop releases owned pointer', /func _stop_clinic_walk\(\) -> void:\n\t_release_walk_mouse\(\)/],
  ['Escape first releases before stopping', /if _walk_mouse_captured:\n\t{4}_release_walk_mouse\(\)\n\t{3}else:\n\t{4}_stop_clinic_walk\(\)/],
  ['workspace transition releases pointer', /if view != "environment":\n\t\t_release_walk_mouse\(\)/],
  ['quiz-first retains the question ahead of case notes', /if quiz_first:\n\t{3}_show_station\(\)/],
];

test('SR63 reproduces the SR61 LF-only Windows failure without guessing owner-PC output', () => {
  const crlfSource = lfSource.replace(/\n/g, '\r\n');
  assert.ok(crlfSource.includes('\r\n'), 'fixture MUST really contain CRLF');
  assert.notEqual(lfSource, crlfSource);
  for (const [name, re] of strictContracts) {
    assert.match(lfSource, re, name + ': original LF contract');
    assert.doesNotMatch(crlfSource, re, name + ': raw CRLF reproduces old false failure');
  }
  assert.equal(normalizeSourceLineEndings(crlfSource), lfSource);
  assert.equal(normalizeSourceLineEndings('keep  \r\n\tindent\r\n'), 'keep  \n\tindent\n',
    'only CRLF changes; indentation and trailing spaces are preserved');
});

test('SR63 file reader checks LF and CRLF disk files with identical strict contracts', () => {
  const temp = mkdtempSync(join(tmpdir(), 'kliniklab-sr63-contract-'));
  try {
    const base = pathToFileURL(temp + sep);
    writeFileSync(join(temp, 'source-lf.gd'), lfSource, 'utf8');
    writeFileSync(join(temp, 'source-crlf.gd'), lfSource.replace(/\n/g, '\r\n'), 'utf8');
    const left = readSourceContract('source-lf.gd', base);
    const right = readSourceContract('source-crlf.gd', base);
    assert.equal(left, right, 'same source semantics across Git for Windows checkout formats');
    for (const [name, re] of strictContracts) {
      assert.match(left, re, name + ' LF');
      assert.match(right, re, name + ' CRLF');
    }
    // Avoid weakening the input rules: a missing mandatory release is STILL
    // rejected on BOTH formats, even after line-ending canonicalization.
    const missingRelease = lfSource.replace(
      'func _exit_tree() -> void:\n\t_release_walk_mouse()',
      'func _exit_tree() -> void:\n\tpass'
    );
    assert.notEqual(missingRelease, lfSource, 'negative mutation must be applied');
    writeFileSync(join(temp, 'missing-lf.gd'), missingRelease, 'utf8');
    writeFileSync(join(temp, 'missing-crlf.gd'), missingRelease.replace(/\n/g, '\r\n'), 'utf8');
    const exitTreeContract = strictContracts[0][1];
    assert.doesNotMatch(readSourceContract('missing-lf.gd', base), exitTreeContract);
    assert.doesNotMatch(readSourceContract('missing-crlf.gd', base), exitTreeContract);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('SR63 audited multiline source-contract suites read canonicalized text', () => {
  const names = [
    'sr31_desktop_clinic_walk', 'sr32_native_guided_practical',
    'sr45_fsp_letter_sections', 'sr46_kp_plan_sections',
    'sr47_active_recall_quiz', 'sr49_native_writing_focus',
    'sr53_native_fdi_practical_chart', 'sr55_native_responsive_toolbar',
    'sr57_game_style_walk_hud', 'sr58_native_practical_task_first',
    'sr61_desktop_fps_mouse_capture', 'sr62_quiz_feedback_parity',
  ];
  for (const name of names) {
    const source = readFileSync(new URL('./' + name + '.test.mjs', import.meta.url), 'utf8');
    assert.match(source, /import \{ readSourceContract \} from '\.\/source-contract-text\.mjs';/, name);
    assert.match(source, /const read = path => readSourceContract\('\.\.\/'\+path, import\.meta\.url\);/, name);
  }
});
