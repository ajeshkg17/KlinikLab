extends Node3D
## Source-verified textured Dundee neighbours; external surface meshes only.
## FDI35 (mandibular left second premolar), FDI37 (mandibular left second molar).
## Orientation and seating within this simulated arch are illustrative.
const RAW_RESOLVER = preload("res://raw-source.gd")
const TRAINING_LIGHT_LAYER := 1 << 1
const UPSTREAM_COMMIT := "4f0ffb651998a4641ddf45c7632ea236cc164fcb"
const MODELS := {
	"35": {"basename": "mandibular_left_second_premolar", "blob": "892db94359877442300a6eac7a496dc85cdcaf98"},
	"37": {"basename": "mandibular_second_molar", "blob": "947e90e80a7adb1d30f9cd09e84c9eacc8fc03f0"}
}
var _model: Node3D
var _fdi := ""
var _error := ""
var _mesh_count := 0
var _texture_preserved := false

func configure(expected_sha: String, fdi: String, height: float, max_width: float) -> bool:
	_fdi = fdi
	if not MODELS.has(fdi) or height <= 0.0 or max_width <= 0.0:
		_error = "Unsupported neighbour FDI or fixture dimensions"
		return false
	var info: Dictionary = MODELS[fdi]
	var basename: String = info["basename"]
	var manifest_path := "res://source/tooth-fdi%s-manifest.json" % fdi
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
	if not (parsed is Dictionary):
		_error = "Dundee neighbour source manifest missing for FDI " + fdi
		return false
	var m: Dictionary = parsed
	var original_file := basename + ".glb"
	var training_file := basename + "-training.glb"
	var original_path := "res://assets/dundee/" + original_file + ".source"
	var training_path := "res://assets/dundee/" + training_file
	if str(m.get("sourceGitSHA", "")) != expected_sha or str(m.get("fdi", "")) != fdi or str(m.get("sourceFile", "")) != original_file or str(m.get("originalGitBlobSha", "")) != str(info["blob"]) or str(m.get("upstreamCommit", "")) != UPSTREAM_COMMIT or str(m.get("upstreamPath", "")) != original_file or str(m.get("licenseSPDX", "")) != "CC-BY-4.0" or m.get("surfaceOnly", false) != true or m.get("clinicalAccuracyValidated", true) != false or m.get("trainingTexturePreserved", false) != true or str(m.get("trainingRuntimeFile", "")) != training_file:
		_error = "Dundee FDI%s identity, source or license mismatch" % fdi
		return false
	var raw_sha := str(m.get("originalSha256", ""))
	var converted_sha := str(m.get("trainingSha256", ""))
	if raw_sha.length() != 64 or converted_sha.length() != 64 or RAW_RESOLVER.verified_path(original_path, raw_sha).is_empty() or RAW_RESOLVER.verified_path(training_path + ".source", converted_sha).is_empty():
		_error = "Dundee FDI%s original/training sidecar checksum mismatch" % fdi
		return false
	var resource := load(training_path)
	if not (resource is PackedScene):
		_error = "Dundee FDI%s training GLB import missing" % fdi
		return false
	var instance: Node = (resource as PackedScene).instantiate()
	if not (instance is Node3D):
		_error = "Dundee FDI%s training scene root not Node3D" % fdi
		if instance != null:
			instance.free()
		return false
	_model = instance as Node3D
	var bounds := AABB()
	var has_bounds := false
	for mesh: MeshInstance3D in _model.find_children("*", "MeshInstance3D", true, false):
		if mesh.mesh == null:
			continue
		var local := mesh.transform
		var ancestor := mesh.get_parent_node_3d()
		while ancestor != null:
			local = ancestor.transform * local
			ancestor = ancestor.get_parent_node_3d()
		var current := local * mesh.get_aabb()
		bounds = bounds.merge(current) if has_bounds else current
		has_bounds = true
		_mesh_count += 1
		for index in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(index) as BaseMaterial3D
			if material == null or material.albedo_texture == null or material.albedo_texture.get_width() != 512 or material.albedo_texture.get_height() != 512:
				_error = "Dundee FDI%s training surface missing original 512 px albedo" % fdi
				_model.free()
				_model = null
				return false
		mesh.layers = TRAINING_LIGHT_LAYER
	if not has_bounds or bounds.size.y <= 0.0 or bounds.size.x <= 0.0:
		_error = "Dundee FDI%s converted surface has invalid mesh bounds" % fdi
		_model.free()
		_model = null
		return false
	# Preserve each tooth's proportions, but limit width to avoid merging
	# FDI35/36/37 silhouettes in the illustrative teaching arch.
	var factor: float = minf(height / bounds.size.y, max_width / bounds.size.x)
	var mount := Node3D.new()
	mount.name = "KL_DUNDEE_FDI%s_TEXTURED_SURFACE" % fdi
	mount.scale = Vector3.ONE * factor
	mount.position = -bounds.get_center() * factor
	mount.add_child(_model)
	add_child(mount)
	name = "KL_DUNDEE_FDI%s_CC_BY_4_SURFACE" % fdi
	set_meta("fdi", fdi)
	_texture_preserved = true
	return true

func summary() -> Dictionary:
	return {
		"fdi": _fdi,
		"sourceGitBlobSha": str(MODELS[_fdi]["blob"]) if MODELS.has(_fdi) else "",
		"sourceCommit": UPSTREAM_COMMIT,
		"sourceFile": str(MODELS[_fdi]["basename"]) + ".glb" if MODELS.has(_fdi) else "",
		"meshInstances": _mesh_count, "texturePreserved": _texture_preserved,
		"albedo_px": [512, 512] if _texture_preserved else [],
		"license": "CC-BY-4.0",
		"attribution": "University of Dundee, School of Dentistry",
		"surfaceOnly": true, "internalTissuesProvided": false,
		"illustrativeSeating": true, "clinicalAccuracyValidated": false,
		"error": _error
	}
