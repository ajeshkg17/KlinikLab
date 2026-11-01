extends Node3D
## Local-only unregistered STL/OBJ surface inspection.
## This is *not* a clinical scan interpretation or diagnostic model.
## 20 MB input and 50000 triangle maximum; no file data sent to network.
const MAX_BYTES := 20 * 1024 * 1024
const MAX_TRIANGLES := 50000

var _mesh_node: MeshInstance3D
var _camera: Camera3D
var _description := "No local scan loaded"
var _triangles := 0
var _last_error := ""
var _wireframe := false

func _init() -> void:
	name = "KL_LOCAL_SCAN_INSPECTOR"
	_mesh_node = MeshInstance3D.new()
	_mesh_node.name = "KL_LOCAL_SCAN_MESH_NOT_PATIENT_REGISTERED"
	add_child(_mesh_node)
	var light := DirectionalLight3D.new()
	light.light_energy = 1.5
	light.rotation_degrees = Vector3(-35, 20, -15)
	add_child(light)
	_camera = Camera3D.new()
	_camera.name = "KL_LOCAL_SCAN_CAMERA"
	_camera.position = Vector3(0, 1.2, 9.0)
	_camera.fov = 48.0
	_camera.rotation.x = -atan2(1.2, 9.0)
	add_child(_camera)
	_camera.current = false

func set_camera_enabled(enabled: bool) -> void:
	_camera.current = enabled

func rotate_model(degrees: float) -> void:
	_mesh_node.rotate_y(deg_to_rad(clampf(degrees, -90.0, 90.0)))

func set_wireframe(enabled: bool) -> void:
	_wireframe = enabled
	if _mesh_node.mesh != null:
		_apply_material(_mesh_node.mesh as ArrayMesh)

func triangle_count() -> int:
	return _triangles

func description() -> String:
	return _description

func error() -> String:
	return _last_error

func load_scan_path(path: String) -> bool:
	var ext := path.get_extension().to_lower()
	if ext not in ["obj", "stl"]:
		_last_error = "Only local OBJ and STL surface meshes supported"
		return false
	if not FileAccess.file_exists(path):
		_last_error = "No readable local scan file"
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() <= 0 or file.get_length() > MAX_BYTES:
		_last_error = "Local file is empty or exceeds the 20 MB safety cap"
		return false
	var bytes := file.get_buffer(file.get_length())
	file.close()
	return load_scan_bytes(bytes, ext, path.get_file())

func load_scan_bytes(bytes: PackedByteArray, format: String, label: String = "local test mesh") -> bool:
	_last_error = ""
	if bytes.size() <= 0 or bytes.size() > MAX_BYTES:
		_last_error = "Local scan byte limit exceeded or empty"
		return false
	if format not in ["obj", "stl"]:
		_last_error = "Only OBJ and STL allowed"
		return false
	var result: Dictionary = _parse_obj(bytes) if format == "obj" else _parse_binary_stl(bytes)
	if not result.get("ok", false):
		_last_error = str(result.get("error", "Local mesh rejected"))
		return false
	var faces: Array = result["faces"]
	if faces.is_empty() or faces.size() > MAX_TRIANGLES:
		_last_error = "Invalid triangle count"
		return false
	var minimum := Vector3(INF, INF, INF)
	var maximum := Vector3(-INF, -INF, -INF)
	for face in faces:
		for p in face:
			minimum = minimum.min(p)
			maximum = maximum.max(p)
	var extent := maximum - minimum
	var longest := maxf(extent.x, maxf(extent.y, extent.z))
	if not is_finite(longest) or longest < 1.0e-7:
		_last_error = "Degenerate scan bounding box"
		return false
	var scale_factor := 4.0 / longest
	var center := (minimum + maximum) * 0.5
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	for face in faces:
		var a: Vector3 = (face[0] - center) * scale_factor
		var b: Vector3 = (face[1] - center) * scale_factor
		var c: Vector3 = (face[2] - center) * scale_factor
		var normal := (b - a).cross(c - a)
		if normal.length_squared() <= 1.0e-16:
			_last_error = "Degenerate surface triangle"
			return false
		normal = normal.normalized()
		for v in [a, b, c]:
			vertices.append(v)
			normals.append(normal)
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	_apply_material(mesh)
	_mesh_node.mesh = mesh
	_mesh_node.rotation = Vector3.ZERO
	_triangles = faces.size()
	_description = "%s | %d triangles | original units UNKNOWN, centered and scaled for viewing only" % [label, _triangles]
	return true

func _apply_material(mesh: ArrayMesh) -> void:
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("#8bc0c5")
	material.roughness = 0.78
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED if _wireframe else BaseMaterial3D.SHADING_MODE_PER_PIXEL
	material.wireframe = _wireframe
	mesh.surface_set_material(0, material)

func _parse_obj(bytes: PackedByteArray) -> Dictionary:
	var raw := bytes.get_string_from_utf8()
	if raw.is_empty() or raw.contains("\u0000"):
		return {"ok": false, "error": "Invalid OBJ UTF8 text"}
	var positions: Array = []
	var faces: Array = []
	for line in raw.split("\n"):
		var row := line.strip_edges()
		if row.is_empty() or row.begins_with("#"):
			continue
		var fields := row.split(" ", false)
		if fields.size() < 1:
			continue
		if fields[0] == "v":
			if fields.size() < 4 or positions.size() >= 150000:
				return {"ok": false, "error": "Too many or invalid source OBJ vertices"}
			for i in range(1, 4):
				if not fields[i].is_valid_float():
					return {"ok": false, "error": "Invalid OBJ vertex coordinate"}
			var point := Vector3(float(fields[1]), float(fields[2]), float(fields[3]))
			if not point.is_finite() or point.length() > 1.0e7:
				return {"ok": false, "error": "Nonfinite or unbounded OBJ geometry"}
			positions.append(point)
		elif fields[0] == "f":
			if fields.size() < 4 or fields.size() > 12:
				return {"ok": false, "error": "Unsupported OBJ polygon face"}
			var corners: Array = []
			for i in range(1, fields.size()):
				var v := fields[i].split("/")[0]
				if not v.is_valid_int():
					return {"ok": false, "error": "OBJ face index malformed"}
				var index := int(v)
				if index < 1 or index > positions.size():
					return {"ok": false, "error": "OBJ forward/relative index not supported"}
				corners.append(positions[index - 1])
			for i in range(1, corners.size() - 1):
				faces.append([corners[0], corners[i], corners[i+1]])
				if faces.size() > MAX_TRIANGLES:
					return {"ok": false, "error": "OBJ exceeds 50000 triangle safety cap"}
	if faces.is_empty():
		return {"ok": false, "error": "OBJ has no valid faces"}
	return {"ok": true, "faces": faces}

func _parse_binary_stl(bytes: PackedByteArray) -> Dictionary:
	if bytes.size() < 84:
		return {"ok": false, "error": "Binary STL header too short"}
	var count := int(bytes.decode_u32(80))
	if count < 1 or count > MAX_TRIANGLES or bytes.size() != 84 + count * 50:
		return {"ok": false, "error": "Binary STL count/length invalid (ASCII STL not supported)"}
	var faces: Array = []
	for i in range(count):
		var off := 84 + i * 50 + 12
		var p: Array = []
		for v in range(3):
			var x := bytes.decode_float(off + v*12)
			var y := bytes.decode_float(off + v*12 + 4)
			var z := bytes.decode_float(off + v*12 + 8)
			var point := Vector3(x, y, z)
			if not point.is_finite() or point.length() > 1.0e7:
				return {"ok": false, "error": "Invalid binary STL coordinate"}
			p.append(point)
		faces.append(p)
	return {"ok": true, "faces": faces}
