extends SceneTree
## Native 3D surface picking against actual regenerated procedural meshes.
## Runs headless Godot 4.7.2, not Windows GPU pixels or clinical tooling.

const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIs := ["16","36","11","26","48","46"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR12_NATIVE_RAY_BUR_FAILED "+reason)
	quit(1)

func _find_hit(editor: Node3D) -> Dictionary:
	var result: Dictionary = {"found":false}
	for y in [0.6,0.3,0.9,0.0,-0.4]:
		for x in [2.9,2.7,3.1,2.5,3.3]:
			result = editor.call("ray_hit",Vector3(x,y,12.0),Vector3(0,0,-1))
			if bool(result.get("found",false)):
				return result
	return result

func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript = load("res://volume-cut.gd")
	if script == null:
		_fail("Native volumetric mesh code not parsed")
		return
	for i in range(IDS.size()):
		var tooth: Node3D = script.new()
		if not bool(tooth.call("configure",sha,IDS[i])):
			_fail("Native source-verified tooth unavailable "+IDS[i])
			return
		get_root().add_child(tooth)
		var before: Dictionary = tooth.call("summary")
		var hit := _find_hit(tooth)
		if not bool(hit.get("found",false)) or str(hit.get("fdi","")) != FDIs[i] or str(hit.get("caseId","")) != IDS[i]:
			_fail("No correct original source FDI surface ray hit "+FDIs[i])
			return
		if not bool(tooth.call("cut_to",hit["at"],0.35)):
			_fail("Selected real surface could not remove synthetic material "+FDIs[i])
			return
		var after: Dictionary = tooth.call("summary")
		if int(after["removedSamplePoints"])<=0 or int(after["triangles"])==int(before["triangles"]):
			_fail("3D source geometry unchanged after actual pointer selection "+FDIs[i])
			return
		if not bool(tooth.call("undo")) or int((tooth.call("summary") as Dictionary)["removedSamplePoints"]) != 0:
			_fail("Native direct pointer cut did not undo "+FDIs[i])
			return
		if bool((tooth.call("ray_hit",Vector3.ZERO,Vector3.ZERO) as Dictionary).get("found",false)):
			_fail("Invalid zero-direction ray accepted")
			return
		tooth.visible = false
		if bool((tooth.call("ray_hit",Vector3(2.9,0.6,12.0),Vector3(0,0,-1)) as Dictionary).get("found",false)):
			_fail("Hidden wrong-case tooth still selectable")
			return
		get_root().remove_child(tooth)
		tooth.free()
	var app_script: GDScript = load("res://app.gd")
	if app_script == null:
		_fail("App script missing")
		return
	var app: Node3D = app_script.new()
	if not bool(app.call("_load_source")):
		_fail("App original source integrity failed")
		return
	app.call("_load_progress")
	app.set("_scene",Node3D.new())
	get_root().add_child(app.get("_scene"))
	app.call("_select_case",1)
	app.call("_select_station",4)
	app.set("_view","clinic")
	var editor: Node3D = app.get("_volume")
	if editor == null:
		_fail("App FDI36 selected editor missing")
		return
	editor.call("reset")
	var source_hit: Dictionary = _find_hit(editor)
	if not bool(source_hit.get("found",false)):
		_fail("App FDI36 native surface could not be picked")
		return
	# The test's candidate ray uses the same XY world coordinates as the hit.
	var actual_ray_origin := Vector3(2.9,0.6,12.0)
	var found_origin := false
	for y in [0.6,0.3,0.9,0.0,-0.4]:
		for x in [2.9,2.7,3.1,2.5,3.3]:
			if bool((editor.call("ray_hit",Vector3(x,y,12.0),Vector3(0,0,-1)) as Dictionary).get("found",false)):
				actual_ray_origin=Vector3(x,y,12.0)
				found_origin=true
				break
		if found_origin:
			break
	if not found_origin:
		_fail("App FDI36 has no valid pointer ray")
		return
	if bool(app.call("_direct_cut_world_ray",actual_ray_origin,Vector3(0,0,-1))):
		_fail("Direct cutting accepted without explicit opt-in")
		return
	app.set("_direct_bur_mode",true)
	app.set("_cut_radius",0.35)
	if not bool(app.call("_direct_cut_world_ray",actual_ray_origin,Vector3(0,0,-1))):
		_fail("Opted-in app direct source-ray cutting did not persist")
		return
	var stored: Dictionary = (app.get("_progress") as Dictionary)["volumeByCase"]
	if not stored.has("endo") or (stored["endo"] as Array).size()!=1 or stored.has("molar") and (stored["molar"] as Array).size()>0:
		_fail("Source FDI36 pointer cut absent or crossed into FDI16 journal")
		return
	app.call("_select_case",3)
	if bool(app.get("_direct_bur_mode")):
		_fail("Pointer edit mode did not disable on case switching")
		return
	app.call("_reset_progress")
	print("SR12_NATIVE_DIRECT_3D_TOOTH_POINTER_PASS all 6 source tooth meshes ray/3D cut/undo; opt-in case guard and persistence; NO GPU/CLINICAL VALIDATION")
	quit(0)
