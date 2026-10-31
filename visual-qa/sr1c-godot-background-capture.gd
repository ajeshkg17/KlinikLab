extends SceneTree
## Fixed approved capture automation loaded by --script.
## Not headless: requires GPU Vulkan Forward+ on a PRIVATE WinSta0 desktop.
## No input, F12, Project Manager, editor, focus or user-desktop activation.

const ORIGINAL_SCENE: String = "res://main.tscn"
const CAPTURE_DIRECTORY: String = "res://source/capture-path.txt"
const MAX_CAPTURE_FRAMES: int = 100

func _initialize() -> void:
	call_deferred("_capture_once")

func _fail(reason: String) -> void:
	push_error("SR1C_BACKGROUND_CAPTURE_BLOCKED: " + reason)
	_write_background_result({"status":"EVIDENCE_INCOMPLETE", "reason":reason,
		"pixelReviewed":false, "gpuProcessVerified":false})
	quit(3)

func _capture_once() -> void:
	# Keep rendering even when the private desktop has no visible window.
	DisplayServer.register_additional_output(self)
	if DisplayServer.get_name() == "headless":
		_fail("Godot headless display driver disables GPU raster")
		return
	var renderer: String = RenderingServer.get_current_rendering_method()
	var driver: String = RenderingServer.get_current_rendering_driver_name()
	var adapter: String = RenderingServer.get_video_adapter_name()
	var vendor: String = RenderingServer.get_video_adapter_vendor()
	if renderer != "forward_plus" or driver != "vulkan":
		_fail("Expected native Forward+ Vulkan; actual " + renderer + "/" + driver)
		return
	if not adapter.to_upper().contains("RTX 5060") or not vendor.to_upper().contains("NVIDIA"):
		_fail("Vulkan adapter not NVIDIA RTX 5060; actual " + adapter + "/" + vendor)
		return
	var packed: PackedScene = load(ORIGINAL_SCENE)
	if packed == null:
		_fail("Original production Godot main.tscn could not load")
		return
	var scene: Node = packed.instantiate()
	root.add_child(scene)
	current_scene = scene
	var source_path: String = _capture_directory().path_join("native-source-submission.json")
	for frame in MAX_CAPTURE_FRAMES:
		await RenderingServer.frame_post_draw
		if FileAccess.file_exists(source_path):
			break
	if not FileAccess.file_exists(source_path):
		_fail("Original scene never submitted verifiable source geometry")
		return
	var source_data: Variant = JSON.parse_string(FileAccess.get_file_as_string(source_path))
	if not (source_data is Dictionary):
		_fail("Original scene source report is not valid JSON")
		return
	var before: Dictionary = source_data.get("states", {}).get("before", {})
	var after: Dictionary = source_data.get("states", {}).get("after", {})
	if source_data.get("status", "") != "NATIVE_GODOT_SCENE_SUBMITTED_PENDING_PIXEL_AND_GPU" or source_data.get("renderingMethod","") != "forward_plus" or source_data.get("renderingDriver","") != "vulkan":
		_fail("Source submission did not meet strict native Vulkan contract")
		return
	if int(before.get("submittedTriangles", -1)) != 14856 or int(after.get("submittedTriangles", -1)) != 14936:
		_fail("Expected 14856/14936 original source triangles")
		return
	if int(before.get("nativeSurfaceCount", -1)) != 5 or int(after.get("nativeSurfaceCount", -1)) != 5:
		_fail("Expected five original tissue surfaces per tooth")
		return
	for state in [before, after]:
		var tissues: Dictionary = state.get("tissues", {})
		if tissues.size() != 5:
			_fail("Original five named tissue groups not present")
			return
		for tissue in ["enamel", "dentin", "pulp", "cementum", "caries"]:
			if not tissues.has(tissue):
				_fail("Original tissue missing: " + tissue)
				return
			var record: Dictionary = tissues[tissue]
			if int(record.get("nativeSubmittedIndices", -1)) != 3 * int(record.get("sourceTriangles", -1)) or int(record.get("surfaceCount", -1)) != 1:
				_fail("Original tissue indexed mesh surface mismatch: " + tissue)
				return
	# Orbit for exactly 42 seconds in the private WinSta0 desktop.
	# Keep submitting DIFFERENT camera transforms so PDH can observe sustained
	# process-specific real GPU 3D work, even without a visible active desktop.
	var camera: Camera3D = scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA")
	if camera == null:
		_fail("Expected original source-derived FDI16 Camera3D missing")
		return
	var before_root: Node3D = scene.get_node_or_null("KL_FDI16_BEFORE")
	var after_root: Node3D = scene.get_node_or_null("KL_FDI16_AFTER")
	if before_root == null or after_root == null:
		_fail("Expected original BEFORE and AFTER source geometry nodes missing")
		return
	var midpoint: Vector3 = (before_root.global_position + after_root.global_position) * 0.5
	# Original f4d4 source GUI footer still mentions the deprecated F12 mode.
	# Change only this display text at runtime; original clinical OBJ stays SHA-pinned.
	var overlay: CanvasLayer = scene.get_node_or_null("KL_FDI16_PlainTextOverlay")
	if overlay != null:
		for child in overlay.get_children():
			if child is Label and child.text.contains("F12 capture"):
				child.text = child.text.replace("F12 capture", "AUTOMATED PRIVATE-DESKTOP ORBIT")
	var start_cam: Vector3 = camera.global_position
	var radius: float = maxf(8.0, start_cam.distance_to(midpoint))
	var initial_height: float = start_cam.y - midpoint.y
	var start_msec: int = Time.get_ticks_msec()
	var angle_frame_saved := false
	var frontal_saved := false
	var frontal_file := ""
	var angle_file := ""
	var frontal_hash := ""
	var angle_hash := ""
	var last_frame_count := 0
	while Time.get_ticks_msec() - start_msec < 42000:
		await RenderingServer.frame_post_draw
		last_frame_count += 1
		var elapsed: float = float(Time.get_ticks_msec() - start_msec) / 1000.0
		var progression: float = clampf(elapsed / 35.0, 0.0, 1.0)
		var azimuth: float = deg_to_rad(42.0) * progression
		var height: float = lerpf(initial_height, radius * 0.72, progression)
		camera.global_position = midpoint + Vector3(sin(azimuth) * radius, height, cos(azimuth) * radius)
		camera.look_at(midpoint, Vector3.UP)
		if elapsed >= 3.0 and not frontal_saved:
			var output: Dictionary = _write_gpu_frame("frontal")
			if not output.get("ok", false):
				_fail("Native frontal GPU image failed: " + str(output.get("error", "")))
				return
			frontal_file = str(output["name"])
			frontal_hash = str(output["sha256"])
			frontal_saved = true
		if elapsed >= 32.0 and not angle_frame_saved:
			var output: Dictionary = _write_gpu_frame("occlusal")
			if not output.get("ok", false):
				_fail("Native occlusal GPU image failed: " + str(output.get("error", "")))
				return
			angle_file = str(output["name"])
			angle_hash = str(output["sha256"])
			angle_frame_saved = true
	if not frontal_saved or not angle_frame_saved:
		_fail("Sustained orbit did not produce BOTH independent original native images")
		return
	var duration_sec: float = float(Time.get_ticks_msec() - start_msec) / 1000.0
	if duration_sec < 40.0 or duration_sec > 45.0:
		_fail("Private GPU orbit outside 40-45s duration gate")
		return
	_write_background_result({
		"status":"BACKGROUND_VULKAN_ORBIT_TWO_IMAGES_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW",
		"imageFile":frontal_file, "imageSHA256":frontal_hash,
		"angledImageFile":angle_file, "angledImageSHA256":angle_hash,
		"imageWidth":1600, "imageHeight":900,
		"orbitDurationSeconds":duration_sec,
		"orbitCameraMaxAzimuthDegrees":42.0, "orbitEndElevationRatio":0.72,
		"orbitSubmittedFrames":last_frame_count,
		"displayDriver":DisplayServer.get_name(), "renderingMethod":renderer,
		"renderingDriver":driver, "videoAdapterName":adapter, "videoAdapterVendor":vendor,
		"sourceTrianglesBefore":14856, "sourceTrianglesAfter":14936,
		"tissueSurfacesPerTooth":5,
		"pixelReviewed":false, "gpuProcessVerified":false,
		"headlessUsed":false, "userDesktopActivationRequested":false
	})
	print("SR1C_ORBIT_TWO_IMAGES_WRITTEN: "+frontal_file+" ; "+angle_file)
	DisplayServer.unregister_additional_output(self)
	quit(0)

func _write_gpu_frame(label: String) -> Dictionary:
	# Read back only after completed Vulkan frame; never redraw a synthetic image.
	var image: Image = root.get_texture().get_image()
	if image.is_empty() or image.get_width() < 1280 or image.get_height() < 720:
		return {"ok":false,"error":"Godot native Vulkan viewport readback empty or undersized"}
	var folder: String = _capture_directory()
	if folder.is_empty():
		return {"ok":false,"error":"Missing pinned capture directory"}
	var name: String = "godot-native-fdi16-" + label + "-" + str(Time.get_ticks_msec()) + ".png"
	var output: String = folder.path_join(name)
	if image.save_png(output) != OK:
		return {"ok":false,"error":"Native Vulkan original PNG write failed"}
	var hash: String = FileAccess.get_sha256(output)
	if hash.length() != 64:
		return {"ok":false,"error":"Original GPU screenshot SHA-256 failed"}
	return {"ok":true,"name":name,"sha256":hash}

func _capture_directory() -> String:
	var destination: String = FileAccess.get_file_as_string(CAPTURE_DIRECTORY).strip_edges()
	if destination.is_empty() or not destination.is_absolute_path():
		return ""
	return destination

func _write_background_result(value: Dictionary) -> void:
	var folder: String = _capture_directory()
	if folder.is_empty():
		push_error("SR1C no pinned capture directory")
		return
	DirAccess.make_dir_recursive_absolute(folder)
	var f: FileAccess = FileAccess.open(folder.path_join("godot-background-capture.json"), FileAccess.WRITE)
	if f == null:
		push_error("SR1C background capture report could not be written")
		return
	f.store_string(JSON.stringify(value, "\t") + "\n")
	f.close()
