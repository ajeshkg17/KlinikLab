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
		# SR59: paired source-verified surface and editable tooth must BOTH fit
		# the unoccluded center without navigation overlap. A selected tooth
		# can be slightly narrower than the isolated close-up while preserving
		# substantial visibility; below we check the COMPLETE left mesh AABB.
		var min_width_fraction := 0.105 if case_index == 2 else 0.18 if case_index in [0,1,3] else 0.20
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

# SR59: all corners of the true imported left/reference mesh footprint,
# not merely its x=-2.9 anchor, must project inside the unoccluded central
# Control with a margin. Rects are headless projected pixels, not GPU pixels.
func _project_world_box(box: AABB, camera: Camera3D) -> Rect2:
	var lo := Vector2(INF, INF)
	var hi := Vector2(-INF, -INF)
	for x in [0.0, 1.0]:
		for y in [0.0, 1.0]:
			for z in [0.0, 1.0]:
				var world: Vector3 = box.position + box.size * Vector3(x,y,z)
				if camera.is_position_behind(world):
					return Rect2()
				var projected: Vector2 = camera.unproject_position(world)
				lo = lo.min(projected)
				hi = hi.max(projected)
	return Rect2(lo, hi - lo)

func _validate_six_fdi_full_reference_fit(app: Node3D, physical_width: int, physical_height: int) -> bool:
	root.size = Vector2i(physical_width,physical_height)
	app.call("_switch_view", "clinic")
	for case_i in range(6):
		app.call("_select_case", case_i)
		app.call("_select_station", 4)
		for mode in ["overview", "teeth"]:
			app.call("_set_camera_mode", mode)
			await process_frame
			await process_frame
			await process_frame
			var cam: Camera3D = (app.get("_scene") as Node3D).get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
			var center: Rect2 = (app.get("_middle") as Control).get_global_rect()
			var safe: Rect2 = app.call("_camera_content_rect")
			var actual_ref: AABB = app.call("_visible_practical_reference_bounds")
			if not _expect(cam != null and cam.current and center.has_point(safe.get_center()), "SR59 source camera missing " + CAMERA_FDI[case_i] + " at " + str(physical_width)):
				return false
			if case_i in [0,1,3]:
				# Source-verified (FDI36/26) or clearly labelled mirror
				# (FDI16) must have a REAL rendered geometry footprint.
				if not _expect(actual_ref.size.length_squared() > 0.000001, "SR59 reference mesh missing / no bounds FDI" + CAMERA_FDI[case_i] + " " + mode):
					return false
				var ref_pixels := _project_world_box(actual_ref,cam)
				if not _expect(ref_pixels.size.x > 8.0 and ref_pixels.size.y > 8.0 and
					ref_pixels.position.x >= safe.position.x + 1.0 and ref_pixels.end.x <= safe.end.x - 1.0 and
					ref_pixels.position.y >= safe.position.y + 1.0 and ref_pixels.end.y <= safe.end.y - 1.0,
					"SR59 entire imported reference TOOTH clipped under navigation FDI" + CAMERA_FDI[case_i] + " " + mode + " at " + str(physical_width) + "x" + str(physical_height) + " projected=" + str(ref_pixels) + " safe=" + str(safe)):
					return false
			else:
				if not _expect(actual_ref.size.length_squared() < 0.000001, "SR59 fabricated outside-source reference FDI" + CAMERA_FDI[case_i]):
					return false
			var editable: Node3D = app.get("_volume")
			var mesh: MeshInstance3D = editable.get_node_or_null("KL_FDI%s_REGENERATED_TISSUE_MESH" % CAMERA_FDI[case_i]) as MeshInstance3D
			var native_rect := _projected_bounds(mesh,cam) if mesh != null else Rect2()
			if not _expect(native_rect.size.x > 8.0 and native_rect.size.y > 8.0 and
				native_rect.position.x >= safe.position.x+1.0 and native_rect.end.x <= safe.end.x-1.0 and
				native_rect.position.y >= safe.position.y+1.0 and native_rect.end.y <= safe.end.y-1.0,
				"SR59 editable FDI rendered under opaque sidebar " + CAMERA_FDI[case_i] + " " + mode + " at " + str(physical_width)):
				return false
	return true

func _validate_header_separation(app: Node3D, physical_width: int, physical_height: int) -> bool:
	root.size = Vector2i(physical_width,physical_height)
	app.call("_update_responsive_layout")
	await process_frame
	await process_frame
	await process_frame
	var old_status: CanvasLayer = (app.get("_legacy_workspace") as Node3D).get_node_or_null("KL_NATIVE_WORKSPACE_STATUS_HUD") as CanvasLayer
	var footer: Label = app.get("_status_footer") as Label
	var grid: GridContainer = app.get("_toolbar") as GridContainer
	var title: Label = app.get("_screen_title") as Label
	if not _expect(old_status != null and not old_status.visible and footer != null and
		footer.text.contains("not clinical or exam validated") and grid != null and title != null,
		"SR59 old fixed-position prototype CanvasLayer still overlays camera controls"):
		return false
	var top_rect: Rect2 = grid.get_global_rect()
	var title_rect: Rect2 = title.get_global_rect()
	var footer_rect: Rect2 = footer.get_global_rect()
	if not _expect(title_rect.end.y+2.0 <= top_rect.position.y and
		footer_rect.position.y >= top_rect.end.y+10.0 and
		footer_rect.end.y <= app.get_viewport().get_visible_rect().size.y+2.0,
		"SR59 application status/header intersects responsive 12-action camera row " + str(physical_width) + "x" + str(physical_height)):
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
	if not _expect(not title.text.is_empty() and title.text.contains("Click 3D") and cues.text.contains("OPERATORY") and cues.text.contains("FSP/KP") and cues.text.contains("Esc exits"), "SR57 visible game controls/station range cues missing"):
		return false
	var viewport_width: float = viewport.size.x
	if not _expect(top_rect.size.x >= minf(180.0,viewport_width-22.0) and guide_rect.size.x <= viewport_width-8.0 and guide_rect.size.y >= 88.0, "SR57 panel unexpectedly thin/clipped at %dx%d" % [window_width,window_height]):
		return false
	# SR61 checks both visible and captured help text in the same real
	# Godot center-pane HUD; no owner Windows screenshot claim.
	app.call("_capture_walk_mouse")
	if not _expect(bool(app.get("_walk_mouse_captured")) and title.text.contains("Mouse captured") and cues.text.contains("Esc releases") and banner.get_global_rect().end.x <= viewport.end.x-2.0,
		"SR61 FPS capture HUD clipped or release instructions missing at %dx%d" % [window_width,window_height]):
		return false
	app.call("_release_walk_mouse")
	if not _expect(not bool(app.get("_walk_mouse_captured")) and title.text.contains("Click 3D"),"SR61 release HUD did not restore click-to-capture prompt"):
		return false
	app.call("_stop_clinic_walk")
	if not _expect(not hud.visible and camera.current, "SR57 HUD leaked after exiting walk"):
		return false
	return true

# SR58: the practical station must present its source task and guided
# start above all long clinical/model/anatomy prose at real desktop sizes.
# These are headless Control rectangles, not owner-PC render pixels.
func _validate_practical_task_first(app: Node3D, width: int, height: int) -> bool:
	root.size = Vector2i(width,height)
	app.call("_switch_view","clinic")
	app.call("_select_case",1) # source FDI 36; full six-case identity tested in guided smoke.
	app.call("_select_station",4)
	await process_frame
	await process_frame
	var scroll: ScrollContainer = app.get("_page_scroll")
	var page: VBoxContainer = app.get("_page")
	var start: Button = page.get_node_or_null("KL_PRACTICAL_START_GUIDE") as Button
	if not _expect(start != null and not start.disabled and not bool(app.get("_procedure_guided")) and scroll.scroll_vertical == 0, "SR58 start control missing or notes remain scrolled at %dx%d" % [width,height]):
		return false
	var visible: Rect2 = scroll.get_global_rect()
	var button_rect: Rect2 = start.get_global_rect()
	if not _expect(button_rect.position.x >= visible.position.x - 2.0 and button_rect.end.x <= visible.end.x + 2.0 and button_rect.position.y >= visible.position.y and button_rect.end.y < visible.end.y - 10.0, "SR58 Start guided practical not visible above fold at %dx%d" % [width,height]):
		return false
	var reference_index := -1
	var start_index := start.get_index()
	for child in page.get_children():
		if child is Label and (child as Label).text.contains("ANATOMY REFERENCE — educational provenance"):
			reference_index = child.get_index()
			break
	if not _expect(reference_index > start_index, "SR58 model/provenance still preceding primary action at %dx%d" % [width,height]):
		return false
	start.pressed.emit()
	await process_frame
	await process_frame
	if not _expect(bool(app.get("_procedure_guided")) and not bool(app.get("_direct_bur_mode")) and (app.get("_page_scroll") as ScrollContainer).scroll_vertical == 0, "SR58 guide did not enter source task with no bur/scroll carryover"):
		return false
	var guided_page: VBoxContainer = app.get("_page")
	var first_step: Label
	var next_action: Button
	for child in guided_page.get_children():
		if child is Label and (child as Label).text.begins_with("1. "):
			first_step = child as Label
		elif child is Button and (child as Button).text.begins_with("Next task (N)"):
			next_action = child as Button
	if not _expect(first_step != null and next_action != null and first_step.get_index() < next_action.get_index(), "SR58 secondary N/P navigation still precedes original task at %dx%d" % [width,height]):
		return false
	if not _expect(first_step.get_global_rect().position.y >= visible.position.y and first_step.get_global_rect().position.y < visible.end.y, "SR58 first source prompt remains below fold at %dx%d" % [width,height]):
		return false
	app.call("_set_procedure_guided",false)
	return true

# SR60: owner-PC 1536x864 screenshot showed right-edge clipping and a
# bright CC0 floor band behind Clinic tooth training. Validate actual
# laid-out Godot Control rectangles and projected case-mesh coordinates.
# This is logical->physical pixel-space geometry in headless Godot, NOT
# a screenshot from the owner's Windows renderer.
func _validate_sr60_owner_composition(app: Node3D, physical_width: int, physical_height: int) -> bool:
	root.size = Vector2i(physical_width,physical_height)
	app.call("_switch_view","clinic")
	await process_frame
	await process_frame
	var viewport_size: Vector2 = app.get_viewport().get_visible_rect().size
	var screen_rect := Rect2(Vector2.ZERO,viewport_size)
	var grid: GridContainer = app.get("_toolbar") as GridContainer
	var left: PanelContainer = app.get("_left_panel") as PanelContainer
	var right: PanelContainer = app.get("_right_panel") as PanelContainer
	var middle: Control = app.get("_middle") as Control
	var notes: ScrollContainer = app.get("_page_scroll") as ScrollContainer
	var environment: Node3D = app.get("_cc0_clinic") as Node3D
	if not _expect(grid != null and left != null and right != null and middle != null and notes != null and environment != null, "SR60 missing native columns"):
		return false
	for i in range(6):
		app.call("_select_case",i)
		app.call("_select_station",4)
		for mode in ["overview","teeth"]:
			app.call("_set_camera_mode",mode)
			await process_frame
			await process_frame
			await process_frame
			var left_rect: Rect2 = left.get_global_rect()
			var right_rect: Rect2 = right.get_global_rect()
			var mid_rect: Rect2 = middle.get_global_rect()
			var toolbar_rect: Rect2 = grid.get_global_rect()
			var notes_rect: Rect2 = notes.get_global_rect()
			if not _expect(toolbar_rect.position.x >= -1.0 and toolbar_rect.end.x <= viewport_size.x + 1.0 and
				left_rect.position.x >= -1.0 and right_rect.end.x <= viewport_size.x + 1.0 and
				left_rect.end.x <= mid_rect.position.x + 2.0 and mid_rect.end.x <= right_rect.position.x + 2.0 and
				right_rect.end.y <= viewport_size.y + 2.0 and
				notes_rect.end.x <= viewport_size.x + 1.0,
				"SR60 right-edge case-pane/toolbar clipped FDI"+CAMERA_FDI[i]+" "+mode+" at "+str(physical_width)+"x"+str(physical_height)+" right="+str(right_rect)+" toolbar="+str(toolbar_rect)+" screen="+str(screen_rect)):
				return false
			if not _expect(grid.columns <= 8 and grid.get_child_count() == 12 and not environment.visible,
				"SR60 responsive toolbar lost controls or CC0 floor still bleeds through Clinic "+CAMERA_FDI[i]+" "+mode):
				return false
			for control in grid.get_children():
				var chip: Control = control as Control
				var bounds: Rect2 = chip.get_global_rect()
				if not _expect(bounds.position.x >= toolbar_rect.position.x - 2.0 and
					bounds.end.x <= toolbar_rect.end.x + 2.0 and
					bounds.end.x <= viewport_size.x - 1.0,
					"SR60 camera/tab clipped at physical right edge "+str(physical_width)+" / "+str(chip.name)):
					return false
			if not _expect(mid_rect.size.x >= viewport_size.x * (0.58 if viewport_size.x >= 1500.0 else 0.47) and mid_rect.size.y >= 340.0 and
				mid_rect.position.y >= toolbar_rect.end.y + 2.0,
				"SR60 center canvas remains a narrow strip at "+str(physical_width)+"x"+str(physical_height)+" middle="+str(mid_rect)):
				return false
			var mesh: MeshInstance3D = (app.get("_volume") as Node3D).get_node_or_null("KL_FDI%s_REGENERATED_TISSUE_MESH" % CAMERA_FDI[i]) as MeshInstance3D
			var camera: Camera3D = (app.get("_scene") as Node3D).get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
			var projected: Rect2 = _projected_bounds(mesh,camera) if mesh != null else Rect2()
			if not _expect(projected.size.y >= mid_rect.size.y * 0.27 and
				projected.position.y >= mid_rect.position.y and projected.end.y <= mid_rect.end.y,
				"SR60 tooth does not occupy useful vertical center space FDI"+CAMERA_FDI[i]+" "+mode+"@"+str(physical_width)+" project="+str(projected)):
				return false
			var page: VBoxContainer = app.get("_page") as VBoxContainer
			if not _expect(page.size.x <= notes.size.x + 2.0,
				"SR60 source case-content pane requires horizontal overflow FDI"+CAMERA_FDI[i]+" "+mode+"@"+str(physical_width)):
				return false
	# The CC0 room is still present, unmodified and explicitly viewable
	# in Environment, including SR57 walk mode.
	app.call("_switch_view","environment")
	await process_frame
	if not _expect(environment.visible, "SR60 erroneously removed the imported CC0 clinic from Environment"):
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

# SR62: real Godot Control hierarchy at supported desktop sizes. Quiz task
# and an explicit answer-status label must be visible above long case notes.
# These are HEADLESS geometry assertions, not owner-PC rendered pixels.
func _validate_sr62_quiz_feedback(app: Node3D, physical_width: int, physical_height: int) -> bool:
	root.size = Vector2i(physical_width, physical_height)
	app.call("_switch_view","clinic")
	app.call("_select_case",1) # FDI36, same fictional source case as SR59 owner report
	app.call("_select_station",0) # German patient interview, a native quiz
	await process_frame
	await process_frame
	var notes: ScrollContainer = app.get("_page_scroll") as ScrollContainer
	var page: VBoxContainer = app.get("_page") as VBoxContainer
	var status: Label = app.get("_quiz_feedback_status") as Label
	if not _expect(notes != null and page != null and status != null and status.text.contains("Not answered"),
		"SR62 question status unavailable at %dx%d" % [physical_width,physical_height]):
		return false
	var question: Label = null
	var case_notes: Label = null
	for child in page.get_children():
		if child is Label:
			var heading: Label = child as Label
			if heading.text.begins_with("Practice question 1/"):
				question = heading
			if heading.text.begins_with("Complaint: "):
				case_notes = heading
	if not _expect(question != null and case_notes != null and page.get_children().find(question) < page.get_children().find(status) and page.get_children().find(status) < page.get_children().find(case_notes),
		"SR62 quiz not task-first before original case prose at %dx%d" % [physical_width,physical_height]):
		return false
	var viewport: Rect2 = notes.get_global_rect()
	var feedback: Rect2 = status.get_global_rect()
	if not _expect(feedback.position.x >= viewport.position.x - 1.0 and feedback.end.x <= viewport.end.x + 1.0 and feedback.position.y >= viewport.position.y - 1.0 and feedback.end.y <= viewport.end.y - 1.0 and feedback.size.y >= 15.0,
		"SR62 near-question feedback outside visible notes viewport at %dx%d feedback=%s notes=%s" % [physical_width,physical_height,str(feedback),str(viewport)]):
		return false
	app.call("_reveal_quiz_options")
	var quiz: Dictionary = ((app.get("_content") as Dictionary)["quiz"] as Dictionary)["interview"][0]
	app.call("_answer","interview",0,(int(quiz["correct"])+1)%3)
	await process_frame
	await process_frame
	status = app.get("_quiz_feedback_status") as Label
	if not _expect(status != null and status.text.contains("Review suggested") and status.get_global_rect().end.y <= notes.get_global_rect().end.y + 1.0,
		"SR62 answer feedback not visible after incorrect source choice at %dx%d" % [physical_width,physical_height]):
		return false
	app.call("_reset_progress")
	return true

# SR64: actual imported CC0 meshes (excluding detached tray), not hard-coded
# screen position, define the room overview. Validate true 3D projection and
# environment-only light state; no rendered Windows pixels claimed.
func _validate_sr64_environment_overview(app: Node3D, physical_width: int, physical_height: int) -> bool:
	root.size = Vector2i(physical_width, physical_height)
	app.call("_switch_view", "environment")
	await process_frame
	await process_frame
	await process_frame
	var scene: Node3D = app.get("_scene") as Node3D
	var camera: Camera3D = scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	var middle: Control = app.get("_middle") as Control
	var room: Node3D = app.get("_cc0_clinic") as Node3D
	var bounds: AABB = app.call("_environment_room_bounds")
	if not _expect(room != null and room.visible and bounds.size.length_squared() > 1.0 and camera != null and middle != null,
		"SR64 imported CC0 room bounds/camera unavailable at %dx%d" % [physical_width, physical_height]):
		return false
	var projected: Rect2 = _project_world_box(bounds, camera)
	var visible: Rect2 = middle.get_global_rect()
	if not _expect(projected.size.x > visible.size.x * 0.15 and projected.size.y > visible.size.y * 0.15 and
		projected.position.x >= visible.position.x - 8.0 and projected.end.x <= visible.end.x + 8.0 and
		projected.position.y >= visible.position.y - 8.0 and projected.end.y <= visible.end.y + 8.0,
		"SR64 imported clinic off-center/outside 3D pane at %dx%d room=%s drawn=%s center=%s" % [physical_width, physical_height, str(bounds), str(projected), str(visible)]):
		return false
	var world: WorldEnvironment = scene.get_node_or_null("KL_ClinicBackground") as WorldEnvironment
	var key: DirectionalLight3D = scene.get_node_or_null("KL_ClinicKeyLight") as DirectionalLight3D
	var fill: OmniLight3D = scene.get_node_or_null("KL_ClinicFillLight") as OmniLight3D
	if not _expect(world != null and world.environment != null and key != null and fill != null and
		world.environment.ambient_light_energy <= 0.37 and key.light_energy <= 0.66 and fill.light_energy <= 0.43,
		"SR64 strong original tooth lighting still overexposes clinic room"):
		return false
	app.call("_switch_view", "clinic")
	if not _expect(not room.visible and absf(world.environment.ambient_light_energy - 0.85) < 0.001 and
		absf(key.light_energy - 1.6) < 0.001 and absf(fill.light_energy - 1.2) < 0.001,
		"SR64 environment lighting spilled into six-case tooth training"):
		return false
	return true

# SR66: perspective occupancy and inset containment from real Godot camera
# and imported CC0 mesh bounds. These are projected pixels, not GPU frames.
func _validate_sr66_oblique_overview(app: Node3D, physical_width: int, physical_height: int) -> bool:
	root.size = Vector2i(physical_width, physical_height)
	app.call("_switch_view", "environment")
	await process_frame
	await process_frame
	await process_frame
	var scene: Node3D = app.get("_scene") as Node3D
	var camera: Camera3D = scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	var target: AABB = app.call("_environment_room_bounds")
	var safe: Rect2 = app.call("_camera_content_rect")
	if not _expect(camera != null and safe.size.x > 190.0 and safe.size.y > 200.0 and target.size.length_squared() > 1.0,
		"SR66 oblique room input invalid at %dx%d" % [physical_width, physical_height]):
		return false
	var pixels: Rect2 = _project_world_box(target, camera)
	var view_back: Vector3 = camera.global_basis.z
	# Must actually see the room from above (not the unchanged horizontal
	# SR64 camera), while preserving a useful near-front view of the room.
	if not _expect(view_back.y > 0.42 and view_back.y < 0.70 and view_back.z > 0.70,
		"SR66 room camera did not elevate relative to source floor"):
		return false
	if not _expect(pixels.size.x > 70.0 and pixels.size.y > 70.0 and
		pixels.position.x >= safe.position.x - 3.0 and pixels.end.x <= safe.end.x + 3.0 and
		pixels.position.y >= safe.position.y - 3.0 and pixels.end.y <= safe.end.y + 3.0,
		"SR66 oblique CC0 actual imported bounds clipped by notes/nav at %dx%d projected=%s safe=%s" %
		[physical_width, physical_height, str(pixels), str(safe)]):
		return false
	# The SR65 level-camera fit was width dominated: it made room depth
	# invisible vertically. Compare with a conservative frontal near-face
	# vertical envelope instead of asserting arbitrary room dimensions.
	var screen: Vector2 = root.get_visible_rect().size
	var focal := screen.y / (2.0 * tan(deg_to_rad(42.0) * 0.5))
	var frontal_distance := maxf(5.0, maxf(
		focal * target.size.x / (safe.size.x * 0.92),
		focal * target.size.y / (safe.size.y * 0.92)))
	var frontal_vertical_ceiling := focal * target.size.y / frontal_distance
	print("SR66_OVERVIEW_MEASURE width=%d height=%d actual_vertical=%.2f frontal_upper=%.2f safe_height=%.2f room_size=%s" %
		[physical_width, physical_height, pixels.size.y, frontal_vertical_ceiling, safe.size.y, str(target.size)])
	if target.size.z > target.size.y * 1.2:
		if not _expect(pixels.size.y > frontal_vertical_ceiling * 1.15,
			"SR66 elevated perspective did not improve source depth-as-screen-height at %dx%d" % [physical_width, physical_height]):
			return false
	# A walk camera pose is learner-controlled; environment overview only.
	app.call("_start_clinic_walk")
	var active_walk_camera: Transform3D = camera.global_transform
	app.call("_frame_environment_camera")
	if not _expect(camera.global_transform.is_equal_approx(active_walk_camera),
		"SR66 environment overview unexpectedly reset an active FPS walk camera"):
		return false
	app.call("_stop_clinic_walk")
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
	var real_room: AABB = app.call("_environment_room_bounds")
	if not _expect(real_room.size.length_squared() > 1.0 and cam.position.z > real_room.end.z and cam.fov <= 46.0,
		"SR23/SR64 imported room has no valid front-facing overview camera"):
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
	for size_and_columns in [[1280,720,7],[1536,864,8],[1024,720,6],[1600,900,8]]:
		if not await _validate_toolbar(app,size_and_columns[0],size_and_columns[1],size_and_columns[2]):
			return
	print("SR55_RESPONSIVE_TWELVE_ACTION_TOOLBAR_1280_720_1536_864_PASS real labels, four geometries, active view/camera, no clipping; headless only")
	# SR57 overlays remain in the true central 3D pane with clear movement
	# controls and no mouse capture across owner-reviewed and compact windows.
	for size in [[1600,900],[1536,864],[1280,900],[1280,720],[1024,900],[1024,720]]:
		if not await _validate_walk_hud(app,size[0],size[1]):
			return
	print("SR57_WALK_HUD_1600_1280_1024_720_LAYOUT_PASS center reticle, source station cues, legible input-free panels; headless only")
	print("SR61_FPS_POINTER_HUD_SIX_DESKTOP_SIZES_PASS captured/released help, center-pane fit; HEADLESS NOT PIXELS")
	# SR58 task-first source practical is tested at both prior headless and
	# actual owner-PC window sizes. No pixels or GPU status inferred.
	for size in [[1600,900],[1280,900],[1024,900],[1280,720]]:
		if not await _validate_practical_task_first(app,size[0],size[1]):
			return
	print("SR58_PRACTICAL_START_1600_1280_1024_720_LAYOUT_PASS first task above long provenance; headless only")
	# SR59 reproduces SR58 owner-PC FDI36 left reference under the opaque
	# sidebar, and verifies all six sources × both modes × supported sizes.
	for size in [[1600,900],[1280,900],[1024,900],[1280,720]]:
		if not await _validate_header_separation(app,size[0],size[1]):
			return
		if not await _validate_six_fdi_full_reference_fit(app,size[0],size[1]):
			return
	print("SR59_ALL_SIX_FDI_REAL_REFERENCE_FULL_BOUNDS_AND_HEADER_FOUR_SIZES_PASS source meshes, margin, no prototype header overlap; headless projected pixels only")
	# SR60 includes the exact owner-PC maximized 1536x864 case in addition
	# to compact and previously checked dimensions.
	for size in [[1600,900],[1536,864],[1280,900],[1280,720],[1024,900],[1024,720]]:
		if not await _validate_sr60_owner_composition(app,size[0],size[1]):
			return
	print("SR60_SIX_FDI_OWNER_1536_864_RIGHT_EDGE_AND_SCENE_COMPOSITION_PASS full shell/button rectangles, CC0 environment isolation, useful 3D projected area; HEADLESS NOT GPU PIXELS")
	# SR64 new owner-PC 1536x816 client-size report is now tested alongside
	# the previous 1536x864 physical desktop, 1280x720 and compact controls.
	for size in [[1280,720],[1536,816],[1536,864],[1600,900],[1024,720]]:
		if not await _validate_sr64_environment_overview(app,size[0],size[1]):
			return
	print("SR64_REAL_CC0_ROOM_CENTERED_FIT_AND_LIGHTING_FIVE_SIZES_PASS actual mesh envelope and restored clinic lighting; HEADLESS NOT PIXELS")
	# SR66: a level room view can fit 92% horizontally yet still produce the
	# owner-reproduced thin vertical strip. Verify oblique perspective geometry.
	for size in [[1280,720],[1536,816],[1536,864],[1600,900],[1024,720]]:
		if not await _validate_sr66_oblique_overview(app,size[0],size[1]):
			return
	print("SR66_ROOM_OBLIQUE_PERSPECTIVE_FIVE_SIZES_PASS rotated true CC0 mesh bounds; no FPS pose or lights changed; HEADLESS NOT PIXELS")
	# SR62 browser-native answer-feedback parity: task-first and visibly
	# restored label across physical sizes, while owner-pixel review is pending.
	for size in [[1600,900],[1536,864],[1280,900],[1280,720],[1024,900],[1024,720]]:
		if not await _validate_sr62_quiz_feedback(app,size[0],size[1]):
			return
	print("SR62_TASK_FIRST_QUIZ_FEEDBACK_SIX_DESKTOP_SIZES_PASS task order and readable inline source feedback; HEADLESS NOT PIXELS")
	# SR53 separately validates that the 32-FDI practice selector remains
	# compact in the right panel without stealing the central camera.
	for window_width in [1600,1280,1024]:
		if not await _validate_practical_fdi_chart(app,window_width):
			return
	print("SR53_FDI_CHART_1600_1280_1024_LAYOUT_PASS four quadrants, two-row grids, no clipping; headless only")
	print("SR23_GODOT_SIX_CASE_RESPONSIVE_LAYOUT_AND_CONTRAST_PASS")
	quit(0)
