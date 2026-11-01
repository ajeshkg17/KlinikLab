extends SceneTree
## SR21 actual native application scene UI geometry smoke; not a GPU/pixel test.
func _initialize() -> void:
	call_deferred("_run")

func _expect(ok: bool, message: String) -> bool:
	if not ok:
		push_error("SR21_LAYOUT_BLOCKED "+message)
		quit(2)
		return false
	return true

func _run() -> void:
	root.size=Vector2i(1600,900)
	var packed: PackedScene=load("res://app.tscn")
	if not _expect(packed!=null,"app.tscn missing"):
		return
	var app: Node3D=packed.instantiate() as Node3D
	root.add_child(app)
	await process_frame
	var scene: Node3D=app.get("_scene")
	if not _expect(scene!=null,"native source scene failed startup"):
		return
	var old_overlay: CanvasLayer=scene.get_node_or_null("KL_FDI16_PlainTextOverlay") as CanvasLayer
	if not _expect(old_overlay!=null and not old_overlay.visible,"source proof overlay overlaps main application"):
		return
	var middle: Control=app.get("_middle")
	var right: PanelContainer=app.get("_right_panel")
	var left: PanelContainer=app.get("_left_panel")
	var title: Label=app.get("_screen_title")
	if not _expect(middle!=null and right!=null and left!=null and title!=null,"case UI panels missing"):
		return
	for pane in [left,right]:
		var panel_style: StyleBox=pane.get_theme_stylebox("panel")
		if not _expect(panel_style is StyleBoxFlat and (panel_style as StyleBoxFlat).bg_color.a>0.99,"3D can bleed through clinical notes"):
			return
	if not _expect(title.text.contains("FDI 16"),"initial case title not FDI16"):
		return
	app.call("_select_case",1)
	app.call("_select_station",4)
	if not _expect(title.text.contains("FDI 36"),"active title failed to change to FDI36"):
		return
	app.call("_set_camera_mode","teeth")
	var cam: Camera3D=scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if not _expect(cam!=null and cam.current and cam.position.z>=15.0,"teeth zoom still crowding side pane"):
		return
	var env: Node3D=app.get("_cc0_clinic")
	if not _expect(env!=null and not env.visible,"clinic room obstructs practical tooth cutting"):
		return
	app.call("_switch_view","environment")
	if not _expect(env.visible and title.text.contains("Clinic Environment"),"CC0 environment not exposed in its tab"):
		return
	if not _expect(cam.position.z<7.0 and cam.fov<=60.0,"clinic camera still too remote"):
		return
	if not _expect(middle.size.x>=350.0 and right.size.x>=450.0,"1600px layout collapsed"):
		return
	print("SR21_GODOT_SIX_CASE_UI_LAYOUT_GEOMETRY_PASS")
	quit(0)
