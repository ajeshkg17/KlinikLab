import test from 'node:test';
import assert from 'node:assert/strict';
import { readSourceContract } from './source-contract-text.mjs';
import fs from 'node:fs';
const read = path => readSourceContract('../'+path, import.meta.url);

const sourceQuadrants=[
  ['18','17','16','15','14','13','12','11'],
  ['21','22','23','24','25','26','27','28'],
  ['48','47','46','45','44','43','42','41'],
  ['31','32','33','34','35','36','37','38']
];
test('SR53 original browser chart maps all 32 permanent FDI teeth into four quadrants',()=>{
 const browser=read('app.js');
 const godot=read('native-godot/app.gd');
 assert.match(browser,/renderChart\(\)\{const groups=/);
 for(const q of sourceQuadrants){
  const browserGroup='['+q.join(',')+']';
  const nativeGroup='['+q.map(v=>'"'+v+'"').join(', ')+']';
  assert.ok(browser.includes(browserGroup),'browser FDI group missing '+browserGroup);
  assert.ok(godot.includes(nativeGroup),'native FDI group missing '+nativeGroup);
 }
 assert.deepEqual([...new Set(sourceQuadrants.flat())].length,32);
 assert.match(godot,/const FDI_CHART_HEADERS := \[/);
 assert.match(godot,/func _show_practical_fdi_chart\(step_index: int\) -> void:/);
 assert.match(godot,/grid\.columns = 4/);
 assert.match(godot,/tooth_button\.name = "KL_FDI_TOOTH_" \+ code/);
 assert.match(godot,/tooth_button\.pressed\.connect\(_practical_target\.bind\(step_index, code\)\)/);
 assert.match(godot,/NOT 32 source-verified tooth models/);
 assert.doesNotMatch(godot,/for tooth in FDI:\n\t+var t := _button\("FDI " \+ str\(tooth\)\)/);
});
test('SR53 native tooth selection retains original source grading, six FDI cases and no 3D cutting',()=>{
 const app=read('native-godot/app.gd');
 const runtime=read('native-godot/actual-app-smoke.gd');
 const layout=read('native-godot/visual-layout-smoke.gd');
 const ci=read('.github/workflows/sr1c-godot-4-7-native-parse.yml');
 assert.match(app,/func _fdichart_contains\(tooth: String\) -> bool:/);
 assert.match(app,/if not _fdichart_contains\(tooth\):\n\t\treturn/);
 assert.match(app,/var correct := tooth == str\(step\.get\("target", ""\)\)/);
 assert.match(app,/Incorrect FDI selection\. Recheck the fictional case and try again/);
 assert.match(app,/_record_practical\(step_index, tooth, correct, detail\)/);
 assert.match(runtime,/for case_i in range\(6\):/);
 assert.match(runtime,/chart_quadrants: Array/);
 assert.match(runtime,/KL_FDI_TOOTH_18/);
 assert.match(runtime,/KL_FDI_TOOTH_.*FDIS\[case_i\]/);
 assert.match(runtime,/source first task FDI identity mismatch/);
 assert.match(runtime,/out-of-chart invalid FDI persisted/);
 assert.match(runtime,/chart selection cut a model or changed the source case\/station/);
 assert.match(runtime,/SR53_ALL_32_FDI_SIX_CASE_PRACTICAL_CHART_PASS/);
 assert.match(layout,/for window_width in \[1600,1280,1024\]:/);
 assert.match(layout,/SR53_FDI_CHART_1600_1280_1024_LAYOUT_PASS/);
 assert.match(ci,/tests\/sr53_native_fdi_practical_chart\.test\.mjs/);
 assert.match(ci,/SR53_ALL_32_FDI_SIX_CASE_PRACTICAL_CHART_PASS/);
 assert.match(ci,/SR53_FDI_CHART_1600_1280_1024_LAYOUT_PASS/);
});
