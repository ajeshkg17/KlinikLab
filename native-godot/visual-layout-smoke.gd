extends SceneTree
## SR23: actual native Godot UI geometry / contrast smoke (NOT pixels or GPU).
func _initialize() -> void:
	call_deferred("_run")

func _expect(ok: bool, message: String) -> bool:
	if not ok:
		push_error("SR23_LAYOUT_BLOCKED "+message)
		quit(2)
		return false
	return true

func _validate_actions(container: Node) -> bool:
	var actions := container.find_children("*","Button",true,false)
	if not _expect(actions.size()>5,"action controls not instantiated"):
		return false
	for node in actions:
		var action: Button = node as Button
		if action==null:
			continue
		if not _expect(not action.text.strip_edges().is_empty(),"unlabelled dark action bar"):
			return false
		var style: StyleBoxFlat = action.get_theme_stylebox("normal") as StyleBoxFlat
		if not _expect(style!=null,"action lacks explicit background style"):
			return false
		var ink: Color = action.get_theme_color("font_color")
		if not _expect(ink.get_luminance()-style.bg_color.get_luminance()>0.45,"action text contrast too low"):
			return false
	return true

func _validate_columns(app: Node3D, window_width: int) -> bool:
	root.size=Vector2i(window_width,900)
	app.call("_update_responsive_layout")
	await process_frame
	await process_frame
	var middle: Control=app.get("_middle")
	var right: PanelContainer=app.get("_right_panel")
	var left: PanelContainer=app.get("_left_panel")
	var nav: ScrollContainer=app.get("_nav_scroll")
	var notes: ScrollContainer=app.get("_page_scroll")
	var page: VBoxContainer=app.get("_page")
	if not _expect(middle!=null and right!=null and left!=null and nav!=null and notes!=null and page!=null,"responsive columns missing"):
		return false
	if not _expect(nav.horizontal_scroll_mode==ScrollContainer.SCROLL_MODE_DISABLED and notes.horizontal_scroll_mode==ScrollContainer.SCROLL_MODE_DISABLED,"text panes still permit horizontal scrollbars"):
		return false
	if not _expect(middle.size.x>=370.0 and right.size.x>=300.0 and left.size.x>=170.0,"three-column width negotiation collapsed at "+str(window_width)):
		return false
	if not _expect(page.size.x<=notes.size.x+2.0,"clinical notes require horizontal scrolling at "+str(window_width)):
		return false
	if not _expect(nav.get_child(0).size.x<=nav.size.x+2.0,"case navigation requires horizontal scrolling at "+str(window_width)):
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
	if not _expect(old_overlay!=null and not old_overlay.visible,"historical FDI16 overlay overlaps app"):
		return
	var title: Label=app.get("_screen_title")
	var left: PanelContainer=app.get("_left_panel")
	var right: PanelContainer=app.get("_right_panel")
	if not _expect(title!=null and left!=null and right!=null,"case UI absent"):
		return
	for pane in [left,right]:
		var panel_style: StyleBox=pane.get_theme_stylebox("panel")
		if not _expect(panel_style is StyleBoxFlat and (panel_style as StyleBoxFlat).bg_color.a>0.99,"3D bleeds through clinical notes"):
			return
	if not _expect(title.text.contains("FDI 16"),"initial case title is wrong"):
		return
	app.call("_select_case",1)
	app.call("_select_station",4)
	if not _expect(title.text.contains("FDI 36"),"active case title failed to change"):
		return
	if not _validate_actions(app.get("_page")):
		return
	if not _validate_actions(app.get("_nav_scroll")):
		return
	app.call("_set_camera_mode","teeth")
	var cam: Camera3D=scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if not _expect(cam!=null and cam.current and cam.position.z>11.0 and cam.position.z<14.0 and cam.fov<=44.0,"practical teeth still undersized or camera invalid"):
		return
	var env: Node3D=app.get("_cc0_clinic")
	if not _expect(env!=null and not env.visible,"clinic room obstructs practical cut"):
		return
	if not await _validate_columns(app,1600):
		return
	if not await _validate_columns(app,1280):
		return
	app.call("_switch_view","environment")
	if not _expect(env.visible and title.text.contains("Clinic Environment"),"CC0 environment not exposed"):
		return
	if not _expect(cam.position.z< -2.0 and cam.fov<=46.0,"room camera remained far away"):
		return
	if not await _validate_columns(app,1600):
		return
	print("SR23_GODOT_SIX_CASE_RESPONSIVE_LAYOUT_AND_CONTRAST_PASS")
	quit(0)
