extends SceneTree
## SR32 headless real-app keyboard-guided practical source-workflow regression.
## Not a native GPU/pixel, Quest, instrument-force or clinical assessment.
const FDIS := ["16","36","11","26","48","46"]
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR32_GUIDED_PRACTICAL_FAILED: " + reason)
	quit(1)

func _send_key(app: Node3D,code: Key) -> void:
	var k := InputEventKey.new()
	k.pressed = true
	k.keycode = code
	k.physical_keycode = code
	app.call("_input",k)

func _run() -> void:
	root.size = Vector2i(1600,900)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Native source-exact app scene not loadable")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	var source_content: Dictionary = app.get("_content")
	var progress: Dictionary = app.get("_progress")
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {
		"text":"Synthetic FSP/KP training note preserved", "result":{}}
	for i in range(FDIS.size()):
		app.call("_switch_view","clinic")
		app.call("_select_case",i)
		app.call("_select_station",4)
		if bool(app.get("_procedure_guided")) or bool(app.call("_procedure_move_step",1)):
			_fail("Guided navigation must be opt-in for default practical station")
			return
		app.call("_set_procedure_guided",true)
		var original_steps: Array = source_content["practical"][i]
		if original_steps.size() < 5 or not bool(app.get("_procedure_guided")):
			_fail("Original source tasks missing or guide not activated for FDI"+FDIS[i])
			return
		var first_step: Dictionary = original_steps[0]
		if str(first_step["type"])!="tooth" or str(first_step["target"])!=FDIS[i]:
			_fail("Wrong source FDI target "+FDIS[i])
			return
		if int(app.get("_procedure_step_index"))!=0 or bool(app.call("_procedure_move_step",-1)):
			_fail("Guide navigated below source first task")
			return
		var editor: Node3D = app.get("_volume")
		if editor == null:
			_fail("Original case synthetic volume missing for "+FDIS[i])
			return
		var before: Dictionary = editor.call("summary")
		_send_key(app,KEY_N)
		if int(app.get("_procedure_step_index")) != 1:
			_fail("N did not advance source task for "+FDIS[i])
			return
		_send_key(app,KEY_P)
		if int(app.get("_procedure_step_index")) != 0:
			_fail("P did not return to original source task for "+FDIS[i])
			return
		app.call("_practical_target",0,FDIS[i])
		var key: String = IDS[i] + ":practical:0"
		var record: Dictionary = (app.get("_progress") as Dictionary)["answers"].get(key,{})
		if not bool(record.get("correct",false)) or str(record.get("selected",""))!=FDIS[i]:
			_fail("Source-correct FDI original answer not recorded for "+FDIS[i])
			return
		app.call("_procedure_move_step",1)
		app.call("_procedure_move_step",-1)
		var feedback: Label = (app.get("_practical_feedback") as Dictionary).get(0)
		if feedback == null or not feedback.text.contains("Correct response recorded"):
			_fail("Persisted answer not restored in guided UI for "+FDIS[i])
			return
		for j in range(original_steps.size()+3):
			app.call("_procedure_move_step",1)
		if int(app.get("_procedure_step_index"))!=original_steps.size()-1 or bool(app.call("_procedure_move_step",1)):
			_fail("Guide navigated past source last task for "+FDIS[i])
			return
		if bool(app.get("_direct_bur_mode")):
			_fail("Keyboard workflow silently activated synthetic bur for "+FDIS[i])
			return
		var after: Dictionary = editor.call("summary")
		if str(after["fdi"])!=FDIS[i] or int(after.get("removedSamplePoints",-1)) != int(before.get("removedSamplePoints",-2)):
			_fail("Guided navigation changed FDI or synthetic tooth samples for "+FDIS[i])
			return
		app.call("_switch_view","language")
		if bool(app.get("_procedure_guided")) or bool(app.call("_procedure_move_step",-1)):
			_fail("Practical navigation leaked into FSP/KP language view")
			return
		if str((app.get("_progress") as Dictionary)["fspKpByTask"]["endo|anamnese"]["text"]) != "Synthetic FSP/KP training note preserved":
			_fail("Guide erased original FSP/KP language state")
			return
	app.call("_switch_view","environment")
	app.call("_select_case",1)
	app.call("_start_clinic_walk")
	if not bool(app.get("_walk_active")):
		_fail("Original CC0 walk entry failed")
		return
	var walker: RefCounted = app.get("_walk")
	for n in range(24):
		walker.call("apply_move_intent",Vector2(0.0,1.0),0.1)
	_send_key(app,KEY_E)
	if str(app.get("_view"))!="clinic" or not bool(app.get("_procedure_guided")) or int(app.get("_procedure_step_index"))!=0 or bool(app.get("_direct_bur_mode")):
		_fail("Walk E did not open guided selected FDI36 practical without drilling")
		return
	if str((app.get("_volume") as Node3D).call("summary").get("fdi",""))!="36":
		_fail("Walk E changed source FDI case")
		return
	app.call("_set_procedure_guided",false)
	if bool(app.get("_procedure_guided")) or not (app.get("_practical_feedback") as Dictionary).has((source_content["practical"][1] as Array).size()-1):
		_fail("Original all-tasks mode not restored")
		return
	print("SR32_NATIVE_GUIDED_PRACTICAL_SIX_FDI_FSP_KP_PASS keyboard N/P, source answers, optional all-tasks, no cutting/capture/Quest")
	quit(0)
