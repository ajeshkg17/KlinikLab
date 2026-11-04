import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('SR58 browser practical presents current source task before secondary reference information', () => {
  const browser = read('app.js');
  assert.match(browser, /practicalView\(\)\{const q=this\.practicalStep\(\)/);
  assert.match(browser, /KP PRAKTISCH · STEP \$\{this\.step\+1\}/);
  assert.match(browser, /<h2>\$\{esc\(q\.title\)\}<\/h2>/);
  assert.match(browser, /FDI accuracy/);
  assert.match(browser, /Use the interactive 3D dental model or the odontogram/);
});

test('SR58 native practical puts real source task controls before model/anatomy/fictional-case prose while preserving them', () => {
  const app = read('native-godot/app.gd');
  const refresh = app.slice(app.indexOf('func _refresh() -> void:'), app.indexOf('func _ensure_fdi36_reference()', app.indexOf('func _refresh() -> void:')));
  const practical = app.slice(app.indexOf('func _show_practical() -> void:'), app.indexOf('func _make_cut_slider(', app.indexOf('func _show_practical() -> void:')));
  assert.match(refresh, /var practical_first: bool = _view == "clinic" and STATION_IDS\[_station_index\] == "practical"/);
  assert.match(refresh, /if practical_first:\n\t\t\t_show_station\(\)/);
  assert.match(refresh, /if not practical_first:\n\t\t\t_show_station\(\)/);
  assert.match(practical, /var provenance_start_index: int = _page\.get_child_count\(\)/);
  assert.match(practical, /var provenance_child_count: int = _page\.get_child_count\(\) - provenance_start_index/);
  assert.match(practical, /start_guide\.name = "KL_PRACTICAL_START_GUIDE"/);
  assert.match(practical, /start_guide\.pressed\.connect\(_set_procedure_guided\.bind\(true\)\)/);
  assert.match(practical, /SOURCE PRACTICAL · FDI %s/);
  assert.match(practical, /_page\.move_child\(_page\.get_child\(provenance_start_index\), _page\.get_child_count\(\) - 1\)/);
  assert.match(practical, /ANATOMY REFERENCE — educational provenance/);
  assert.match(practical, /MODEL STATUS: SOURCE-VERIFIED SURFACE REFERENCE/);
  assert.match(practical, /_show_practical_fdi_chart\(step_index\)/);
  assert.match(practical, /# Keep the current source task\/FDI choices above/);
  assert.match(practical, /if _procedure_guided:\n\t\tvar previous := _button\("Previous task \(P\)"\)/);
  assert.match(practical, /Bur use needs independent opt-in/); // no shortcut to cutting
  assert.doesNotMatch(practical, /_practical_target\(0, FDI/); // no fabricated success
});

test('SR58 CI gates real Godot six-case task ordering and responsive entry geometry', () => {
  const guided = read('native-godot/guided-practical-smoke.gd');
  const layout = read('native-godot/visual-layout-smoke.gd');
  const ci = read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
  assert.match(guided, /func _sr58_task_first_order\(app: Node3D, fdi: String, guided: bool\) -> bool:/);
  assert.match(guided, /start_guide\.pressed\.emit\(\)/);
  assert.match(guided, /SR58_SIX_FDI_TASK_FIRST_GUIDED_PRACTICAL_PASS/);
  assert.match(layout, /func _validate_practical_task_first\(app: Node3D, width: int, height: int\) -> bool:/);
  for (const viewport of ['[1600,900]', '[1280,900]', '[1024,900]', '[1280,720]'])
    assert.ok(layout.includes(viewport), viewport);
  assert.match(layout, /SR58_PRACTICAL_START_1600_1280_1024_720_LAYOUT_PASS/);
  assert.match(ci, /tests\/sr58_native_practical_task_first\.test\.mjs/);
  assert.match(ci, /SR58_SIX_FDI_TASK_FIRST_GUIDED_PRACTICAL_PASS/);
  assert.match(ci, /SR58_PRACTICAL_START_1600_1280_1024_720_LAYOUT_PASS/);
});
