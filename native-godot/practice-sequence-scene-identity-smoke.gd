extends SceneTree
## SR87: real instantiated native scene and live ordered Practice Sequence controls.
## Source case cursor is independent of the loaded mesh; 3D must be hidden.
## No owner profile, screenshots, GPU or journal writes during session.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIS := ["16","36","11","26","48","46"]
const JOURNAL := "user://kliniklab-native-progress-v2.json"
var boundaries := 0

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR87_SCENE_IDENTITY_RESTORATION_FAILED: " + reason)
	quit(1)

func _button(app: Node3D, id: String) -> Button:
	return (app.get("_page") as VBoxContainer).get_node_or_null(id) as Button

func _press(app: Node3D, id: String) -> bool:
	var b: Button = _button(app,id)
	if b == null or b.disabled:
		_fail("Missing enabled actual UI control: " + id)
		return false
	b.pressed.emit()
	return true

func _unmodified(snapshot: String, when: String) -> bool:
	if FileAccess.get_file_as_string(JOURNAL) != snapshot:
		_fail("Journal bytes modified at " + when)
		return false
	return true

func _hidden_identity(app: Node3D, old_case: int, old_volume: Node3D, expected_case: int, snapshot: String, when: String) -> bool:
	var seq: RefCounted = app.get("_practice_sequence")
	if seq == null:
		_fail("Missing active sequence at " + when)
		return false
	var state: Dictionary = seq.call("state")
	if int(state["caseIndex"]) != expected_case or str(state["caseId"]) != IDS[expected_case] or str(state["fdi"]) != FDIS[expected_case]:
		_fail("Source cursor/FDI mismatch at " + when)
		return false
	var scene: Node3D = app.get("_scene")
	var atlas: Node3D = app.get("_atlas")
	if scene == null or scene.name != "KL_ORIGINAL_FDI16_SOURCE_SCENE" or scene.visible or atlas != null and atlas.visible:
		_fail("Unrelated loaded scene/atlas visible at " + when)
		return false
	if int(app.get("_case_index")) != old_case or app.get("_volume") != old_volume or str(app.get("_view")) != "clinic":
		_fail("Original 3D case/volume/view mutated while hidden at " + when)
		return false
	if (app.get("_middle") as Control).visible:
		_fail("Middle 3D viewport still displayed while source sequence advances at " + when)
		return false
	if _button(app,"KL_SEQUENCE_EXIT") == null:
		_fail("Escape from scene-hidden sequence missing")
		return false
	return _unmodified(snapshot,when)

func _run() -> void:
	root.size = Vector2i(1500,900)
	var packed: PackedScene = load("res://app.tscn")
	if packed == null:
		_fail("Actual native app packed scene missing")
		return
	var app: Node3D = packed.instantiate()
	root.add_child(app)
	await process_frame
	# Disposable hosted-CI user:// fixture only. All setup writes before snapshot.
	app.call("_reset_progress")
	app.call("_select_case",3) # FDI26: catch false FDI16/26/36 scene association
	app.call("_select_station",4)
	app.call("_set_camera_mode","teeth")
	var original_case: int = int(app.get("_case_index"))
	var original_station: int = int(app.get("_station_index"))
	var original_camera: String = str(app.get("_camera_mode"))
	var original_view: String = str(app.get("_view"))
	var original_volume: Node3D = app.get("_volume")
	var scene: Node3D = app.get("_scene")
	var atlas: Node3D = app.get("_atlas")
	if original_case != 3 or original_station != 4 or original_view != "clinic" or scene == null or not scene.visible or original_volume == null:
		_fail("Cannot establish genuine pre-sequence FDI26/Practical loaded scene")
		return
	var prior_scene_visible: bool = scene.visible
	var prior_atlas_visible: bool = atlas != null and atlas.visible
	var snapshot: String = FileAccess.get_file_as_string(JOURNAL)
	if snapshot.is_empty():
		_fail("Cannot snapshot isolated learner journal")
		return
	if not _press(app,"KL_SEQUENCE_START"):
		return
	if not _hidden_identity(app,original_case,original_volume,0,snapshot,"start"):
		return
	# Reject unrelated learner navigation while this in-memory exercise runs.
	app.call("_select_case",1)
	app.call("_select_station",2)
	app.call("_switch_view","environment")
	if not _hidden_identity(app,original_case,original_volume,0,snapshot,"blocked nav"):
		return
	var seq: RefCounted = app.get("_practice_sequence")
	var last_case := 0
	var completed := 0
	for attempt in range(37):
		var state: Dictionary = seq.call("state")
		var case_i: int = int(state["caseIndex"])
		if case_i < last_case or case_i > last_case + 1:
			_fail("Case order changed")
			return
		if case_i != last_case:
			boundaries += 1
			if not _hidden_identity(app,original_case,original_volume,case_i,snapshot,"next case"):
				return
			if not _press(app,"KL_SEQUENCE_PREVIOUS"):
				return
			if not _hidden_identity(app,original_case,original_volume,last_case,snapshot,"previous FDI boundary"):
				return
			if not _press(app,"KL_SEQUENCE_NEXT"):
				return
			if not _hidden_identity(app,original_case,original_volume,case_i,snapshot,"next FDI boundary"):
				return
			last_case = case_i
		var step: Dictionary = state["step"]
		var correct: Variant = null
		match str(step["type"]):
			"choice":
				correct = int(step["correct"])
			"tooth","tool":
				correct = str(step["target"])
			_:
				_fail("Unsupported graded original source step")
				return
		if not _press(app,"KL_SEQUENCE_ANSWER_"+str(correct)):
			return
		completed += 1
		if not _hidden_identity(app,original_case,original_volume,case_i,snapshot,"answer"):
			return
		if completed < 37:
			if not _press(app,"KL_SEQUENCE_NEXT"):
				return
			if not _unmodified(snapshot,"next"):
				return
	if boundaries != 5 or completed != 37 or not bool(seq.call("complete")):
		_fail("Incomplete source sequence traversal across six FDIs")
		return
	if not _press(app,"KL_SEQUENCE_REPLAY"):
		return
	if not _hidden_identity(app,original_case,original_volume,0,snapshot,"replay"):
		return
	if not _press(app,"KL_SEQUENCE_EXIT"):
		return
	if app.get("_practice_sequence") != null or app.get("_volume") != original_volume or int(app.get("_case_index")) != original_case or int(app.get("_station_index")) != original_station or str(app.get("_view")) != original_view or str(app.get("_camera_mode")) != original_camera:
		_fail("Exit failed to restore exact original clinic identity/view/camera/volume")
		return
	if scene.visible != prior_scene_visible or atlas != null and atlas.visible != prior_atlas_visible or not (app.get("_middle") as Control).visible:
		_fail("Exit failed to restore rendered scene/atlas/viewport visibility")
		return
	if _button(app,"KL_SEQUENCE_START") == null or _button(app,"KL_SEQUENCE_EXIT") != null or not _unmodified(snapshot,"exit"):
		_fail("Exit did not restore original ordinary Practical controls without writing")
		return
	print("SR87_ORDERED_FDI_3D_SCENE_HIDDEN_RESTORED_PASS actual_FDI26_loaded_volume, all_6_FDI, 37_source_tasks, 5_next_previous_FDI_boundaries, replay, original_scene_atlas_camera_volume_view_restored, blocked_nav, journal_bytes_identical, HEADLESS_ONLY")
	quit(0)
