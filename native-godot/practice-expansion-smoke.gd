extends SceneTree
## Batch QA for ten glove candidates, ten real grab routes, and 20 drills × 10 passes.
const HANDS := preload("res://practice-tool-handling.gd")
const DRILLS := preload("res://procedure-drills.gd")
const JOURNAL := "user://kliniklab-native-progress-v2.json"
var _report := {"designs": [], "grabs": [], "procedures": []}

func _initialize() -> void:
	call_deferred("_run")

func _check(ok: bool, message: String) -> bool:
	if not ok:
		push_error("PRACTICE_EXPANSION_FAILED: " + message)
		quit(1)
	return ok

func _designs() -> bool:
	var previous := ""
	for pass_index in range(0, HANDS.FINAL_DESIGN_PASS + 1):
		var camera := Camera3D.new()
		root.add_child(camera)
		camera.position = Vector3(0, 1.55, 1.5)
		var rig := HANDS.new()
		root.add_child(rig)
		rig.setup(camera, Vector3.ZERO, pass_index)
		rig.set_active(true)
		var target: Node3D = rig.get("_stand")
		camera.look_at(target.global_position + Vector3.UP * 0.09)
		var hand: Node3D = rig.get("_right")
		var fingers: Array = rig.get("_right_fingers")
		if not _check(fingers.size() == 4 and root.get_visible_rect().has_point(camera.unproject_position(hand.global_position)), "hand missing or offscreen at design %d" % pass_index):
			return false
		var index: Node3D = fingers[0]
		var signature := [hand.position]
		var palm := hand.get_child(1) as MeshInstance3D
		var cuff := hand.get_child(2) as MeshInstance3D
		signature.append((palm.mesh as CapsuleMesh).radius)
		signature.append((cuff.mesh as CapsuleMesh).height)
		signature.append((index.get_node("Tip") as Node3D).position.z)
		signature.append(((index.get_node("Tip").get_child(0) as MeshInstance3D).mesh as CapsuleMesh).radius)
		var rest := index.rotation.x
		if not _check(rig.interact(), "design %d cannot pick up the aimed mirror" % pass_index):
			return false
		var motion: Tween = rig.get("_pose_tween")
		motion.custom_step(0.11)
		var mid: float = rig.get("_grip")
		motion.custom_step(0.3)
		signature.append(mid)
		signature.append(hand.position)
		signature.append(hand.rotation)
		signature.append(index.rotation.x)
		signature.append((rig.get("_right_thumb") as Node3D).rotation.y)
		if not _check(mid > 0 and mid < 1 and index.rotation.x < rest and is_equal_approx(float(rig.get("_grip")), 1.0), "invalid animated grip at design %d" % pass_index):
			return false
		var value := str(signature)
		if pass_index > 0:
			if not _check(value != previous, "design %d did not change measured hand geometry or motion" % pass_index):
				return false
			_report["designs"].append({"pass": pass_index, "change": HANDS.DESIGN_NOTES[pass_index - 1], "grip_mid": mid, "result": "pass"})
		previous = value
		rig.free()
		camera.free()
	return true

func _key(app: Node, code: Key) -> void:
	var input := InputEventKey.new()
	input.physical_keycode = code
	input.pressed = true
	app.call("_input", input)

func _page(app: Node) -> VBoxContainer:
	return app.get("_page")

func _aim(app: Node, toward: Vector3) -> void:
	var walker: RefCounted = app.get("_walk")
	var origin: Vector3 = walker.get("position")
	var offset := toward - origin
	walker.set("yaw", atan2(-offset.x, -offset.z))
	walker.set("pitch", atan2(offset.y, Vector2(offset.x, offset.z).length()))
	app.call("_apply_walk_camera")

func _grabs(app: Node) -> bool:
	app.call("_switch_view", "environment")
	app.call("_practice_game_start")
	app.call("_start_clinic_walk")
	var tool: Node3D = app.get("_practice_tool")
	var walker: RefCounted = app.get("_walk")
	var station: Node3D = tool.get("_stand")
	var target := station.global_position + Vector3.UP * 0.09
	var eye: Vector3 = walker.get("position")
	for attempt in range(10):
		app.call("_practice_game_new_run")
		var game: RefCounted = app.get("_practice_game")
		var side := -1.0 if attempt % 2 == 0 else 1.0
		var distance := 0.8 + 0.13 * attempt
		walker.set("position", Vector3(target.x + side * distance, eye.y, target.z))
		_aim(app, (walker.get("position") as Vector3) * 2.0 - target)
		_key(app, KEY_F)
		if not _check(tool.call("interaction_status") == "aim" and not tool.call("holding"), "grab while facing away was accepted"):
			return false
		_aim(app, target)
		if attempt % 2 == 0:
			_key(app, KEY_F)
		else:
			var button := _page(app).get_node("KL_PRACTICE_TOOL") as Button
			if not _check(not button.disabled, "aimed interaction button disabled"):
				return false
			button.pressed.emit()
		if not _check(tool.call("holding") and game.call("score") == 0, "pickup failed or earned points early"):
			return false
		walker.set("position", Vector3(target.x, eye.y, target.z + HANDS.REACH + 0.05))
		_aim(app, target)
		_key(app, KEY_F)
		if not _check(tool.call("interaction_status") == "range" and tool.call("holding"), "return worked out of reach"):
			return false
		walker.set("position", Vector3(target.x, eye.y, target.z + HANDS.REACH - 0.05))
		_aim(app, target)
		_key(app, KEY_F)
		if not _check(not tool.call("holding") and game.call("score") == 10, "valid return did not score once"):
			return false
		_key(app, KEY_F)
		_key(app, KEY_F)
		if not _check(game.call("score") == 10 and not tool.call("holding"), "duplicate grab-and-return farmed points"):
			return false
		_report["grabs"].append({"pass": attempt + 1, "pickup": "F" if attempt % 2 == 0 else "button", "distance": distance, "side": side, "aim_rejected": true, "out_of_range_return_rejected": true, "points": 10})
	app.call("_stop_clinic_walk")
	app.call("_practice_game_exit")
	return true

func _procedures(app: Node) -> bool:
	app.call("_switch_view", "journey")
	(_page(app).get_node("KL_OPEN_PROCEDURE_DRILLS") as Button).pressed.emit()
	var before := FileAccess.get_file_as_bytes(JOURNAL)
	var drill: RefCounted = app.get("_procedure_drills")
	for index in range(DRILLS.DRILLS.size()):
		var attempts := 0
		for repetition in range(10):
			var picker := _page(app).get_node("KL_PROCEDURE_DRILL_SELECT") as OptionButton
			picker.select(index)
			picker.item_selected.emit(index)
			if not _check(drill.get("index") == index and drill.call("score") == 0, "drill selection/reset failed"):
				return false
			for stage in range(2):
				(_page(app).get_node("KL_PROCEDURE_DRILL_CHOICE_1") as Button).pressed.emit()
				if not _check(drill.get("stage") == stage and drill.call("score") == stage * 10, "wrong answer advanced the drill"):
					return false
				(_page(app).get_node("KL_PROCEDURE_DRILL_CHOICE_0") as Button).pressed.emit()
				app.call("_choose_procedure_drill", stage, 0)
				if not _check(drill.get("stage") == stage + 1 and drill.call("score") == (stage + 1) * 10, "duplicate or missing drill points"):
					return false
			if not _check(drill.get("errors") == 2, "drill did not record both corrections"):
				return false
			attempts += 1
		_report["procedures"].append({"id": DRILLS.DRILLS[index][0], "name": DRILLS.DRILLS[index][1], "passes": attempts, "score_each": 20})
	return _check(before == FileAccess.get_file_as_bytes(JOURNAL), "procedure drills altered the learner journal")

func _run() -> void:
	root.size = Vector2i(1600, 900)
	var app: Node3D = load("res://app.tscn").instantiate()
	root.add_child(app)
	await process_frame
	if not _designs() or not _grabs(app) or not _procedures(app):
		return
	var args := OS.get_cmdline_user_args()
	if not args.is_empty():
		var out := FileAccess.open(args[0], FileAccess.WRITE)
		if not _check(out != null, "could not write report"):
			return
		_report["source_sha"] = FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
		_report["procedure_journal_unchanged"] = true
		out.store_string(JSON.stringify(_report, "\t") + "\n")
		out.close()
	print("KLINIKLAB_EXPANSION_PASS designs=%d grabs=%d procedure_drills=%d procedure_runs=%d" % [
		_report["designs"].size(), _report["grabs"].size(), _report["procedures"].size(), _report["procedures"].size() * 10])
	quit()
