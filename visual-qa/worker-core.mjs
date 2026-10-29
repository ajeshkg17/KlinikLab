/** Safe, non-executable visual QA job schema and helpers. Node 20+. */
import path from 'node:path';

export const JOB_SCHEMA = 1;
export const RESULT_BRANCH = 'visual-feedback';
export const MAX_SCENES = 14;
export const DEFAULT_ORIGIN = 'http://127.0.0.1:8787';
export const CONTROLS = Object.freeze({
  teeth: '#focus',
  renderer: '#renderer-toggle',
  atlasOpen: '#dundee-atlas-open',
  atlasNext: '#dundee-atlas-next',
  atlasPrev: '#dundee-atlas-prev',
  atlasClose: '#dundee-atlas-close',
  clinic: '#room',
  occlusal: '#occlusal',
  arches: '#arches',
  view3d: '[data-view="3d"]',
  volume: '[data-view="volume"]',
  imageBrief: '[data-view="xray"]',
  procedure2d: '[data-view="operative"]',
  crossSection: '#vl-section',
  prepTop: '#vl-top',
  prepOrbit: '#vl-orbit',
  prepDrill: '#vl-drill',
  imaging: '#desktop-open',
  imagingRadiology: '[data-dstab="radiology"]',
  imagingScan: '[data-dstab="anatomy"]',
  closeImaging: '#ds-close',
  case16: '[data-case="0"]',
  case36: '[data-case="1"]',
  case11: '[data-case="2"]',
  case26: '[data-case="3"]',
  case48: '[data-case="4"]',
  case46: '[data-case="5"]',
});
export const CAPTURES = Object.freeze({
  page: null,
  stage: '#stage',
  scene: '#scene',
  tooth: '#vl-canvas',
  volume: '#volume-root',
  radiograph: '#xray',
  imaging: '#desktop-suite',
  atlas: '#dundee-atlas-dialog',
});
const ID = /^[a-z0-9][a-z0-9_-]{3,63}$/;
const pnum = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
export function validatedBase(raw = DEFAULT_ORIGIN) {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '8787' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('The worker only opens http://127.0.0.1:8787/ (no remote URL overrides).');
  return url;
}
export function validateJob(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Job must be a JSON object.');
  const {schemaVersion,jobId,viewport,scenes} = raw;
  if (schemaVersion !== JOB_SCHEMA) throw new Error('Unsupported job schemaVersion.');
  if (typeof jobId !== 'string' || !ID.test(jobId)) throw new Error('Invalid jobId; use 4–64 lowercase letters, numbers, dash or underscore.');
  if (!viewport || !pnum(viewport.width,900,1920) || !pnum(viewport.height,600,1200)) throw new Error('Desktop viewport must be 900–1920 x 600–1200.');
  if (!Array.isArray(scenes) || !scenes.length || scenes.length > MAX_SCENES) throw new Error('Provide 1–14 scenes.');
  const seen = new Set();
  for (const scene of scenes) {
    if (!scene || typeof scene !== 'object' || !ID.test(scene.name) || seen.has(scene.name)) throw new Error('Invalid or duplicate scene name.');
    seen.add(scene.name);
    if (!(scene.capture in CAPTURES)) throw new Error(`Unknown capture for ${scene.name}.`);
    if (!Array.isArray(scene.steps) || scene.steps.length > 10) throw new Error(`Invalid steps for ${scene.name}.`);
    for (const step of scene.steps) {
      if (!step || typeof step !== 'object') throw new Error('Invalid step.');
      if (step.action === 'click') {
        if (!Object.hasOwn(CONTROLS,step.control)) throw new Error(`Control is not approved: ${step.control}`);
      } else if (step.action === 'localDemoGLB') {
        // The only permitted local upload source is the bundled public demo tooth;
        // job files cannot choose a filesystem path or access private files.
      } else if (step.action === 'wait') {
        if (!pnum(step.ms,100,3000)) throw new Error('Wait must be 100–3000 ms.');
      } else if (step.action === 'orbit') {
        if (!pnum(step.dx,-350,350) || !pnum(step.dy,-260,260)) throw new Error('Orbit distances are outside allowed range.');
      } else throw new Error(`Unknown action: ${step.action}`);
    }
  }
  return {schemaVersion,jobId,viewport:{width:viewport.width,height:viewport.height},scenes:scenes.map(s=>({name:s.name,capture:s.capture,steps:s.steps.map(x=>({...x}))}))};
}
export function safeRunFolder(jobId) {
  if (!ID.test(jobId)) throw new Error('Unsafe output path');
  return path.posix.join('runs',jobId);
}
export function localRequestAllowed(raw) {
  try {
    const u = new URL(raw);
    return (u.protocol === 'http:' && u.hostname === '127.0.0.1' && u.port === '8787') || (['https://cdn.babylonjs.com/babylon.js','https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js','https://cdn.babylonjs.com/draco_wasm_wrapper_gltf.js','https://cdn.babylonjs.com/draco_decoder_gltf.wasm','https://cdn.babylonjs.com/draco_decoder_gltf.js'].includes(u.href)) || /^https:\/\/cdn\.babylonjs\.com\/v[0-9]+\.[0-9]+\.[0-9]+\/draco_(?:wasm_wrapper_gltf\.js|decoder_gltf\.(?:wasm|js))$/.test(u.href) || u.protocol === 'data:' || u.protocol === 'blob:';
  } catch { return false; }
}