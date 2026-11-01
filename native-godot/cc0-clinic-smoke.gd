extends SceneTree
## Source-checked REAL native Godot glTF import, mesh instances and app load.
## Headless only: does not prove Windows desktop pixels, RTX PID or clinical accuracy.
const FDIS := ["16","36","11","26","48","46"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR13_ACTUAL_CC0_CLINIC_APP_TEST_FAILED "+reason)
	quit(1)

func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript = load("res://cc0-clinic.gd")
	if script == null:
		_fail("Actual CC0 Godot scene loader script not importable")
		return
	var cc0: Node3D = script.new()
	if bool(cc0.call("configure","0000000000000000000000000000000000000000")):
		_fail("Incorrect source Git revision accepted by environment loader")
		return
	if not bool(cc0.call("configure",sha)):
		_fail("Original reviewed CC0 GLBs not actually loadable in native Godot: "+str(cc0.call("error")))
		return
	var summary: Dictionary = cc0.call("summary")
	if int(summary.get("clinicMeshes",0))<100 or int(summary.get("trayMeshes",0))<2 or summary.get("clinicalValidated",true)!=false or summary.get("fdiAnatomySupplied",true)!=false:
		_fail("Actual imported environment/tray lacks meshes or incorrectly claims dental anatomy")
		return
	if cc0.get_node_or_null("KL_REVIEWED_CC0_WHOLE_CLINIC_NO_FDI_ANATOMY")==null or cc0.get_node_or_null("KL_REVIEWED_CC0_TRAY_STATIC_NOT_MANIPULABLE")==null:
		_fail("Both exact reviewed CC0 source GLBs not instantiated as 3D nodes")
		return
	cc0.free()
	var app_scene: PackedScene = load("res://app.tscn")
	if app_scene == null:
		_fail("Actual integrated KlinikLab application scene absent")
		return
	var app: Node3D = app_scene.instantiate() as Node3D
	if app == null:
		_fail("Real clinical app did not instantiate")
		return
	get_root().add_child(app) # executes actual app._ready, not a mocked workflow
	var live: Node3D = app.get("_cc0")
	var scene: Node3D = app.get("_scene")
	var workspace: Node3D = app.get("_schematic_workspace")
	if live==null or scene==null or workspace==null or not live.is_inside_tree():
		_fail("Source reviewed CC0 asset missing from actual running KlinikLab app scene")
		return
	if not live.visible or workspace.visible:
		_fail("Selected reviewed CC0 must be visible by default, with schematic initially hidden")
		return
	if (scene.get_node_or_null("KL_FDI16_BEFORE"))==null or (scene.get_node_or_null("KL_FDI16_AFTER"))==null:
		_fail("Immutable source FDI16 before/after geometry not retained")
		return
	var data: Dictionary = app.get("_content")
	if (data["cases"] as Array).size()!=6 or (data["stations"] as Array).size()!=7 or (data["practical"] as Array).size()!=6:
		_fail("Original six-case treatment practical workflows regressed")
		return
	app.call("_toggle_cc0_clinic")
	if live.visible or not workspace.visible:
		_fail("Native CC0/schematic toggle did not change actual 3D node visibility")
		return
	app.call("_toggle_cc0_clinic")
	if not live.visible or workspace.visible:
		_fail("Native CC0/schematic toggle could not restore imported clinic")
		return
	for i in range(6):
		app.call("_select_case",i)
		var volume: Node3D = app.get("_volume")
		if volume==null or str((volume.call("summary") as Dictionary).get("fdi",""))!=FDIS[i]:
			_fail("Source patient FDI case-specific preparation changed when CC0 room enabled, index "+str(i))
			return
		var surgical: Dictionary = (app.get("_content") as Dictionary)["cases"][i]
		if str(surgical.get("fdi",""))!=FDIS[i] or not (app.get("_pathways") as Dictionary).has(str(surgical["id"])):
			_fail("Case-specific source treatment workflow or anatomy identity drifted "+str(i))
			return
		if not live.visible:
			_fail("Changing original six cases hid/replaced imported CC0 clinic")
			return
	app.call("_reset_progress")
	print("SR13_REAL_APP_REVIEWED_CC0_CLINIC_PASS original 2 GLB PackedScenes imported/loaded in actual app; meshes="+str(summary["clinicMeshes"])+"/"+str(summary["trayMeshes"])+" original six-case FDI/treatment/toggle; NOT GPU/PIXEL OR CLINICAL ACCEPTANCE")
	quit(0)
