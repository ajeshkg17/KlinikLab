extends SceneTree
## Rebuilt SR92 opt-in app trial: real station-entry handlers and source answer buttons.
## Uses scripted movement intents and the app’s answer controls.
## A Windows tester build can render the same trial with Godot Movie Maker.
const JOURNAL := "user://kliniklab-native-progress-v2.json"

const VIDEO_FPS := 24

var _folder := ""
var _record_video := false
var _started_ms := Time.get_ticks_msec()
var _events: Array[Dictionary] = []
var _runs: Array[Dictionary] = []

func _event(name: String, details: Dictionary = {}) -> void:
	if _folder.is_empty():
		return
	var entry := details.duplicate()
	entry["event"] = name
	entry["elapsed_ms"] = Time.get_ticks_msec() - _started_ms
	if _record_video:
		entry["video_seconds"] = float(Engine.get_process_frames()) / VIDEO_FPS
	_events.append(entry)

func _report(status: String, error: String = "") -> bool:
	if _folder.is_empty():
		return true
	var file := FileAccess.open(_folder.path_join("result.json"), FileAccess.WRITE)
	if file == null:
		return false
	var source_file := "res://source/expected-sha.txt"
	var source_sha := FileAccess.get_file_as_string(source_file).strip_edges() if FileAccess.file_exists(source_file) else ""
	file.store_string(JSON.stringify({
		"schema": 1,
		"status": status,
		"error": error,
		"source_sha": source_sha,
		"godot_version": Engine.get_version_info()["string"],
		"rendering_method": RenderingServer.get_current_rendering_method(),
		"trial": "FDI16 · two stations, pick up and return the mirror, six source-graded tasks per run",
		"station_input": "scripted movement intents and app interaction handlers",
		"video": "gameplay.avi" if _record_video else "",
		"video_fps": VIDEO_FPS if _record_video else 0,
		"elapsed_ms": Time.get_ticks_msec() - _started_ms,
		"runs": _runs,
		"events": _events,
	}, "\t") + "\n")
	file.flush()
	return file.get_error() == OK

func _hold(seconds: float) -> void:
	if _record_video:
		await create_timer(seconds).timeout

func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	_event("failed", {"error": message})
	_report("fail", message)
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

func _walk_to(app: Node3D, target_name: String) -> bool:
	var walker: RefCounted = app.get("_walk")
	var constants: Dictionary = walker.get_script().get_script_constant_map()
	var target: Vector3 = constants[target_name]
	var position: Vector3 = walker.get("position")
	var heading := atan2(position.x - target.x, position.z - target.z)
	var yaw_change := wrapf(heading - float(walker.get("yaw")), -PI, PI)
	walker.call("apply_look_intent", Vector2(-yaw_change / float(constants["MOUSE_SENSITIVITY"]), 0))
	for frame in range(VIDEO_FPS * 6):
		position = walker.get("position")
		if Vector2(position.x, position.z).distance_to(Vector2(target.x, target.z)) <= 1.2:
			return true
		walker.call("apply_move_intent", Vector2(0, 1), 1.0 / VIDEO_FPS, true)
		app.call("_apply_walk_camera")
		if _record_video:
			await process_frame
	return false

func _run() -> void:
	var args := OS.get_cmdline_user_args()
	if not args.is_empty():
		_folder = args[0].replace("\\", "/").simplify_path().trim_suffix("/")
		_record_video = args.has("--video")
		var profile := _folder.path_join("profile").to_lower() + "/"
		var user_data := OS.get_user_data_dir().replace("\\", "/").simplify_path().to_lower() + "/"
		if not user_data.begins_with(profile) or OS.has_environment("KLINIKLAB_GITHUB_TOKEN"):
			_folder = ""
			_fail("trial requires its isolated profile and an empty upload environment")
			return
		if _record_video and DisplayServer.get_name() == "headless":
			_fail("movie rendering requires a display")
			return
	root.size = Vector2i(1280, 720) if _record_video else Vector2i(1500, 900)
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
	_event("app_ready")
	await _hold(0.9)
	if not _press(app, "KL_GAME_START"):
		return
	var game: RefCounted = app.get("_practice_game")
	if game == null:
		_fail("real game entry not wired")
		return
	for run_i in range(2):
		var run_number := run_i + 1
		_event("run_started", {"run": run_number, "score": int(game.call("score"))})
		await _hold(0.6)
		if not bool(game.call("score") == 0):
			_fail("run did not start at zero")
			return
		app.call("_start_clinic_walk")
		var handling: Node3D = app.get("_practice_tool")
		var hands: Node3D = handling.get("_hands")
		if not hands.is_visible_in_tree() or bool(handling.call("holding")):
			_fail("hands not visible or mirror not reset at the start of Walk")
			return
		var early := _button(app, "KL_PRACTICE_TOOL")
		if early == null or not early.disabled:
			_fail("mirror can be grabbed out of range")
			return
		early.pressed.emit()
		if bool(handling.call("holding")):
			_fail("out-of-range action moved the mirror")
			return
		_event("walk_started", {"run": run_number})
		await _hold(0.9)
		if not await _walk_to(app, "LANGUAGE_STATION"):
			_fail("scripted walk could not reach the language station")
			return
		if not bool(app.call("_walk_enter_language_station")):
			_fail("language station E handler rejected real walk proximity")
			return
		_event("language_station", {"run": run_number, "score": int(game.call("score"))})
		await _hold(0.7)
		if not bool(app.call("_return_to_clinic_walk")):
			_fail("cannot return to active walk after language station")
			return
		if not await _walk_to(app, "OPERATORY"):
			_fail("scripted walk could not reach the practical station")
			return
		if _record_video:
			var walker: RefCounted = app.get("_walk")
			var constants: Dictionary = walker.get_script().get_script_constant_map()
			var stand: Node3D = handling.get("_stand")
			var eye: Vector3 = walker.get("position")
			var offset := stand.position + Vector3.UP * 0.12 - eye
			var sensitivity: float = constants["MOUSE_SENSITIVITY"]
			var yaw_change := wrapf(atan2(-offset.x, -offset.z) - float(walker.get("yaw")), -PI, PI)
			var pitch_change := atan2(offset.y, Vector2(offset.x, offset.z).length()) - float(walker.get("pitch"))
			walker.call("apply_look_intent", Vector2(-yaw_change, -pitch_change) / sensitivity)
			app.call("_apply_walk_camera")
			await _hold(0.65)
		if not _press(app, "KL_PRACTICE_TOOL"):
			return
		var mirror: Node3D = handling.get("_mirror")
		if not bool(handling.call("holding")) or mirror.get_parent() != handling.get("_right") or int(game.call("score")) != 10:
			_fail("mirror did not follow the right hand, or pickup incorrectly awarded points")
			return
		_event("mirror_grabbed", {"run": run_number, "score": int(game.call("score"))})
		await _hold(1.2)
		if not _press(app, "KL_PRACTICE_TOOL"):
			return
		if bool(handling.call("holding")) or mirror.get_parent() != handling.get("_stand") or int(game.call("score")) != 20:
			_fail("mirror was not returned to its stand for exactly 10 points")
			return
		_event("mirror_returned", {"run": run_number, "score": int(game.call("score"))})
		await _hold(0.7)
		if not _press(app, "KL_PRACTICE_TOOL") or not _press(app, "KL_PRACTICE_TOOL"):
			return
		if int(game.call("score")) != 20:
			_fail("repeated pickup and return farmed handling points")
			return
		_event("repeat_handling_no_points", {"run": run_number, "score": int(game.call("score"))})
		if not bool(app.call("_walk_enter_procedure")):
			_fail("operatory E handler rejected real walk proximity")
			return
		_event("practical_station", {"run": run_number, "score": int(game.call("score"))})
		await _hold(0.7)
		if int(game.call("score")) != 30:
			_fail("both stations and mirror handling did not earn exactly 30")
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
			_event("task_shown", {"run": run_number, "task": task_i + 1, "type": step["type"]})
			await _hold(0.45)
			var wrong: Variant = _wrong(step, (app.get("_content") as Dictionary)["tools"])
			if wrong != null:
				if not _press(app, "KL_SEQUENCE_ANSWER_" + str(wrong)):
					return
				if int(game.call("score")) != 30 + task_i * 5 + int(game.call("bonus_points")):
					_fail("incorrect answer gained room points")
					return
				_event("wrong_answer_no_points", {"run": run_number, "task": task_i + 1, "score": int(game.call("score"))})
				await _hold(0.4)
			var selected: Variant = _correct(step)
			if selected == null:
				_fail("source task has no supported correct answer")
				return
			if not _press(app, "KL_SEQUENCE_ANSWER_" + str(selected)):
				return
			# Replayed stale callback must not award again.
			var before_repeat: int = int(game.call("score"))
			app.call("_practice_sequence_submit", "molar", int(current["stepIndex"]), selected)
			if int(game.call("score")) != before_repeat:
				_fail("duplicate answer farmed points")
				return
			_event("correct_answer_duplicate_blocked", {"run": run_number, "task": task_i + 1, "score": before_repeat, "bonus": int(game.call("bonus_points"))})
			await _hold(0.65)
			if task_i < 5 and not _press(app, "KL_SEQUENCE_NEXT"):
				return
		if int(game.call("score")) != 66 or not bool(game.call("complete")):
			_fail("both stations, mirror handling and six source tasks did not score 66")
			return
		if FileAccess.get_file_as_bytes(JOURNAL) != before_answers:
			_fail("sequence wrote ordinary learner journal")
			return
		_event("full_score", {"run": run_number, "score": 66, "max_score": 66})
		await _hold(0.8)
		if not _press(app, "KL_SEQUENCE_EXIT"):
			return
		if bool(app.get("_procedure_guided")) != original_guided:
			_fail("guided state not restored after game")
			return
		if not bool(app.call("_return_to_clinic_walk")):
			_fail("cannot return to room to start new game")
			return
		app.call("_stop_clinic_walk")
		_runs.append({"run": run_number, "score": int(game.call("score")), "max_score": 66, "mirror_handling_completed": true, "journal_unchanged": true, "guided_state_restored": true})
		_event("run_complete", _runs.back())
		await _hold(1.0)
		if run_i == 0 and not _press(app, "KL_GAME_REPLAY"):
			return
	if not _press(app, "KL_GAME_EXIT") or app.get("_practice_game") != null:
		_fail("game exit failed")
		return
	_event("game_exited")
	await _hold(0.5)
	if not _report("pass"):
		_fail("could not write the trial report")
		return
	print("KLINIKLAB_NATIVE_TWO_66_POINT_HANDLING_RUNS_PASS")
	quit()
