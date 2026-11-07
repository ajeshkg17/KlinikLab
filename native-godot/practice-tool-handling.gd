extends Node3D
## A stylized desktop glove rig and a practice mirror on a return stand.
const REACH := 2.2

var _stand := Node3D.new()
var _hands := Node3D.new()
var _right: Node3D
var _mirror := Node3D.new()
var _holding := false

func setup(camera: Camera3D, station: Vector3) -> void:
	add_child(_stand)
	_stand.position = station + Vector3(-0.8, 0.95, 0.65)
	_part(_stand, _box(Vector3(0.52, 0.07, 0.42)), Vector3.ZERO, Color("#469d97"))
	_part(_stand, _box(Vector3(0.12, 0.92, 0.12)), Vector3(0, -0.48, 0), Color("#315568"))
	camera.add_child(_hands)
	_hands.name = "KL_FIRST_PERSON_HANDS"
	_glove(Vector3(-0.26, -0.24, -0.63), 1.0)
	_right = _glove(Vector3(0.26, -0.24, -0.63), -1.0)
	_part(_mirror, _box(Vector3(0.024, 0.17, 0.026)), Vector3.ZERO, Color("#49dfd4"))
	_part(_mirror, _box(Vector3(0.017, 0.09, 0.017)), Vector3(0, 0.11, 0), Color("#9eb0c1"))
	_part(_mirror, _box(Vector3(0.062, 0.05, 0.013)), Vector3(0, 0.16, 0), Color("#eef5ff"))
	_stand.add_child(_mirror)
	reset()
	set_active(false)

func _box(size: Vector3) -> BoxMesh:
	var box := BoxMesh.new()
	box.size = size
	return box

func _part(parent: Node3D, mesh: Mesh, at: Vector3, color: Color) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	var material := StandardMaterial3D.new()
	material.albedo_color = color
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
	var forearm := CapsuleMesh.new()
	forearm.radius = 0.059
	forearm.height = 0.39
	var sleeve := _part(glove, forearm, Vector3(-inward * 0.035, -0.10, 0.22), Color("#283c52"))
	sleeve.rotation = Vector3(1.95, 0.0, -inward * 0.15)
	var blue := Color("#4276c4")
	_part(glove, _box(Vector3(0.102, 0.066, 0.105)), Vector3.ZERO, blue)
	_part(glove, _box(Vector3(0.091, 0.062, 0.098)), Vector3(0, -0.02, 0.079), Color("#315797"))
	for finger in range(4):
		_part(glove, _box(Vector3(0.016, 0.032, 0.056)), Vector3(-0.028 + 0.019 * finger, 0, -0.066), blue)
	_part(glove, _box(Vector3(0.030, 0.034, 0.053)), Vector3(inward * 0.050, 0.008, -0.015), blue)
	return glove

func set_active(active: bool) -> void:
	_stand.visible = active
	_hands.visible = active

func reset() -> void:
	_holding = false
	if _mirror.get_parent() != _stand:
		_mirror.reparent(_stand, false)
	_mirror.position = Vector3(0, 0.056, 0)
	_mirror.rotation = Vector3(PI / 2.0, 0, 0)
	_right.rotation = Vector3.ZERO

func holding() -> bool:
	return _holding

func within_reach(position: Vector3) -> bool:
	return Vector2(position.x, position.z).distance_to(Vector2(_stand.position.x, _stand.position.z)) <= REACH

func interact(position: Vector3) -> bool:
	if not within_reach(position):
		return false
	if _holding:
		reset()
	else:
		_holding = true
		_mirror.reparent(_right, false)
		_mirror.position = Vector3(-0.020, 0.033, -0.054)
		_mirror.rotation = Vector3(-0.72, 0, 0.38)
		_right.rotation.z = -0.18
	return true

func _exit_tree() -> void:
	if is_instance_valid(_hands) and not _hands.is_queued_for_deletion():
		_hands.queue_free()
