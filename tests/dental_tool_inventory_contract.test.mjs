import test from 'node:test';
import assert from 'node:assert/strict';
import {readSourceContract,countOriginalBenchToolEntries} from './source-contract-text.mjs';

const read = path => readSourceContract('../' + path, import.meta.url);
const catalog = read('native-godot/tools-inventory-catalog.gd');
const panel = read('native-godot/tools-inventory-panel.gd');
const app = read('native-godot/app.gd');
const builder = read('native-godot/build-app.mjs');
const benchCatalog = read('native-godot/chairside-catalog.gd');
const packIndex = JSON.parse(read('visual-qa/asset-research/assets/dental-practice-cc0-v1/download-index.json'));
const expected = [
  ['inventory.instrument_tray', 'instrument-tray.glb', '34383'],
  ['inventory.impression_trays', 'impression-trays.glb', '34400'],
  ['inventory.xray_sensor_tray', 'xray-sensor-tray.glb', '34388'],
  ['inventory.suction_unit', 'suction-unit.glb', '34378'],
  ['inventory.articulator', 'articulator.glb', '34398'],
  ['inventory.ultrasonic_cleaner', 'ultrasonic-cleaner.glb', '34393']
];

test('six real source-pack models are catalogued, uniquely labelled and not chairside substitutions', () => {
  const ids = [...catalog.matchAll(/^\t\t"id": "(inventory\.[^"]+)",/gm)].map(x => x[1]);
  const scenes = [...catalog.matchAll(/^\t\t"scene": "res:\/\/assets\/inventory\/([^"]+)",/gm)].map(x => x[1]);
  assert.deepEqual(ids, expected.map(x => x[0]));
  assert.deepEqual(scenes, expected.map(x => x[1]));
  assert.equal(new Set(ids).size, 6);
  assert.equal(new Set(scenes).size, 6);
  assert.match(catalog, /BENCH\.ITEMS\.keys\(\)/);
  assert.match(catalog, /not id\.begins_with\("tool\."\)/);
  assert.match(catalog, /for entry: Dictionary in EXTRA:/);
  assert.match(catalog, /return result/);
  // The 20 original chair benches and 19 study instruments remain unchanged.
  assert.equal((benchCatalog.match(/^const (?:COMPOSITE|SEALANT|FLUORIDE|CLEANING|ROOT_PLANING|CHART|BITEWING|ORAL_EXAM|VENEER|INLAY|CROWN|BRIDGE|FULL_DENTURE|PARTIAL_DENTURE|IMPLANT|ENDO|RETREAT|ALIGNER|MOUTHGUARD|EXTRACTION) := \{/gm) || []).length, 20);
  assert.equal(countOriginalBenchToolEntries(benchCatalog), 19);
});

test('all six downloadable GLBs are copied only from exact SHA256-pinned CC0 source pack', () => {
  const region = builder.match(/const inventoryModels=\[([\s\S]*?)^\s+\];/m)?.[1];
  assert.ok(region, 'missing inventoryModels build manifest');
  const models = region.split('\n').map(x => x.trim().replace(/,$/, ''))
    .filter(x => x.startsWith('[')).map(x => JSON.parse(x));
  assert.equal(models.length, 6);
  for (let i = 0; i < expected.length; i++) {
    const [, name, id] = expected[i];
    const [filename, modelId, original, sha256] = models[i];
    assert.equal(filename, name);
    assert.equal(modelId, id);
    const row = packIndex.find(x => x.id === id);
    assert.ok(row, 'source pack is missing asset ' + id);
    assert.equal(row.file, original);
    assert.equal(row.sha256.toLowerCase(), sha256);
    assert.equal(row.source, 'https://cdn.3dassets.dev/assets/' + id + '/v1/model.glb');
    assert.equal(row.license, 'CC0 1.0 Universal');
  }
  for (const phrase of [
    "row.sha256?.toLowerCase()!==sourceSha256",
    "sha256(bytes)!==sourceSha256",
    "originalPath,fs.constants.COPYFILE_EXCL",
    "sha256(fs.readFileSync(path.join(inventoryDir,filename)))!==compatible.convertedSha256",
    "source-manifest.json",
    "clinicalAccuracyValidated:false"
  ]) assert.ok(builder.includes(phrase), 'missing packaging guard: ' + phrase);
  assert.match(builder, /'tools-inventory-catalog\.gd','tools-inventory-panel\.gd'/);
});

test('Journey opens isolated 3D inventory; selector, preview, provenance link and close are wired', () => {
  assert.match(app, /const TOOL_INVENTORY := preload\("res:\/\/tools-inventory-panel\.gd"\)/);
  assert.match(app, /open_inventory\.name = "KL_OPEN_TOOL_INVENTORY"/);
  assert.match(app, /open_inventory\.pressed\.connect\(_open_tool_inventory\)/);
  assert.match(app, /_tool_inventory = TOOL_INVENTORY\.new\(\)/);
  assert.match(app, /_tool_inventory\.start\(\)/);
  assert.match(panel, /_entries = CATALOG\.entries\(\)/);
  assert.match(panel, /_selector\.item_selected\.connect\(_select_item\)/);
  assert.match(panel, /_preview\.show_model\(str\(item\["scene"\]\)\)/);
  assert.match(panel, /left\.pressed\.connect\(func\(\) -> void: _preview\.turn\(-0\.42\)\)/);
  assert.match(panel, /_source\.uri = str\(item\["source"\]\)/);
  assert.match(panel, /close\.pressed\.connect\(queue_free\)/);
  assert.doesNotMatch(panel, /user:\/\/|_save_progress|record_practice/);
});
