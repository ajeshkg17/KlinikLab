extends SceneTree
const JOURNAL := "user://kliniklab-native-progress-v2.json"
const DRILLS := preload("res://procedure-drills.gd")
const HANDS := preload("res://practice-tool-handling.gd")
var _app: Node3D
var _folder := ""
var _video := false
var _action_hold := 0.28
var _mode := "all"
var _runs: Array[Dictionary] = []
var _started := Time.get_ticks_msec()

func _initialize() -> void:
	call_deferred("_run")

func _finish(status: String, detail := "") -> void:
	var file := FileAccess.open(_folder.path_join("result.json"), FileAccess.WRITE)
	if file == null:
		push_error("Could not write procedure trial report.")
		quit(1)
		return
	file.store_string(JSON.stringify({"schema": 1, "status": status, "error": detail,
		"source_sha": FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges(),
		"mode": _mode, "video_fps": 24 if _video else 0, "runs": _runs,
		"learner_journal_unchanged": status == "pass",
		"elapsed_ms": Time.get_ticks_msec() - _started}, "\t") + "\n")
	file.close()
	if status != "pass":
		push_error(detail)
	quit(0 if status == "pass" else 1)

func _open(index: int, hand_design := HANDS.FINAL_DESIGN_PASS) -> Control:
	var page: Node = _app.get("_page")
	var picker := page.get_node("KL_PROCEDURE_DRILL_SELECT") as OptionButton
	picker.select(index)
	picker.item_selected.emit(index)
	if hand_design == HANDS.FINAL_DESIGN_PASS:
		(page.get_node("KL_START_PROCEDURE_LAB") as Button).pressed.emit()
	else:
		_app.call("_start_procedure_lab", hand_design)
	return _app.get("_procedure_lab")

func _aim(lab: Control, target: String) -> void:
	var camera: Camera3D = lab.get("_camera")
	var marker: Node3D = (lab.get("_targets") as Dictionary)[target]
	camera.look_at(marker.global_position)

func _settle() -> void:
	await physics_frame
	await physics_frame

func _action(lab: Control, target: String, control: String, key := false) -> void:
	_aim(lab, target)
	if key:
		var event := InputEventKey.new()
		event.physical_keycode = KEY_F
		event.pressed = true
		lab.call("handle_input", event)
	else:
		(lab.find_child(control, true, false) as Button).pressed.emit()
	await _settle()
	if _video:
		var hold := maxf(_action_hold, 0.24) if control == "KL_LAB_GRAB" else _action_hold
		await create_timer(hold).timeout

func _pull(lab: Control, frames: int) -> void:
	var button := lab.find_child("KL_LAB_PULL", true, false) as Button
	button.button_down.emit()
	for frame in range(frames):
		await physics_frame
	button.button_up.emit()
	await _settle()

func _rigged_fit(hands: HANDS, tool: Node3D, kind: String) -> bool:
	var skeletons := hands.right_hand().get_parent().find_children("*", "Skeleton3D", true, false)
	if skeletons.size() != 2:
		push_error("Expected two glove skeletons, found %d." % skeletons.size())
		return false
	for rig: Skeleton3D in skeletons:
		if rig.get_bone_count() != 26:
			push_error("Glove skeleton %s has %d bones." % [rig.name, rig.get_bone_count()])
			return false
	if not _video and float(hands.get("_grip")) < 0.99:
		(hands.get("_pose_tween") as Tween).custom_step(0.25)
	var contacts := hands.grip_contacts()
	if contacts.size() != 2:
		push_error("Expected two fingertip contacts for " + kind)
		return false
	var inverse := tool.transform.affine_inverse()
	for contact: Vector3 in contacts:
		var point := inverse * contact
		match kind:
			"seat":
				var relative := (point - Vector3(0, 0.055, 0)) / Vector3(0.10, 0.065, 0.10)
				if absf(relative.length() - 1.0) > 0.08:
					push_error("Appliance grip missed its rim at %s." % point)
					return false
			"extract":
				if absf(absf(point.x) - 0.038) > 0.012 or absf(point.y - 0.04) > 0.02:
					push_error("Forceps grip missed its handle at %s." % point)
					return false
			_:
				if absf(absf(point.y - 0.04) - 0.0225) > 0.008 or absf(point.x) > 0.0215:
					push_error("Instrument grip %s missed its handle at %s." % [kind, point])
					return false
	return true

func _has_original_512_albedo(tooth: Node3D) -> bool:
	for mesh: MeshInstance3D in tooth.find_children("*", "MeshInstance3D", true, false):
		var material := mesh.get_active_material(0) as BaseMaterial3D
		if material != null and material.albedo_texture != null:
			var texture := material.albedo_texture
			if texture.get_width() == 512 and texture.get_height() == 512:
				return true
	return false

func _extraction_asset(lab: Control) -> Dictionary:
	var tooth: Node3D = lab.get("_tooth_model")
	if tooth == null or not tooth.has_method("summary") or not _has_original_512_albedo(tooth):
		push_error("Extraction FDI36 has no source-verified 512 px Dundee texture.")
		return {}
	var report: Dictionary = tooth.call("summary")
	var credit := lab.find_child("KL_LAB_TOOTH_CREDIT", true, false) as LinkButton
	if not report.get("texturePreserved") or str(report.get("fdi", "")) != "36" or credit == null or credit.disabled or not credit.text.contains("CC BY 4.0"):
		push_error("FDI36 credit, FDI or texture contract failed.")
		return {}
	report["albedo_px"] = [512, 512]
	var gum: Node3D = lab.get("_gum_fixture")
	if gum == null or not gum.has_method("summary"):
		push_error("Synthetic extraction gum fixture unavailable.")
		return {}
	var gum_report: Dictionary = gum.call("summary")
	if not gum_report.get("synthetic", false) or gum_report.get("marginCount", 0) != 5 or not gum_report.get("fdi36SocketSurface", false) or gum_report.get("patientDerived", true):
		push_error("Synthetic gum margins or visible socket missing.")
		return {}
	var neighbours: Dictionary = lab.get("_neighbour_rests")
	if neighbours.size() != 2:
		push_error("FDI35/FDI37 must be independently mounted neighbours.")
		return {}
	var neighbour_reports: Array[Dictionary] = []
	var found: Array[String] = []
	for node in neighbours:
		var neighbour: Node3D = node
		if not neighbour.has_method("summary") or not _has_original_512_albedo(neighbour) or neighbour.get_parent() != lab.get("_jaw"):
			push_error("An extraction neighbour has no source-verified 512 px Dundee mesh.")
			return {}
		var item: Dictionary = neighbour.call("summary")
		var fdi := str(item.get("fdi", ""))
		var expected_blob := "892db94359877442300a6eac7a496dc85cdcaf98" if fdi == "35" else "947e90e80a7adb1d30f9cd09e84c9eacc8fc03f0" if fdi == "37" else ""
		if found.has(fdi) or expected_blob.is_empty() or str(item.get("sourceGitBlobSha", "")) != expected_blob or not item.get("texturePreserved", false) or not item.get("illustrativeSeating", false):
			push_error("Extraction neighbour source FDI identity mismatch: " + fdi)
			return {}
		found.append(fdi)
		neighbour_reports.append(item)
	if not found.has("35") or not found.has("37"):
		push_error("Both distinct Dundee FDI35/FDI37 neighbours are required.")
		return {}
	report["neighbours"] = neighbour_reports
	report["gum"] = gum_report
	report["illustrativeArrangement"] = true
	return report

func _record_extracted_tooth_detail(lab: Control) -> void:
	if not _video:
		return
	var camera: Camera3D = lab.get("_camera")
	var tooth: Node3D = lab.get("_tooth_model")
	var hand_rig := camera.get_node("KL_FIRST_PERSON_HANDS") as Node3D
	var original := camera.global_transform
	var hands_visible := hand_rig.visible
	hand_rig.hide()
	var center := tooth.global_position
	for frame in range(44):
		var angle := lerpf(-0.38, 0.55, float(frame) / 43.0)
		camera.global_position = center + Vector3(sin(angle) * 0.40, 0.19, cos(angle) * 0.40)
		camera.look_at(center)
		await process_frame
	camera.global_transform = original
	hand_rig.visible = hands_visible

# These poses are recorded only in built-in Movie Maker replays.
# The view pans over source-teeth and the synthetic margin/socket; nothing
# touches extraction state, jaw angle, targets, score or user://.
func _record_extraction_gum_detail(lab: Control, released: bool) -> void:
	if not _video or str((lab.get("scenario") as Dictionary).get("id", "")) != "extraction":
		return
	var camera: Camera3D = lab.get("_camera")
	var gum: Node3D = lab.get("_gum_fixture")
	if gum == null:
		return
	var hand_rig := camera.get_node("KL_FIRST_PERSON_HANDS") as Node3D
	var original := camera.global_transform
	var hands_visible := hand_rig.visible
	hand_rig.hide()
	var target := gum.to_global(Vector3(0.0, 0.245, -0.18))
	var count := 46
	for frame in range(count):
		var phase := float(frame) / float(count - 1)
		var arc := lerpf(-0.23, 0.23, phase)
		var pos := Vector3(sin(arc) * (0.34 if released else 0.51), 0.59 if released else 0.76, 0.64 if released else 0.91)
		camera.global_position = gum.to_global(pos)
		camera.look_at(target)
		await process_frame
	camera.global_transform = original
	hand_rig.visible = hands_visible

func _complete(lab: Control) -> bool:
	var prompt: Label = lab.get("_status")
	var feedback: Label = lab.get("_feedback")
	var progress := lab.find_child("KL_LAB_PROGRESS", true, false) as Label
	var reference := lab.find_child("KL_LAB_TOPIC_REFERENCE", true, false) as LinkButton
	if reference == null or not reference.uri.begins_with("https://") or reference.uri.ends_with("/all-topics-a-z"):
		return false
	if lab.get("scenario")["id"] == "extraction" and _extraction_asset(lab).is_empty():
		push_error("Extraction requires attributed textured Dundee FDI35/36/37 and a synthetic gingival socket.")
		return false
	if lab.get("scenario")["id"] == "extraction":
		await _record_extraction_gum_detail(lab, false)
	var original := prompt.text
	await _action(lab, "wrong_tool", "KL_LAB_GRAB")
	if int(lab.get("score")) != 0 or lab.get("held") or prompt.text != original or not feedback.text.contains("assigned instrument"):
		return false
	await _action(lab, "tool", "KL_LAB_GRAB", true)
	if int(lab.get("score")) != 5 or not lab.get("held") or not progress.text.contains("0/2"):
		return false
	var site_label := ((lab.get("_targets") as Dictionary)["site_0"] as Node3D).get_child(2) as Label3D
	var current_caption: Label = lab.get("_active_target_caption") as Label
	# PR160 moved active instructions out of world-space Label3D billboards.
	# Compare the same target text and green state on the fixed 2D row.
	if current_caption == null:
		push_error("Chair target caption missing after acquiring instrument.")
		return false
	if not current_caption.visible or current_caption.text != "Current target · " + site_label.text or site_label.visible or current_caption.get_theme_color("font_color") != Color("#d0ffe4"):
		push_error("Current target caption mismatch after pickup: stage=%d score=%d text=%s 3d_visible=%s" % [
			int(lab.get("stage")), int(lab.get("score")), current_caption.text, str(site_label.visible)])
		return false
	var tool: Node3D = lab.get("_correct_tool")
	var hands: HANDS = lab.get("_hands")
	if tool.get_parent() != hands.right_hand() or not _rigged_fit(hands, tool, str(lab.get("scenario")["effect"])):
		return false
	await _action(lab, "site_1", "KL_LAB_USE")
	if int(lab.get("next_target")) != 0 or not feedback.text.contains("model action"):
		return false
	var picker := lab.find_child("KL_LAB_TARGETS", true, false) as OptionButton
	for index in range(picker.item_count):
		if picker.get_item_metadata(index) == "site_0":
			picker.select(index)
			picker.item_selected.emit(index)
			if (lab.get("scenario") as Dictionary)["id"] == "extraction":
				_aim(lab, "site_0")
				var jaw := lab.find_child("HingedTrainingJaw", true, false) as Node3D
				var open_angle := jaw.rotation.x
				(lab.find_child("KL_LAB_JAW", true, false) as Button).pressed.emit()
				await _pull(lab, 12)
				if float(lab.get("_pull_progress")) != 0.0 or jaw.rotation.x >= open_angle or not feedback.text.contains("Open the jaw fully"):
					return false
				(lab.find_child("KL_LAB_JAW", true, false) as Button).pressed.emit()
				for frame in range(13):
					await physics_frame
				_aim(lab, "site_1")
				await _pull(lab, 6)
				if float(lab.get("_pull_progress")) != 0.0 or not feedback.text.contains("assigned tooth, not an adjacent tooth"):
					return false
				_aim(lab, "site_0")
				var camera: Camera3D = lab.get("_camera")
				var site: Node3D = (lab.get("_targets") as Dictionary)["site_0"]
				var blocker := StaticBody3D.new()
				var bounds := CollisionShape3D.new()
				bounds.shape = SphereShape3D.new()
				blocker.add_child(bounds)
				(camera.get_parent() as Node3D).add_child(blocker)
				blocker.global_position = camera.global_position.lerp(site.global_position, 0.5)
				await _settle()
				await _pull(lab, 6)
				blocker.queue_free()
				await _settle()
				if float(lab.get("_pull_progress")) != 0.0:
					return false
				var pull_button := lab.find_child("KL_LAB_PULL", true, false) as Button
				pull_button.button_down.emit()
				for frame in range(15):
					await physics_frame
					if frame == 0 and not feedback.text.contains("Correct tooth contact"):
						push_error("Correct forceps contact was not acknowledged: " + feedback.text)
						return false
				var partial: float = lab.get("_pull_progress")
				pull_button.button_up.emit()
				await _settle()
				var paused_feedback: String = (lab.get("_feedback") as Label).text
				var paused_percent := str(roundi(partial * 100.0)) + "%"
				if not paused_feedback.contains("Pull paused") or not paused_feedback.contains(paused_percent):
					push_error("Released extraction did not report its paused progress: " + paused_feedback)
					return false
				for frame in range(8):
					await physics_frame
				if partial <= 0.0 or partial >= 1.0 or not is_equal_approx(partial, float(lab.get("_pull_progress"))):
					return false
				await _pull(lab, 55)
				await _record_extraction_gum_detail(lab, true)
				await _record_extracted_tooth_detail(lab)
			else:
				(lab.find_child("KL_LAB_USE", true, false) as Button).pressed.emit()
				await _settle()
			if not picker.is_item_disabled(index):
				return false
			break
	await _action(lab, "site_0", "KL_LAB_USE")
	if int(lab.get("next_target")) != 1 or int(lab.get("score")) != 5 or not progress.text.contains("1/2"):
		return false
	await _action(lab, "site_1", "KL_LAB_USE")
	if int(lab.get("score")) != 15:
		return false
	var model_results: Dictionary = lab.get("model_results")
	var scenario: Dictionary = lab.get("scenario")
	if model_results.get("site_0") != scenario["actions"][0] or model_results.get("site_1") != scenario["actions"][1]:
		return false
	await _action(lab, "verify", "KL_LAB_USE")
	if int(lab.get("score")) != 15:
		return false
	await _action(lab, "return", "KL_LAB_GRAB", true)
	if tool.get_parent() != lab.get("_tool_home") or not progress.text.contains("Verify the model"):
		return false
	var first_site: Node3D = (lab.get("_targets") as Dictionary)["site_0"]
	first_site.show()
	await _action(lab, "verify", "KL_LAB_USE")
	if int(lab.get("score")) != 15:
		return false
	first_site.hide()
	if scenario["effect"] == "extract":
		var neighbour_rests: Dictionary = lab.get("_neighbour_rests")
		if neighbour_rests.size() != 2:
			push_error("Extraction replay expected both adjacent teeth.")
			return false
		for neighbour in neighbour_rests:
			(neighbour as Node3D).position.x += 0.02
			await _action(lab, "verify", "KL_LAB_USE")
			if int(lab.get("score")) != 15 or int(lab.get("stage")) != 2 or not feedback.text.contains("both adjacent teeth"):
				push_error("Failed extraction verification did not explain the adjacent-tooth check: " + feedback.text)
				return false
			(neighbour as Node3D).transform = neighbour_rests[neighbour]
	await _action(lab, "verify", "KL_LAB_USE")
	var summary := lab.find_child("KL_LAB_OUTCOME_SUMMARY", true, false) as Label
	return int(lab.get("score")) == 20 and int(lab.get("stage")) == 3 and not lab.get("held") and progress.text.contains("Verified") and summary.visible and summary.text.contains(scenario["actions"][0]) and summary.text.contains(scenario["actions"][1])

func _procedure(index: int) -> bool:
	var lab := _open(index)
	await _settle()
	if not await _complete(lab):
		return false
	var first: Array = lab.get("events").duplicate(true)
	var first_id: int = lab.get("run_id")
	(lab.find_child("KL_PROCEDURE_RESTART", true, false) as Button).pressed.emit()
	if int(lab.get("score")) != 0 or lab.get("held") or lab.get("run_id") != first_id + 1:
		return false
	if (lab.get("events") as Array).size() != 1 or not (lab.get("model_results") as Dictionary).is_empty() or not (lab.get("_applied") as Dictionary).is_empty():
		return false
	if not await _complete(lab):
		return false
	var scenario: Dictionary = lab.get("scenario")
	_runs.append({"id": scenario["id"], "score": 20, "max_score": 20,
		"clean_replay": true, "first_run": first, "events": lab.get("events"),
		"extraction_asset": _extraction_asset(lab) if scenario["id"] == "extraction" else {}})
	(lab.find_child("KL_PROCEDURE_EXIT", true, false) as Button).pressed.emit()
	await process_frame
	return true

func _grab_tests(hand_design := HANDS.FINAL_DESIGN_PASS) -> bool:
	var lab := _open(0, hand_design)
	await _settle()
	var camera: Camera3D = lab.get("_camera")
	var targets: Dictionary = lab.get("_targets")
	var target: Node3D = targets["tool"]
	var names := ["keyboard", "button", "facing away", "outside reach", "inside reach",
		"blocked line of sight", "wrong tool", "return", "rapid repeat", "reset while holding"]
	for index in range(names.size()):
		lab.call("_restart")
		var expected := true
		var blocker: StaticBody3D
		match index:
			2:
				camera.look_at(camera.global_position + Vector3.BACK)
				(lab.find_child("KL_LAB_GRAB", true, false) as Button).pressed.emit()
				await _settle()
				expected = false
			3, 4:
				camera.global_position = target.global_position + Vector3.BACK * (lab.call("world_reach") + (0.30 if index == 3 else -0.15))
				await _action(lab, "tool", "KL_LAB_GRAB")
				expected = index == 4
			5:
				blocker = StaticBody3D.new()
				blocker.collision_layer = 1
				var bounds := CollisionShape3D.new()
				bounds.shape = SphereShape3D.new()
				blocker.add_child(bounds)
				(camera.get_parent() as Node3D).add_child(blocker)
				blocker.global_position = camera.global_position.lerp(target.global_position, 0.5)
				await _settle()
				await _action(lab, "tool", "KL_LAB_GRAB")
				blocker.queue_free()
				expected = false
			6:
				await _action(lab, "wrong_tool", "KL_LAB_GRAB")
				expected = false
			_:
				await _action(lab, "tool", "KL_LAB_GRAB", index == 0)
		if bool(lab.get("held")) != expected or int(lab.get("score")) != (5 if expected else 0):
			return false
		var hands: HANDS = lab.get("_hands")
		var instrument: Node3D = lab.get("_correct_tool")
		var hand: Node3D = hands.call("right_hand")
		if instrument.get_parent() != (hand if expected else lab.get("_tool_home")):
			return false
		if expected:
			if not _video:
				(hands.get("_pose_tween") as Tween).custom_step(0.25)
			var max_offset := 0.24 if hand_design == HANDS.RIGGED_DESIGN_PASS else 0.10
			if float(hands.get("_grip")) < 0.9 or instrument.position.length() > max_offset:
				push_error("Grab '%s' grip %s or instrument offset %s outside the allowed range." % [names[index], hands.get("_grip"), instrument.position])
				return false
			if hand_design == HANDS.RIGGED_DESIGN_PASS and not _rigged_fit(hands, instrument, str(lab.get("scenario")["effect"])):
				return false
			var viewport: Viewport = camera.get_viewport()
			if camera.is_position_behind(hand.global_position) or not viewport.get_visible_rect().has_point(camera.unproject_position(hand.global_position)):
				return false
		if index == 7:
			await _action(lab, "site_0", "KL_LAB_USE")
			await _action(lab, "site_1", "KL_LAB_USE")
			await _action(lab, "return", "KL_LAB_GRAB")
			if lab.get("held") or int(lab.get("score")) != 15:
				return false
		elif index == 8:
			await _action(lab, "tool", "KL_LAB_GRAB", true)
			if not lab.get("held") or int(lab.get("score")) != 5:
				return false
		elif index == 9:
			lab.call("_restart")
			if lab.get("held") or int(lab.get("score")) != 0:
				return false
		_runs.append({"name": names[index], "score": 1, "max_score": 1,
			"hand_design": hand_design, "design_change": HANDS.DESIGN_NOTES[hand_design - 1],
			"window_size": str(root.size), "events": (lab.get("events") as Array).duplicate(true)})
	(lab.find_child("KL_PROCEDURE_EXIT", true, false) as Button).pressed.emit()
	await process_frame
	return true

func _press_key(code: Key) -> void:
	var event := InputEventKey.new()
	event.physical_keycode = code
	event.pressed = true
	_app.call("_input", event)

# Source/UI regression: no world-space target caption may cover dental geometry.
# The fixed Control must occupy the reserved header area above the SubViewport.
func _chair_caption_clear(lab: Control) -> bool:
	var caption: Label = lab.get("_active_target_caption") as Label
	var view: SubViewportContainer = lab.get("_view") as SubViewportContainer
	if caption == null or view == null or not caption.visible or not caption.text.begins_with("Current target · "):
		push_error("Chair active target text is missing from its fixed UI row.")
		return false
	if caption.get_global_rect().end.y > view.get_global_rect().position.y + 1.0:
		push_error("Chair target instruction overlaps the rendered model viewport.")
		return false
	var targets: Dictionary = lab.get("_targets")
	for id in targets:
		var world_caption: Label3D = (targets[id] as Node3D).get_child(2) as Label3D
		if world_caption.visible:
			push_error("World-space target caption still overlays the model: " + str(id))
			return false
	return true

func _chair_route() -> bool:
	var page: Node = _app.get("_page")
	var picker := page.get_node("KL_PROCEDURE_DRILL_SELECT") as OptionButton
	picker.select(17)
	picker.item_selected.emit(17)
	var start_frame := Engine.get_process_frames()
	(page.get_node("KL_WALK_TO_CHAIR") as Button).pressed.emit()
	_press_key(KEY_E)
	if is_instance_valid(_app.get("_procedure_lab")):
		return false
	var walker: RefCounted = _app.get("_walk")
	for step in range(70):
		if walker.call("in_operatory_range"):
			break
		walker.call("apply_move_intent", Vector2(0, 1), 1.0 / 60.0)
		_app.call("_apply_walk_camera")
		await physics_frame
	if not walker.call("in_operatory_range"):
		for step in range(30):
			if walker.call("in_operatory_range"):
				break
			walker.call("apply_move_intent", Vector2(0, 1), 1.0 / 60.0)
			_app.call("_apply_walk_camera")
			await physics_frame
	var arrived: Vector3 = walker.get("position")
	_press_key(KEY_E)
	var lab: Control = _app.get("_procedure_lab")
	if not is_instance_valid(lab) or (lab.get("scenario") as Dictionary)["id"] != "extraction":
		return false
	var camera: Camera3D = lab.get("_camera")
	if camera.get_world_3d() != _app.get_viewport().world_3d:
		return false
	await _settle()
	if not _chair_caption_clear(lab):
		return false
	var floor: Vector3 = lab.get("_chair_origin")
	var height := lab.find_child("KL_LAB_EYE_HEIGHT", true, false) as SpinBox
	var start_height := camera.global_position.y - floor.y
	var start_pitch := camera.rotation_degrees.x
	if height == null or not is_equal_approx(start_height, height.value) or absf(start_pitch) > 25.0:
		push_error("Chair camera opened at %.2f m and %.1f degrees." % [start_height, start_pitch])
		return false
	height.value = 1.42
	(lab.find_child("KL_PROCEDURE_RESTART", true, false) as Button).pressed.emit()
	if not is_equal_approx(camera.global_position.y - floor.y, 1.42):
		push_error("Chair camera did not retain the selected eye height after restart.")
		return false
	await _action(lab, "tool", "KL_LAB_GRAB", true)
	_aim(lab, "site_0")
	var pull := lab.find_child("KL_LAB_PULL", true, false) as Button
	pull.button_down.emit()
	for frame in range(12):
		await physics_frame
	if float(lab.get("_pull_progress")) <= 0.0:
		return false
	(lab.find_child("KL_PROCEDURE_RESTART", true, false) as Button).pressed.emit()
	await _settle()
	if lab.get("held") or float(lab.get("_pull_progress")) != 0.0 or int(lab.get("score")) != 0:
		return false
	if not await _complete(lab):
		push_error("Chair first extraction pass stopped: stage=%d score=%d next_target=%d feedback=%s" % [
			int(lab.get("stage")), int(lab.get("score")), int(lab.get("next_target")), str((lab.get("_feedback") as Label).text)])
		return false
	var first_events: Array = lab.get("events").duplicate(true)
	(lab.find_child("KL_PROCEDURE_RESTART", true, false) as Button).pressed.emit()
	var tooth: Node3D = lab.get("_tooth_model")
	if tooth.get_parent() != lab.get("_jaw") or not tooth.transform.is_equal_approx(lab.get("_tooth_rest")):
		return false
	if not await _complete(lab):
		push_error("Chair second extraction pass stopped: stage=%d score=%d next_target=%d feedback=%s" % [
			int(lab.get("stage")), int(lab.get("score")), int(lab.get("next_target")), str((lab.get("_feedback") as Label).text)])
		return false
	_runs.append({"id": "chair_extraction", "score": 20, "max_score": 20, "walk_start_frame": start_frame,
		"extraction_asset": _extraction_asset(lab),
		"start_eye_height_m": start_height, "start_pitch_degrees": start_pitch, "replay_eye_height_m": height.value,
		"first_run": first_events, "events": lab.get("events")})
	(lab.find_child("KL_PROCEDURE_EXIT", true, false) as Button).pressed.emit()
	await process_frame
	return _app.get("_walk_active") and (walker.get("position") as Vector3).is_equal_approx(arrived)

func _run() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("Provide a trial folder with a fresh profile subdirectory.")
		quit(1)
		return
	_folder = args[0].replace("\\", "/").simplify_path().trim_suffix("/")
	var profile := _folder.path_join("profile").to_lower() + "/"
	var user_data := OS.get_user_data_dir().replace("\\", "/").simplify_path().to_lower() + "/"
	if not user_data.begins_with(profile) or OS.has_environment("KLINIKLAB_GITHUB_TOKEN"):
		push_error("Procedure trial requires its own profile and no upload token.")
		quit(1)
		return
	_video = args.has("--video")
	if args.has("--compact"):
		_action_hold = 0.08
	for arg in args:
		if arg.begins_with("--mode="):
			_mode = arg.trim_prefix("--mode=")
	root.size = Vector2i(1280, 720)
	_app = load("res://app.tscn").instantiate()
	root.add_child(_app)
	await process_frame
	_app.call("_switch_view", "drills")
	var journal := FileAccess.get_file_as_bytes(JOURNAL)
	if _mode == "grabs":
		if not await _grab_tests():
			_finish("fail", "Grab case failed after %d completed cases." % _runs.size())
			return
	elif _mode == "chair":
		if not await _chair_route():
			_finish("fail", "Walk-to-chair extraction route failed.")
			return
	elif _mode == "hands":
		for hand_design in range(1, HANDS.FINAL_DESIGN_PASS + 1):
			root.size = Vector2i(1024, 720) if hand_design % 2 == 0 else Vector2i(1600, 900)
			await process_frame
			if not await _grab_tests(hand_design):
				_finish("fail", "Hand design %d failed after %d grab cases." % [hand_design, _runs.size()])
				return
	else:
		if _mode != "all" and (not _mode.is_valid_int() or int(_mode) < 0 or int(_mode) >= DRILLS.DRILLS.size()):
			_finish("fail", "Unknown procedure index.")
			return
		var indexes := range(DRILLS.DRILLS.size()) if _mode == "all" else [int(_mode)]
		for index in indexes:
			if not await _procedure(index):
				_finish("fail", "Procedure failed: " + str(DRILLS.DRILLS[index][0]))
				return
	if journal != FileAccess.get_file_as_bytes(JOURNAL):
		_finish("fail", "Learner journal changed.")
		return
	print("KLINIKLAB_PROCEDURE_TRIAL_PASS mode=", _mode, " runs=", _runs.size())
	_finish("pass")
