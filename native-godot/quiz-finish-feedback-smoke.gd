extends SceneTree
## SR79: original browser finish() immediately refreshes completed station UI.
## Real native headless 4.7.2: 4 source quiz stations x 6 FDI cases.
## Genuine wrong/right quiz button signals and Finish; disk reload + journal.
const CASE_IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const STATIONS := ["interview","handover","viva","clinic"]
const STATION_NUMBERS := [0,2,5,6]
const JOURNAL := "user://kliniklab-native-progress-v2.json"

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR79_QUIZ_FINISH_IMMEDIATE_FEEDBACK_FAILED: "+reason)
	quit(1)

func _button(app: Node3D, name: String) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null(name) as Button

func _completion_visible(app: Node3D) -> bool:
	var page: VBoxContainer = app.get("_page")
	for child in page.get_children():
		if child is Label and (child as Label).text.contains("Station previously completed"):
			return true
	return false

func _run() -> void:
	root.size = Vector2i(1500, 820)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Pinned native scene unavailable")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # own disposable CI profile only
	var original_source: Dictionary = app.get("_content")
	var progress: Dictionary = app.get("_progress")
	(progress["notes"] as Dictionary)["sr79_fixture"] = "Keep unrelated learner notes"
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {"text":"Preserve unrelated FSP note", "result":{}}
	var count := 0
	for case_i in range(CASE_IDS.size()):
		app.call("_switch_view", "clinic")
		app.call("_select_case", case_i)
		if str(((app.get("_cases") as Array)[case_i]).get("fdi","")) != FDIS[case_i]:
			_fail("Six source FDI inventory drift")
			return
		for station_i in range(STATIONS.size()):
			var station: String = STATIONS[station_i]
			app.call("_select_station", STATION_NUMBERS[station_i])
			var questions: Array = original_source["quiz"][station]
			var final_index: int = questions.size()-1
			if final_index < 4:
				_fail("Original source quiz shortened "+station)
				return
			app.set("_quiz_index",final_index)
			app.set("_quiz_revealed",false)
			app.call("_refresh")
			var key: String = CASE_IDS[case_i]+":"+station+":"+str(final_index)
			var study_key: String = CASE_IDS[case_i]+":"+station
			var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
			var studied: Dictionary = (app.get("_progress") as Dictionary)["studied"]
			if answers.has(key) or studied.has(study_key) or _completion_visible(app):
				_fail("New original station prematurely finished "+study_key)
				return
			var reveal: Button = _button(app,"KL_QUIZ_REVEAL_CHOICES")
			if reveal == null:
				_fail("Original native active-recall reveal unavailable "+study_key)
				return
			reveal.pressed.emit()
			var correct: int = int((questions[final_index] as Dictionary)["correct"])
			var wrong: int = (correct+1)%3
			var b_wrong: Button = _button(app,"KL_QUIZ_OPTION_"+str(wrong))
			var b_right: Button = _button(app,"KL_QUIZ_OPTION_"+str(correct))
			var finish: Button = _button(app,"KL_QUIZ_NEXT")
			if b_wrong == null or b_right == null or finish == null or not finish.disabled:
				_fail("New quiz has incorrect finish/answer controls "+study_key)
				return
			b_wrong.pressed.emit()
			if not finish.disabled or bool((answers.get(key,{}) as Dictionary).get("correct",true)):
				_fail("Wrong original source answer falsely unlocked finish "+study_key)
				return
			b_right.pressed.emit()
			if finish.disabled or not bool((answers.get(key,{}) as Dictionary).get("correct",false)):
				_fail("Correct original source answer failed to unlock finish "+study_key)
				return
			var source_answer: String = JSON.stringify(answers[key])
			var old_question: int = int(app.get("_quiz_index"))
			if _completion_visible(app):
				_fail("Correct response alone falsely completed station "+study_key)
				return
			finish.pressed.emit() # real learner-visible source Finish signal
			if not bool(studied.get(study_key,false)) or int(app.get("_quiz_index")) != old_question:
				_fail("Finish did not persist exact station identity "+study_key)
				return
			var finished_button: Button = _button(app,"KL_QUIZ_NEXT")
			if finished_button == null or not finished_button.disabled or not finished_button.text.contains("Station completed") or not _completion_visible(app):
				_fail("Finish did not immediately show completed station UI "+study_key)
				return
			if JSON.stringify(answers[key]) != source_answer:
				_fail("Finish mutated original scored answer "+study_key)
				return
			var disk: Variant = JSON.parse_string(FileAccess.get_file_as_string(JOURNAL))
			if not (disk is Dictionary):
				_fail("Source-versioned learner journal not readable "+study_key)
				return
			var disk_answers: Dictionary = disk["answers"]
			var disk_studied: Dictionary = disk["studied"]
			if JSON.stringify(disk_answers.get(key,{})) != source_answer or disk_studied.get(study_key,null) != true:
				_fail("Finish not persisted without changing source answer "+study_key)
				return
			app.call("_load_progress")
			app.call("_refresh")
			finished_button = _button(app,"KL_QUIZ_NEXT")
			if finished_button == null or not finished_button.disabled or not _completion_visible(app):
				_fail("Completion lost on actual disk reload "+study_key)
				return
			finished_button.pressed.emit() # direct signal cannot alter saved result
			if JSON.stringify(((app.get("_progress") as Dictionary)["answers"] as Dictionary).get(key,{})) != source_answer:
				_fail("Repeated finished signal altered source answer "+study_key)
				return
			count += 1
	if count != 24 or str((((app.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary)["endo|anamnese"] as Dictionary).get("text","")) != "Preserve unrelated FSP note":
		_fail("Missing source case-station coverage or unrelated FSP state lost")
		return
	print("SR79_SIX_FDI_FOUR_QUIZ_STATION_IMMEDIATE_FINISH_RELOAD_PASS source_stations=24 wrong/correct/finish/direct_button/status/disk_reload/answer_integrity/FSP_preserved; HEADLESS NOT PIXELS")
	quit(0)
