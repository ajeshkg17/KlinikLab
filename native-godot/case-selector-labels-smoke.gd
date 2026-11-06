extends SceneTree
## SR86 live Godot native six-case source title/subtitle selector parity.
## Headless control/identity/saved-data regression only; no pixel assertions.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(why: String) -> void:
	push_error("SR86_SOURCE_CASE_SELECTOR_FAILED: "+why)
	quit(1)

func _check_all(app: Node3D, active: int) -> bool:
	var cases: Array = app.get("_cases")
	var buttons: Array = app.get("_nav_case_buttons")
	if cases.size() != 6 or buttons.size() != 6:
		_fail("Source FDI case button inventory is not six")
		return false
	for i in range(6):
		var c: Dictionary = cases[i]
		var btn: Button = buttons[i] as Button
		if c.get("id",null) != IDS[i] or str(c.get("fdi","")) != FDIS[i] or btn == null:
			_fail("Original source case/FDI mismatch at "+str(i))
			return false
		var label: String = "FDI %s · %s" % [str(c["fdi"]),str(c["title"])]
		var tooltip: String = "FDI %s · %s · %s" % [str(c["fdi"]),str(c["title"]),str(c["subtitle"])]
		if btn.name != "KL_FDI_CASE_"+FDIS[i] or btn.text != label or btn.tooltip_text != tooltip:
			_fail("Browser-parity source title/subtitle not on native case button "+IDS[i])
			return false
		if btn.autowrap_mode != TextServer.AUTOWRAP_WORD_SMART or btn.custom_minimum_size.y < 60:
			_fail("Native case selector title not allowed multi-line presentation "+IDS[i])
			return false
		if btn.button_pressed != (i == active):
			_fail("Case identity selection toggle changed "+IDS[i])
			return false
	return true

func _run() -> void:
	root.size = Vector2i(1500,850)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Actual native Godot app.tscn missing")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # unique CI XDG user:// only
	var progress: Dictionary = app.get("_progress")
	(progress["notes"] as Dictionary)["archive:untouched"] = "Unrelated fictional training note"
	(progress["answers"] as Dictionary)["molar:interview:0"] = {"selected":1,"correct":true,"sourceQuestion":0}
	(progress["studied"] as Dictionary)["perio:clinic"] = true
	(progress["fspKpByTask"] as Dictionary)["endo|brief"] = {"text":"Unrelated FSP draft"}
	if not bool(app.call("_save_progress")):
		_fail("Unable to seed isolated original learner record")
		return
	app.call("_load_progress")
	app.call("_switch_view","clinic")
	app.call("_select_station",0)
	if not _check_all(app,0):
		return
	for i in range(6):
		var btn: Button = (app.get("_nav_case_buttons") as Array)[i] as Button
		btn.pressed.emit() # real native learner UI case selection callback
		if int(app.get("_case_index")) != i or int(app.get("_station_index")) != 0:
			_fail("Original source case navigation lost FDI/station "+IDS[i])
			return
		if not _check_all(app,i):
			return
		var before: String = FileAccess.get_file_as_string(JOURNAL)
		app.call("_sync_navigation_selection")
		if FileAccess.get_file_as_string(JOURNAL) != before:
			_fail("Read-only case label/selection refresh wrote learner data")
			return
		var disk: Variant = JSON.parse_string(before)
		if not (disk is Dictionary) or int((disk as Dictionary).get("selectedCase",-1)) != i:
			_fail("Case navigation did not preserve original selectedCase semantics")
			return
	# Reverse-source navigation also preserves selected source identity.
	for i in range(5,-1,-1):
		var btn: Button = (app.get("_nav_case_buttons") as Array)[i] as Button
		btn.pressed.emit()
		if not _check_all(app,i):
			return
	app.call("_load_progress")
	app.call("_refresh")
	if not _check_all(app,0):
		_fail("Source case labels changed after original learner journal reload")
		return
	var saved: Dictionary = app.get("_progress")
	if str((saved["notes"] as Dictionary).get("archive:untouched","")) != "Unrelated fictional training note":
		_fail("Original unrelated saved note altered")
		return
	if (saved["studied"] as Dictionary).get("perio:clinic",null) != true:
		_fail("Original unrelated completion changed")
		return
	var answer: Dictionary = (saved["answers"] as Dictionary).get("molar:interview:0",{})
	if answer.get("correct",null) != true or int(answer.get("selected",-1)) != 1 or int(answer.get("sourceQuestion",-1)) != 0:
		_fail("Original source answer mutated")
		return
	if str(((saved["fspKpByTask"] as Dictionary).get("endo|brief",{}) as Dictionary).get("text","")) != "Unrelated FSP draft":
		_fail("Original FSP text mutated")
		return
	var stable: String = FileAccess.get_file_as_string(JOURNAL)
	app.call("_sync_navigation_selection")
	if FileAccess.get_file_as_string(JOURNAL) != stable:
		_fail("Read-only source case nav changed exact journal bytes after reload")
		return
	print("SR86_SIX_CASE_SOURCE_TITLE_SUBTITLE_NAV_PASS cases=6, actual_button_signals=12, source_exact_FDI_title_subtitle, original_selectedCase_persisted, station_stable, selection_toggles, journal_read_only_byte_identity, disk_reload, notes_answers_studied_FSP_preserved; HEADLESS_ONLY")
	quit(0)
