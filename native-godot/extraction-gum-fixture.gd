extends Node3D
## Entirely synthetic gingiva and socket for a visual extraction teaching fixture.
## No patient scan, anatomical calibration, collision or treatment mechanics.
const RIDGE := Color("#b96b80")
const MARGIN := Color("#d58e9d")
const SOCKET_FLOOR := Color("#693747")
const SOCKET_WALL := Color("#a85d72")
const X_POSITIONS := [-0.85, -0.44, 0.0, 0.44, 0.85]
const SEGMENTS := 36
var _margin_count := 0
var _socket: MeshInstance3D

func build() -> void:
	name = "KL_SYNTHETIC_GUM_FDI35_36_37"
	_build_arch_ridge()
	for i in range(X_POSITIONS.size()):
		var x: float = X_POSITIONS[i]
		var center := Vector3(x, 0.0, -0.18 - absf(x) * 0.20)
		var radius_x := 0.175 if absf(x) > 0.6 else 0.19 if absf(x) > 0.01 else 0.205
		var is_socket := absf(x) < 0.01
		_build_margin(i, center, radius_x, 0.25, is_socket)
		_margin_count += 1

func _material() -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.vertex_color_use_as_albedo = true
	material.roughness = 0.84
	material.metallic = 0.0
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	return material

func _triangle(tool: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, color_a: Color, color_b: Color, color_c: Color) -> void:
	tool.set_color(color_a)
	tool.add_vertex(a)
	tool.set_color(color_b)
	tool.add_vertex(b)
	tool.set_color(color_c)
	tool.add_vertex(c)

func _finish_mesh(tool: SurfaceTool, mesh_name: String) -> MeshInstance3D:
	tool.generate_normals()
	var surface := MeshInstance3D.new()
	surface.name = mesh_name
	surface.mesh = tool.commit()
	add_child(surface)
	return surface

func _ridge_height(x: float, z: float) -> float:
	var arch_z := -0.18 - absf(x) * 0.20
	var offset := (z - arch_z) / 0.34
	var rise := exp(-offset * offset)
	var lateral := 0.92 + 0.08 * cos(x * 3.0)
	return 0.112 + 0.105 * rise * lateral

func _build_arch_ridge() -> void:
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	tool.set_material(_material())
	var nx := 64
	var nz := 22
	for i in range(nx):
		var x0 := lerpf(-1.16, 1.16, float(i) / float(nx))
		var x1 := lerpf(-1.16, 1.16, float(i + 1) / float(nx))
		for j in range(nz):
			var z0 := lerpf(-0.75, 0.37, float(j) / float(nz))
			var z1 := lerpf(-0.75, 0.37, float(j + 1) / float(nz))
			var p00 := Vector3(x0, _ridge_height(x0, z0), z0)
			var p10 := Vector3(x1, _ridge_height(x1, z0), z0)
			var p01 := Vector3(x0, _ridge_height(x0, z1), z1)
			var p11 := Vector3(x1, _ridge_height(x1, z1), z1)
			_triangle(tool, p00, p01, p11, RIDGE, RIDGE.lightened(0.10), RIDGE.lightened(0.10))
			_triangle(tool, p00, p11, p10, RIDGE, RIDGE.lightened(0.10), RIDGE)
	_finish_mesh(tool, "KL_SYNTHETIC_GINGIVAL_RIDGE")

func _margin_point(center: Vector3, radius_x: float, radius_z: float, radius_factor: float, angle: float, height: float) -> Vector3:
	return Vector3(center.x + cos(angle) * radius_x * radius_factor, height, center.z + sin(angle) * radius_z * radius_factor)

func _build_margin(index: int, center: Vector3, radius_x: float, radius_z: float, is_socket: bool) -> void:
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	tool.set_material(_material())
	# A small, darker lower basin and raised gingival collar, not a drilled
	# or patient-derived anatomical socket. The central basin becomes exposed
	# when FDI36 is moved to the original tool-release tray.
	var floor_y := 0.224
	var radii := [0.095, 0.12, 0.17, 0.225, 1.0]
	var heights := [floor_y, floor_y + 0.012, 0.255, 0.295, 0.210]
	var colors := [
		SOCKET_FLOOR if is_socket else SOCKET_WALL,
		SOCKET_WALL,
		SOCKET_WALL.lightened(0.17),
		MARGIN,
		RIDGE
	]
	for edge in range(radii.size() - 1):
		for side in range(SEGMENTS):
			var a0 := TAU * float(side) / float(SEGMENTS)
			var a1 := TAU * float(side + 1) / float(SEGMENTS)
			var p00 := _margin_point(center, radius_x, radius_z, radii[edge], a0, heights[edge])
			var p01 := _margin_point(center, radius_x, radius_z, radii[edge], a1, heights[edge])
			var p10 := _margin_point(center, radius_x, radius_z, radii[edge + 1], a0, heights[edge + 1])
			var p11 := _margin_point(center, radius_x, radius_z, radii[edge + 1], a1, heights[edge + 1])
			_triangle(tool, p00, p01, p11, colors[edge], colors[edge], colors[edge + 1])
			_triangle(tool, p00, p11, p10, colors[edge], colors[edge + 1], colors[edge + 1])
	for side in range(SEGMENTS):
		var a0 := TAU * float(side) / float(SEGMENTS)
		var a1 := TAU * float(side + 1) / float(SEGMENTS)
		var p0 := _margin_point(center, radius_x, radius_z, radii[0], a0, heights[0])
		var p1 := _margin_point(center, radius_x, radius_z, radii[0], a1, heights[0])
		_triangle(tool, Vector3(center.x, floor_y, center.z), p0, p1, colors[0], colors[0], colors[0])
	var mesh_name := "KL_FDI36_SOCKET_SYNTHETIC" if is_socket else "KL_GINGIVAL_MARGIN_%d" % index
	var mesh := _finish_mesh(tool, mesh_name)
	if is_socket:
		_socket = mesh

func summary() -> Dictionary:
	return {
		"synthetic": true,
		"patientDerived": false,
		"anatomicallyValidated": false,
		"gumSurface": has_node("KL_SYNTHETIC_GINGIVAL_RIDGE"),
		"marginCount": _margin_count,
		"fdi36SocketSurface": is_instance_valid(_socket) and _socket.visible,
		"socketType": "illustrative_recess_with_visible_floor",
		"geometryIsNoninteractive": true
	}
