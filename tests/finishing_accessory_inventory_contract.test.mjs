import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const source=path=>readSourceContract('../'+path,import.meta.url);
const catalog=source('native-godot/tools-inventory-catalog.gd');
const builder=source('native-godot/build-app.mjs');
const bench=source('native-godot/chairside-catalog.gd');
const panel=source('native-godot/tools-inventory-panel.gd');
const models=[
  ['gingival_cord_packer','synthetic-retraction-cord-packer.tscn','TinyBluntCordPackingPaddle'],
  ['sectional_matrix_forceps','synthetic-sectional-matrix-forceps.tscn','MatrixRingForcepsPivot'],
  ['composite_compule_gun','synthetic-composite-compule-gun.tscn','CompositeCompuleStudyCartridge'],
  ['composite_finishing_strip','synthetic-finishing-strip.tscn','FlexibleFinishingStripFlatStudyRibbon'],
  ['polishing_disc_mandrel','synthetic-polishing-disc-mandrel.tscn','CircularPolishingDisc'],
  ['prophy_rubber_cup','synthetic-prophylaxis-polishing-cup.tscn','FlexibleProphyCupSilhouette'],
  ['cement_mixing_spatula','synthetic-cement-mixing-spatula.tscn','BroadCementMixingBlade'],
  ['microbrush_applicator','synthetic-dental-microbrush.tscn','SoftBrushHeadSilhouette'],
  ['endo_paper_point_dispenser','synthetic-paper-point-dispenser.tscn','AbsorbentTaperedPaperPoint0'],
  ['rubber_dam_punch','synthetic-rubber-dam-hole-punch.tscn','RotatingHoleSelectionWheel']
];

test('ten individually named restorative models grow catalog to 83 while retaining older entries',()=>{
  const section=catalog.split('const FINISHING_ACCESSORY_TOOLS := [')[1]?.split('\n]\n')[0];
  assert.ok(section,'new category group must exist');
  assert.deepEqual([...section.matchAll(/^\t\t"id": "finishing\.([^"]+)",/gm)].map(x=>x[1]),
    models.map(x=>x[0]));
  assert.deepEqual([...section.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x=>x[1]),
    models.map(x=>x[1]));
  for(const key of ['name','german','kind','cue','purpose','source'])
    assert.equal([...section.matchAll(new RegExp('^\\t\\t"'+key+'": "[^"]+",','gm'))].length,10,'label '+key);
  assert.match(catalog,/for entry: Dictionary in FINISHING_ACCESSORY_TOOLS:\s*\n\t\tresult\.append\(entry\.duplicate\(true\)\)/);
  for(const [group,n] of [['inventory',6],['handtool',8],['rotary',10],['assistant',10],['prostho_ortho',10],['perio_surgery',10],['finishing',10]])
    assert.equal([...catalog.matchAll(new RegExp('^\\t\\t"id": "'+group+'\\.[^"]+",','gm'))].length,n,group);
  const ids=[...catalog.matchAll(/^\t\t"id": "((?:inventory|handtool|rotary|assistant|prostho_ortho|perio_surgery|finishing)\.[^"]+)",/gm)].map(x=>x[1]);
  assert.equal(ids.length,64,'extra catalog entry count');
  assert.equal(new Set(ids).size,64,'new and old catalog IDs must be unique');
  assert.equal(countOriginalBenchToolEntries(bench),19);
  assert.equal((bench.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm)||[]).length,20);
});

test('ten new 3D model scenes are self-contained with correct resource references and distinctive shapes',()=>{
  for(const [id,file,characteristic] of models){
    const scene=source('native-godot/assets/inventory/'+file);
    assert.match(scene,/^\[gd_scene load_steps=\d+ format=3\]/m,'valid Godot scene: '+id);
    assert.match(scene,/^\[node name="[^"]+" type="Node3D"\]/m,'3D root: '+id);
    assert.doesNotMatch(scene,/^\[ext_resource /m,'no external dependencies: '+id);
    const nodes=[...scene.matchAll(/^\[node name="([^"]+)" type="MeshInstance3D" parent="\."\]/gm)].map(x=>x[1]);
    assert.ok(nodes.length>=6,'visible mesh count: '+id);
    assert.equal(nodes.length,new Set(nodes).size,'duplicate scene node: '+id);
    assert.ok(nodes.includes(characteristic),'missing unique geometric feature: '+id);
    const local=[...scene.matchAll(/^\[sub_resource type="[^"]+" id="([^"]+)"\]/gm)].map(x=>x[1]);
    assert.equal(local.length,new Set(local).size,'duplicate subresources: '+id);
    const refs=[...scene.matchAll(/SubResource\("([^"]+)"\)/gm)].map(x=>x[1]);
    assert.ok(refs.length>=12,'mesh and material binding count: '+id);
    for(const ref of refs) assert.ok(local.includes(ref),'unknown subresource '+ref+': '+id);
    assert.equal(Number(scene.match(/^\[gd_scene load_steps=(\d+)/m)?.[1]),local.length+1,'load_steps: '+id);
  }
});

test('build copies all ten model scenes and does not change original lesson behavior or learner files',()=>{
  const m=builder.match(/const finishingAccessoryScenes=(\[[^\n]+\]);/);
  assert.ok(m,'missing builder copy manifest');
  assert.deepEqual(JSON.parse(m[1]),models.map(x=>x[1]));
  assert.match(builder,/for\(const filename of finishingAccessoryScenes\)\s*\n\s*copy\('native-godot\/assets\/inventory\/'\+filename,'assets\/inventory\/'\+filename\)/);
  assert.match(panel,/_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel,/_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.doesNotMatch(panel,/user:\/\//);
  assert.doesNotMatch(panel,/record_practice|_save_progress/);
  assert.doesNotMatch(builder,/\bfetch\(|\bhttps\.get\(/,'no new build-time network fetch');
});
