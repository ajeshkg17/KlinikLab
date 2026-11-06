extends SceneTree
## Isolated SR76: genuine source-correct selection plus string "true" must
## remain incomplete after real disk read-back for both FDI and choice tasks.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR76_COMBINED_STRICT_LOCK_FAILED: " + reason)
	quit(1)

func _goto(app: Node3D, target: int) -> bool:
	while int(app.get("_procedure_step_index")) < target:
		if not bool(app.call("_procedure_move_step", 1)):
			return false
	while int(app.get("_procedure_step_index")) > target:
		if not bool(app.call("_procedure_move_step", -1)):
			return false
	return true

func _review_button(app: Node3D) -> Button:
	for node in (app.get("_page") as VBoxContainer).get_children():
		if node is Button and (node as Button).text.begins_with("Next task to review (R)"):
			return node as Button
	return null

func _run() -> void:
	root.size = Vector2i(1500, 850)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Could not load actual app scene")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress")
	var source: Dictionary = app.get("_content")
	var count: int = 0
	for case_i in range(FDIS.size()):
		var steps: Array = source["practical"][case_i]
		var choice_step: int = -1
		for j in range(steps.size()):
			if str((steps[j] as Dictionary).get("type", "")) == "choice":
				choice_step = j
				break
		if choice_step < 1 or str((steps[0] as Dictionary).get("type", "")) != "tooth":
			_fail("Source choice / first FDI inventory drift "+FDIS[case_i])
			return
		for target_index in [0, choice_step]:
			app.call("_switch_view", "clinic")
			app.call("_select_case", case_i)
			app.call("_select_station", 4)
			app.call("_set_procedure_guided", true)
			var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
			for j in range(steps.size()):
				var step: Dictionary = steps[j]
				var selected: Variant = null
				match str(step.get("type", "")):
					"choice":
						selected = int(step["correct"])
					"tooth", "tool":
						selected = str(step["target"])
					"drill":
						continue
					_:
						_fail("Unknown source practical step type")
						return
				answers[IDS[case_i]+":practical:"+str(j)] = {"correct":true,"selected":selected,"sourceQuestion":j}
			var target: Dictionary = steps[target_index]
			var key: String = IDS[case_i]+":practical:"+str(target_index)
			answers[key]["correct"] = "true"
			app.call("_save_progress")
			app.call("_load_progress")
			if not _goto(app, target_index):
				_fail("Could not navigate to candidate")
				return
			app.call("_refresh")
			if bool(app.call("_practical_source_complete", target_index)):
				_fail("String true incorrectly accepted by source review "+key)
				return
			if str(target["type"]) == "choice":
				var state: Dictionary = app.call("_practical_choice_record", target_index, target)
				if bool(state["solved"]):
					_fail("String true falsely locks matching choice "+key)
					return
				var choice: int = int(target["correct"])
				var control: Button = (app.get("_page") as VBoxContainer).get_node_or_null("KL_PRACTICAL_CHOICE_%d_%d" % [target_index, choice]) as Button
				if control == null or control.disabled:
					_fail("Matching choice not retryable "+key)
					return
			else:
				var state: Dictionary = app.call("_practical_tooth_record", target_index, target)
				if bool(state["solved"]):
					_fail("String true falsely locks matching FDI "+key)
					return
				var tooth_control: Button = (app.get("_page") as VBoxContainer).find_child("KL_FDI_TOOTH_"+str(target["target"]), true, false) as Button
				if tooth_control == null or tooth_control.disabled:
					_fail("Matching FDI not retryable "+key)
					return
			var feedback: Label = (app.get("_practical_feedback") as Dictionary).get(target_index) as Label
			if feedback == null or not feedback.text.contains("Review required"):
				_fail("Forged source record displayed false completion "+key)
				return
			var review: Button = _review_button(app)
			if review == null or review.disabled or not review.text.contains("1 remaining"):
				_fail("Review counter did not flag only the malformed record "+key)
				return
			var next_step: int = (target_index + 1) % steps.size()
			if not _goto(app, next_step):
				_fail("Could not move to separate step for R navigation "+key)
				return
			review = _review_button(app)
			if review == null or review.disabled:
				_fail("Review button vanished "+key)
				return
			review.pressed.emit()
			if int(app.get("_procedure_step_index")) != target_index:
				_fail("Review skipped strict-invalid record "+key)
				return
			if str(target["type"]) == "choice":
				var correct_choice: int = int(target["correct"])
				var button: Button = (app.get("_page") as VBoxContainer).get_node_or_null("KL_PRACTICAL_CHOICE_%d_%d" % [target_index, correct_choice]) as Button
				if button == null:
					_fail("Actual correct choice signal unavailable "+key)
					return
				button.pressed.emit()
				if not button.disabled:
					_fail("Legitimate choice did not lock after retry "+key)
					return
			else:
				var tooth_button: Button = (app.get("_page") as VBoxContainer).find_child("KL_FDI_TOOTH_"+str(target["target"]), true, false) as Button
				if tooth_button == null:
					_fail("Actual FDI correct signal unavailable "+key)
					return
				tooth_button.pressed.emit()
				if not bool(app.call("_practical_tooth_record", target_index, target)["solved"]):
					_fail("Legitimate FDI did not lock after retry "+key)
					return
			answers = (app.get("_progress") as Dictionary)["answers"]
			var repaired: Dictionary = answers.get(key, {})
			if repaired.get("correct", null) != true or not bool(app.call("_practical_source_complete", target_index)):
				_fail("Real correct submission failed to repair journal "+key)
				return
			app.call("_load_progress")
			app.call("_refresh")
			review = _review_button(app)
			if review == null or not review.disabled or not review.text.contains("0 remaining"):
				_fail("Review still flags repaired source-correct record "+key)
				return
			if str(target["type"]) == "choice":
				if not bool(app.call("_practical_choice_record", target_index, target)["solved"]):
					_fail("Valid choice lock lost after disk reload "+key)
					return
			else:
				if not bool(app.call("_practical_tooth_record", target_index, target)["solved"]):
					_fail("Valid tooth lock lost after disk reload "+key)
					return
			count += 1
	app.call("_reset_progress")
	if count != 12:
		_fail("Expected two original scored tasks across six FDI cases")
		return
	print("SR76_COMBINED_STRICT_CORRECT_TYPE_CHOICE_FDI_SIX_CASE_PASS twelve disk-reloaded source-correct forged string records, review count/navigation, real retry, valid lock and journal repair; HEADLESS ONLY")
	quit(0)
