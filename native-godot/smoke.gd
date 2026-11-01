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
	var case0: Dictionary = cases[0]
	if str(case0.get("patientName","")).is_empty() or (case0.get("patientReply",[]) as Array).size()!=7:
		_fail("Original guided patient dialogue not exported")
		return
	var correct: int = int(questions[0]["correct"])
	app.call("_answer", "interview", 0, correct)
	var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
	if answers.size() < 1 or not answers["molar:interview:0"]["correct"]:
		_fail("Native answer event and formative evaluation failed")
		return
	var journeys: Dictionary = app.get("_pathways")
	if journeys.size()!=6 or (journeys["molar"]["procedure"] as Array).size()<3:
		_fail("Original source clinical journey cases/steps unavailable")
		return
	app.call("_journey_ask","history",0)
	app.call("_journey_ask","tests",0)
	app.call("_journey_diagnosis",int(journeys["molar"]["correct"]))
	app.call("_journey_plan","primary",int(journeys["molar"]["primary"]))
	app.call("_journey_plan","alternative",int(journeys["molar"]["alternative"]))
	app.call("_journey_set_consent",true)
	for i in range((journeys["molar"]["procedure"] as Array).size()):
		app.call("_journey_procedure",i)
	var clinical_state: Dictionary = (app.get("_progress") as Dictionary)["journey"]["molar"]
	if (clinical_state["history"] as Array).size()!=1 or (clinical_state["tests"] as Array).size()!=1 or not bool(clinical_state["consent"]) or int(clinical_state["ordered"])!=(journeys["molar"]["procedure"] as Array).size():
		_fail("Native original six-stage clinical pathway state transitions failed")
		return
	var report: String = app.call("_generate_report")
	if not report.contains("CASE FDI 16") or not report.contains("Original production source SHA") or not report.contains("formative choices=1") or not report.contains("Native clinical journey: history="):
		_fail("Native case-based formative report or provenance incorrect")
		return
	app.call("_select_case", 1)
	app.call("_select_station", 4)
	var practical: Array = content["practical"][1]
	var practical_choice := -1
	for i in range(practical.size()):
		if str(practical[i]["type"]) == "choice":
			practical_choice = i
			break
	if practical_choice < 0:
		_fail("Original endodontic practical choice missing")
		return
	app.call("_practical_choice", practical_choice, int(practical[practical_choice]["correct"]))
	var practical_progress: Dictionary = (app.get("_progress") as Dictionary)["answers"]
	if not practical_progress["endo:practical:" + str(practical_choice)]["correct"]:
		_fail("Native original practical decision did not record correct formative answer")
		return
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
	print("SR2_NATIVE_FULL_APP_FOUNDATION_LOGIC_PASS: PATIENT REPLIES; LOCAL REPORT; SOURCE 6/7; CASE SWITCH; FSP QUESTION; SOURCE PRACTICAL DECISION; PERSIST; RESET; NOT GPU/FULL APP")
	quit(0)
