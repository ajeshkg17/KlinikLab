extends Control
## A local training fixture. All scene mutations belong to the current run.
signal closed

const CATALOG := preload("res://procedure-scenarios.gd")
const HANDS := preload("res://practice-tool-handling.gd")
const RANGE := 4.6
const MASK := 1
const VIEW_START := Vector3(0, 2.15, 3.25)
const MARK := Color("#f6b64c")
const DONE := Color("#63d6aa")
const IVORY := Color("#e9e0cc")

var scenario: Dictionary
var score := 0
var stage := 0
var next_target := 0
var held := false
var events: Array[Dictionary] = []
var run_id := 0
var model_results: Dictionary = {}
var _camera: Camera3D
var _world: Node3D
var _view: SubViewportContainer
var _status: Label
var _feedback: Label
var _progress: Label
var _summary: Label
var _cue: Label
var _actions: HBoxContainer
var _target_picker: OptionButton
var _capture := false
var _pending := ""
var _started_ms := 0
var _targets: Dictionary = {}
var _correct_tool: Node3D
var _tool_home: Node3D
var _hands: HANDS
var _applied: Dictionary = {}
var _camera_start: Transform3D

func start(index: int, hand_design := HANDS.FINAL_DESIGN_PASS) -> void:
	scenario = CATALOG.for_drill(index)
	_started_ms = Time.get_ticks_msec()
	_build_ui()
	_build_scene(hand_design)
	_restart()

func _build_ui() -> void:
	name = "KL_PROCEDURE_LAB"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	var backdrop := ColorRect.new()
	backdrop.color = Color("#101b26")
	add_child(backdrop)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var margin := MarginContainer.new()
	add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 14)
	var layout := VBoxContainer.new()
	layout.add_theme_constant_override("separation", 8)
	margin.add_child(layout)
	var header := HBoxContainer.new()
	layout.add_child(header)
	var title := _label(str(scenario["title"]) + " · 3D practice model", 24)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	_button(header, "Restart", _restart, "KL_PROCEDURE_RESTART")
	_button(header, "Exit simulation", _close, "KL_PROCEDURE_EXIT")
	_status = _label("", 17)
	layout.add_child(_status)
	_progress = _label("", 14)
	_progress.name = "KL_LAB_PROGRESS"
	_progress.add_theme_color_override("font_color", Color("#a6d9f4"))
	layout.add_child(_progress)
	_feedback = _label("", 14)
	_feedback.add_theme_color_override("font_color", Color("#ffce99"))
	layout.add_child(_feedback)
	_summary = _label("", 15)
	_summary.name = "KL_LAB_OUTCOME_SUMMARY"
	_summary.hide()
	layout.add_child(_summary)
	_view = SubViewportContainer.new()
	_view.stretch = true
	_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	layout.add_child(_view)
	var viewport := SubViewport.new()
	viewport.own_world_3d = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_view.add_child(viewport)
	_world = Node3D.new()
	viewport.add_child(_world)
	_cue = _label("+", 27)
	_cue.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_cue.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_cue.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_view.add_child(_cue)
	_cue.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	_actions = HBoxContainer.new()
	layout.add_child(_actions)
	_target_picker = OptionButton.new()
	_target_picker.name = "KL_LAB_TARGETS"
	_target_picker.tooltip_text = "Aim the camera at a labelled target with the keyboard."
	_target_picker.item_selected.connect(_aim_selected_target)
	_actions.add_child(_target_picker)
	_button(_actions, "Pick up / return (F)", _request.bind("grab"), "KL_LAB_GRAB")
	_button(_actions, "Use tool / verify", _request.bind("use"), "KL_LAB_USE")
	var source := LinkButton.new()
	source.name = "KL_LAB_TOPIC_REFERENCE"
	source.text = "Read the topic reference"
	source.uri = scenario["reference"]
	_actions.add_child(source)
	layout.add_child(_label("Click model to look · WASD move · F pick up / return · Click use · Tab controls · Esc release or exit", 14))
	layout.add_child(_label("Fictional training fixture. Points measure the simulation tasks.", 13))
	get_window().focus_exited.connect(_release_mouse)

func _label(value: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = value
	label.add_theme_font_size_override("font_size", font_size)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label

func _button(parent: Node, caption: String, action: Callable, id: String) -> void:
	var button := Button.new()
	button.name = id
	button.text = caption
	button.custom_minimum_size.y = 38
	button.pressed.connect(action)
	parent.add_child(button)

func _build_scene(hand_design: int) -> void:
	var world_env := WorldEnvironment.new()
	world_env.environment = Environment.new()
	world_env.environment.background_mode = Environment.BG_COLOR
	world_env.environment.background_color = Color("#152634")
	world_env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	world_env.environment.ambient_light_color = Color("#d6ebff")
	world_env.environment.ambient_light_energy = 0.8
	_world.add_child(world_env)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-50, -25, 0)
	_world.add_child(light)
	_camera = Camera3D.new()
	_camera.position = VIEW_START
	_camera.fov = 58
	_world.add_child(_camera)
	_camera.look_at(Vector3(0, 0.45, 0))
	_camera.current = true
	_camera_start = _camera.transform
	_solid_box(Vector3(4.6, 0.13, 2.75), Vector3(0, -0.085, 0), Color("#345265"))
	_mesh(_world, _box(Vector3(1.45, 0.07, 0.54)), Vector3(0, 0.02, 0.91), Color("#447b86"))
	_tool_home = _target("tool", Vector3(-0.47, 0.13, 0.91), Color("#79e0d8"), 0.17, str(scenario["tool"]))
	_correct_tool = _instrument(_tool_home, true)
	_instrument(_target("wrong_tool", Vector3(0.47, 0.13, 0.91), Color("#bc8791"), 0.17, "Other instrument"), false)
	_target("return", Vector3(0, 0.09, 0.91), Color("#86abdf"), 0.16, "Return tray")
	_target("verify", Vector3(1.49, 0.18, 0.38), Color("#63ac92"), 0.20, "Verify")
	_target("wrong", Vector3(-1.50, 0.18, 0.36), Color("#858b94"), 0.18, "Unassigned site")
	var a := Vector3(-0.54, 0.63, -0.05)
	var b := Vector3(0.54, 0.63, -0.05)
	match str(scenario["model"]):
		"image", "comparison":
			_solid_box(Vector3(2.45, 1.10, 0.12), Vector3(0, 0.67, -0.42), Color("#526577"))
			for x in [-0.85, -0.30, 0.30, 0.85]:
				_mesh(_world, _box(Vector3(0.38, 0.70, 0.03)), Vector3(x, 0.62, -0.34), Color("#a6b1bb"))
			a = Vector3(-0.54, 0.72, -0.29)
			b = Vector3(0.54, 0.72, -0.29)
		"soft":
			_mesh(_world, _box(Vector3(2.15, 0.24, 1.12)), Vector3(0, 0.22, -0.22), Color("#b97583"))
			a.y = 0.38
			b.y = 0.38
		"crown", "anterior", "implant":
			_tooth(Vector3(0, 0.36, -0.26), 1.55)
			a = Vector3(-0.25, 0.83, -0.07)
			b = Vector3(0.25, 0.76, 0.03)
		"canal", "roots":
			_tooth(Vector3(-0.55, 0.38, -0.22), 1.05)
			_tooth(Vector3(0.55, 0.38, -0.22), 1.05)
			_mesh(_world, _box(Vector3(0.055, 0.55, 0.08)), Vector3(0.54, 0.49, 0.08), Color("#a75974"))
			a = Vector3(-0.54, 0.66, 0.12)
			b = Vector3(0.54, 0.39, 0.14)
		_:
			var base := SphereMesh.new()
			base.radius = 1.1
			base.height = 0.30
			_mesh(_world, base, Vector3(0, 0.14, -0.23), Color("#a86579"))
			for x in [-0.85, -0.44, 0.0, 0.44, 0.85]:
				if scenario["model"] != "gap" or x != 0.0:
					var tooth := _tooth(Vector3(x, 0.31, -0.18 - absf(x) * 0.20), 0.78)
					if scenario["effect"] == "extract" and x == 0.0:
						tooth.name = "ExtractableTooth"
					elif scenario["effect"] == "extract" and absf(x) < 0.5:
						tooth.name = "LeftAdjacentTooth" if x < 0.0 else "RightAdjacentTooth"
			if scenario["effect"] == "extract":
				a = Vector3(0, 0.58, 0.03)
	_target("site_0", a, MARK, 0.15, scenario["actions"][0])
	_target("site_1", b, MARK, 0.15, scenario["actions"][1])
	_hands = HANDS.new()
	_world.add_child(_hands)
	_hands.mount_hands(_camera, hand_design)

func _box(extent: Vector3) -> BoxMesh:
	var result := BoxMesh.new()
	result.size = extent
	return result

func _mesh(parent: Node3D, shape: Mesh, at: Vector3, tint: Color) -> MeshInstance3D:
	var mesh := MeshInstance3D.new()
	mesh.mesh = shape
	var material := StandardMaterial3D.new()
	material.albedo_color = tint
	mesh.material_override = material
	parent.add_child(mesh)
	mesh.position = at
	return mesh

func _solid_box(extent: Vector3, at: Vector3, tint: Color) -> void:
	var body := StaticBody3D.new()
	body.collision_layer = MASK
	body.collision_mask = 0
	_world.add_child(body)
	body.position = at
	var bounds := BoxShape3D.new()
	bounds.size = extent
	var collision := CollisionShape3D.new()
	collision.shape = bounds
	body.add_child(collision)
	_mesh(body, _box(extent), Vector3.ZERO, tint)

func _tooth(at: Vector3, size: float) -> MeshInstance3D:
	var shape := CapsuleMesh.new()
	shape.radius = 0.18 * size
	shape.height = 0.58 * size
	return _mesh(_world, shape, at, IVORY)

func _instrument(parent: Node3D, correct: bool) -> Node3D:
	var body := Node3D.new()
	parent.add_child(body)
	var tint := Color("#75d3c4") if correct else Color("#8f8491")
	if correct and scenario["effect"] == "seat":
		var shape := SphereMesh.new()
		shape.radius = 0.10
		shape.height = 0.13
		_mesh(body, shape, Vector3(0, 0.055, 0), tint)
	else:
		_mesh(body, _box(Vector3(0.043, 0.045, 0.24)), Vector3(0, 0.04, 0), tint)
		_mesh(body, _box(Vector3(0.055, 0.05, 0.073)), Vector3(0, 0.05, -0.125), Color("#d2deea"))
	return body

func _target(id: String, at: Vector3, tint: Color, radius: float, caption: String) -> Node3D:
	var body := StaticBody3D.new()
	body.collision_layer = MASK
	body.collision_mask = 0
	body.set_meta("target", id)
	_world.add_child(body)
	body.position = at
	var sphere := SphereShape3D.new()
	sphere.radius = radius
	var collision := CollisionShape3D.new()
	collision.shape = sphere
	body.add_child(collision)
	var icon := SphereMesh.new()
	icon.radius = radius * 0.45
	icon.height = radius * 0.90
	_mesh(body, icon, Vector3.ZERO, tint)
	var label := Label3D.new()
	label.text = caption
	label.font_size = 32
	label.outline_size = 9
	label.pixel_size = 0.004
	label.position.y = radius + 0.04
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.modulate = Color("#f6faff")
	body.add_child(label)
	_targets[id] = body
	_target_picker.add_item(caption)
	_target_picker.set_item_metadata(_target_picker.item_count - 1, id)
	return body

func _aim_selected_target(index: int) -> void:
	var body: Node3D = _targets[_target_picker.get_item_metadata(index)]
	_camera.look_at(body.global_position)

func _restart() -> void:
	if _camera == null:
		return
	_release_mouse()
	run_id += 1
	events.clear()
	score = 0
	stage = 0
	next_target = 0
	model_results.clear()
	held = false
	_pending = ""
	_feedback.text = ""
	_summary.text = ""
	_summary.hide()
	_camera.transform = _camera_start
	_target_picker.select(-1)
	_place_tool(false, true)
	for node in _applied.values():
		node.hide()
		node.queue_free()
	_applied.clear()
	var tooth := _world.get_node_or_null("ExtractableTooth") as Node3D
	if tooth != null:
		tooth.show()
	for id in ["site_0", "site_1"]:
		(_targets[id] as Node3D).show()
		(_targets[id] as StaticBody3D).collision_layer = MASK
		_set_picker_target_available(id, true)
	_event("restart")
	_show_status("Aim at and pick up " + str(scenario["tool"]) + ".")

func _request(action: String) -> void:
	if _pending.is_empty():
		_pending = action

func _physics_process(delta: float) -> void:
	if _camera == null:
		return
	if _capture:
		var move := Vector3(
			float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A)), 0.0,
			float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W)))
		var next := _camera.position + Basis(Vector3.UP, _camera.rotation.y) * move.normalized() * delta
		_camera.position = Vector3(clampf(next.x, -2.0, 2.0), VIEW_START.y, clampf(next.z, 1.50, 4.5))
	var id := _aimed_target()
	var expected := "tool" if stage == 0 else "site_%d" % next_target if stage == 1 else "return" if held else "verify"
	_cue.modulate = DONE if id == expected and stage < 3 else Color.WHITE
	if not _pending.is_empty():
		var action := _pending
		_pending = ""
		_apply_action(action, id)

func _aimed_target() -> String:
	var origin := _camera.global_position
	var end := origin - _camera.global_basis.z * RANGE
	var query := PhysicsRayQueryParameters3D.create(origin, end, MASK)
	var hit := _camera.get_world_3d().direct_space_state.intersect_ray(query)
	var collider: Object = hit.get("collider")
	return str(collider.get_meta("target", "")) if collider != null else ""

func _apply_action(action: String, id: String) -> void:
	_feedback.text = ""
	if stage == 0 and action == "grab" and id == "tool":
		_place_tool(true)
		score = 5
		stage = 1
		_event("tool_acquired", id)
		_show_status(scenario["actions"][0])
	elif stage == 1 and action == "use" and id == "site_%d" % next_target:
		_change_model(id)
		next_target += 1
		_event("model_action", id)
		if next_target == scenario["actions"].size():
			score += 10
			stage = 2
			_show_status("Return the tool to the tray. Then aim at Verify and use.")
		else:
			_show_status(scenario["actions"][next_target])
	elif stage == 2 and held and action == "grab" and id == "return":
		_place_tool(false)
		_event("tool_returned", id)
		_show_status("Aim at Verify and use.")
	elif stage == 2 and not held and action == "use" and id == "verify" and _verify_model():
		stage = 3
		score += 5
		_event("complete", id)
		_summary.text = "Verified model actions: %s · %s" % [model_results["site_0"], model_results["site_1"]]
		_summary.show()
		_show_status("Simulation complete. Restart for a new run.")
	else:
		var reason := _rejection_reason(action, id)
		_event("rejected_" + action, id, reason)
		_feedback.text = reason

func _rejection_reason(action: String, id: String) -> String:
	if stage == 3:
		return "This run is complete. Restart to practise again."
	if id.is_empty():
		return "The crosshair must reach a visible target."
	if stage == 0:
		return "Select the assigned instrument: " + str(scenario["tool"]) + "."
	if stage == 1:
		return "Complete the highlighted model action before moving on."
	if held and action == "use":
		return "Return the instrument to the blue tray before verifying."
	if stage == 2 and id == "verify":
		return "Model check failed. Inspect the assigned sites or restart the simulation."
	return "Aim at the next target shown above."

func _place_tool(in_hand: bool, immediately := false) -> void:
	held = in_hand
	var parent := _hands.right_hand() if held else _tool_home
	if _correct_tool.get_parent() != parent:
		_correct_tool.reparent(parent, false)
	_correct_tool.position = Vector3(-0.026, -0.046, -0.064) if held else Vector3.ZERO
	_correct_tool.rotation = Vector3(-0.23, 0.25, 0.0) if held else Vector3.ZERO
	_hands.pose_grip(held, immediately)

func _change_model(id: String) -> void:
	var site: Node3D = _targets[id]
	site.hide()
	(site as StaticBody3D).collision_layer = 0
	_set_picker_target_available(id, false)
	var result := str(scenario["actions"][next_target])
	model_results[id] = result
	match str(scenario["effect"]):
		"remove":
			return
		"extract":
			var tooth := _world.get_node_or_null("ExtractableTooth") as Node3D
			if next_target == 0 and tooth != null:
				tooth.hide()
		"restore":
			if next_target == 0:
				return
	if scenario["effect"] == "seat" and next_target == 0:
		_applied[id] = _seated_appliance(site.position)
	elif scenario["effect"] == "mark":
		var label := Label3D.new()
		label.text = ["Model reading A", "Model reading B"][next_target] if scenario["id"] == "chart" else "Marked"
		label.font_size = 30
		label.pixel_size = 0.004
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.modulate = DONE
		_world.add_child(label)
		label.position = site.position
		_applied[id] = label
	else:
		var patch := SphereMesh.new()
		patch.radius = 0.12
		patch.height = 0.055
		_applied[id] = _mesh(_world, patch, site.position, IVORY if scenario["effect"] == "restore" else DONE)

func _seated_appliance(at: Vector3) -> Node3D:
	var piece := Node3D.new()
	_world.add_child(piece)
	piece.position = at
	var sites: Array[Vector3] = [Vector3.ZERO]
	var tint := IVORY
	var width := 0.34
	match str(scenario["id"]):
		"veneer":
			width = 0.17
		"inlay":
			width = 0.21
		"bridge":
			sites = [Vector3(-0.24, 0, 0), Vector3.ZERO, Vector3(0.24, 0, 0)]
		"full_denture", "partial_denture", "aligner", "mouthguard":
			piece.position.x = 0
			sites = [Vector3(-0.52, 0, -0.11), Vector3(-0.26, 0, -0.02), Vector3.ZERO,
				Vector3(0.26, 0, -0.02), Vector3(0.52, 0, -0.11)]
			if scenario["id"] == "partial_denture":
				sites.resize(3)
			tint = Color("#83b9e2") if scenario["id"] in ["aligner", "mouthguard"] else Color("#e7abb3")
		"implant":
			_mesh(piece, _box(Vector3(0.09, 0.21, 0.09)), Vector3(0, -0.12, 0), Color("#a5aeb7"))
	for offset in sites:
		var contour := SphereMesh.new()
		contour.radius = width * 0.5
		contour.height = 0.15
		_mesh(piece, contour, offset, tint)
	return piece

func _verify_model() -> bool:
	if model_results.size() != scenario["actions"].size():
		return false
	for index in range(scenario["actions"].size()):
		var id := "site_%d" % index
		var site: StaticBody3D = _targets[id]
		if site.visible or site.collision_layer != 0:
			return false
		var expects_placement: bool = scenario["effect"] != "remove" and (scenario["effect"] != "restore" or index == 1)
		if expects_placement:
			var piece: Node3D = _applied.get(id)
			if not is_instance_valid(piece) or not piece.is_visible_in_tree():
				return false
	if scenario["effect"] == "extract":
		var tooth := _world.get_node_or_null("ExtractableTooth") as Node3D
		var left := _world.get_node_or_null("LeftAdjacentTooth") as Node3D
		var right := _world.get_node_or_null("RightAdjacentTooth") as Node3D
		return tooth != null and not tooth.visible and left != null and left.visible and right != null and right.visible
	return true

func _set_picker_target_available(id: String, enabled: bool) -> void:
	for index in range(_target_picker.item_count):
		if _target_picker.get_item_metadata(index) == id:
			_target_picker.set_item_disabled(index, not enabled)
			return

func _show_status(message: String) -> void:
	_status.text = "%d/20 points · %s" % [score, message]
	var step := "1/4 · Acquire instrument"
	if stage == 1:
		step = "2/4 · Model actions %d/%d" % [next_target, scenario["actions"].size()]
	elif stage == 2:
		step = "3/4 · Return instrument" if held else "4/4 · Verify the model"
	elif stage == 3:
		step = "4/4 · Verified"
	_progress.text = step
	var next := "tool" if stage == 0 else "site_%d" % next_target if stage == 1 else "return" if held else "verify"
	for id in _targets:
		var target: Node3D = _targets[id]
		var label := target.get_child(2) as Label3D
		label.modulate = Color("#d0ffe4") if id == next and stage < 3 else Color("#acbfcb")

func _event(name: String, target := "", reason := "") -> void:
	events.append({"event": name, "target": target, "stage": stage, "score": score,
		"run_id": run_id,
		"model_result": model_results.get(target, ""),
		"reason": reason,
		"elapsed_ms": Time.get_ticks_msec() - _started_ms, "frame": Engine.get_process_frames()})

func handle_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		var key: Key = event.physical_keycode if event.physical_keycode != 0 else event.keycode
		match key:
			KEY_ESCAPE:
				if _capture:
					_release_mouse()
				else:
					_close()
			KEY_F:
				_request("grab")
			KEY_TAB:
				if _capture:
					_release_mouse()
					_target_picker.grab_focus()
				else:
					return
			_:
				return
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and _capture:
		_camera.rotation.y -= event.screen_relative.x * 0.003
		_camera.rotation.x = clampf(_camera.rotation.x - event.screen_relative.y * 0.003, -1.35, 0.55)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if _capture:
			_request("use")
		elif _view.get_global_rect().has_point(event.position):
			_capture = true
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			_actions.hide()
		else:
			return
		get_viewport().set_input_as_handled()

func _release_mouse() -> void:
	if _capture:
		_capture = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		_actions.show()

func _close() -> void:
	_release_mouse()
	closed.emit()
	queue_free()

func _exit_tree() -> void:
	_release_mouse()
