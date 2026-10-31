extends Node3D
## SR1C native Godot clinic WORKSPACE PROTOTYPE, not the complete KlinikLab application.
## Fixed, synthetic geometry authored in-repository; no third-party asset download.
## Attaches behind exact-source FDI16 before/after mesh in a native Vulkan scene.

const BG := Color(0.075, 0.11, 0.16)
const STEEL := Color(0.40, 0.49, 0.55)
const CERAMIC := Color(0.83, 0.86, 0.84)
const BLUE := Color(0.19, 0.38, 0.55)
const DARK := Color(0.12, 0.16, 0.22)
const TEAL := Color(0.23, 0.58, 0.59)

func _ready() -> void:
	name = "KL_GODOT_NATIVE_CLINIC_WORKSPACE_PROTOTYPE"
	_make_room()
	_make_preparation_stations()
	_make_dental_chair()
	_make_instrument_table()
	_make_overhead_light()
	_make_screens()
	_make_hud()

func _material(color: Color, metallic: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.49
	mat.metallic = metallic
	return mat

func _box(label: String, size: Vector3, at: Vector3, color: Color, metallic: float = 0.0) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var node := MeshInstance3D.new()
	node.name = label
	node.mesh = mesh
	node.material_override = _material(color, metallic)
	node.position = at
	add_child(node)
	return node

func _cylinder(label: String, height: float, radius: float, at: Vector3, color: Color) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.height = height
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.radial_segments = 20
	var node := MeshInstance3D.new()
	node.name = label
	node.mesh = mesh
	node.material_override = _material(color, 0.26)
	node.position = at
	add_child(node)
	return node

func _text(label: String, words: String, at: Vector3, size: int = 30, color: Color = Color.WHITE) -> Label3D:
	var node := Label3D.new()
	node.name = label
	node.text = words
	node.font_size = size
	node.pixel_size = 0.005
	node.modulate = color
	node.position = at
	add_child(node)
	return node

func _make_room() -> void:
	_box("KL_ROOM_FLOOR", Vector3(28.0, 0.2, 19.0), Vector3(0, -3.65, -1), Color(0.19, 0.24, 0.28))
	_box("KL_ROOM_BACK_WALL", Vector3(28.0, 11, 0.22), Vector3(0, 1.8, -10.2), Color(0.14, 0.19, 0.24))
	_box("KL_ROOM_WALL_BAND", Vector3(28.0, 0.12, 0.27), Vector3(0, 2.95, -10.0), TEAL)
	_box("KL_CLINIC_LEFT_CABINET", Vector3(3.3, 2.0, 2.3), Vector3(-11.3, -2.5, -7), CERAMIC)
	_box("KL_CLINIC_RIGHT_CABINET", Vector3(3.4, 2.0, 2.0), Vector3(11.2, -2.5, -7), CERAMIC)
	for i in range(3):
		_box("KL_LEFT_CABINET_HANDLE_%d" % i, Vector3(0.55, 0.08, 0.05), Vector3(-12.3 + 1.0 * i, -2.1, -5.82), STEEL, 0.5)

func _make_preparation_stations() -> void:
	for i in range(2):
		var x := -2.9 if i == 0 else 2.9
		_box("KL_SPECIMEN_PODIUM_%d" % i, Vector3(4.6, 0.34, 4.6), Vector3(x, -3.16, 0.1), DARK)
		_box("KL_SPECIMEN_PODIUM_RIM_%d" % i, Vector3(4.7, 0.08, 4.7), Vector3(x, -2.95, 0.1), STEEL, 0.6)
		_text("KL_CASE_LABEL_%d" % i, "FDI 16  |  BEFORE" if i == 0 else "FDI 16  |  CUT", Vector3(x, -2.64, 2.44), 34, CERAMIC)

func _make_dental_chair() -> void:
	var x := 8.7
	_cylinder("KL_PATIENT_CHAIR_PEDESTAL", 1.9, 0.35, Vector3(x, -2.7, -4), STEEL)
	_box("KL_DENTAL_CHAIR_SEAT", Vector3(2.7, 0.48, 3.9), Vector3(x, -1.65, -4.6), BLUE)
	var back := _box("KL_DENTAL_CHAIR_BACK", Vector3(2.7, 0.42, 3.2), Vector3(x, -0.4, -6.1), BLUE)
	back.rotation_degrees.x = -58
	_box("KL_DENTAL_CHAIR_HEADREST", Vector3(1.5, 0.3, 0.7), Vector3(x, 0.88, -7.2), DARK)
	for off in [-1.55, 1.55]:
		_box("KL_DENTAL_CHAIR_ARMREST", Vector3(0.22, 0.23, 2.5), Vector3(x + off, -1.15, -4.3), STEEL)

func _make_instrument_table() -> void:
	var x := -8.8
	_cylinder("KL_INSTRUMENT_CART_PILLAR", 2.0, 0.15, Vector3(x, -2.65, -3), STEEL)
	_box("KL_INSTRUMENT_TRAY", Vector3(4.0, 0.16, 2.4), Vector3(x, -1.60, -3), CERAMIC)
	_box("KL_INSTRUMENT_TRAY_RIM", Vector3(4.2, 0.07, 2.5), Vector3(x, -1.46, -3), STEEL)
	var labels := ["mirror", "explorer", "bur", "syringe", "composite"]
	for i in range(labels.size()):
		var tool := _cylinder("KL_TOOL_" + labels[i], 1.18, 0.07, Vector3(x - 1.55 + i * 0.77, -1.25, -3), STEEL)
		tool.rotation_degrees.x = 90
		_text("KL_TOOL_LABEL_" + labels[i], labels[i], Vector3(x - 1.55 + i * 0.77, -1.2, -1.75), 17, CERAMIC)

func _make_overhead_light() -> void:
	_cylinder("KL_LIGHT_POST", 7.8, 0.10, Vector3(11.5, 0.2, -4), STEEL)
	var arm := _box("KL_LIGHT_ARM", Vector3(3.1, 0.16, 0.16), Vector3(9.9, 3.9, -4.0), STEEL)
	arm.rotation_degrees.z = -10
	_box("KL_LIGHT_DIFFUSER", Vector3(1.7, 0.22, 1.0), Vector3(8.45, 3.6, -4.0), CERAMIC)
	var light := SpotLight3D.new()
	light.name = "KL_NATIVE_PROCEDURE_LAMP"
	light.position = Vector3(8.45, 3.45, -4)
	light.rotation_degrees.x = -90
	light.spot_range = 12
	light.light_energy = 2.2
	add_child(light)

func _make_screens() -> void:
	_box("KL_SCREEN_FRAME", Vector3(8.2, 4.4, 0.22), Vector3(0, 1.8, -9.88), STEEL)
	_box("KL_SCREEN_PANEL", Vector3(7.9, 4.1, 0.11), Vector3(0, 1.8, -9.70), BG)
	_text("KL_SCREEN_TITLE", "KLINIKLAB  /  PRACTICE LAB", Vector3(0, 2.95, -9.59), 68, CERAMIC)
	_text("KL_SCREEN_SUBTITLE", "FDI 16  -  RESTORATION", Vector3(0, 2.15, -9.59), 53, TEAL)
	_text("KL_SCREEN_BODY", "BEFORE   /   AFTER SIMULATED CUT", Vector3(0, 1.3, -9.59), 36, CERAMIC)
	_text("KL_SCREEN_SCOPE", "Native workspace prototype  |  Not yet full app", Vector3(0, 0.50, -9.59), 26, CERAMIC)

func _make_hud() -> void:
	var canvas := CanvasLayer.new()
	canvas.name = "KL_NATIVE_WORKSPACE_STATUS_HUD"
	add_child(canvas)
	var badge := Label.new()
	badge.name = "KL_SCOPE_DISCLOSURE"
	badge.text = "KlinikLab Native Clinic  /  Workspace migration prototype  /  NOT FULL APPLICATION"
	badge.position = Vector2(25, 110)
	badge.add_theme_font_size_override("font_size", 18)
	badge.add_theme_color_override("font_color", Color(0.70, 0.90, 0.95))
	canvas.add_child(badge)
