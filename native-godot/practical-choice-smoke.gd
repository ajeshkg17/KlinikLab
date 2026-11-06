extends SceneTree
## SR69: real Godot 4.7.2 headless application Practical.choice parity.
## Original source explanation, selected option, correct-answer immutability
## and source-versioned journal must agree. No GPU, input capture or cutting.
const FDIS := ["16","36","11","26","48","46"]
const IDS := ["molar","endo","anterior","crown","surgery","perio"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR69_NATIVE_PRACTICAL_CHOICE_PARITY_FAILED: "+reason)
	quit(1)

func _go_to_step(app: Node3D, target: int) -> bool:
	while int(app.get("_procedure_step_index")) < target:
		if not bool(app.call("_procedure_move_step",1)):
			return false
	while int(app.get("_procedure_step_index")) > target:
		if not bool(app.call("_procedure_move_step",-1)):
			return false
	return true

func _choice_button(app: Node3D, step_index: int, choice: int) -> Button:
	var page: VBoxContainer = app.get("_page")
	return page.get_node_or_null("KL_PRACTICAL_CHOICE_%d_%d" % [step_index,choice]) as Button

func _feedback(app: Node3D, step_index: int) -> String:
	var label: Label = (app.get("_practical_feedback") as Dictionary).get(step_index) as Label
	return label.text if label != null else ""

func _run() -> void:
	root.size = Vector2i(1536,816)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Actual source-pinned scene missing")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # CI's own isolated user://, no owner profile.
	var content: Dictionary = app.get("_content")
	var original_count := 0
	var checked_correct := [false,false,false]
	var fsp: Dictionary = (app.get("_progress") as Dictionary)["fspKpByTask"]
	fsp["endo|anamnese"] = {"text":"SR69 untouched FSP source practice","result":{}}
	for case_i in range(FDIS.size()):
		app.call("_switch_view","clinic")
		app.call("_select_case",case_i)
		app.call("_select_station",4)
		app.call("_set_procedure_guided",true)
		var steps: Array = content["practical"][case_i]
		var editor: Node3D = app.get("_volume")
		if editor == null or str(editor.call("summary").get("fdi","")) != FDIS[case_i]:
			_fail("Wrong FDI synthetic model "+FDIS[case_i])
			return
		var geometry_before: Dictionary = editor.call("summary")
		var choices_this_case := 0
		for step_index in range(steps.size()):
			var step: Dictionary = steps[step_index]
			if str(step["type"]) != "choice":
				continue
			if not _go_to_step(app,step_index):
				_fail("Guided navigation could not reach source choice "+FDIS[case_i]+"/"+str(step_index))
				return
			var correct: int = int(step["correct"])
			if correct < 0 or correct > 2:
				_fail("Source choice correct index outside three-option contract")
				return
			checked_correct[correct] = true
			choices_this_case += 1
			original_count += 1
			var wrong: int = (correct + 1) % 3
			var b_wrong: Button = _choice_button(app,step_index,wrong)
			var b_right: Button = _choice_button(app,step_index,correct)
			var explanation: String = str(step["explanation"])
			if b_wrong == null or b_right == null or b_wrong.disabled or b_right.disabled or not _feedback(app,step_index).contains("Not answered"):
				_fail("New original question cannot be answered "+FDIS[case_i]+"/"+str(step_index))
				return
			b_wrong.pressed.emit() # REAL learner-facing button signal
			var key: String = IDS[case_i]+":practical:"+str(step_index)
			var wrong_record: Dictionary = (app.get("_progress") as Dictionary)["answers"].get(key,{})
			if bool(wrong_record.get("correct",true)) or wrong_record.get("selected") != wrong or not _feedback(app,step_index).contains(explanation):
				_fail("Wrong answer lacks original formative explanation "+key)
				return
			if b_wrong.disabled or not b_wrong.text.begins_with("↻ Review selection") or b_right.disabled:
				_fail("Wrong choice not retryable or not visibly marked "+key)
				return
			b_right.pressed.emit() # retry correct choice
			var solved: Dictionary = (app.get("_progress") as Dictionary)["answers"].get(key,{})
			if not bool(solved.get("correct",false)) or solved.get("selected") != correct or not _feedback(app,step_index).contains(explanation) or not _feedback(app,step_index).begins_with("Correct. "):
				_fail("Correct response/explanation did not replace wrong selection "+key)
				return
			for choice in range(3):
					var b: Button = _choice_button(app,step_index,choice)
					if b == null or not b.disabled or (choice == correct and not b.text.begins_with("✓ Correct selection")):
						_fail("Correct practical choice not locked/selected "+key)
						return
			var frozen: String = JSON.stringify(solved)
			app.call("_practical_choice",step_index,wrong) # direct stale/synthetic signal must not overwrite.
			if JSON.stringify(((app.get("_progress") as Dictionary)["answers"] as Dictionary)[key]) != frozen:
				_fail("Locked source decision overwritten by direct callback "+key)
				return
			# Move off and back: the entire controls/feedback are rebuilt from
			# original source and already-persisted answer, not a cached label.
			if step_index < steps.size()-1:
				if not _go_to_step(app,step_index+1):
					_fail("Could not leave solved question "+key)
					return
			else:
				if not _go_to_step(app,step_index-1):
					_fail("Could not leave final solved question "+key)
					return
			if not _go_to_step(app,step_index):
				_fail("Could not revisit solved question "+key)
				return
			if _choice_button(app,step_index,correct) == null or not _choice_button(app,step_index,correct).disabled or not _feedback(app,step_index).contains(explanation):
				_fail("Source explanation/locked choice lost on navigation "+key)
				return
			var journal: Variant = JSON.parse_string(FileAccess.get_file_as_string("user://kliniklab-native-progress-v2.json"))
			if not (journal is Dictionary) or not bool((journal.get("answers",{}) as Dictionary).get(key,{}).get("correct",false)):
				_fail("Source-versioned disk journal lost answer "+key)
				return
			app.call("_load_progress")
			app.call("_refresh")
			if _choice_button(app,step_index,correct) == null or not _choice_button(app,step_index,correct).disabled or not _feedback(app,step_index).contains(explanation):
				_fail("Saved response feedback lost on actual journal reload "+key)
				return
			# A malformed legacy/stale selection must not lock choices or
			# invent a correct answer. Restore the real source decision.
			var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
			for invalid_selection in [999, 1.5, str(correct)]:
				answers[key] = {"selected":invalid_selection,"correct":true,"sourceQuestion":step_index}
				app.call("_refresh")
				if _choice_button(app,step_index,correct) == null or _choice_button(app,step_index,correct).disabled or _feedback(app,step_index) != "Not answered":
					_fail("Invalid numeric/string choice falsely displayed as solved "+key+"/"+str(invalid_selection))
					return
			answers[key] = {"selected":correct,"correct":true,"sourceQuestion":step_index+1}
			app.call("_refresh")
			if _choice_button(app,step_index,correct) == null or _choice_button(app,step_index,correct).disabled or _feedback(app,step_index) != "Not answered":
				_fail("Mismatched sourceQuestion falsely displayed as solved "+key)
				return
			answers[key] = solved
			app.call("_refresh")
			# Reproduce the JSON disk-reloaded string truthiness conflict:
			# source selection/step correct, but correctness is a String.
			var saved_answers: Dictionary = answers.duplicate(true)
			for other_i in range(steps.size()):
				var other: Dictionary = steps[other_i]
				var kind: String = str(other.get("type", ""))
				if kind == "drill" or other_i == step_index:
					continue
				var selection: Variant = null
				match kind:
					"choice": selection = int(other["correct"])
					"tooth", "tool": selection = str(other["target"])
					_: _fail("Unknown source Practical task"); return
				answers[IDS[case_i]+":practical:"+str(other_i)] = {"selected":selection,"correct":true,"sourceQuestion":other_i}
			answers[key] = {"selected":correct,"correct":"true","sourceQuestion":step_index}
			app.call("_save_progress")
			app.call("_load_progress")
			answers = (app.get("_progress") as Dictionary)["answers"]
			var disk_string: Variant = JSON.parse_string(FileAccess.get_file_as_string("user://kliniklab-native-progress-v2.json"))
			if not (disk_string is Dictionary) or (disk_string["answers"] as Dictionary)[key].get("correct") != "true":
				_fail("Synthetic literal-string correct flag was not actually disk reloaded "+key)
				return
			app.call("_refresh")
			var state: Dictionary = app.call("_practical_choice_record",step_index,step)
			if bool(state["solved"]) or bool(app.call("_practical_source_complete",step_index)) or _choice_button(app,step_index,correct).disabled or not _feedback(app,step_index).begins_with("Review required."):
				_fail("Disk-reloaded string correctness falsely locked source choice "+key)
				return
			var review_button: Button = null
			for node in (app.get("_page") as VBoxContainer).get_children():
				if node is Button and (node as Button).text.begins_with("Next task to review (R)"):
					review_button = node as Button
					break
			if review_button == null or review_button.disabled or not review_button.text.contains("1 remaining"):
				_fail("String correctness did not count as pending Review task "+key)
				return
			var adjacent: int = step_index+1 if step_index+1 < steps.size() else step_index-1
			if not _go_to_step(app,adjacent):
				_fail("Cannot prepare Review navigation from adjacent step "+key)
				return
			app.call("_procedure_jump_to_review")
			if int(app.get("_procedure_step_index")) != step_index:
				_fail("Review skipped string-correctness source task "+key)
				return
			var retry: Button = _choice_button(app,step_index,correct)
			if retry == null or retry.disabled:
				_fail("String-correctness record prevented legitimate source choice retry "+key)
				return
			retry.pressed.emit()
			var repaired: Dictionary = ((app.get("_progress") as Dictionary)["answers"] as Dictionary)[key]
			if repaired.get("correct",null) != true or repaired.get("selected",null) != correct or not bool(app.call("_practical_source_complete",step_index)) or not bool(app.call("_practical_choice_record",step_index,step)["solved"]) or not _choice_button(app,step_index,correct).disabled:
				_fail("Legitimate choice resubmission did not repair source journal and lock "+key)
				return
			(app.get("_progress") as Dictionary)["answers"] = saved_answers
			answers = saved_answers
			app.call("_save_progress")
			app.call("_refresh")
		if choices_this_case == 0:
			_fail("No original choice found for "+FDIS[case_i])
			return
		var geometry_after: Dictionary = editor.call("summary")
		if int(geometry_before.get("removedSamplePoints",-2)) != int(geometry_after.get("removedSamplePoints",-1)) or bool(app.get("_direct_bur_mode")):
			_fail("Formative choice navigation modified or activated source tooth cutting "+FDIS[case_i])
			return
		if str(((app.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary)["endo|anamnese"]["text"]) != "SR69 untouched FSP source practice":
			_fail("Practical answer interaction corrupted FSP/KP content")
			return
	if checked_correct.has(false):
		_fail("Did not test all three source correct-answer positions")
		return
	if original_count < 10:
		_fail("Practical answer matrix unexpectedly small: "+str(original_count))
		return
	app.call("_reset_progress")
	print("SR76_CHOICE_STRICT_BOOLEAN_DISK_REVIEW_RETRY_SIX_FDI_PASS headless only")
	print("SR69_NATIVE_PRACTICAL_CHOICE_SOURCE_EXPLANATION_LOCK_SIX_FDI_PASS original_choices="+str(original_count)+" wrong/retry/lock/navigation/journal_reload/stale_index/source_FDI/no_bur; HEADLESS NOT PIXELS")
	quit(0)
