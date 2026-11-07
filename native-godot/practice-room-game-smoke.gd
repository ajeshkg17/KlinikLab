extends SceneTree
## Rebuilt SR92: isolated in-memory game ledger, no filesystem writes.
func _initialize() -> void:
	call_deferred("_run")

func _fail(message: String) -> void:
	push_error("REBUILT_SR92_PRACTICE_GAME_FAILED: " + message)
	quit(1)

func _run() -> void:
	var game_script: GDScript = load("res://practice-room-game.gd")
	if game_script == null:
		_fail("score model unavailable")
		return
	var game: RefCounted = game_script.new()
	var steps: Array = [
		{"type":"choice"}, {"type":"tooth"}, {"type":"tool"},
		{"type":"drill"}, {"type":"choice"}, {"type":"tooth"}, {"type":"tool"}
	]
	if not game.call("configure", steps):
		_fail("six graded source tasks rejected")
		return
	for run_index in range(2):
		if run_index > 0:
			game.call("start_run")
		if int(game.call("score")) != 0 or int(game.call("max_score")) != 66:
			_fail("incorrect new-run score or 66-point ceiling")
			return
		if bool(game.call("award_station", "invalid")):
			_fail("unknown station earned points")
			return
		for station in ["operatory", "language"]:
			if not bool(game.call("award_station", station)) or bool(game.call("award_station", station)):
				_fail("station visit did not award exactly once")
				return
		if int(game.call("score")) != 20:
			_fail("two stations did not yield 20")
			return
		if bool((game.call("award_task", 3) as Dictionary).get("awarded", false)):
			_fail("unscored drill earned points")
			return
		var bonus_total := 0
		var valid_indices := [0, 1, 2, 4, 5, 6]
		for task_index in valid_indices:
			var first: Dictionary = game.call("award_task", task_index)
			var duplicate: Dictionary = game.call("award_task", task_index)
			if not bool(first.get("awarded", false)) or bool(duplicate.get("awarded", false)):
				_fail("valid award missing or duplicate farming")
				return
			bonus_total += int(first.get("bonus", 0))
		if bonus_total != 6 or int(game.call("score")) != 56 or bool(game.call("complete")):
			_fail("run completed without instrument handling")
			return
		if not bool(game.call("award_handling")) or bool(game.call("award_handling")):
			_fail("handling points were not awarded exactly once")
			return
		if int(game.call("score")) != 66 or not bool(game.call("complete")):
			_fail("completed run did not earn 20 + 30 + 6 + 10")
			return
		var end_state: Dictionary = game.call("summary")
		if str(end_state.get("tier", "")) != "Mastery" or not str(end_state.get("nextBonus", "")).contains("no further tier bonus"):
			_fail("finished-tier feedback incorrect")
			return
	print("REBUILT_SR92_PRACTICE_GAME_SCORING_PASS")
	quit()
