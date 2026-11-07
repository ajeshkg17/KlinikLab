extends RefCounted
## Optional, entirely in-memory educational Practice Game score.
## It is NOT a clinical grade and never accesses the ordinary learner journal.
## Only source-validated awards from practical-case-sequence.gd may reach award_task.
const STATION_IDS := ["operatory", "language"]
var _graded_steps: Dictionary = {}
var _stations: Dictionary = {}
var _tasks: Dictionary = {}
var _bonus_points: int = 0
var _run_number: int = 0

func configure(source_steps: Array) -> bool:
	_graded_steps.clear()
	for i in range(source_steps.size()):
		var step: Variant = source_steps[i]
		if step is Dictionary and str(step.get("type", "")) in ["choice", "tooth", "tool"]:
			_graded_steps[i] = true
	# The FDI16 room contract has precisely six original graded tasks.
	if _graded_steps.size() != 6:
		return false
	_run_number = 0
	start_run()
	return true

func start_run() -> void:
	_stations.clear()
	_tasks.clear()
	_bonus_points = 0
	_run_number += 1

func award_station(station_id: String) -> bool:
	if station_id not in STATION_IDS or _stations.has(station_id):
		return false
	_stations[station_id] = true
	return true

func _tier_bonus(previously_correct: int) -> int:
	if previously_correct < 2:
		return 0
	if previously_correct < 4:
		return 1
	if previously_correct < 6:
		return 2
	return 3

func award_task(step_index: int) -> Dictionary:
	if not _graded_steps.has(step_index) or _tasks.has(step_index):
		return {"awarded":false, "base":0, "bonus":0}
	var bonus: int = _tier_bonus(_tasks.size())
	_tasks[step_index] = true
	_bonus_points += bonus
	return {"awarded":true, "base":5, "bonus":bonus}

func station_points() -> int:
	return _stations.size() * 10

func base_points() -> int:
	return _tasks.size() * 5

func bonus_points() -> int:
	return _bonus_points

func score() -> int:
	return station_points() + base_points() + bonus_points()

func max_score() -> int:
	var bonus := 0
	for count in range(_graded_steps.size()):
		bonus += _tier_bonus(count)
	return STATION_IDS.size() * 10 + _graded_steps.size() * 5 + bonus

func tier() -> String:
	var count: int = _tasks.size()
	if count < 2:
		return "Foundation"
	if count < 4:
		return "Building"
	if count < 6:
		return "Proficient"
	return "Mastery"

func next_bonus_message() -> String:
	if _tasks.size() >= _graded_steps.size():
		return "Mastery tier achieved · no further tier bonus this run"
	return "Next new correct FDI16 task: +5 base, +%d tier bonus" % _tier_bonus(_tasks.size())

func complete() -> bool:
	return _stations.size() == STATION_IDS.size() and _tasks.size() == _graded_steps.size()

func summary() -> Dictionary:
	return {
		"runNumber":_run_number,
		"score":score(),
		"maxScore":max_score(),
		"stationPoints":station_points(),
		"basePoints":base_points(),
		"bonusPoints":bonus_points(),
		"stations":_stations.size(),
		"stationTotal":STATION_IDS.size(),
		"tasks":_tasks.size(),
		"taskTotal":_graded_steps.size(),
		"tier":tier(),
		"nextBonus":next_bonus_message(),
		"complete":complete()
	}
