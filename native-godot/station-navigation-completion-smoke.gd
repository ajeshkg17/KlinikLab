extends SceneTree
## SR85 real Godot browser-equivalent station completion checkmarks.
## Six case scoped station nav lists, saved progress, isolation and real
## Mark-studied signal in a disposable CI user:// profile only.
const CASE_IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const STATIONS := ["interview","letter","handover","written","practical","viva","clinic"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(why: String) -> void:
	push_error("SR85_STATION_COMPLETION_NAV_FAILED: "+why)
	quit(1)

func _check_nav(app: Node3D, case_index: int, station_index: int, expected: Array) -> bool:
	if int(app.get("_case_index")) != case_index or int(app.get("_station_index")) != station_index:
		_fail("Case/station cursor unexpected")
		return false
	var buttons: Array = app.get("_nav_station_buttons")
	if buttons.size() != 7:
		_fail("Missing actual seven station navigation buttons")
		return false
	var source_ids: Array = app.get("_stations")
	for i in range(STATIONS.size()):
		var btn: Button = buttons[i] as Button
		var done: bool = bool(expected[i])
		var suffix: String = " ✓" if done else ""
		if btn == null or btn.name != "KL_STATION_"+STATIONS[i] or str(source_ids[i]["id"]) != STATIONS[i]:
			_fail("Canonical named source navigation button drift "+str(i))
			return false
		if not btn.text.begins_with(str(i+1)+" · ") or (not btn.text.ends_with(" ✓")) != (not done):
			_fail("Wrong source station completion marker "+CASE_IDS[case_index]+":"+STATIONS[i]+" = "+btn.text)
			return false
		if not btn.tooltip_text.ends_with("Completed (formative)" if done else "Not yet completed"):
			_fail("Wrong station completion accessibility tooltip "+STATIONS[i])
			return false
		if btn.button_pressed != (i == station_index):
			_fail("Station selection changed by read-only status "+STATIONS[i])
			return false
	return true

func _run() -> void:
	root.size = Vector2i(1500,850)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Pinned native app scene unavailable")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # only CI's isolated ephemeral profile
	var progress: Dictionary = app.get("_progress")
	var studied: Dictionary = progress["studied"]
	(progress["notes"] as Dictionary)["archive:unrelated"] = "Preexisting fictional note"
	(progress["answers"] as Dictionary)["molar:interview:0"] = {
		"selected":1,"correct":true,"sourceQuestion":0}
	(progress["fspKpByTask"] as Dictionary)["perio|brief"] = {"text":"Prior FSP session"}
	var expected: Array = []
	var checked: int = 0
	for ci in range(CASE_IDS.size()):
		var row: Array = []
		for si in range(STATIONS.size()):
			var complete: bool = si < ci
			row.append(complete)
			if complete:
				studied[CASE_IDS[ci]+":"+STATIONS[si]] = true
		expected.append(row)
	# Forged and off-by-one sources must not create a legitimate check.
	studied["molar:interview:0"] = true
	studied["molar:invented"] = true
	studied["molars:interview"] = true
	studied["perio:clinic"] = "true"
	if not bool(app.call("_save_progress")):
		_fail("Cannot seed independent CI saved progress")
		return
	app.call("_load_progress")
	for ci in range(CASE_IDS.size()):
		app.call("_select_case", ci)
		for si in range(STATIONS.size()):
			app.call("_select_station", si)
			if not _check_nav(app,ci,si,expected[ci]):
				return
			checked += 1
			app.call("_refresh")
			if not _check_nav(app,ci,si,expected[ci]):
				return
			var before: String = FileAccess.get_file_as_string(JOURNAL)
			app.call("_sync_navigation_selection") # the NEW read-only function
			if FileAccess.get_file_as_string(JOURNAL) != before:
				_fail("Read-only source completion marker wrote journal bytes")
				return
	# Real learner button: marking one formerly incomplete station updates
	# only that station in the present source case and survives disk reload.
	app.call("_select_case",0)
	app.call("_select_station",0)
	if not _check_nav(app,0,0,expected[0]):
		return
	var mark: Button = null
	for child in (app.get("_page") as VBoxContainer).get_children():
		if child is Button and (child as Button).text.contains("Mark this case/station studied"):
			mark = child
			break
	if mark == null:
		_fail("Original learner Mark studied button unavailable")
		return
	mark.pressed.emit()
	expected[0][0] = true
	if not _check_nav(app,0,0,expected[0]):
		return
	app.call("_load_progress")
	app.call("_refresh")
	if not _check_nav(app,0,0,expected[0]):
		return
	var restored: Dictionary = app.get("_progress")
	if (restored["studied"] as Dictionary).get("molar:interview",null) != true:
		_fail("Actual source station mark did not persist")
		return
	if (restored["studied"] as Dictionary).get("perio:clinic",null) != "true":
		_fail("Malformed unrelated progress was normalized or overwritten")
		return
	if str((restored["notes"] as Dictionary).get("archive:unrelated","")) != "Preexisting fictional note":
		_fail("Original unrelated note modified")
		return
	if str(((restored["fspKpByTask"] as Dictionary).get("perio|brief",{}) as Dictionary).get("text","")) != "Prior FSP session":
		_fail("Original unrelated FSP record modified")
		return
	var answer: Dictionary = (restored["answers"] as Dictionary).get("molar:interview:0",{})
	if answer.get("correct",null) != true or int(answer.get("selected",-1)) != 1 or int(answer.get("sourceQuestion",-1)) != 0:
		_fail("Source quiz answer damaged")
		return
	app.call("_select_case",5)
	if not _check_nav(app,5,0,expected[5]):
		_fail("Completed different case bleeds across source FDI")
		return
	var stable: String = FileAccess.get_file_as_string(JOURNAL)
	app.call("_sync_navigation_selection")
	if FileAccess.get_file_as_string(JOURNAL) != stable:
		_fail("Final navigation status rendering writes journal bytes")
		return
	if checked != 42:
		_fail("Six cases x seven stations not fully exercised")
		return
	print("SR85_SIX_CASE_SEVEN_STATION_COMPLETION_NAV_PASS views=42, source_scoped_status_markers, malformed_and_prefix_records_ignored, active_station_preserved, real_mark_button, case_isolation, disk_reload, read_only_journal_byte_identity, notes_answers_FSP_preserved; HEADLESS_ONLY")
	quit(0)
