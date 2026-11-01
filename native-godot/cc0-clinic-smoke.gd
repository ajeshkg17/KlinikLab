extends SceneTree
## SR13 source/hash/licensing and real imported GLB mesh test; not GPU/pixel QA.
const CASES := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
func _initialize() -> void:
	call_deferred("_run")
func _fail(reason: String) -> void:
	push_error("SR13_NATIVE_CC0_ENVIRONMENT_FAILED "+reason)
	quit(1)
func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript = load("res://cc0-clinic.gd")
	if script==null:
		_fail("Static clinic loader script missing")
		return
	var env: Node3D = script.new()
	if not bool(env.call("configure",sha)):
		_fail("Original CC0 clinic did not import: "+str(env.call("error")))
		return
	get_root().add_child(env)
	var result: Dictionary = env.call("summary")
	if not bool(result.get("sourceOriginalGLBsHashVerified",false)) or not bool(result.get("wholeSceneLoaded",false)) or not bool(result.get("trayLoaded",false)) or int(result.get("wholeMeshInstances",0))<20 or int(result.get("trayMeshInstances",0))<1:
		_fail("GLB source hash did not produce substantial native environment meshes")
		return
	if not env.has_node("KL_SOURCE_CC0_WHOLE_CLINIC") or not env.has_node("KL_SOURCE_CC0_TRAY_STATIC_PROP"):
		_fail("Live imported clinic/tray nodes missing")
		return
	var invalid: Node3D = script.new()
	if bool(invalid.call("configure","0000000000000000000000000000000000000000")):
		_fail("CC0 loader accepted wrong source SHA")
		return
	invalid.free()
	env.call("set_environment_visible",false)
	if env.visible:
		_fail("Static environment visibility did not switch")
		return
	env.call("set_environment_visible",true)
	var app_script: GDScript = load("res://app.gd")
	if app_script==null:
		_fail("Native actual app source unavailable")
		return
	var app: Node3D = app_script.new()
	if not bool(app.call("_load_source")):
		_fail("App source and language/clinic workflow rejected")
		return
	app.call("_load_progress")
	var scene := Node3D.new()
	get_root().add_child(scene)
	app.set("_scene",scene)
	app.set("_cc0_clinic",env)
	for i in range(6):
		app.call("_select_case",i)
		app.call("_select_station",i)
		var volume: Node3D = app.get("_volume")
		if volume==null or str((volume.call("summary") as Dictionary)["fdi"])!=FDIS[i]:
			_fail("CC0 background altered six-case source FDI state "+FDIS[i])
			return
		var content: Dictionary = app.get("_content")
		var source_case: Dictionary = content["cases"][i]
		if str(source_case["id"])!=CASES[i] or str(source_case["fdi"])!=FDIS[i] or (content["practical"][i] as Array).size()<5:
			_fail("Original case treatment and practical tasks changed")
			return
		if not env.visible or not bool((env.call("summary") as Dictionary)["wholeSceneLoaded"]):
			_fail("Clinic background unloaded during case navigation")
			return
	app.call("_reset_progress")
	print("SR13_NATIVE_IMPORTED_CC0_CLINIC_AND_SIX_FDI_WORKFLOWS_PASS real PackedScene meshes; original SHA and CC0; static only, NO WINDOWS PIXELS/GPU/CLINICAL QA")
	quit(0)
