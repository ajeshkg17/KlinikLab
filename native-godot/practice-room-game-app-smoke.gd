extends SceneTree
## Rebuilt SR92 opt-in app trial: real station-entry handlers and source answer buttons.
## Headless educational scoring only, not desktop GPU, pixels, or clinical QA.
const JOURNAL := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	push_error("REBUILT_SR92_LIVE_APP_FAILED: " + message)
	quit(1)

func _button(app: Node3D, button_name: String) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null(button_name) as Button

func _press(app: Node3D, button_name: String) -> bool:
	var item := _button(app, button_name)
	if item == null or item.disabled:
		_fail("missing or disabled real UI button: " + button_name)
		return false
	item.pressed.emit()
	return true

func _correct(step: Dictionary) -> Variant:
	match str(step.get("type", "")):
		"choice":
			return int(step.get("correct", -1))
		"tooth", "tool":
			return str(step.get("target", ""))
	return null

func _wrong(step: Dictionary, tools: Array) -> Variant:
	match str(step.get("type", "")):
		"choice":
			return (int(step["correct"]) + 1) % (step["options"] as Array).size()
		"tooth":
			return "18"
		"tool":
			for tool in tools:
				if tool is Dictionary and str(tool.get("id", "")) != str(step.get("target", "")):
					return str(tool["id"])
	return null

func _run() -> void:
	root.size = Vector2i(1500, 900)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("actual native app missing")
		return
	var app: Node3D = scene.instantiate() as Node3D
	root.add_child(app)
	await process_frame
	# This runs only with a fresh isolated CI user:// profile; never use owner data.
	app.call("_reset_progress")
	app.call("_switch_view", "environment")
	if not _press(app, "KL_GAME_START"):
		return
	var game: RefCounted = app.get("_practice_game")
	if game == null:
		_fail("real game entry not wired")
		return
	for run_i in range(2):
		if not bool(game.call("score") == 0):
			_fail("run did not start at zero")
			return
		app.call("_start_clinic_walk")
		var walker: RefCounted = app.get("_walk")
		walker.set("position", Vector3(-3.0, 0.6, -18.0))
		if not bool(app.call("_walk_enter_language_station")):
			_fail("language station E handler rejected real walk proximity")
			return
		if not bool(app.call("_return_to_clinic_walk")):
			_fail("cannot return to active walk after language station")
			return
		walker.set("position", Vector3(3.0, 0.6, -18.0))
		if not bool(app.call("_walk_enter_procedure")):
			_fail("operatory E handler rejected real walk proximity")
			return
		if int(game.call("score")) != 20:
			_fail("two real station visits did not earn exactly 20")
			return
		if not _press(app, "KL_SEQUENCE_START"):
			return
		var sequence: RefCounted = app.get("_practice_sequence")
		var before_answers: PackedByteArray = FileAccess.get_file_as_bytes(JOURNAL)
		var original_guided: bool = bool((app.get("_practice_sequence_clinic_restore") as Dictionary).get("procedure_guided", false))
		for task_i in range(6):
			var current: Dictionary = sequence.call("state")
			if str(current["caseId"]) != "molar":
				_fail("left source FDI16 before completing six tasks")
				return
			var step: Dictionary = current["step"]
			var wrong: Variant = _wrong(step, (app.get("_content") as Dictionary)["tools"])
			if wrong != null:
				if not _press(app, "KL_SEQUENCE_ANSWER_" + str(wrong)):
					return
				if int(game.call("score")) != 20 + task_i * 5 + int(game.call("bonus_points")):
					_fail("incorrect answer gained room points")
					return
			var selected: Variant = _correct(step)
			if selected == null or not _press(app, "KL_SEQUENCE_ANSWER_" + str(selected)):
				return
			# Replayed stale callback must not award again.
			var before_repeat: int = int(game.call("score"))
			app.call("_practice_sequence_submit", "molar", int(current["stepIndex"]), selected)
			if int(game.call("score")) != before_repeat:
				_fail("duplicate answer farmed points")
				return
			if task_i < 5 and not _press(app, "KL_SEQUENCE_NEXT"):
				return
		if int(game.call("score")) != 56 or not bool(game.call("complete")):
			_fail("real station + six source tasks did not score 56")
			return
		if FileAccess.get_file_as_bytes(JOURNAL) != before_answers:
			_fail("sequence wrote ordinary learner journal")
			return
		if not _press(app, "KL_SEQUENCE_EXIT"):
			return
		if bool(app.get("_procedure_guided")) != original_guided:
			_fail("guided state not restored after game")
			return
		if not bool(app.call("_return_to_clinic_walk")):
			_fail("cannot return to room to start new game")
			return
		app.call("_stop_clinic_walk")
		if run_i == 0 and not _press(app, "KL_GAME_REPLAY"):
			return
	if not _press(app, "KL_GAME_EXIT") or app.get("_practice_game") != null:
		_fail("game exit failed")
		return
	print("REBUILT_SR92_NATIVE_TWO_56_POINT_RUNS_HEADLESS_PASS")
	quit()
