extends Node
## SR13 owner-PC exported-app evidence hook; NEVER invoked during normal use.
## Explicit -- --kliniklab-native-pc-capture=<unique-id> only.
## Captures actual rendered root viewport + real renderer details, not fake pixels.
## Separate owner-PC PowerShell must correlate Godot PID with Windows PDH/DXGI.
const PREFIX := "pc-kliniklab-native-cc0-"
const CANVAS := ["overview-fdi16.png","practical-fdi36.png","practical-fdi26.png"]

func accepted_id(id: String) -> bool:
	if not id.begins_with(PREFIX) or id.length()<PREFIX.length()+10 or id.length()>96:
		return false
	for c in id:
		var ch := str(c)
		if not ((ch>="a" and ch<="z") or (ch>="0" and ch<="9") or ch=="-"):
			return false
	return true

func _capture_failure(message: String) -> void:
	push_error("KLINIKLAB_EXPORTED_PC_CAPTURE_INCOMPLETE: "+message)

func run(app: Node3D, job_id: String) -> void:
	if not accepted_id(job_id):
		_capture_failure("Unapproved/unsafe unique owner-PC job identifier")
		return
	if DisplayServer.get_name()=="headless":
		_capture_failure("Headless viewport is not native Windows GPU evidence")
		return
	var renderer := RenderingServer.get_current_rendering_method()
	var driver := RenderingServer.get_current_rendering_driver_name()
	var adapter := RenderingServer.get_video_adapter_name()
	var vendor := RenderingServer.get_video_adapter_vendor()
	var expected_sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var app_source: Dictionary = app.get("_content")
	if str(app_source.get("sourceGitSHA","")) != expected_sha or expected_sha.length()!=40:
		_capture_failure("Actual app source SHA mismatch")
		return
	var cc0: Node3D = app.get("_cc0_clinic")
	if cc0 == null or not cc0.is_inside_tree() or not cc0.visible:
		_capture_failure("Original reviewed CC0 room not mounted as visible live app scene")
		return
	var cc0_summary: Dictionary = cc0.call("summary")
	if int(cc0_summary.get("wholeMeshInstances",0))<20 or int(cc0_summary.get("trayMeshInstances",0))<1:
		_capture_failure("Actual CC0 mesh import missing")
		return
	# For the dedicated single-instance owner-PC watcher only, permit an
	# absolute externally supplied evidence root. Ordinary app users keep
	# the original user:// location, with no network/file upload.
	var watcher_root: String = OS.get_environment("KLINIKLAB_PC_CAPTURE_DIR")
	var dir: String = ProjectSettings.globalize_path("user://owner-pc-captures").path_join(job_id)
	if not watcher_root.is_empty():
		if not watcher_root.is_absolute_path() or watcher_root.contains(".."):
			_capture_failure("Owner-PC capture root not absolute or unsafe")
			return
		dir = watcher_root.path_join(job_id)
	if DirAccess.dir_exists_absolute(dir):
		_capture_failure("Immutable job evidence folder already exists: "+dir)
		return
	if DirAccess.make_dir_recursive_absolute(dir)!=OK:
		_capture_failure("Could not create unique evidence folder")
		return
	var started: int = int(Time.get_unix_time_from_system())
	var screenshots: Array = []
	var entries := [
		{"case":0,"station":4,"camera":"overview"},
		{"case":1,"station":4,"camera":"teeth"},
		{"case":3,"station":4,"camera":"teeth"}
	]
	for i in range(entries.size()):
		var case_index: int = entries[i]["case"]
		var station_index: int = entries[i]["station"]
		app.call("_select_case",case_index)
		app.call("_select_station",station_index)
		app.call("_switch_view","clinic")
		app.call("_set_camera_mode",str(entries[i]["camera"]))
		for wait_frame in range(18):
			await RenderingServer.frame_post_draw
		var screen: Image = get_viewport().get_texture().get_image()
		if screen == null or screen.get_width()<900 or screen.get_height()<600:
			_capture_failure("No usable actual native root viewport image "+str(i))
			return
		var file: String = dir.path_join(CANVAS[i])
		if FileAccess.file_exists(file) or screen.save_png(file)!=OK:
			_capture_failure("Failed writing immutable original GPU viewport "+str(i))
			return
		var current_volume: Node3D = app.get("_volume")
		if current_volume==null:
			_capture_failure("Case-specific native FDI volume missing during screenshot")
			return
		var summary: Dictionary = current_volume.call("summary")
		screenshots.append({"file":CANVAS[i],"sha256":FileAccess.get_sha256(file),
			"width":screen.get_width(),"height":screen.get_height(),
			"caseId":summary.get("caseId",""),"fdi":summary.get("fdi",""),
			"source":"actual exported native Godot root viewport image"})
	# Keep native 3D workload alive for sustained process-PID PDH samples; a
	# Windows collector must independently verify 3D Engine LUID == RTX5060.
	var original_camera: Camera3D = (app.get("_scene") as Node3D).get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if original_camera != null:
		app.call("_select_case",0)
		app.call("_set_camera_mode","overview")
	for n in range(140):
		if original_camera != null:
			var angle: float = float(n)*0.055
			original_camera.position = Vector3(4.0*sin(angle),10.0,23.0+2.0*cos(angle))
			original_camera.look_at(Vector3(0.0,-1.6,-9.0))
		await get_tree().create_timer(0.30).timeout
	var report := {
		"schemaVersion":1,"jobId":job_id,"sourceGitSHA":expected_sha,
		"runKind":"ACTUAL_EXPORTED_NATIVE_GODOT_CC0_APP_NOT_HEADLESS",
		"sourceCC0ClinicSha256":"9af6dd52d96bf94d50eda63ee888db975fadabb230a5dcd2ff98a11a518db77a",
		"sourceCC0TraySha256":"63e3396b7ccd5c5227a8464473b25acb2cf79e5797ac7518b16f16c8f6228036",
		"clinicMeshInstances":cc0_summary.get("wholeMeshInstances",0),
		"trayMeshInstances":cc0_summary.get("trayMeshInstances",0),
		"originalSixFDI":["16","36","11","26","48","46"],
		"godotPID":OS.get_process_id(),
		"renderingMethod":renderer,"renderingDriver":driver,
		"videoAdapterName":adapter,"videoAdapterVendor":vendor,
		"nvidiaRtx5060Reported":adapter.to_upper().contains("RTX 5060") and vendor.to_upper().contains("NVIDIA"),
		"images":screenshots,"startedUnix":started,
		"endedUnix":Time.get_unix_time_from_system(),
		"independentPixelReview":false,"process3DPdhAndDxgiLuidVerified":false,
		"clinicalAcceptance":false,"fullFeatureParity":false,
		"evidenceFolder":dir
	}
	var result_path: String = dir.path_join("exported-app-native-capture.json")
	var file_access := FileAccess.open(result_path,FileAccess.WRITE)
	if file_access==null:
		_capture_failure("Native capture report could not be written")
		return
	file_access.store_string(JSON.stringify(report,"  ")+"\n")
	file_access.close()
	print("SR13_EXPORTED_APP_REAL_PC_CAPTURE_READY job=",job_id," sha=",expected_sha,
		" pid=",OS.get_process_id()," evidence=",dir,
		" renderer=",renderer,"/",driver," gpu=",adapter,
		" owner_PC_pixel_GPU_attribution_NOT_yet_independently_accepted")
