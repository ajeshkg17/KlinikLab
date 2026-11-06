extends SceneTree
## SR83 actual Godot 4.7.2 native original-case bilingual glossary parity.
## Real six FDI cases x seven station page/control transitions, source exact
## exported CASES.vocab pairs and immutable learner answer/note records.
const CASE_IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const STATION_IDS := ["interview","letter","handover","written","practical","viva","clinic"]
const PROGRESS := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR83_SOURCE_CASE_VOCAB_FAILED: " + reason)
	quit(1)

func _assert_glossary(app: Node3D, case_index: int, station_index: int) -> bool:
	var page: VBoxContainer = app.get("_page") as VBoxContainer
	var source_case: Dictionary = (app.get("_cases") as Array)[case_index]
	if str(source_case.get("id", "")) != CASE_IDS[case_index] or str(source_case.get("fdi","")) != FDIS[case_index]:
		_fail("Original source identity mismatch " + str(case_index))
		return false
	if int(app.get("_case_index")) != case_index or int(app.get("_station_index")) != station_index:
		_fail("Case or station cursor drift while studying vocabulary")
		return false
	var header: Label = page.get_node_or_null("KL_CASE_VOCAB_HEADING") as Label
	if header == null or not header.text.contains("FDI " + FDIS[case_index]):
		_fail("Current FDI source vocabulary header missing " + str(case_index))
		return false
	var pairs: Variant = source_case.get("vocab", null)
	if not (pairs is Array) or (pairs as Array).size() < 4 or (pairs as Array).size() > 12:
		_fail("Pinned source bilingual pairs missing or corrupted " + CASE_IDS[case_index])
		return false
	var seen: Dictionary = {}
	for i in range((pairs as Array).size()):
		var p: Variant = pairs[i]
		if not (p is Array) or (p as Array).size() != 2:
			_fail("Source pair shape mismatch case " + str(case_index))
			return false
		var original: String = str(p[0])
		var translation: String = str(p[1])
		if original.strip_edges().is_empty() or translation.strip_edges().is_empty() or seen.has(original):
			_fail("Malformed or duplicated original German term " + original)
			return false
		seen[original] = true
		var label: Label = page.get_node_or_null("KL_CASE_VOCAB_" + str(i)) as Label
		if label == null or label.text != original + " — " + translation:
			_fail("Displayed source term/English translation mismatch " + CASE_IDS[case_index] + ":" + str(i))
			return false
	if page.get_node_or_null("KL_CASE_VOCAB_" + str((pairs as Array).size())) != null:
		_fail("Native glossary invented an additional non-source pair")
		return false
	return true

func _run() -> void:
	root.size = Vector2i(1500,850)
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Actual source-pinned native app.tscn unavailable")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # disposable CI-only profile
	var progress: Dictionary = app.get("_progress")
	(progress["notes"] as Dictionary)["archive:unrelated"] = "Existing fictional note must survive source glossary"
	(progress["answers"] as Dictionary)["molar:interview:0"] = {"selected":1,"correct":true,"sourceQuestion":0}
	(progress["studied"] as Dictionary)["perio:clinic"] = true
	(progress["fspKpByTask"] as Dictionary)["endo|brief"] = {"text":"Unrelated existing learning text"}
	if not bool(app.call("_save_progress")):
		_fail("Cannot seed independent CI learner progress")
		return
	app.call("_load_progress")
	var checked: int = 0
	var source_pairs_checked: int = 0
	for case_index in range(CASE_IDS.size()):
		app.call("_select_case", case_index)
		for station_index in range(STATION_IDS.size()):
			app.call("_select_station", station_index)
			if not _assert_glossary(app,case_index,station_index):
				return
			checked += 1
			source_pairs_checked += (((app.get("_cases") as Array)[case_index] as Dictionary)["vocab"] as Array).size()
			# Establish the ordinary UI draft state first: writing stations
			# may persist their own drafts on redraw, independently of glossary.
			app.call("_refresh")
			if not _assert_glossary(app,case_index,station_index):
				return
			var before: String = FileAccess.get_file_as_string(PROGRESS)
			app.call("_show_case_vocabulary",case_index)
			var after: String = FileAccess.get_file_as_string(PROGRESS)
			if after != before:
				_fail("Read-only original glossary wrote learner journal " + CASE_IDS[case_index] + ":" + STATION_IDS[station_index])
				return
	# Real native selection returns to original case and source terms.
	app.call("_select_case",0)
	app.call("_select_station",0)
	if not _assert_glossary(app,0,0):
		return
	app.call("_load_progress")
	app.call("_refresh")
	if not _assert_glossary(app,0,0):
		return
	var restored: Dictionary = app.get("_progress")
	if str((restored["notes"] as Dictionary).get("archive:unrelated","")) != "Existing fictional note must survive source glossary":
		_fail("Unrelated original learner note altered")
		return
	if (restored["studied"] as Dictionary).get("perio:clinic",null) != true:
		_fail("Preexisting unrelated completed station lost")
		return
	var quiz: Dictionary = (restored["answers"] as Dictionary).get("molar:interview:0",{})
	if quiz.get("correct",null) != true or int(quiz.get("selected",-1)) != 1 or int(quiz.get("sourceQuestion",-1)) != 0:
		_fail("Preexisting original source answer altered")
		return
	if str((((restored["fspKpByTask"] as Dictionary).get("endo|brief",{})) as Dictionary).get("text","")) != "Unrelated existing learning text":
		_fail("Preexisting FSP/KP note altered")
		return
	var stable: String = FileAccess.get_file_as_string(PROGRESS)
	app.call("_show_case_vocabulary",0)
	if FileAccess.get_file_as_string(PROGRESS) != stable:
		_fail("Source glossary changed journal bytes after actual disk reload")
		return
	if checked != 42 or source_pairs_checked < 168:
		_fail("Insufficient source case/station bilingual vocabulary coverage")
		return
	print("SR83_SIX_FDI_SEVEN_STATION_SOURCE_VOCABULARY_PASS case_station_views=42 source_exact_bilingual_pairs="+str(source_pairs_checked)+", original_case_navigation, read_only_journal_bytes, real_disk_reload, quiz_writing_FSP_and_completion_preserved, HEADLESS_ONLY")
	quit(0)
