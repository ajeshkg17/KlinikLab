extends Node3D
## SR1C source-exact KlinikLab educational molar native Godot 4.7 proof.
## This script does not load Dundee data or Quest/streaming code.
## It reads ORIGINAL production OBJ face streams, retains five tissues and
## refuses incorrect SHA/material identities/counts. Actual pixels/GPU pending.

const TISSUES: Array[String] = ["enamel", "dentin", "pulp", "cementum", "caries"]
const COLORS: Dictionary = {
	"enamel": Color(0.94, 0.90, 0.80),
	"dentin": Color(0.86, 0.65, 0.42),
	"pulp": Color(0.72, 0.30, 0.38),
	"cementum": Color(0.62, 0.51, 0.43),
	"caries": Color(0.40, 0.27, 0.27)
}
const SOURCE_PREFIX := "res://source/"
const STATE_FILES := {"before": "fdi16-before.obj", "after": "fdi16-after-cut.obj"}
const DISPLAY_SCALE := 0.1  # exported 10 cm/model-unit -> Godot display units

var _report: Dictionary = {}
var _ready_for_capture := false

func _fail(reason: String) -> bool:
	_report["status"] = "BLOCKED"
	_report["error"] = reason
	push_error("SR1C native clinical scene FAILED: " + reason)
	_write_report()
	get_tree().quit(2)
	return false

func _ready() -> void:
	var expected_sha := FileAccess.get_file_as_string(SOURCE_PREFIX + "expected-sha.txt").strip_edges()
	if expected_sha.length() != 40:
		_fail("Missing exact 40-character source SHA")
		return
	var manifest_text := FileAccess.get_file_as_string(SOURCE_PREFIX + "kliniklab-export-manifest.json")
	var parsed: Variant = JSON.parse_string(manifest_text)
	if not (parsed is Dictionary):
		_fail("Missing or invalid immutable production OBJ manifest")
		return
	var manifest: Dictionary = parsed
	if str(manifest.get("sourceGitSHA", "")) != expected_sha:
		_fail("Production manifest does not match pinned Git source SHA")
		return
	if str(manifest.get("fdi", "")) != "16" or str(manifest.get("procedure", "")) != "restoration":
		_fail("Expected original FDI16 restoration, not external/relabeled anatomy")
		return
	if manifest.get("importedThirdPartyAssets", ["unsupported"]) != []:
		_fail("Unapproved third-party geometry in original clinical source")
		return
	var originals: Dictionary = manifest.get("originals", {})
	for source_name in ["fdi16-before.obj", "fdi16-after-cut.obj", "kliniklab-fdi16.mtl"]:
		if not originals.has(source_name):
			_fail("Original source manifest missing " + source_name)
			return
		if FileAccess.get_sha256(SOURCE_PREFIX + source_name) != str(originals[source_name]):
			_fail("Original source SHA-256 mismatch for " + source_name)
			return
	_report = {
		"kind": "SR1C native Godot source-exact FDI16 submission, NOT clinical/GPU acceptance",
		"sourceGitSHA": expected_sha, "engine": str(Engine.get_version_info()),
		"renderingMethod": RenderingServer.get_current_rendering_method(),
		"renderingDriver": RenderingServer.get_current_rendering_driver_name(),
		"states": {}, "sourceProvenanceVerified": true,
		"nativeScreenshotReviewed": false, "processGpuVerified": false,
		"questVerified": false, "status": "SOURCE_GEOMETRY_LOADING"
	}
	if str(_report["renderingMethod"]) != "forward_plus":
		_fail("Native Forward+ rendering required; no silent quality fallback: " +
			str(_report["renderingMethod"]))
		return
	var all_min := Vector3(INF, INF, INF)
	var all_max := Vector3(-INF, -INF, -INF)
	var states: Dictionary = manifest.get("sceneStates", {})
	for state in ["before", "after"]:
		if not states.has(state):
			_fail("Missing source state " + state)
			return
		var expected_counts: Dictionary = states[state].get("byMaterial", {})
		if expected_counts.size() != 5:
			_fail("Missing five source material groups " + state)
			return
		var source_path := SOURCE_PREFIX + str(STATE_FILES[state])
		var parsed_mesh: Dictionary = _parse_obj(source_path)
		if not parsed_mesh.get("ok", false):
			_fail(state + ": " + str(parsed_mesh.get("error", "source OBJ invalid")))
			return
		var root := Node3D.new()
		root.name = "KL_FDI16_" + state.to_upper()
		root.position.x = -2.9 if state == "before" else 2.9
		add_child(root)
		var by_tissue: Dictionary = parsed_mesh["byTissue"]
		var state_report: Dictionary = {"tissues": {}, "nativeSurfaceCount": 0, "submittedTriangles": 0}
		for tissue in TISSUES:
			if not expected_counts.has(tissue):
				_fail("Unexpected source material identity " + tissue)
				return
			var faces: Array = by_tissue[tissue]
			var expected: int = int(expected_counts[tissue])
			if faces.size() != expected or expected <= 0:
				_fail("Source face parity failed " + state + "/" + tissue)
				return
			var vertices := PackedVector3Array()
			var normals := PackedVector3Array()
			var indices := PackedInt32Array()
			for face in faces:
				var a: Vector3 = face[0]
				var bb: Vector3 = face[1]
				var c: Vector3 = face[2]
				var normal: Vector3 = (bb - a).cross(c - a)
				if normal.length_squared() < 1.0e-24:
					_fail("Source face degenerate after Godot axis transform " + state + "/" + tissue)
					return
				normal = normal.normalized()
				var start := vertices.size()
				for v in [a, bb, c]:
					vertices.append(v)
					normals.append(normal)
				indices.append(start)
				indices.append(start + 1)
				indices.append(start + 2)
			if vertices.size() != expected * 3 or indices.size() != expected * 3:
				_fail("Native indexed triangle parity failed " + state + "/" + tissue)
				return
			var mesh_arrays: Array = []
			mesh_arrays.resize(Mesh.ARRAY_MAX)
			mesh_arrays[Mesh.ARRAY_VERTEX] = vertices
			mesh_arrays[Mesh.ARRAY_NORMAL] = normals
			mesh_arrays[Mesh.ARRAY_INDEX] = indices
			var mesh := ArrayMesh.new()
			mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, mesh_arrays)
			if mesh.get_surface_count() != 1 or mesh.surface_get_array_index_len(0) != expected * 3:
				_fail("Native Godot ArrayMesh lost material/source topology " + state + "/" + tissue)
				return
			var surface_material := StandardMaterial3D.new()
			surface_material.albedo_color = COLORS[tissue]
			surface_material.roughness = 0.64
			surface_material.metallic = 0.0
			surface_material.cull_mode = BaseMaterial3D.CULL_DISABLED
			mesh.surface_set_material(0, surface_material)
			var node := MeshInstance3D.new()
			node.name = "KL_" + tissue
			node.mesh = mesh
			root.add_child(node)
			state_report["tissues"][tissue] = {
				"sourceTriangles": expected, "nativeSubmittedIndices": indices.size(),
				"surfaceCount": mesh.get_surface_count(),
				"meshClass": node.get_class(), "materialName": node.name
			}
			state_report["nativeSurfaceCount"] += 1
			state_report["submittedTriangles"] += expected
			for p in vertices:
				var world: Vector3 = p + root.position
				all_min = all_min.min(world)
				all_max = all_max.max(world)
		if state_report["nativeSurfaceCount"] != 5 or state_report["submittedTriangles"] != int(states[state]["triangles"]):
			_fail("Expected five native tissue sections and exact aggregate source faces " + state)
			return
		_report["states"][state] = state_report
	if int(_report["states"]["before"]["submittedTriangles"]) != 14856 or int(_report["states"]["after"]["submittedTriangles"]) != 14936:
		_fail("Original production FDI16 total triangle counts unexpectedly changed")
		return
	_make_lighting_and_camera(all_min, all_max)
	_make_overlay()
	_report["status"] = "NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU"
	_ready_for_capture = true
	_write_report()
	print("SR1C SOURCE SUBMISSION SUCCESS (not pixel/GPU acceptance) SHA=" + expected_sha)

func _parse_obj(path: String) -> Dictionary:
	if not FileAccess.file_exists(path):
		return {"ok": false, "error": "OBJ source missing"}
	var text := FileAccess.get_file_as_string(path)
	var vertices: Array[Vector3] = []
	var out: Dictionary = {}
	for tissue in TISSUES:
		out[tissue] = []
	var active := ""
	for line in text.split("\n", false):
		var row := line.strip_edges()
		if row.is_empty() or row.begins_with("#"):
			continue
		var fields := row.split(" ", false)
		if fields.is_empty():
			continue
		match fields[0]:
			"v":
				if fields.size() != 4:
					return {"ok": false, "error": "Invalid OBJ vertex"}
				# Original exporter uses Unreal Z-up. Godot Y-up with no mirror:
				# (x, y, z) -> (x, z, -y), converted display cm to units.
				var pos := Vector3(float(fields[1]), float(fields[3]), -float(fields[2])) * DISPLAY_SCALE
				if not pos.is_finite():
					return {"ok": false, "error": "Nonfinite OBJ vertex"}
				vertices.append(pos)
			"usemtl":
				if fields.size() != 2 or not fields[1].begins_with("KL_"):
					return {"ok": false, "error": "Unexpected material label"}
				active = fields[1].substr(3)
				if not out.has(active):
					return {"ok": false, "error": "Unknown original tissue label"}
			"f":
				if fields.size() != 4 or active.is_empty():
					return {"ok": false, "error": "Missing tissue or non-triangular OBJ face"}
				var face: Array[Vector3] = []
				for i in range(1, 4):
					if not fields[i].is_valid_int():
						return {"ok": false, "error": "Unsupported OBJ face index"}
					var index := int(fields[i]) - 1
					if index < 0 or index >= vertices.size():
						return {"ok": false, "error": "Out of range source face index"}
					face.append(vertices[index])
				if (face[1] - face[0]).cross(face[2] - face[0]).length_squared() < 1.0e-24:
					return {"ok": false, "error": "Degenerate source face"}
				out[active].append(face)
			"o", "g", "s", "mtllib":
				pass
			_:
				return {"ok": false, "error": "Unsupported original OBJ directive: " + fields[0]}
	return {"ok": true, "byTissue": out}

func _make_lighting_and_camera(low: Vector3, high: Vector3) -> void:
	var world := WorldEnvironment.new()
	world.name = "KL_ClinicBackground"
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.055, 0.075, 0.11)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.73, 0.78, 0.92)
	env.ambient_light_energy = 0.85
	world.environment = env
	add_child(world)
	var main := DirectionalLight3D.new()
	main.name = "KL_ClinicKeyLight"
	main.light_energy = 1.6
	main.rotation_degrees = Vector3(-35, -25, 0)
	add_child(main)
	var fill := OmniLight3D.new()
	fill.name = "KL_ClinicFillLight"
	fill.position = Vector3(-4, 5, 5)
	fill.omni_range = 25.0
	fill.light_energy = 1.2
	add_child(fill)
	var center := (low + high) * 0.5
	var span := high - low
	var view_width: float = maxf(span.x, 8.5)
	var vertical: float = maxf(span.y, 3.5)
	var distance: float = maxf(view_width * 1.5, vertical * 2.7)
	var camera := Camera3D.new()
	camera.name = "KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA"
	camera.position = center + Vector3(0, vertical * 0.28, distance)
	camera.fov = 44.0
	camera.near = 0.05
	camera.far = 200.0
	add_child(camera)
	camera.look_at(center, Vector3.UP)
	camera.current = true

func _make_overlay() -> void:
	var layer := CanvasLayer.new()
	layer.name = "KL_FDI16_PlainTextOverlay"
	add_child(layer)
	var header := Label.new()
	header.text = "KlinikLab  /  FDI 16  /  NATIVE GODOT 4.7"
	header.position = Vector2(26, 16)
	header.add_theme_font_size_override("font_size", 25)
	layer.add_child(header)
	var subtitle := Label.new()
	subtitle.text = "BEFORE (left)                      AFTER simulated cut (right)"
	subtitle.position = Vector2(26, 56)
	subtitle.add_theme_font_size_override("font_size", 18)
	layer.add_child(subtitle)
	var footer := Label.new()
	footer.text = "ORIGINAL SCHEMATIC PRODUCTION GEOMETRY - NOT CLINICALLY CALIBRATED | F12 capture"
	footer.position = Vector2(26, 845)
	footer.add_theme_font_size_override("font_size", 15)
	layer.add_child(footer)

func _capture_folder() -> String:
	var explicit := FileAccess.get_file_as_string(SOURCE_PREFIX + "capture-path.txt").strip_edges()
	if not explicit.is_empty() and explicit.is_absolute_path():
		return explicit
	return OS.get_environment("KLINIKLAB_SR1C_CAPTURE_DIR")

func _write_report() -> void:
	var folder := _capture_folder()
	if folder.is_empty():
		print("SR1C REPORT (not saved; capture dir unset): " + JSON.stringify(_report))
		return
	DirAccess.make_dir_recursive_absolute(folder)
	var file := FileAccess.open(folder.path_join("native-source-submission.json"), FileAccess.WRITE)
	if file == null:
		push_error("Cannot save source submission JSON under evidence directory")
		return
	file.store_string(JSON.stringify(_report, "\t") + "\n")
	file.close()

func _unhandled_key_input(event: InputEvent) -> void:
	if not _ready_for_capture:
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F12:
		_capture_native_frame()

func _capture_native_frame() -> void:
	# Never accept an empty _ready-frame texture as a real GPU frame.
	await RenderingServer.frame_post_draw
	var image: Image = get_viewport().get_texture().get_image()
	if image.is_empty():
		_fail("Native image readback empty")
		return
	var folder := _capture_folder()
	if folder.is_empty():
		push_error("No source-pinned capture directory, native screenshot not written")
		return
	DirAccess.make_dir_recursive_absolute(folder)
	var file_name := "godot-native-fdi16-" + str(Time.get_ticks_msec()) + ".png"
	var output := folder.path_join(file_name)
	if image.save_png(output) != OK:
		push_error("Native Godot viewport PNG failed: " + output)
		return
	print("SR1C NATIVE FRAME CAPTURED (NOT reviewed/GPU-proven): " + output)
