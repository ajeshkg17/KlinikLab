extends Node3D
## Source-verified Dundee maxillary left first molar (FDI 26).
## Surface-only visual reference; never substitutes the editable synthetic volume.
const MANIFEST := "res://source/tooth-fdi26-manifest.json"
const RAW_SOURCE := "res://assets/dundee/maxillary_first_molar.glb.source"
const CONVERTED_RAW_SOURCE := "res://assets/dundee/maxillary_first_molar-godot.glb.source"
const GODOT_SCENE := "res://assets/dundee/maxillary_first_molar-godot.glb"
const RAW_RESOLVER = preload("res://raw-source.gd")
const SOURCE_BLOB := "0948d093089c5921281185a103b323c513365502"
const SOURCE_COMMIT := "4f0ffb651998a4641ddf45c7632ea236cc164fcb"
var _tooth: Node3D
var _fallback: Node3D
var _mesh_count := 0
var _error := ""
var _configured := false

func configure(expected_sha: String) -> bool:
	if _configured:
		_error = "FDI26 reference configured twice"
		return false
	_configured = true
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(MANIFEST))
	if not (parsed is Dictionary):
		_error = "FDI26 source manifest missing"
		_show_missing_fallback()
		return true
	var m: Dictionary = parsed
	if str(m.get("sourceGitSHA","")) != expected_sha or str(m.get("caseId","")) != "crown" or str(m.get("fdi","")) != "26" or str(m.get("originalGitBlobSha","")) != SOURCE_BLOB or str(m.get("upstreamCommit","")) != SOURCE_COMMIT or str(m.get("licenseSPDX","")) != "CC-BY-4.0" or m.get("surfaceOnly",false) != true or m.get("internalTissuesProvided",true) != false or m.get("clinicalAccuracyValidated",true) != false:
		_error = "FDI26 source identity, license or surface-only contract rejected"
		_show_missing_fallback()
		return true
	var raw_sha := str(m.get("originalSha256",""))
	if raw_sha.length() != 64 or RAW_RESOLVER.verified_path(RAW_SOURCE,raw_sha).is_empty():
		_error = "Original Dundee FDI26 GLB sidecar missing or SHA256 mismatch"
		_show_missing_fallback()
		return true
	var converted_sha := str(m.get("convertedSha256",""))
	if converted_sha.length() != 64 or RAW_RESOLVER.verified_path(CONVERTED_RAW_SOURCE,converted_sha).is_empty():
		_error = "Godot-compatible FDI26 conversion sidecar missing or SHA256 mismatch"
		_show_missing_fallback()
		return true
	var resource := load(GODOT_SCENE)
	if not (resource is PackedScene):
		_error = "Godot could not import converted Dundee FDI26 GLB"
		_show_missing_fallback()
		return true
	var instance: Node = (resource as PackedScene).instantiate()
	if not (instance is Node3D):
		_error = "Converted Dundee FDI26 root is not Node3D"
		instance.free()
		_show_missing_fallback()
		return true
	_tooth = instance as Node3D
	_tooth.name = "KL_DUNDEE_FDI26_CC_BY_4_SURFACE_REFERENCE"
	_tooth.position = Vector3(-2.7,0.15,0.0)
	_tooth.scale = Vector3.ONE * 0.72
	add_child(_tooth)
	_mesh_count = _count_meshes(_tooth)
	if _mesh_count < 1:
		_tooth.queue_free()
		_tooth = null
		_error = "Converted FDI26 surface mesh contains no MeshInstance3D"
		_show_missing_fallback()
		return true
	name = "KL_DUNDEE_FDI26_SOURCE_SURFACE_REFERENCE"
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
	_fallback.name = "KL_DUNDEE_FDI26_SURFACE_ASSET_MISSING_FALLBACK"
	_fallback.position = Vector3(-2.7,0.0,0.0)
	var label := Label3D.new()
	label.text = "FDI 26 surface model unavailable\nSource asset missing or invalid"
	label.position = Vector3(0.0,1.1,0.0)
	_fallback.add_child(label)
	add_child(_fallback)
	name = "KL_DUNDEE_FDI26_SOURCE_SURFACE_REFERENCE"

func force_missing_fallback_for_test() -> void:
	if _tooth != null:
		_tooth.queue_free()
		_tooth = null
	_mesh_count = 0
	if _fallback != null:
		_fallback.queue_free()
		_fallback = null
	_error = "Synthetic missing-asset regression path"
	_show_missing_fallback()

func set_reference_visible(enabled: bool) -> void:
	visible = enabled

func summary() -> Dictionary:
	return {
		"fdi":"26","caseId":"crown","assetLoaded":_tooth != null,
		"fallbackVisible":_fallback != null,"meshInstances":_mesh_count,
		"sourceGitBlobSha":SOURCE_BLOB,"sourceCommit":SOURCE_COMMIT,
		"license":"CC-BY-4.0","attribution":"University of Dundee, School of Dentistry",
		"surfaceOnly":true,"internalTissuesProvided":false,
		"clinicalAccuracyValidated":false,"texturePreserved":false,
		"error":_error
	}
