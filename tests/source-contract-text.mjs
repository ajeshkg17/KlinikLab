import { readFileSync } from 'node:fs';

// Native source-contract tests check meaningful line structure and indentation.
// Git for Windows may materialize identical source text with CRLF; convert ONLY
// CRLF line terminators before applying unchanged structural assertions.
// This does not trim spaces, alter tabs, or change tokens / clinical semantics.
export function normalizeSourceLineEndings(text) {
  if (typeof text !== 'string') throw new TypeError('Expected decoded source text');
  return text.replace(/\r\n/g, '\n');
}

export function readSourceContract(relativePath, importerUrl) {
  return normalizeSourceLineEndings(readFileSync(new URL(relativePath, importerUrl), 'utf8'));
}

/**
 * Stable original 20-lesson instrument universe. New optional bench lessons may
 * have their own tool entries; count only the original catalog keys and verify
 * each appears exactly once rather than hard-coding the total ITEMS size.
 */
export const ORIGINAL_BENCH_TOOL_IDS = Object.freeze([
  "tool.curing_light",
  "tool.ultrasonic_scaler",
  "tool.varnish_brush",
  "tool.polishing_cup",
  "tool.periodontal_probe",
  "tool.image_pointer",
  "tool.examination_mirror",
  "tool.veneer_shell",
  "tool.inlay_insert",
  "tool.crown_shell",
  "tool.bridge_framework",
  "tool.complete_denture_arch",
  "tool.partial_denture_framework",
  "tool.implant_crown_study",
  "tool.canal_tracing_stylus",
  "tool.record_comparison_pointer",
  "tool.aligner_stage04_tray",
  "tool.sports_mouthguard_study",
  "tool.training_forceps_study"
]);

export function countOriginalBenchToolEntries(catalogSource) {
  const counts = new Map();
  for (const [, id] of catalogSource.matchAll(/^\t"(tool\.[^"]+)": \{/gm)) {
    counts.set(id,(counts.get(id) ?? 0)+1);
  }
  return ORIGINAL_BENCH_TOOL_IDS.filter(id=>counts.get(id)===1).length;
}
