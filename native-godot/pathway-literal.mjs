/**
 * Extract only the single original source literal, never the surrounding
 * browser DOM code. Allow CRLF, indentation, and spaces at the STAGE seam.
 */
export function extractClinicalPathwayLiteral(source) {
 if (typeof source !== 'string') throw Error('Original browser clinical pathway literal is missing, duplicate or unbounded');
 const marker='const data={';
 const start=source.indexOf(marker);
 if (start<0 || source.indexOf(marker,start+marker.length)!==-1)
  throw Error('Original browser clinical pathway literal is missing, duplicate or unbounded');
 // Match a line containing only the object's closing "};", immediately
 // followed by the original STAGE declaration (with optional indentation).
 const seam=/(?:^|\r?\n)[ \t]*};[ \t]*\r?\n[ \t]*const[ \t]+STAGE[ \t]*=/g;
 const boundaries=[...source.matchAll(seam)].filter(match=>match.index>=start);
 if(boundaries.length!==1)
  throw Error('Original browser clinical pathway literal is missing, duplicate or unbounded');
 const match=boundaries[0];
 const close=match.index+match[0].indexOf('};')+2;
 if(close<=start+marker.length || close-start>40000)
  throw Error('Original browser clinical pathway literal is missing, duplicate or unbounded');
 return source.slice(start,close);
}
