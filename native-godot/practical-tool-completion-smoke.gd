extends SceneTree
## SR71 actual Godot 4.7.2 headless Practical source-instrument completion.
## Distinct from SR68 saved menu recall: this verifies locked correct answers
## cannot be overwritten, and wrong selections never show source success.
## No pixels, physical mouse, GPU, watcher or patient data.
const FDIS := ["16", "36", "11", "26", "48", "46"]
const IDS := ["molar", "endo", "anterior", "crown", "surgery", "perio"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR71_PRACTICAL_TOOL_COMPLETION_FAILED: " + reason)
	quit(1)

func _menu(app: Node3D, index: int) -> OptionButton:
	var page: VBoxContainer = app.get("_page")
	return page.get_node_or_null("KL_PRACTICAL_TOOL_" + str(index)) as OptionButton

func _feedback(app: Node3D, index: int) -> String:
	var label: Label = (app.get("_practical_feedback") as Dictionary).get(index) as Label
	return label.text if label != null else ""

func _answer(app: Node3D, case_i: int, index: int) -> Dictionary:
	var journal: Dictionary = (app.get("_progress") as Dictionary)["answers"]
	return journal.get(IDS[case_i] + ":practical:" + str(index), {})

func _at_step(app: Node3D, index: int) -> bool:
	while int(app.get("_procedure_step_index")) < index:
		if not bool(app.call("_procedure_move_step", 1)):
			return false
	while int(app.get("_procedure_step_index")) > index:
		if not bool(app.call("_procedure_move_step", -1)):
			return false
	return true

func _select_real_menu(app: Node3D, index: int, option: int) -> void:
	var menu: OptionButton = _menu(app, index)
	menu.select(option)
	menu.item_selected.emit(option) # learner-visible real OptionButton signal

func _run() -> void:
	root.size = Vector2i(1536, 816)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Actual native app scene unavailable")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # CI isolated Godot user:// only.
	var progress: Dictionary = app.get("_progress")
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {
		"text": "SR71 unrelated FSP note must survive", "result": {}
	}
	app.call("_save_progress")
	var source: Dictionary = app.get("_content")
	var tools: Array = source["tools"]
	var total_tools := 0
	var crown_tools := 0
	for case_i in range(FDIS.size()):
		app.call("_switch_view", "clinic")
		app.call("_select_case", case_i)
		app.call("_select_station", 4)
		app.call("_set_procedure_guided", true)
		var steps: Array = source["practical"][case_i]
		var volume: Node3D = app.get("_volume")
		if volume == null or str(volume.call("summary").get("fdi", "")) != FDIS[case_i]:
			_fail("Case-specific source FDI volume mismatch " + FDIS[case_i])
			return
		var before_strokes: Array = volume.call("export_strokes")
		var tools_in_case := 0
		for index in range(steps.size()):
			var step: Dictionary = steps[index]
			if str(step.get("type", "")) != "tool":
				continue
			total_tools += 1
			tools_in_case += 1
			if case_i == 3:
				crown_tools += 1
			if not _at_step(app, index):
				_fail("Could not reach original source tool step " + FDIS[case_i])
				return
			var target_id: String = str(step.get("target", ""))
			var correct_index := -1
			for j in range(tools.size()):
				if str((tools[j] as Dictionary).get("id", "")) == target_id:
					correct_index = j + 1
			if correct_index < 1:
				_fail("Original instrument catalog target missing " + target_id)
				return
			var wrong_index := 1 if correct_index != 1 else 2
			var menu: OptionButton = _menu(app, index)
			if menu == null or menu.item_count != tools.size() + 1 or menu.disabled:
				_fail("Actual original instrument picker not available " + FDIS[case_i] + "/" + str(index))
				return
			if not _answer(app, case_i, index).is_empty():
				_fail("New practical step has leaked prior answer " + FDIS[case_i] + "/" + str(index))
				return
			_select_real_menu(app, index, wrong_index)
			var wrong_saved: Dictionary = _answer(app, case_i, index)
			var wrong_id: String = str((tools[wrong_index - 1] as Dictionary)["id"])
			var feedback: String = _feedback(app, index)
			if bool(wrong_saved.get("correct", true)) or str(wrong_saved.get("selected", "")) != wrong_id or not feedback.contains("Incorrect instrument category") or not feedback.begins_with("Review required.") or feedback.contains(str(step.get("success", ""))):
				_fail("Wrong tool falsely used success message or changed original result " + FDIS[case_i] + "/" + str(index))
				return
			_select_real_menu(app, index, correct_index)
			var correct_saved: Dictionary = _answer(app, case_i, index)
			if not bool(correct_saved.get("correct", false)) or str(correct_saved.get("selected", "")) != target_id or int(correct_saved.get("sourceQuestion", -1)) != index:
				_fail("Correct original tool choice not saved " + FDIS[case_i] + "/" + str(index))
				return
			if not _feedback(app, index).begins_with("Correct.") or not _feedback(app, index).contains(str(step.get("success", ""))):
				_fail("Correct tool source success not shown " + FDIS[case_i] + "/" + str(index))
				return
			var frozen: String = JSON.stringify(correct_saved)
			_select_real_menu(app, index, wrong_index)
			if JSON.stringify(_answer(app, case_i, index)) != frozen or menu.selected != correct_index or not _feedback(app, index).begins_with("Correct."):
				_fail("Completed original instrument overwritten or picker left on wrong item " + FDIS[case_i] + "/" + str(index))
				return
			# Direct callback must not bypass a completed task's lock.
			app.call("_practical_tool", wrong_index, index)
			app.call("_practical_tool", 0, index)
			app.call("_practical_tool", tools.size() + 1, index)
			if JSON.stringify(_answer(app, case_i, index)) != frozen:
				_fail("Direct invalid/stale tool callback overwrote completed answer")
				return
			if index < steps.size() - 1:
				app.call("_procedure_move_step", 1)
				app.call("_practical_tool", wrong_index, index) # stale guided step callback
				if not _at_step(app, index):
					_fail("Guided tool navigation failed")
					return
			if JSON.stringify(_answer(app, case_i, index)) != frozen:
				_fail("Stale guided tool callback overwrote completed answer")
				return
			# This branch intentionally does not duplicate SR68's menu recall.
			# A later bad selection must still be rejected after journal reload.
			var disk: Variant = JSON.parse_string(FileAccess.get_file_as_string("user://kliniklab-native-progress-v2.json"))
			var key: String = IDS[case_i] + ":practical:" + str(index)
			if not (disk is Dictionary) or not bool((disk.get("answers", {}) as Dictionary).get(key, {}).get("correct", false)):
				_fail("Actual source-versioned journal did not persist completed original tool")
				return
			app.call("_load_progress")
			app.call("_refresh")
			menu = _menu(app, index)
			if menu == null:
				_fail("Tool picker lost after actual disk reload")
				return
			var lock_before: bool = bool(app.call("_practical_tool_complete", index, step))
			_select_real_menu(app, index, wrong_index)
			var lock_after: bool = bool(app.call("_practical_tool_complete", index, step))
			var restored: Dictionary = _answer(app, case_i, index)
			# Godot JSON roundtrip represents a stored integer step as 2.0,
			# so check typed source semantics, not JSON.stringify byte identity.
			var restored_step: Variant = restored.get("sourceQuestion", null)
			var step_valid := false
			if restored_step is int or restored_step is float:
				var number: float = float(restored_step)
				step_valid = is_finite(number) and number == float(index)
			if not lock_before or not lock_after or not bool(restored.get("correct", false)) or restored.get("selected", null) != target_id or not step_valid or menu.selected != correct_index:
				_fail("Reloaded correct source tool overwritten/not projected: fdi="+FDIS[case_i]+" step="+str(index)+" lock_before="+str(lock_before)+" lock_after="+str(lock_after)+" menu="+str(menu.selected)+" expected="+str(correct_index)+" answer="+JSON.stringify(restored))
				return
			# A forged legacy 'correct' flag with a wrong target or wrong
			# source step must fail closed and permit a genuine fresh attempt.
			var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
			answers[key] = {"selected": wrong_id, "correct": true, "sourceQuestion": index}
			_select_real_menu(app, index, wrong_index)
			if bool(_answer(app, case_i, index).get("correct", true)):
				_fail("Forged wrong-target correct flag incorrectly locked tool")
				return
			answers[key] = {"selected": target_id, "correct": true, "sourceQuestion": index + 1}
			_select_real_menu(app, index, wrong_index)
			if bool(_answer(app, case_i, index).get("correct", true)):
				_fail("Forged wrong-step correct flag incorrectly locked tool")
				return
			answers[key] = correct_saved
			app.call("_save_progress")
		if tools_in_case < 1 or bool(app.get("_direct_bur_mode")):
			_fail("Missing source instrument steps or unrelated bur activated " + FDIS[case_i])
			return
		var after_strokes: Array = volume.call("export_strokes")
		if JSON.stringify(after_strokes) != JSON.stringify(before_strokes):
			_fail("Instrument choice unexpectedly modified 3D cut volume " + FDIS[case_i])
			return
		if str(((app.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary)["endo|anamnese"]["text"]) != "SR71 unrelated FSP note must survive":
			_fail("Source FSP/KP note changed on instrument selection")
			return
	if crown_tools != 2 or total_tools < 7:
		_fail("Original instrument task coverage incomplete: total " + str(total_tools) + ", crown " + str(crown_tools))
		return
	app.call("_reset_progress")
	print("SR71_NATIVE_PRACTICAL_TOOL_LOCK_CORRECT_WRONG_FEEDBACK_SIX_FDI_PASS tasks=" + str(total_tools) + " crown_two; actual_OptionButton_signals, wrong_feedback, correct_lock, stale_callback, journal_reload, no_bur; HEADLESS NOT PIXELS")
	quit(0)
