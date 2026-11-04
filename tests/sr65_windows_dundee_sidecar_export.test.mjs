import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('SR65 portable Windows build ships both Dundee FDI36 and FDI26 original and converted raw sidecars',()=>{
 const workflow=read('.github/workflows/sr8-native-windows-export.yml');
 const builder=read('native-godot/build-app.mjs');
 const verifier=read('native-godot/verify-raw-bundle.mjs');
 assert.match(workflow,/pull_request:\n\s+branches: \[integration\/single-chat-validation-2026-10-30\]/);
 assert.match(workflow,/mkdir -p "\$RUNNER_TEMP\/release\/verified-raw-source\/assets\/dundee"/);
 assert.match(workflow,/cp -a "\$project\/assets\/dundee\/\." "\$RUNNER_TEMP\/release\/verified-raw-source\/assets\/dundee\/"/);
 for(const name of [
   'mandibular_first_molar.glb.source','mandibular_first_molar-godot.glb.source',
   'maxillary_first_molar.glb.source','maxillary_first_molar-godot.glb.source'
 ]) {
   assert.ok(workflow.includes(name),'bundle gate '+name);
   assert.ok(builder.includes(name),'source-pinned builder '+name);
   assert.ok(verifier.includes(name),'fail-closed verifier '+name);
 }
 assert.match(workflow,/node native-godot\/verify-raw-bundle\.mjs/);
 assert.match(workflow,/sha256sum -c RAW-SOURCE-SHA256SUMS\.txt/);
 assert.match(workflow,/actions\/upload-artifact@v4/);
});

test('SR65 does not remove original SHA/authorship checks, rebrand asset or claim Windows pixels',()=>{
 const verifier=read('native-godot/verify-raw-bundle.mjs');
 const workflow=read('.github/workflows/sr8-native-windows-export.yml');
 assert.match(verifier,/tooth\.originalSha256/);
 assert.match(verifier,/tooth\.convertedSha256/);
 assert.match(verifier,/crown\.originalSha256/);
 assert.match(verifier,/crown\.convertedSha256/);
 assert.match(verifier,/tooth\.licenseSPDX!=='CC-BY-4.0'/);
 assert.match(verifier,/crown\.licenseSPDX!=='CC-BY-4.0'/);
 assert.match(workflow,/UNTESTED workstation GPU/);
 assert.match(workflow,/It is NOT a Windows workstation launch/);
 assert.doesNotMatch(workflow,/\b(?:curl|wget)\b[^\n]*dundee/i); // no alternative unverified asset retrieval
});
