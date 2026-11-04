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
