extends Control
## A local training fixture. All scene mutations belong to the current run.
signal closed

const CATALOG := preload("res://procedure-scenarios.gd")
const HANDS := preload("res://practice-tool-handling.gd")
const MOLAR_REFERENCE := preload("res://tooth36-reference.gd")
const NEIGHBOUR_REFERENCE := preload("res://tooth-training-neighbour.gd")
const EXTRACTION_GUM := preload("res://extraction-gum-fixture.gd")
const DUNDEE_COLLECTION_URL := "https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f"
const RANGE := 4.6
const MASK := 1
const VIEW_START := Vector3(0, 2.15, 3.25)
const CHAIR_FIXTURE_HEIGHT := 1.05
const CHAIR_SCALE := 0.56
const CHAIR_START_Z := 2.25
const CHAIR_MIN_EYE := 1.30
const CHAIR_MAX_EYE := 1.85
const CHAIR_FOCUS := Vector3(0, 0.60, 0)
const MARK := Color("#f6b64c")
const DONE := Color("#63d6aa")
const IVORY := Color("#e9e0cc")
const PULL_SECONDS := 0.85
const JAW_OPEN := 0.20

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
var _active_target_caption: Label
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
var _clinic_world: World3D
var _chair_origin := Vector3.ZERO
var _eye_height := 1.55
var _jaw: Node3D
var _tooth_model: Node3D
var _tooth_credit: LinkButton
var _gum_fixture: Node3D
var _tooth_rest := Transform3D.IDENTITY
var _neighbour_rests: Dictionary = {}
var _jaw_open := true
var _pull_held := false
var _pulling := false
var _pull_progress := 0.0
var _pull_button: Button

func start(index: int, hand_design := HANDS.FINAL_DESIGN_PASS, clinic_world: World3D = null, chair_origin := Vector3.ZERO, eye_height := 1.55) -> void:
	scenario = CATALOG.for_drill(index)
	_clinic_world = clinic_world
	_chair_origin = chair_origin
	_eye_height = clampf(eye_height, CHAIR_MIN_EYE, CHAIR_MAX_EYE)
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
	# The title must yield width to the eye-height control on 1280 px windows.
	title.autowrap_mode = TextServer.AUTOWRAP_OFF
	title.clip_text = true
	title.tooltip_text = title.text
	header.add_child(title)
	if _clinic_world != null:
		var eye_label := _label("Eye height", 14)
		eye_label.name = "KL_LAB_EYE_HEIGHT_LABEL"
		eye_label.autowrap_mode = TextServer.AUTOWRAP_OFF
		eye_label.custom_minimum_size.x = 90.0
		header.add_child(eye_label)
		var height := SpinBox.new()
		height.name = "KL_LAB_EYE_HEIGHT"
		height.custom_minimum_size.x = 116.0
		height.min_value = CHAIR_MIN_EYE
		height.max_value = CHAIR_MAX_EYE
		height.step = 0.01
		height.value = _eye_height
		height.suffix = "m"
		height.value_changed.connect(_set_eye_height)
		header.add_child(height)
	_button(header, "Restart", _restart, "KL_PROCEDURE_RESTART")
	_button(header, "Exit simulation", _close, "KL_PROCEDURE_EXIT")
	_status = _label("", 17)
	layout.add_child(_status)
	_progress = _label("", 14)
	_progress.name = "KL_LAB_PROGRESS"
	_progress.add_theme_color_override("font_color", Color("#a6d9f4"))
	layout.add_child(_progress)
	# A fixed instruction row outside the 3D canvas remains legible while
	# the camera moves or zooms, unlike a world-space Label3D billboard.
	_active_target_caption = _label("", 15)
	_active_target_caption.name = "KL_LAB_ACTIVE_TARGET_CAPTION"
	_active_target_caption.autowrap_mode = TextServer.AUTOWRAP_OFF
	_active_target_caption.clip_text = true
	_active_target_caption.add_theme_color_override("font_color", Color("#d0ffe4"))
	layout.add_child(_active_target_caption)
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
	viewport.own_world_3d = _clinic_world == null
	if _clinic_world != null:
		viewport.world_3d = _clinic_world
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_view.add_child(viewport)
	_world = Node3D.new()
	viewport.add_child(_world)
	if _clinic_world != null:
		_world.position = _chair_origin + Vector3(0.0, CHAIR_FIXTURE_HEIGHT, 0.43)
		_world.scale = Vector3.ONE * CHAIR_SCALE
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
	if scenario["effect"] == "extract":
		_pull_button = Button.new()
		_pull_button.name = "KL_LAB_PULL"
		_pull_button.text = "Hold to pull (Space)"
		_pull_button.button_down.connect(_begin_pull)
		_pull_button.button_up.connect(_end_pull)
		_actions.add_child(_pull_button)
		_button(_actions, "Open / close jaw (J)", _toggle_jaw, "KL_LAB_JAW")
	var source := LinkButton.new()
	source.name = "KL_LAB_TOPIC_REFERENCE"
	source.text = "Read the topic reference"
	source.uri = scenario["reference"]
	_actions.add_child(source)
	var controls := "Click model to look · WASD move · F pick up / return · Click use · Tab controls · Esc release or exit"
	if scenario["effect"] == "extract":
		controls += " · J opens or closes jaw · Hold click or Space to pull"
	layout.add_child(_label(controls, 14))
	layout.add_child(_label("Fictional training fixture. Points measure the simulation tasks.", 13))
	if scenario["effect"] == "extract":
		_tooth_credit = LinkButton.new()
		_tooth_credit.name = "KL_LAB_TOOTH_CREDIT"
		_tooth_credit.uri = DUNDEE_COLLECTION_URL
		layout.add_child(_tooth_credit)
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
	if _clinic_world == null:
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
	_camera.position = VIEW_START if _clinic_world == null else Vector3(0, _chair_eye_y(), CHAIR_START_Z)
	_camera.fov = 58
	_world.add_child(_camera)
	_camera.look_at(_world.to_global(Vector3(0, 0.45, 0) if _clinic_world == null else CHAIR_FOCUS))
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
			if scenario["effect"] == "extract":
				_jaw = Node3D.new()
				_jaw.name = "HingedTrainingJaw"
				_world.add_child(_jaw)
				_jaw.position = Vector3(0, 0.22, -0.66)
				# Noninteractive shaped synthetic gingiva and exposed central
				# socket; all aiming remains on the existing _targets bodies.
				_gum_fixture = EXTRACTION_GUM.new()
				_world.add_child(_gum_fixture)
				_gum_fixture.call("build")
				_gum_fixture.reparent(_jaw)
			else:
				var base := SphereMesh.new()
				base.radius = 1.1
				base.height = 0.30
				_mesh(_world, base, Vector3(0, 0.14, -0.23), Color("#a86579"))
			for x in [-0.85, -0.44, 0.0, 0.44, 0.85]:
				if scenario["model"] != "gap" or x != 0.0:
					var at := Vector3(x, 0.31, -0.18 - absf(x) * 0.20)
					var tooth: Node3D
					if scenario["effect"] == "extract" and x == 0.0:
						tooth = _extraction_molar(at)
					elif scenario["effect"] == "extract" and absf(x) < 0.5:
						# Positions are illustrative; identities are exact source teeth.
						tooth = _extraction_neighbour(at, "35" if x < 0.0 else "37")
					else:
						tooth = _tooth(at, 0.78)
					if _jaw != null:
						tooth.reparent(_jaw)
					if scenario["effect"] == "extract" and x == 0.0:
						tooth.name = "ExtractableTooth"
						_tooth_model = tooth
						_tooth_rest = tooth.transform
					elif scenario["effect"] == "extract" and absf(x) < 0.5:
						tooth.name = "LeftAdjacentTooth" if x < 0.0 else "RightAdjacentTooth"
						_neighbour_rests[tooth] = tooth.transform
			if scenario["effect"] == "extract":
				a = Vector3(0, 0.58, 0.03)
				_mesh(_world, _box(Vector3(0.29, 0.035, 0.30)), Vector3(0.87, 0.08, 0.79), Color("#456f82"))
				if _tooth_credit != null and not _tooth_credit.disabled:
					_tooth_credit.text = "FDI 35, 36, 37 · University of Dundee, School of Dentistry · CC BY 4.0 · illustrative seating, synthetic gingiva/socket and outer teeth"
	_target("site_0", a, MARK, 0.15, scenario["actions"][0])
	_target("site_1", b, MARK, 0.15, scenario["actions"][1])
	if _jaw != null:
		for id in ["site_0", "site_1"]:
			(_targets[id] as Node3D).reparent(_jaw)
	_hands = HANDS.new()
	_world.add_child(_hands)
	_hands.mount_hands(_camera, hand_design)

func _extraction_molar(at: Vector3) -> Node3D:
	var molar := MOLAR_REFERENCE.new()
	var source_sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	if not molar.configure(source_sha, 0.58 * 0.78) or not molar.summary()["texturePreserved"]:
		push_warning(str(molar.summary()["error"]))
		molar.free()
		_tooth_credit.text = "Anatomical asset unavailable · simplified training tooth shown"
		_tooth_credit.disabled = true
		return _tooth(at, 0.78)
	molar.position = at
	_world.add_child(molar)
	_tooth_credit.text = "FDI 36 surface adapted from University of Dundee, School of Dentistry · CC BY 4.0"
	var light := OmniLight3D.new()
	light.position = Vector3(-0.4, 0.95, 0.55)
	light.omni_range = 0.9
	light.light_energy = 0.38
	light.light_cull_mask = MOLAR_REFERENCE.TRAINING_LIGHT_LAYER
	_world.add_child(light)
	return molar

func _extraction_neighbour(at: Vector3, fdi: String) -> Node3D:
	var neighbour := NEIGHBOUR_REFERENCE.new()
	var source_sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var height := 0.40 if fdi == "35" else 0.46
	if not neighbour.configure(source_sha, fdi, height, 0.37):
		push_warning(str(neighbour.summary()["error"]))
		neighbour.free()
		if _tooth_credit != null:
			_tooth_credit.text = "Dundee FDI%s neighbour unavailable · simplified training tooth used" % fdi
			_tooth_credit.disabled = true
		var fallback := _tooth(at, 0.78)
		fallback.set_meta("fdi", fdi)
		fallback.set_meta("illustrative_fallback", true)
		return fallback
	neighbour.position = at
	_world.add_child(neighbour)
	return neighbour

func _chair_eye_y() -> float:
	return (_eye_height - CHAIR_FIXTURE_HEIGHT) / CHAIR_SCALE

func _set_eye_height(height: float) -> void:
	_eye_height = clampf(height, CHAIR_MIN_EYE, CHAIR_MAX_EYE)
	_camera.position.y = _chair_eye_y()
	_camera_start.origin.y = _camera.position.y
	_camera_start.basis = Basis.looking_at(CHAIR_FOCUS - _camera_start.origin)

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
	if correct and scenario["effect"] == "extract":
		for side in [-1.0, 1.0]:
			var handle := _mesh(body, _box(Vector3(0.028, 0.033, 0.21)), Vector3(side * 0.024, 0.04, 0.024), tint)
			handle.rotation.y = side * 0.14
			var beak := _mesh(body, _box(Vector3(0.024, 0.026, 0.10)), Vector3(side * 0.017, 0.047, -0.111), Color("#d2deea"))
			beak.rotation.y = -side * 0.22
	elif correct and scenario["effect"] == "seat":
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
	_pull_held = false
	_pulling = false
	_pull_progress = 0.0
	for node in _applied.values():
		node.hide()
		node.queue_free()
	_applied.clear()
	if _jaw != null:
		_jaw_open = true
		_jaw.rotation.x = JAW_OPEN
		if _tooth_model.get_parent() != _jaw:
			_tooth_model.reparent(_jaw, false)
		_tooth_model.transform = _tooth_rest
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
		# In the shared clinic the corridor wall runs immediately behind this stance.
		var chair_view := _clinic_world != null
		var lateral := 1.20 if chair_view else 2.0
		var nearest := 1.68 if chair_view else 1.50
		var farthest := 2.42 if chair_view else 4.5
		_camera.position = Vector3(clampf(next.x, -lateral, lateral), _camera.position.y, clampf(next.z, nearest, farthest))
	var id := _aimed_target()
	var expected := "tool" if stage == 0 else "site_%d" % next_target if stage == 1 else "return" if held else "verify"
	_cue.modulate = DONE if id == expected and stage < 3 else Color.WHITE
	if not _pending.is_empty():
		var action := _pending
		_pending = ""
		_apply_action(action, id)
	if _jaw != null:
		_jaw.rotation.x = move_toward(_jaw.rotation.x, JAW_OPEN if _jaw_open else 0.0, delta * 1.3)
		_update_pull(id, delta)

func _aimed_target() -> String:
	var origin := _camera.global_position
	var end := origin - _camera.global_basis.z.normalized() * world_reach()
	var query := PhysicsRayQueryParameters3D.create(origin, end, MASK)
	var hit := _camera.get_world_3d().direct_space_state.intersect_ray(query)
	var collider: Object = hit.get("collider")
	return str(collider.get_meta("target", "")) if collider != null else ""

func world_reach() -> float:
	return _world.global_basis.z.length() * RANGE

func _is_extraction_step() -> bool:
	return _jaw != null and stage == 1 and next_target == 0 and held

func _toggle_jaw() -> void:
	if _jaw == null:
		return
	_jaw_open = not _jaw_open
	_end_pull()
	_event("jaw_open" if _jaw_open else "jaw_close")

func _begin_pull() -> void:
	if _is_extraction_step():
		_pull_held = true

func _end_pull() -> void:
	_pull_held = false
	if _pulling:
		_pulling = false
		_event("pull_paused", "site_0")
		_feedback.text = "Pull paused at %d%%. Hold again to continue." % roundi(_pull_progress * 100.0)

func _update_pull(id: String, delta: float) -> void:
	if not _pull_held:
		return
	var rejection := ""
	if not _is_extraction_step():
		rejection = "Complete the instrument step before starting the extraction."
	elif id != "site_0":
		rejection = "Aim the forceps at the assigned tooth, not an adjacent tooth."
	elif not _jaw_open or _jaw.rotation.x < JAW_OPEN * 0.8:
		rejection = "Open the jaw fully, then aim the forceps at the assigned tooth."
	if not rejection.is_empty():
		_end_pull()
		_feedback.text = rejection
		_event("rejected_pull", id, _feedback.text)
		return
	if not _pulling:
		_pulling = true
		_event("pull_started", id)
	var game_speed := lerpf(0.68, 1.32, _pull_progress)
	_pull_progress = minf(1.0, _pull_progress + delta * game_speed / PULL_SECONDS)
	var path := Vector3(0, 0.39, 0.13)
	_tooth_model.position = _tooth_rest.origin + path * _pull_progress
	_feedback.text = "Correct tooth contact · release path %d%%" % roundi(_pull_progress * 100.0)
	if _pull_progress >= 1.0:
		_pull_held = false
		_pulling = false
		_event("tooth_released", id)
		_apply_action("use", id)

func _apply_action(action: String, id: String) -> void:
	_feedback.text = ""
	if stage == 0 and action == "grab" and id == "tool":
		_place_tool(true)
		score = 5
		stage = 1
		_event("tool_acquired", id)
		_show_status("Aim at the assigned tooth and hold to pull." if _is_extraction_step() else scenario["actions"][0])
	elif stage == 1 and action == "use" and id == "site_%d" % next_target and (not _is_extraction_step() or _pull_progress >= 1.0):
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
		if scenario["effect"] == "extract":
			return "Extraction check failed. Confirm the assigned tooth is released and both adjacent teeth remain in place, then verify again."
		return "Model check failed. Inspect the assigned sites or restart the simulation."
	return "Aim at the next target shown above."

func _place_tool(in_hand: bool, immediately := false) -> void:
	held = in_hand
	var parent := _hands.right_hand() if held else _tool_home
	if _correct_tool.get_parent() != parent:
		_correct_tool.reparent(parent, false)
	var kind := str(scenario["effect"])
	_correct_tool.transform = _hands.instrument_pose(kind) if held else Transform3D.IDENTITY
	_hands.pose_grip(held, immediately, kind)

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
			if next_target == 0:
				_tooth_model.reparent(_world, false)
				_tooth_model.position = Vector3(0.87, 0.24, 0.79)
				_tooth_model.rotation.z = PI * 0.5
		"restore":
			if next_target == 0:
				return
	if scenario["effect"] == "seat" and next_target == 0:
		_applied[id] = _seated_appliance(_world.to_local(site.global_position))
	elif scenario["effect"] == "mark":
		var label := Label3D.new()
		label.text = ["Model reading A", "Model reading B"][next_target] if scenario["id"] == "chart" else "Marked"
		label.font_size = 30
		label.pixel_size = 0.004
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.modulate = DONE
		_world.add_child(label)
		label.position = _world.to_local(site.global_position)
		_applied[id] = label
	else:
		var patch := SphereMesh.new()
		patch.radius = 0.12
		patch.height = 0.055
		_applied[id] = _mesh(_world, patch, _world.to_local(site.global_position), IVORY if scenario["effect"] == "restore" else DONE)

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
		if _tooth_model.get_parent() != _world or not _tooth_model.position.is_equal_approx(Vector3(0.87, 0.24, 0.79)):
			return false
		for neighbour in _neighbour_rests:
			if neighbour.get_parent() != _jaw or not neighbour.visible or not neighbour.transform.is_equal_approx(_neighbour_rests[neighbour]):
				return false
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
	if _pull_button != null:
		_pull_button.disabled = not _is_extraction_step()
	var next := "tool" if stage == 0 else "site_%d" % next_target if stage == 1 else "return" if held else "verify"
	var show_target: bool = stage < 3 and _targets.has(next)
	_active_target_caption.visible = show_target
	if show_target:
		var current_label: Label3D = (_targets[next] as Node3D).get_child(2) as Label3D
		_active_target_caption.text = "Current target · " + current_label.text
		_active_target_caption.tooltip_text = _active_target_caption.text
	else:
		_active_target_caption.text = ""
	# Keep the original Label3D nodes for target provenance, but do not draw
	# billboards over the teeth. The target spheres, collisions and picker
	# still use exactly their original IDs and positions.
	for id in _targets:
		var target: Node3D = _targets[id]
		var label := target.get_child(2) as Label3D
		label.visible = false

func _event(name: String, target := "", reason := "") -> void:
	events.append({"event": name, "target": target, "stage": stage, "score": score,
		"pull_progress": _pull_progress,
		"run_id": run_id,
		"model_result": model_results.get(target, ""),
		"reason": reason,
		"elapsed_ms": Time.get_ticks_msec() - _started_ms, "frame": Engine.get_process_frames()})

func handle_input(event: InputEvent) -> void:
	if event is InputEventKey and event.physical_keycode == KEY_SPACE and _jaw != null:
		if event.pressed and not event.echo:
			_begin_pull()
		elif not event.pressed:
			_end_pull()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventMouseButton and not event.pressed and event.button_index == MOUSE_BUTTON_LEFT and _capture:
		_end_pull()
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
			KEY_J:
				_toggle_jaw()
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
			if _is_extraction_step():
				_begin_pull()
			else:
				_request("use")
		elif _view.get_global_rect().has_point(event.position):
			_capture = true
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			_actions.hide()
		else:
			return
		get_viewport().set_input_as_handled()

func _release_mouse() -> void:
	_end_pull()
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
