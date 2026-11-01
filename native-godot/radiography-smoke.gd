extends SceneTree
## Actual Godot headless source PNG decode and six FDI case integrity tests.
## No physical radiographs, diagnosis, Windows GPU pixels or clinical approval.
const CASES := ["molar","endo","anterior","crown","surgery","perio"]
const FDIs := ["16","36","11","26","48","46"]
const KINDS := ["caries","apex","trauma","normal","impaction","bone"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	push_error("SR10_NATIVE_RADIOGRAPHY_SMOKE_FAILED " + message)
	quit(1)

func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript = load("res://radiography-panel.gd")
	if script == null:
		_fail("Native radiography script not loadable")
		return
	for i in range(6):
		var panel: TextureRect = script.new()
		if not bool(panel.call("configure",sha,CASES[i])):
			_fail("Synthetic source image failed FDI"+FDIs[i]+": "+str(panel.call("error")))
			return
		var info: Dictionary = panel.call("info")
		if str(info.get("fdi","")) != FDIs[i] or str(info.get("kind","")) != KINDS[i]:
			_fail("Radiography case/finding mislabeled FDI"+FDIs[i])
			return
		if panel.texture == null or panel.texture.get_width()!=360 or panel.texture.get_height()!=240:
			_fail("Native Godot did not decode actual image for FDI"+FDIs[i])
			return
		if not bool(panel.call("set_marks",[[0.43,0.25],[0.55,0.75]])) or int(panel.call("marks_count")) != 2:
			_fail("Native image location selection storage failed")
			return
		panel.call("reveal",true)
		if bool(panel.call("set_marks",[[1.2,0.3]])):
			_fail("Out-of-image location mark accepted")
			return
		if bool(panel.call("configure",sha, "invented")):
			_fail("Unknown clinical source image accepted")
			return
	var app_script: GDScript = load("res://app.gd")
	if app_script == null:
		_fail("Native app script failed to load")
		return
	var app: Node3D = app_script.new()
	if not bool(app.call("_load_source")):
		_fail("Native app source integrity rejected")
		return
	app.call("_load_progress")
	app.call("_radiology_choose",1) # source FDI16 caries
	app.call("_radiology_mark",Vector2(0.4,0.3))
	app.call("_radiology_review")
	var state: Dictionary = app.call("_radiology_state")
	if str(state.get("choice",""))!="caries" or not bool(state.get("reviewed",false)) or (state["marks"] as Array).size()!=1:
		_fail("Native clinical radiography selection/review not persisted")
		return
	var report: String = app.call("_generate_report")
	if not report.contains("Synthetic source radiography: choice=caries"):
		_fail("Local user study report missing synthetic image record")
		return
	app.call("_radiology_reset")
	if (app.call("_radiology_state") as Dictionary).get("choice","x")!="":
		_fail("Radiography reset did not clear case exercise")
		return
	app.call("_reset_progress")
	print("SR10_NATIVE_SIX_SYNTHETIC_RADIOGRAPHS_PASS 6 real decoded PNG, FDI, labels, marks, local report/reset; NOT CLINICAL OR GPU ACCEPTANCE")
	quit(0)
