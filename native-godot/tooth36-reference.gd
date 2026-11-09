extends Node3D
## Source-verified Dundee mandibular left first molar (FDI 36).
## Surface-only visual reference; never substitutes the editable synthetic volume.
const MANIFEST := "res://source/tooth-fdi36-manifest.json"
const RAW_SOURCE := "res://assets/dundee/mandibular_first_molar.glb.source"
const CONVERTED_RAW_SOURCE := "res://assets/dundee/mandibular_first_molar-godot.glb.source"
const GODOT_SCENE := "res://assets/dundee/mandibular_first_molar-godot.glb"
const TRAINING_FILE := "mandibular_first_molar-training.glb"
const TRAINING_SCENE := "res://assets/dundee/" + TRAINING_FILE
const TRAINING_LIGHT_LAYER := 1 << 1
const RAW_RESOLVER = preload("res://raw-source.gd")
const SOURCE_BLOB := "73e9f3029d770c6b4052ebbaba708283de4c47fd"
const SOURCE_COMMIT := "4f0ffb651998a4641ddf45c7632ea236cc164fcb"
var _tooth: Node3D
var _fallback: Node3D
var _mesh_count := 0
var _error := ""
var _configured := false
var _texture_preserved := false

func configure(expected_sha: String, training_height := 0.0) -> bool:
	if _configured:
		_error = "FDI36 reference configured twice"
		return false
	_configured = true
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(MANIFEST))
	if not (parsed is Dictionary):
		_error = "FDI36 source manifest missing"
		_show_missing_fallback()
		return true
	var m: Dictionary = parsed
	if str(m.get("sourceGitSHA","")) != expected_sha or str(m.get("caseId","")) != "endo" or str(m.get("fdi","")) != "36" or str(m.get("originalGitBlobSha","")) != SOURCE_BLOB or str(m.get("upstreamCommit","")) != SOURCE_COMMIT or str(m.get("licenseSPDX","")) != "CC-BY-4.0" or m.get("surfaceOnly",false) != true or m.get("internalTissuesProvided",true) != false or m.get("clinicalAccuracyValidated",true) != false:
		_error = "FDI36 source identity, license or surface-only contract rejected"
		_show_missing_fallback()
		return true
	var raw_sha := str(m.get("originalSha256",""))
	if raw_sha.length() != 64 or RAW_RESOLVER.verified_path(RAW_SOURCE,raw_sha).is_empty():
		_error = "Original Dundee FDI36 GLB sidecar missing or SHA256 mismatch"
		_show_missing_fallback()
		return true
	var converted_sha := str(m.get("convertedSha256",""))
	if converted_sha.length() != 64 or RAW_RESOLVER.verified_path(CONVERTED_RAW_SOURCE,converted_sha).is_empty():
		_error = "Godot-compatible FDI36 conversion sidecar missing or SHA256 mismatch"
		_show_missing_fallback()
		return true
	var scene_path := GODOT_SCENE
	if training_height > 0.0:
		var training_sha := str(m.get("trainingSha256",""))
		if m.get("trainingRuntimeFile") != TRAINING_FILE or m.get("trainingSidecar") != TRAINING_FILE + ".source" or m.get("trainingTexturePreserved") != true or training_sha.length() != 64 or RAW_RESOLVER.verified_path(TRAINING_SCENE + ".source", training_sha).is_empty():
			_error = "Textured FDI36 training sidecar missing or SHA256 mismatch"
			_show_missing_fallback()
			return true
		scene_path = TRAINING_SCENE
	var resource := load(scene_path)
	if not (resource is PackedScene):
		_error = "Godot could not import converted Dundee FDI36 GLB"
		_show_missing_fallback()
		return true
	var instance: Node = (resource as PackedScene).instantiate()
	if not (instance is Node3D):
		_error = "Converted Dundee FDI36 root is not Node3D"
		instance.free()
		_show_missing_fallback()
		return true
	_tooth = instance as Node3D
	_tooth.name = "KL_DUNDEE_FDI36_CC_BY_4_SURFACE_REFERENCE"
	_mesh_count = _count_meshes(_tooth)
	if _mesh_count < 1 or (training_height > 0.0 and not _mount_textured_training_tooth(training_height)):
		_tooth.free()
		_tooth = null
		_mesh_count = 0
		_error = "FDI36 surface has no usable mesh or training texture"
		_show_missing_fallback()
		return true
	if training_height <= 0.0:
		_tooth.position = Vector3(-2.7,0.15,0.0)
		_tooth.scale = Vector3.ONE * 0.72
		add_child(_tooth)
	name = "KL_DUNDEE_FDI36_SOURCE_SURFACE_REFERENCE"
	return true

func _mount_textured_training_tooth(height: float) -> bool:
	var bounds := AABB()
	var has_bounds := false
	for mesh: MeshInstance3D in _tooth.find_children("*", "MeshInstance3D", true, false):
		if mesh.mesh == null:
			continue
		var local := mesh.transform
		var ancestor := mesh.get_parent_node_3d()
		while ancestor != null:
			local = ancestor.transform * local
			ancestor = ancestor.get_parent_node_3d()
		var mesh_bounds := local * mesh.get_aabb()
		bounds = bounds.merge(mesh_bounds) if has_bounds else mesh_bounds
		has_bounds = true
		for surface in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(surface) as BaseMaterial3D
			if material == null or material.albedo_texture == null:
				return false
		mesh.layers = TRAINING_LIGHT_LAYER
	if not has_bounds or bounds.size.y <= 0.0:
		return false
	var factor := height / bounds.size.y
	var mount := Node3D.new()
	mount.position = -bounds.get_center() * factor
	mount.scale = Vector3.ONE * factor
	mount.add_child(_tooth)
	add_child(mount)
	_texture_preserved = true
	return true

func _count_meshes(node: Node) -> int:
	var n := 1 if node is MeshInstance3D and (node as MeshInstance3D).mesh != null else 0
	for child in node.get_children():
		n += _count_meshes(child)
	return n

func _show_missing_fallback() -> void:
	if _tooth != null or _fallback != null:
		return
	_fallback = Node3D.new()
	_fallback.name = "KL_DUNDEE_FDI36_SURFACE_ASSET_MISSING_FALLBACK"
	_fallback.position = Vector3(-2.7,0.0,0.0)
	var label := Label3D.new()
	label.text = "FDI 36 surface model unavailable\nSource asset missing or invalid"
	label.position = Vector3(0.0,1.1,0.0)
	_fallback.add_child(label)
	add_child(_fallback)
	name = "KL_DUNDEE_FDI36_SOURCE_SURFACE_REFERENCE"

func force_missing_fallback_for_test() -> void:
	if _tooth != null:
		_tooth.queue_free()
		_tooth = null
	_mesh_count = 0
	_texture_preserved = false
	if _fallback != null:
		_fallback.queue_free()
		_fallback = null
	_error = "Synthetic missing-asset regression path"
	_show_missing_fallback()

func set_reference_visible(enabled: bool) -> void:
	visible = enabled

func summary() -> Dictionary:
	return {
		"fdi":"36","caseId":"endo","assetLoaded":_tooth != null,
		"fallbackVisible":_fallback != null,"meshInstances":_mesh_count,
		"sourceGitBlobSha":SOURCE_BLOB,"sourceCommit":SOURCE_COMMIT,
		"license":"CC-BY-4.0","attribution":"University of Dundee, School of Dentistry",
		"surfaceOnly":true,"internalTissuesProvided":false,
		"clinicalAccuracyValidated":false,"texturePreserved":_texture_preserved,
		"error":_error
	}
