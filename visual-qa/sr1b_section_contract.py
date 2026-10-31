"""Pure, UE-independent SR1B tissue-section import validation.

No fallback to geometry identity based on list order or raw triangle totals.
Each expected tissue group must be uniquely attributed to a native StaticMesh
through its material slot/interface or unambiguous imported object/group name.
"""
import re

MATERIALS = ('enamel', 'dentin', 'pulp', 'cementum', 'caries')


def tissue_from_name(name):
    """Recognize only bounded material tokens, not partial/other GPU/asset names."""
    norm = re.sub(r'[^a-z0-9]+', '_', str(name).lower()).strip('_')
    found = [m for m in MATERIALS if re.search(r'(^|_)' + m + r'(_|$)', norm)]
    if len(found) > 1:
        raise ValueError('Ambiguous material tokens in imported asset/slot name: ' + str(name))
    return found[0] if found else None


def validate_sections(rows, expected_counts, expected_total):
    """Return material->validated row, fail closed on missing/extra/mixed meshes.

    rows contain Unreal-sourced assetName, assetPath, triangleCount,
    materialInterfaces and materialSlots. The latter are derived from actual
    StaticMaterial entries, not from guessed OBJ order.
    """
    if not isinstance(expected_counts, dict) or set(expected_counts) != set(MATERIALS):
        raise ValueError('Manifest material set differs from production tissue groups')
    if any(type(c) is not int or c < 0 for c in expected_counts.values()):
        raise ValueError('Invalid expected per-material triangle count')
    if type(expected_total) is not int or expected_total <= 0:
        raise ValueError('Invalid expected total triangles')
    if sum(expected_counts.values()) != expected_total:
        raise ValueError('Manifest per-material triangle counts do not sum to total')
    wanted = {m for m, n in expected_counts.items() if n > 0}
    if not wanted or not isinstance(rows, list) or len(rows) != len(wanted):
        raise ValueError('Imported mesh section count differs from nonempty source groups')
    seen = {}
    paths = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Malformed native StaticMesh section')
        asset = row.get('assetName')
        asset_path = row.get('assetPath')
        triangle_count = row.get('triangleCount')
        if not isinstance(asset, str) or not asset or not isinstance(asset_path, str) or not asset_path:
            raise ValueError('Native StaticMesh name/path missing')
        if asset_path in paths:
            raise ValueError('Duplicate native StaticMesh path: ' + asset_path)
        paths.add(asset_path)
        if type(triangle_count) is not int or triangle_count <= 0:
            raise ValueError('Native LOD0 geometry missing: ' + asset)
        slots = row.get('materialSlots')
        interfaces = row.get('materialInterfaces')
        if not isinstance(slots, list) or not isinstance(interfaces, list):
            raise ValueError('Native material slot identity missing: ' + asset)
        if len(slots) != 1 or len(interfaces) != 1 or not interfaces[0]:
            raise ValueError('Expected exactly one native material slot and interface per tissue section: ' + asset)
        name_tags = [tissue_from_name(x) for x in (asset, slots[0], interfaces[0])]
        assigned = {tag for tag in name_tags if tag is not None}
        if len(assigned) != 1:
            raise ValueError('Ambiguous or absent tissue identity in native mesh/slot/interface: ' + asset)
        tissue = next(iter(assigned))
        if tissue not in wanted:
            raise ValueError('Unexpected tissue group in native import: ' + tissue)
        # Material interface must carry exact provenance token; asset names alone
        # cannot allow a generic default material or wrong PBR.
        if tissue_from_name(interfaces[0]) != tissue:
            raise ValueError('Native interface does not preserve source KL tissue material: ' + asset)
        if tissue in seen:
            raise ValueError('Duplicate native tissue group: ' + tissue)
        if triangle_count != expected_counts[tissue]:
            raise ValueError(
                'Native LOD0 per-material triangle mismatch ' + tissue +
                ': expected ' + str(expected_counts[tissue]) +
                ', got ' + str(triangle_count))
        seen[tissue] = dict(row, material=tissue)
    if set(seen) != wanted:
        raise ValueError('Missing native tissue groups: ' + str(sorted(wanted - set(seen))))
    if sum(v['triangleCount'] for v in seen.values()) != expected_total:
        raise ValueError('Native aggregate LOD0 triangle count differs from source')
    return {m: seen[m] for m in MATERIALS if m in seen}
