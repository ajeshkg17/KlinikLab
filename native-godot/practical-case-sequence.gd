extends RefCounted
## SR78 disposable source-ordered case workflow for a future game level.
## Session order/cursor/answers are ephemeral and never read or write user://.
## Original learner journal and its existing Practical locks are independent.
var _case_ids: Array = []
var _fdis: Array = []
var _tasks: Array = []
var _tools: Array = []
var _scorers: Array = []
var _case_cursor: int = 0
var _task_cursor: int = 0
var _run_number: int = 0
var _configured: bool = false

func configure(case_ids: Array, fdis: Array, practical: Array, tools: Array) -> bool:
	_configured = false
	_case_ids.clear()
	_fdis.clear()
	_tasks.clear()
	_tools.clear()
	_scorers.clear()
	if case_ids.is_empty() or case_ids.size() != fdis.size() or case_ids.size() != practical.size():
		return false
	var seen: Dictionary = {}
	var score_script: GDScript = load("res://practical-run-score.gd")
	if score_script == null:
		return false
	for i in range(case_ids.size()):
		var id: String = str(case_ids[i])
		var fdi: String = str(fdis[i])
		var steps: Variant = practical[i]
		if id.is_empty() or seen.has(id) or not (steps is Array) or (steps as Array).is_empty():
			return false
		var first: Dictionary = (steps as Array)[0]
		if str(first.get("type", "")) != "tooth" or str(first.get("target", "")) != fdi:
			return false
		var graded: int = 0
		for item in steps:
			if not (item is Dictionary):
				return false
			var kind: String = str(item.get("type", ""))
			if kind not in ["tooth", "choice", "tool", "drill"]:
				return false
			if kind != "drill":
				graded += 1
		if graded < 1:
			return false
		seen[id] = true
		_case_ids.append(id)
		_fdis.append(fdi)
		_tasks.append((steps as Array).duplicate(true))
		var scorer: RefCounted = score_script.new()
		scorer.call("configure", steps, tools)
		_scorers.append(scorer)
	_tools = tools.duplicate(true)
	_configured = true
	_run_number = 1
	_case_cursor = 0
	_task_cursor = 0
	return true

func start_run() -> bool:
	if not _configured:
		return false
	for scorer in _scorers:
		(scorer as RefCounted).call("start_run")
	_run_number += 1
	_case_cursor = 0
	_task_cursor = 0
	return true

func _graded_indices(case_index: int) -> Array:
	var indices: Array = []
	for step_index in range((_tasks[case_index] as Array).size()):
		if str((_tasks[case_index][step_index] as Dictionary).get("type", "")) in ["tooth", "choice", "tool"]:
			indices.append(step_index)
	return indices

func state() -> Dictionary:
	if not _configured:
		return {}
	var grader: RefCounted = _scorers[_case_cursor]
	return {
		"caseIndex": _case_cursor, "caseId": _case_ids[_case_cursor],
		"fdi": _fdis[_case_cursor], "stepIndex": _task_cursor,
		"step": (_tasks[_case_cursor][_task_cursor] as Dictionary).duplicate(true),
		"caseScore": grader.call("score"), "caseTotal": grader.call("total"),
		"runNumber": _run_number, "complete": complete()
	}

func submit(case_id: String, step_index: int, selected: Variant) -> Dictionary:
	if not _configured or case_id != _case_ids[_case_cursor] or step_index != _task_cursor:
		return {"accepted":false, "correct":false, "awarded":false}
	return (_scorers[_case_cursor] as RefCounted).call("submit", step_index, selected)

func next() -> bool:
	if not _configured:
		return false
	var scorer: RefCounted = _scorers[_case_cursor]
	var answers: Dictionary = scorer.call("answers_snapshot")
	var record: Dictionary = answers.get(_task_cursor, {})
	if record.get("correct", null) != true:
		return false
	var graded: Array = _graded_indices(_case_cursor)
	var position: int = graded.find(_task_cursor)
	if position < 0:
		return false
	if position + 1 < graded.size():
		_task_cursor = int(graded[position+1])
		return true
	if _case_cursor + 1 >= _case_ids.size():
		return false
	_case_cursor += 1
	_task_cursor = int(_graded_indices(_case_cursor)[0])
	return true

func previous() -> bool:
	if not _configured:
		return false
	var graded: Array = _graded_indices(_case_cursor)
	var position: int = graded.find(_task_cursor)
	if position > 0:
		_task_cursor = int(graded[position-1])
		return true
	if _case_cursor == 0:
		return false
	_case_cursor -= 1
	var prev: Array = _graded_indices(_case_cursor)
	_task_cursor = int(prev[prev.size()-1])
	return true

func score() -> int:
	var total: int = 0
	for scorer in _scorers:
		total += int((scorer as RefCounted).call("score"))
	return total

func total() -> int:
	var count: int = 0
	for scorer in _scorers:
		count += int((scorer as RefCounted).call("total"))
	return count

func complete() -> bool:
	if not _configured or _scorers.is_empty():
		return false
	for scorer in _scorers:
		if not bool((scorer as RefCounted).call("complete")):
			return false
	return true

func answers_snapshot() -> Dictionary:
	var result: Dictionary = {}
	for i in range(_scorers.size()):
		result[_case_ids[i]] = (_scorers[i] as RefCounted).call("answers_snapshot")
	return result
