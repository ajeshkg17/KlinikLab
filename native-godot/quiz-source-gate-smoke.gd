extends SceneTree
## SR72 source-bound quiz records: 4 original tracks x 6 FDI cases.
## Real native Godot Button signals and isolated user:// journal; HEADLESS.
const FDIS := ["16","36","11","26","48","46"]
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const TRACKS := ["interview","handover","viva","clinic"]
const STATIONS := [0,2,5,6]
func _initialize() -> void:
	call_deferred("_run")
func _fail(message: String) -> void:
	push_error("SR72_SOURCE_QUIZ_GATE_FAIL: "+message)
	quit(1)
func _option(app: Node3D, index: int) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null("KL_QUIZ_OPTION_"+str(index)) as Button
func _next(app: Node3D) -> Button:
	return app.get("_quiz_next_button") as Button
func _run() -> void:
	root.size = Vector2i(1536,816)
	var profile: String = OS.get_environment("XDG_DATA_HOME")
	if profile.is_empty() or not ProjectSettings.globalize_path("user://kliniklab-native-progress-v2.json").begins_with(profile):
		_fail("CI must supply unique SR72 XDG user:// profile")
		return
	var scene: PackedScene = load("res://app.tscn")
	if scene == null:
		_fail("Missing actual app scene")
		return
	var app: Node3D = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress")
	var progress: Dictionary = app.get("_progress")
	(progress["fspKpByTask"] as Dictionary)["endo|anamnese"] = {"text":"Unchanged SR72 FSP text", "result":{}}
	app.call("_save_progress")
	var content: Dictionary = app.get("_content")
	var checked := 0
	for case_i in range(6):
		app.call("_switch_view","clinic")
		app.call("_select_case",case_i)
		for track_i in range(4):
			var track: String = TRACKS[track_i]
			app.call("_select_station",STATIONS[track_i])
			var questions: Array = (content["quiz"] as Dictionary)[track]
			if questions.size()<2 or int(app.get("_quiz_index")) != 0:
				_fail("Missing original sequence "+FDIS[case_i]+"/"+track)
				return
			var q: Dictionary = questions[0]
			var correct: int = int(q["correct"])
			var wrong: int = (correct+1)%3
			var key: String = IDS[case_i]+":"+track+":0"
			var answers: Dictionary = (app.get("_progress") as Dictionary)["answers"]
			var studied: Dictionary = (app.get("_progress") as Dictionary)["studied"]
			if not _next(app).disabled or _option(app,0) != null:
				_fail("Unanswered source question not gated "+key)
				return
			# Deliberate forged/legacy journal values must never mark a source
			# question complete, even with correct=true in local JSON.
			for fake in [
				{"selected":wrong,"correct":true,"sourceQuestion":0},
				{"selected":correct,"correct":true,"sourceQuestion":1},
				{"selected":str(correct),"correct":true,"sourceQuestion":0},
				{"selected":float(correct)+0.5,"correct":true,"sourceQuestion":0},
				{"selected":9,"correct":true,"sourceQuestion":0},
				{"selected":correct,"correct":false,"sourceQuestion":0},
				{"selected":correct,"correct":true,"sourceQuestion":"0"}
			]:
				answers[key] = fake
				app.call("_refresh")
				var state: Dictionary = app.call("_quiz_source_answer",track,0)
				if bool(state["solved"]) or not _next(app).disabled or (app.get("_quiz_feedback_status") as Label).text.contains("Correct source response"):
					_fail("Forged answer accepted "+key+" "+JSON.stringify(fake))
					return
				app.call("_next_question")
				if int(app.get("_quiz_index")) != 0 or bool(studied.get(IDS[case_i]+":"+track,false)):
					_fail("Forged source record advanced/completed station "+key)
					return
				if not bool(state["answered"]):
					if (app.get("_page") as VBoxContainer).get_node_or_null("KL_QUIZ_REVEAL_CHOICES") == null:
						_fail("Malformed saved record bypassed active recall reveal "+key)
						return
					var frozen: String = JSON.stringify(fake)
					app.call("_answer",track,0,correct)
					if JSON.stringify(answers[key]) != frozen:
						_fail("Malformed unrevealed source record accepted direct answer "+key)
						return
			answers.erase(key)
			app.call("_refresh")
			(app.get("_quiz_recall_edit") as TextEdit).text = "Unchanged recall "+FDIS[case_i]+" "+track
			app.call("_reveal_quiz_options")
			var bad_button: Button = _option(app,wrong)
			var good_button: Button = _option(app,correct)
			if bad_button == null or good_button == null:
				_fail("Real source option Button missing "+key)
				return
			bad_button.pressed.emit()
			if not _next(app).disabled or not (app.get("_quiz_feedback_status") as Label).text.contains("Review suggested"):
				_fail("Real wrong source choice cannot be retried "+key)
				return
			good_button.pressed.emit()
			var stored: Dictionary = answers[key]
			if not bool(stored.get("correct",false)) or int(stored.get("selected",-1)) != correct or _next(app).disabled or not good_button.disabled:
				_fail("Real correct source answer failed "+key)
				return
			if track == "interview" and not (app.get("_answer_label") as Label).text.contains(str(((app.get("_cases") as Array)[case_i]["patientReply"] as Array)[0])):
				_fail("Source patient reply absent after correct interview "+key)
				return
			var disk: Variant = JSON.parse_string(FileAccess.get_file_as_string("user://kliniklab-native-progress-v2.json"))
			if not (disk is Dictionary) or not bool((disk["answers"] as Dictionary).get(key,{}).get("correct",false)):
				_fail("Actual source-versioned disk journal did not persist "+key)
				return
			app.call("_load_progress")
			app.call("_refresh")
			var restored: Dictionary = app.call("_quiz_source_answer",track,0)
			if _next(app).disabled or not bool(restored["solved"]):
				_fail("Correct answer lost after actual disk reload "+key)
				return
			var old_answer: String = JSON.stringify(((app.get("_progress") as Dictionary)["answers"] as Dictionary)[key])
			app.call("_answer",track,0,wrong)
			if JSON.stringify(((app.get("_progress") as Dictionary)["answers"] as Dictionary)[key]) != old_answer:
				_fail("Correct source answer overwritten after reload "+key)
				return
			_next(app).pressed.emit()
			if int(app.get("_quiz_index")) != 1 or bool(((app.get("_progress") as Dictionary)["studied"] as Dictionary).get(IDS[case_i]+":"+track,false)):
				_fail("Valid source quiz next advanced incorrectly "+key)
				return
			checked += 1
			if str(((app.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary)["endo|anamnese"]["text"]) != "Unchanged SR72 FSP text":
				_fail("Quiz testing altered independent FSP/KP practice "+key)
				return
	app.call("_reset_progress")
	print("SR72_SOURCE_QUIZ_COMPLETION_FOUR_TRACK_SIX_FDI_PASS tracks="+str(checked)+" real_buttons/forged_wrong_true/step_mismatch/reveal_guard/wrong_retry/correct_lock/json_reload/patient_reply/no_fsp_mutation; HEADLESS NOT PIXELS")
	quit(0)
