extends Node3D
## Pinned Dundee mandibular LEFT 35/37 exterior surfaces, used only as
## independently identified, textured neighbours in the synthetic chair arch.
## These are CC BY 4.0 surface references, not patient images or root anatomy.
const RAW_RESOLVER = preload("res://raw-source.gd")
const TRAINING_LIGHT_LAYER := 1 << 1
const SOURCE_COMMIT := "4f0ffb651998a4641ddf45c7632ea236cc164fcb"
const UPSTREAM := "sameralseedbth-Dental/dental-3d-models"
const MODELS := {
	"35": {
		"file": "mandibular_left_second_premolar",
		"blob": "892db94359877442300a6eac7a496dc85cdcaf98",
		"name": "mandibular left second premolar"
	},
	"37": {
		"file": "mandibular_second_molar",
		"blob": "947e90e80a7adb1d30f9cd09e84c9eacc8fc03f0",
		"name": "mandibular left second molar"
	}
}

var _fdi := ""
var _surface: Node3D
var _mesh_count := 0
var _error := ""
var _texture_size := Vector2i.ZERO
var _configured := false

func configure(source_sha: String, fdi: String, target_height: float) -> bool:
	if _configured or not MODELS.has(fdi) or target_height <= 0.0:
		_error = "Invalid or repeated Dundee neighbour configuration"
		return false
	_configured = true
	_fdi = fdi
	var spec: Dictionary = MODELS[fdi]
	var basename: String = spec["file"]
	var model_dir := "res://assets/dundee/"
	var raw := model_dir + basename + ".glb.source"
	var scene_path := model_dir + basename + "-training.glb"
	var manifest_path := "res://source/tooth-fdi%s-neighbour-manifest.json" % fdi
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
	if not (parsed is Dictionary):
		_error = "Dundee FDI%s manifest missing or invalid" % fdi
		return false
	var m: Dictionary = parsed
	if m.get("schemaVersion") != 1 or m.get("sourceGitSHA") != source_sha or m.get("caseId") != "extraction" or m.get("fdi") != fdi or m.get("sourceFile") != basename + ".glb" or m.get("originalGitBlobSha") != spec["blob"] or m.get("upstreamCommit") != SOURCE_COMMIT or m.get("upstreamRepository") != UPSTREAM or m.get("licenseSPDX") != "CC-BY-4.0" or m.get("surfaceOnly") != true or m.get("clinicalAccuracyValidated") != false or m.get("trainingTexturePreserved") != true:
		_error = "FDI%s source, licence or surface-only contract rejected" % fdi
		return false
	if m.get("originalSidecar") != basename + ".glb.source" or m.get("trainingRuntimeFile") != basename + "-training.glb" or m.get("trainingSidecar") != basename + "-training.glb.source":
		_error = "FDI%s source file mapping mismatch" % fdi
		return false
	var original_sha := str(m.get("originalSha256", ""))
	var training_sha := str(m.get("trainingSha256", ""))
	if original_sha.length() != 64 or training_sha.length() != 64 or RAW_RESOLVER.verified_path(raw, original_sha).is_empty() or RAW_RESOLVER.verified_path(scene_path + ".source", training_sha).is_empty():
		_error = "FDI%s original or textured conversion failed SHA256 sidecar verification" % fdi
		return false
	var resource: Resource = load(scene_path)
	if not (resource is PackedScene):
		_error = "Godot could not import textured Dundee FDI%s model" % fdi
		return false
	var instance: Node = (resource as PackedScene).instantiate()
	if not (instance is Node3D):
		_error = "FDI%s scene root was not Node3D" % fdi
		if instance != null:
			instance.free()
		return false
	_surface = instance as Node3D
	_surface.name = "KL_DUNDEE_FDI%s_CC_BY_4_TEXTURED_SURFACE" % fdi
	if not _mount_original_surface(target_height):
		_error = "FDI%s mesh missing or original 512px albedo not imported" % fdi
		_surface.free()
		_surface = null
		return false
	name = "KL_DUNDEE_FDI%s_TEXTURED_NEIGHBOUR" % fdi
	return true

func _mount_original_surface(height: float) -> bool:
	# Use the verified FDI36 source-space bounds normalization and preserve
	# imported textures, normals, topology, silhouettes and node transforms.
	var bounds := AABB()
	var has_bounds := false
	for mesh: MeshInstance3D in _surface.find_children("*", "MeshInstance3D", true, false):
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
		_mesh_count += 1
		for surface in range(mesh.mesh.get_surface_count()):
			var material := mesh.get_active_material(surface) as BaseMaterial3D
			if material == null or material.albedo_texture == null:
				return false
			var texture: Texture2D = material.albedo_texture
			if texture.get_width() != 512 or texture.get_height() != 512:
				return false
			_texture_size = Vector2i(512, 512)
		mesh.layers = TRAINING_LIGHT_LAYER
	if not has_bounds or bounds.size.y <= 0.0 or _texture_size != Vector2i(512, 512):
		return false
	var factor := height / bounds.size.y
	var mount := Node3D.new()
	mount.name = "KL_DUNDEE_NEIGHBOUR_BOUNDS_MOUNT"
	mount.position = -bounds.get_center() * factor
	mount.scale = Vector3.ONE * factor
	mount.add_child(_surface)
	add_child(mount)
	return true

func summary() -> Dictionary:
	var spec: Dictionary = MODELS.get(_fdi, {})
	return {
		"fdi": _fdi, "anatomicalIdentity": spec.get("name", ""),
		"assetLoaded": _surface != null, "meshInstances": _mesh_count,
		"sourceGitBlobSha": spec.get("blob", ""), "sourceCommit": SOURCE_COMMIT,
		"license": "CC-BY-4.0", "attribution": "University of Dundee, School of Dentistry",
		"albedo_px": [_texture_size.x, _texture_size.y],
		"texturePreserved": _surface != null and _texture_size == Vector2i(512, 512),
		"surfaceOnly": true, "internalTissuesProvided": false,
		"clinicalAccuracyValidated": false, "illustrativeChairPlacement": true,
		"error": _error
	}
