extends SceneTree
## Headless logic test for interactive native app WITHOUT pretending to render.
## Exercises source load, case/station navigation, multiple-choice answers,
## progress persistence and reload using real Godot 4.7.2 runtime.

func _initialize() -> void:
	call_deferred("_smoke")

func _fail(message: String) -> void:
	push_error("SR2_NATIVE_APPLICATION_LOGIC_FAILED " + message)
	quit(1)

func _smoke() -> void:
	var app_script: GDScript = load("res://app.gd")
	if app_script == null:
		_fail("Cannot load standalone application GDScript")
		return
	var app: Node3D = app_script.new()
	if not bool(app.call("_load_source")):
		_fail("Independent exact-source production manifests failed")
		return
	app.call("_load_progress")
	var content: Dictionary = app.get("_content")
	var cases: Array = content["cases"]
	var stations: Array = content["stations"]
	if cases.size() != 6 or stations.size() != 7:
		_fail("Source case/station catalogue not runnable")
		return
	var questions: Array = content["quiz"]["interview"]
	if questions.size() != 7:
		_fail("Source patient interview content mismatches original")
		return
	var correct: int = int(questions[0]["correct"])
	app.call("_answer", "interview", 0, correct)
	var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
	if answers.size() < 1 or not answers["molar:interview:0"]["correct"]:
		_fail("Native answer event and formative evaluation failed")
		return
	app.call("_select_case", 1)
	app.call("_select_station", 4)
	var progress: Dictionary = app.get("_progress")
	if int(progress["selectedCase"]) != 1 or int(progress["selectedStation"]) != 4:
		_fail("Native FDI36 and practical station selection didn't persist")
		return
	var reloaded: Node3D = app_script.new()
	if not bool(reloaded.call("_load_source")):
		_fail("Reloaded application source verification failed")
		return
	reloaded.call("_load_progress")
	var stored: Dictionary = reloaded.get("_progress")
	if int(stored["selectedCase"]) != 1 or int(stored["selectedStation"]) != 4 or 		not (stored["answers"] as Dictionary).has("molar:interview:0"):
		_fail("Persisted native educational progress not restored across sessions")
		return
	reloaded.call("_reset_progress")
	var empty: Dictionary = reloaded.get("_progress")
	if (empty["answers"] as Dictionary).size() != 0 or 		(empty["studied"] as Dictionary).size() != 0:
		_fail("Reset educational progress did not clear all answers")
		return
	print("SR2_NATIVE_FULL_APP_FOUNDATION_LOGIC_PASS: SOURCE 6/7; CASE SWITCH; FSP QUESTION; PERSIST; RESET; NOT GPU/FULL APP")
	quit(0)
