extends Node3D
## SR13: live static CC0 clinic/environment, not patient anatomy/instruments.
## Only two reviewed source-original GLBs, hashes and CC0 terms pinned.
const ROOT := "res://assets/cc0/3dassets-dental/"
const RAW_RESOLVER = preload("res://raw-source.gd")
const INDEX := ROOT + "clinic-manifest.json"
const WHOLE := "whole-clinic-starter-v1.glb"
const TRAY := "instrument-tray-v1.glb"
const HASHES := {
	WHOLE:"9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a",
	TRAY:"63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036"
}
const BYTES := {WHOLE:1177948,TRAY:30452}
var _error := ""
var _source_sha := ""
var _whole: Node3D
var _tray: Node3D
var _whole_meshes := 0
var _tray_meshes := 0

func error() -> String:
	return _error

func _mesh_count(root: Node) -> int:
	var result := 1 if root is MeshInstance3D and (root as MeshInstance3D).mesh != null else 0
	for child in root.get_children():
		result += _mesh_count(child)
	return result

func configure(expected_sha: String) -> bool:
	if not _source_sha.is_empty():
		_error="Static clinic configured twice"
		return false
	var source: Variant = JSON.parse_string(FileAccess.get_file_as_string(INDEX))
	if not (source is Dictionary):
		_error = "CC0 clinic manifest missing"
		return false
	var m: Dictionary = source
	if str(m.get("sourceGitSHA",""))!=expected_sha or str(m.get("licenseSPDX",""))!="CC0-1.0" or str(m.get("kind",""))!="REVIEWED_CC0_NATIVE_CLINIC_BACKGROUND_NOT_CLINICAL_APP_ANATOMY" or m.get("sourcePackReconciledBySHA256",false)!=true or str(m.get("godotConversion",""))!="DETERMINISTIC_FLOAT32_VERTEX_ACCESSORS_PRESERVE_ORIGINAL_KHR_QUANTIZED_GLB" or m.get("clinicalAccuracyValidated",true)!=false:
		_error = "CC0 static clinic license or source SHA contract rejected"
		return false
	var assets: Array = m.get("assets",[])
	if assets.size()!=2:
		_error = "Incomplete reviewed static clinic selection"
		return false
	for i in range(2):
		var file: String = WHOLE if i==0 else TRAY
		var row: Dictionary = assets[i]
		if str(row.get("name",""))!=file or str(row.get("sha256",""))!=str(HASHES[file]) or int(row.get("bytes",-1))!=int(BYTES[file]):
			_error = "Reviewed CC0 asset identity/hash mismatch "+file
			return false
		var filepath := ROOT+file+".source"
		if RAW_RESOLVER.verified_path(filepath,str(HASHES[file])).is_empty():
			_error = "Missing/corrupt ORIGINAL CC0 bytes (editor or exported EXE sidecar): "+file
			return false
		# Original source GLB uses KHR_mesh_quantization. Stock Godot
		# requires the separately hashed, deterministic float32 conversion.
		var compatible: String = file.replace(".glb","-godot.glb")
		if str(row.get("godotFile","")) != compatible or str(row.get("godotSha256","")).length()!=64:
			_error = "Godot compatibility source manifest missing "+file
			return false
		var native_path := ROOT+compatible
		if RAW_RESOLVER.verified_path(native_path,str(row.get("godotSha256",""))).is_empty():
			_error = "Missing/corrupt verified RAW converted CC0 bytes in exported EXE sidecar: "+file
			return false
		var resource := load(native_path)
		if not (resource is PackedScene):
			_error = "Godot did not import original CC0 GLB into a PackedScene: "+file
			return false
		var node: Node = (resource as PackedScene).instantiate()
		if not (node is Node3D):
			_error = "CC0 imported root is not Node3D "+file
			node.free()
			return false
		var meshes := _mesh_count(node)
		if meshes < (20 if i==0 else 1):
			_error = "CC0 GLB decoded but no complete clinic/prop meshes: "+file
			node.free()
			return false
		var scene: Node3D = node
		if i==0:
			_whole=scene
			_whole_meshes=meshes
			scene.name = "KL_SOURCE_CC0_WHOLE_CLINIC"
			# Keep original world transform and units; locate background behind
			# source FDI comparison podiums, not as FDI patient anatomy.
			scene.position = Vector3(0.0,-3.0,-20.0)
		else:
			_tray=scene
			_tray_meshes=meshes
			scene.name = "KL_SOURCE_CC0_TRAY_STATIC_PROP"
			# Static decor; source-procedural instrument logic remains independent.
			scene.position = Vector3(-8.8,-1.35,-3.0)
		add_child(scene)
	_source_sha=expected_sha
	name="KL_CC0_3DASSETS_WHOLE_CLINIC_STATIC"
	return true

func summary() -> Dictionary:
	return {"sourceGitSHA":_source_sha,"wholeSceneLoaded":_whole!=null,
		"wholeMeshInstances":_whole_meshes,"trayLoaded":_tray!=null,
		"trayMeshInstances":_tray_meshes,"license":"CC0-1.0",
		"sourceOriginalGLBsHashVerified":not _source_sha.is_empty(),
		"godotFloat32MeshesImported":_whole_meshes>20 and _tray_meshes>0,
		"clinicalAccuracyValidated":false,
		"patientFDIAnatomyProvided":false,
		"workflowProvided":false,
		"kind":"STATIC_CC0_CLINIC_ENVIRONMENT_NOT_TREATMENT_SIMULATION"}

func set_environment_visible(enabled: bool) -> void:
	visible=enabled
