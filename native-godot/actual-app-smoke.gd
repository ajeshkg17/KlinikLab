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
	if (not bool(capture.call("accepted_id","pc-kliniklab-native-cc0-20261101-job09-1234")) or
		bool(capture.call("accepted_id","pc-kliniklab-native-cc0-../../../")) or
		bool(capture.call("accepted_id","pc-kliniklab-native-cc0-old"))):
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
	if (not bool(summary.get("sourceOriginalGLBsHashVerified",false)) or
		not bool(summary.get("godotFloat32MeshesImported",false)) or
		int(summary.get("wholeMeshInstances",0))<20):
		_fail("Actual app did not load verified source/dequantized CC0 geometry")
		return
	if (original.get_node_or_null("KL_FDI16_BEFORE")==null or
		original.get_node_or_null("KL_FDI16_AFTER")==null):
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
		if (str(info.get("fdi",""))!=FDIS[i] or str(info.get("caseId",""))!=IDS[i] or
			str(case.get("fdi",""))!=FDIS[i] or not pathways.has(IDS[i]) or
			(app_content["practical"][i] as Array).size()<5 or not clinic.visible):
			_fail("Real app CC0 scene regressed source case FDI/treatment "+str(i))
			return
		if i == 1:
			var reference: Node3D = app.get("_tooth36_reference")
			if reference == null:
				_fail("FDI36 practical did not instantiate its separate source tooth reference")
				return
			var tooth_report: Dictionary = reference.call("summary")
			if not bool(tooth_report.get("assetLoaded",false)) or bool(tooth_report.get("fallbackVisible",true)) or int(tooth_report.get("meshInstances",0)) < 1 or str(tooth_report.get("fdi","")) != "36" or str(tooth_report.get("license","")) != "CC-BY-4.0" or not bool(tooth_report.get("surfaceOnly",false)):
				_fail("Actual source-verified Dundee FDI36 mesh did not load with correct identity/limits")
				return
			if not reference.visible:
				_fail("FDI36 reference not visible in its own practical station")
				return
		elif app.get("_tooth36_reference") != null and bool((app.get("_tooth36_reference").call("summary") as Dictionary).get("assetLoaded",false)) and app.get("_tooth36_reference").visible:
			_fail("FDI36 reference leaked into another FDI practical case")
			return
	var reference_script: GDScript = load("res://tooth36-reference.gd")
	var missing_reference: Node3D = reference_script.new()
	missing_reference.call("force_missing_fallback_for_test")
	var missing_summary: Dictionary = missing_reference.call("summary")
	if bool(missing_summary.get("assetLoaded",true)) or not bool(missing_summary.get("fallbackVisible",false)) or not missing_reference.has_node("KL_DUNDEE_FDI36_SURFACE_ASSET_MISSING_FALLBACK"):
		_fail("FDI36 missing-asset fallback was not clearly exposed")
		return
	var fallback_node: Node3D = missing_reference.get_node("KL_DUNDEE_FDI36_SURFACE_ASSET_MISSING_FALLBACK")
	if fallback_node.get_child_count() != 1 or not (fallback_node.get_child(0) is Label3D):
		_fail("FDI36 fallback lacks a visible text label")
		return
	missing_reference.free()
	app.call("_reset_progress")
	print("SR14_ACTUAL_NATIVE_APP_CC0_FDI_SIX_CASES_PASS all six exact-source cases plus separately loaded FDI36 Dundee surface mesh and labelled fallback; headless only, no real pixels/GPU claimed")
	quit(0)
