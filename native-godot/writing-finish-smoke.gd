extends SceneTree
## SR80 actual Godot 4.7.2 browser-parity FSP Arztbrief / KP written finish.
## Each original case uses independent journal records in a disposable CI user://.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"
const LETTER := ["anamnese","befund","diagnose","therapie"]
const PLAN := ["diagnosis","planA","planB","followup"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR80_WRITING_STATION_FINISH_FAILED: "+reason)
	quit(1)

func _finish_button(app: Node3D) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null("KL_WRITING_FINISH") as Button

func _review_button(app: Node3D) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null("KL_WRITING_STRUCTURE_REVIEW") as Button

func _field(app: Node3D, station: String, id: String) -> TextEdit:
	var name: String = "KL_FSP_LETTER_" + id if station == "letter" else "KL_KP_PLAN_" + id
	return (app.get("_page") as VBoxContainer).get_node_or_null(name) as TextEdit

func _visible_completed(app: Node3D) -> bool:
	for child in (app.get("_page") as VBoxContainer).get_children():
		if child is Label and (child as Label).text.contains("Writing station previously completed"):
			return true
	return false

func _run() -> void:
	root.size = Vector2i(1500, 850)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Pinned source app scene unavailable")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	app.call("_reset_progress") # isolated runner-only profile
	var data: Dictionary = app.get("_progress")
	(data["notes"] as Dictionary)["keep"] = "Unrelated saved learner notes"
	(data["fspKpByTask"] as Dictionary)["perio|brief"] = {"text":"Unrelated FSP learner text"}
	var count: int = 0
	for i in range(IDS.size()):
		app.call("_switch_view","clinic")
		app.call("_select_case",i)
		if str(((app.get("_cases") as Array)[i]).get("fdi","")) != FDIS[i]:
			_fail("Original source FDI case drift")
			return
		for station in ["letter","written"]:
			var station_num: int = 1 if station == "letter" else 3
			app.call("_select_station",station_num)
			var key: String = IDS[i]+":"+station
			var fields: Array = LETTER if station == "letter" else PLAN
			var done: Dictionary = (app.get("_progress") as Dictionary)["studied"]
			var review: Button = _review_button(app)
			var finish: Button = _finish_button(app)
			if review == null or finish == null or done.get(key,false) or _visible_completed(app):
				_fail("Fresh writing station controls/finish state invalid "+key)
				return
			# Direct Finish without source structural review cannot complete.
			finish.pressed.emit()
			if done.get(key,false):
				_fail("Unreviewed source draft erroneously completed "+key)
				return
			var feedback: Label = app.get("_writing_review_label") as Label
			if feedback == null or not feedback.text.contains("0/4"):
				_fail("Insufficient draft does not show source coverage "+key)
				return
			for section in fields:
				var editor: TextEdit = _field(app,station,str(section))
				if editor == null:
					_fail("Four named source editors missing "+key+"/"+str(section))
					return
				editor.text = "Source-backed learner wording for "+str(section)+" and FDI "+FDIS[i]+" contains enough characters for structural review."
			if station == "written":
				_field(app,station,"planB").text = _field(app,station,"planA").text
				review.pressed.emit()
				finish.pressed.emit()
				if done.get(key,false) or not feedback.text.contains("two different alternatives"):
					_fail("Duplicate written plans incorrectly passed source structure "+key)
					return
				_field(app,station,"planB").text = "Alternative B: conservative choice, different risks and follow-up for FDI "+FDIS[i]+" patient."
			# Finish after editing but without a fresh successful review is not
			# allowed. Require learner's explicit source structure review.
			finish.pressed.emit()
			if done.get(key,false):
				_fail("Unreviewed edited source draft completed "+key)
				return
			review.pressed.emit()
			var success: bool = feedback.text.contains("Structure check passed") if station == "letter" else feedback.text.contains("Written submission includes")
			if not success:
				_fail("Original four-section writing source review failed "+key+": "+feedback.text)
				return
			# Change the reviewed draft into invalid text: stale success cannot
			# cause completion if the current original source check fails.
			var first: TextEdit = _field(app,station,str(fields[0]))
			var original: String = first.text
			first.text = "short"
			finish.pressed.emit()
			if done.get(key,false) or not feedback.text.contains("3/4"):
				_fail("Stale writing structure approval bypassed current draft "+key)
				return
			first.text = original
			review.pressed.emit()
			if not feedback.text.contains("Structure check passed") and not feedback.text.contains("Written submission includes"):
				_fail("Restored writing draft not accepted "+key)
				return
			finish.pressed.emit()
			if not bool(done.get(key,false)) or not _visible_completed(app):
				_fail("Real Finish did not show completed station "+key)
				return
			var saved: Variant = JSON.parse_string(FileAccess.get_file_as_string(JOURNAL))
			if not (saved is Dictionary) or (saved["studied"] as Dictionary).get(key,null) != true:
				_fail("Writing completion not source-scoped on disk "+key)
				return
			var section_key: String = "letterSectionsByCase" if station == "letter" else "planSectionsByCase"
			var original_sections: Dictionary = (saved[section_key] as Dictionary).get(IDS[i],{})
			for id in fields:
				var value: String = str(original_sections.get(id,""))
				if value.length() < 35 or not value.contains(FDIS[i]):
					_fail("Original source writing draft damaged "+key+"/"+str(id))
					return
			var expected_sections: String = JSON.stringify(original_sections)
			var sample_note: String = str((saved["notes"] as Dictionary).get("keep",""))
			if sample_note != "Unrelated saved learner notes":
				_fail("Unrelated saved note damaged "+key)
				return
			app.call("_load_progress")
			app.call("_refresh")
			if not _visible_completed(app):
				_fail("Saved writing completion lost on disk reload "+key)
				return
			var reloaded: Dictionary = (app.get("_progress") as Dictionary)
			var after: Dictionary = ((reloaded[section_key] as Dictionary).get(IDS[i],{}))
			if JSON.stringify(after) != expected_sections or not bool((reloaded["studied"] as Dictionary).get(key,false)):
				_fail("Writing source draft or completion mutated on reload "+key)
				return
			count += 1
	if count != 12 or str((((app.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary)["perio|brief"] as Dictionary).get("text","")) != "Unrelated FSP learner text":
		_fail("Original case coverage or unrelated FSP state lost")
		return
	print("SR80_SIX_FDI_FSP_KP_WRITING_FINISH_SOURCE_REVIEW_PASS stations=12; zero_coverage_block; duplicate_KP_block; current_draft_stale_review_block; explicit_review_finish; original_sections_disk_reload; unrelated_FSP_preserved; HEADLESS_ONLY")
	quit(0)
