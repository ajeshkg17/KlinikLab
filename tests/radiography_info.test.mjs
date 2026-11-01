import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractRadiographyInfo} from '../native-godot/radiography-info.mjs';

const source = fs.readFileSync(new URL('../desktop-suite.js', import.meta.url), 'utf8');

test('radiography exporter accepts CRLF and LF source line endings', () => {
  for (const input of [source, source.replace(/\r?\n/g, '\n')]) {
    const literal = extractRadiographyInfo(input);
    const rows = vm.runInNewContext(`${literal}\n info`, Object.create(null), {timeout: 1000});
    assert.equal(rows.length, 6);
    assert.deepEqual(Array.from(rows, row => row[1]), ['16', '36', '11', '26', '48', '46']);
  }
});

test('radiography exporter rejects missing, duplicate, ambiguous and oversized tables', () => {
  assert.throws(() => extractRadiographyInfo('let modelFactory=null;'), /case table changed/);
  assert.throws(() => extractRadiographyInfo(`${source}\nconst info=[]`), /case table changed/);
  assert.throws(() => extractRadiographyInfo(source.replace('let modelFactory=', 'const other=0;\nlet modelFactory=')), /case table changed/);
  assert.throws(() => extractRadiographyInfo(source, 32), /case table changed/);
});
