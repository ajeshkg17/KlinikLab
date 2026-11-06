extends SceneTree
## SR78: source-backed six-case order and guarded task navigation, while an
## ordinary already-complete learner journal survives reload byte-identically.
const IDS := ["molar", "endo", "anterior", "crown", "surgery", "perio"]
const FDIS := ["16", "36", "11", "26", "48", "46"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"
var _last: Dictionary = {}

func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	push_error("SR78_ORDERED_CASE_WORKFLOW_FAILED: " + message)
	quit(1)

func _source_selected(step: Dictionary) -> Variant:
	match str(step.get("type", "")):
		"choice":
			return int(step.get("correct", -1))
		"tooth", "tool":
			return str(step.get("target", ""))
	return null

func _attempt(sequence: RefCounted, case_id: String, step_index: int, selected: Variant) -> void:
	_last = sequence.call("submit", case_id, step_index, selected)

func _run() -> void:
	root.size = Vector2i(1500,900)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Pinned native scene unavailable")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # disposable hosted CI user://, never owner profile
	var source: Dictionary = app.get("_content")
	var cases: Array = source["practical"]
	var tools: Array = source["tools"]
	var progress: Dictionary = app.get("_progress")
	var answers: Dictionary = progress["answers"]
	progress["notes"]["sequence"] = "Prior learner data must remain byte-identical"
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {"text":"Prior FSP report remains unchanged","result":{}}
	var graded_count: int = 0
	for case_i in range(IDS.size()):
		var steps: Array = cases[case_i]
		for step_i in range(steps.size()):
			var step: Dictionary = steps[step_i]
			if str(step.get("type", "")) not in ["choice","tooth","tool"]:
				continue
			answers[IDS[case_i]+":practical:"+str(step_i)] = {
				"selected":_source_selected(step),"correct":true,"sourceQuestion":step_i}
			graded_count += 1
	if not bool(app.call("_save_progress")):
		_fail("Could not write synthetic completed source journal")
		return
	var bytes_before: String = FileAccess.get_file_as_string(JOURNAL)
	if bytes_before.is_empty():
		_fail("Synthetic source journal empty")
		return
	var script: GDScript = load("res://practical-case-sequence.gd")
	if script == null:
		_fail("Ordered source case session missing")
		return
	var sequence: RefCounted = script.new()
	if bool(sequence.call("configure", IDS, ["16","36","11","26","48","99"], cases, tools)):
		_fail("Wrong FDI identity erroneously accepted")
		return
	if bool(sequence.call("configure", ["molar","molar","anterior","crown","surgery","perio"], FDIS, cases, tools)):
		_fail("Duplicate source case ID erroneously accepted")
		return
	if not bool(sequence.call("configure", IDS, FDIS, cases, tools)):
		_fail("Original ordered source cases rejected")
		return
	if int(sequence.call("total")) != graded_count or graded_count < 30:
		_fail("Graded source task inventory changed")
		return
	var count: int = 0
	var transitions: int = 0
	for run_i in range(2):
		if run_i > 0 and not bool(sequence.call("start_run")):
			_fail("Could not restart ordered source run")
			return
		if int(sequence.call("score")) != 0 or not (sequence.call("answers_snapshot") as Dictionary).get("molar",{}).is_empty():
			_fail("Prior run answers or points leaked into next run")
			return
		var last_case: int = 0
		for index in range(graded_count):
			var state: Dictionary = sequence.call("state")
			var case_index: int = int(state["caseIndex"])
			var step_index: int = int(state["stepIndex"])
			var case_id: String = str(state["caseId"])
			var step: Dictionary = state["step"]
			if case_index < last_case or case_index > last_case + 1 or case_id != IDS[case_index] or str(state["fdi"]) != FDIS[case_index]:
				_fail("Original case/FDI order reordered at "+str(index))
				return
			if case_index != last_case:
				transitions += 1
				if not bool(sequence.call("previous")):
					_fail("Cannot navigate backward across case boundary")
					return
				var back: Dictionary = sequence.call("state")
				if str(back["caseId"]) != IDS[last_case]:
					_fail("Backward navigation changed source case identity")
					return
				if not bool(sequence.call("next")) or int((sequence.call("state") as Dictionary)["caseIndex"]) != case_index:
					_fail("Forward navigation after boundary return failed")
					return
				last_case = case_index
			if int(state["runNumber"]) != run_i+1 or bool(state["complete"]) or bool(sequence.call("next")):
				_fail("Unanswered source task unexpectedly advanced/completed")
				return
			if bool(sequence.call("submit", "invented-case", step_index, _source_selected(step)).get("accepted",false)):
				_fail("Forged cross-case answer accepted")
				return
			if bool(sequence.call("submit", case_id, step_index+1, _source_selected(step)).get("accepted",false)):
				_fail("Wrong source step identity accepted")
				return
			# FDI or choice wrong source option is a valid learner attempt but
			# must not award a point, unlock the sequence or change saved data.
			if index == 0:
				var wrong: Variant = "18" if str(step["type"]) == "tooth" else null
				if wrong != null:
					var wrong_out: Dictionary = sequence.call("submit", case_id, step_index, wrong)
					if not bool(wrong_out.get("accepted",false)) or bool(wrong_out.get("awarded",true)) or bool(sequence.call("next")):
						_fail("Wrong source answer advanced or awarded points")
						return
			# Real Godot run-only Button signal, independent of ordinary
			# completion-locked persistent Practical UI callbacks.
			var b := Button.new()
			b.name = "KL_CASE_RUN_%d_SOURCE_%s_%d" % [run_i,case_id,step_index]
			b.pressed.connect(_attempt.bind(sequence,case_id,step_index,_source_selected(step)))
			root.add_child(b)
			_last = {}
			b.pressed.emit()
			if not bool(_last.get("accepted",false)) or not bool(_last.get("correct",false)) or not bool(_last.get("awarded",false)):
				_fail("Real source correct run button did not score")
				return
			b.pressed.emit()
			if bool(_last.get("accepted",true)) or int(sequence.call("score")) != index+1:
				_fail("Duplicate scored task awarded again")
				return
			b.queue_free()
			count += 1
			# Reload original persisted profile, with the original Practical
			# selection context in memory. Session cursor/answers must survive
			# reload and neither reload nor session scoring may modify bytes.
			app.call("_load_progress")
			app.set("_case_index",case_index)
			app.set("_station_index",4)
			if not bool(app.call("_practical_source_complete",step_index)):
				_fail("Original source completion changed after reload")
				return
			if FileAccess.get_file_as_string(JOURNAL) != bytes_before:
				_fail("Learner journal byte mutation in ordered run")
				return
			if int((sequence.call("state") as Dictionary)["caseIndex"]) != case_index or int((sequence.call("state") as Dictionary)["stepIndex"]) != step_index:
				_fail("Ordered run cursor changed after normal journal reload")
				return
			if index+1 < graded_count:
				if not bool(sequence.call("next")):
					_fail("Correct source task could not advance")
					return
			elif bool(sequence.call("next")) or not bool(sequence.call("complete")):
				_fail("Final task incorrectly advanced or run incomplete")
				return
		if int(sequence.call("score")) != graded_count or not bool(sequence.call("complete")):
			_fail("Missing full source case-sequence score")
			return
		if FileAccess.get_file_as_string(JOURNAL) != bytes_before:
			_fail("Learner data changed after complete case run")
			return
	if count != graded_count*2 or transitions != (IDS.size()-1)*2:
		_fail("Source case progression count incorrect")
		return
	print("SR78_SOURCE_ORDERED_CASE_SEQUENCE_NAV_RELOAD_INTEGRITY_PASS cases=6 graded_steps="+str(graded_count)+" runs=2 attempts="+str(count)+" case_transitions="+str(transitions)+" original_journal_byte_identical, actual_Button_signals, HEADLESS_ONLY")
	quit(0)
