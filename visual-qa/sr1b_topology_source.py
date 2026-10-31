"""Immutable OBJ triangle stream reader for native SR1B topology repair.

Reads only KlinikLab's own source-pinned triangle-soup OBJ. Any unsupported
directives, material switch mismatch, index error or zero-area triangles
fail closed. Geometry is never synthesized or simplified.
"""
import math
from pathlib import Path

MATERIALS = ('enamel','dentin','pulp','cementum','caries')


def read_obj_triangles(path, expected_counts):
    if set(expected_counts) != set(MATERIALS):
        raise ValueError('Source manifest material set unexpected')
    vertices = []
    output = {m: [] for m in MATERIALS}
    material = None
    def valid_triangle(pts):
        ab=[pts[1][i]-pts[0][i] for i in range(3)]
        ac=[pts[2][i]-pts[0][i] for i in range(3)]
        cr=[ab[1]*ac[2]-ab[2]*ac[1],
            ab[2]*ac[0]-ab[0]*ac[2],
            ab[0]*ac[1]-ab[1]*ac[0]]
        return math.hypot(*cr) > 1e-10 # doubled area cm^2
    for lineno,line in enumerate(Path(path).read_text(encoding='utf8').splitlines(),1):
        text=line.strip()
        if not text or text.startswith('#'):
            continue
        parts=text.split()
        head=parts[0]
        if head=='v':
            if len(parts)!=4: raise ValueError(f'Invalid OBJ vertex at line {lineno}')
            pos=tuple(float(x) for x in parts[1:])
            if not all(math.isfinite(x) for x in pos):
                raise ValueError(f'Nonfinite OBJ vertex at line {lineno}')
            vertices.append(pos)
        elif head=='usemtl':
            if len(parts)!=2 or not parts[1].startswith('KL_') or parts[1][3:] not in output:
                raise ValueError(f'Unexpected source OBJ material at line {lineno}')
            material=parts[1][3:]
        elif head=='f':
            if material is None or len(parts)!=4 or any('/' in x for x in parts[1:]):
                raise ValueError(f'Expected three-vertex material-labelled OBJ face at line {lineno}')
            indices=[int(x)-1 for x in parts[1:]]
            if min(indices)<0 or max(indices)>=len(vertices) or len(set(indices))!=3:
                raise ValueError(f'OBJ face index error at line {lineno}')
            triangle=tuple(vertices[i] for i in indices)
            if not valid_triangle(triangle):
                raise ValueError(f'Degenerate OBJ triangle at line {lineno}')
            output[material].append(triangle)
        elif head in ('o','g','s','mtllib'):
            if head=='mtllib' and parts!=['mtllib','kliniklab-fdi16.mtl']:
                raise ValueError('Unexpected external material library')
            continue
        else:
            raise ValueError(f'Unrecognized OBJ content at line {lineno}: {head}')
    counts={m:len(output[m]) for m in MATERIALS}
    if counts!=expected_counts:
        raise ValueError('Parsed raw OBJ triangles differ from production source manifest: '+str(counts))
    return output
