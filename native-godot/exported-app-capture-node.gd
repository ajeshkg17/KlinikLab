extends Node
## SR18: in-app, opt-in capture from the ACTUAL exported app.tscn scene.
## CLI requires -- --kliniklab-exported-pc-capture AND exact SHA + absolute
## watcher-owned environment directory. No network/credentials/patient data.
var _output: String = ""
var _report: Dictionary = {}
var _start_ms: int = 0
var _terminal: bool = false

func _save() -> void:
    if _output.is_empty():
        return
    var f := FileAccess.open(_output.path_join("native-exported-app-result.json"), FileAccess.WRITE)
    if f == null:
        push_error("SR18_CAPTURE_CHECKPOINT_WRITE_FAILED "+_report.get("stage","unknown"))
        return
    f.store_string(JSON.stringify(_report, "  ")+"\n")
    f.close()

func _stage(stage_name: String) -> void:
    _report["stage"] = stage_name
    _report["elapsedMs"] = Time.get_ticks_msec()-_start_ms
    _save()
    print("SR18_CAPTURE_NODE_STAGE ",stage_name)

func _fail(reason: String) -> void:
    if _terminal:
        return
    _terminal = true
    _report["status"] = "EVIDENCE_INCOMPLETE"
    _report["stage"] = "blocked"
    _report["blocker"] = reason
    _report["acceptedPixels"] = false
    _report["acceptedGpuAttribution"] = false
    _save()
    push_error("SR18_CAPTURE_NODE_BLOCKED "+reason)
    get_tree().quit(3)

func _process(_delta: float) -> void:
    if _start_ms>0 and not _terminal and Time.get_ticks_msec()-_start_ms>90000:
        _fail("Capture deadline exceeded at stage "+str(_report.get("stage","unknown")))

func _snapshot(name: String) -> Dictionary:
    for i in range(5):
        await RenderingServer.frame_post_draw
    if _terminal:
        return {}
    var tex: ViewportTexture = get_viewport().get_texture()
    if tex == null:
        return {}
    var img: Image = tex.get_image()
    if img == null or img.get_width()<1280 or img.get_height()<720:
        return {}
    var file: String = _output.path_join(name)
    if FileAccess.file_exists(file) or img.save_png(file)!=OK:
        return {}
    return {"file":name,"sha256":FileAccess.get_sha256(file),
        "width":img.get_width(),"height":img.get_height(),
        "bytes":FileAccess.get_file_as_bytes(file).size()}

func run(app: Node3D) -> void:
    _start_ms=Time.get_ticks_msec()
    if not OS.get_cmdline_user_args().has("--kliniklab-exported-pc-capture"):
        _fail("Explicit private exported-app capture CLI flag missing")
        return
    _output=OS.get_environment("KLINIKLAB_PC_CAPTURE_DIR")
    var expected_sha: String=OS.get_environment("KLINIKLAB_PC_EXPECTED_SHA")
    if _output.is_empty() or not _output.is_absolute_path() or expected_sha.length()!=40:
        _fail("Watcher-provided absolute output directory or pinned SHA missing")
        return
    if DirAccess.make_dir_recursive_absolute(_output)!=OK:
        _fail("Cannot create owner-PC capture output directory")
        return
    _report={
        "kind":"EXPORTED_EMBEDDED_GODOT_WINDOWS_APP_NATIVE_CAPTURE",
        "sourceGitSHA":expected_sha,"status":"EVIDENCE_INCOMPLETE",
        "stage":"starting","pid":OS.get_process_id(),
        "renderingMethod":RenderingServer.get_current_rendering_method(),
        "renderingDriver":RenderingServer.get_current_rendering_driver_name(),
        "videoAdapterName":RenderingServer.get_video_adapter_name(),
        "videoAdapterVendor":RenderingServer.get_video_adapter_vendor(),
        "acceptedPixels":false,"acceptedGpuAttribution":false,
        "clinicalAccuracyValidated":false,"questVerified":false
    }
    _save()
    print("SR18_CAPTURE_NODE_STARTED sha=",expected_sha," pid=",OS.get_process_id())
    if DisplayServer.get_name()=="headless":
        _fail("headless renderer is not physical exported-app RTX evidence")
        return
    DisplayServer.register_additional_output(self)
    if _report["renderingMethod"]!="forward_plus" or _report["renderingDriver"]!="vulkan":
        _fail("Native Vulkan Forward+ required; no graphics fallback")
        return
    var original_sha: String=FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
    var content: Dictionary=app.get("_content")
    if original_sha!=expected_sha or str(content.get("sourceGitSHA",""))!=expected_sha:
        _fail("Exact SHA from watched portable source is not identical to live application")
        return
    var clinic: Node3D=app.get("_cc0_clinic")
    if clinic==null or not clinic.is_inside_tree():
        _fail("Actual app CC0 runtime scene absent")
        return
    var environment: Dictionary=clinic.call("summary")
    if int(environment.get("wholeMeshInstances",0))<20 or int(environment.get("trayMeshInstances",0))<1:
        _fail("Approved CC0 whole clinic and instrument tray were not instantiated")
        return
    var cases: Array=app.get("_cases")
    if cases.size()!=6:
        _fail("Source six-case workflow missing")
        return
    _report["environment"]=environment
    _report["sourceCases"]=cases.size()
    _stage("preparing_environment_frame")
    app.call("_switch_view","environment")
    var a: Dictionary=await _snapshot("kliniklab-exported-cc0-environment.png")
    if _terminal:
        return
    if a.is_empty():
        _fail("CC0 environment viewport PNG could not be captured")
        return
    _report["environmentImage"]=a
    _stage("environment_frame_saved")
    app.call("_switch_view","clinic")
    app.call("_select_case",1)
    app.call("_select_station",4)
    app.call("_set_camera_mode","teeth")
    app.call("_toggle_direct_bur")
    var volume: Node3D=app.get("_volume")
    if volume==null or str((volume.call("summary") as Dictionary).get("fdi",""))!="36":
        _fail("FDI36 practical tooth not source verified")
        return
    if not bool(app.get("_direct_bur_mode")):
        _fail("Direct bur could not be enabled for practical station")
        return
    _report["selectedCase"]="endo"
    _report["selectedFDI"]="36"
    _report["selectedStation"]="practical"
    _report["directBurEnabled"]=true
    _stage("preparing_practical_frame")
    var b: Dictionary=await _snapshot("kliniklab-exported-fdi36-practical.png")
    if _terminal:
        return
    if b.is_empty():
        _fail("FDI36 practical viewport PNG could not be captured")
        return
    _report["practicalImage"]=b
    _stage("both_frames_saved")
    var cam: Camera3D=(app.get("_scene") as Node3D).get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
    if cam==null:
        _fail("Native app clinic camera missing")
        return
    var orbit_start: int=Time.get_ticks_msec()
    while Time.get_ticks_msec()-orbit_start<39000 and not _terminal:
        var t: float=float(Time.get_ticks_msec()-orbit_start)/1000.0
        cam.position=Vector3(sin(t*0.2)*0.55,1.7+cos(t*0.2)*0.25,13.2)
        cam.look_at(Vector3(0.0,0.5,0.0))
        await get_tree().create_timer(0.12).timeout
    if _terminal:
        return
    _report["drawDurationSeconds"]=float(Time.get_ticks_msec()-orbit_start)/1000.0
    _report["status"]="EXPORTED_APP_TWO_NATIVE_PNGS_PENDING_INDEPENDENT_PIXEL_GPU_REVIEW"
    _report["stage"]="completed"
    _report["acceptedPixels"]=false
    _report["acceptedGpuAttribution"]=false
    _save()
    _terminal=true
    print("SR18_EXPORTED_APP_TWO_ORIGINAL_PNGS_WRITTEN sha=",expected_sha)
    get_tree().quit(0)
