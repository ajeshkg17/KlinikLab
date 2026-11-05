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

# SR58: source steps and selection controls must precede long case prose,
# model licence and anatomy reference, not merely exist off-screen below them.
func _sr58_task_first_order(app: Node3D, fdi: String, guided: bool) -> bool:
	var page: VBoxContainer = app.get("_page")
	var task_banner := -1
	var start_button := -1
	var first_source_step := -1
	var navigation := -1
	var anatomy_reference := -1
	var case_history := -1
	for i in range(page.get_child_count()):
		var child: Node = page.get_child(i)
		if child is Label:
			var text: String = (child as Label).text
			if text.contains("SOURCE PRACTICAL · FDI " + fdi):
				task_banner = i
			elif text.begins_with("1. "):
				first_source_step = i
			elif text.contains("ANATOMY REFERENCE — educational provenance"):
				anatomy_reference = i
			elif text.begins_with("Medical history: "):
				case_history = i
		if child is Button:
			var button: Button = child as Button
			if button.name == "KL_PRACTICAL_START_GUIDE":
				start_button = i
			elif button.text.begins_with("Next task (N)"):
				navigation = i
	if task_banner < 0 or first_source_step <= task_banner or anatomy_reference <= first_source_step or case_history <= anatomy_reference:
		return false
	if guided:
		return start_button == -1 and navigation > first_source_step
	return start_button > task_banner and start_button < first_source_step and navigation == -1

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
		if not _sr58_task_first_order(app, FDIS[i], false):
			_fail("SR58 source practical first action, anatomy or fictional case order incorrect FDI" + FDIS[i])
			return
		var start_guide: Button = (app.get("_page") as VBoxContainer).get_node_or_null("KL_PRACTICAL_START_GUIDE") as Button
		if start_guide == null or start_guide.disabled:
			_fail("SR58 primary start guide unavailable for FDI" + FDIS[i])
			return
		start_guide.pressed.emit() # test the real learner-visible button, not only internal method
		if not _sr58_task_first_order(app, FDIS[i], true):
			_fail("SR58 first guided task hidden behind navigation or licence text FDI" + FDIS[i])
			return
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
		# SR73: review only genuinely source-correct graded answers.
		# Drill is an unscored synthetic experiment, not a quiz answer.
		var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
		var tools: Array = source_content["tools"]
		var review_index := -1
		for j in range(1, original_steps.size()):
			var source_step: Dictionary = original_steps[j]
			var selected: Variant = null
			match str(source_step["type"]):
				"choice":
					selected = int(source_step["correct"])
				"tooth":
					selected = str(source_step["target"])
				"tool":
					selected = str(source_step["target"])
				"drill":
					continue
				_:
					_fail("Unknown Practical source step type")
					return
			answers[IDS[i]+":practical:"+str(j)] = {"selected":selected,"correct":true,"sourceQuestion":j}
			if review_index < 0:
				review_index = j
		if review_index < 0:
			_fail("No scored source Practical review task FDI"+FDIS[i])
			return
		answers[IDS[i]+":practical:"+str(review_index)]["correct"] = false
		if int(app.get("_procedure_step_index")) != 0:
			_fail("Review setup lost first source task")
			return
		_send_key(app,KEY_R)
		if int(app.get("_procedure_step_index")) != review_index:
			_fail("R did not find the incorrect original source task for "+FDIS[i])
			return
		if bool(app.call("_procedure_jump_to_review")):
			_fail("Sole review task must not falsely move or record an answer")
			return
		answers[IDS[i]+":practical:"+str(review_index)]["correct"] = true
		if bool(app.call("_procedure_jump_to_review")):
			_fail("All source-validated tasks must have no pending review")
			return
		# Check wrap-around using a different graded task when available.
		var wrap_index := -1
		for j in range(1,original_steps.size()):
			if j != review_index and answers.has(IDS[i]+":practical:"+str(j)):
				wrap_index = j
				break
		if wrap_index >= 0:
			answers[IDS[i]+":practical:"+str(wrap_index)]["correct"] = false
			_send_key(app,KEY_R)
			if int(app.get("_procedure_step_index")) != wrap_index:
				_fail("Review wrap-around failed for "+FDIS[i])
				return
		# Explicit SR73 saved-state forgery regression on real Godot app methods.
		# A true flag cannot skip a source-wrong response or a different step.
		var source_record_key: String = str(IDS[i]) + ":practical:" + str(review_index)
		var valid_record: Dictionary = answers[source_record_key].duplicate(true)
		if not bool(app.call("_practical_source_complete", review_index)):
			_fail("Source-correct persisted Practical record rejected FDI"+FDIS[i])
			return
		answers[source_record_key]["sourceQuestion"] = review_index + 1
		if bool(app.call("_practical_source_complete", review_index)):
			_fail("Cross-step forged Practical completion trusted FDI"+FDIS[i])
			return
		answers[source_record_key] = valid_record.duplicate(true)
		match str(original_steps[review_index]["type"]):
			"choice":
				answers[source_record_key]["selected"] = -1
			"tooth":
				answers[source_record_key]["selected"] = "99"
			"tool":
				answers[source_record_key]["selected"] = "__not_a_source_tool__"
		if bool(app.call("_practical_source_complete", review_index)):
			_fail("Wrong selected value with correct=true trusted FDI"+FDIS[i])
			return
		answers[source_record_key] = valid_record.duplicate(true)
		answers[source_record_key]["correct"] = "true"
		if bool(app.call("_practical_source_complete", review_index)):
			_fail("String correctness flag was treated as true FDI"+FDIS[i])
			return
		answers[source_record_key] = valid_record.duplicate(true)
		# A JSON read-back turns integer indices into numeric whole floats;
		# matching question identity must remain valid.
		answers[source_record_key]["sourceQuestion"] = float(review_index)
		if not bool(app.call("_practical_source_complete", review_index)):
			_fail("Whole-number JSON source question rejected FDI"+FDIS[i])
			return
		answers[source_record_key]["sourceQuestion"] = float(review_index) + 0.25
		if bool(app.call("_practical_source_complete", review_index)):
			_fail("Fractional question identity was trusted FDI"+FDIS[i])
			return
		answers[source_record_key] = valid_record
		for j in range(1,original_steps.size()):
			answers.erase(IDS[i]+":practical:"+str(j))
		if bool(app.get("_direct_bur_mode")):
			_fail("Review navigation enabled bur")
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
		# SR34: independent manual checklist, retained in the existing v2 journal.
		var before_answers: String = JSON.stringify((app.get("_progress") as Dictionary)["answers"])
		app.call("_procedure_set_checklist",0,true)
		app.call("_procedure_set_checklist",1,true)
		if not bool(app.call("_procedure_checklist_complete",0)) or not bool(app.call("_procedure_checklist_complete",1)):
			_fail("Checklist state not set for "+FDIS[i])
			return
		app.call("_procedure_set_checklist",1,false)
		if bool(app.call("_procedure_checklist_complete",1)):
			_fail("Checklist uncheck failed for "+FDIS[i])
			return
		if JSON.stringify((app.get("_progress") as Dictionary)["answers"]) != before_answers:
			_fail("Checklist changed formative responses for "+FDIS[i])
			return
		var journal: Variant = JSON.parse_string(FileAccess.get_file_as_string("user://kliniklab-native-progress-v2.json"))
		if not (journal is Dictionary) or not bool((journal.get("practicalChecklist", {}) as Dictionary).get(IDS[i], {}).get("0",false)):
			_fail("Checklist not persisted to source-versioned journal for "+FDIS[i])
			return
		app.call("_load_progress")
		if not bool(app.call("_procedure_checklist_complete",0)) or bool(app.call("_procedure_checklist_complete",1)):
			_fail("Checklist did not survive journal reload for "+FDIS[i])
			return
		if bool(app.get("_direct_bur_mode")):
			_fail("Checklist action enabled bur for "+FDIS[i])
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
	print("SR34_NATIVE_PRACTICAL_CHECKLIST_PERSISTENCE_PASS six FDI, per-case isolation, journal reload, FSP/KP, no bur")
	print("SR58_SIX_FDI_TASK_FIRST_GUIDED_PRACTICAL_PASS real start signal, original task ahead of source references, persisted behaviour; headless only")
	print("SR32_NATIVE_GUIDED_PRACTICAL_SIX_FDI_FSP_KP_PASS keyboard N/P, source answers, optional all-tasks, no cutting/capture/Quest")
	print("SR73_SIX_FDI_SOURCE_VALIDATED_PRACTICAL_REVIEW_PASS headless only")
	quit(0)
