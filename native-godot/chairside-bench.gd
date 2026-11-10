extends Control
## Shared, replayable chairside lesson; original composite still uses this class.
signal practice_requested(scenario: String)
const CATALOG := preload("res://chairside-catalog.gd")
const PREVIEW := preload("res://chairside-model-preview.gd")

var _lesson: Dictionary
var _choices: Dictionary = {}
var _events: Array[Dictionary] = []
var _score := 0
var _verified := false
var _completed := false
var _started := 0
var _status: Label
var _feedback: Label
var _practice_button: Button
var _finish_button: Button
var _report_button: Button
var _review: Label
var _report_path := ""
var _pick_buttons := {"tool": [], "material": []}
var _model_import_ok := true
var _chair_attempts: Array[Dictionary] = []

func start(lesson: Dictionary) -> void:
	_lesson = lesson
	name = "KL_CHAIRSIDE_BENCH"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var backdrop := ColorRect.new()
	backdrop.color = Color("#101b26")
	add_child(backdrop)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.follow_focus = true
	add_child(scroll)
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 18)
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 7)
	scroll.add_child(content)
	var header := HBoxContainer.new()
	content.add_child(header)
	var title := _label(str(lesson["title"]), 26)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	_button(header, "Restart", "KL_BENCH_RESET", _restart)
	_button(header, "Close bench", "KL_BENCH_CLOSE", queue_free)
	content.add_child(_label(str(lesson["case"]), 16))
	var reference := LinkButton.new()
	reference.name = "KL_BENCH_CASE_REFERENCE"
	reference.text = "ADA · case learning reference"
	reference.uri = str(lesson["reference"])
	content.add_child(reference)
	_status = _label("", 16)
	content.add_child(_status)
	_feedback = _label("", 16)
	_feedback.name = "KL_BENCH_FEEDBACK"
	_feedback.add_theme_color_override("font_color", Color("#b9eadc"))
	content.add_child(_feedback)
	for kind: String in ["tool", "material"]:
		_add_options(content, kind)
	var actions := HBoxContainer.new()
	content.add_child(actions)
	_practice_button = _button(actions, "Start chair practice", "KL_BENCH_PRACTICE", _start_practice)
	_finish_button = _button(actions, str(lesson["finish"]), "KL_BENCH_FINISH", _finish)
	_report_button = _button(actions, "Open lesson report folder", "KL_BENCH_REPORT", _open_report)
	_review = _label("", 14)
	content.add_child(_review)
	content.add_child(_label("The curing light and scaler are schematic CC0 study models; the varnish brush, polishing cup and periodontal probe are synthetic 3D geometry. Material swatches are illustrations. This simulation does not certify clinical technique.", 13))
	_restart()

func _add_options(content: VBoxContainer, kind: String) -> void:
	var step: Dictionary = _lesson[kind]
	content.add_child(_label(("1 · Inspect and choose the instrument · " if kind == "tool" else "2 · Choose the " + str(step.get("label", "material")) + " · ") + str(step["prompt"]), 17))
	var cards := HBoxContainer.new()
	cards.add_theme_constant_override("separation", 12)
	content.add_child(cards)
	for id: String in step["choices"]:
		var item: Dictionary = CATALOG.ITEMS[id]
		var control_id := id.replace(".", "_")
		var card := VBoxContainer.new()
		card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		cards.add_child(card)
		card.add_child(_label("%s · %s" % [item["name"], item["german"]], 17))
		if kind == "tool":
			var preview := PREVIEW.new()
			card.add_child(preview)
			_model_import_ok = preview.show_model(str(item["scene"])) and _model_import_ok
			var turn := HBoxContainer.new()
			card.add_child(turn)
			_button(turn, "Rotate left", "KL_BENCH_ROTATE_LEFT_" + control_id, _rotate.bind(preview, id, -0.42))
			_button(turn, "Rotate right", "KL_BENCH_ROTATE_RIGHT_" + control_id, _rotate.bind(preview, id, 0.42))
		else:
			var swatch := ColorRect.new()
			swatch.color = item["swatch"]
			swatch.custom_minimum_size.y = 13
			card.add_child(swatch)
		card.add_child(_label(str(item["cue"]), 14))
		card.add_child(_label(str(item["purpose"]), 14))
		var source := LinkButton.new()
		source.text = "Reference"
		source.uri = str(item["source"])
		card.add_child(source)
		var pick := _button(card, "Choose " + str(item["name"]), "KL_BENCH_PICK_" + control_id, _choose.bind(kind, id))
		_pick_buttons[kind].append(pick)

func _label(value: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	return label

func _button(parent: Node, caption: String, id: String, action: Callable) -> Button:
	var button := Button.new()
	button.name = id
	button.text = caption
	button.custom_minimum_size.y = 32
	button.pressed.connect(action)
	parent.add_child(button)
	return button

func _rotate(preview: PREVIEW, id: String, angle: float) -> void:
	preview.turn(angle)
	_event("bench", "inspect", id, "", "viewed")

func _restart() -> void:
	_choices.clear()
	_events.clear()
	_chair_attempts.clear()
	_score = 0
	_verified = false
	_completed = false
	_report_path = ""
	_started = Time.get_ticks_msec()
	_feedback.text = "Drag either 3D model or use its rotation buttons."
	_review.hide()
	_event("bench", "start")
	_refresh()

func _choose(kind: String, id: String) -> void:
	if _choices.has(kind) or (kind == "material" and not _choices.has("tool")):
		return
	var step: Dictionary = _lesson[kind]
	var expected: String = step["expected"]
	var accepted := id == expected
	_feedback.text = step["correct"] if accepted else step["incorrect"]
	if accepted:
		_choices[kind] = id
		_score += 1
	_event("bench", kind + "_choice", id, expected, "correct" if accepted else "retry", _feedback.text)
	_refresh()

func _start_practice() -> void:
	if _score != 2 or _verified:
		return
	_event("bench", "enter_chair", _lesson["scenario"], _lesson["scenario"], "started")
	practice_requested.emit(_lesson["scenario"])

func record_practice(score: int, complete: bool, actions: Array) -> void:
	_verified = complete
	_chair_attempts.append({"score": score, "verified": complete, "events": actions.duplicate(true)})
	_feedback.text = "Chair result %d/20 · %s" % [score, "Verified. Complete the case-specific bench finish step." if complete else "Return to the chair to complete the practice."]
	_event("bench", "chair_return", "", "", "verified" if complete else "retry", _feedback.text)
	show()
	_refresh()

func _finish() -> void:
	if not _verified or _completed:
		return
	_completed = true
	_event("bench", str(_lesson.get("finish_event", "simulate_cure")), _choices["tool"],
		_lesson["tool"]["expected"], "complete", str(_lesson["outcome"]))
	_feedback.text = str(_lesson["outcome"])
	var corrections := {"tool_choice": 0, "material_choice": 0, "chair": 0}
	for event: Dictionary in _timeline():
		if event["outcome"] == "retry":
			var bucket: String = "chair" if event["area"] == "chair" else event["event"]
			if corrections.has(bucket):
				corrections[bucket] += 1
	_review.text = "Review · Tool choices retried %d · Material choices retried %d · Chair actions retried %d" % [
		corrections["tool_choice"], corrections["material_choice"], corrections["chair"]]
	_review.show()
	var folder := "user://lesson-results/" + Crypto.new().generate_random_bytes(12).hex_encode()
	if DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(folder)) == OK:
		var file := FileAccess.open(folder.path_join("result.json"), FileAccess.WRITE)
		if file != null:
			file.store_string(JSON.stringify(summary(), "\t") + "\n")
			file.close()
			_report_path = ProjectSettings.globalize_path(folder)
	if _report_path.is_empty():
		_feedback.text += " Report could not be saved."
	_refresh()

func _open_report() -> void:
	if not _report_path.is_empty():
		OS.shell_open(_report_path)

func _refresh() -> void:
	_status.text = "Selection %d/2 · %s" % [_score, "Lesson complete" if _completed else "Chair verified" if _verified else "Tray ready" if _score == 2 else "Compare the choices"]
	for kind: String in _pick_buttons:
		for button: Button in _pick_buttons[kind]:
			button.disabled = _choices.has(kind) or (kind == "material" and not _choices.has("tool"))
	_practice_button.disabled = _score != 2 or _verified
	_finish_button.disabled = not _verified or _completed
	_report_button.disabled = _report_path.is_empty()

func _event(area: String, action: String, selected := "", expected := "", outcome := "", feedback := "") -> void:
	_events.append({"area": area, "event": action, "selected_id": selected, "expected_id": expected,
		"outcome": outcome, "feedback": feedback, "elapsed_ms": Time.get_ticks_msec() - _started,
		"frame": Engine.get_process_frames(), "selection_score": _score})

func summary() -> Dictionary:
	return {"schema": 1, "id": _lesson["id"], "scenario": _lesson["scenario"],
		"source_sha": FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges(),
		"case_reference": _lesson["reference"], "finish_event": _lesson.get("finish_event", "simulate_cure"),
		"selection_score": _score, "selection_max": 2, "completed": _completed,
		"models_loaded": _model_import_ok, "choices": _choices.duplicate(),
		"bench_events": _events.duplicate(true), "chair_attempts": _chair_attempts.duplicate(true),
		"timeline": _timeline()}

func _timeline() -> Array[Dictionary]:
	var timeline: Array[Dictionary] = _events.duplicate(true)
	for attempt: Dictionary in _chair_attempts:
		var expected := "tool"
		for action: Dictionary in attempt["events"]:
			var event: String = action["event"]
			var target: String = action["target"]
			var rejected := event.begins_with("rejected_")
			timeline.append({"area": "chair", "event": event, "selected_id": target,
				"expected_id": expected, "outcome": "retry" if rejected else "recorded",
				"feedback": action["reason"], "frame": action["frame"],
				"chair_elapsed_ms": action["elapsed_ms"], "chair_score": action["score"]})
			match event:
				"restart": expected = "tool"
				"tool_acquired": expected = "site_0"
				"model_action": expected = "site_1" if target == "site_0" else "return"
				"tool_returned": expected = "verify"
				"complete": expected = ""
	timeline.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a["frame"] < b["frame"])
	return timeline
