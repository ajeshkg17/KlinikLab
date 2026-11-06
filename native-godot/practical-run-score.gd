extends RefCounted
## SR77 isolated Practical replay contract. This model deliberately owns only
## in-memory *run* answers, never the native learner's persisted journal.
## Level 2 may call submit() from its OWN run controls; ordinary Practical
## controls must continue calling their original completion-locked callbacks.
var _steps: Array = []
var _tool_ids: Dictionary = {}
var _answers: Dictionary = {}
var _score: int = 0
var _total: int = 0
var _run_number: int = 0

func configure(source_steps: Array, catalog_tools: Array) -> void:
	_steps = source_steps.duplicate(true)
	_tool_ids.clear()
	for entry in catalog_tools:
		if entry is Dictionary:
			_tool_ids[str(entry.get("id", ""))] = true
	_run_number = 0
	start_run()

func start_run() -> void:
	_answers.clear()
	_score = 0
	_total = 0
	for step in _steps:
		if step is Dictionary and str(step.get("type", "")) in ["choice", "tooth", "tool"]:
			_total += 1
	_run_number += 1

func _valid_attempt(step: Dictionary, selected: Variant) -> bool:
	match str(step.get("type", "")):
		"choice":
			if not (selected is int or selected is float):
				return false
			var number: float = float(selected)
			var options: Array = step.get("options", [])
			return is_finite(number) and number == floor(number) and number >= 0.0 and number < float(options.size())
		"tooth":
			# Source identifies the actual two-digit target; off-target FDI
			# numbers are valid attempts only if they are source chart entries.
			return selected is String and selected.length() == 2 and selected.is_valid_int() and int(selected) >= 11 and int(selected) <= 48 and (int(selected) % 10) >= 1 and (int(selected) % 10) <= 8 and int(selected) / 10 >= 1 and int(selected) / 10 <= 4
		"tool":
			return selected is String and _tool_ids.has(selected)
	return false

func submit(step_index: int, selected: Variant) -> Dictionary:
	if step_index < 0 or step_index >= _steps.size():
		return {"accepted":false, "correct":false, "awarded":false}
	var step: Dictionary = _steps[step_index]
	if not _valid_attempt(step, selected) or _answers.has(step_index) and bool((_answers[step_index] as Dictionary).get("correct", false)):
		return {"accepted":false, "correct":false, "awarded":false}
	var correct: bool = false
	match str(step.get("type", "")):
		"choice":
			correct = int(float(selected)) == int(step.get("correct", -1))
		"tooth", "tool":
			correct = selected == str(step.get("target", ""))
	_answers[step_index] = {"selected":selected, "correct":correct, "sourceQuestion":step_index}
	if correct:
		_score += 1
	return {"accepted":true, "correct":correct, "awarded":correct}

func score() -> int:
	return _score

func total() -> int:
	return _total

func run_number() -> int:
	return _run_number

func answers_snapshot() -> Dictionary:
	return _answers.duplicate(true)

func complete() -> bool:
	return _score == _total and _total > 0
