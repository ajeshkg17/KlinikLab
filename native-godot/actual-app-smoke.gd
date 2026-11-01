extends SceneTree
## Real main Godot scene integration and opt-in capture contract check.
## No workstation Vulkan/pixel claim from headless CI.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
func _initialize() -> void:
	call_deferred("_run")
func _fail(reason: String) -> void:
	push_error("SR14_ACTUAL_MAIN_APP_SCENE_FAILED: " + reason)
	quit(1)
func _run() -> void:
	var capture_script: GDScript = load("res://owner-pc-capture.gd")
	if capture_script==null:
		_fail("Expected actual Windows capture code absent")
		return
	var capture: Node = capture_script.new()
	if not bool(capture.call("accepted_id","pc-kliniklab-native-cc0-20261101-job09-1234")) or
		bool(capture.call("accepted_id","pc-kliniklab-native-cc0-../../../")) or
		bool(capture.call("accepted_id","pc-kliniklab-native-cc0-old")):
		_fail("Unique immutable PC capture path validator ineffective")
		return
	capture.free()
	var scene: PackedScene = load("res://app.tscn")
	if scene==null:
		_fail("Native app scene missing")
		return
	var app: Node3D = scene.instantiate()
	if app==null:
		_fail("Real native app root cannot instantiate")
		return
	get_root().add_child(app)
	var clinic: Node3D = app.get("_cc0_clinic")
	var original: Node3D = app.get("_scene")
	var legacy: Node3D = app.get("_legacy_workspace")
	if clinic==null or original==null or legacy==null or not clinic.is_inside_tree():
		_fail("Actual app._ready never mounted imported CC0 original scene")
		return
	if not clinic.visible or legacy.visible:
		_fail("Real app's CC0 room visibility or duplicate schematic is wrong")
		return
	var summary: Dictionary = clinic.call("summary")
	if not bool(summary.get("sourceOriginalGLBsHashVerified",false)) or
		not bool(summary.get("godotFloat32MeshesImported",false)) or
		int(summary.get("wholeMeshInstances",0))<20:
		_fail("Actual app did not load verified source/dequantized CC0 geometry")
		return
	if original.get_node_or_null("KL_FDI16_BEFORE")==null or
		original.get_node_or_null("KL_FDI16_AFTER")==null:
		_fail("Immutable source FDI16 before/after removed")
		return
	var app_content: Dictionary = app.get("_content")
	var pathways: Dictionary = app.get("_pathways")
	for i in range(6):
		app.call("_select_case",i)
		app.call("_select_station",4)
		var volume: Node3D = app.get("_volume")
		if volume==null:
			_fail("Real native FDI editable cutter missing "+str(i))
			return
		var info: Dictionary = volume.call("summary")
		var case: Dictionary = (app_content["cases"] as Array)[i]
		if str(info.get("fdi",""))!=FDIS[i] or str(info.get("caseId",""))!=IDS[i] or
			str(case.get("fdi",""))!=FDIS[i] or not pathways.has(IDS[i]) or
			(app_content["practical"][i] as Array).size()<5 or not clinic.visible:
			_fail("Real app CC0 scene regressed source case FDI/treatment "+str(i))
			return
	app.call("_reset_progress")
	print("SR14_ACTUAL_NATIVE_APP_CC0_FDI_SIX_CASES_PASS all GLB meshes and exact-source cases in real app._ready; no real pixels/GPU claimed")
	quit(0)
