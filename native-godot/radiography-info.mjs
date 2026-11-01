/** Extract the six bounded source radiography rows from desktop-suite.js. */
export function extractRadiographyInfo(source, maxLength = 8000) {
  const marker = 'const info=[';
  const start = source.indexOf(marker);
  if (start < 0 || source.indexOf(marker, start + marker.length) >= 0) {
    throw new Error('Bounded browser radiography case table changed');
  }
  const boundary = /^\];[ \t]*\r?\n[ \t]*let modelFactory[ \t]*=/gm;
  boundary.lastIndex = start + marker.length;
  const match = boundary.exec(source);
  if (!match || match.index - start > maxLength) {
    throw new Error('Bounded browser radiography case table changed');
  }
  return source.slice(start, match.index + 2);
}
