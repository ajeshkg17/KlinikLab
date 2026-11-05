extends SceneTree
## SR70: real Godot 4.7.2 source-pinned FDI Practical answer-state parity.
## HEADLESS only: six cases, actual 32-tooth Button.pressed signals, source
## IDs, wrong/correct retry, completion lock, journal restore, malformed data.
## No screenshot, external mouse, synthetic bur action or GPU acceptance.
const FDIS := ["16","36","11","26","48","46"]
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const WRONG_FDI := "18"

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR70_PRACTICAL_FDI_RECALL_FAILED: " + reason)
	quit(1)

func _button(app: Node3D, code: String) -> Button:
	return (app.get("_page") as VBoxContainer).find_child("KL_FDI_TOOTH_"+code,true,false) as Button

func _status(app: Node3D) -> String:
	var label: Label = (app.get("_page") as VBoxContainer).get_node_or_null("KL_PRACTICAL_FDI_SELECTION_0") as Label
	return label.text if label != null else ""

func _feedback(app: Node3D) -> String:
	var label: Label = (app.get("_practical_feedback") as Dictionary).get(0) as Label
	return label.text if label != null else ""

func _record(app: Node3D, case_i: int) -> Dictionary:
	return ((app.get("_progress") as Dictionary)["answers"] as Dictionary).get(IDS[case_i]+":practical:0",{})

func _run() -> void:
	root.size = Vector2i(1536,816)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Source-pinned app scene missing")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # Hosted CI isolated user://, not owner data.
	var progress: Dictionary = app.get("_progress")
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {"text":"SR70 preserved formative FSP note","result":{}}
	app.call("_save_progress")
	var content: Dictionary = app.get("_content")
	for case_i in range(FDIS.size()):
		app.call("_switch_view","clinic")
		app.call("_select_case",case_i)
		app.call("_select_station",4)
		app.call("_set_procedure_guided",true)
		var steps: Array = content["practical"][case_i]
		if steps.is_empty() or str((steps[0] as Dictionary).get("type","")) != "tooth" or str((steps[0] as Dictionary).get("target","")) != FDIS[case_i]:
			_fail("Original Practical first task source FDI mismatch "+FDIS[case_i])
			return
		var target: String = FDIS[case_i]
		var page: VBoxContainer = app.get("_page")
		if page.find_children("KL_FDI_TOOTH_*","Button",true,false).size() != 32:
			_fail("Not all 32 source chart controls present for "+target)
			return
		if _record(app,case_i).size() != 0 or not _status(app).contains("No valid FDI answer") or _button(app,WRONG_FDI).button_pressed or _button(app,target).button_pressed:
			_fail("New source case falsely shows a previous selection "+target)
			return
		var volume: Node3D = app.get("_volume")
		var before_strokes: Array = volume.call("export_strokes")
		# A chart selection is not a tool action: actual button signal only.
		var wrong: Button = _button(app,WRONG_FDI)
		wrong.pressed.emit()
		var answer: Dictionary = _record(app,case_i)
		if bool(answer.get("correct",true)) or str(answer.get("selected","")) != WRONG_FDI or int(answer.get("sourceQuestion",-1)) != 0:
			_fail("Wrong FDI selection was not correctly recorded for "+target)
			return
		if not _status(app).contains("Saved FDI selection: "+WRONG_FDI) or not _status(app).contains("incorrect") or not _feedback(app).contains("Incorrect FDI selection") or not _button(app,WRONG_FDI).button_pressed or _button(app,target).button_pressed:
			_fail("Wrong source FDI not visibly marked for retry "+target)
			return
		_button(app,target).pressed.emit()
		answer = _record(app,case_i)
		if not bool(answer.get("correct",false)) or str(answer.get("selected","")) != target or not _status(app).contains("Saved FDI selection: "+target) or not _status(app).contains("correct task completed") or not _feedback(app).contains(str((steps[0] as Dictionary)["success"])):
			_fail("Correct FDI/source explanation not retained "+target)
			return
		if not _button(app,target).button_pressed or _button(app,WRONG_FDI).button_pressed or _button(app,WRONG_FDI).disabled:
			_fail("Chart selection or continued exploratory access inconsistent "+target)
			return
		var frozen: String = JSON.stringify(answer)
		# Browser allows exploration after task success, but never unmarks done.
		_button(app,WRONG_FDI).pressed.emit()
		app.call("_practical_target",0,WRONG_FDI)
		app.call("_practical_target",0,"99")
		if JSON.stringify(_record(app,case_i)) != frozen or not _button(app,target).button_pressed or not _status(app).contains("correct task completed"):
			_fail("Completed task was silently overwritten by an exploratory FDI click "+target)
			return
		if not bool(app.call("_procedure_move_step",1)) or not bool(app.call("_procedure_move_step",-1)):
			_fail("Could not navigate away and back from source FDI step "+target)
			return
		if not _button(app,target).button_pressed or not _status(app).contains("Saved FDI selection: "+target) or not _feedback(app).contains(str((steps[0] as Dictionary)["success"])):
			_fail("Correct FDI selection/source feedback not rebuilt on navigation "+target)
			return
		# Actual source-versioned journal serialization/reload, not a label cache.
		var disk: Variant = JSON.parse_string(FileAccess.get_file_as_string("user://kliniklab-native-progress-v2.json"))
		if not (disk is Dictionary) or not bool((disk["answers"] as Dictionary).get(IDS[case_i]+":practical:0",{}).get("correct",false)):
			_fail("Actual disk journal lacks saved source tooth "+target)
			return
		app.call("_load_progress")
		app.call("_refresh")
		if not _button(app,target).button_pressed or not _feedback(app).contains(str((steps[0] as Dictionary)["success"])):
			_fail("Actual disk journal reload lost original saved FDI "+target)
			return
		var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
		var answer_key: String = IDS[case_i]+":practical:0"
		var original: Dictionary = (answers[answer_key] as Dictionary).duplicate(true)
		for invalid_selection in ["99", 26, "", "1A"]:
			answers[answer_key] = {"selected":invalid_selection,"correct":true,"sourceQuestion":0}
			app.call("_refresh")
			if _button(app,target).button_pressed or _status(app).contains("correct task completed") or not _feedback(app).contains("Not answered"):
				_fail("Malformed saved FDI selection falsely marked complete "+target+"/"+str(invalid_selection))
				return
		answers[answer_key] = {"selected":WRONG_FDI,"correct":true,"sourceQuestion":0}
		app.call("_refresh")
		if _status(app).contains("correct task completed") or not _status(app).contains("incorrect") or not _button(app,WRONG_FDI).button_pressed:
			_fail("Inconsistent correct flag with wrong FDI falsely passed "+target)
			return
		answers[answer_key] = {"selected":target,"correct":true,"sourceQuestion":1}
		app.call("_refresh")
		if _button(app,target).button_pressed or _status(app).contains("correct task completed"):
			_fail("Wrong source task ID falsely passed "+target)
			return
		answers[answer_key] = original
		app.call("_refresh")
		if not _button(app,target).button_pressed or not _status(app).contains("correct task completed"):
			_fail("Valid source answer not restored after negative fixtures "+target)
			return
		if (volume.call("export_strokes") as Array).size() != before_strokes.size() or bool(app.get("_direct_bur_mode")):
			_fail("Tooth identification altered cutting or enabled bur "+target)
			return
		if str(((app.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary)["endo|anamnese"]["text"]) != "SR70 preserved formative FSP note":
			_fail("FDI chart corrupted FSP/KP note "+target)
			return
	app.call("_reset_progress")
	print("SR70_SIX_FDI_PRACTICAL_TOOTH_RECALL_LOCK_PASS 32 buttons each; wrong/retry/correct/locked-source-answers/navigation/disk_reload/stale-ID/reference-only-chart/FSP-KP/no-bur; HEADLESS NOT PIXELS")
	quit(0)
