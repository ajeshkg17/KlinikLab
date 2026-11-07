extends Node3D
## A stylized desktop glove rig and a practice mirror on a return stand.
const REACH := 2.2
const AIM_ALIGNMENT := 0.95105652 # 18 degrees from the camera center.
const FINAL_DESIGN_PASS := 10
const RIGHT_REST := Vector3(0.26, -0.24, -0.63)
const RIGHT_GRIP := Vector3(0.19, -0.18, -0.60)
const DESIGN_NOTES := [
	"Raise the resting hands", "Broaden the palms", "Vary finger proportions",
	"Round the fingertips", "Extend the sleeve cuff", "Give each finger its own curl",
	"Oppose the thumb", "Bring the held mirror toward center",
	"Roll the gripping wrist inward", "Ease both ends of a faster grip"
]

var _stand := Node3D.new()
var _hands := Node3D.new()
var _right: Node3D
var _mirror := Node3D.new()
var _holding := false
var _right_fingers: Array[Node3D] = []
var _right_thumb: Node3D
var _grip := 0.0
var _pose_tween: Tween
var _camera: Camera3D
var _design_pass := FINAL_DESIGN_PASS
var _rest := RIGHT_REST
var _grip_position := RIGHT_GRIP

func setup(camera: Camera3D, station: Vector3, design_pass := FINAL_DESIGN_PASS) -> void:
	_camera = camera
	_design_pass = clampi(design_pass, 0, FINAL_DESIGN_PASS)
	if _design_pass >= 1:
		_rest.y += 0.022
	if _design_pass >= 8:
		_grip_position.x -= 0.032
	add_child(_stand)
	_stand.position = station + Vector3(-0.8, 0.95, 0.65)
	_part(_stand, _box(Vector3(0.52, 0.07, 0.42)), Vector3.ZERO, Color("#469d97"))
	_part(_stand, _box(Vector3(0.12, 0.92, 0.12)), Vector3(0, -0.48, 0), Color("#315568"))
	camera.add_child(_hands)
	_hands.name = "KL_FIRST_PERSON_HANDS"
	_glove(Vector3(-_rest.x, _rest.y, _rest.z), 1.0)
	_right = _glove(_rest, -1.0)
	_part(_mirror, _capsule(0.012, 0.16), Vector3.ZERO, Color("#3a9b98"))
	_part(_mirror, _capsule(0.006, 0.088), Vector3(0, 0.107, 0), Color("#a4b2bd"))
	var rim := _part(_mirror, _cylinder(0.032, 0.010), Vector3(0, 0.165, 0), Color("#718595"))
	rim.rotation.x = PI / 2.0
	var face := _part(_mirror, _cylinder(0.027, 0.004), Vector3(0, 0.165, 0.006), Color("#e4f4ff"))
	face.rotation.x = PI / 2.0
	_stand.add_child(_mirror)
	reset()
	set_active(false)

func _box(size: Vector3) -> BoxMesh:
	var box := BoxMesh.new()
	box.size = size
	return box

func _capsule(radius: float, length: float) -> CapsuleMesh:
	var shape := CapsuleMesh.new()
	shape.radius = radius
	shape.height = length
	shape.radial_segments = 12
	shape.rings = 4
	return shape

func _cylinder(radius: float, height: float) -> CylinderMesh:
	var shape := CylinderMesh.new()
	shape.top_radius = radius
	shape.bottom_radius = radius
	shape.height = height
	shape.radial_segments = 24
	return shape

func _part(parent: Node3D, mesh: Mesh, at: Vector3, color: Color, shaded := false) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	if shaded:
		material.roughness = 0.8
		material.emission_enabled = true
		material.emission = color
		material.emission_energy_multiplier = 0.20
	else:
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	part.material_override = material
	part.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	part.position = at
	parent.add_child(part)
	return part

func _glove(at: Vector3, inward: float) -> Node3D:
	var glove := Node3D.new()
	_hands.add_child(glove)
	glove.position = at
	var sleeve := _part(glove, _capsule(0.059, 0.39), Vector3(-inward * 0.035, -0.10, 0.22), Color("#283c52"), true)
	sleeve.rotation = Vector3(1.95, 0.0, -inward * 0.15)
	var blue := Color("#5188d7")
	var palm := _part(glove, _capsule(0.051 if _design_pass >= 2 else 0.047, 0.142), Vector3(0, 0, 0.018), blue, true)
	palm.rotation.x = PI / 2.0
	palm.scale.z = 0.62
	var cuff := _part(glove, _capsule(0.042, 0.132 if _design_pass >= 5 else 0.113), Vector3(0, -0.018, 0.082), Color("#3965a6"), true)
	cuff.rotation.x = 1.82
	cuff.scale.z = 0.77
	const LENGTHS := [0.081, 0.091, 0.083, 0.064]
	const REFINED_LENGTHS := [0.084, 0.094, 0.081, 0.061]
	for index in range(4):
		var finger := Node3D.new()
		glove.add_child(finger)
		finger.position = Vector3(inward * (0.036 - 0.023 * index), 0.003, -0.033)
		finger.rotation.y = inward * (index - 1.5) * 0.10
		var length: float = REFINED_LENGTHS[index] if _design_pass >= 3 else LENGTHS[index]
		var proximal := _part(finger, _capsule(0.012, length * 0.64), Vector3(0, 0, -length * 0.25), blue, true)
		proximal.rotation.x = PI / 2.0
		var tip := Node3D.new()
		tip.name = "Tip"
		finger.add_child(tip)
		tip.position.z = -length * 0.49
		var distal := _part(tip, _capsule(0.012 if _design_pass >= 4 else 0.0105, length * 0.58), Vector3(0, 0, -length * 0.22), blue, true)
		distal.rotation.x = PI / 2.0
		finger.rotation.x = -0.20 - 0.07 * index
		tip.rotation.x = -0.31
		if inward < 0.0:
			_right_fingers.append(finger)
	var thumb := Node3D.new()
	glove.add_child(thumb)
	thumb.position = Vector3(inward * 0.037, -0.008, 0.026)
	thumb.rotation = Vector3(-0.27, -inward * 0.78, 0.0)
	var thumb_mesh := _part(thumb, _capsule(0.016, 0.068), Vector3(0, 0, -0.020), blue, true)
	thumb_mesh.rotation.x = PI / 2.0
	if inward < 0.0:
		_right_thumb = thumb
	return glove

func set_active(active: bool) -> void:
	_stand.visible = active
	_hands.visible = active

func reset() -> void:
	_place_mirror()
	if _pose_tween != null:
		_pose_tween.kill()
	_apply_right_pose(0.0)

func _place_mirror() -> void:
	_holding = false
	if _mirror.get_parent() != _stand:
		_mirror.reparent(_stand, false)
	_mirror.position = Vector3(0, 0.056, 0)
	_mirror.rotation = Vector3(PI / 2.0, 0, 0)

func _apply_right_pose(grip: float) -> void:
	_grip = grip
	_right.position = _rest.lerp(_grip_position, grip)
	_right.rotation = Vector3(0.13 * grip, -0.19 * grip, (-0.39 if _design_pass >= 9 else -0.27) * grip)
	for index in range(_right_fingers.size()):
		var finger := _right_fingers[index]
		var curl := -0.50 - 0.23 * index if _design_pass >= 6 else -0.67 - 0.16 * index
		finger.rotation.x = lerpf(-0.20 - 0.07 * index, curl, grip)
		var tip := finger.get_node("Tip") as Node3D
		tip.rotation.x = lerpf(-0.31, -0.72 - 0.11 * index, grip)
	_right_thumb.rotation.y = lerpf(0.78, 0.17 if _design_pass >= 7 else 0.30, grip)
	_right_thumb.rotation.x = lerpf(-0.27, -0.65, grip)

func _animate_right_pose(grip: float) -> void:
	if _pose_tween != null:
		_pose_tween.kill()
	_pose_tween = create_tween().set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	_pose_tween.tween_method(_apply_right_pose, _grip, grip, 0.22 if _design_pass >= 10 else 0.24)

func holding() -> bool:
	return _holding

func within_reach(position: Vector3) -> bool:
	return Vector2(position.x, position.z).distance_to(Vector2(_stand.position.x, _stand.position.z)) <= REACH

func interaction_status() -> String:
	if not within_reach(_camera.global_position):
		return "range"
	var target := _stand.global_position + Vector3.UP * 0.09
	var toward := _camera.global_position.direction_to(target)
	if -_camera.global_basis.z.normalized().dot(toward) < AIM_ALIGNMENT:
		return "aim"
	return "ready"

func interact() -> bool:
	if interaction_status() != "ready":
		return false
	if _holding:
		_place_mirror()
		_animate_right_pose(0.0)
	else:
		_holding = true
		_mirror.reparent(_right, false)
		_mirror.position = Vector3(-0.027, -0.024, -0.050)
		_mirror.rotation = Vector3(-0.94, 0.0, 0.30)
		_animate_right_pose(1.0)
	return true

func _exit_tree() -> void:
	if is_instance_valid(_hands) and not _hands.is_queued_for_deletion():
		_hands.queue_free()
