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
	if lesson_id not in ["composite", "sealant", "fluoride", "cleaning", "root_planing", "chart", "bitewing", "oral_exam", "veneer", "inlay"]:
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
	var config: Dictionary = BENCH_CATALOG.COMPOSITE if lesson_id == "composite" else BENCH_CATALOG.SEALANT if lesson_id == "sealant" else BENCH_CATALOG.FLUORIDE if lesson_id == "fluoride" else BENCH_CATALOG.CLEANING if lesson_id == "cleaning" else BENCH_CATALOG.ROOT_PLANING if lesson_id == "root_planing" else BENCH_CATALOG.CHART if lesson_id == "chart" else BENCH_CATALOG.BITEWING if lesson_id == "bitewing" else BENCH_CATALOG.ORAL_EXAM if lesson_id == "oral_exam" else BENCH_CATALOG.VENEER if lesson_id == "veneer" else BENCH_CATALOG.INLAY
	var opener := "KL_OPEN_COMPOSITE_BENCH" if lesson_id == "composite" else "KL_OPEN_SEALANT_BENCH" if lesson_id == "sealant" else "KL_OPEN_FLUORIDE_BENCH" if lesson_id == "fluoride" else "KL_OPEN_CLEANING_BENCH" if lesson_id == "cleaning" else "KL_OPEN_ROOT_PLANING_BENCH" if lesson_id == "root_planing" else "KL_OPEN_CHART_BENCH" if lesson_id == "chart" else "KL_OPEN_BITEWING_BENCH" if lesson_id == "bitewing" else "KL_OPEN_ORAL_EXAM_BENCH" if lesson_id == "oral_exam" else "KL_OPEN_VENEER_BENCH" if lesson_id == "veneer" else "KL_OPEN_INLAY_BENCH"
	if not await _click(_app, opener):
		return {}
	var bench: Control = _app.get("_chairside_bench")
	if not is_instance_valid(bench) or not bench.call("summary")["models_loaded"]:
		push_error("Bench or both study 3D models not loaded.")
		return {}
	if lesson_id == "inlay":
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
	var wrong_tool := "tool.curing_light" if lesson_id == "fluoride" else "tool.polishing_cup" if lesson_id == "root_planing" else "tool.periodontal_probe" if lesson_id in ["bitewing", "oral_exam"] else "tool.examination_mirror" if lesson_id == "veneer" else "tool.veneer_shell" if lesson_id == "inlay" else "tool.ultrasonic_scaler"
	var wrong_material := "material.light_cure_sealant" if lesson_id == "fluoride" else "material.fluoride_varnish" if lesson_id == "cleaning" else "material.prophylaxis_paste" if lesson_id == "root_planing" else "material.shade_guide" if lesson_id == "chart" else "material.site_chart" if lesson_id in ["bitewing", "oral_exam", "veneer"] else "material.veneer_fit_reference" if lesson_id == "inlay" else "material.glass_ionomer"
	if not await _click(bench, "KL_BENCH_PICK_tool_veneer_shell" if lesson_id == "inlay" else "KL_BENCH_PICK_tool_examination_mirror" if lesson_id == "veneer" else "KL_BENCH_PICK_tool_periodontal_probe" if lesson_id in ["bitewing", "oral_exam"] else "KL_BENCH_PICK_tool_polishing_cup" if lesson_id == "root_planing" else "KL_BENCH_PICK_tool_curing_light" if lesson_id == "fluoride" else "KL_BENCH_PICK_tool_ultrasonic_scaler"):
		return {}
	if bench.call("summary")["selection_score"] != 0:
		return {}
	if not await _click(bench, "KL_BENCH_PICK_tool_curing_light" if lesson_id in ["composite", "sealant"] else "KL_BENCH_PICK_tool_varnish_brush" if lesson_id == "fluoride" else "KL_BENCH_PICK_tool_polishing_cup" if lesson_id == "cleaning" else "KL_BENCH_PICK_tool_ultrasonic_scaler" if lesson_id == "root_planing" else "KL_BENCH_PICK_tool_periodontal_probe" if lesson_id == "chart" else "KL_BENCH_PICK_tool_image_pointer" if lesson_id == "bitewing" else "KL_BENCH_PICK_tool_examination_mirror" if lesson_id == "oral_exam" else "KL_BENCH_PICK_tool_veneer_shell" if lesson_id == "veneer" else "KL_BENCH_PICK_tool_inlay_insert"):
		return {}
	if not await _click(bench, "KL_BENCH_PICK_material_veneer_fit_reference" if lesson_id == "inlay" else "KL_BENCH_PICK_material_glass_ionomer" if lesson_id in ["composite", "sealant"] else "KL_BENCH_PICK_material_light_cure_sealant" if lesson_id == "fluoride" else "KL_BENCH_PICK_material_fluoride_varnish" if lesson_id == "cleaning" else "KL_BENCH_PICK_material_prophylaxis_paste" if lesson_id == "root_planing" else "KL_BENCH_PICK_material_shade_guide" if lesson_id == "chart" else "KL_BENCH_PICK_material_site_chart"):
		return {}
	if bench.call("summary")["selection_score"] != 1:
		return {}
	var correct_material := "material_light_cure_composite" if lesson_id == "composite" else "material_light_cure_sealant" if lesson_id == "sealant" else "material_fluoride_varnish" if lesson_id == "fluoride" else "material_prophylaxis_paste" if lesson_id == "cleaning" else "material_clean_water_coolant" if lesson_id == "root_planing" else "material_site_chart" if lesson_id == "chart" else "material_assigned_bitewing_image" if lesson_id == "bitewing" else "material_soft_tissue_location_record" if lesson_id == "oral_exam" else "material_veneer_fit_reference" if lesson_id == "veneer" else "material_inlay_outline_reference"
	if not await _click(bench, "KL_BENCH_PICK_" + correct_material):
		return {}
	if bench.call("summary")["selection_score"] != 2:
		return {}
	if not await _click(bench, "KL_BENCH_PRACTICE"):
		return {}
	var lab: Control = _app.get("_procedure_lab")
	if not is_instance_valid(lab) or str(lab.get("scenario")["id"]) != lesson_id:
		push_error("Bench routed to wrong chair scenario; expected " + lesson_id)
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
	if report.get("id") != config["id"] or report.get("scenario") != lesson_id or report.get("case_reference") != config["reference"] or report.get("finish_event") != config["finish_event"]:
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
