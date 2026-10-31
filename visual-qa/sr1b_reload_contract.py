"""Pure SR1B native UE clinical level reload contract.

The earlier script mistakenly compared get_actor_label() with dictionary KEYS
('before', 'after') rather than the expected actor-label VALUES. Validate an
explicit editor actor inventory instead, with fail-closed actor/tissue matching.
This module never fabricates or guesses actor labels and never weakens topology.
"""
MATERIALS = ('enamel', 'dentin', 'pulp', 'cementum', 'caries')
STATES = ('before', 'after')


def validate_loaded_actor_inventory(inventory, expected_actors, counts_by_state):
    if not isinstance(inventory, list):
        raise ValueError('Reloaded editor actor inventory unavailable')
    if not isinstance(expected_actors, dict) or set(expected_actors) != set(STATES):
        raise ValueError('Expected clinical actor states must be before and after')
    if any(not isinstance(x, str) or not x for x in expected_actors.values()):
        raise ValueError('Expected clinical actor label missing')
    if len(set(expected_actors.values())) != len(STATES):
        raise ValueError('Expected before/after actor labels must differ')
    if not isinstance(counts_by_state, dict) or set(counts_by_state) != set(STATES):
        raise ValueError('Expected clinical tissue manifest states must be before and after')
    for state in STATES:
        counts = counts_by_state[state]
        if not isinstance(counts, dict) or set(counts) != set(MATERIALS):
            raise ValueError('Expected source tissue groups unavailable: ' + state)
        if any(type(n) is not int or n < 0 for n in counts.values()):
            raise ValueError('Invalid source tissue count: ' + state)
        if sum(counts.values()) <= 0:
            raise ValueError('Empty source tooth: ' + state)
    if any(not isinstance(x, dict) or not isinstance(x.get('actorLabel'), str)
           for x in inventory):
        raise ValueError('Malformed enumerated native actor inventory')
    expected_labels = set(expected_actors.values())
    matches = {}
    for state, label in expected_actors.items():
        found = [row for row in inventory if row['actorLabel'] == label]
        if len(found) != 1:
            context = [{'label': x['actorLabel'],
                        'class': x.get('actorClass'),
                        'path': x.get('actorPath'),
                        'proceduralComponentCount': len(x.get('proceduralComponents') or [])}
                       for x in inventory]
            raise ValueError('Expected reloaded tooth actor label ' + repr(label) +
                             ' (' + state + ') occurred ' + str(len(found)) +
                             ' times; enumerated=' + repr(context))
        matches[state] = found[0]
    if matches['before'].get('actorPath') == matches['after'].get('actorPath'):
        raise ValueError('Before/after reloaded tooth actors refer to same native path')
    results = {}
    for state, actor in matches.items():
        if actor.get('actorClass') != 'Actor':
            raise ValueError('Reloaded tooth actor class is not native Actor: ' +
                             state + ' class=' + repr(actor.get('actorClass')))
        if not actor.get('actorPath'):
            raise ValueError('Reloaded tooth actor has no native path: ' + state)
        comps = actor.get('proceduralComponents')
        expected_tissues = {m for m, n in counts_by_state[state].items() if n > 0}
        if not isinstance(comps, list) or len(comps) != len(expected_tissues):
            raise ValueError('Reloaded tooth procedural section count differs: ' + state +
                             ' expected=' + str(len(expected_tissues)) +
                             ' actual=' + str(len(comps) if isinstance(comps, list) else None))
        observed = {}
        for comp in comps:
            if not isinstance(comp, dict) or comp.get('componentClass') != 'ProceduralMeshComponent':
                raise ValueError('Reloaded tooth component is not native ProceduralMeshComponent: ' + state)
            tags = comp.get('componentTags')
            if not isinstance(tags, list):
                raise ValueError('Reloaded tooth component tags missing: ' + state)
            normalized = {str(x).lower() for x in tags}
            tissue_tokens = [m for m in MATERIALS if 'kl_tissue_' + m in normalized]
            if len(tissue_tokens) != 1:
                raise ValueError('Reloaded tooth section has missing/ambiguous KL_TISSUE tag: ' +
                                 state + ' tags=' + repr(tags))
            tissue = tissue_tokens[0]
            if tissue not in expected_tissues or tissue in observed:
                raise ValueError('Reloaded tooth tissue is unexpected or duplicated: ' + state + '/' + tissue)
            if type(comp.get('sectionCount')) is not int or comp['sectionCount'] != 1:
                raise ValueError('Reloaded procedural section missing: ' + state + '/' + tissue)
            if comp.get('sectionVisible') is not True:
                raise ValueError('Reloaded procedural section not visible: ' + state + '/' + tissue)
            material_name = comp.get('materialName')
            material_path = comp.get('materialPath')
            token = 'KL_' + tissue
            if material_name != token or not isinstance(material_path, str) or not (
                    material_path.startswith('/Game/') and material_path.endswith('.' + token)):
                raise ValueError('Reloaded original tissue material identity mismatch: ' +
                                 state + '/' + tissue +
                                 ' observed=' + repr([material_name, material_path]))
            observed[tissue] = {
                'savedSectionCount': comp['sectionCount'],
                'savedSectionVisible': comp['sectionVisible'],
                'savedMaterial': material_path,
                'componentName': comp.get('componentName'),
                'componentClass': comp['componentClass'],
                'componentTags': tags
            }
        if set(observed) != expected_tissues:
            raise ValueError('Reloaded native tooth tissue set changed: ' + state)
        results[state] = {m: observed[m] for m in MATERIALS if m in observed}
    return results
