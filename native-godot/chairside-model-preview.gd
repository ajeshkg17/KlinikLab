extends Control
## Source-derived CC0 instrument preview only; displayed size is illustrative.
const DISPLAY_DIAMETER := 1.6
const CAMERA_SIZE := 2.1

var _screen := SubViewportContainer.new()
var _viewport := SubViewport.new()
var _camera := Camera3D.new()
var _orbit := Node3D.new()
var _mount := Node3D.new()
var _fallback := Label.new()
var _model: Node3D
var _dragging := false

func _ready() -> void:
	custom_minimum_size.y = maxf(custom_minimum_size.y, 160.0)
	_screen.stretch = true
	_screen.focus_mode = Control.FOCUS_ALL
	_screen.tooltip_text = "Drag or use the arrow keys to rotate the model."
	add_child(_screen)
	_screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_screen.resized.connect(_frame_model)
	_screen.gui_input.connect(_on_input)
	_screen.mouse_exited.connect(func() -> void: _dragging = false)
	_viewport.own_world_3d = true
	_viewport.render_target_update_mode = SubViewport.UPDATE_WHEN_VISIBLE
	_screen.add_child(_viewport)

	var world := WorldEnvironment.new()
	world.environment = Environment.new()
	world.environment.background_mode = Environment.BG_COLOR
	world.environment.background_color = Color("#1a2835")
	world.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	world.environment.ambient_light_color = Color("#e1ebf1")
	world.environment.ambient_light_energy = 0.5
	_viewport.add_child(world)
	_add_light(Vector3(-34, -27, 0), Color("#ffefdc"), 0.9)
	_add_light(Vector3(-12, 125, 0), Color("#cde6ff"), 0.4)

	_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	_camera.position = Vector3(0, 0, 3)
	_viewport.add_child(_camera)
	_camera.make_current()
	_viewport.add_child(_orbit)
	_orbit.add_child(_mount)

	_fallback.text = "3D model unavailable"
	_fallback.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_fallback.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_fallback.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fallback)
	_fallback.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_frame_model()

func show_model(scene_path: String) -> bool:
	if _model != null:
		_mount.remove_child(_model)
		_model.queue_free()
		_model = null
	_fallback.show()
	if not ResourceLoader.exists(scene_path, "PackedScene"):
		return false
	var scene := load(scene_path) as PackedScene
	if scene == null:
		return false
	var instance := scene.instantiate()
	if not instance is Node3D:
		instance.free()
		return false
	_mount.transform = Transform3D.IDENTITY
	_orbit.rotation = Vector3(-0.20, 0.55, 0)
	_mount.add_child(instance)
	var meshes := instance.find_children("*", "MeshInstance3D", true, false)
	if instance is MeshInstance3D:
		meshes.push_front(instance)
	var bounds := AABB()
	var has_bounds := false
	var to_mount := _mount.global_transform.affine_inverse()
	for mesh: MeshInstance3D in meshes:
		if mesh.mesh == null or not mesh.visible:
			continue
		var mesh_bounds := (to_mount * mesh.global_transform) * mesh.get_aabb()
		bounds = bounds.merge(mesh_bounds) if has_bounds else mesh_bounds
		has_bounds = true
	var diameter := bounds.size.length()
	if not has_bounds or diameter <= 0.0001:
		instance.free()
		return false
	var factor := DISPLAY_DIAMETER / diameter
	_mount.scale = Vector3.ONE * factor
	_mount.position = -bounds.get_center() * factor
	_model = instance as Node3D
	_fallback.hide()
	return true

func turn(delta_radians: float) -> void:
	_orbit.rotation.y = wrapf(_orbit.rotation.y + delta_radians, -PI, PI)

func _frame_model() -> void:
	_camera.size = CAMERA_SIZE * maxf(1.0, _screen.size.y / maxf(1.0, _screen.size.x))

func _add_light(rotation_angles: Vector3, color: Color, energy: float) -> void:
	var light := DirectionalLight3D.new()
	light.rotation_degrees = rotation_angles
	light.light_color = color
	light.light_energy = energy
	_viewport.add_child(light)

func _on_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_dragging = event.pressed
		if _dragging:
			_screen.grab_focus()
			_screen.accept_event()
	elif event is InputEventMouseMotion and _dragging:
		turn(event.relative.x * 0.012)
		_orbit.rotation.x = clampf(_orbit.rotation.x + event.relative.y * 0.012, -1.2, 1.2)
		_screen.accept_event()
	elif event is InputEventKey and event.pressed and event.keycode in [KEY_LEFT, KEY_RIGHT]:
		turn(-0.25 if event.keycode == KEY_LEFT else 0.25)
		_screen.accept_event()
