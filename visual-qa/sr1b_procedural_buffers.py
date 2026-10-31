"""Strict 1:1 source OBJ -> Unreal native procedural triangle-index buffers.

The Unreal StaticMesh build is known to discard source faces (10320 -> 6724,
10320 -> 6721 for enamel on UE5.8.4). These buffers bypass that build entirely.
Every face, including legitimately thin triangles, retains three source vertices.
"""
import hashlib
import math
import struct

def exact_source_buffers(triangles):
    if not isinstance(triangles, list) or not triangles:
        raise ValueError('No original source triangles')
    positions, normals, indices = [], [], []
    h = hashlib.sha256()
    min_doubled_area = float('inf')
    for triangle in triangles:
        if len(triangle) != 3:
            raise ValueError('Non-triangular original face')
        a, b, c = triangle
        if any(len(p) != 3 or not all(math.isfinite(float(x)) for x in p) for p in triangle):
            raise ValueError('Nonfinite source triangle coordinates')
        ab = [b[k]-a[k] for k in range(3)]
        ac = [c[k]-a[k] for k in range(3)]
        n = (ab[1]*ac[2]-ab[2]*ac[1],
             ab[2]*ac[0]-ab[0]*ac[2],
             ab[0]*ac[1]-ab[1]*ac[0])
        doubled_area=math.sqrt(sum(x*x for x in n))
        if doubled_area<=1e-10:
            raise ValueError('Source triangle numerically degenerate')
        min_doubled_area=min(min_doubled_area,doubled_area)
        normal=tuple(x/doubled_area for x in n)
        start=len(positions)
        for p in triangle:
            position=tuple(float(x) for x in p)
            positions.append(position)
            normals.append(normal)
            h.update(struct.pack('<3d',*position))
        indices.extend((start,start+1,start+2))
    if len(indices)!=3*len(triangles) or len(positions)!=len(indices):
        raise ValueError('Native procedural source face count corruption')
    if indices!=list(range(len(indices))):
        raise ValueError('Original source triangle winding/order changed')
    return {
        'positions':positions,'normals':normals,'indices':indices,
        'sourceTriangles':len(triangles),'submittedTriangles':len(indices)//3,
        'sourceCoordinateSHA256':h.hexdigest(),
        'minDoubledAreaCm2':min_doubled_area
    }
