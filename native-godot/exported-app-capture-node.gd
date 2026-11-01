extends Node
## SR17: app-internal opted-in renderer; standalone exported EXE ignores --script.
## Actual portable/exported app renders its own native PNGs.
## Executed by fixed private-WinSta0 owner-PC watcher, never a CI GPU claim.
const CC0_MESH_MIN := 20
const MAX_FRAMES := 300
var _output := ""
var _source_sha := ""
var _report := {}
var _begin_ms: int = 0
var _terminal: bool = false

func run(app: Node3D) -> void:
	if app == null or not app.is_inside_tree():
		push_error("SR20_EXPORTED_CAPTURE_APP_NODE_ABSENT")
		get_tree().quit(3)
		return
	_output=OS.get_environment("KLINIKLAB_PC_CAPTURE_DIR")
	_source_sha=OS.get_environment("KLINIKLAB_PC_EXPECTED_SHA")
	if _output.is_empty() or not _output.is_absolute_path() or _source_sha.length()!=40:
		push_error("SR20_INVALID_WATCHER_CAPTURE_DIRECTORY_OR_EXACT_SHA")
		get_tree().quit(3)
		return
	if DirAccess.make_dir_recursive_absolute(_output)!=OK:
		push_error("SR20_WATCHER_CAPTURE_DIRECTORY_NOT_WRITABLE")
		get_tree().quit(3)
		return
	_begin_ms=Time.get_ticks_msec()
	_report={"sourceGitSHA":_source_sha,"kind":"EXPORTED_EMBEDDED_GODOT_WINDOWS_APP_NATIVE_CAPTURE",
		"status":"EVIDENCE_INCOMPLETE","stage":"synchronous_bootstrap",
		"pid":OS.get_process_id(),"engine":str(Engine.get_version_info()),
		"display":DisplayServer.get_name(),
		"renderingMethod":RenderingServer.get_current_rendering_method(),
		"renderingDriver":RenderingServer.get_current_rendering_driver_name(),
		"videoAdapterName":RenderingServer.get_video_adapter_name(),
		"videoAdapterVendor":RenderingServer.get_video_adapter_vendor(),
		"acceptedPixels":false,"acceptedGpuAttribution":false,
		"clinicalAccuracyValidated":false,"questVerified":false}
	_save()
	print("SR20_NATIVE_CAPTURE_SYNC_REPORT_WRITTEN sha=", _source_sha,
		" pid=", OS.get_process_id())
	call_deferred("_capture",app)

func _process(_delta: float) -> void:
	if _begin_ms>0 and not _terminal and Time.get_ticks_msec()-_begin_ms>90000:
		_fail("Deadline exceeded at "+str(_report.get("stage","not_started")))

func _stage(stage: String) -> void:
	_report["stage"]=stage
	_report["elapsedMs"]=Time.get_ticks_msec()-_begin_ms
	_save()
	print("SR20_CAPTURE_STAGE ",stage)
func _save() -> void:
	if _output.is_empty():
		return
	var f := FileAccess.open(_output.path_join("native-exported-app-result.json"),FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(_report,"  ")+"\n")
		f.close()
func _fail(reason: String) -> void:
	if _terminal:
		return
	_terminal=true
	_report["status"]="EVIDENCE_INCOMPLETE"
	_report["stage"]="blocked"
	_report["blocker"]=reason
	_report["acceptedPixels"]=false
	_report["acceptedGpuAttribution"]=false
	_save()
	push_error("SR20_NATIVE_CAPTURE_BLOCKED "+reason)
	get_tree().quit(3)
func _snapshot(name: String) -> Dictionary:
	for i in range(5):
		await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	if img==null or img.get_width()<1280 or img.get_height()<720:
		return {}
	var file := _output.path_join(name)
	if img.save_png(file)!=OK:
		return {}
	return {"file":name,"sha256":FileAccess.get_sha256(file),
		"width":img.get_width(),"height":img.get_height(),"bytes":FileAccess.get_file_as_bytes(file).size()}
func _capture(app: Node3D) -> void:
	print("SR17_EXPORTED_APP_CAPTURE_NODE_ENTERED")
	_stage("capture_deferred_entered")
	DisplayServer.register_additional_output(self)
	if DisplayServer.get_name()=="headless" or _report["renderingMethod"]!="forward_plus" or _report["renderingDriver"]!="vulkan":
		_fail("Exported application did not run in native Vulkan Forward+ windowed renderer")
		return
	var pinned := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	if pinned!=_source_sha:
		_fail("Embedded application source SHA does not match owner-PC job")
		return
	for i in range(MAX_FRAMES):
		await RenderingServer.frame_post_draw
		if app.get("_cc0_clinic")!=null and app.get("_volume")!=null:
			break
	var env: Node3D=app.get("_cc0_clinic")
	if env==null:
		_fail("Exported application never loaded CC0 environment into actual runtime")
		return
	var summary: Dictionary=env.call("summary")
	if int(summary.get("wholeMeshInstances",0))<CC0_MESH_MIN or not bool(summary.get("sourceOriginalGLBsHashVerified",false)):
		_fail("Actual embedded CC0 scene missing decoded mesh instances/hash")
		return
	var cases: Array=app.get("_cases")
	var content: Dictionary=app.get("_content")
	if cases.size()!=6 or (content.get("practical",[]) as Array).size()!=6:
		_fail("Actual embedded six-case/training source data missing")
		return
	_stage("preparing_environment_frame")
	app.call("_switch_view","environment")
	var overview: Dictionary=await _snapshot("kliniklab-exported-cc0-environment.png")
	if overview.is_empty():
		_fail("No original native Vulkan CC0 environment pixels")
		return
	_report["environmentImage"]=overview
	_stage("environment_png_saved")
	app.call("_switch_view","clinic")
	app.call("_select_case",1)
	app.call("_select_station",4)
	app.call("_toggle_direct_bur")
	var editor: Node3D=app.get("_volume")
	if editor==null or str((editor.call("summary") as Dictionary).get("fdi",""))!="36":
		_fail("Exported app substituted incorrect FDI for endodontic practical")
		return
	if not bool(app.get("_direct_bur_mode")):
		_fail("Exported app did not expose opt-in direct bur control")
		return
	_stage("preparing_fdi36_practical")
	var practical: Dictionary=await _snapshot("kliniklab-exported-fdi36-practical.png")
	if practical.is_empty():
		_fail("No original native Vulkan FDI36 practical pixels")
		return
	_report["practicalImage"]=practical
	_stage("fdi36_png_saved")
	# Sustain native 3D draws and bounded camera movement for independent
	# process-ID and DXGI GPU telemetry collected by PowerShell watcher.
	var cam: Camera3D=app.get("_scene").get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA")
	if cam==null:
		_fail("Actual exported app camera missing")
		return
	var start:=Time.get_ticks_msec()
	while Time.get_ticks_msec()-start<39000:
		var t:=float(Time.get_ticks_msec()-start)/1000.0
		cam.position=Vector3(sin(t*.2)*0.55,1.7+cos(t*.2)*0.25,13.2)
		cam.look_at(Vector3(0,0.5,0))
		await RenderingServer.frame_post_draw
	_report["status"]="EXPORTED_APP_TWO_NATIVE_PNGS_PENDING_INDEPENDENT_PIXEL_GPU_REVIEW"
	_report["stage"]="completed"
	_report["environment"]=summary
	_report["sourceCases"]=cases.size()
	_report["selectedCase"]="endo"
	_report["selectedFDI"]="36"
	_report["selectedStation"]="practical"
	_report["directBurEnabled"]=bool(app.get("_direct_bur_mode"))
	_report["environmentImage"]=overview
	_report["practicalImage"]=practical
	_report["drawDurationSeconds"]=float(Time.get_ticks_msec()-start)/1000.0
	_save()
	_terminal=true
	print("SR14_NATIVE_EXPORTED_CC0_AND_FDI36_PIXELS_WRITTEN sha="+_source_sha)
	get_tree().quit(0)
