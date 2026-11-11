extends "res://composite-inspection-trial.gd"
## One additional fictional Nabers probe recognition bench.
## Reuses the existing chart chair; no new chair scenario or patient measurements.
func _run() -> void:
	await _run_lesson("furcation")
