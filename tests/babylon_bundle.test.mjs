import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const text=(name)=>readFileSync(path.join(root,name),'utf8');

test('standalone includes anatomical Babylon preview and Dundee atlas',()=>{
  const html=text('KlinikLab_DesktopXR_Standalone.html');
  for(const token of ['KlinikBabylonAnatomy','KlinikRealMesh','KlinikBabylon','KlinikDundeeAtlas'])
    assert.ok(html.includes(token), 'Missing '+token+' in standalone build');
  assert.equal((html.match(/KlinikDundeeAtlas = state/g)||[]).length,1,
    'Dundee atlas should be bundled exactly once');
});

test('standalone generator includes the atlas source',()=>{
  assert.ok(text('build_standalone.py').includes("'dundee-atlas.js'"));
  assert.ok(text('public/index.html').includes('src="dundee-atlas.js"'));
});
