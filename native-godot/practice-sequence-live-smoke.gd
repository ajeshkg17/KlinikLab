extends SceneTree
## SR82 genuine live native UI: source case order via SR78 controller, real
## Button.pressed for start, wrong/correct responses, next/prev, replay/exit.
## Existing completed learner journal must remain byte-identical.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"
var _count: int = 0
var _transitions: int = 0

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR82_LIVE_SEQUENCE_FAILED: "+reason)
	quit(1)

func _btn(app: Node3D, name: String) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null(name) as Button

func _press(app: Node3D, name: String) -> bool:
	var b: Button = _btn(app,name)
	if b == null or b.disabled:
		_fail("Missing/disabled live learner button "+name)
		return false
	b.pressed.emit()
	return true

func _source_correct(step: Dictionary) -> Variant:
	match str(step.get("type","")):
		"choice":
			return int(step["correct"])
		"tooth","tool":
			return str(step["target"])
	return null

func _source_wrong(step: Dictionary, tools: Array) -> Variant:
	match str(step.get("type","")):
		"choice":
			return (int(step["correct"])+1)%(step["options"] as Array).size()
		"tooth":
			return "18"
		"tool":
			for t in tools:
				if t is Dictionary and str(t.get("id","")) != str(step["target"]):
					return str(t["id"])
	return null

func _journal_unchanged(raw: String, why: String) -> bool:
	if FileAccess.get_file_as_string(JOURNAL) != raw:
		_fail("Original completed journal was modified: "+why)
		return false
	return true

func _run() -> void:
	root.size = Vector2i(1500,900)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Native app unavailable")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	# All writes to disposable hosted CI profile BEFORE journal snapshot.
	app.call("_reset_progress")
	app.set("_case_index",0)
	app.set("_station_index",4)
	app.set("_view","clinic")
	var source: Dictionary = app.get("_content")
	var cases: Array = source["practical"]
	var tools: Array = source["tools"]
	var progress: Dictionary = app.get("_progress")
	var answers: Dictionary = progress["answers"]
	(progress["notes"] as Dictionary)["keep"] = "Original learner note stays verbatim"
	(progress["fspKpByTask"] as Dictionary)["endo|brief"] = {"text":"Unrelated original FSP text"}
	var total: int = 0
	for i in range(IDS.size()):
		for step_i in range((cases[i] as Array).size()):
			var task: Dictionary = cases[i][step_i]
			if str(task.get("type","")) not in ["choice","tooth","tool"]:
				continue
			answers[IDS[i]+":practical:"+str(step_i)] = {
				"selected":_source_correct(task),"correct":true,"sourceQuestion":step_i}
			total += 1
	if total != 37:
		_fail("Canonical original source task inventory drift")
		return
	if not bool(app.call("_save_progress")):
		_fail("Cannot seed isolated learner completed journal")
		return
	app.call("_load_progress")
	app.call("_refresh")
	var raw: String = FileAccess.get_file_as_string(JOURNAL)
	if raw.is_empty():
		_fail("Empty seeded journal")
		return
	if _btn(app,"KL_SEQUENCE_START") == null:
		_fail("Opt-in Practice Sequence not exposed in actual Practical station")
		return
	if app.get("_practice_sequence") != null:
		_fail("Practice Sequence incorrectly auto-started")
		return
	if not _press(app,"KL_SEQUENCE_START") or not _journal_unchanged(raw,"start"):
		return
	for run_i in range(2):
		var sequence: RefCounted = app.get("_practice_sequence")
		if sequence == null or int(sequence.call("score")) != 0 or int(sequence.call("total")) != total:
			_fail("Run did not start from zero, or source total changed")
			return
		var case_last: int = 0
		for graded_i in range(total):
			var state: Dictionary = sequence.call("state")
			var case_i: int = int(state["caseIndex"])
			var case_id: String = str(state["caseId"])
			var step_i: int = int(state["stepIndex"])
			var task: Dictionary = state["step"]
			if case_id != IDS[case_i] or str(state["fdi"]) != FDIS[case_i] or case_i < case_last or case_i > case_last+1:
				_fail("Actual UI controller case order/FDI changed at "+str(graded_i))
				return
			if case_i != case_last:
				_transitions += 1
				# Previous crosses source FDI boundary; Next restores current.
				if not _press(app,"KL_SEQUENCE_PREVIOUS"):
					return
				if str((sequence.call("state") as Dictionary)["caseId"]) != IDS[case_last]:
					_fail("Previous did not cross back to source case")
					return
				if not _press(app,"KL_SEQUENCE_NEXT"):
					return
				if int((sequence.call("state") as Dictionary)["caseIndex"]) != case_i:
					_fail("Next did not restore source case")
					return
				case_last = case_i
			var next: Button = _btn(app,"KL_SEQUENCE_NEXT")
			if next == null or not next.disabled or int(sequence.call("score")) != graded_i:
				_fail("Unanswered step incorrectly unlocked or scored")
				return
			# Direct event on disabled next cannot bypass controller gate.
			next.pressed.emit()
			if int((sequence.call("state") as Dictionary)["stepIndex"]) != step_i:
				_fail("Unanswered source task advanced despite gate")
				return
			var wrong: Variant = _source_wrong(task,tools)
			if wrong == null:
				_fail("No valid incorrect original source option")
				return
			if not _press(app,"KL_SEQUENCE_ANSWER_"+str(wrong)):
				return
			if int(sequence.call("score")) != graded_i or not (_btn(app,"KL_SEQUENCE_NEXT") as Button).disabled:
				_fail("Wrong answer gained points or unlocked Next")
				return
			if not _journal_unchanged(raw,"wrong answer"):
				return
			var selected: Variant = _source_correct(task)
			if not _press(app,"KL_SEQUENCE_ANSWER_"+str(selected)):
				return
			if int(sequence.call("score")) != graded_i+1 or (_btn(app,"KL_SEQUENCE_NEXT") as Button).disabled and graded_i+1 < total:
				_fail("Source-correct button did not score/unlock exactly once")
				return
			if _btn(app,"KL_SEQUENCE_ANSWER_"+str(selected)) != null:
				_fail("Solved task still displays repeat-scoring button")
				return
			if not _journal_unchanged(raw,"correct answer"):
				return
			_count += 1
			if graded_i+1 < total:
				if not _press(app,"KL_SEQUENCE_NEXT") or not _journal_unchanged(raw,"next task"):
					return
			elif not bool(sequence.call("complete")) or _btn(app,"KL_SEQUENCE_REPLAY") == null:
				_fail("Final source step did not expose replay")
				return
		if run_i == 0:
			if not _press(app,"KL_SEQUENCE_REPLAY") or not _journal_unchanged(raw,"replay"):
				return
			if int(sequence.call("score")) != 0 or int((sequence.call("state") as Dictionary)["runNumber"]) != 2:
				_fail("Replay failed to reset run-only scoring")
				return
	if _count != 74 or _transitions != 10:
		_fail("Incomplete two-run UI coverage")
		return
	if not _press(app,"KL_SEQUENCE_EXIT") or app.get("_practice_sequence") != null or not _journal_unchanged(raw,"exit"):
		return
	if _btn(app,"KL_SEQUENCE_START") == null or _btn(app,"KL_SEQUENCE_REPLAY") != null:
		_fail("Exiting did not restore original ordinary Practical UI")
		return
	if not _press(app,"KL_SEQUENCE_START") or not _journal_unchanged(raw,"fresh opt-in after exit"):
		return
	var fresh: RefCounted = app.get("_practice_sequence")
	if fresh == null or int(fresh.call("score")) != 0 or int((fresh.call("state") as Dictionary)["caseIndex"]) != 0:
		_fail("Fresh opt-in after exit did not reset")
		return
	if not _press(app,"KL_SEQUENCE_EXIT") or not _journal_unchanged(raw,"final exit"):
		return
	app.call("_load_progress")
	var reload: Dictionary = app.get("_progress")
	if str((reload["notes"] as Dictionary).get("keep","")) != "Original learner note stays verbatim" or str(((reload["fspKpByTask"] as Dictionary)["endo|brief"] as Dictionary).get("text","")) != "Unrelated original FSP text":
		_fail("Preexisting unrelated learner data changed")
		return
	for i in range(IDS.size()):
		app.set("_case_index",i)
		app.set("_station_index",4)
		for step_i in range((cases[i] as Array).size()):
			var task: Dictionary = cases[i][step_i]
			if str(task.get("type","")) in ["choice","tooth","tool"] and not bool(app.call("_practical_source_complete",step_i)):
				_fail("Precompleted ordinary Practical source answer lost "+IDS[i]+":"+str(step_i))
				return
	if not _journal_unchanged(raw,"final original source completion check"):
		return
	print("SR82_LIVE_PRACTICE_SEQUENCE_TWO_RUNS_JOURNAL_BYTES_UNCHANGED_PASS six_FDI_cases, source_tasks=37, scored_attempts=74, transitions=10, actual_start_wrong_correct_next_previous_next_case_replay_exit_buttons, seed_all_original_complete, ordinary_completion_preserved, HEADLESS_ONLY")
	quit(0)
