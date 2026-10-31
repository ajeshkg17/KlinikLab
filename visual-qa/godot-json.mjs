/** Cross-edition Windows PowerShell 5.1/7 JSON interoperability.
 * WinPS Set-Content -Encoding UTF8 emits UTF-8 BOM; Node JSON.parse rejects it.
 * Strip only an initial UTF-8 BOM; malformed/missing evidence never becomes success.
 */
export function parseGodotJson(raw, source='Godot JSON'){
 if(typeof raw!=='string')throw Error(source+': input is not UTF-8 text');
 try{return JSON.parse(raw.replace(/^\uFEFF/,''))}
 catch(err){throw Error(source+': invalid JSON: '+err.message)}
}
export function jsonWithoutBom(data){
 return JSON.stringify(data,null,2)+'\n';
}
