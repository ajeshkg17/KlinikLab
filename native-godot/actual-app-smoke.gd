extends SceneTree
## Real main Godot scene integration and opt-in capture contract check.
## No workstation Vulkan/pixel claim from headless CI.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
func _initialize() -> void:
	call_deferred("_run")
func _fail(reason: String) -> void:
	push_error("SR14_ACTUAL_MAIN_APP_SCENE_FAILED: " + reason)
	quit(1)
func _run() -> void:
	var capture_script: GDScript = load("res://owner-pc-capture.gd")
	if capture_script==null:
		_fail("Expected actual Windows capture code absent")
		return
	var capture: Node = capture_script.new()
	if (not bool(capture.call("accepted_id","pc-kliniklab-native-cc0-20261101-job09-1234")) or
		bool(capture.call("accepted_id","pc-kliniklab-native-cc0-../../../")) or
		bool(capture.call("accepted_id","pc-kliniklab-native-cc0-old"))):
		_fail("Unique immutable PC capture path validator ineffective")
		return
	capture.free()
	var scene: PackedScene = load("res://app.tscn")
	if scene==null:
		_fail("Native app scene missing")
		return
	var app: Node3D = scene.instantiate()
	if app==null:
		_fail("Real native app root cannot instantiate")
		return
	get_root().add_child(app)
	var clinic: Node3D = app.get("_cc0_clinic")
	var original: Node3D = app.get("_scene")
	var legacy: Node3D = app.get("_legacy_workspace")
	if clinic==null or original==null or legacy==null or not clinic.is_inside_tree():
		_fail("Actual app._ready never mounted imported CC0 original scene")
		return
	if not clinic.visible or legacy.visible:
		_fail("Real app's CC0 room visibility or duplicate schematic is wrong")
		return
	var summary: Dictionary = clinic.call("summary")
	if (not bool(summary.get("sourceOriginalGLBsHashVerified",false)) or
		not bool(summary.get("godotFloat32MeshesImported",false)) or
		int(summary.get("wholeMeshInstances",0))<20):
		_fail("Actual app did not load verified source/dequantized CC0 geometry")
		return
	if (original.get_node_or_null("KL_FDI16_BEFORE")==null or
		original.get_node_or_null("KL_FDI16_AFTER")==null):
		_fail("Immutable source FDI16 before/after removed")
		return
	var app_content: Dictionary = app.get("_content")
	var pathways: Dictionary = app.get("_pathways")
	for i in range(6):
		app.call("_select_case",i)
		app.call("_select_station",4)
		var volume: Node3D = app.get("_volume")
		if volume==null:
			_fail("Real native FDI editable cutter missing "+str(i))
			return
		var info: Dictionary = volume.call("summary")
		var case: Dictionary = (app_content["cases"] as Array)[i]
		if (str(info.get("fdi",""))!=FDIS[i] or str(info.get("caseId",""))!=IDS[i] or
			str(case.get("fdi",""))!=FDIS[i] or not pathways.has(IDS[i]) or
			(app_content["practical"][i] as Array).size()<5 or not clinic.visible):
			_fail("Real app CC0 scene regressed source case FDI/treatment "+str(i))
			return
		# Source-grounded anatomy reference is visible for every case, never actionable.
		var section_names := ["External morphology / model provenance", "Internal structures / clinical anatomy", "Source-supported facts / original practical", "Illustrative and synthetic educational content"]
		var section_texts: Array[String] = []
		var page: VBoxContainer = app.get("_page")
		for child in page.get_children():
			if child is Label:
				section_texts.append((child as Label).text)
		var panel_text := " ".join(section_texts)
		for heading in section_names:
			if not panel_text.contains(heading):
				_fail("Source anatomy panel missing "+heading+" in FDI "+FDIS[i])
				return
		if not panel_text.contains("Source case "+IDS[i]+" · FDI "+FDIS[i]) or not panel_text.contains("synthetic sampled geometry"):
			_fail("Source anatomy panel lost case identity or synthetic training distinction FDI "+FDIS[i])
			return
		if i in [2,4,5] and not panel_text.contains("NO CLEARED EXTERNAL SURFACE"):
			_fail("Anatomy panel implies licensed asset for blocked FDI "+FDIS[i])
			return
		if i == 0:
			var mirrored_ref: Node3D = app.get("_tooth16_mirror")
			if mirrored_ref == null:
				_fail("FDI16 mirrored educational reference was not mounted")
				return
			var mirror_info: Dictionary = mirrored_ref.call("summary")
			if not bool(mirror_info.get("assetLoaded",false)) or bool(mirror_info.get("fallbackVisible",true)) or not bool(mirror_info.get("mirroredFromContralateral",false)) or bool(mirror_info.get("anatomicalSideValidated",true)) or bool(mirror_info.get("exactSideSourceAvailable",true)) or str(mirror_info.get("sourceFdi","")) != "26" or str(mirror_info.get("fdi","")) != "16" or float(mirror_info.get("mirrorScaleX",0.0)) >= 0.0 or not mirrored_ref.visible:
				_fail("FDI16 mirror not loaded with source FDI26 and explicit nonvalidated disclosure")
				return
		elif app.get("_tooth16_mirror") != null and app.get("_tooth16_mirror").visible:
			_fail("FDI16 mirrored reference leaked into another practical")
			return
		if i == 3:
			var crown_ref: Node3D = app.get("_tooth26_reference")
			if crown_ref == null:
				_fail("FDI26 crown practical never mounted actual surface source")
				return
			var crown_info: Dictionary = crown_ref.call("summary")
			if not bool(crown_info.get("assetLoaded",false)) or bool(crown_info.get("fallbackVisible",true)) or int(crown_info.get("meshInstances",0)) < 1 or str(crown_info.get("fdi","")) != "26" or str(crown_info.get("caseId","")) != "crown" or str(crown_info.get("license","")) != "CC-BY-4.0" or not bool(crown_info.get("surfaceOnly",false)) or not crown_ref.visible:
				_fail("FDI26 real Dundee surface not loaded in crown practical with correct identity/limits")
				return
		elif app.get("_tooth26_reference") != null and app.get("_tooth26_reference").visible:
			_fail("FDI26 tooth surface leaked to another FDI practical")
			return
		if i == 1:
			var reference: Node3D = app.get("_tooth36_reference")
			if reference == null:
				_fail("FDI36 practical did not instantiate its separate source tooth reference")
				return
			var tooth_report: Dictionary = reference.call("summary")
			if not bool(tooth_report.get("assetLoaded",false)) or bool(tooth_report.get("fallbackVisible",true)) or int(tooth_report.get("meshInstances",0)) < 1 or str(tooth_report.get("fdi","")) != "36" or str(tooth_report.get("license","")) != "CC-BY-4.0" or not bool(tooth_report.get("surfaceOnly",false)):
				_fail("Actual source-verified Dundee FDI36 mesh did not load with correct identity/limits")
				return
			if not reference.visible:
				_fail("FDI36 reference not visible in its own practical station")
				return
		elif app.get("_tooth36_reference") != null and bool((app.get("_tooth36_reference").call("summary") as Dictionary).get("assetLoaded",false)) and app.get("_tooth36_reference").visible:
			_fail("FDI36 reference leaked into another FDI practical case")
			return
	var reference_script: GDScript = load("res://tooth36-reference.gd")
	var missing_reference: Node3D = reference_script.new()
	missing_reference.call("force_missing_fallback_for_test")
	var missing_summary: Dictionary = missing_reference.call("summary")
	if bool(missing_summary.get("assetLoaded",true)) or not bool(missing_summary.get("fallbackVisible",false)) or not missing_reference.has_node("KL_DUNDEE_FDI36_SURFACE_ASSET_MISSING_FALLBACK"):
		_fail("FDI36 missing-asset fallback was not clearly exposed")
		return
	var fallback_node: Node3D = missing_reference.get_node("KL_DUNDEE_FDI36_SURFACE_ASSET_MISSING_FALLBACK")
	if fallback_node.get_child_count() != 1 or not (fallback_node.get_child(0) is Label3D):
		_fail("FDI36 fallback lacks a visible text label")
		return
	missing_reference.free()
	var crown_script: GDScript = load("res://tooth26-reference.gd")
	if crown_script == null:
		_fail("FDI26 runtime source reference script is missing")
		return
	var missing_crown: Node3D = crown_script.new()
	missing_crown.call("force_missing_fallback_for_test")
	var crown_fallback: Dictionary = missing_crown.call("summary")
	if bool(crown_fallback.get("assetLoaded",true)) or not bool(crown_fallback.get("fallbackVisible",false)) or not missing_crown.has_node("KL_DUNDEE_FDI26_SURFACE_ASSET_MISSING_FALLBACK"):
		_fail("FDI26 missing-asset fallback not clearly exposed")
		return
	var fallback_label: Node3D = missing_crown.get_node("KL_DUNDEE_FDI26_SURFACE_ASSET_MISSING_FALLBACK")
	if fallback_label.get_child_count() != 1 or not (fallback_label.get_child(0) is Label3D):
		_fail("FDI26 fallback lacks labelled asset absence")
		return
	missing_crown.free()
	var mirror_script: GDScript = load("res://tooth16-mirror-reference.gd")
	if mirror_script == null:
		_fail("Missing FDI16 mirror script")
		return
	var missing_mirror: Node3D = mirror_script.new()
	missing_mirror.call("force_missing_fallback_for_test")
	var fallback_info: Dictionary = missing_mirror.call("summary")
	if bool(fallback_info.get("assetLoaded",true)) or not bool(fallback_info.get("fallbackVisible",false)) or not missing_mirror.has_node("KL_FDI16_MIRRORED_SURFACE_ASSET_MISSING_FALLBACK"):
		_fail("FDI16 mirror missing-asset fallback not exposed")
		return
	var missing_label: Node3D = missing_mirror.get_node("KL_FDI16_MIRRORED_SURFACE_ASSET_MISSING_FALLBACK")
	if missing_label.get_child_count()!=1 or not (missing_label.get_child(0) is Label3D):
		_fail("FDI16 fallback has no clear Label3D")
		return
	missing_mirror.free()
	var clearance_script: GDScript = load("res://fdi-reference-clearance.gd")
	if clearance_script == null:
		_fail("FDI source clearance registry not bundled in native app")
		return
	var clearance_cases := {"16":"molar","11":"anterior","48":"surgery","46":"perio"}
	for case_fdi in clearance_cases:
		var status: Dictionary = clearance_script.call("status_for",case_fdi)
		var disclosure: String = str(clearance_script.call("disclosure",case_fdi))
		if str(status.get("caseId","")) != str(clearance_cases[case_fdi]) or not str(status.get("status","")).contains("license") and str(status.get("status","")) != "not-cleared" or not disclosure.contains("CC BY-NC-SA") or not disclosure.contains("No candidate mesh is bundled") or not disclosure.contains("NOT clinically validated"):
			_fail("FDI candidate status failed closed for "+str(case_fdi))
			return
	for index in [0,2,4,5]:
		app.call("_select_case",index)
		app.call("_select_station",4)
		var headings: Array[String] = []
		var page: VBoxContainer = app.get("_page")
		for child in page.get_children():
			if child is Label:
				headings.append((child as Label).text)
		if not " ".join(headings).contains("MODEL STATUS: UNAVAILABLE / LICENCE REVIEW BLOCKED") or not " ".join(headings).contains("FDI %s exact-side candidate" % str(FDIS[index])):
			_fail("Native practical lacks visible FDI source-clearance disclosure "+str(FDIS[index]))
			return
	print("SR44_ANATOMY_REFERENCE_FOUR_SECTIONS_SIX_FDI_PASS headless only; no GPU or clinical validation")
	print("SR43_FDI_REFERENCE_CLEARANCE_DISCLOSURE_PASS FDI16 exact-side NC-SA candidate and FDI11/48/46 NC-SA candidates disclosed; no unapproved GLB imported")
	# SR45: The browser's four-section FSP Arztbrief survives switching cases/stations.
	for case_i in range(6):
		app.call("_select_case",case_i)
		app.call("_select_station",1) # Arztbrief
		var letter_fields: Dictionary = app.get("_letter_fields")
		if letter_fields.size() != 4:
			_fail("SR45 four-section FSP letter missing for case "+str(case_i))
			return
		for field_name in ["anamnese","befund","diagnose","therapie"]:
			var field: TextEdit = letter_fields.get(field_name)
			if field == null:
				_fail("SR45 missing letter editor "+field_name)
				return
			field.text = "SR45 "+str(case_i)+" "+field_name
		app.call("_select_station",3) # written plan, must not overwrite FSP letter
		app.call("_select_case",(case_i+1)%6)
		app.call("_select_case",case_i)
		app.call("_select_station",1)
		var restored: Dictionary = app.get("_letter_fields")
		for field_name in ["anamnese","befund","diagnose","therapie"]:
			if str((restored[field_name] as TextEdit).text) != "SR45 "+str(case_i)+" "+field_name:
				_fail("SR45 letter section lost on case/station navigation "+str(case_i)+"/"+field_name)
				return
		var notes: Dictionary = (app.get("_progress") as Dictionary).get("notes",{})
		if not str(notes.get(IDS[case_i]+":letter","")).contains("Therapie / weiteres Vorgehen"):
			_fail("SR45 report-compatible letter text not preserved")
			return
	# Old one-field notes must remain available rather than silently disappearing.
	app.call("_select_case",0)
	app.call("_select_station",3)
	var progress: Dictionary = app.get("_progress")
	(progress["letterSectionsByCase"] as Dictionary).erase("molar")
	(progress["notes"] as Dictionary)["molar:letter"] = "Existing legacy Arztbrief draft"
	app.call("_select_station",1)
	if not str(((app.get("_letter_fields") as Dictionary)["anamnese"] as TextEdit).text).contains("Existing legacy Arztbrief draft"):
		_fail("SR45 legacy single-field draft was lost")
		return
	app.call("_reset_progress")
	if not (app.get("_progress") as Dictionary).get("letterSectionsByCase",{}).is_empty():
		_fail("SR45 reset left old letter sections")
		return
	# SR46: KP written planning matches browser four-field structure for every case.
	for case_i in range(6):
		app.call("_select_case",case_i)
		app.call("_select_station",3)
		var plan_fields: Dictionary = app.get("_plan_fields")
		if plan_fields.size() != 4:
			_fail("SR46 KP four-section plan not created for FDI "+FDIS[case_i])
			return
		for field_id in ["diagnosis","planA","planB","followup"]:
			var field: TextEdit = plan_fields.get(field_id)
			if field == null:
				_fail("SR46 KP plan editor missing "+field_id)
				return
			field.text = "SR46 "+str(case_i)+" "+field_id
		app.call("_select_station",1)
		app.call("_select_case",(case_i+1)%6)
		app.call("_select_case",case_i)
		app.call("_select_station",3)
		var restored: Dictionary = app.get("_plan_fields")
		for field_id in ["diagnosis","planA","planB","followup"]:
			if str((restored[field_id] as TextEdit).text) != "SR46 "+str(case_i)+" "+field_id:
				_fail("SR46 KP plan section lost on navigation "+FDIS[case_i]+"/"+field_id)
				return
		if not str(((app.get("_progress") as Dictionary)["notes"] as Dictionary).get(IDS[case_i]+":written","")).contains("Aufklärung, Einwilligung, Nachsorge"):
			_fail("SR46 KP note report is missing headed section "+FDIS[case_i])
			return
	app.call("_select_station",1)
	var saved_progress: Dictionary = app.get("_progress")
	(saved_progress["planSectionsByCase"] as Dictionary).erase("molar")
	(saved_progress["notes"] as Dictionary)["molar:written"] = "Existing KP single-field note"
	app.call("_select_case",0)
	app.call("_select_station",3)
	if not str(((app.get("_plan_fields") as Dictionary)["diagnosis"] as TextEdit).text).contains("Existing KP single-field note"):
		_fail("SR46 existing one-field KP note not carried into diagnosis")
		return
	app.call("_reset_progress")
	if not (app.get("_progress") as Dictionary).get("planSectionsByCase",{}).is_empty():
		_fail("SR46 reset retained KP plan drafts")
		return
	# SR47: four question stations require learner-led reveal rather than immediate options.
	for case_i in range(6):
		for station_i in [0,2,5,6]:
			app.call("_select_case",case_i)
			app.call("_select_station",station_i)
			var recall: TextEdit = app.get("_quiz_recall_edit")
			if recall == null or recall.name != "KL_QUIZ_ACTIVE_RECALL":
				_fail("SR47 recall editor missing "+FDIS[case_i]+"/"+str(station_i))
				return
			var page: VBoxContainer = app.get("_page")
			if page.get_node_or_null("KL_QUIZ_REVEAL_CHOICES") == null or page.get_node_or_null("KL_QUIZ_OPTION_0") != null:
				_fail("SR47 unrevealed options exposed "+FDIS[case_i]+"/"+str(station_i))
				return
			recall.text = "Formative eigene Antwort "+FDIS[case_i]+"/"+str(station_i)
			app.call("_reveal_quiz_options")
			page = app.get("_page")
			if page.get_node_or_null("KL_QUIZ_OPTION_0") == null or page.get_node_or_null("KL_QUIZ_REVEAL_CHOICES") != null:
				_fail("SR47 reveal did not expose source choices "+FDIS[case_i]+"/"+str(station_i))
				return
			var key: String = IDS[case_i]+":"+str(["interview","letter","handover","written","practical","viva","clinic"][station_i])+":0"
			if not str(((app.get("_progress") as Dictionary)["quizRecall"] as Dictionary).get(key,"")).contains("Formative eigene Antwort"):
				_fail("SR47 recall note not persisted before reveal "+key)
				return
			app.call("_next_question")
			page = app.get("_page")
			if page.get_node_or_null("KL_QUIZ_OPTION_0") != null or page.get_node_or_null("KL_QUIZ_REVEAL_CHOICES") == null:
				_fail("SR47 next question must hide options again "+key)
				return
			app.call("_select_station",3)
			app.call("_select_station",station_i)
			if str((app.get("_quiz_recall_edit") as TextEdit).text) != "Formative eigene Antwort "+FDIS[case_i]+"/"+str(station_i):
				# A new visit starts on question 0 and restores the case/station note.
				_fail("SR47 recall text did not restore per case/station "+key)
				return
	app.call("_reset_progress")
	if not ((app.get("_progress") as Dictionary)["quizRecall"] as Dictionary).is_empty():
		_fail("SR47 reset retained active recall notes")
		return
	# SR49: writing source answers must not precede free-form drafts.
	for case_i in range(6):
		app.call("_select_case",case_i)
		for station_i in [1,3]:
			app.call("_select_station",station_i)
			var page: VBoxContainer = app.get("_page")
			var source_reference: VBoxContainer = page.get_node_or_null("KL_WRITING_SOURCE_REFERENCE") as VBoxContainer
			if source_reference == null or source_reference.visible or page.get_node_or_null("KL_WRITING_REVEAL_SOURCE") == null:
				_fail("SR49 hidden source-reference gate absent " + FDIS[case_i] + "/" + str(station_i))
				return
			var fields: Dictionary = app.get("_letter_fields") if station_i == 1 else app.get("_plan_fields")
			var first: TextEdit = fields["anamnese"] if station_i == 1 else fields["diagnosis"]
			if first == null or first.custom_minimum_size.x > 0.1 or first.wrap_mode != TextEdit.LINE_WRAPPING_BOUNDARY:
				_fail("SR49 writing editor still fixed width or nonwrapping " + FDIS[case_i])
				return
			if page.get_children().find(first) < 0 or page.get_children().find(source_reference) <= page.get_children().find(first):
				_fail("SR49 source answers leaked ahead of editor " + FDIS[case_i])
				return
			if not bool(app.call("_writing_focus_active")) or (app.get("_middle") as Control).visible:
				_fail("SR49 text-first writing focus inactive " + FDIS[case_i])
				return
			app.call("_toggle_writing_reference")
			if not source_reference.visible:
				_fail("SR49 reference cannot be explicitly revealed " + FDIS[case_i])
				return
			app.call("_toggle_writing_reference")
			if source_reference.visible:
				_fail("SR49 reference cannot be concealed " + FDIS[case_i])
				return
			var example: String = "Independent own draft " + FDIS[case_i] + "/" + str(station_i)
			first.text = example
			app.call("_save_draft")
			app.call("_select_station",4)
			if not (app.get("_middle") as Control).visible:
				_fail("SR49 practical scene not restored after writing " + FDIS[case_i])
				return
			app.call("_select_station",station_i)
			var restored: Dictionary = app.get("_letter_fields") if station_i == 1 else app.get("_plan_fields")
			var field: TextEdit = restored["anamnese"] if station_i == 1 else restored["diagnosis"]
			if field.text != example or (app.get("_writing_reference_panel") as VBoxContainer).visible:
				_fail("SR49 draft lost or revealed reference persisted " + FDIS[case_i])
				return
	app.call("_reset_progress")
	if not ((app.get("_progress") as Dictionary)["letterSectionsByCase"] as Dictionary).is_empty() or not ((app.get("_progress") as Dictionary)["planSectionsByCase"] as Dictionary).is_empty():
		_fail("SR49 reviewed writing drafts survived reset")
		return
	print("SR49_FSP_KP_WRITING_FOCUS_SIX_CASES_PASS reveal gate, field order, compact width, persistence, practical restoration, reset; headless only")
	# SR48: source-aligned structure-only self-review, never a clinical or language grade.
	for case_i in range(6):
		app.call("_select_case", case_i)
		app.call("_select_station", 1) # FSP Arztbrief
		var page: VBoxContainer = app.get("_page")
		if page.get_node_or_null("KL_WRITING_STRUCTURE_REVIEW") == null or page.get_node_or_null("KL_WRITING_STRUCTURE_FEEDBACK") == null:
			_fail("SR48 FSP review controls absent " + FDIS[case_i])
			return
		var letter: Dictionary = app.get("_letter_fields")
		for id in ["anamnese", "befund", "diagnose"]:
			(letter[id] as TextEdit).text = "Meaningful fictional educational German draft for " + id + " and case " + IDS[case_i]
		app.call("_review_writing", "letter")
		var review: Label = app.get("_writing_review_label")
		if review == null or not review.text.contains("Draft coverage 3/4"):
			_fail("SR48 FSP incomplete-section coverage missing " + FDIS[case_i])
			return
		(letter["therapie"] as TextEdit).text = "Detailed fictional treatment proposal with follow-up; no definitive diagnosis."
		app.call("_review_writing", "letter")
		if not review.text.contains("Structure check passed (4/4 sections)") or not review.text.contains("Check that tooth " + FDIS[case_i]):
			_fail("SR48 FSP FDI reference caution missing " + FDIS[case_i])
			return
		(letter["therapie"] as TextEdit).text += " FDI " + FDIS[case_i]
		app.call("_review_writing", "letter")
		if not review.text.contains("FDI tooth reference present.") or not review.text.contains("NOT a formal FSP"):
			_fail("SR48 FSP FDI affirmation or assessment boundary missing " + FDIS[case_i])
			return
		app.call("_select_station", 3) # KP written plans
		page = app.get("_page")
		if page.get_node_or_null("KL_WRITING_STRUCTURE_REVIEW") == null or page.get_node_or_null("KL_WRITING_STRUCTURE_FEEDBACK") == null:
			_fail("SR48 KP review controls absent " + FDIS[case_i])
			return
		var kp: Dictionary = app.get("_plan_fields")
		for id in ["diagnosis", "planA", "planB"]:
			(kp[id] as TextEdit).text = "Detailed fictional educational KP plan with explanatory reasoning for " + id
		app.call("_review_writing", "written")
		review = app.get("_writing_review_label")
		if review == null or not review.text.contains("Written plan draft 3/4"):
			_fail("SR48 KP incomplete-section coverage missing " + FDIS[case_i])
			return
		(kp["followup"] as TextEdit).text = "Detailed fictional patient consent, discussion of risks and follow-up."
		(kp["planB"] as TextEdit).text = (kp["planA"] as TextEdit).text
		app.call("_review_writing", "written")
		if not review.text.contains("must describe two different alternatives"):
			_fail("SR48 KP duplicate-treatment warning missing " + FDIS[case_i])
			return
		(kp["planB"] as TextEdit).text = "Alternative option B: conservative approach and follow-up for this case."
		app.call("_review_writing", "written")
		if not review.text.contains("two distinct written plans") or not review.text.contains("NOT a formal KP"):
			_fail("SR48 KP structure completion or assessment boundary missing " + FDIS[case_i])
			return
		app.call("_select_station", 1)
		var saved_letter: Dictionary = app.get("_letter_fields")
		if not (saved_letter["therapie"] as TextEdit).text.contains("FDI " + FDIS[case_i]):
			_fail("SR48 review disrupted FSP draft persistence " + FDIS[case_i])
			return
		app.call("_select_station", 3)
		var saved_kp: Dictionary = app.get("_plan_fields")
		if not (saved_kp["planB"] as TextEdit).text.contains("Alternative option B"):
			_fail("SR48 review disrupted KP draft persistence " + FDIS[case_i])
			return
	app.call("_reset_progress")
	if not ((app.get("_progress") as Dictionary)["letterSectionsByCase"] as Dictionary).is_empty() or not ((app.get("_progress") as Dictionary)["planSectionsByCase"] as Dictionary).is_empty():
		_fail("SR48 reset kept reviewed writing drafts")
		return
	# SR50: compact FDI and station navigation must preserve six source mappings
	# and expose unmodified source titles in tooltips (not a GPU/pixel review).
	var case_buttons: Array = app.get("_nav_case_buttons")
	var station_buttons: Array = app.get("_nav_station_buttons")
	var source_cases: Array = app.get("_cases")
	var source_stations: Array = app.get("_stations")
	if case_buttons.size() != 6 or station_buttons.size() != 7:
		_fail("SR50 navigator lost six cases / seven stations")
		return
	var case_grid: GridContainer = app.get("_nav_case_grid")
	if case_grid == null or case_grid.columns != 2:
		_fail("SR50 FDI case grid not two columns")
		return
	for case_i in range(6):
		app.call("_select_case", case_i)
		for i in range(6):
			var button: Button = case_buttons[i] as Button
			if button == null or button.button_pressed != (i == case_i) or not button.tooltip_text.contains(str((source_cases[i] as Dictionary)["title"])):
				_fail("SR50 FDI selection/title mapping wrong at " + FDIS[case_i] + "/" + str(i))
				return
	for station_i in range(7):
		app.call("_select_station", station_i)
		for i in range(7):
			var button: Button = station_buttons[i] as Button
			if button == null or button.button_pressed != (i == station_i) or not button.tooltip_text.contains(str((source_stations[i] as Dictionary)["title"])):
				_fail("SR50 station selection/source title lost at " + str(station_i) + "/" + str(i))
				return
	print("SR50_FDI_NAV_SIX_CASE_SEVEN_STATION_PASS source tooltips, exclusive active state, two-column mapping; headless only")
	print("SR48_FSP_KP_WRITING_REVIEW_SIX_CASES_PASS incomplete/FDI/alternative/persistence/reset; structure-only and headless")
	print("SR47_FOUR_QUIZ_STATIONS_SIX_FDI_ACTIVE_RECALL_PASS choices gated, notes persisted, navigation/reset source exact; headless only")
	print("SR46_KP_FOUR_SECTION_PLAN_SIX_CASES_PASS draft restore, legacy migration, report and reset; headless only")
	print("SR45_FSP_FOUR_SECTION_LETTER_SIX_CASES_PASS source headings, per-case restore, legacy migration, report and reset; headless only")
	print("SR14_ACTUAL_NATIVE_APP_CC0_FDI_SIX_CASES_PASS all six exact-source cases, FDI36/FDI26 surface meshes and FDI16 explicitly mirrored illustrative reference with labelled fallbacks; headless only, no real pixels/GPU claimed")
	quit(0)
