extends SceneTree
## SR77 isolated actual Godot two-run replay with a source-scored already-solved
## learner journal. Actual run controls send signals to the in-memory scorer.
## No owner profile or disk writes during either scored run.
const IDS := ["molar", "endo", "anterior", "crown", "surgery", "perio"]
const FDIS := ["16", "36", "11", "26", "48", "46"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"
var _last_attempt: Dictionary = {}

func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	push_error("SR77_PRACTICAL_REPLAY_FAILED: " + message)
	quit(1)

func _run_signal(scorer: RefCounted, step_index: int, selected: Variant) -> void:
	_last_attempt = scorer.call("submit", step_index, selected)

func _correct(step: Dictionary) -> Variant:
	match str(step.get("type", "")):
		"choice":
			return int(step.get("correct", -1))
		"tooth", "tool":
			return str(step.get("target", ""))
	return null

func _source_count(steps: Array) -> int:
	var count: int = 0
	for step in steps:
		if str((step as Dictionary).get("type", "")) in ["choice", "tooth", "tool"]:
			count += 1
	return count

func _run() -> void:
	root.size = Vector2i(1500, 900)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Native source scene missing")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	# Test-only Godot XDG profile. Construct a completed real source journal,
	# preserving its bytes for comparison through both subsequent scored runs.
	app.call("_reset_progress")
	var source: Dictionary = app.get("_content")
	var source_tools: Array = source["tools"]
	var progress: Dictionary = app.get("_progress")
	var answers: Dictionary = progress["answers"]
	progress["notes"]["replay_fixture"] = "Preserve this journal and all original source answers"
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {"text":"Existing FSP learner text must stay exact", "result":{}}
	var expected: int = 0
	for case_i in range(FDIS.size()):
		var steps: Array = source["practical"][case_i]
		for step_i in range(steps.size()):
			var step: Dictionary = steps[step_i]
			if str(step.get("type", "")) not in ["choice", "tooth", "tool"]:
				continue
			answers[IDS[case_i]+":practical:"+str(step_i)] = {
				"selected": _correct(step), "correct":true, "sourceQuestion":step_i}
			expected += 1
	if expected < 30:
		_fail("Original source Practical inventory incomplete")
		return
	if not bool(app.call("_save_progress")):
		_fail("Could not seed isolated learner progress journal")
		return
	var baseline: String = FileAccess.get_file_as_string(JOURNAL)
	if baseline.is_empty():
		_fail("Seeded source journal bytes absent")
		return
	var scorer_script: Script = load("res://practical-run-score.gd")
	if scorer_script == null:
		_fail("Isolated scoring adapter not loadable")
		return
	var attempts: int = 0
	var total_points: int = 0
	for case_i in range(FDIS.size()):
		app.call("_switch_view", "clinic")
		app.call("_select_case", case_i)
		app.call("_select_station", 4)
		app.call("_set_procedure_guided", true)
		var steps: Array = source["practical"][case_i]
		var scorer: RefCounted = scorer_script.new()
		scorer.call("configure", steps, source_tools)
		var scored: int = _source_count(steps)
		if int(scorer.call("total")) != scored or int(scorer.call("score")) != 0:
			_fail("Run scorer inventory/zero-state mismatch "+FDIS[case_i])
			return
		for step_i in range(steps.size()):
			var step: Dictionary = steps[step_i]
			if str(step.get("type", "")) not in ["choice", "tooth", "tool"]:
				continue
			if not bool(app.call("_practical_source_complete", step_i)):
				_fail("Seeded original learner completion lost "+FDIS[case_i]+"/"+str(step_i))
				return
		# Both runs use the same scorer instance; start_run must clear only
		# ephemeral run answers, not the persisted source-answer journal.
		for run_i in range(2):
			if run_i > 0:
				scorer.call("start_run")
			if int(scorer.call("run_number")) != run_i + 1 or int(scorer.call("score")) != 0 or not (scorer.call("answers_snapshot") as Dictionary).is_empty():
				_fail("Run-local answers or points leaked across replay "+FDIS[case_i])
				return
			var earned: int = 0
			for step_i in range(steps.size()):
				var step: Dictionary = steps[step_i]
				if str(step.get("type", "")) not in ["choice", "tooth", "tool"]:
					continue
				var choice: Variant = _correct(step)
				# A physically instantiated Godot run-level Button fires an
				# actual pressed signal to the separate run scorer; unlike the
				# ordinary Practical widget it must not invoke _record_practical.
				var action := Button.new()
				action.name = "KL_REPLAY_RUN_%d_TASK_%d" % [run_i,step_i]
				action.pressed.connect(_run_signal.bind(scorer, step_i, choice))
				root.add_child(action)
				_last_attempt = {}
				action.pressed.emit()
				if not bool(_last_attempt.get("accepted", false)) or not bool(_last_attempt.get("correct", false)) or not bool(_last_attempt.get("awarded", false)):
					_fail("Correct run-level source attempt not scored "+FDIS[case_i]+"/"+str(step_i)+"/"+str(run_i))
					return
				var frozen_score: int = int(scorer.call("score"))
				# Each original question earns at most one run point, even if a
				# stale/double signal occurs in the same run.
				action.pressed.emit()
				if int(scorer.call("score")) != frozen_score or bool(_last_attempt.get("accepted", true)):
					_fail("Same run re-awarded an already-scored source task")
					return
				action.queue_free()
				earned += 1
				attempts += 1
			if earned != scored or int(scorer.call("score")) != scored or not bool(scorer.call("complete")) or (scorer.call("answers_snapshot") as Dictionary).size() != scored:
				_fail("Replay score did not reach full original tasks "+FDIS[case_i]+"/"+str(run_i))
				return
			total_points += int(scorer.call("score"))
			if FileAccess.get_file_as_string(JOURNAL) != baseline:
				_fail("Original learner journal byte mutation during scored run "+FDIS[case_i]+"/"+str(run_i))
				return
		for step_i in range(steps.size()):
			var step: Dictionary = steps[step_i]
			if str(step.get("type", "")) in ["choice", "tooth", "tool"] and not bool(app.call("_practical_source_complete", step_i)):
				_fail("Ordinary immutable learner completion changed during replay "+FDIS[case_i]+"/"+str(step_i))
				return
	# Original learner journal contains previously completed scored answers
	# and remains byte-identical after 12 distinct full-score sessions.
	app.call("_load_progress")
	if FileAccess.get_file_as_string(JOURNAL) != baseline:
		_fail("Source journal changed across reload")
		return
	if attempts != expected * 2 or total_points != expected * 2:
		_fail("Both runs failed to score all source tasks independently")
		return
	print("SR77_PRACTICAL_REPLAY_TWO_RUNS_SEEDED_JOURNAL_BYTES_UNCHANGED_PASS six_FDI_cases, twelve_sessions, scored_steps="+str(expected)+", scored_attempts="+str(attempts)+", in_memory_run_answers, no_learner_journal_writes, HEADLESS_ONLY")
	quit(0)
