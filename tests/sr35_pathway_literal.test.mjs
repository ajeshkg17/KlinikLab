import test from 'node:test';
import assert from 'node:assert/strict';
import {extractClinicalPathwayLiteral} from '../native-godot/pathway-literal.mjs';
const obj='const data={molar:{chief:"fixture"}}';
const bounded=(seam)=>'const PREAMBLE = true;\n'+obj+seam+'const STAGE=1;\n';
test('clinical literal remains bounded with LF and CRLF and whitespace at closing seam',()=>{
 for (const seam of [';\n',';\r\n',';   \n  ',';\r\n\t']) {
  const source=bounded(seam);
  assert.equal(extractClinicalPathwayLiteral(source),obj+';');
 }
});
test('reject absent, repeated, oversized or missing closing source literals',()=>{
 const bad=['const STAGE=1;',bounded(';\n')+bounded(';\n'),obj+';\nconst OTHER=1;',
   'const data={'+' '.repeat(40001)+'};\nconst STAGE=1;',
   obj+';\nconst STAGE=1;\n};\nconst STAGE=2;'];
 for(const source of bad)
  assert.throws(()=>extractClinicalPathwayLiteral(source),/missing, duplicate or unbounded/);
});
test('do not accept inline closing without a dedicated closing line',()=>{
 assert.throws(()=>extractClinicalPathwayLiteral('const data={x:1};\nconst STAGE=1;'),/missing, duplicate or unbounded/);
});
