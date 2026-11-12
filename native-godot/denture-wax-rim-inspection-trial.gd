extends "res://composite-inspection-trial.gd"
## Fictional completed-denture versus wax rim model study.
## Reuses the original full_denture chair; no extra procedure simulation.
func _run() -> void:
	await _run_lesson("denture_wax_rim")
