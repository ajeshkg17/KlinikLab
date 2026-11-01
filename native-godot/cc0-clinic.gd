extends Node3D
## Reviewed CC0 STATIC dental clinic, not anatomy, calibrated apparatus or patient data.
## Exact publisher binaries from 3DAssets.dev, documented in source-manifest.json.
const MANIFEST := "res://source/cc0-clinic-manifest.json"
const CLINIC := "res://cc0/whole-clinic-starter-v1.glb"
const TRAY := "res://cc0/instrument-tray-v1.glb"
const CLINIC_SHA := "9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a"
const TRAY_SHA := "63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036"

var _error := ""
var _clinic: Node3D
var _tray: Node3D
var _clinic_meshes := 0
var _tray_meshes := 0

func error() -> String:
	return _error

func summary() -> Dictionary:
	return {"clinicMeshes":_clinic_meshes, "trayMeshes":_tray_meshes,
		"clinicSourceSha256":CLINIC_SHA, "traySourceSha256":TRAY_SHA,
		"license":"CC0-1.0", "clinicalValidated":false,
		"fdiAnatomySupplied":false, "provenance":"3dassets.dev; reviewed exact originals"}

func _count_meshes(parent: Node) -> int:
	var count := 1 if parent is MeshInstance3D and (parent as MeshInstance3D).mesh != null else 0
	for child in parent.get_children():
		count += _count_meshes(child)
	return count

func _load_glb(file: String) -> Node3D:
	if not ResourceLoader.exists(file):
		_error = "Godot-imported reviewed CC0 GLB unavailable: " + file
		return null
	var resource: Resource = ResourceLoader.load(file)
	if not (resource is PackedScene):
		_error = "Godot import did not produce PackedScene: " + file
		return null
	var instance: Node = (resource as PackedScene).instantiate()
	if not (instance is Node3D):
		_error = "CC0 GLB root is not Node3D: " + file
		instance.free()
		return null
	return instance

func configure(source_sha: String) -> bool:
	if source_sha.length() != 40:
		_error = "Invalid native app source SHA for CC0 import"
		return false
	var info: Variant = JSON.parse_string(FileAccess.get_file_as_string(MANIFEST))
	if not (info is Dictionary):
		_error = "Reviewed CC0 manifest absent"
		return false
	var m: Dictionary = info
	if str(m.get("appGitSHA","")) != source_sha or str(m.get("kind","")) != "REVIEWED_CC0_CLINIC_STATIC_VISUAL_ONLY" or str(m.get("licenseSPDX","")) != "CC0-1.0" or m.get("clinicalValidated",true) != false:
		_error = "CC0 source provenance, exact app revision or clinical status mismatch"
		return false
	var assets: Dictionary = m.get("assets",{})
	if assets.size()!=2:
		_error = "Expected exactly two independently reviewed static CC0 source assets"
		return false
	for item in [{"id":"whole-clinic-starter","file":CLINIC,"sha":CLINIC_SHA},
				 {"id":"instrument-tray","file":TRAY,"sha":TRAY_SHA}]:
		var id: String = str(item["id"])
		var row: Dictionary = assets.get(id,{})
		var filepath: String = str(item["file"])
		if (str(row.get("path","")) != filepath or
			str(row.get("sha256","")) != str(item["sha"]) or
			str(row.get("status","")) != "STATIC_VISUAL_ONLY"):
			_error = "Independent reviewed CC0 source manifest mismatch for " + id
			return false
		if not FileAccess.file_exists(filepath) or FileAccess.get_sha256(filepath)!=str(item["sha"]):
			_error = "Missing/mutated ORIGINAL CC0 GLB bytes for " + id
			return false
	_clinic = _load_glb(CLINIC)
	if _clinic == null:
		return false
	_tray = _load_glb(TRAY)
	if _tray == null:
		_clinic.free()
		_clinic = null
		return false
	_clinic_meshes = _count_meshes(_clinic)
	_tray_meshes = _count_meshes(_tray)
	if _clinic_meshes < 100 or _tray_meshes < 2:
		_error = "Imported CC0 environment is unexpectedly missing mesh objects"
		_clinic.free()
		_tray.free()
		_clinic = null
		_tray = null
		return false
	_clinic.name = "KL_REVIEWED_CC0_WHOLE_CLINIC_NO_FDI_ANATOMY"
	_tray.name = "KL_REVIEWED_CC0_TRAY_STATIC_NOT_MANIPULABLE"
	add_child(_clinic)
	add_child(_tray)
	# The publisher's glTF uses the Blender -> glTF Y-up conversion. Keep the
	# unchanged originals; only move the two imported scene instances.
	# Place assembled clinic behind the original FDI comparison workspace.
	_clinic.position = Vector3(0.0, -2.9, -11.0)
	_tray.position = Vector3(-3.1, -1.35, -2.5)
	print("SR13_REVIEWED_CC0_CLINIC_LOADED_3D clinic_meshes=", _clinic_meshes,
		" tray_meshes=", _tray_meshes, " FDI_FROM_SEPARATE_SOURCE_SHA=",source_sha)
	return true

func set_clinic_visible(enabled: bool) -> void:
	visible = enabled
