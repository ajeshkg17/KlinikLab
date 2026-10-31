"""Strict UE5.8 native material two-sided policy for KlinikLab tissues.

Unreal Material supports "two_sided" directly.
MaterialInstanceConstant does NOT: its two-sided state is controlled through
MaterialInstanceBasePropertyOverrides, with override_two_sided=True.

No generic, wrong-tissue, default or unverified MaterialInterface is accepted.
The *original* imported material asset is retained (path/name unchanged);
no replacement material, modified parent or reduced topology is substituted.
"""


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def ensure_two_sided_native_material(material, tissue, unreal_api):
    """Persist native original tissue material using correct UE editor APIs.

    Importer has already verified exact material/mesh group provenance;
    double-check the KL_<tissue> suffix, never substitute a generic material.
    """
    require(tissue in ('enamel', 'dentin', 'pulp', 'cementum', 'caries'),
            'Unexpected native tissue for two-sided policy: ' + str(tissue))
    require(material is not None, 'Missing original tissue material')
    asset_name = str(material.get_name())
    asset_path = str(material.get_path_name())
    require(asset_name.lower() == 'kl_' + tissue,
            'Original native material identity does not match tissue: ' + asset_name)
    require(asset_path and asset_path.startswith('/Game/'),
            'Native tissue material must be a saved project asset: ' + asset_path)

    if isinstance(material, unreal_api.MaterialInstanceConstant):
        # DO NOT call material.get_editor_property('two_sided'): UE 5.8.4
        # raises "Failed to find property two_sided on MaterialInstanceConstant".
        properties = material.get_editor_property('base_property_overrides')
        require(properties is not None, 'MaterialInstanceConstant missing base overrides')
        properties.set_editor_property('override_two_sided', True)
        properties.set_editor_property('two_sided', True)
        material.set_editor_property('base_property_overrides', properties)
        unreal_api.MaterialEditingLibrary.update_material_instance(material)
        kind = 'MaterialInstanceConstant'
    elif isinstance(material, unreal_api.Material):
        material.set_editor_property('two_sided', True)
        kind = 'Material'
    else:
        raise RuntimeError('Unsupported Unreal tissue material class: ' +
                           str(material.get_class().get_name()))

    require(bool(unreal_api.EditorAssetLibrary.save_loaded_asset(material)),
            'Could not persist original two-sided tissue material: ' + tissue)
    require(str(material.get_name()) == asset_name and
            str(material.get_path_name()) == asset_path,
            'Tissue material identity/path mutated by two-sided policy: ' + tissue)

    if kind == 'MaterialInstanceConstant':
        checked = material.get_editor_property('base_property_overrides')
        require(bool(checked.get_editor_property('override_two_sided')) and
                bool(checked.get_editor_property('two_sided')),
                'Saved native material instance did not retain explicit two-sided override: ' +
                tissue)
        proof = {'overrideTwoSided': True, 'twoSided': True}
    else:
        require(bool(material.get_editor_property('two_sided')),
                'Saved source native Material did not retain two-sided: ' + tissue)
        proof = {'overrideTwoSided': None, 'twoSided': True}

    return {
        'tissue': tissue,
        'materialClass': kind,
        'materialAssetPath': asset_path,
        'twoSidedPolicy': 'MATERIAL_INSTANCE_BASE_PROPERTY_OVERRIDES'
                          if kind == 'MaterialInstanceConstant' else 'MATERIAL_BASE_TWO_SIDED',
        'materialIdentityPreserved': True,
        'materialSavedAndReadbackVerified': True,
        **proof
    }
