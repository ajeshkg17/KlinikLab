extends SceneTree
## SR84 actual Godot 4.7.2 native clinic browser-parity case context.
## Test exact source patient/case/station across 6 cases x 7 stations,
## with no journal mutation from the displayed read-only source text.
const CASE_IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const STATION_IDS := ["interview","letter","handover","written","practical","viva","clinic"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(why: String) -> void:
	push_error("SR84_CASE_CONTEXT_FAILED: " + why)
	quit(1)

func _check(app: Node3D, ci: int, si: int) -> bool:
	var cases: Array = app.get("_cases")
	var stations: Array = app.get("_stations")
	var c: Dictionary = cases[ci]
	var station: Dictionary = stations[si]
	if str(c.get("id", "")) != CASE_IDS[ci] or str(c.get("fdi", "")) != FDIS[ci] or str(station.get("id", "")) != STATION_IDS[si]:
		_fail("Source case/station order drift")
		return false
	if int(app.get("_case_index")) != ci or int(app.get("_station_index")) != si:
		_fail("App navigated to wrong case/station")
		return false
	var page: VBoxContainer = app.get("_page") as VBoxContainer
	var patient: Label = page.get_node_or_null("KL_CASE_PATIENT_CONTEXT") as Label
	var focus: Label = page.get_node_or_null("KL_CASE_SOURCE_SUBTITLE") as Label
	var objective: Label = page.get_node_or_null("KL_STATION_SOURCE_OBJECTIVE") as Label
	if patient == null or focus == null or objective == null:
		_fail("Missing live source context text labels")
		return false
	if patient.text != "Fictional patient · %s · %s Jahre · FDI %s" % [str(c["patientName"]),str(c["patientAge"]),str(c["fdi"])]:
		_fail("Fictional patient/name/age/FDI does not match exact case source "+CASE_IDS[ci])
		return false
	if focus.text != "Case focus · " + str(c["subtitle"]) or objective.text != "%s station · %s" % [str(station["track"]).to_upper(),str(station["description"])]:
		_fail("Source case subtitle/station objective drift "+CASE_IDS[ci]+":"+STATION_IDS[si])
		return false
	if not patient.text.contains(FDIS[ci]) or not objective.text.contains(str(station["description"])):
		_fail("Visible source patient/learning objective absent")
		return false
	return true

func _run() -> void:
	root.size = Vector2i(1500,850)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Source-pinned native Godot scene missing")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # CI-only independent disposable user://
	var progress: Dictionary = app.get("_progress")
	(progress["notes"] as Dictionary)["archive:unrelated"] = "Original unrelated fictional note"
	(progress["answers"] as Dictionary)["molar:interview:0"] = {"selected":1,"correct":true,"sourceQuestion":0}
	(progress["studied"] as Dictionary)["perio:clinic"] = true
	(progress["fspKpByTask"] as Dictionary)["endo|brief"] = {"text":"Existing FSP/KP note"}
	if not bool(app.call("_save_progress")):
		_fail("Could not seed isolated CI journal")
		return
	app.call("_load_progress")
	var verified: int = 0
	for ci in range(CASE_IDS.size()):
		app.call("_select_case",ci)
		for si in range(STATION_IDS.size()):
			app.call("_select_station",si)
			if not _check(app,ci,si):
				return
			# A stable ordinary editor state can save on the first refresh;
			# thereafter the read-only source header must never change bytes.
			app.call("_refresh")
			if not _check(app,ci,si):
				return
			var original: String = FileAccess.get_file_as_string(JOURNAL)
			app.call("_refresh")
			if not _check(app,ci,si):
				return
			if FileAccess.get_file_as_string(JOURNAL) != original:
				_fail("Read-only native source context changed journal at "+CASE_IDS[ci]+":"+STATION_IDS[si])
				return
			verified += 1
	# Return to initial case and ensure no case-context bleed through, even
	# after a disk reload and using the normal public navigation callbacks.
	app.call("_select_case",0)
	app.call("_select_station",0)
	app.call("_load_progress")
	app.call("_refresh")
	if not _check(app,0,0):
		return
	var saved: Dictionary = app.get("_progress")
	if str((saved["notes"] as Dictionary).get("archive:unrelated","")) != "Original unrelated fictional note":
		_fail("Unrelated saved learner note changed")
		return
	if (saved["studied"] as Dictionary).get("perio:clinic",false) != true:
		_fail("Precompleted learner station lost")
		return
	var answer: Dictionary = (saved["answers"] as Dictionary).get("molar:interview:0",{})
	if answer.get("correct",false) != true or int(answer.get("selected",-1)) != 1 or int(answer.get("sourceQuestion",-1)) != 0:
		_fail("Original formative quiz answer modified")
		return
	if str(((saved["fspKpByTask"] as Dictionary).get("endo|brief",{}) as Dictionary).get("text","")) != "Existing FSP/KP note":
		_fail("Original unrelated FSP data modified")
		return
	if verified != 42:
		_fail("Missing six-source-case seven-station coverage")
		return
	print("SR84_SIX_FDI_SEVEN_STATION_PATIENT_CASE_OBJECTIVE_CONTEXT_PASS views=42, source_exact_patient_age_FDI_case_subtitle_track_station_description, stable_read_only_journal_bytes, navigation_reload, unrelated_quiz_FSP_completion_notes_preserved; HEADLESS_ONLY")
	quit(0)
