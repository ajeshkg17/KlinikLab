extends SceneTree
## Geometry-only camera-framing regression on the REAL, fully initialized
## Godot app scene. No output pixels, GPU use or clinical acceptance implied.

const EXPECTED_FDI := ["16","36","11","26","48","46"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR15_NATIVE_CC0_VIEW_FRAMING_FAILED "+reason)
	quit(1)

func _mesh_nodes(parent: Node, output: Array) -> void:
	if parent is MeshInstance3D:
		var node: MeshInstance3D = parent
		if node.mesh != null:
			output.append(node)
	for child in parent.get_children():
		_mesh_nodes(child,output)

func _corners(box: AABB) -> Array:
	var points: Array = []
	for x in [0,1]:
		for y in [0,1]:
			for z in [0,1]:
				points.append(box.position+box.size*Vector3(x,y,z))
	return points

func _framed(meshes: Array, camera: Camera3D, view_size: Vector2) -> Dictionary:
	var in_view := 0
	var in_front := 0
	var occupied := 0
	for mesh in meshes:
		var node: MeshInstance3D = mesh
		if not node.visible:
			continue
		var seen := false
		var front := false
		var area: AABB = node.get_aabb()
		if area.size.length_squared()<=1.0e-12:
			continue
		occupied += 1
		for corner in _corners(area):
			var world: Vector3 = node.global_transform*corner
			if camera.is_position_behind(world):
				continue
			front = true
			var pixel: Vector2 = camera.unproject_position(world)
			if is_finite(pixel.x) and is_finite(pixel.y) and pixel.x>=0.0 and
				pixel.y>=0.0 and pixel.x<=view_size.x and pixel.y<=view_size.y:
				seen=true
		if front:
			in_front += 1
		if seen:
			in_view += 1
	return {"totalNondegenerate":occupied,"inFront":in_front,"atLeastOneCornerOnScreen":in_view}

func _run() -> void:
	var source := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var pack: PackedScene = load("res://app.tscn")
	if pack == null:
		_fail("Cannot load actual app.tscn")
		return
	get_root().size=Vector2i(1600,900)
	var app: Node3D = pack.instantiate()
	get_root().add_child(app)
	var clinic: Node3D = app.get("_cc0_clinic")
	var source_scene: Node3D = app.get("_scene")
	if clinic==null or source_scene==null or not clinic.visible or not clinic.is_inside_tree():
		_fail("Actual app did not load reviewed source clinic scene")
		return
	var cam: Camera3D = source_scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if cam == null:
		_fail("Actual app clinic camera missing")
		return
	app.call("_switch_view","environment")
	if not cam.current:
		_fail("Environment camera is not selected")
		return
	var room: Node3D = clinic.get_node_or_null("KL_SOURCE_CC0_WHOLE_CLINIC") as Node3D
	if room==null:
		_fail("Source whole-room GLB root absent")
		return
	var meshes: Array = []
	_mesh_nodes(room,meshes)
	if meshes.size()<20:
		_fail("Imported CC0 room has insufficient real mesh nodes")
		return
	var summary: Dictionary = _framed(meshes,cam,Vector2(get_root().size))
	if int(summary["atLeastOneCornerOnScreen"])<3 or int(summary["inFront"])<3:
		_fail("CC0 room is outside the source-verified environment camera frustum "+str(summary))
		return
	# Verify independent native patient tooth editing still has target visible
	# from the Teeth camera and that moving between the two modes is reversible.
	for i in range(6):
		app.call("_select_case",i)
		app.call("_select_station",4)
		app.call("_switch_view","clinic")
		app.call("_set_camera_mode","teeth")
		var editor: Node3D = app.get("_volume")
		if editor==null or not editor.visible:
			_fail("Case-specific 3D tooth not visible, FDI "+EXPECTED_FDI[i])
			return
		var id: Dictionary = editor.call("summary")
		if str(id.get("fdi","")) != EXPECTED_FDI[i]:
			_fail("Case FDI anatomy mislabeled in clinic practical view "+str(i))
			return
		var model_world: Vector3 = editor.global_transform*Vector3(0.0,0.0,0.0)
		if cam.is_position_behind(model_world):
			_fail("Case tooth behind clinic close-up camera FDI "+EXPECTED_FDI[i])
			return
		var projected: Vector2 = cam.unproject_position(model_world)
		if projected.x<0 or projected.x>get_root().size.x or
			projected.y<0 or projected.y>get_root().size.y:
			_fail("Case model source center outside clinic viewport FDI "+EXPECTED_FDI[i]+": "+str(projected))
			return
	app.call("_switch_view","environment")
	if not clinic.visible or not cam.current:
		_fail("Environment view lost reviewed CC0 mesh or active camera after six-case navigation")
		return
	app.call("_reset_progress")
	print("SR15_CC0_CAMERA_FRUSTUM_AND_FDI_SIX_CASES_PASS source_sha="+source+" room_on_screen_meshes="+str(summary["atLeastOneCornerOnScreen"])+" / imported="+str(meshes.size())+"; geometric-only; NO PIXEL/GPU ACCEPTANCE")
	quit(0)
