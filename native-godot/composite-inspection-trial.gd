extends "res://procedure-lab-trial.gd"
## Replays shared bench choices and the existing, unmodified chair simulation.
## The composite lesson stays independently playable and inspectable.
const BENCH_CATALOG := preload("res://chairside-catalog.gd")

func _run() -> void:
	await _run_lesson("composite")

func _run_lesson(lesson_id: String) -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("Provide a trial folder with a fresh profile subdirectory.")
		quit(1)
		return
	_folder = args[0].replace("\\", "/").simplify_path().trim_suffix("/")
	var profile := _folder.path_join("profile").to_lower() + "/"
	var user_data := OS.get_user_data_dir().replace("\\", "/").simplify_path().to_lower() + "/"
	if not user_data.begins_with(profile) or OS.has_environment("KLINIKLAB_GITHUB_TOKEN"):
		push_error("Bench trial requires its own disposable user:// profile and no upload token.")
		quit(1)
		return
	if lesson_id not in ["composite", "matrix_forceps", "sealant", "fluoride", "cleaning", "root_planing", "chart", "furcation", "bitewing", "bitewing_holder", "oral_exam", "veneer", "inlay", "crown", "crown_paper_forceps", "bridge", "full_denture", "denture_wax_rim", "partial_denture", "implant", "endo", "endo_file", "retreat", "aligner", "mouthguard", "extraction"]:
		_finish("fail", "Unknown bench lesson.")
		return
	_mode = lesson_id + "_bench"
	_video = args.has("--video")
	root.size = Vector2i(1280, 720)
	_app = load("res://app.tscn").instantiate()
	root.add_child(_app)
	await process_frame
	_app.call("_switch_view", "journey")
	# Journey's normal entry may persist its source-derived draft; compare
	# learner-journal bytes only after that ordinary transition.
	var journal_existed := FileAccess.file_exists(JOURNAL)
	var journal := FileAccess.get_file_as_bytes(JOURNAL)
	var result := await _bench(lesson_id)
	if result.is_empty():
		_finish("fail", lesson_id + " bench failed choices, chair or case-specific finish.")
		return
	if journal_existed != FileAccess.file_exists(JOURNAL) or journal != FileAccess.get_file_as_bytes(JOURNAL):
		_finish("fail", lesson_id + " bench changed the learner journal.")
		return
	_runs.append(result)
	print("KLINIKLAB_%s_BENCH_PASS selection=2/2 chair=20/20 journal_unchanged=true" % lesson_id.to_upper())
	_finish("pass")

func _bench(lesson_id: String) -> Dictionary:
	var config: Dictionary = BENCH_CATALOG.COMPOSITE if lesson_id == "composite" else BENCH_CATALOG.SEALANT if lesson_id == "sealant" else BENCH_CATALOG.FLUORIDE if lesson_id == "fluoride" else BENCH_CATALOG.CLEANING if lesson_id == "cleaning" else BENCH_CATALOG.ROOT_PLANING if lesson_id == "root_planing" else BENCH_CATALOG.CHART if lesson_id == "chart" else BENCH_CATALOG.BITEWING if lesson_id == "bitewing" else BENCH_CATALOG.ORAL_EXAM if lesson_id == "oral_exam" else BENCH_CATALOG.VENEER if lesson_id == "veneer" else BENCH_CATALOG.INLAY if lesson_id == "inlay" else BENCH_CATALOG.CROWN if lesson_id == "crown" else BENCH_CATALOG.BRIDGE if lesson_id == "bridge" else BENCH_CATALOG.FULL_DENTURE if lesson_id == "full_denture" else BENCH_CATALOG.PARTIAL_DENTURE if lesson_id == "partial_denture" else BENCH_CATALOG.IMPLANT if lesson_id == "implant" else BENCH_CATALOG.ENDO if lesson_id == "endo" else BENCH_CATALOG.RETREAT if lesson_id == "retreat" else BENCH_CATALOG.ALIGNER if lesson_id == "aligner" else BENCH_CATALOG.MOUTHGUARD if lesson_id == "mouthguard" else BENCH_CATALOG.FURCATION if lesson_id == "furcation" else BENCH_CATALOG.BITEWING_HOLDER if lesson_id == "bitewing_holder" else BENCH_CATALOG.ENDO_FILE if lesson_id == "endo_file" else BENCH_CATALOG.DENTURE_VS_WAX_RIM if lesson_id == "denture_wax_rim" else BENCH_CATALOG.MATRIX_FORCEPS if lesson_id == "matrix_forceps" else BENCH_CATALOG.CROWN_PAPER_FORCEPS if lesson_id == "crown_paper_forceps" else BENCH_CATALOG.EXTRACTION
	var opener := "KL_OPEN_COMPOSITE_BENCH" if lesson_id == "composite" else "KL_OPEN_SEALANT_BENCH" if lesson_id == "sealant" else "KL_OPEN_FLUORIDE_BENCH" if lesson_id == "fluoride" else "KL_OPEN_CLEANING_BENCH" if lesson_id == "cleaning" else "KL_OPEN_ROOT_PLANING_BENCH" if lesson_id == "root_planing" else "KL_OPEN_CHART_BENCH" if lesson_id == "chart" else "KL_OPEN_BITEWING_BENCH" if lesson_id == "bitewing" else "KL_OPEN_ORAL_EXAM_BENCH" if lesson_id == "oral_exam" else "KL_OPEN_VENEER_BENCH" if lesson_id == "veneer" else "KL_OPEN_INLAY_BENCH" if lesson_id == "inlay" else "KL_OPEN_CROWN_BENCH" if lesson_id == "crown" else "KL_OPEN_BRIDGE_BENCH" if lesson_id == "bridge" else "KL_OPEN_FULL_DENTURE_BENCH" if lesson_id == "full_denture" else "KL_OPEN_PARTIAL_DENTURE_BENCH" if lesson_id == "partial_denture" else "KL_OPEN_IMPLANT_BENCH" if lesson_id == "implant" else "KL_OPEN_ENDO_BENCH" if lesson_id == "endo" else "KL_OPEN_RETREAT_BENCH" if lesson_id == "retreat" else "KL_OPEN_ALIGNER_BENCH" if lesson_id == "aligner" else "KL_OPEN_MOUTHGUARD_BENCH" if lesson_id == "mouthguard" else "KL_OPEN_FURCATION_BENCH" if lesson_id == "furcation" else "KL_OPEN_BITEWING_HOLDER_BENCH" if lesson_id == "bitewing_holder" else "KL_OPEN_ENDO_FILE_BENCH" if lesson_id == "endo_file" else "KL_OPEN_DENTURE_WAX_RIM_BENCH" if lesson_id == "denture_wax_rim" else "KL_OPEN_MATRIX_FORCEPS_BENCH" if lesson_id == "matrix_forceps" else "KL_OPEN_CROWN_PAPER_FORCEPS_BENCH" if lesson_id == "crown_paper_forceps" else "KL_OPEN_EXTRACTION_BENCH"
	if not await _click(_app, opener):
		return {}
	var bench: Control = _app.get("_chairside_bench")
	if not is_instance_valid(bench) or not bench.call("summary")["models_loaded"]:
		push_error("Bench or both study 3D models not loaded.")
		return {}
	if lesson_id == "crown_paper_forceps":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_articulating_paper_forceps_study") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_college_cotton_pliers_alternative"):
			return {}
	elif lesson_id == "matrix_forceps":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_sectional_matrix_placement_forceps") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_rubber_dam_clamp_forceps_alternative"):
			return {}
	elif lesson_id == "denture_wax_rim":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_complete_denture_arch") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_wax_occlusion_rim_study"):
			return {}
	elif lesson_id == "endo_file":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_hand_h_file_recognition") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_niti_rotary_file_alternative"):
			return {}
	elif lesson_id == "bitewing_holder":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_bitewing_receptor_holder_study") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_endo_receptor_holder_study"):
			return {}
	elif lesson_id == "furcation":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_nabers_furcation_study") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_unc15_furcation_distractor"):
			return {}
	elif lesson_id == "extraction":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_training_forceps_study") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_periodontal_probe"):
			return {}
	elif lesson_id == "mouthguard":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_sports_mouthguard_study") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_aligner_stage04_tray"):
			return {}
	elif lesson_id == "aligner":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_aligner_stage04_tray") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_complete_denture_arch"):
			return {}
	elif lesson_id == "retreat":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_record_comparison_pointer") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_canal_tracing_stylus"):
			return {}
	elif lesson_id == "endo":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_canal_tracing_stylus") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_image_pointer"):
			return {}
	elif lesson_id == "implant":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_implant_crown_study") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_crown_shell"):
			return {}
	elif lesson_id == "partial_denture":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_partial_denture_framework") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_complete_denture_arch"):
			return {}
	elif lesson_id == "full_denture":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_complete_denture_arch") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_bridge_framework"):
			return {}
	elif lesson_id == "bridge":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_bridge_framework") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_crown_shell"):
			return {}
	elif lesson_id == "crown":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_crown_shell") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_inlay_insert"):
			return {}
	elif lesson_id == "inlay":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_inlay_insert") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_veneer_shell"):
			return {}
	elif lesson_id == "veneer":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_veneer_shell") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_examination_mirror"):
			return {}
	elif lesson_id == "oral_exam":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_examination_mirror") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_periodontal_probe"):
			return {}
	elif lesson_id == "bitewing":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_image_pointer") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_periodontal_probe"):
			return {}
	elif lesson_id == "chart":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_periodontal_probe") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_ultrasonic_scaler"):
			return {}
	elif lesson_id == "root_planing":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_ultrasonic_scaler") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_polishing_cup"):
			return {}
	elif lesson_id == "cleaning":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_polishing_cup") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_ultrasonic_scaler"):
			return {}
	elif lesson_id == "fluoride":
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_varnish_brush") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_curing_light"):
			return {}
	else:
		if not await _click(bench, "KL_BENCH_ROTATE_LEFT_tool_curing_light") or not await _click(bench, "KL_BENCH_ROTATE_RIGHT_tool_ultrasonic_scaler"):
			return {}
	# Correct and incorrect choices remain distinct, source-stable IDs in all lessons.
	var wrong_tool := "tool.curing_light" if lesson_id == "fluoride" else "tool.polishing_cup" if lesson_id == "root_planing" else "tool.periodontal_probe" if lesson_id in ["bitewing", "oral_exam"] else "tool.examination_mirror" if lesson_id == "veneer" else "tool.veneer_shell" if lesson_id == "inlay" else "tool.inlay_insert" if lesson_id == "crown" else "tool.crown_shell" if lesson_id == "bridge" else "tool.bridge_framework" if lesson_id == "full_denture" else "tool.complete_denture_arch" if lesson_id == "partial_denture" else "tool.crown_shell" if lesson_id == "implant" else "tool.image_pointer" if lesson_id == "endo" else "tool.canal_tracing_stylus" if lesson_id == "retreat" else "tool.complete_denture_arch" if lesson_id == "aligner" else "tool.aligner_stage04_tray" if lesson_id == "mouthguard" else "tool.periodontal_probe" if lesson_id == "extraction" else "tool.ultrasonic_scaler"
	var wrong_material := "material.light_cure_sealant" if lesson_id == "fluoride" else "material.fluoride_varnish" if lesson_id == "cleaning" else "material.prophylaxis_paste" if lesson_id == "root_planing" else "material.shade_guide" if lesson_id == "chart" else "material.site_chart" if lesson_id in ["bitewing", "oral_exam", "veneer"] else "material.veneer_fit_reference" if lesson_id == "inlay" else "material.inlay_outline_reference" if lesson_id == "crown" else "material.crown_fit_reference" if lesson_id == "bridge" else "material.bridge_support_reference" if lesson_id == "full_denture" else "material.complete_denture_arch_reference" if lesson_id == "partial_denture" else "material.crown_fit_reference" if lesson_id == "implant" else "material.assigned_bitewing_image" if lesson_id == "endo" else "material.assigned_canal_diagram" if lesson_id == "retreat" else "material.complete_denture_arch_reference" if lesson_id == "aligner" else "material.assigned_aligner_stage04_plan" if lesson_id == "mouthguard" else "material.site_chart" if lesson_id == "extraction" else "material.glass_ionomer"
	if lesson_id == "furcation":
		wrong_tool = "tool.unc15_furcation_distractor"
		wrong_material = "material.site_chart"
	if lesson_id == "bitewing_holder":
		wrong_tool = "tool.endo_receptor_holder_study"
		wrong_material = "material.endodontic_apical_reference_key"
	if lesson_id == "endo_file":
		wrong_tool = "tool.niti_rotary_file_alternative"
		wrong_material = "material.rotary_file_reference_alternative"
	if lesson_id == "denture_wax_rim":
		wrong_tool = "tool.wax_occlusion_rim_study"
		wrong_material = "material.wax_rim_jaw_relation_key"
	if lesson_id == "matrix_forceps":
		wrong_tool = "tool.rubber_dam_clamp_forceps_alternative"
		wrong_material = "material.rubber_dam_clamp_reference"
	if lesson_id == "crown_paper_forceps":
		wrong_tool = "tool.college_cotton_pliers_alternative"
		wrong_material = "material.cotton_isolation_reference_alternative"
	if not await _click(bench, "KL_BENCH_PICK_tool_college_cotton_pliers_alternative" if lesson_id == "crown_paper_forceps" else "KL_BENCH_PICK_tool_rubber_dam_clamp_forceps_alternative" if lesson_id == "matrix_forceps" else "KL_BENCH_PICK_tool_wax_occlusion_rim_study" if lesson_id == "denture_wax_rim" else "KL_BENCH_PICK_tool_niti_rotary_file_alternative" if lesson_id == "endo_file" else "KL_BENCH_PICK_tool_endo_receptor_holder_study" if lesson_id == "bitewing_holder" else "KL_BENCH_PICK_tool_unc15_furcation_distractor" if lesson_id == "furcation" else "KL_BENCH_PICK_tool_periodontal_probe" if lesson_id == "extraction" else "KL_BENCH_PICK_tool_aligner_stage04_tray" if lesson_id == "mouthguard" else "KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "aligner" else "KL_BENCH_PICK_tool_canal_tracing_stylus" if lesson_id == "retreat" else "KL_BENCH_PICK_tool_image_pointer" if lesson_id == "endo" else "KL_BENCH_PICK_tool_crown_shell" if lesson_id == "implant" else "KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "partial_denture" else "KL_BENCH_PICK_tool_bridge_framework" if lesson_id == "full_denture" else "KL_BENCH_PICK_tool_crown_shell" if lesson_id == "bridge" else "KL_BENCH_PICK_tool_inlay_insert" if lesson_id == "crown" else "KL_BENCH_PICK_tool_veneer_shell" if lesson_id == "inlay" else "KL_BENCH_PICK_tool_examination_mirror" if lesson_id == "veneer" else "KL_BENCH_PICK_tool_periodontal_probe" if lesson_id in ["bitewing", "oral_exam"] else "KL_BENCH_PICK_tool_polishing_cup" if lesson_id == "root_planing" else "KL_BENCH_PICK_tool_curing_light" if lesson_id == "fluoride" else "KL_BENCH_PICK_tool_ultrasonic_scaler"):
		return {}
	if bench.call("summary")["selection_score"] != 0:
		return {}
	if not await _click(bench, "KL_BENCH_PICK_tool_articulating_paper_forceps_study" if lesson_id == "crown_paper_forceps" else "KL_BENCH_PICK_tool_sectional_matrix_placement_forceps" if lesson_id == "matrix_forceps" else "KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "denture_wax_rim" else "KL_BENCH_PICK_tool_hand_h_file_recognition" if lesson_id == "endo_file" else "KL_BENCH_PICK_tool_bitewing_receptor_holder_study" if lesson_id == "bitewing_holder" else "KL_BENCH_PICK_tool_nabers_furcation_study" if lesson_id == "furcation" else "KL_BENCH_PICK_tool_curing_light" if lesson_id in ["composite", "sealant"] else "KL_BENCH_PICK_tool_varnish_brush" if lesson_id == "fluoride" else "KL_BENCH_PICK_tool_polishing_cup" if lesson_id == "cleaning" else "KL_BENCH_PICK_tool_ultrasonic_scaler" if lesson_id == "root_planing" else "KL_BENCH_PICK_tool_periodontal_probe" if lesson_id == "chart" else "KL_BENCH_PICK_tool_image_pointer" if lesson_id == "bitewing" else "KL_BENCH_PICK_tool_examination_mirror" if lesson_id == "oral_exam" else "KL_BENCH_PICK_tool_veneer_shell" if lesson_id == "veneer" else "KL_BENCH_PICK_tool_inlay_insert" if lesson_id == "inlay" else "KL_BENCH_PICK_tool_crown_shell" if lesson_id == "crown" else "KL_BENCH_PICK_tool_bridge_framework" if lesson_id == "bridge" else "KL_BENCH_PICK_tool_complete_denture_arch" if lesson_id == "full_denture" else "KL_BENCH_PICK_tool_partial_denture_framework" if lesson_id == "partial_denture" else "KL_BENCH_PICK_tool_implant_crown_study" if lesson_id == "implant" else "KL_BENCH_PICK_tool_canal_tracing_stylus" if lesson_id == "endo" else "KL_BENCH_PICK_tool_record_comparison_pointer" if lesson_id == "retreat" else "KL_BENCH_PICK_tool_aligner_stage04_tray" if lesson_id == "aligner" else "KL_BENCH_PICK_tool_sports_mouthguard_study" if lesson_id == "mouthguard" else "KL_BENCH_PICK_tool_training_forceps_study"):
		return {}
	if not await _click(bench, "KL_BENCH_PICK_material_cotton_isolation_reference_alternative" if lesson_id == "crown_paper_forceps" else "KL_BENCH_PICK_material_rubber_dam_clamp_reference" if lesson_id == "matrix_forceps" else "KL_BENCH_PICK_material_wax_rim_jaw_relation_key" if lesson_id == "denture_wax_rim" else "KL_BENCH_PICK_material_rotary_file_reference_alternative" if lesson_id == "endo_file" else "KL_BENCH_PICK_material_endodontic_apical_reference_key" if lesson_id == "bitewing_holder" else "KL_BENCH_PICK_material_site_chart" if lesson_id == "extraction" else "KL_BENCH_PICK_material_assigned_aligner_stage04_plan" if lesson_id == "mouthguard" else "KL_BENCH_PICK_material_complete_denture_arch_reference" if lesson_id == "aligner" else "KL_BENCH_PICK_material_assigned_canal_diagram" if lesson_id == "retreat" else "KL_BENCH_PICK_material_assigned_bitewing_image" if lesson_id == "endo" else "KL_BENCH_PICK_material_crown_fit_reference" if lesson_id == "implant" else "KL_BENCH_PICK_material_complete_denture_arch_reference" if lesson_id == "partial_denture" else "KL_BENCH_PICK_material_bridge_support_reference" if lesson_id == "full_denture" else "KL_BENCH_PICK_material_crown_fit_reference" if lesson_id == "bridge" else "KL_BENCH_PICK_material_inlay_outline_reference" if lesson_id == "crown" else "KL_BENCH_PICK_material_veneer_fit_reference" if lesson_id == "inlay" else "KL_BENCH_PICK_material_glass_ionomer" if lesson_id in ["composite", "sealant"] else "KL_BENCH_PICK_material_light_cure_sealant" if lesson_id == "fluoride" else "KL_BENCH_PICK_material_fluoride_varnish" if lesson_id == "cleaning" else "KL_BENCH_PICK_material_prophylaxis_paste" if lesson_id == "root_planing" else "KL_BENCH_PICK_material_shade_guide" if lesson_id == "chart" else "KL_BENCH_PICK_material_site_chart"):
		return {}
	if bench.call("summary")["selection_score"] != 1:
		return {}
	var correct_material := "material_crown_articulating_forceps_reference" if lesson_id == "crown_paper_forceps" else "material_sectional_matrix_ring_reference" if lesson_id == "matrix_forceps" else "material_finished_denture_posterior_key" if lesson_id == "denture_wax_rim" else "material_manual_file_canal_reference" if lesson_id == "endo_file" else "material_bitewing_receptor_reference_key" if lesson_id == "bitewing_holder" else "material_assigned_furcation_locator" if lesson_id == "furcation" else "material_light_cure_composite" if lesson_id == "composite" else "material_light_cure_sealant" if lesson_id == "sealant" else "material_fluoride_varnish" if lesson_id == "fluoride" else "material_prophylaxis_paste" if lesson_id == "cleaning" else "material_clean_water_coolant" if lesson_id == "root_planing" else "material_site_chart" if lesson_id == "chart" else "material_assigned_bitewing_image" if lesson_id == "bitewing" else "material_soft_tissue_location_record" if lesson_id == "oral_exam" else "material_veneer_fit_reference" if lesson_id == "veneer" else "material_inlay_outline_reference" if lesson_id == "inlay" else "material_crown_fit_reference" if lesson_id == "crown" else "material_bridge_support_reference" if lesson_id == "bridge" else "material_complete_denture_arch_reference" if lesson_id == "full_denture" else "material_partial_denture_support_reference" if lesson_id == "partial_denture" else "material_implant_site_interface_reference" if lesson_id == "implant" else "material_assigned_canal_diagram" if lesson_id == "endo" else "material_assigned_prior_current_record" if lesson_id == "retreat" else "material_assigned_aligner_stage04_plan" if lesson_id == "aligner" else "material_mouthguard_upper_arch_reference" if lesson_id == "mouthguard" else "material_assigned_extraction_tooth_and_adjacent_record"
	if not await _click(bench, "KL_BENCH_PICK_" + correct_material):
		return {}
	if bench.call("summary")["selection_score"] != 2:
		return {}
	if not await _click(bench, "KL_BENCH_PRACTICE"):
		return {}
	var lab: Control = _app.get("_procedure_lab")
	if not is_instance_valid(lab) or str(lab.get("scenario")["id"]) != str(config["scenario"]):
		push_error("Bench routed to wrong chair scenario; expected " + str(config["scenario"]))
		return {}
	var chair_ref := lab.find_child("KL_LAB_TOPIC_REFERENCE", true, false) as LinkButton
	if chair_ref == null or not chair_ref.uri.begins_with("https://") or (lesson_id != "composite" and chair_ref.uri != config["reference"]):
		push_error("Chair does not display this lesson's existing ADA source.")
		return {}
	if not await _complete(lab):
		push_error("Bench chair did not complete after wrong-target rejection.")
		return {}
	if not await _click(lab, "KL_PROCEDURE_EXIT"):
		return {}
	if not await _click(bench, "KL_BENCH_FINISH"):
		return {}
	var report: Dictionary = bench.call("summary")
	var folder: String = bench.get("_report_path")
	if report.get("id") != config["id"] or report.get("scenario") != config["scenario"] or report.get("case_reference") != config["reference"] or report.get("finish_event") != config["finish_event"]:
		return {}
	if not report.get("completed") or not FileAccess.file_exists(folder.path_join("result.json")):
		return {}
	if report["chair_attempts"].size() != 1 or int(report["chair_attempts"][0]["score"]) != 20 or not bool(report["chair_attempts"][0]["verified"]):
		return {}
	var retries := {}
	var seen_correct := {}
	var finish_seen := false
	for event: Dictionary in report["timeline"]:
		if _video:
			event["video_seconds"] = float(event["frame"]) / 24.0
		if event["area"] == "bench" and event["event"] in ["tool_choice", "material_choice"]:
			if event["outcome"] == "retry":
				retries[event["event"]] = event
			elif event["outcome"] == "correct":
				seen_correct[event["event"]] = event
		elif event["area"] == "chair" and event["outcome"] == "retry" and not str(event["expected_id"]).is_empty():
			retries["chair"] = event
		elif event["area"] == "bench" and event["event"] == config["finish_event"] and event["outcome"] == "complete":
			finish_seen = true
	if not retries.has_all(["tool_choice", "material_choice", "chair"]) or not seen_correct.has_all(["tool_choice", "material_choice"]) or not finish_seen:
		push_error("Missing wrong/correct tool and material picks, chair rejection, or simulation-specific finish.")
		return {}
	for kind in ["tool", "material"]:
		if str(retries[kind + "_choice"]["selected_id"]) != (wrong_tool if kind == "tool" else wrong_material) or str(retries[kind + "_choice"]["expected_id"]) != config[kind]["expected"] or str(seen_correct[kind + "_choice"]["selected_id"]) != config[kind]["expected"]:
			push_error("Bench replay selected/expected ID mismatch: " + kind)
			return {}
	if str(retries["chair"]["selected_id"]) == str(retries["chair"]["expected_id"]):
		push_error("Chair rejection did not record distinct selected/expected target IDs.")
		return {}
	if not await _click(bench, "KL_BENCH_RESET"):
		return {}
	var restarted: Dictionary = bench.call("summary")
	if restarted["selection_score"] != 0 or restarted["completed"] or not restarted["chair_attempts"].is_empty() or restarted["choices"].size() != 0:
		return {}
	report["clean_reset"] = true
	report["score"] = 20
	report["max_score"] = 20
	return report

func _click(surface: Node, button_name: String) -> bool:
	var button := surface.find_child(button_name, true, false) as Button
	if button == null or button.disabled:
		push_error("Unavailable bench control: " + button_name)
		return false
	button.grab_focus()
	await process_frame
	button.pressed.emit()
	await process_frame
	if _video:
		await create_timer(0.52).timeout
	return true
