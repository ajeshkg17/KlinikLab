"""Native SR1B procedural render-geometry bounds sanity checks.

Source-exact section counts alone did not prove a rasterizable mesh. The
31-Oct-2026 HighResShot showed labels/editor sprites but no distinct tooth.
Compare native world-space procedural bounds to actual source OBJ face bounds
after the required actor placement. Never fabricate bounds or silently accept
empty/incorrectly placed sections.
"""
import math


def source_bounds(triangles):
    if not triangles:
        raise ValueError('Source tissue has zero triangles')
    p = [v for tri in triangles for v in tri]
    if any(len(v) != 3 or any(not math.isfinite(float(x)) for x in v) for v in p):
        raise ValueError('Invalid source tissue coordinate')
    lo = [min(float(v[i]) for v in p) for i in range(3)]
    hi = [max(float(v[i]) for v in p) for i in range(3)]
    if max(hi[i]-lo[i] for i in range(3)) <= 1e-6:
        raise ValueError('Source tissue collapsed to a point')
    return {'min': lo, 'max': hi}


def check_native_component_bounds(source, translation, origin, extent):
    if len(translation) != 3 or len(origin) != 3 or len(extent) != 3:
        raise ValueError('Unreal bounds/translation dimension incorrect')
    if not all(math.isfinite(float(x)) for x in (*translation, *origin, *extent)):
        raise ValueError('Nonfinite native world bounds')
    if any(float(x) < 0 for x in extent):
        raise ValueError('Negative Unreal component bound extent')
    native_min=[float(origin[i])-float(extent[i]) for i in range(3)]
    native_max=[float(origin[i])+float(extent[i]) for i in range(3)]
    expected_min=[source['min'][i]+float(translation[i]) for i in range(3)]
    expected_max=[source['max'][i]+float(translation[i]) for i in range(3)]
    actual_span=[native_max[i]-native_min[i] for i in range(3)]
    source_span=[expected_max[i]-expected_min[i] for i in range(3)]
    if max(actual_span)<1e-5:
        raise ValueError('Native procedural section world bounds are empty')
    # Bounds can be conservatively enlarged by Unreal, but cannot be tiny,
    # relocated to the origin or exclude source-coordinate endpoints.
    tol=1.0
    for i in range(3):
        if native_min[i] > expected_min[i]+tol or native_max[i] < expected_max[i]-tol:
            raise ValueError('Native procedural section bounds exclude original source faces: axis='+str(i))
        if actual_span[i] > max(10.0,source_span[i]*4.0+tol):
            raise ValueError('Native procedural section bounds implausibly expanded: axis='+str(i))
    return {
        'nativeMinCm':native_min,'nativeMaxCm':native_max,
        'expectedMinCm':expected_min,'expectedMaxCm':expected_max,
        'sourceSpanCm':source_span,
        'boundsContainEverySourceFace':True
    }
