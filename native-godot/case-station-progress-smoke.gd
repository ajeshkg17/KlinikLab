extends SceneTree
## SR81: real Godot native browser-like selected-case progress counter.
## All source cases and seven canonical station IDs; read-only counter,
## real learner mark-studied signal, isolated disk reload and answer integrity.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const STATIONS := ["interview","letter","handover","written","practical","viva","clinic"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR81_CASE_STATION_PROGRESS_FAILED: "+reason)
	quit(1)

func _clinic_label(app: Node3D) -> Label:
	return (app.get("_page") as VBoxContainer).get_node_or_null("KL_CASE_STATION_PROGRESS") as Label

func _check_case(app: Node3D, case_index: int, expected: int) -> bool:
	var label: Label = _clinic_label(app)
	if label == null:
		_fail("Selected source-case counter missing, case="+str(case_index))
		return false
	if not label.text.contains("FDI %s · %d / 7 stations completed" % [FDIS[case_index],expected]):
		_fail("Selected source-case count/FDI mismatch "+str(case_index)+": "+label.text)
		return false
	if int(app.call("_case_station_studied_count", case_index)) != expected:
		_fail("Source-case count function mismatch "+str(case_index))
		return false
	return true

func _run() -> void:
	root.size = Vector2i(1500,850)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Native source app scene missing")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # CI-only, isolated user:// XDG profile
	var progress: Dictionary = app.get("_progress")
	var studied: Dictionary = progress["studied"]
	var answers: Dictionary = progress["answers"]
	var notes: Dictionary = progress["notes"]
	notes["carry"] = "Unrelated learner note preserved verbatim"
	answers["molar:interview:0"] = {"selected":1,"correct":true,"sourceQuestion":0}
	# Exercise all 7 source station IDs with 0..5 completed across six
	# source cases; also forge records that MUST NOT affect the count.
	for case_i in range(IDS.size()):
		for station_i in range(case_i):
			studied[IDS[case_i]+":"+STATIONS[station_i]] = true
	studied["molar:interview:0"] = true # per-question key is not a station
	studied["molar:invented"] = true
	studied["molars:interview"] = true # prefix near-collision
	studied["perio:clinic"] = "true" # type-forged completion is not true
	if not bool(app.call("_save_progress")):
		_fail("Synthetic progress journal was not saved")
		return
	app.call("_load_progress")
	app.call("_switch_view","clinic")
	var observed: int = 0
	for i in range(IDS.size()):
		app.call("_select_case",i)
		app.call("_select_station",0)
		if not _check_case(app,i,i):
			return
		observed += 1
	# Progress screen must show each of six case summaries with the same
	# 0/7 .. 5/7 values without counting unmatched saved record keys.
	app.call("_switch_view","progress")
	var page: VBoxContainer = app.get("_page")
	for i in range(IDS.size()):
		var label: Label = page.get_node_or_null("KL_PROGRESS_CASE_"+IDS[i]) as Label
		if label == null or not label.text.contains("FDI %s · %d / 7 stations completed" % [FDIS[i],i]):
			_fail("All-cases progress summary missing/wrong FDI "+str(i))
			return
		observed += 1
	# Select source FDI16 and save navigation state BEFORE comparing bytes;
	# normal navigation writes selectedCase by design, but the counter must not.
	app.call("_switch_view","clinic")
	app.call("_select_case",0)
	app.call("_select_station",0)
	if not _check_case(app,0,0):
		return
	var before: String = FileAccess.get_file_as_string(JOURNAL)
	app.call("_refresh")
	app.call("_refresh")
	if FileAccess.get_file_as_string(JOURNAL) != before:
		_fail("Read-only progress refresh changed original journal bytes")
		return
	# Real learner-facing Mark studied button, not just direct data injection.
	var mark: Button = null
	for child in (app.get("_page") as VBoxContainer).get_children():
		if child is Button and (child as Button).text.contains("Mark this case/station studied"):
			mark = child
			break
	if mark == null:
		_fail("Original Mark studied control unavailable")
		return
	mark.pressed.emit()
	if not _check_case(app,0,1):
		return
	app.call("_load_progress")
	app.call("_refresh")
	if not _check_case(app,0,1):
		return
	var reloaded: Dictionary = app.get("_progress")
	if str((reloaded["notes"] as Dictionary).get("carry","")) != "Unrelated learner note preserved verbatim":
		_fail("Unrelated learner note lost after reload")
		return
	var original_answer: Dictionary = (reloaded["answers"] as Dictionary).get("molar:interview:0",{})
	if original_answer.get("correct",null) != true or int(original_answer.get("selected",-1)) != 1 or int(original_answer.get("sourceQuestion",-1)) != 0:
		_fail("Original scored learner answer modified")
		return
	if int(app.call("_case_station_studied_count",1)) != 1 or int(app.call("_case_station_studied_count",5)) != 5:
		_fail("Completing FDI16 contaminated other case counts")
		return
	var after: String = FileAccess.get_file_as_string(JOURNAL)
	app.call("_refresh")
	if FileAccess.get_file_as_string(JOURNAL) != after:
		_fail("Reloaded source progress summary wrote to journal")
		return
	if observed != 12:
		_fail("Not all original source progress views checked")
		return
	print("SR81_SIX_CASE_SEVEN_STATION_PROGRESS_SOURCE_RELOAD_PASS six_FDI_cases, seven_canonical_stations, 12_summary_views, forged_key_and_type_ignored, real_mark_studied, case_isolation, disk_reload, read_only_byte_identity, answer_and_notes_preserved; HEADLESS ONLY")
	quit(0)
