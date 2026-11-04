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

# SR50: real headless Godot Control geometry only; no RTX pixel claim.
func _validate_navigation(app: Node3D, window_width: int) -> bool:
	root.size = Vector2i(window_width,900)
	app.call("_update_responsive_layout")
	await process_frame
	await process_frame
	var panel: PanelContainer = app.get("_left_panel")
	var nav: ScrollContainer = app.get("_nav_scroll")
	var grid: GridContainer = app.get("_nav_case_grid")
	var stations: VBoxContainer = app.get("_nav_station_list")
	var case_buttons: Array = app.get("_nav_case_buttons")
	var station_buttons: Array = app.get("_nav_station_buttons")
	if not _expect(panel != null and nav != null and grid != null and stations != null, "SR50 left navigator controls missing"):
		return false
	if not _expect(panel.size.x >= 222.0 and panel.size.x <= 305.0, "SR50 nav width compressed/out of bounds at " + str(window_width)):
		return false
	if not _expect(nav.horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_DISABLED, "SR50 horizontal nav scrollbar enabled"):
		return false
	if not _expect(grid.columns == 2 and case_buttons.size() == 6 and station_buttons.size() == 7, "SR50 six-case two-column grid or seven stations absent"):
		return false
	if not _expect(grid.get_child(0).position.y == grid.get_child(1).position.y and grid.get_child(2).position.y > grid.get_child(0).position.y, "SR50 case grid not two columns"):
		return false
	var panel_bounds: Rect2 = nav.get_global_rect()
	for node in case_buttons + station_buttons:
		var button: Button = node as Button
		if not _expect(button != null and button.autowrap_mode == TextServer.AUTOWRAP_OFF and button.size.y <= 52.0, "SR50 multi-line/tall navigation button at " + str(window_width)):
			return false
		if not _expect(not button.tooltip_text.is_empty(), "SR50 source title tooltip lost"):
			return false
		if not _expect(button.get_global_rect().end.x <= panel_bounds.end.x + 2.0 and button.get_global_rect().position.x >= panel_bounds.position.x - 2.0, "SR50 FDI/station button clipped by sidebar at " + str(window_width)):
			return false
	# Vertical scrolling is permitted when the host app gives the sidebar less
	# height; the regression is compact *row geometry*, not a no-scroll claim.
	if not _expect(grid.size.y <= 165.0 and stations.size.y <= 375.0, "SR50 compact navigation rows still excessively tall at " + str(window_width)):
		return false
	return true

# SR51: projection geometry of the *actual* six editable meshes into the
# unoccluded middle pane. Headless math, never native GPU pixels or acceptance.
const CAMERA_FDI := ["16", "36", "11", "26", "48", "46"]

func _projected_bounds(mesh: MeshInstance3D, cam: Camera3D) -> Rect2:
	var region: AABB = mesh.get_aabb()
	var lo := Vector2(INF, INF)
	var hi := Vector2(-INF, -INF)
	for xx in [0.0, 1.0]:
		for yy in [0.0, 1.0]:
			for zz in [0.0, 1.0]:
				var local: Vector3 = region.position + region.size * Vector3(xx, yy, zz)
				var world: Vector3 = mesh.global_transform * local
				if cam.is_position_behind(world):
					return Rect2()
				var pixel: Vector2 = cam.unproject_position(world)
				lo.x = minf(lo.x, pixel.x)
				lo.y = minf(lo.y, pixel.y)
				hi.x = maxf(hi.x, pixel.x)
				hi.y = maxf(hi.y, pixel.y)
	if not is_finite(lo.x) or not is_finite(hi.x):
		return Rect2()
	return Rect2(lo, hi - lo)

func _validate_fdi_camera(app: Node3D, width: int) -> bool:
	root.size = Vector2i(width, 900)
	app.call("_switch_view", "clinic")
	for case_index in range(6):
		app.call("_select_case", case_index)
		app.call("_select_station", 4)
		app.call("_set_camera_mode", "teeth")
		await process_frame
		await process_frame
		await process_frame
		var scene: Node3D = app.get("_scene")
		var camera: Camera3D = scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
		var center: Control = app.get("_middle")
		var source: Node3D = app.get("_volume")
		var nav_cases: Array = app.get("_nav_case_buttons")
		var nav_stations: Array = app.get("_nav_station_buttons")
		if not _expect(camera != null and camera.current and camera.fov <= 42.0 and center.visible, "SR51 selected practical close-up camera absent"):
			return false
		if not _expect(source != null and source.visible and source.name == "KL_FDI%s_EDITABLE_CUT" % CAMERA_FDI[case_index], "SR51 wrong FDI volume used to frame " + CAMERA_FDI[case_index]):
			return false
		if not _expect(nav_cases[case_index].button_pressed and nav_stations[4].button_pressed and int(app.get("_case_index")) == case_index and int(app.get("_station_index")) == 4, "SR51 framing changed case or station navigation"):
			return false
		var mesh: MeshInstance3D = source.get_node_or_null("KL_FDI%s_REGENERATED_TISSUE_MESH" % CAMERA_FDI[case_index]) as MeshInstance3D
		if not _expect(mesh != null and mesh.mesh != null, "SR51 synthetic source-derived geometry missing " + CAMERA_FDI[case_index]):
			return false
		var rect: Rect2 = center.get_global_rect()
		var pixels: Rect2 = _projected_bounds(mesh,camera)
		# Physical incisor FDI 11 has a narrower crown silhouette than a
		# molar; require a useful vertical size rather than forcing tooth
		# widths to match. Every source FDI still has a nontrivial x extent.
		var min_width_fraction := 0.105 if case_index == 2 else 0.20
		if not _expect(pixels.size.x > rect.size.x * min_width_fraction and pixels.size.y > rect.size.y * 0.28,
			"SR51 selected FDI too small in 3D center " + CAMERA_FDI[case_index] + "@" + str(width) + " projected=" + str(pixels.size) + " area=" + str(rect.size)):
			return false
		if not _expect(pixels.position.x >= rect.position.x + 2.0 and pixels.end.x <= rect.end.x - 2.0 and pixels.position.y >= rect.position.y + 2.0 and pixels.end.y <= rect.end.y - 2.0, "SR51 FDI close-up hidden under side panels " + CAMERA_FDI[case_index] + "@" + str(width)):
			return false
		app.call("_set_camera_mode", "overview")
		await process_frame
		await process_frame
		var wide: Rect2 = _projected_bounds(mesh,camera)
		if not _expect(wide.size.x > rect.size.x * 0.095 and wide.position.x > rect.position.x and wide.end.x < rect.end.x and wide.position.y > rect.position.y and wide.end.y < rect.end.y, "SR51 overview clipped selected FDI " + CAMERA_FDI[case_index] + "@" + str(width)):
			return false
		if case_index in [0,1,3]:
			# FDI16 untouched original, FDI36/26 source meshes occupy the left.
			# A compare view must not push that source side under navigation.
			var left_anchor: Vector2 = camera.unproject_position(Vector3(-2.9, 0.0, 0.0))
			if not _expect(rect.has_point(left_anchor), "SR51 source comparison side hidden " + CAMERA_FDI[case_index] + "@" + str(width)):
				return false
	# Ensure the standalone environment overview is also in the actual middle.
	app.call("_switch_view", "environment")
	await process_frame
	await process_frame
	var room_cam: Camera3D = (app.get("_scene") as Node3D).get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	var room_rect: Rect2 = (app.get("_middle") as Control).get_global_rect()
	var room_anchor: Vector2 = room_cam.unproject_position(Vector3(3.0, -1.8, -19.0))
	if not _expect(room_cam.current and room_cam.fov <= 43.0 and room_rect.has_point(room_anchor), "SR51 imported clinic operatory not centered at " + str(width)):
		return false
	return true

# SR53: 32 FDI label selectors must not force a horizontally overflowing
# practical notes panel at the owner-PC and supported compact desktop widths.
# This is headless Control geometry, never an on-screen RTX screenshot.
func _validate_practical_fdi_chart(app: Node3D, window_width: int) -> bool:
	root.size = Vector2i(window_width,900)
	app.call("_switch_view","clinic")
	app.call("_select_case",0)
	app.call("_select_station",4)
	app.call("_set_procedure_guided",true)
	await process_frame
	await process_frame
	var page: VBoxContainer = app.get("_page")
	var scroll: ScrollContainer = app.get("_page_scroll")
	if not _expect(scroll.horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_DISABLED and page.find_children("KL_FDI_TOOTH_*","Button",true,false).size() == 32, "SR53 chart missing or horizontal overflow permitted at " + str(window_width)):
		return false
	var width: float = scroll.size.x
	for quadrant_index in range(4):
		var grid: GridContainer = page.find_child("KL_FDI_QUADRANT_GRID_" + str(quadrant_index),true,false) as GridContainer
		if not _expect(grid != null and grid.columns == 4 and grid.size.x <= width + 2.0, "SR53 quadrant grid wider than scroll pane at " + str(window_width)):
			return false
		if not _expect(grid.get_child(0).position.y == grid.get_child(3).position.y and grid.get_child(4).position.y > grid.get_child(0).position.y, "SR53 chart not four columns / two rows at " + str(window_width)):
			return false
		for node in grid.get_children():
			var b: Button = node as Button
			if not _expect(b != null and b.size.y <= 44.0 and b.size.x >= 35.0 and b.autowrap_mode == TextServer.AUTOWRAP_OFF and b.get_global_rect().end.x <= scroll.get_global_rect().end.x + 2.0, "SR53 FDI chip clipped or unreadably narrow at " + str(window_width)):
				return false
	return true

# SR55: the actual owner-PC rejected 1280x720 and 1536x864 because the
# single HBox/ScrollContainer compressed twelve tabs into unlabelled slivers.
# This tests native Godot Control geometry, not actual RTX pixels.
func _validate_toolbar(app: Node3D, window_width: int, window_height: int, expected_columns: int) -> bool:
	root.size = Vector2i(window_width,window_height)
	app.call("_update_responsive_layout")
	await process_frame
	await process_frame
	await process_frame
	var grid: GridContainer = app.get("_toolbar") as GridContainer
	var view_buttons: Dictionary = app.get("_toolbar_view_buttons")
	var camera_buttons: Dictionary = app.get("_toolbar_camera_buttons")
	print("SR55_DIAGNOSTIC viewport=%s root=%s requested=%dx%d grid=%s gridName=%s columns=%d wanted=%d count=%d min=%s size=%s" % [
		str(app.get_viewport().get_visible_rect().size),str(root.size),window_width,window_height,
		str(grid != null),grid.name if grid != null else "NULL",
		grid.columns if grid != null else -1,expected_columns,
		grid.get_child_count() if grid != null else -1,
		str(grid.get_combined_minimum_size()) if grid != null else "NULL",
		str(grid.size) if grid != null else "NULL"])
	if not _expect(grid != null and grid.name == "KL_NATIVE_RESPONSIVE_TOOLBAR" and grid.columns == expected_columns and grid.get_child_count() == 12, "SR55 toolbar missing/adaptive columns wrong at %dx%d" % [window_width,window_height]):
		return false
	if not _expect(view_buttons.size() == 10 and camera_buttons.size() == 2, "SR55 some source views or camera controls lost"):
		return false
	# canvas_items keeps a logical 1600x900 viewport even when the actual
	# Windows window is 1280x720: compare global rectangles in logical units,
	# then convert chip widths/fonts/heights back to real physical pixels.
	var logical_size: Vector2 = app.get_viewport().get_visible_rect().size
	var physical_scale := float(window_width) / logical_size.x
	if not _expect(app.get_window().size.x == window_width and app.get_window().size.y == window_height and grid.size.x <= logical_size.x + 1.0 and grid.size.y <= 145.0 and grid.get_global_rect().end.y <= 180.0, "SR55 toolbar extends outside the logical canvas or physical Window dimensions changed"):
		return false
	var labels := ["Clinic","Environment","Learning","Journey","Language","Anatomy","Radiology","Scans","Progress","Coverage","Overview camera","Teeth camera"]
	var viewport_right := logical_size.x - 1.0
	var viewport_bottom := logical_size.y - 1.0
	for idx in range(12):
		var b: Button = grid.get_child(idx) as Button
		if not _expect(b != null and b.text == labels[idx] and not b.clip_text and b.autowrap_mode == TextServer.AUTOWRAP_OFF and not b.tooltip_text.is_empty(), "SR55 toolbar label missing/truncated at %dx%d index %d" % [window_width,window_height,idx]):
			return false
		var rect: Rect2 = b.get_global_rect()
		var chip_physical := b.size * physical_scale
		var font_physical := float(b.get_theme_font_size("font_size")) * physical_scale
		if not _expect(b.size.x >= 142.0 and chip_physical.x >= 142.0 and chip_physical.y >= 39.0 and chip_physical.y <= 56.0 and font_physical >= 13.0, "SR55 toolbar label/click target too small at %dx%d index %d: chip=%s physical=%s font=%.1f" % [window_width,window_height,idx,str(b.size),str(chip_physical),font_physical]):
			return false
		if not _expect(rect.position.x >= 0.0 and rect.position.y >= 0.0 and rect.end.x <= viewport_right + 2.0 and rect.end.y <= viewport_bottom + 1.0, "SR55 toolbar clipped at %dx%d index %d: %s" % [window_width,window_height,idx,str(rect)]):
			return false
	for idx in range(expected_columns):
		if not _expect(is_equal_approx((grid.get_child(idx) as Control).position.y, (grid.get_child(0) as Control).position.y), "SR55 first toolbar row not aligned"):
			return false
	if not _expect((grid.get_child(expected_columns) as Control).position.y > (grid.get_child(0) as Control).position.y + 35.0, "SR55 toolbar still compressed into one row"):
		return false
	# Exercise signals, source view routing, and exclusive selection (including
	# both camera controls). No FDI switch, answer, cut, or progress mutation.
	app.call("_switch_view","clinic")
	(view_buttons["progress"] as Button).pressed.emit()
	if not _expect(str(app.get("_view")) == "progress" and (view_buttons["progress"] as Button).button_pressed and not (view_buttons["clinic"] as Button).button_pressed, "SR55 Progress button failed to route and indicate active view"):
		return false
	(view_buttons["clinic"] as Button).pressed.emit()
	if not _expect(str(app.get("_view")) == "clinic" and (view_buttons["clinic"] as Button).button_pressed, "SR55 Clinic toolbar failed to return to 3D"):
		return false
	(camera_buttons["teeth"] as Button).pressed.emit()
	if not _expect(str(app.get("_camera_mode")) == "teeth" and (camera_buttons["teeth"] as Button).button_pressed, "SR55 Teeth camera action failed"):
		return false
	(camera_buttons["overview"] as Button).pressed.emit()
	if not _expect(str(app.get("_camera_mode")) == "overview" and (camera_buttons["overview"] as Button).button_pressed and not (camera_buttons["teeth"] as Button).button_pressed, "SR55 Overview camera action failed"):
		return false
	return true

# SR57: overlay has readable game-style navigation UI over the *actual*
# unobscured 3D center without intercepting existing mouse look or controls.
# Headless Control geometry only; never workstation pixels/GPU acceptance.
func _validate_walk_hud(app: Node3D, window_width: int, window_height: int) -> bool:
	root.size = Vector2i(window_width,window_height)
	app.call("_switch_view","environment")
	app.call("_start_clinic_walk")
	await process_frame
	await process_frame
	var middle: Control = app.get("_middle")
	var hud: Control = app.get("_walk_hud")
	var banner: PanelContainer = app.get("_walk_hud_top")
	var guidance: PanelContainer = app.get("_walk_hud_panel")
	var title: Label = app.get("_walk_hud_title")
	var cues: Label = app.get("_walk_hud_guide")
	var reticle: Label = app.get("_walk_hud_reticle")
	var camera: Camera3D = (app.get("_scene") as Node3D).get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if not _expect(middle != null and middle.visible and hud != null and hud.visible and banner != null and guidance != null and reticle != null and camera != null and camera.current and absf(camera.fov-64.0)<0.01, "SR57 FPS HUD or perspective missing at %dx%d" % [window_width,window_height]):
		return false
	for node in [hud,banner,guidance,reticle,title,cues]:
		if not _expect(node != null and node.mouse_filter == Control.MOUSE_FILTER_IGNORE, "SR57 UI overlay steals right-drag or other input"):
			return false
	var viewport: Rect2 = middle.get_global_rect()
	var top_rect: Rect2 = banner.get_global_rect()
	var guide_rect: Rect2 = guidance.get_global_rect()
	var cursor_rect: Rect2 = reticle.get_global_rect()
	if not _expect(top_rect.position.x >= viewport.position.x+4.0 and top_rect.end.x <= viewport.end.x-2.0 and top_rect.position.y >= viewport.position.y+4.0, "SR57 banner overlaps sidebar or toolbar at %dx%d" % [window_width,window_height]):
		return false
	if not _expect(guide_rect.position.x >= viewport.position.x+4.0 and guide_rect.end.x <= viewport.end.x-2.0 and guide_rect.end.y <= viewport.end.y-2.0 and top_rect.end.y+30.0 < guide_rect.position.y, "SR57 guidance outside visible first-person window at %dx%d" % [window_width,window_height]):
		return false
	if not _expect(cursor_rect.get_center().distance_to(viewport.get_center())<8.0 and cursor_rect.position.y>top_rect.end.y and cursor_rect.end.y<guide_rect.position.y, "SR57 center reticle not aligned inside first-person view %dx%d" % [window_width,window_height]):
		return false
	if not _expect(not title.text.is_empty() and title.text.contains("right-drag") and cues.text.contains("OPERATORY") and cues.text.contains("FSP/KP") and cues.text.contains("Esc exits"), "SR57 visible game controls/station range cues missing"):
		return false
	var viewport_width: float = viewport.size.x
	if not _expect(top_rect.size.x >= minf(180.0,viewport_width-22.0) and guide_rect.size.x <= viewport_width-8.0 and guide_rect.size.y >= 88.0, "SR57 panel unexpectedly thin/clipped at %dx%d" % [window_width,window_height]):
		return false
	app.call("_stop_clinic_walk")
	if not _expect(not hud.visible and camera.current, "SR57 HUD leaked after exiting walk"):
		return false
	return true

func _validate_writing_focus(app: Node3D, window_width: int, station_index: int) -> bool:
	root.size = Vector2i(window_width,900)
	app.call("_select_station",station_index)
	await process_frame
	await process_frame
	var middle: Control = app.get("_middle")
	var right: PanelContainer = app.get("_right_panel")
	var page: VBoxContainer = app.get("_page")
	var source_reference: VBoxContainer = page.get_node_or_null("KL_WRITING_SOURCE_REFERENCE") as VBoxContainer
	var fields: Dictionary = app.get("_letter_fields") if station_index == 1 else app.get("_plan_fields")
	var editor: TextEdit = fields.get("anamnese") if station_index == 1 else fields.get("diagnosis")
	if not _expect(not middle.visible,"3D canvas still steals space from textual writing exercise"):
		return false
	if not _expect(right.size.x > float(window_width)*0.65,"writing workspace is still a squeezed side panel"):
		return false
	if not _expect(editor != null and editor.size.x > 600.0,"first writing editor did not expand within available width"):
		return false
	if not _expect(editor.get_global_rect().position.y < 730.0,"first editor remains buried below long case notes"):
		return false
	if not _expect(source_reference != null and not source_reference.visible,"sample reasoning exposed by default"):
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
	# Rejected owner-PC 1600x900 view and 1280/1024 desktop widths.
	# Navigation only; camera geometry intentionally left for a separate slice.
	for nav_width in [1600,1280,1024]:
		if not await _validate_navigation(app,nav_width):
			return
	print("SR50_FDI_NAV_1600_1280_1024_LAYOUT_PASS compact two-column cases, one-line stations; headless only")
	app.call("_set_camera_mode","teeth")
	var cam: Camera3D=scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if not _expect(cam!=null and cam.current and cam.fov<=42.0,"SR51 practical perspective camera missing or invalid"):
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
	# SR49 writing focus at owner-review 1600x900 and smaller 1280x900; no pixel evidence.
	app.call("_switch_view","clinic")
	for station_i in [1,3]:
		if not await _validate_writing_focus(app,1600,station_i):
			return
		if not await _validate_writing_focus(app,1280,station_i):
			return
	app.call("_select_station",4)
	await process_frame
	await process_frame
	if not _expect((app.get("_middle") as Control).visible,"native practical 3D viewport not restored"):
		return
	print("SR49_NATIVE_WRITING_FOCUS_1600_1280_LAYOUT_PASS expanded editors, top visibility, reference gate; headless not GPU")
	# All original six FDI cases at the exact 1600px owner-review window,
	# smaller 1280px desktop, and 1024px compact supported desktop.
	for window_width in [1600, 1280, 1024]:
		if not await _validate_fdi_camera(app, window_width):
			return
	# Switching through SR49 writing must restore a close-up without changing FDI.
	app.call("_switch_view", "clinic")
	app.call("_select_case", 1)
	app.call("_select_station", 3)
	app.call("_select_station", 4)
	await process_frame
	await process_frame
	if not _expect(str(app.get("_camera_mode")) == "teeth" and int(app.get("_case_index")) == 1 and int(app.get("_station_index")) == 4 and (app.get("_middle") as Control).visible,
		"SR51 writing-to-practical navigation or FDI 36 focus lost"):
		return
	print("SR51_SIX_FDI_THREE_WIDTH_CAMERA_FRAMING_PASS true center projection, close-up/overview, environment, navigation; headless only")
	# SR55 exact owner-PC rejected widths/heights plus 1024px compact and
	# prior 1600x900 layout: all twelve actions must remain readable.
	for size_and_columns in [[1280,720,8],[1536,864,10],[1024,720,6],[1600,900,10]]:
		if not await _validate_toolbar(app,size_and_columns[0],size_and_columns[1],size_and_columns[2]):
			return
	print("SR55_RESPONSIVE_TWELVE_ACTION_TOOLBAR_1280_720_1536_864_PASS real labels, four geometries, active view/camera, no clipping; headless only")
	# SR57 overlays remain in the true central 3D pane with clear movement
	# controls and no mouse capture across owner-reviewed and compact windows.
	for size in [[1600,900],[1280,900],[1024,900],[1280,720]]:
		if not await _validate_walk_hud(app,size[0],size[1]):
			return
	print("SR57_WALK_HUD_1600_1280_1024_720_LAYOUT_PASS center reticle, source station cues, legible input-free panels; headless only")
	# SR53 separately validates that the 32-FDI practice selector remains
	# compact in the right panel without stealing the central camera.
	for window_width in [1600,1280,1024]:
		if not await _validate_practical_fdi_chart(app,window_width):
			return
	print("SR53_FDI_CHART_1600_1280_1024_LAYOUT_PASS four quadrants, two-row grids, no clipping; headless only")
	print("SR23_GODOT_SIX_CASE_RESPONSIVE_LAYOUT_AND_CONTRAST_PASS")
	quit(0)
