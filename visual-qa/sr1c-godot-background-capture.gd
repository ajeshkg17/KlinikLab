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
	for i in 6:
		await RenderingServer.frame_post_draw
	var texture: ViewportTexture = root.get_texture()
	var image: Image = texture.get_image()
	if image.is_empty() or image.get_width() < 1280 or image.get_height() < 720:
		_fail("Private desktop viewport GPU readback empty or too small")
		return
	var name: String = "godot-native-fdi16-" + str(Time.get_ticks_msec()) + ".png"
	var output: String = _capture_directory().path_join(name)
	if image.save_png(output) != OK:
		_fail("Could not save original native GPU viewport PNG")
		return
	_write_background_result({
		"status":"BACKGROUND_VULKAN_FRAME_CAPTURED_PENDING_PIXEL_AND_PROCESS_GPU_REVIEW",
		"imageFile":name, "imageWidth":image.get_width(), "imageHeight":image.get_height(),
		"displayDriver":DisplayServer.get_name(), "renderingMethod":renderer,
		"renderingDriver":driver, "videoAdapterName":adapter, "videoAdapterVendor":vendor,
		"sourceTrianglesBefore":14856, "sourceTrianglesAfter":14936,
		"tissueSurfacesPerTooth":5,
		"pixelReviewed":false, "gpuProcessVerified":false,
		"headlessUsed":false, "userDesktopActivationRequested":false
	})
	print("SR1C_BACKGROUND_CAPTURE_WRITTEN: " + output)
	# Keep Godot GPU process alive while the Windows worker collects PID samples.
	await create_timer(16.0).timeout
	DisplayServer.unregister_additional_output(self)
	quit(0)

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
