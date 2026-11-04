extends SceneTree
## SR31: real native app / controller desktop walk-to-FDI operatory semantics.
## Headless source test, NOT workstation pixels, collision, clinical or Quest QA.
func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR31_DESKTOP_CLINIC_WALK_FAILED " + reason)
	quit(1)

func _run() -> void:
	root.size=Vector2i(1600,900)
	var app_scene: PackedScene = load("res://app.tscn")
	if app_scene == null:
		_fail("Real app scene absent")
		return
	var app: Node3D = app_scene.instantiate() as Node3D
	root.add_child(app)
	await process_frame
	if str(app.get("_view")) != "clinic" or str(app.get("_camera_mode")) != "overview":
		_fail("Original FDI clinic entry state changed")
		return
	if bool(app.call("_walk_enter_procedure")):
		_fail("Unactivated walk entered a clinical procedure")
		return
	app.call("_select_case",1)
	var source_cases: Array = app.get("_cases")
	if str(source_cases[1]["fdi"]) != "36":
		_fail("Native FDI36 original source identity changed")
		return
	var records: Dictionary = app.get("_progress")
	var fsp: Dictionary = records["fspKpByTask"]
	fsp["endo|anamnese"]={"text":"Synthetic German training draft","result":{}}
	app.call("_switch_view","environment")
	app.call("_start_clinic_walk")
	if not bool(app.get("_walk_active")) or str(app.get("_view")) != "environment":
		_fail("Walk is not an opt-in environment-only interaction")
		return
	var walker: RefCounted = app.get("_walk")
	var start: Vector3 = walker.get("position")
	# SR57: actual native HUD stays in the unobscured 3D pane, is read-only,
	# and identifies both virtual stations without claiming physical scale.
	var hud: Control = app.get("_walk_hud")
	var hud_title: Label = app.get("_walk_hud_title")
	var hud_guide: Label = app.get("_walk_hud_guide")
	var reticle: Label = app.get("_walk_hud_reticle")
	if hud == null or not hud.visible or hud_title == null or hud_guide == null or reticle == null:
		_fail("SR57 walk HUD not mounted and shown at scene start")
		return
	if not hud_title.text.contains("FDI 36") or not hud_guide.text.contains("OPERATORY") or not hud_guide.text.contains("FSP/KP") or reticle.text != "+":
		_fail("SR57 HUD loses FDI identity, movement guidance or center reticle")
		return
	var preview_camera: Camera3D = (app.get("_scene") as Node3D).get_node("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if preview_camera == null or not preview_camera.current or absf(preview_camera.fov - 64.0) > 0.01:
		_fail("SR57 gameplay preview camera FOV or visibility wrong")
		return
	# SR61: opt-in capture must not start hidden, and clicking the notes/sidebar
	# must never grab the pointer or activate a simulated dental tool.
	if bool(app.get("_walk_mouse_captured")) or Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		_fail("SR61 walkthrough captured mouse without a deliberate scene click")
		return
	var outside_click := InputEventMouseButton.new()
	outside_click.button_index = MOUSE_BUTTON_LEFT
	outside_click.pressed = true
	outside_click.position = Vector2(2.0,2.0)
	app.call("_input",outside_click)
	if bool(app.get("_walk_mouse_captured")):
		_fail("SR61 clicking outside the 3D pane captured mouse")
		return
	var scene_click := InputEventMouseButton.new()
	scene_click.button_index = MOUSE_BUTTON_LEFT
	scene_click.pressed = true
	scene_click.position = (app.get("_middle") as Control).get_global_rect().get_center()
	app.call("_input",scene_click)
	# Godot's headless display server does not guarantee real OS pointer lock.
	# Prove native intent state here; only owner-PC pixels/input can prove OS capture.
	if not bool(app.get("_walk_mouse_captured")):
		_fail("SR61 central 3D click failed to set capture intent; mode=" + str(Input.mouse_mode) + " rect=" + str((app.get("_middle") as Control).get_global_rect()) + " click=" + str(scene_click.position))
		return
	if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		print("SR61_HEADLESS_OS_CAPTURE_UNAVAILABLE state=true mode=", Input.mouse_mode, " (owner-PC verification required)")
	var mouse_move := InputEventMouseMotion.new()
	mouse_move.position = scene_click.position
	mouse_move.relative = Vector2(1.0,1.0)
	mouse_move.screen_relative = Vector2(120.0,-20.0)
	app.call("_input",mouse_move)
	if absf(float(walker.get("yaw")) + 120.0 * 0.0035) > 0.0001 or float(walker.get("pitch")) <= -0.08:
		_fail("SR61 captured FPS mouse look did not use unscaled screen_relative yaw/pitch")
		return
	if not hud_title.text.contains("Mouse captured") or not hud_guide.text.contains("Esc releases"):
		_fail("SR61 captured HUD does not explain pointer release")
		return
	var release_key := InputEventKey.new()
	release_key.keycode = KEY_ESCAPE
	release_key.pressed = true
	app.call("_input",release_key)
	if not bool(app.get("_walk_active")) or bool(app.get("_walk_mouse_captured")) or Input.mouse_mode != Input.MOUSE_MODE_VISIBLE:
		_fail("SR61 first Escape must release cursor without leaving walk")
		return
	var released_yaw: float = float(walker.get("yaw"))
	app.call("_input",mouse_move)
	if absf(float(walker.get("yaw"))-released_yaw) > 0.0001:
		_fail("SR61 mouse motion still rotates camera after Escape release")
		return
	app.call("_input",scene_click)
	if not bool(app.get("_walk_mouse_captured")):
		_fail("SR61 cannot re-capture FPS mouse after Escape")
		return
	# Simulates OS/window focus loss; must release and stay released on return.
	app.call("_notification",1005) # Node.NOTIFICATION_WM_WINDOW_FOCUS_OUT
	if bool(app.get("_walk_mouse_captured")) or Input.mouse_mode != Input.MOUSE_MODE_VISIBLE or not bool(app.get("_walk_active")):
		_fail("SR61 Alt-Tab/window defocus left mouse captured or stopped the walk")
		return
	walker.call("reset")
	app.call("_apply_walk_camera")
	var op_guidance: Dictionary = walker.call("operatory_guidance")
	var language_guidance: Dictionary = walker.call("language_guidance")
	if str(op_guidance.get("bearing","")) != "AHEAD" or bool(op_guidance.get("inRange",true)) or bool(language_guidance.get("inRange",true)):
		_fail("SR57 initial view bearings/proximity are misleading")
		return
	# Optional Shift pace must still normalize diagonals, clamp frame jumps and
	# respect existing uncalibrated room bounds. Restore original spawn after.
	walker.call("reset")
	walker.call("apply_move_intent",Vector2(0.0,1.0),0.1,false)
	var normal_stride: float = ((walker.get("position") as Vector3) - start).length()
	walker.call("reset")
	walker.call("apply_move_intent",Vector2(0.0,1.0),0.1,true)
	var quick_stride: float = ((walker.get("position") as Vector3) - start).length()
	if normal_stride <= 0.0 or quick_stride <= normal_stride * 1.35 or quick_stride > normal_stride * 1.51:
		_fail("SR57 Shift intent did not accelerate within bounded safe pace")
		return
	walker.call("reset")
	walker.call("apply_move_intent",Vector2(1.0,1.0),999.0,true)
	if ((walker.get("position") as Vector3) - start).length() > quick_stride + 0.0001:
		_fail("SR57 long frame/diagonal input teleported first-person camera")
		return
	walker.call("reset")
	walker.call("apply_move_intent",Vector2(INF,0.0),0.1,true)
	if ((walker.get("position") as Vector3).distance_to(start)) > 0.0001:
		_fail("SR57 nonfinite movement must be ignored")
		return
	walker.call("reset")
	app.call("_apply_walk_camera")
	walker.call("apply_look_intent", Vector2(-400.0,0.0))
	app.call("_apply_walk_camera")
	if not hud_guide.text.contains("OPERATORY") or not (hud_guide.text.contains("LEFT") or hud_guide.text.contains("RIGHT") or hud_guide.text.contains("BEHIND")):
		_fail("SR57 visible wayfinding did not react to camera heading")
		return
	walker.call("reset")
	app.call("_apply_walk_camera")
	if bool(walker.call("in_operatory_range")) or bool(app.call("_walk_enter_procedure")):
		_fail("Cannot activate procedure while outside operatory range")
		return
	# Walking is camera intent only; it must never enable the direct-bur cutter.
	if bool(app.get("_direct_bur_mode")):
		_fail("Walk automatically activated a bur")
		return
	var cam: Camera3D = (app.get("_scene") as Node3D).get_node("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA")
	if cam == null or not cam.current or cam.position.distance_to(start)>0.0001:
		_fail("Walk does not control the real 3D app camera")
		return
	walker.call("apply_look_intent",Vector2(-10000.0,-10000.0))
	if absf(float(walker.get("pitch"))) > 1.151:
		_fail("Mouse look pitch is not bounded")
		return
	walker.call("reset")
	for i in range(24):
		walker.call("apply_move_intent",Vector2(0.0,1.0),0.1)
	if not bool(walker.call("in_operatory_range")):
		_fail("Keyboard movement cannot reach the operatory interaction")
		return
	if not bool(app.get("_walk_active")) or str(app.get("_view")) != "environment":
		_fail("Movement alone activated procedure")
		return
	var key := InputEventKey.new()
	key.keycode=KEY_E
	key.physical_keycode=KEY_E
	key.pressed=true
	app.call("_input",key)
	if str(app.get("_view")) != "clinic" or bool(app.get("_walk_active")) or int(app.get("_station_index")) != 4 or int(app.get("_case_index")) != 1:
		_fail("E did not enter selected FDI36 practical via the shared action")
		return
	if str((app.get("_cases") as Array)[1]["fdi"]) != "36" or bool(app.get("_direct_bur_mode")):
		_fail("Procedure mapping changed FDI or enabled an unsafe bur")
		return
	if str((app.get("_progress") as Dictionary)["fspKpByTask"]["endo|anamnese"]["text"]) != "Synthetic German training draft":
		_fail("Clinic walk erased FSP/KP language-state data")
		return
	app.call("_procedure_set_checklist",0,true)
	if not bool(app.call("_procedure_checklist_complete",0)):
		_fail("Practical checklist fixture did not persist before station switching")
		return
	var editor: Node3D = app.get("_volume")
	if editor==null or str((editor.call("summary") as Dictionary)["fdi"])!="36" or (editor.call("summary") as Dictionary).get("removedSamplePoints",0)!=0:
		_fail("Interaction altered synthetic tooth geometry or wrong FDI")
		return
	# SR37 station exit resumes the same bounded pose, not a reset or bur.
	var station_pose: Vector3 = walker.get("position")
	var station_yaw: float = float(walker.get("yaw"))
	if not bool(app.call("_return_to_clinic_walk")):
		_fail("Source practical station cannot return to same clinic walk")
		return
	if str(app.get("_view")) != "environment" or not bool(app.get("_walk_active")) or bool(app.get("_direct_bur_mode")):
		_fail("Returning to clinic walk left station active or enabled cutting")
		return
	var resumed_pose: Vector3 = walker.get("position")
	if resumed_pose.distance_to(station_pose)>0.0001 or absf(float(walker.get("yaw"))-station_yaw)>0.0001:
		_fail("Station exit reset walker position or heading")
		return
	if bool(app.call("_return_to_clinic_walk")):
		_fail("Walking outside the station allowed a duplicate exit")
		return
	if int(app.get("_case_index")) != 1 or str((app.get("_progress") as Dictionary)["fspKpByTask"]["endo|anamnese"]["text"]) != "Synthetic German training draft":
		_fail("Station return changed FDI or FSP/KP progress")
		return
	app.call("_stop_clinic_walk")
	if bool(app.call("_return_to_clinic_walk")):
		_fail("Inactive environment may not return from practical")
		return
	app.call("_switch_view","environment")
	app.call("_start_clinic_walk")
	if not bool(app.get("_walk_active")):
		_fail("Cannot return to walk from a procedure")
		return
	if bool(app.call("_walk_enter_language_station")):
		_fail("FSP/KP station activated outside its separate range")
		return
	for i in range(24):
		walker.call("apply_move_intent",Vector2(-1.0,1.0),0.1)
	if not bool(walker.call("in_language_station_range")) or bool(walker.call("in_operatory_range")):
		_fail("Distinct FSP/KP marker is not independently reachable")
		return
	var language_draft := TextEdit.new()
	language_draft.text="FSP/KP draft saved from the walkable language station"
	app.set("_language_draft",language_draft)
	app.set("_language_draft_key","endo|anamnese")
	var language_pose: Vector3 = walker.get("position")
	if not bool(app.call("_walk_enter_language_station")) or str(app.get("_view"))!="language" or bool(app.get("_walk_active")):
		_fail("Range-gated FSP/KP station did not explicitly enter original language studio")
		return
	var saved: Dictionary = (app.get("_progress") as Dictionary)["fspKpByTask"]
	if str(saved["endo|anamnese"]["text"])!="FSP/KP draft saved from the walkable language station":
		_fail("FSP/KP draft was not saved on station entry")
		return
	if not bool(app.call("_procedure_checklist_complete",0)):
		_fail("Practical completion was lost while switching to FSP/KP")
		return
	var live_draft: TextEdit = app.get("_language_draft")
	live_draft.text="FSP/KP draft updated before returning to clinic"
	if not bool(app.call("_return_to_clinic_walk")) or str(app.get("_view"))!="environment" or not bool(app.get("_walk_active")):
		_fail("FSP/KP station did not explicitly return to clinic walk")
		return
	var saved_after_return: Dictionary = (app.get("_progress") as Dictionary)["fspKpByTask"]
	if str(saved_after_return["endo|anamnese"]["text"])!="FSP/KP draft updated before returning to clinic":
		_fail("FSP/KP draft was lost on station return")
		return
	if not bool(app.call("_procedure_checklist_complete",0)):
		_fail("Practical progress was lost on FSP/KP station return")
		return
	var resumed_language_pose: Vector3 = walker.get("position")
	if resumed_language_pose.distance_to(language_pose)>0.0001 or bool(app.get("_direct_bur_mode")):
		_fail("FSP/KP station return reset walk pose or enabled bur")
		return
	if bool(app.call("_return_to_clinic_walk")):
		_fail("FSP/KP station return latch remained active after exit")
		return
	var esc := InputEventKey.new()
	esc.keycode=KEY_ESCAPE
	esc.pressed=true
	app.call("_input",esc)
	if bool(app.get("_walk_active")) or str(app.get("_view"))!="environment":
		_fail("Escape did not restore the clinic overview")
		return
	if (app.get("_walk_hud") as Control).visible:
		_fail("SR57 non-interactive walk HUD remained visible after Esc")
		return
	print("SR61_DESKTOP_FPS_MOUSE_CAPTURE_RELEASE_FOCUS_PASS click-only capture, physical-pixel look, Escape, defocus, no tool activation; HEADLESS ONLY")
	print("SR57_FIRST_PERSON_CAMERA_HUD_SPRINT_BEARING_PASS bounded movement, look, scene cues, no cutting; headless only")
	app.call("_switch_view","language")
	if bool(app.get("_walk_active")) or bool(app.call("_walk_enter_procedure")):
		_fail("Keyboard walk leaked into FSP/KP language view")
		return
	print("SR31_DESKTOP_WASD_MOUSE_INTENT_FDI_OPERATORY_FSP_KP_PRESERVED_PASS SR37_STATION_RETURN_SAME_POSE_PASS SR38_RANGE_GATED_FSP_KP_STATION_DRAFT_AND_PRACTICAL_PERSISTENCE_PASS no capture/Quest/clinical validation")
	quit(0)
