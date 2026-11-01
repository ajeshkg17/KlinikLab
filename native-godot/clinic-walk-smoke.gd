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
	app.call("_switch_view","language")
	if bool(app.get("_walk_active")) or bool(app.call("_walk_enter_procedure")):
		_fail("Keyboard walk leaked into FSP/KP language view")
		return
	print("SR31_DESKTOP_WASD_MOUSE_INTENT_FDI_OPERATORY_FSP_KP_PRESERVED_PASS SR37_STATION_RETURN_SAME_POSE_PASS SR38_RANGE_GATED_FSP_KP_STATION_DRAFT_AND_PRACTICAL_PERSISTENCE_PASS no capture/Quest/clinical validation")
	quit(0)
