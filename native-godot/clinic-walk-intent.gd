extends RefCounted
## SR31: pure, bounded desktop clinic-walk intent model.
## Input adapters (keyboard/mouse today, XR controllers later) call these same
## movement/look/activation methods. Decorative CC0 environment has NO
## collision or patient-verified operatory dimensions.
# World-space envelope of the imported 16 × 14 tile floor at (0, -3, -20).
const FLOOR_Y := -3.0
const CEILING_Y := FLOOR_Y + 2.72
const MIN_EYE_HEIGHT := 0.95
const MAX_EYE_HEIGHT := 2.05
const DEFAULT_EYE_HEIGHT := 1.55
const START := Vector3(3.0, FLOOR_Y + DEFAULT_EYE_HEIGHT, -15.0)
const OPERATORY := Vector3(3.0, FLOOR_Y, -20.0)
const LANGUAGE_STATION := Vector3(-3.0, FLOOR_Y, -20.0)
const SPEED := 3.0
const FAST_MULTIPLIER := 1.5 # Optional preview walk pace; NOT real-world calibrated speed
const REACH := 2.4
const MOUSE_SENSITIVITY := 0.0035
const WORLD_MIN := Vector2(-9.65, -27.65)
const WORLD_MAX := Vector2(5.65, -14.35)

var position := START
var yaw := 0.0
var pitch := -0.08

func reset() -> void:
	position = Vector3(START.x, position.y, START.z)
	yaw = 0.0
	pitch = -0.08

func eye_height() -> float:
	return position.y - FLOOR_Y

func set_eye_height(height: float) -> void:
	if is_finite(height):
		position.y = FLOOR_Y + clampf(height, MIN_EYE_HEIGHT, MAX_EYE_HEIGHT)

func apply_move_intent(intent: Vector2, delta: float, fast: bool = false) -> void:
	if not intent.is_finite() or not is_finite(delta) or delta <= 0.0:
		return
	# Avoid diagonal speed gain, teleporting from delayed frames, and walking
	# outside the explicitly bounded source-unverified decorative room area.
	var axes: Vector2 = intent.limit_length(1.0)
	var heading := Basis(Vector3.UP, yaw)
	var offset: Vector3 = heading * Vector3(axes.x, 0.0, -axes.y)
	var pace: float = FAST_MULTIPLIER if fast else 1.0
	var next: Vector3 = position + offset * SPEED * pace * minf(delta, 0.1)
	position = Vector3(clampf(next.x, WORLD_MIN.x, WORLD_MAX.x),
		position.y, clampf(next.z, WORLD_MIN.y, WORLD_MAX.y))

func apply_look_intent(relative: Vector2) -> void:
	if not relative.is_finite():
		return
	yaw = wrapf(yaw - relative.x * MOUSE_SENSITIVITY, -PI, PI)
	pitch = clampf(pitch - relative.y * MOUSE_SENSITIVITY, -1.15, 1.15)

func in_operatory_range() -> bool:
	return _station_distance(OPERATORY) <= REACH

func in_language_station_range() -> bool:
	return _station_distance(LANGUAGE_STATION) <= REACH

# Read-only navigation cues. Distances are arbitrary Godot scene units, NOT
# measured physical metres; this stylized CC0 clinic has no collision model.
func _station_distance(target: Vector3) -> float:
	return Vector2(position.x, position.z).distance_to(Vector2(target.x, target.z))

func _guidance(target: Vector3) -> Dictionary:
	var displacement: Vector3 = target - position
	var local: Vector3 = Basis(Vector3.UP, yaw).inverse() * displacement
	var bearing := "AHEAD"
	if local.z > absf(local.x) * 0.65:
		bearing = "BEHIND"
	elif local.x > absf(local.z) * 0.65:
		bearing = "RIGHT"
	elif local.x < -absf(local.z) * 0.65:
		bearing = "LEFT"
	return {
		"units": _station_distance(target),
		"bearing": bearing,
		"inRange": _station_distance(target) <= REACH
	}

func operatory_guidance() -> Dictionary:
	return _guidance(OPERATORY)

func language_guidance() -> Dictionary:
	return _guidance(LANGUAGE_STATION)
