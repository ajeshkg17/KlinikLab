extends Node3D
## SR2 Godot-first interactive APPLICATION FOUNDATION, not a finished full port.
## Runs in a standalone Godot 4.7.2 desktop app with a source-exact
## 3D clinic and real native case/station/exercise interaction.
## Source-only educational content, no patient records, no AI or calibrated drill.

const CONTENT := "res://source/app-content.json"
const CASES := "res://source/kliniklab-native-cases.json"
const PATHWAYS := "res://source/clinical-pathways.json"
const SOURCE_SHA := "res://source/expected-sha.txt"
const PROGRESS := "user://kliniklab-native-progress-v2.json"
const CASE_IDS := ["molar", "endo", "anterior", "crown", "surgery", "perio"]
const FDI := ["16", "36", "11", "26", "48", "46"]
# SR53: exact permanent-dentition FDI display groups from browser renderChart().
# Tooth labels in this selector are NOT 3D model availability claims.
const FDI_CHART_QUADRANTS := [
	["18", "17", "16", "15", "14", "13", "12", "11"],
	["21", "22", "23", "24", "25", "26", "27", "28"],
	["48", "47", "46", "45", "44", "43", "42", "41"],
	["31", "32", "33", "34", "35", "36", "37", "38"]
]
const FDI_CHART_HEADERS := [
	"MAXILLA · right", "MAXILLA · left",
	"MANDIBLE · right", "MANDIBLE · left"
]
const STATION_IDS := ["interview", "letter", "handover", "written", "practical", "viva", "clinic"]
# Compact nav labels only. The complete source station titles remain available as
# tooltips and are unchanged in the clinical task pane, export and progress keys.
const NAV_STATION_SHORT := ["FSP · Anamnese", "FSP · Arztbrief", "FSP · Übergabe", "KP · Plan", "KP · Praxis", "KP · Mündlich", "Praxis · Alltag"]
# SR51: perspective framing envelopes describe display space only, not anatomy.
# These surround the unmodified source-derived synthetic field at x=+2.9,
# and (for FDI16/36/26) the original or source surface at x≈-2.9.
const CAMERA_FOV := 40.0
const CAMERA_ENV_FOV := 42.0
const RADIO_CHOICES := ["caries","apex","trauma","normal","impaction","bone"]
const RADIO_LABELS := ["Radiolucency / caries","Apical radiolucency","Traumatic finding","No definitive pathology","Impacted third molar","Marginal bone loss"]
const INK := Color("#e9f1f6")
const SEA := Color("#06786f")
const PAPER := Color("#eaf2f0")

var _content: Dictionary = {}
var _cases: Array = []
var _stations: Array = []
var _pathways: Dictionary = {}
var _language: RefCounted
var _language_case := "endo"
var _language_phase := "anamnese"
var _language_draft: TextEdit
var _language_draft_key := ""
var _language_model_revealed := false
var _journey_stage := 0
var _case_index := 0
var _station_index := 0
var _quiz_index := 0
var _progress: Dictionary = {}
var _scene: Node3D
var _atlas: Node3D
var _scan: Node3D
var _cc0_clinic: Node3D
var _legacy_workspace: Node3D
var _scan_wireframe := false
var _shell: CanvasLayer
var _view := "clinic"
var _camera_mode := "overview"
var _page: VBoxContainer
var _progress_label: Label
var _middle: Control
var _left_panel: PanelContainer
var _right_panel: PanelContainer
var _left_column: VBoxContainer
var _right_column: VBoxContainer
var _nav_scroll: ScrollContainer
var _nav_case_grid: GridContainer
var _nav_station_list: VBoxContainer
var _nav_case_buttons: Array[Button] = []
var _nav_station_buttons: Array[Button] = []
var _page_scroll: ScrollContainer
var _screen_title: Label
var _answer_label: Label
var _quiz_recall_edit: TextEdit
var _quiz_recall_key := ""
var _quiz_revealed := false
var _quiz_next_button: Button
var _draft: TextEdit
# The browser FSP Arztbrief has four named sections, not one unstructured draft.
var _letter_fields: Dictionary = {}
var _plan_fields: Dictionary = {}
var _writing_review_label: Label
var _writing_reference_panel: VBoxContainer
var _writing_key := ""
var _practical_feedback: Dictionary = {}
var _boot_error := ""
var _volume: Node3D
var _volumes: Dictionary = {}
var _tooth36_reference: Node3D
var _tooth26_reference: Node3D
var _tooth16_mirror: Node3D
var _cut_position := Vector3(0.0, 1.01, 0.0)
var _cut_radius := 0.22
var _direct_bur_mode := false
# Keyboard/mouse are adapters to reusable movement/look/operatory intents.
# The walk is bounded preview navigation through uncalibrated decorative CC0.
var _walk: RefCounted
var _walk_active := false
var _walk_look_dragging := false
var _walk_near_operatory := false
var _walk_near_language_station := false
# A practical station entered through walk may return to the same safe camera pose.
var _walk_station_return_available := false
var _walk_language_return_available := false
# SR32: optional source-derived practical stepper. Navigation is never treatment
# scoring or a tool/cut action; answers remain in the original progress journal.
var _procedure_guided := false
var _procedure_step_index := 0

func _ready() -> void:
	name = "KlinikLabNativeApplication"
	if not _load_source():
		push_error("KlinikLab native content provenance failure: " + _boot_error)
		_show_blocked(_boot_error)
		return
	_load_progress()
	_scene = load("res://main.tscn").instantiate() as Node3D
	_scene.name = "KL_ORIGINAL_FDI16_SOURCE_SCENE"
	add_child(_scene)
	# Keep the source-only FDI16 fullscreen overlay out of this six-case UI.
	var historical_overlay: CanvasLayer = _scene.get_node_or_null("KL_FDI16_PlainTextOverlay") as CanvasLayer
	if historical_overlay != null:
		historical_overlay.visible = false
	var workspace := Node3D.new()
	workspace.name = "KL_COMPLETE_OPERATORY_WORKSPACE"
	workspace.set_script(load("res://sr1c-godot-clinic-overview.gd"))
	_scene.add_child(workspace)
	_legacy_workspace=workspace
	var clinic_script: GDScript = load("res://cc0-clinic.gd")
	if clinic_script == null:
		_show_blocked("Required source-pinned reviewed CC0 clinic runtime script unavailable")
		push_error("SR13 CC0 clinic startup blocked: missing runtime script")
		get_tree().quit(4)
		return
	var env: Node3D = clinic_script.new()
	if not bool(env.call("configure",str(_content["sourceGitSHA"]))):
		var reason: String = str(env.call("error"))
		env.free()
		_show_blocked("Required reviewed CC0 clinic environment could not load: "+reason)
		push_error("SR13 CC0 clinic startup blocked: "+reason)
		get_tree().quit(4)
		return
	_scene.add_child(env)
	_cc0_clinic=env
	# The replacement CC0 room is an actual imported Godot scene, not just
	# a catalog. Hide duplicate schematic shell so source tooth geometry
	# and all six independent FDI volumes stay at their original transforms.
	_legacy_workspace.visible=false
	var atlas_script: GDScript = load("res://atlas-viewer.gd")
	if atlas_script != null:
		var atlas: Node3D = atlas_script.new()
		if bool(atlas.call("configure",str(_content["sourceGitSHA"]))):
			_atlas = atlas
			add_child(_atlas)
			_atlas.visible = false
		else:
			push_warning("Source 32-tooth atlas blocked: " + str(atlas.call("error")))
	var scan_script: GDScript = load("res://scan-viewer.gd")
	if scan_script != null:
		_scan = scan_script.new()
		add_child(_scan)
		_scan.visible = false
	var walk_script: GDScript = load("res://clinic-walk-intent.gd")
	if walk_script == null:
		_show_blocked("Native desktop clinic walk intent controller missing")
		get_tree().quit(4)
		return
	_walk = walk_script.new()
	_build_app()
	_set_camera_mode("overview")
	_select_case(0)
	_select_station(0)
	# SR20 physical job11 forensic safeguard: synchronous capture intention
	# logging before first deferred frame / potential shader startup stall.
	var exported_capture_requested: bool=OS.get_cmdline_user_args().has("--kliniklab-exported-pc-capture")
	var owner_expected_sha: String=OS.get_environment("KLINIKLAB_PC_EXPECTED_SHA")
	if not owner_expected_sha.is_empty():
		print("SR20_NATIVE_CAPTURE_APP_BOOTSTRAP requested=",exported_capture_requested,
			" sha_length=",owner_expected_sha.length())
	if owner_expected_sha.length()==40 and not exported_capture_requested:
		push_error("SR20_CAPTURE_FLAG_NOT_RECEIVED_FROM_PRIVATE_DESKTOP_LAUNCHER")
		get_tree().quit(7)
		return
	for arg in OS.get_cmdline_user_args():
		if str(arg)=="--kliniklab-exported-pc-capture":
			var export_capture: GDScript = load("res://exported-app-capture-node.gd")
			if export_capture == null:
				push_error("SR17 exported native capture Node not packaged in embedded PCK")
				get_tree().quit(4)
				return
			var capture_runner: Node = export_capture.new()
			add_child(capture_runner)
			capture_runner.run(self)
			break
	# Only an explicit unique owner-PC CLI user argument requests actual
	# exported-app viewport evidence. Normal learners never capture/upload.
	for arg in OS.get_cmdline_user_args():
		var option: String = str(arg)
		if option.begins_with("--kliniklab-native-pc-capture="):
			var job_id: String = option.trim_prefix("--kliniklab-native-pc-capture=")
			var capture_script: GDScript = load("res://owner-pc-capture.gd")
			if capture_script == null:
				push_error("Approved actual-exe PC capture code not packaged")
				break
			var reporter: Node = capture_script.new()
			add_child(reporter)
			reporter.call_deferred("run",self,job_id)
			break
	print("SR2_GODOT_APP_FOUNDATION_READY 6 cases / 7 stations / source quizzes / native progress. FULL APP NOT YET PORTED")

func _walk_keyboard_allowed() -> bool:
	if not _walk_active or _view != "environment" or _walk == null:
		return false
	# Never move the camera when the learner is editing German FSP/KP notes
	# or entering free text into a UI control.
	var focused: Control = get_viewport().gui_get_focus_owner()
	return not (focused is TextEdit or focused is LineEdit)

func _process(delta: float) -> void:
	if not _walk_keyboard_allowed():
		return
	var direction := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		direction.x -= 1.0
	if Input.is_physical_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		direction.x += 1.0
	if Input.is_physical_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		direction.y += 1.0
	if Input.is_physical_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		direction.y -= 1.0
	if direction != Vector2.ZERO:
		_walk.call("apply_move_intent", direction, delta)
		_apply_walk_camera()
		var now_near: bool = bool(_walk.call("in_operatory_range"))
		var now_language_near: bool = bool(_walk.call("in_language_station_range"))
		if now_near != _walk_near_operatory or now_language_near != _walk_near_language_station:
			_walk_near_operatory = now_near
			_walk_near_language_station = now_language_near
			_refresh()

func _handle_walk_input(event: InputEvent) -> void:
	if not _walk_active or _view != "environment" or _walk == null:
		return
	if event is InputEventMouseButton:
		var mouse: InputEventMouseButton = event
		if mouse.button_index == MOUSE_BUTTON_RIGHT:
			_walk_look_dragging = mouse.pressed and _middle != null and _middle.get_global_rect().has_point(mouse.position)
			if _walk_look_dragging:
				get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and _walk_look_dragging:
		_walk.call("apply_look_intent", (event as InputEventMouseMotion).relative)
		_apply_walk_camera()
		get_viewport().set_input_as_handled()
	elif event is InputEventKey and _walk_keyboard_allowed():
		var key: InputEventKey = event
		if key.pressed and not key.echo:
			if key.physical_keycode == KEY_E or key.keycode == KEY_E:
				if _walk_enter_language_station() or _walk_enter_procedure():
					get_viewport().set_input_as_handled()
			elif key.keycode == KEY_ESCAPE:
				_stop_clinic_walk()
				get_viewport().set_input_as_handled()

func _start_clinic_walk() -> void:
	if _view != "environment" or _cc0_clinic == null or _walk == null:
		return
	_direct_bur_mode = false
	_walk_active = true
	_walk_look_dragging = false
	_walk.call("reset")
	_walk_station_return_available = false
	_walk_language_return_available = false
	_walk_near_operatory = bool(_walk.call("in_operatory_range"))
	_walk_near_language_station = bool(_walk.call("in_language_station_range"))
	_apply_walk_camera()
	_refresh()

func _stop_clinic_walk() -> void:
	_walk_active = false
	_walk_look_dragging = false
	if _view == "environment":
		_set_environment_camera()
		_refresh()

func _apply_walk_camera() -> void:
	if not _walk_active or _view != "environment" or _walk == null or _scene == null:
		return
	var camera: Camera3D = _scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if camera == null:
		return
	camera.position = _walk.get("position")
	camera.rotation = Vector3(float(_walk.get("pitch")), float(_walk.get("yaw")), 0.0)
	camera.fov = 68.0
	camera.current = true

func _walk_enter_procedure() -> bool:
	if _view != "environment" or not _walk_active or _walk == null or not bool(_walk.call("in_operatory_range")):
		return false
	# E activates a station, NEVER a drill. Preserve the chosen FDI case.
	_walk_active = false
	_walk_look_dragging = false
	_direct_bur_mode = false
	_walk_station_return_available = true
	_select_station(4) # original practical station from immutable source order
	_switch_view("clinic")
	_set_camera_mode("teeth")
	_set_procedure_guided(true) # Enter from walk starts at original task 1.
	return true

# An explicit station exit restores the bounded walk without restarting at spawn.
# Never enable the bur, grade, or rewrite learner progress.
func _walk_enter_language_station() -> bool:
	if _view != "environment" or not _walk_active or _walk == null or not bool(_walk.call("in_language_station_range")):
		return false
	_language_save_draft()
	_walk_active = false
	_walk_look_dragging = false
	_walk_language_return_available = true
	_walk_station_return_available = false
	_switch_view("language")
	return _view == "language"

func _return_to_clinic_walk() -> bool:
	var from_practical: bool = _walk_station_return_available and _view == "clinic" and _station_index == 4
	var from_language: bool = _walk_language_return_available and _view == "language"
	if (not from_practical and not from_language) or _walk == null or _cc0_clinic == null:
		return false
	if from_language:
		_language_save_draft()
	_direct_bur_mode = false
	_switch_view("environment")
	if from_language:
		_walk_language_return_available = false
	_walk_active = true
	_walk_look_dragging = false
	_walk_near_operatory = bool(_walk.call("in_operatory_range"))
	_walk_near_language_station = bool(_walk.call("in_language_station_range"))
	_apply_walk_camera()
	_refresh()
	return true

func _procedure_context_available() -> bool:
	return _view == "clinic" and _station_index == 4 and _case_index >= 0 and _case_index < _cases.size() and _content.has("practical") and (_content["practical"] as Array).size() > _case_index

func _set_procedure_guided(enabled: bool) -> void:
	if not _procedure_context_available():
		_procedure_guided = false
		_procedure_step_index = 0
		return
	_procedure_guided = enabled
	_procedure_step_index = 0
	# Even toggling the guide off is not permission to cut. Bur remains
	# separate and requires explicit opt-in for the selected FDI model.
	_direct_bur_mode = false
	_refresh()

func _procedure_move_step(delta: int) -> bool:
	if not _procedure_guided or not _procedure_context_available():
		return false
	var steps: Array = _content["practical"][_case_index]
	if steps.is_empty():
		return false
	var next_index: int = clampi(_procedure_step_index + delta, 0, steps.size() - 1)
	if next_index == _procedure_step_index:
		return false
	_procedure_step_index = next_index
	# The direct cutter is never carried between procedural tasks.
	_direct_bur_mode = false
	_refresh()
	return true

# Find the next unanswered or incorrect original task, wrapping once through
# the selected case. This is navigation only: no grading or volume mutation.
func _procedure_jump_to_review() -> bool:
	if not _procedure_guided or not _procedure_context_available():
		return false
	var steps: Array = _content["practical"][_case_index]
	if steps.is_empty():
		return false
	var answers: Dictionary = _progress["answers"]
	for offset in range(1, steps.size() + 1):
		var candidate: int = (_procedure_step_index + offset) % steps.size()
		var record: Dictionary = answers.get(_key() + ":" + str(candidate), {})
		if not bool(record.get("correct", false)):
			if candidate == _procedure_step_index:
				return false
			_procedure_step_index = candidate
			_direct_bur_mode = false
			_refresh()
			return true
	return false

# Checklist is a manual learner self-tracking layer, intentionally distinct
# from original formative answers and instrument/geometry actions.
func _procedure_checklist_complete(step_index: int) -> bool:
	if _case_index < 0 or _case_index >= CASE_IDS.size():
		return false
	var checklist: Dictionary = _progress.get("practicalChecklist", {})
	var state: Dictionary = checklist.get(CASE_IDS[_case_index], {})
	return bool(state.get(str(step_index), false))

func _procedure_set_checklist(step_index: int, completed: bool) -> void:
	if not _procedure_context_available():
		return
	var steps: Array = _content["practical"][_case_index]
	if step_index < 0 or step_index >= steps.size():
		return
	var checklist: Dictionary = _progress.get("practicalChecklist", {})
	var state: Dictionary = checklist.get(CASE_IDS[_case_index], {})
	if completed:
		state[str(step_index)] = true
	else:
		state.erase(str(step_index))
	checklist[CASE_IDS[_case_index]] = state
	_progress["practicalChecklist"] = checklist
	_save_progress()
	_refresh()

func _procedure_toggle_checklist(completed: bool, step_index: int) -> void:
	_procedure_set_checklist(step_index, completed)

func _handle_procedure_input(event: InputEvent) -> void:
	if not _procedure_guided or not _procedure_context_available() or not (event is InputEventKey):
		return
	var key: InputEventKey = event
	if not key.pressed or key.echo or key.ctrl_pressed or key.alt_pressed or key.meta_pressed:
		return
	var focused: Control = get_viewport().gui_get_focus_owner()
	if focused is LineEdit or focused is TextEdit or focused is OptionButton:
		return
	var code: Key = key.physical_keycode if key.physical_keycode != KEY_NONE else key.keycode
	var moved := false
	if code == KEY_N:
		moved = _procedure_move_step(1)
	elif code == KEY_P:
		moved = _procedure_move_step(-1)
	elif code == KEY_R:
		moved = _procedure_jump_to_review()
	if moved:
		get_viewport().set_input_as_handled()

func _load_source() -> bool:
	var sha := FileAccess.get_file_as_string(SOURCE_SHA).strip_edges()
	if sha.length() != 40:
		_boot_error = "Missing source commit identifier"
		return false
	var x: Variant = JSON.parse_string(FileAccess.get_file_as_string(CONTENT))
	var y: Variant = JSON.parse_string(FileAccess.get_file_as_string(CASES))
	if not (x is Dictionary) or not (y is Dictionary):
		_boot_error = "Original native source manifests missing"
		return false
	_content = x
	var legacy: Dictionary = y
	if str(_content.get("sourceGitSHA", "")) != sha or str(legacy.get("sourceGitSHA", "")) != sha:
		_boot_error = "Two source manifests disagree with original source Git commit"
		return false
	if int(_content.get("schemaVersion", 0)) != 2 or 		str(_content.get("kind", "")) != "SOURCE_DERIVED_NATIVE_APP_CONTENT_NOT_FUNCTIONAL_PARITY":
		_boot_error = "Unexpected content contract version"
		return false
	if _content.get("syntheticCasesOnly", false) != true or 		_content.get("clinicalAssessmentValidated", true) != false:
		_boot_error = "Native content must remain explicitly synthetic/unvalidated"
		return false
	if str(_content.get("sourceAppSHA256", "")) != str(legacy.get("sourceFileSHA256", "")):
		_boot_error = "Two independent exported app.js SHA-256 digests disagree"
		return false
	_cases = _content.get("cases", [])
	_stations = _content.get("stations", [])
	if _cases.size() != 6 or _stations.size() != 7:
		_boot_error = "Incomplete case and station data"
		return false
	if legacy.get("caseCount", 0) != 6 or legacy.get("stationCount", 0) != 7:
		_boot_error = "Independent source case-count contract mismatch"
		return false
	for i in range(6):
		var c: Dictionary = _cases[i]
		if str(c.get("patientName", "")).is_empty() or int(c.get("patientAge", 0)) < 18 or (c.get("patientReply", []) as Array).size() != 7:
			_boot_error = "Missing original fictional patient dialogue"
			return false
		var old: Dictionary = legacy["cases"][i]
		if str(c.get("id", "")) != CASE_IDS[i] or str(c.get("fdi", "")) != FDI[i] or 			str(old.get("id", "")) != CASE_IDS[i] or str(old.get("fdi", "")) != FDI[i] or 			str(c.get("title", "")) != str(old.get("title", "")):
			_boot_error = "Source case identity/content drift"
			return false
	for i in range(7):
		var s: Dictionary = _stations[i]
		var old: Dictionary = legacy["stations"][i]
		if str(s.get("id", "")) != STATION_IDS[i] or 			str(old.get("id", "")) != STATION_IDS[i]:
			_boot_error = "Source station identity/order drift"
			return false
	var questions: Dictionary = _content.get("quiz", {})
	for id in ["interview", "handover", "viva", "clinic"]:
		var items: Array = questions.get(id, [])
		if items.size() < 5:
			_boot_error = "Source station questions missing: " + id
			return false
		for q in items:
			if not(q is Dictionary) or (q.get("options", []) as Array).size() != 3 or 				int(q.get("correct", -1)) < 0 or int(q.get("correct", -1)) > 2:
				_boot_error = "Invalid source quiz answer bounds: " + id
				return false
	if (_content.get("tools", []) as Array).size() < 15:
		_boot_error = "Source instrument catalog missing"
		return false
	var pathways: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATHWAYS))
	if not (pathways is Dictionary):
		_boot_error = "Source clinical journey manifest missing"
		return false
	var manifest: Dictionary = pathways
	if str(manifest.get("sourceGitSHA","")) != sha or str(manifest.get("kind","")) != "SYNTHETIC_SOURCE_CLINICAL_PATHWAYS_NOT_CERTIFIED" or manifest.get("clinicalAssessmentValidated",true) != false:
		_boot_error = "Unapproved clinical pathway provenance"
		return false
	_pathways = manifest.get("cases",{})
	if _pathways.size() != 6:
		_boot_error = "Clinical pathway case count mismatch"
		return false
	for id in CASE_IDS:
		if not _pathways.has(id):
			_boot_error = "Missing clinical source pathway " + id
			return false
		var journey: Dictionary = _pathways[id]
		if (journey.get("history",[]) as Array).size() < 4 or (journey.get("tests",[]) as Array).size() < 4 or (journey.get("procedure",[]) as Array).size() < 3:
			_boot_error = "Clinical pathway stages incomplete: " + id
			return false
	var source_language: GDScript = load("res://fsp-kp-rubric.gd")
	if source_language == null:
		_boot_error = "Native FSP/KP source training module unavailable"
		return false
	_language = source_language.new()
	if not bool(_language.call("configure",sha)):
		_boot_error = "Original FSP/KP training source rejected: " + str(_language.call("error"))
		return false
	return true

func _load_progress() -> void:
	_progress = {"schemaVersion": 2, "sourceGitSHA": str(_content["sourceGitSHA"]),
		"answers": {}, "notes": {}, "studied": {}, "letterSectionsByCase": {}, "planSectionsByCase": {}, "quizRecall": {}, "volumeFDI16": [],
		"volumeByCase": {}, "journey": {}, "radiologyByCase": {}, "fspKpByTask": {}, "practicalChecklist": {}, "selectedCase": 0, "selectedStation": 0}
	if not FileAccess.file_exists(PROGRESS):
		return
	var raw: Variant = JSON.parse_string(FileAccess.get_file_as_string(PROGRESS))
	if not(raw is Dictionary):
		return
	if int(raw.get("schemaVersion", 0)) != 2 or 		str(raw.get("sourceGitSHA", "")) != str(_content["sourceGitSHA"]):
		return # Old version is never accepted as valid progress for changed source.
	for key in ["answers", "notes", "studied"]:
		if not (raw.get(key, null) is Dictionary):
			return
	_progress = raw
	if not (_progress.get("journey",{}) is Dictionary):
		_progress["journey"] = {}
	if not _progress.has("journey"):
		_progress["journey"] = {}
	if not (_progress.get("volumeByCase", {}) is Dictionary):
		_progress["volumeByCase"] = {}
	if not (_progress.get("radiologyByCase", {}) is Dictionary):
		_progress["radiologyByCase"] = {}
	if not (_progress.get("fspKpByTask", {}) is Dictionary):
		_progress["fspKpByTask"] = {}
	if not (_progress.get("letterSectionsByCase", {}) is Dictionary):
		_progress["letterSectionsByCase"] = {}
	if not (_progress.get("planSectionsByCase", {}) is Dictionary):
		_progress["planSectionsByCase"] = {}
	if not (_progress.get("quizRecall", {}) is Dictionary):
		_progress["quizRecall"] = {}
	if not (_progress.get("practicalChecklist", {}) is Dictionary):
		_progress["practicalChecklist"] = {}
	# Convert same-source FDI16-only progress without mixing case histories.
	var stored_volumes: Dictionary = _progress["volumeByCase"]
	if not stored_volumes.has("molar") and _progress.get("volumeFDI16", []) is Array:
		stored_volumes["molar"] = _progress["volumeFDI16"]
	_case_index = clampi(int(_progress.get("selectedCase", 0)), 0, 5)
	_station_index = clampi(int(_progress.get("selectedStation", 0)), 0, 6)

func _save_progress() -> void:
	_progress["selectedCase"] = _case_index
	_progress["selectedStation"] = _station_index
	var file := FileAccess.open(PROGRESS, FileAccess.WRITE)
	if file == null:
		push_warning("Local educational progress could not be saved")
		return
	file.store_string(JSON.stringify(_progress, "  ") + "\n")
	file.close()

func _heading(t: String, pts: int = 20) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", pts)
	l.add_theme_color_override("font_color", INK)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

func _button(t: String) -> Button:
	var b := Button.new()
	b.text = t
	b.custom_minimum_size = Vector2(0, 44)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_style_action(b)
	return b

func _style_panel(panel: PanelContainer) -> void:
	# Fully opaque text panes prevent 3D scene geometry bleeding through UI.
	var surface := StyleBoxFlat.new()
	surface.bg_color = Color("#182530")
	surface.content_margin_left = 12.0
	surface.content_margin_right = 12.0
	surface.content_margin_top = 8.0
	surface.content_margin_bottom = 8.0
	panel.add_theme_stylebox_override("panel",surface)

func _style_action(button: Button) -> void:
	# The default Windows theme produced dark unreadable button bars in job13.
	# Explicit accessible labels/hover states apply to case navigation, practical
	# option rows, direct-bur controls and OptionButton instrument selectors.
	button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	button.clip_text = true
	button.add_theme_color_override("font_color",Color("#f5fbff"))
	button.add_theme_color_override("font_hover_color",Color("#ffffff"))
	button.add_theme_color_override("font_pressed_color",Color("#ffffff"))
	button.add_theme_color_override("font_focus_color",Color("#ffffff"))
	for state in ["normal","hover","pressed","focus","disabled"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color("#24495d")
		if state == "hover" or state == "focus":
			style.bg_color = Color("#276f75")
		elif state == "pressed":
			style.bg_color = Color("#087d72")
		elif state == "disabled":
			style.bg_color = Color("#33404b")
		style.border_color = Color("#74aeb8")
		style.set_border_width_all(1)
		style.set_content_margin_all(7)
		button.add_theme_stylebox_override(state,style)

func _writing_focus_active() -> bool:
	return _view == "clinic" and STATION_IDS[_station_index] in ["letter", "written"]

func _update_responsive_layout() -> void:
	if _left_column == null or _right_column == null:
		return
	# FSP/KP writing is a text-first learner workflow, not an operative 3D station.
	# Expand its editor instead of squeezing it into a narrow overlay beside 3D.
	var width := float(get_viewport().get_visible_rect().size.x)
	# SR50: room for two legible FDI chips and single-line station navigation.
	# The existing 174–238 px sidebar created narrow wrapped vertical labels.
	var nav_width := clampf(width * 0.18, 224.0, 288.0)
	var notes_width := clampf(width * 0.25, 310.0, 420.0)
	var writing_focus := _writing_focus_active()
	_left_column.custom_minimum_size.x = nav_width
	_left_panel.custom_minimum_size.x = nav_width
	_middle.visible = _view in ["clinic", "environment", "anatomy", "scans"] and not writing_focus
	_right_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL if writing_focus else Control.SIZE_FILL
	_right_column.custom_minimum_size.x = 460.0 if writing_focus else notes_width
	_right_panel.custom_minimum_size.x = 460.0 if writing_focus else notes_width
	# Godot resolves HBoxContainer widths on the next frame. Never use a stale
	# full-screen camera center when the side panes resize.
	if _scene != null and _view in ["clinic", "environment"]:
		call_deferred("_frame_visible_camera")

func _camera_content_rect() -> Rect2:
	if _middle == null or not _middle.visible:
		return Rect2()
	var bounds: Rect2 = _middle.get_global_rect()
	var inset_x := maxf(14.0, bounds.size.x * 0.075)
	var inset_y := maxf(16.0, bounds.size.y * 0.085)
	return Rect2(bounds.position + Vector2(inset_x, inset_y),
		bounds.size - Vector2(2.0 * inset_x, 2.0 * inset_y))

func _editable_camera_bounds() -> AABB:
	# Fit the real current synthetic source-derived mesh, not an arbitrary
	# fixed "molar" envelope: FDI 11 is a physically narrower incisor.
	# The AABB is only used to place the camera, never to alter geometry.
	if _volume != null:
		var mesh: MeshInstance3D = _volume.get_node_or_null("KL_FDI%s_REGENERATED_TISSUE_MESH" % FDI[_case_index]) as MeshInstance3D
		if mesh != null and mesh.mesh != null:
			var local: AABB = mesh.get_aabb()
			var lo := Vector3(INF, INF, INF)
			var hi := Vector3(-INF, -INF, -INF)
			for xx in [0.0,1.0]:
				for yy in [0.0,1.0]:
					for zz in [0.0,1.0]:
						var vertex: Vector3 = mesh.global_transform * (local.position + local.size * Vector3(xx, yy, zz))
						lo = lo.min(vertex)
						hi = hi.max(vertex)
			if hi.x > lo.x and hi.y > lo.y and hi.z > lo.z:
				var pad := Vector3(0.32,0.34,0.30)
				return AABB(lo - pad, hi - lo + pad * 2.0)
	# Safe source-signature-based fallback on a missing/blocked model. The
	# caller separately displays provenance and missing-geometry status.
	return AABB(Vector3(1.25, -1.95, -1.65), Vector3(3.30, 3.95, 3.30))

func _practical_camera_bounds() -> AABB:
	# FDI11/48/46 have no source-cleared left reference. Overview includes
	# the original/source left object only for FDI16/36/26.
	var compare_pair: bool = _camera_mode == "overview" and _case_index in [0, 1, 3]
	if compare_pair:
		return AABB(Vector3(-4.55, -1.95, -1.65), Vector3(9.10, 3.95, 3.30))
	return _editable_camera_bounds()

func _frame_visible_camera() -> void:
	if _scene == null or _middle == null:
		return
	if _view == "environment":
		_frame_environment_camera()
		return
	if _view != "clinic" or not _middle.visible or _writing_focus_active():
		return
	var content: Rect2 = _camera_content_rect()
	if content.size.x < 190.0 or content.size.y < 200.0:
		return
	var camera: Camera3D = _scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if camera == null:
		return
	var screen: Vector2 = get_viewport().get_visible_rect().size
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	camera.fov = CAMERA_FOV
	var focal := screen.y / (2.0 * tan(deg_to_rad(CAMERA_FOV) * 0.5))
	var target: AABB = _practical_camera_bounds()
	var world_center: Vector3 = target.get_center()
	# Depth from nearest target face; bounds never depend on unavailable or
	# licensing-blocked GLBs. No source/synthetic mesh is moved or rescaled.
	var depth := maxf(4.0, maxf(
		focal * target.size.x / (content.size.x * 0.92),
		focal * target.size.y / (content.size.y * 0.92)))
	var eye_z := target.end.z + depth
	var center_depth := eye_z - world_center.z
	var screen_center: Vector2 = content.get_center()
	var eye_x := world_center.x - (screen_center.x - 0.5 * screen.x) * center_depth / focal
	var eye_y := world_center.y + (screen_center.y - 0.5 * screen.y) * center_depth / focal
	# Camera looks along -Z so projected AABB corners stay predictably inside
	# the *middle* column (rather than the screen behind opaque notes/nav).
	camera.position = Vector3(eye_x, eye_y, eye_z)
	camera.rotation = Vector3.ZERO
	camera.current = true

func _frame_environment_camera() -> void:
	# Never interfere with direct learner-controlled walk pose/recovery.
	if _view != "environment" or _walk_active or _scene == null:
		return
	var content: Rect2 = _camera_content_rect()
	if content.size.x < 190.0 or content.size.y < 200.0:
		return
	var camera: Camera3D = _scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if camera == null:
		return
	var screen: Vector2 = get_viewport().get_visible_rect().size
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	camera.fov = CAMERA_ENV_FOV
	var focal := screen.y / (2.0 * tan(deg_to_rad(CAMERA_ENV_FOV) * 0.5))
	var world_center := Vector3(3.0, -1.8, -19.0)
	var depth := 12.0
	var aim_x := world_center.x - (content.get_center().x - 0.5 * screen.x) * depth / focal
	camera.position = Vector3(aim_x, 3.4, -7.0)
	camera.look_at(Vector3(aim_x, world_center.y, world_center.z))
	camera.current = true

func _build_app() -> void:
	_shell = CanvasLayer.new()
	_shell.name = "KL_FULL_APP_NATIVE_SHELL"
	add_child(_shell)
	var root := Control.new()
	root.name = "KL_APP_ROOT"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_shell.add_child(root)
	var outer := VBoxContainer.new()
	outer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	outer.add_theme_constant_override("separation", 5)
	root.add_child(outer)
	var top := VBoxContainer.new()
	top.add_theme_constant_override("separation",4)
	outer.add_child(top)
	_screen_title = _heading("KlinikLab · Dental Skills", 22)
	top.add_child(_screen_title)
	var tab_scroll := ScrollContainer.new()
	tab_scroll.custom_minimum_size = Vector2(0,44)
	tab_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tab_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	tab_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	top.add_child(tab_scroll)
	var tabs := HBoxContainer.new()
	tab_scroll.add_child(tabs)
	for section in ["clinic", "environment", "learning", "journey", "language", "anatomy", "radiology", "scans", "progress", "coverage"]:
		var b := _button(section.capitalize())
		b.pressed.connect(_switch_view.bind(section))
		tabs.add_child(b)
	for mode in ["overview", "teeth"]:
		var camera_button := _button(mode.capitalize() + " camera")
		camera_button.pressed.connect(_set_camera_mode.bind(mode))
		tabs.add_child(camera_button)
	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	outer.add_child(body)
	_left_column = VBoxContainer.new()
	body.add_child(_left_column)
	_left_panel = PanelContainer.new()
	_style_panel(_left_panel)
	_left_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_left_column.add_child(_left_panel)
	_nav_scroll = ScrollContainer.new()
	_nav_scroll.name = "CaseNavigationVerticalOnly"
	_nav_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_nav_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_nav_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_nav_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_left_panel.add_child(_nav_scroll)
	var nav_col := VBoxContainer.new()
	nav_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_nav_scroll.add_child(nav_col)
	nav_col.add_child(_heading("Case teeth · FDI", 16))
	_nav_case_grid = GridContainer.new()
	_nav_case_grid.name = "KL_FDI_CASE_GRID"
	_nav_case_grid.columns = 2
	_nav_case_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_nav_case_grid.add_theme_constant_override("h_separation", 5)
	_nav_case_grid.add_theme_constant_override("v_separation", 5)
	nav_col.add_child(_nav_case_grid)
	_nav_case_buttons.clear()
	for i in range(_cases.size()):
		var c: Dictionary = _cases[i]
		var btn := _button("FDI " + str(c["fdi"]))
		btn.name = "KL_FDI_CASE_" + str(c["fdi"])
		btn.tooltip_text = "FDI %s · %s · %s" % [str(c["fdi"]), str(c["id"]).capitalize(), str(c["title"])]
		btn.toggle_mode = true
		btn.autowrap_mode = TextServer.AUTOWRAP_OFF
		btn.add_theme_font_size_override("font_size", 14)
		btn.custom_minimum_size = Vector2(0, 42)
		btn.pressed.connect(_select_case.bind(i))
		_nav_case_buttons.append(btn)
		_nav_case_grid.add_child(btn)
	nav_col.add_child(_heading("Training stations", 16))
	_nav_station_list = VBoxContainer.new()
	_nav_station_list.name = "KL_STATION_LIST"
	_nav_station_list.add_theme_constant_override("separation", 5)
	_nav_station_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	nav_col.add_child(_nav_station_list)
	_nav_station_buttons.clear()
	for i in range(_stations.size()):
		var st: Dictionary = _stations[i]
		var btn := _button("%d · %s" % [i + 1, NAV_STATION_SHORT[i]])
		btn.name = "KL_STATION_" + STATION_IDS[i]
		btn.tooltip_text = str(st["title"]) + " · " + str(st["subtitle"])
		btn.toggle_mode = true
		btn.autowrap_mode = TextServer.AUTOWRAP_OFF
		btn.add_theme_font_size_override("font_size", 14)
		btn.custom_minimum_size = Vector2(0, 42)
		btn.pressed.connect(_select_station.bind(i))
		_nav_station_buttons.append(btn)
		_nav_station_list.add_child(btn)
	_middle = Control.new()
	_middle.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_middle.custom_minimum_size = Vector2(270,0)
	_middle.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(_middle)
	_right_column = VBoxContainer.new()
	body.add_child(_right_column)
	_right_panel = PanelContainer.new()
	_style_panel(_right_panel)
	_right_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_right_column.add_child(_right_panel)
	_page_scroll = ScrollContainer.new()
	_page_scroll.name = "ClinicalNotesVerticalOnly"
	_page_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_page_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_page_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_page_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_right_panel.add_child(_page_scroll)
	_page = VBoxContainer.new()
	_page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_page.add_theme_constant_override("separation", 10)
	_page_scroll.add_child(_page)
	_progress_label = _heading("", 13)
	outer.add_child(_progress_label)
	outer.add_child(_heading("Synthetic educational cases · local only · no medical-device/clinical/exam validation · complete app port IN PROGRESS", 12))
	_update_responsive_layout()
	get_viewport().size_changed.connect(_update_responsive_layout)

func _show_blocked(reason: String) -> void:
	_shell = CanvasLayer.new()
	add_child(_shell)
	var label := Label.new()
	label.text = "KLINIKLAB NATIVE STARTUP BLOCKED: " + reason
	label.position = Vector2(20, 20)
	_shell.add_child(label)

func _clear_page() -> void:
	_language_save_draft()
	_save_draft()
	_save_quiz_recall()
	_practical_feedback.clear()
	for c in _page.get_children():
		_page.remove_child(c)
		c.queue_free()
	_draft = null
	_letter_fields.clear()
	_plan_fields.clear()
	_writing_review_label = null
	_writing_reference_panel = null
	_writing_key = ""
	_language_draft = null
	_language_draft_key = ""
	_answer_label = null
	_quiz_recall_edit = null
	_quiz_recall_key = ""
	_quiz_next_button = null

func _key() -> String:
	return CASE_IDS[_case_index] + ":" + STATION_IDS[_station_index]

func _select_case(index: int) -> void:
	if index < 0 or index >= _cases.size():
		return
	_save_quiz_recall()
	_quiz_revealed = false
	_save_draft()
	_case_index = index
	_procedure_guided = false
	_procedure_step_index = 0
	_direct_bur_mode = false # explicitly opt in for every new tooth
	_quiz_index = 0
	_journey_stage = 0
	if _page_scroll != null:
		_page_scroll.scroll_vertical = 0
	_ensure_case_volume(index)
	_show_case_geometry()
	call_deferred("_frame_visible_camera")
	if _atlas != null:
		_atlas.call("select_tooth",FDI[index])
	_save_progress()
	_refresh()

func _select_station(index: int) -> void:
	if index < 0 or index >= _stations.size():
		return
	_save_quiz_recall()
	_quiz_revealed = false
	_save_draft()
	var entering_practical := _station_index != 4 and index == 4 and _view == "clinic"
	var leaving_practical := _station_index == 4 and index != 4 and _view == "clinic"
	_station_index = index
	# Practical defaults to a useful FDI-specific close-up. Leaving it
	# restores room overview; neither transition affects case/FDI identity.
	# Camera buttons still allow deliberate manual overview/teeth switching.
	if entering_practical or leaving_practical:
		_camera_mode = "teeth" if entering_practical else "overview"
		_apply_environment_visibility()
	if STATION_IDS[index] != "practical":
		_procedure_guided = false
		_procedure_step_index = 0
		_direct_bur_mode = false
	_quiz_index = 0
	if _page_scroll != null:
		_page_scroll.scroll_vertical = 0
	_save_progress()
	_refresh()
	call_deferred("_frame_visible_camera")

func _ensure_case_volume(index: int) -> void:
	if _scene == null or index < 0 or index >= CASE_IDS.size():
		return
	var id: String = CASE_IDS[index]
	_volume = null
	if _volumes.has(id):
		_volume = _volumes[id]
		return
	var script: GDScript = load("res://volume-cut.gd")
	if script == null:
		push_warning("Native synthetic volume script unavailable for FDI " + FDI[index])
		return
	var editable: Node3D = script.new()
	if not bool(editable.call("configure", str(_content["sourceGitSHA"]), id)):
		push_warning("Source-pinned FDI %s synthetic volume rejected: %s" % [FDI[index],str(editable.call("error"))])
		editable.free()
		return
	var saved_volumes: Dictionary = _progress.get("volumeByCase", {})
	var strokes: Variant = saved_volumes.get(id, [])
	if not bool(editable.call("restore_strokes", strokes)):
		push_warning("Saved strokes rejected for FDI " + FDI[index] + "; case volume reset")
		editable.call("reset")
	_scene.add_child(editable)
	_volumes[id] = editable
	_volume = editable

func _show_case_geometry() -> void:
	if _scene == null:
		return
	var show_original: bool = CASE_IDS[_case_index] == "molar"
	for node_name in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		var original: Node3D = _scene.get_node_or_null(node_name)
		if original != null:
			original.visible = show_original and (node_name != "KL_FDI16_AFTER" or _volume == null)
	for id in _volumes:
		var editor: Node3D = _volumes[id]
		editor.visible = str(id) == CASE_IDS[_case_index]
	if _atlas != null:
		_atlas.visible = _view == "anatomy" or (_view == "clinic" and not show_original)
	_update_fdi36_reference_visibility()
	_update_fdi26_reference_visibility()
	_update_fdi16_mirror_visibility()

func _set_environment_camera() -> void:
	if _scene == null:
		return
	if _walk_active and _view == "environment":
		_apply_walk_camera()
		return
	var camera: Camera3D = _scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if camera == null:
		push_warning("Source scene camera missing for CC0 environment")
		return
	# SR51: use the unobscured central column and draw the static CC0 room
	# closer without changing imported scene transforms or walk controls.
	_frame_environment_camera()
	call_deferred("_frame_visible_camera")
	# In this dedicated environment overview, avoid mistaking original
	# source tooth podiums for anatomical objects inside the CC0 floor.
	for id in _volumes:
		(_volumes[id] as Node3D).visible=false
	for name in ["KL_FDI16_BEFORE","KL_FDI16_AFTER"]:
		var tooth: Node3D = _scene.get_node_or_null(name)
		if tooth!=null:
			tooth.visible=false

func _show_environment() -> void:
	_page.add_child(_heading("Imported CC0 3DAssets.dev dental practice • native scene",18))
	_page.add_child(_heading("The assembled whole-clinic starter and a separate instrument tray are imported GLB meshes, instantiated in the REAL Godot application. The schematic background is disabled; the original source-identified six FDI/tooth/training flows remain independent.",14))
	if _cc0_clinic!=null:
		var report: Dictionary = _cc0_clinic.call("summary")
		_page.add_child(_heading("Imported clinic mesh instances: %s · static tray meshes: %s · original GLB hashes: verified" % [str(report.get("wholeMeshInstances",0)),str(report.get("trayMeshInstances",0))],14))
		_page.add_child(_heading("CC0 source pack: %d GLB models catalogued; %d original scene assets loaded + %d separately imported operatory chair = %d runtime GLBs. Chair: %s." % [int(report.get("cataloguedSourceGLBs",0)),int(report.get("requiredGLBsLoaded",0)),int(bool(report.get("optionalChairLoaded",false))),int(report.get("requiredGLBsLoaded",0))+int(bool(report.get("optionalChairLoaded",false))),"real CC0 model loaded" if bool(report.get("optionalChairLoaded",false)) else "asset unavailable; labelled fallback"],14))
	_page.add_child(_heading("CC0 1.0 · 3dassets.dev / Dental Practice and Surgery. Stylized static environment; not calibrated dental anatomy, full instrument physics, a clinical procedure simulator, or a patient record.",12))
	if not _walk_active:
		var start_walk := _button("Walk clinic (WASD / arrows, right-drag to look)")
		start_walk.pressed.connect(_start_clinic_walk)
		_page.add_child(start_walk)
	else:
		_page.add_child(_heading("Room exploration preview: WASD / arrows move; right-drag over central 3D view to look; E enters the operatory when nearby; Esc exits walk. Bounded navigation only: no collision or clinical-scale calibration.",13))
		var within: bool = bool(_walk.call("in_operatory_range"))
		var language_within: bool = bool(_walk.call("in_language_station_range"))
		_page.add_child(_heading("Dental practical operatory: " + ("in range" if within else "walk toward the operatory marker"),14))
		var enter := _button("Enter selected FDI %s practical station (E)" % FDI[_case_index])
		enter.disabled = not within
		enter.pressed.connect(_walk_enter_procedure)
		_page.add_child(enter)
		_page.add_child(_heading("FSP/KP language station: " + ("in range" if language_within else "walk toward the separate language-station marker"),14))
		var language_enter := _button("Enter FSP/KP language station (E)")
		language_enter.disabled = not language_within
		language_enter.pressed.connect(_walk_enter_language_station)
		_page.add_child(language_enter)
		var stop_walk := _button("Exit walk (Esc)")
		stop_walk.pressed.connect(_stop_clinic_walk)
		_page.add_child(stop_walk)
	var to_clinic:=_button("Return to six-case clinical training")
	to_clinic.pressed.connect(_switch_view.bind("clinic"))
	_page.add_child(to_clinic)

func _set_camera_mode(mode: String) -> void:
	if _scene == null or not (mode in ["overview", "teeth"]):
		return
	_camera_mode = mode
	_apply_environment_visibility()
	_frame_visible_camera()
	call_deferred("_frame_visible_camera")

func _apply_environment_visibility() -> void:
	if _cc0_clinic != null:
		_cc0_clinic.call("set_environment_visible", _view == "environment" or (_view == "clinic" and _camera_mode == "overview"))

func _switch_view(view: String) -> void:
	if not (view in ["clinic", "environment", "learning", "journey", "language", "anatomy", "radiology", "scans", "progress", "coverage"]):
		return
	if _view == "language" and view != "language":
		_language_save_draft()
	if _view == "clinic" and view != "clinic":
		_save_quiz_recall()
		_quiz_revealed = false
		_save_draft()
	_view = view
	_update_fdi36_reference_visibility()
	_update_fdi26_reference_visibility()
	_update_fdi16_mirror_visibility()
	if view != "environment":
		_walk_active = false
		_walk_look_dragging = false
	if view != "clinic":
		_procedure_guided = false
		_procedure_step_index = 0
		_direct_bur_mode = false
	if _scene != null:
		_scene.visible = view in ["clinic","environment"]
	if _atlas != null:
		_atlas.visible = view == "anatomy" or (view == "clinic" and _case_index != 0)
		_atlas.call("set_camera_enabled",view == "anatomy")
	if _scan != null:
		_scan.visible = view == "scans"
		_scan.call("set_camera_enabled",view == "scans")
	if view == "clinic":
		_set_camera_mode(_camera_mode)
		_show_case_geometry()
	if view == "environment":
		_set_environment_camera()
	_apply_environment_visibility()
	if _legacy_workspace != null:
		_legacy_workspace.visible = false
	_update_responsive_layout()
	_refresh()

func _sync_navigation_selection() -> void:
	# Toggle state is an indicator only: the authoritative selected indices
	# remain the original six-case/seven-station source-backed values.
	for i in range(_nav_case_buttons.size()):
		_nav_case_buttons[i].set_pressed_no_signal(i == _case_index)
	for i in range(_nav_station_buttons.size()):
		_nav_station_buttons[i].set_pressed_no_signal(i == _station_index)

func _refresh() -> void:
	if _page == null:
		return
	_clear_page()
	_update_responsive_layout()
	_sync_navigation_selection()
	if _screen_title != null:
		if _view == "environment":
			_screen_title.text = "KlinikLab · CC0 Clinic Environment"
		elif _view == "clinic":
			_screen_title.text = "KlinikLab · FDI %s · %s" % [FDI[_case_index],str(_stations[_station_index]["title"])]
		else:
			_screen_title.text = "KlinikLab · %s" % _view.capitalize()
	var c: Dictionary = _cases[_case_index]
	var s: Dictionary = _stations[_station_index]
	if _view == "language":
		_page.add_child(_heading("FSP/KP · Original German language studio",21))
	else:
		_page.add_child(_heading("FDI " + str(c["fdi"]) + "  " + str(c["title"]), 21))
		_page.add_child(_heading("Station %d/7 · %s" % [_station_index + 1, str(s["title"])], 17))
	if _view == "progress":
		_show_progress()
	elif _view == "language":
		_show_language_studio()
	elif _view == "journey":
		_show_journey()
	elif _view == "environment":
		_show_environment()
	elif _view == "anatomy":
		_show_atlas_controls()
	elif _view == "scans":
		_show_scan_controls()
	elif _view == "radiology":
		_show_radiology()
	elif _view == "coverage":
		_show_coverage()
	elif _writing_focus_active():
		# Source/browser text-first FSP/KP writing: show fields before long reference notes.
		_show_station()
	else:
		_page.add_child(_heading("Complaint: " + str(c["complaint"]), 15))
		_page.add_child(_heading("Medical history: " + str(c["history"]), 14))
		_page.add_child(_heading("Exam: " + str(c["exam"]), 14))
		_page.add_child(_heading("Risk/uncertainty: " + str(c["risk"]), 14))
		if CASE_IDS[_case_index] != "molar":
			if _volume != null and _atlas != null:
				_page.add_child(_heading("FDI %s: source-derived preview (center) and independently editable case-specific synthetic volume (right). The model is not patient anatomy or calibrated operative training." % FDI[_case_index], 14))
			else:
				_page.add_child(_heading("FDI %s: some source-derived geometry unavailable or failed integrity checking; no FDI16 model substitution." % FDI[_case_index], 14))
		else:
			if _volume != null:
				_page.add_child(_heading("FDI16: original untouched mesh (left), editable synthetic scalar-field cut mesh (right). Changes are real 3D volume subtraction with undo/reset; not calibrated clinical drilling.", 14))
			else:
				_page.add_child(_heading("FDI16 original immutable mesh states only. Editable source field unavailable or failed integrity checks.", 14))
		_show_station()
	_progress_label.text = "Completed study records: %d · Answer records: %d · Offline educational progress" % [
		(_progress["studied"] as Dictionary).size(), (_progress["answers"] as Dictionary).size()]

func _ensure_fdi36_reference() -> void:
	if _tooth36_reference != null or _scene == null:
		return
	var script: GDScript = load("res://tooth36-reference.gd")
	if script == null:
		var fallback := Node3D.new()
		fallback.name = "KL_DUNDEE_FDI36_SOURCE_SURFACE_REFERENCE"
		var label := Label3D.new()
		label.text = "FDI 36 source surface asset unavailable"
		fallback.add_child(label)
		_scene.add_child(fallback)
		_tooth36_reference = fallback
		return
	var reference: Node3D = script.new()
	if not bool(reference.call("configure",str(_content.get("sourceGitSHA","")))):
		push_warning("FDI36 source reference loader rejected: "+str(reference.call("summary")))
		_scene.add_child(reference)
		_tooth36_reference = reference
		return
	_scene.add_child(reference)
	_tooth36_reference = reference

func _update_fdi36_reference_visibility() -> void:
	if _tooth36_reference == null:
		return
	_tooth36_reference.visible = _view == "clinic" and _station_index == 4 and _case_index == 1

func _ensure_fdi26_reference() -> void:
	if _tooth26_reference != null or _scene == null:
		return
	var script: GDScript = load("res://tooth26-reference.gd")
	if script == null:
		var fallback := Node3D.new()
		fallback.name = "KL_DUNDEE_FDI26_SOURCE_SURFACE_REFERENCE"
		var label := Label3D.new()
		label.text = "FDI 26 source surface asset unavailable"
		fallback.add_child(label)
		_scene.add_child(fallback)
		_tooth26_reference = fallback
		return
	var reference: Node3D = script.new()
	if not bool(reference.call("configure",str(_content.get("sourceGitSHA","")))):
		push_warning("FDI26 source reference loader rejected: "+str(reference.call("summary")))
		_scene.add_child(reference)
		_tooth26_reference = reference
		return
	_scene.add_child(reference)
	_tooth26_reference = reference

func _update_fdi26_reference_visibility() -> void:
	if _tooth26_reference == null:
		return
	_tooth26_reference.visible = _view == "clinic" and _station_index == 4 and _case_index == 3

func _ensure_fdi16_mirror() -> void:
	if _tooth16_mirror != null or _scene == null:
		return
	var script: GDScript = load("res://tooth16-mirror-reference.gd")
	if script == null:
		var fallback := Node3D.new()
		fallback.name = "KL_DUNDEE_FDI16_MIRRORED_SOURCE_SURFACE_REFERENCE"
		var label := Label3D.new()
		label.text = "FDI 16 mirrored source surface asset unavailable"
		fallback.add_child(label)
		_scene.add_child(fallback)
		_tooth16_mirror = fallback
		return
	var reference: Node3D = script.new()
	if not bool(reference.call("configure",str(_content.get("sourceGitSHA","")))):
		push_warning("FDI16_MIRRORED source reference loader rejected: "+str(reference.call("summary")))
		_scene.add_child(reference)
		_tooth16_mirror = reference
		return
	_scene.add_child(reference)
	_tooth16_mirror = reference

func _update_fdi16_mirror_visibility() -> void:
	if _tooth16_mirror == null:
		return
	_tooth16_mirror.visible = _view == "clinic" and _station_index == 4 and _case_index == 0

func _show_station() -> void:
	var station: String = str(STATION_IDS[_station_index])
	if station in ["interview", "handover", "viva", "clinic"]:
		_show_quiz(station)
	elif station == "practical":
		_show_practical()
	else:
		_show_writing(station)
	if _view == "clinic" and station == "practical" and _walk_station_return_available:
		var return_walk := _button("Return to clinic walk at operatory (no grading or drilling)")
		return_walk.pressed.connect(_return_to_clinic_walk)
		_page.add_child(return_walk)
	var studied := _button("Mark this case/station studied (formative only)")
	studied.pressed.connect(_mark_studied)
	_page.add_child(studied)

func _quiz_recall_id(station: String, index: int) -> String:
	return CASE_IDS[_case_index] + ":" + station + ":" + str(index)

func _save_quiz_recall() -> void:
	if _quiz_recall_edit == null or _quiz_recall_key.is_empty():
		return
	var drafts: Dictionary = _progress.get("quizRecall", {})
	drafts[_quiz_recall_key] = _quiz_recall_edit.text.substr(0,2400)
	_progress["quizRecall"] = drafts
	_save_progress()

func _reveal_quiz_options() -> void:
	_save_quiz_recall()
	_quiz_revealed = true
	_refresh()

func _show_quiz(station: String) -> void:
	var questions: Array = _content["quiz"][station]
	_quiz_index = clampi(_quiz_index, 0, questions.size() - 1)
	var q: Dictionary = questions[_quiz_index]
	if station == "interview":
		var patient: Dictionary = _cases[_case_index]
		_page.add_child(_heading("Simulated patient: %s, %s Jahre (fictional source case)" %
			[str(patient["patientName"]),str(patient["patientAge"])], 14))
	_page.add_child(_heading("Practice question %d/%d: %s" % [
		_quiz_index + 1, questions.size(), str(q["question"])], 16))
	# Browser expert-mode parity: formulate German reasoning before the answer reveal.
	_quiz_recall_key = _quiz_recall_id(station,_quiz_index)
	_page.add_child(_heading("Freie Antwort · zuerst selbst formulieren (formative active recall)",14))
	_page.add_child(_heading("Answer aloud in German and write a short reasoning note before revealing the suggested responses. This is not an official FSP/KP examination grade.",13))
	_quiz_recall_edit = TextEdit.new()
	_quiz_recall_edit.name = "KL_QUIZ_ACTIVE_RECALL"
	_quiz_recall_edit.custom_minimum_size = Vector2(475,105)
	_quiz_recall_edit.text = str((_progress.get("quizRecall",{}) as Dictionary).get(_quiz_recall_key,""))
	_page.add_child(_quiz_recall_edit)
	var existing: Dictionary = (_progress["answers"] as Dictionary).get(_key() + ":" + str(_quiz_index), {})
	if not _quiz_revealed and existing.is_empty():
		var reveal := _button("Reveal response choices (does not grade the note)")
		reveal.name = "KL_QUIZ_REVEAL_CHOICES"
		reveal.pressed.connect(_reveal_quiz_options)
		_page.add_child(reveal)
	else:
		for i in range(3):
			var b := _button("%d. %s" % [i + 1, str(q["options"][i])])
			b.name = "KL_QUIZ_OPTION_" + str(i)
			b.disabled = bool(existing.get("correct", false))
			b.pressed.connect(_answer.bind(station, _quiz_index, i))
			_page.add_child(b)
	_answer_label = _heading("Options are shown only after your active recall reveal. Explanations remain formative, not clinical grading.", 14)
	if existing.get("correct", false):
		_answer_label.text = str(q["explanation"])
		if station == "interview":
			_answer_label.text += "\nPatient: " + str((_cases[_case_index]["patientReply"] as Array)[_quiz_index])
	_page.add_child(_answer_label)
	# Browser parity: advancement requires the current source question correct.
	# Returning to a previously solved case restores this state without regrading.
	_quiz_next_button = _button("Finish station ✓" if _quiz_index == questions.size() - 1 else "Next source question")
	_quiz_next_button.name = "KL_QUIZ_NEXT"
	_quiz_next_button.disabled = not bool(existing.get("correct", false))
	_quiz_next_button.pressed.connect(_next_question)
	_page.add_child(_quiz_next_button)
	if bool((_progress["studied"] as Dictionary).get(_key(), false)):
		_page.add_child(_heading("Station previously completed · local formative record only.", 13))

func _answer(station: String, index: int, choice: int) -> void:
	if choice < 0 or choice > 2 or station != STATION_IDS[_station_index] or index != _quiz_index:
		return
	var q: Dictionary = _content["quiz"][station][index]
	var answer_key := _key() + ":" + str(index)
	# Native expert mode requires the answer choices to have been deliberately
	# revealed. Previously wrong source answers remain available for retries.
	if not _quiz_revealed and not (_progress["answers"] as Dictionary).has(answer_key):
		return
	# Once solved, source browser disallows replacing a correct recorded choice.
	if bool(((_progress["answers"] as Dictionary).get(answer_key, {}) as Dictionary).get("correct", false)):
		return
	var correct := choice == int(q["correct"])
	(_progress["answers"] as Dictionary)[answer_key] = {
		"selected": choice, "correct": correct, "sourceQuestion": index}
	_save_progress()
	if _answer_label != null:
		_answer_label.text = ("Correct. " if correct else "Review suggested. ") + str(q["explanation"])
		if station == "interview" and correct:
			_answer_label.text += "\nPatient: " + str((_cases[_case_index]["patientReply"] as Array)[index])
	if correct:
		# Keep the learner's unsaved active-recall note and unlock Next in place.
		if _quiz_next_button != null:
			_quiz_next_button.disabled = false
		if _page != null:
			for i in range(3):
				var option: Button = _page.get_node_or_null("KL_QUIZ_OPTION_" + str(i)) as Button
				if option != null:
					option.disabled = true

func _next_question() -> void:
	if not (STATION_IDS[_station_index] in ["interview", "handover", "viva", "clinic"]):
		return
	var key := _key() + ":" + str(_quiz_index)
	if not bool(((_progress["answers"] as Dictionary).get(key, {}) as Dictionary).get("correct", false)):
		# A direct method call must not bypass disabled UI controls.
		return
	_save_quiz_recall()
	_quiz_revealed = false
	var questions: Array = _content["quiz"][STATION_IDS[_station_index]]
	if _quiz_index >= questions.size() - 1:
		# Last correct source question: browser Finish marks this case/station
		# complete. This is a formative record, not an official exam score.
		(_progress["studied"] as Dictionary)[_key()] = true
		_save_progress()
	else:
		_quiz_index += 1
	_refresh()

func _language_task_key() -> String:
	return _language_case + "|" + _language_phase

func _language_save_draft() -> void:
	if _language_draft == null or _language_draft_key.is_empty():
		return
	var stored: Dictionary = _progress.get("fspKpByTask", {})
	var record: Dictionary = stored.get(_language_draft_key,{})
	var value := _language_draft.text.substr(0,6000)
	if str(record.get("text","")) != value:
		record["text"] = value
		# A changed answer invalidates earlier lexical feedback.
		record.erase("result")
		stored[_language_draft_key] = record
		_progress["fspKpByTask"] = stored
		_save_progress()

func _language_switch_case(id: String) -> void:
	if _language == null or not (_language.call("case_ids") as Array).has(id):
		return
	_language_save_draft()
	_language_case = id
	_language_model_revealed = false
	_refresh()

func _language_switch_phase(id: String) -> void:
	if _language == null or not (_language.call("phase_ids") as Array).has(id):
		return
	_language_save_draft()
	_language_phase = id
	_language_model_revealed = false
	_refresh()

func _language_submit() -> void:
	if _language == null or _language_draft == null:
		return
	var text_answer := _language_draft.text.substr(0,6000)
	var result: Dictionary = _language.call("score",_language_case,_language_phase,text_answer)
	if bool(result.get("invalid",true)):
		push_warning("German formative rubric could not evaluate source question")
		return
	var record := {"text":text_answer,"result":result}
	var stored: Dictionary = _progress.get("fspKpByTask",{})
	stored[_language_task_key()] = record
	_progress["fspKpByTask"] = stored
	_save_progress()
	_refresh()

func _language_reveal_model() -> void:
	_language_save_draft()
	_language_model_revealed = not _language_model_revealed
	_refresh()

func _language_reset_exercise() -> void:
	var stored: Dictionary = _progress.get("fspKpByTask",{})
	stored.erase(_language_task_key())
	_progress["fspKpByTask"] = stored
	_language_draft = null
	_save_progress()
	_refresh()

func _show_language_studio() -> void:
	if _walk_language_return_available:
		var return_walk := _button("Return to clinic walk from FSP/KP station (no progress loss)")
		return_walk.pressed.connect(_return_to_clinic_walk)
		_page.add_child(return_walk)
	if _language == null:
		_page.add_child(_heading("Original FSP/KP source not available", 14))
		return
	_page.add_child(_heading("Four original fictional cases × four language exercises. Separate from the six procedural dental cases. No patient records, language qualification or clinical certification.",13))
	_page.add_child(_heading("The browser source presents patient conversation → written dental letter → colleague handover; consent is an additional patient-conversation exercise, not an official fourth exam part. Regional requirements may vary.",12))
	_page.add_child(_heading("Original German training cases",15))
	for id in _language.call("case_ids"):
		var item: Dictionary = _language.call("case_data",str(id))
		var button := _button(("✓ " if str(id)==_language_case else "") + str(item["title"]))
		button.pressed.connect(_language_switch_case.bind(str(id)))
		_page.add_child(button)
	var current: Dictionary = _language.call("case_data",_language_case)
	_page.add_child(_heading("Fictional case notes: " + str(current["facts"]),13))
	_page.add_child(_heading("Original four-phase exercise",15))
	var phase_ids: Array = _language.call("phase_ids")
	for i in range(phase_ids.size()):
		var id: String = phase_ids[i]
		var caption: String = ["Anamnese","Aufklärung","Befund / Arztbrief","Arzt-Arzt"][i]
		var button := _button(("✓ " if id == _language_phase else "") + caption)
		button.pressed.connect(_language_switch_phase.bind(id))
		_page.add_child(button)
	var task: Dictionary = _language.call("phase_data",_language_case,_language_phase)
	if task.is_empty():
		_page.add_child(_heading("Original language prompt missing",14))
		return
	_page.add_child(_heading("Übungsaufgabe: " + str(task["prompt"]),15))
	_page.add_child(_heading("B2 sprachliche Stütze: " + str(task["b2"]),13))
	_page.add_child(_heading("C1 sprachliche Stütze: " + str(task["c1"]),13))
	var stored: Dictionary = _progress.get("fspKpByTask",{})
	var state: Dictionary = stored.get(_language_task_key(),{})
	_language_draft = TextEdit.new()
	_language_draft.custom_minimum_size = Vector2(480,245)
	_language_draft.text = str(state.get("text","")).substr(0,6000)
	_language_draft_key = _language_task_key()
	_language_draft.focus_exited.connect(_language_save_draft)
	_page.add_child(_language_draft)
	var check := _button("Speichern und formativ prüfen (Stichwortabdeckung)")
	check.pressed.connect(_language_submit)
	_page.add_child(check)
	if state.get("result",{}) is Dictionary and not (state.get("result",{}) as Dictionary).is_empty():
		var result: Dictionary = state["result"]
		if (result.get("flags",[]) as Array).is_empty():
			_page.add_child(_heading("Lexikalische Stichwortabdeckung: %d / 10 (keine Prüfungsnote)" % int(result.get("lexicalScore",0)),15))
		else:
			_page.add_child(_heading("Bewertung wegen Sicherheitsformulierung ausgesetzt; automatische Stichwortabdeckung: %d/10 (keine Prüfungsnote)" % int(result.get("lexicalScore",0)),15))
			for warning in result["flags"]:
				_page.add_child(_heading("Fachliche Überprüfung erforderlich: " + str(warning),13))
		for row in result.get("criteria",[]):
			var check_record: Dictionary = row
			_page.add_child(_heading(("✓ " if bool(check_record.get("matched",false)) else "○ ") +
				str(check_record.get("label",""))+" — "+str(check_record.get("tip","")),12))
		_page.add_child(_heading("Keyword matching cannot establish grammar, fluency, clinical appropriateness or proper handling of negation.",12))
	_page.add_child(_heading("Original Deutsch–Englisch Glossar",14))
	for pair in current["glossary"]:
		_page.add_child(_heading(str(pair[0])+" — "+str(pair[1]),12))
	var reveal := _button("Musterantwort anzeigen / verbergen")
	reveal.pressed.connect(_language_reveal_model)
	_page.add_child(reveal)
	if _language_model_revealed:
		_page.add_child(_heading("Originale Musterantwort (Lehrbeispiel): " + str(task["model"]),13))
	var reset := _button("Diese FSP/KP Übungsantwort löschen")
	reset.pressed.connect(_language_reset_exercise)
	_page.add_child(reset)

const LETTER_SECTIONS := ["anamnese", "befund", "diagnose", "therapie"]
const LETTER_LABELS := ["Anamnese und Leitsymptom", "Untersuchungsbefund", "Verdachts-/Differenzialdiagnose", "Therapie / weiteres Vorgehen"]
const PLAN_SECTIONS := ["diagnosis", "planA", "planB", "followup"]
const PLAN_LABELS := ["Arbeitsdiagnose und erforderliche Zusatzbefunde", "Behandlungsplan A — Zahnerhalt / bevorzugte Option", "Behandlungsplan B — Alternative", "Aufklärung, Einwilligung, Nachsorge"]

func _show_writing(station: String) -> void:
	var c: Dictionary = _cases[_case_index]
	var prompt := "Write a German FSP clinical letter using the history, examination, uncertainty and plan." if station == "letter" else "Create a reasoned differential diagnosis and compare TWO treatment choices; include consent and safety checks."
	_page.add_child(_heading(prompt, 15))
	_page.add_child(_heading("Fictional presenting complaint: " + str(c["complaint"]), 14))
	_writing_key = _key()
	if station == "letter":
		_page.add_child(_heading("FSP Arztbrief · four source-aligned sections; handwritten practice remains separate.", 14))
		_page.add_child(_heading("Fictional case history: " + str(c["history"]) + " · Examination: " + str(c["exam"]), 13))
		var section_store: Dictionary = _progress.get("letterSectionsByCase", {})
		var record: Dictionary = section_store.get(CASE_IDS[_case_index], {})
		if record.is_empty():
			var legacy := str((_progress["notes"] as Dictionary).get(_writing_key, ""))
			if not legacy.is_empty():
				record = {"anamnese": legacy}
				_page.add_child(_heading("Existing single-field draft retained in first section. Review and redistribute manually.", 13))
		for section_index in range(LETTER_SECTIONS.size()):
			var id: String = LETTER_SECTIONS[section_index]
			_page.add_child(_heading(str(LETTER_LABELS[section_index]), 14))
			var field := TextEdit.new()
			field.name = "KL_FSP_LETTER_" + id
			field.custom_minimum_size = Vector2(0, 130)
			field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			field.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
			field.text = str(record.get(id, ""))
			_letter_fields[id] = field
			_page.add_child(field)
		_page.add_child(_heading("Self-review: neutral language · findings · stated uncertainty · justified alternatives · consent. Not handwriting or FSP certification.", 13))
	else:
		_page.add_child(_heading("KP schriftliche Planung · four independent case-specific reasoning fields.", 14))
		_page.add_child(_heading("Fictional case history: " + str(c["history"]) + " · Examination: " + str(c["exam"]), 13))
		var plan_store: Dictionary = _progress.get("planSectionsByCase", {})
		var plan_record: Dictionary = plan_store.get(CASE_IDS[_case_index], {})
		if plan_record.is_empty():
			var legacy_plan := str((_progress["notes"] as Dictionary).get(_writing_key, ""))
			if not legacy_plan.is_empty():
				plan_record = {"diagnosis": legacy_plan}
				_page.add_child(_heading("Existing one-field KP plan retained under diagnosis for manual redistribution.", 13))
		for i in range(PLAN_SECTIONS.size()):
			var id: String = PLAN_SECTIONS[i]
			_page.add_child(_heading(str(PLAN_LABELS[i]), 14))
			var field := TextEdit.new()
			field.name = "KL_KP_PLAN_" + id
			field.custom_minimum_size = Vector2(0, 130)
			field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			field.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
			field.text = str(plan_record.get(id, ""))
			_plan_fields[id] = field
			_page.add_child(field)
		_page.add_child(_heading("Compare indication, prognosis, benefits, risks, consent and follow-up. Sample plans are illustrative, not treatment advice.", 13))
	var save := _button("Save draft on this computer")
	save.pressed.connect(_save_draft)
	_page.add_child(save)
	var review := _button("Review FSP structure (formative only)" if station == "letter" else "Review KP structure (formative only)")
	review.name = "KL_WRITING_STRUCTURE_REVIEW"
	review.pressed.connect(_review_writing.bind(station))
	_page.add_child(review)
	_writing_review_label = _heading("Structural self-review not yet run. Content, safety, language and clinical quality must be assessed separately.", 13)
	_writing_review_label.name = "KL_WRITING_STRUCTURE_FEEDBACK"
	_page.add_child(_writing_review_label)
	# Browser KP uses a closed "Reveal sample reasoning" detail. Keep sample
	# diagnoses/treatment plans hidden until the learner opts to compare them.
	var reveal := _button("Show fictional source diagnosis and illustrative plans (optional)")
	reveal.name = "KL_WRITING_REVEAL_SOURCE"
	reveal.pressed.connect(_toggle_writing_reference)
	_page.add_child(reveal)
	_writing_reference_panel = VBoxContainer.new()
	_writing_reference_panel.name = "KL_WRITING_SOURCE_REFERENCE"
	_writing_reference_panel.visible = false
	_writing_reference_panel.add_child(_heading("Source reference · educational examples only, not a clinical answer key", 14))
	_writing_reference_panel.add_child(_heading("Working diagnosis: " + str(c["diagnosis"]), 14))
	_writing_reference_panel.add_child(_heading("Option A: " + str(c["primaryPlan"]), 14))
	_writing_reference_panel.add_child(_heading("Option B: " + str(c["alternativePlan"]), 14))
	_page.add_child(_writing_reference_panel)
	_page.add_child(_heading("Self-study note only. No automatic validated FSP/KP grading.", 13))

func _toggle_writing_reference() -> void:
	if _writing_reference_panel != null:
		_writing_reference_panel.visible = not _writing_reference_panel.visible

func _save_draft() -> void:
	if _writing_key.is_empty():
		return
	if not _letter_fields.is_empty():
		var saved: Dictionary = {}
		var sections: Array[String] = []
		for i in range(LETTER_SECTIONS.size()):
			var id: String = LETTER_SECTIONS[i]
			var field: TextEdit = _letter_fields.get(id)
			if field == null:
				return
			var value: String = field.text.substr(0, 2400)
			saved[id] = value
			sections.append(str(LETTER_LABELS[i]) + ":\n" + value)
		var case_id: String = _writing_key.get_slice(":",0)
		var records: Dictionary = _progress.get("letterSectionsByCase", {})
		records[case_id] = saved
		_progress["letterSectionsByCase"] = records
		(_progress["notes"] as Dictionary)[_writing_key] = "\n\n".join(sections).substr(0,10000)
		_save_progress()
		return
	if not _plan_fields.is_empty():
		var saved: Dictionary = {}
		var sections: Array[String] = []
		for i in range(PLAN_SECTIONS.size()):
			var id: String = PLAN_SECTIONS[i]
			var field: TextEdit = _plan_fields.get(id)
			if field == null:
				return
			var value: String = field.text.substr(0, 2400)
			saved[id] = value
			sections.append(str(PLAN_LABELS[i]) + ":\n" + value)
		var case_id: String = _writing_key.get_slice(":",0)
		var records: Dictionary = _progress.get("planSectionsByCase", {})
		records[case_id] = saved
		_progress["planSectionsByCase"] = records
		(_progress["notes"] as Dictionary)[_writing_key] = "\n\n".join(sections).substr(0,10000)
		_save_progress()
		return
	if _draft != null:
		(_progress["notes"] as Dictionary)[_writing_key] = _draft.text.substr(0, 10000)
		_save_progress()


# Mirrors the browser's deliberate *structure-only* checks (>=35 characters per
# section, literal FDI reference, distinct alternative wording). Never a grade.
func _writing_structure_feedback(station: String) -> String:
	if station not in ["letter", "written"]:
		return "No structured writing review for this station."
	var fields: Dictionary = _letter_fields if station == "letter" else _plan_fields
	var ids: Array = LETTER_SECTIONS if station == "letter" else PLAN_SECTIONS
	var substantial := 0
	var full_text := ""
	for id in ids:
		var field: TextEdit = fields.get(id)
		if field == null:
			return "Writing fields unavailable; review could not run."
		var value: String = field.text.strip_edges()
		full_text += " " + value
		if value.length() >= 35:
			substantial += 1
	if substantial < 4:
		if station == "letter":
			return "Draft coverage %d/4 sections. Complete all four with meaningful clinical information before review. Character count is not a clinical grade." % substantial
		return "Written plan draft %d/4 fields substantially completed. Document working diagnosis, two alternatives, justification and follow-up. Character count is not a clinical grade." % substantial
	if station == "letter":
		var fdi_reference: String = FDI[_case_index]
		var tooth_message := "FDI tooth reference present." if full_text.contains(fdi_reference) else "Check that tooth " + fdi_reference + " is specified accurately."
		return "Structure check passed (4/4 sections). " + tooth_message + " Review grammar, findings, clinical uncertainty, alternatives and consent yourself. NOT a formal FSP assessment."
	var plan_a: TextEdit = fields.get("planA")
	var plan_b: TextEdit = fields.get("planB")
	if plan_a.text.strip_edges().to_lower() == plan_b.text.strip_edges().to_lower():
		return "Plan A and Plan B must describe two different alternatives. This is a structure check, NOT clinical grading."
	return "Written submission includes a working diagnosis, two distinct written plans and follow-up. Self-check indications, prognosis, risks and consent. This is a structure check, NOT a formal KP assessment."

func _review_writing(station: String) -> void:
	if _writing_review_label == null or station not in ["letter", "written"]:
		return
	_save_draft() # Preserve edits before the learner navigates away.
	_writing_review_label.text = _writing_structure_feedback(station)

func _show_practical() -> void:
	var c: Dictionary = _cases[_case_index]
	if FDI[_case_index] in ["16", "11", "48", "46"]:
		var clearance_script: GDScript = load("res://fdi-reference-clearance.gd")
		if clearance_script != null:
			var disclosure: String = str(clearance_script.call("disclosure",str(FDI[_case_index])))
			if not disclosure.is_empty():
				_page.add_child(_heading(disclosure, 13))
	if _case_index == 0:
		_ensure_fdi16_mirror()
		_update_fdi16_mirror_visibility()
		var mirrored_report: Dictionary = _tooth16_mirror.call("summary") if _tooth16_mirror != null else {}
		var mirrored_state := "illustrative mirrored surface loaded" if bool(mirrored_report.get("assetLoaded",false)) else "labelled missing-asset fallback"
		_page.add_child(_heading("MODEL STATUS: ILLUSTRATIVE ONLY — FDI 16 surface: %s. MIRRORED FROM SOURCE FDI 26 (University of Dundee, School of Dentistry; CC BY 4.0). NOT source-verified right-side anatomy. Exact-side DTU/3Shape FDI16 scan candidate is not bundled pending CC BY-NC-SA 4.0 distribution/derivative review. No pulp/canals or calibrated drilling. Synthetic editable working volume remains independent." % mirrored_state,13))
	if _case_index == 3:
		_ensure_fdi26_reference()
		_update_fdi26_reference_visibility()
		var crown_report: Dictionary = _tooth26_reference.call("summary") if _tooth26_reference != null else {}
		var crown_status := "source surface mesh loaded" if bool(crown_report.get("assetLoaded",false)) else "labelled missing-asset fallback"
		_page.add_child(_heading("MODEL STATUS: SOURCE-VERIFIED SURFACE REFERENCE — FDI 26: %s · University of Dundee, School of Dentistry · CC BY 4.0. Source identity and licence are verified; this is an external surface mesh only, not clinically validated crown-preparation geometry or internal anatomy. Synthetic working volume remains separate." % crown_status,13))
	if _case_index == 1:
		_ensure_fdi36_reference()
		_update_fdi36_reference_visibility()
		var tooth_report: Dictionary = _tooth36_reference.call("summary") if _tooth36_reference != null else {}
		var tooth_status := "source surface mesh loaded" if bool(tooth_report.get("assetLoaded",false)) else "labelled missing-asset fallback"
		_page.add_child(_heading("MODEL STATUS: SOURCE-VERIFIED SURFACE REFERENCE — FDI 36: %s · University of Dundee, School of Dentistry · CC BY 4.0. Source identity and licence are verified; this is an external surface mesh only, not validated internal tissue/canal anatomy. Editable synthetic working volume remains separate." % tooth_status,13))
	# Read-only, source-grounded anatomy reference; no grading or volume mutation.
	var panel_script: GDScript = load("res://anatomy-reference-panel.gd")
	if panel_script != null:
		var source_tasks: Array = _content["practical"][_case_index]
		var current_fdi: String = str(FDI[_case_index])
		var loaded_reference := false
		match current_fdi:
			"16":
				loaded_reference = _tooth16_mirror != null and bool(_tooth16_mirror.call("summary").get("assetLoaded",false))
			"36":
				loaded_reference = _tooth36_reference != null and bool(_tooth36_reference.call("summary").get("assetLoaded",false))
			"26":
				loaded_reference = _tooth26_reference != null and bool(_tooth26_reference.call("summary").get("assetLoaded",false))
		var clearance: Dictionary = {}
		if current_fdi in ["11","48","46"]:
			var clearance_script: GDScript = load("res://fdi-reference-clearance.gd")
			if clearance_script != null:
				clearance = clearance_script.call("status_for",current_fdi)
		var sections: Array = panel_script.call("sections",str(CASE_IDS[_case_index]),current_fdi,source_tasks,loaded_reference,clearance)
		_page.add_child(_heading("ANATOMY REFERENCE — educational provenance, NOT clinical validation",16))
		for section in sections:
			_page.add_child(_heading(str(section["heading"]) + ": " + str(section["body"]),13))
	_page.add_child(_heading("Treatment: " + str(c["primaryPlan"]), 15))
	_page.add_child(_heading("Alternative: " + str(c["alternativePlan"]), 15))
	_page.add_child(_heading("Original case-specific practical tasks. All six cases have distinct local editable synthetic volume states when source checks pass; these are NOT validated operative simulations.", 14))
	var steps: Array = _content["practical"][_case_index]
	if not _procedure_guided:
		var start_guide := _button("Start guided practical (keyboard N/P to navigate original tasks)")
		start_guide.pressed.connect(_set_procedure_guided.bind(true))
		_page.add_child(start_guide)
	else:
		_procedure_step_index = clampi(_procedure_step_index, 0, maxi(0, steps.size() - 1))
		var answered: int = 0
		for i in range(steps.size()):
			if (_progress["answers"] as Dictionary).has(_key() + ":" + str(i)):
				answered += 1
		_page.add_child(_heading("Guided practical: task %d/%d · %d/%d responses recorded for this FDI case" % [
			_procedure_step_index + 1, steps.size(), answered, steps.size()], 16))
		var completed_count: int = 0
		for i in range(steps.size()):
			if _procedure_checklist_complete(i):
				completed_count += 1
		_page.add_child(_heading("Learner checklist: %d/%d manually completed · independent of answer correctness" % [completed_count, steps.size()], 14))
		_page.add_child(_heading("N = next · P = previous · R = next unanswered/incorrect task. Review navigation never answers, certifies, scores or cuts. Bur use needs independent opt-in.", 13))
		var previous := _button("Previous task (P)")
		previous.disabled = _procedure_step_index == 0
		previous.pressed.connect(_procedure_move_step.bind(-1))
		_page.add_child(previous)
		var next_task := _button("Next task (N)")
		next_task.disabled = _procedure_step_index >= steps.size() - 1
		next_task.pressed.connect(_procedure_move_step.bind(1))
		_page.add_child(next_task)
		var needs_review: int = 0
		for i in range(steps.size()):
			var saved_step: Dictionary = (_progress["answers"] as Dictionary).get(_key() + ":" + str(i), {})
			if not bool(saved_step.get("correct", false)):
				needs_review += 1
		var review_button := _button("Next task to review (R) · %d remaining" % needs_review)
		review_button.disabled = needs_review == 0
		review_button.pressed.connect(_procedure_jump_to_review)
		_page.add_child(review_button)
		var show_all := _button("Show all original practical tasks")
		show_all.pressed.connect(_set_procedure_guided.bind(false))
		_page.add_child(show_all)
	for step_index in range(steps.size()):
		if _procedure_guided and step_index != _procedure_step_index:
			continue
		var step: Dictionary = steps[step_index]
		if _procedure_guided:
			var checklist_state := CheckBox.new()
			checklist_state.text = "Practice checklist · step %d: %s (self-reported)" % [step_index + 1, "Complete" if _procedure_checklist_complete(step_index) else "Pending"]
			checklist_state.button_pressed = _procedure_checklist_complete(step_index)
			checklist_state.toggled.connect(_procedure_toggle_checklist.bind(step_index))
			_page.add_child(checklist_state)
		_page.add_child(_heading("%d. %s" % [step_index + 1, str(step["title"])], 16))
		_page.add_child(_heading(str(step["detail"]), 13))
		match str(step["type"]):
			"choice":
				var choices: Array = step["options"]
				for choice in range(choices.size()):
					var b := _button(str(choices[choice]))
					b.pressed.connect(_practical_choice.bind(step_index, choice))
					_page.add_child(b)
			"tooth":
				_show_practical_fdi_chart(step_index)
			"tool":
				var menu := OptionButton.new()
				# Do not let the longest bilingual instrument expand the entire notes pane.
				menu.fit_to_longest_item = false
				_style_action(menu)
				menu.custom_minimum_size = Vector2(0,44)
				menu.add_item("Select original instrument", 0)
				for item in _content["tools"]:
					menu.add_item(str(item["german"]) + " / " + str(item["english"]))
				menu.item_selected.connect(_practical_tool.bind(step_index))
				_page.add_child(menu)
			"drill":
				if _volume != null:
					_show_drill_controls()
				else:
					_page.add_child(_heading("Source-verified editable FDI %s volume not available. Task narrative only." % FDI[_case_index], 13))
		var saved: Dictionary = (_progress["answers"] as Dictionary).get(_key() + ":" + str(step_index), {})
		var feedback_text := "Not answered"
		if saved.has("correct"):
			feedback_text = "Correct response recorded" if bool(saved["correct"]) else "Review required — revisit original task"
		var feedback := _heading(feedback_text, 13)
		_practical_feedback[step_index] = feedback
		_page.add_child(feedback)
	# The source has no bur step for surgery/perio. Offer ONLY an explicitly
	# separate synthetic tooth-volume experiment, never label it extraction
	# or subgingival instrument mechanics. Hide the unrelated sandbox in a
	# focused source-derived guided task, but retain it in all-tasks mode.
	if _case_index in [4, 5] and not _procedure_guided:
		_page.add_child(_heading("Optional geometry sandbox — NOT extraction, scaling or surgical simulation.", 15))
		if _volume != null:
			_show_drill_controls()
		else:
			_page.add_child(_heading("Source-verified case tooth unavailable.", 13))


func _make_cut_slider(title: String, low: float, high: float, start: float) -> HSlider:
	var row := HBoxContainer.new()
	var label := _heading(title, 13)
	label.custom_minimum_size = Vector2(126, 0)
	label.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	row.add_child(label)
	var slider := HSlider.new()
	slider.min_value = low
	slider.max_value = high
	slider.step = 0.01
	slider.value = clampf(start, low, high)
	slider.custom_minimum_size = Vector2(90, 20)
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(slider)
	_page.add_child(row)
	return slider

func _show_drill_controls() -> void:
	_page.add_child(_heading("Editable FDI %s / %s · source-derived synthetic 3D volume" % [FDI[_case_index], CASE_IDS[_case_index]], 15))
	_page.add_child(_heading("Adjust X/Y/Z in uncalibrated model coordinates. Native 3D sphere/swept-stroke material removal is a sandbox ONLY. No physical force, pulp-safety grading, extraction, periodontal scaling or clinical millimeters.", 12))
	var x := _make_cut_slider("Mesial / distal X", -1.15, 1.15, _cut_position.x)
	var y := _make_cut_slider("Height Y", -1.50, 1.30, _cut_position.y)
	var z := _make_cut_slider("Buccal / lingual Z", -1.00, 1.00, _cut_position.z)
	var radius := _make_cut_slider("Bur radius (model)", 0.06, 0.35, _cut_radius)
	radius.value_changed.connect(_set_direct_bur_radius)
	var direct := _button(("Disable" if _direct_bur_mode else "Enable") + " direct 3D tooth click-to-cut mode")
	direct.pressed.connect(_toggle_direct_bur)
	_page.add_child(direct)
	_page.add_child(_heading("Direct mode: click the RIGHT editable tooth inside the central 3D viewport. A ray intersects its current native triangle mesh; only a verified surface hit removes synthetic material. Change radius with the slider. Switch to Teeth camera if needed. No real instrument force feedback.",12))
	var apply := _button("Apply 3D bur stroke")
	apply.pressed.connect(_apply_cut.bind(x,y,z,radius))
	_page.add_child(apply)
	var undo_button := _button("Undo last bur stroke")
	undo_button.pressed.connect(_undo_cut)
	_page.add_child(undo_button)
	var reset_button := _button("Reset editable FDI " + FDI[_case_index])
	reset_button.pressed.connect(_reset_cut)
	_page.add_child(reset_button)
	var stats: Dictionary = _volume.call("summary")
	_page.add_child(_heading("Bur strokes %d/32 | %d native triangles | approximately %.1f%% of original occupied grid samples removed" %
		[int(stats["strokes"]),int(stats["triangles"]),float(stats["removedPercentApprox"])], 13))
	_page.add_child(_heading("Sampled source-model pulp region: %d / %d occupied pulp-grid points removed (%s). This is a simplified synthetic voxel indicator, NOT a tooth exposure diagnosis, millimeter measurement or safety grade." % [
		int(stats.get("removedModelPulpSamplePoints",0)),
		int(stats.get("originalModelPulpSamplePoints",0)),
		"model region contacted" if bool(stats.get("syntheticPulpRegionContact",false)) else "no sampled region contact detected"], 13))
	_page.add_child(_heading("No clinical units, calibrated anatomy, force, pulp protection or procedural target score. These model-grid counts support formative exploration only; apparent non-contact is NOT proof of clinical safety.", 12))


func _set_direct_bur_radius(value: float) -> void:
	_cut_radius = clampf(value,0.06,0.35)

func _toggle_direct_bur() -> void:
	if _view != "clinic" or STATION_IDS[_station_index] != "practical" or _volume == null:
		_direct_bur_mode = false
		return
	_direct_bur_mode = not _direct_bur_mode
	if _direct_bur_mode:
		_set_camera_mode("teeth")
	_refresh()

func _direct_cut_world_ray(origin: Vector3, direction: Vector3) -> bool:
	if not _direct_bur_mode or _view != "clinic" or STATION_IDS[_station_index] != "practical" or _volume == null:
		return false
	var current: Dictionary = _volume.call("summary")
	if str(current.get("fdi","")) != FDI[_case_index] or str(current.get("caseId","")) != CASE_IDS[_case_index]:
		push_warning("Direct 3D bur rejected a wrong-case tooth")
		return false
	var selection: Dictionary = _volume.call("ray_hit",origin,direction)
	if not bool(selection.get("found",false)) or str(selection.get("fdi","")) != FDI[_case_index] or str(selection.get("caseId","")) != CASE_IDS[_case_index]:
		return false
	var point: Vector3 = selection["at"]
	if not bool(_volume.call("cut_to",point,_cut_radius)):
		return false
	_cut_position = point
	_store_cut()
	return true

func _input(event: InputEvent) -> void:
	# Single entry point: walk routes right-drag/E/Esc ONLY in environment;
	# native direct bur still requires separate explicit practical opt-in.
	_handle_walk_input(event)
	_handle_procedure_input(event)
	if not _direct_bur_mode or _middle == null or _scene == null:
		return
	if not (event is InputEventMouseButton):
		return
	var click: InputEventMouseButton = event
	if not click.pressed or click.button_index != MOUSE_BUTTON_LEFT or not _middle.get_global_rect().has_point(click.position):
		return
	var camera: Camera3D = _scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if camera == null or not camera.current:
		return
	# Reject any click outside the central 3D viewport; never drill through
	# case/station controls, report, source text or other tabs.
	var origin: Vector3 = camera.project_ray_origin(click.position)
	var direction: Vector3 = camera.project_ray_normal(click.position).normalized()
	if _direct_cut_world_ray(origin,direction):
		get_viewport().set_input_as_handled()

func _apply_cut(x: HSlider, y: HSlider, z: HSlider, radius: HSlider) -> void:
	if _volume == null:
		return
	var selected_volume: Dictionary = _volume.call("summary")
	if str(selected_volume.get("fdi","")) != FDI[_case_index]:
		push_warning("Case/FDI mismatch; refusing to cut wrong model")
		return
	_cut_position = Vector3(x.value,y.value,z.value)
	_cut_radius = radius.value
	if not bool(_volume.call("cut_to",_cut_position,_cut_radius)):
		push_warning("Bur stroke rejected: outside volume, no material removed, or 32-stroke limit")
		return
	_store_cut()

func _undo_cut() -> void:
	if _volume != null and bool(_volume.call("undo")):
		_store_cut()

func _reset_cut() -> void:
	if _volume != null:
		_volume.call("reset")
		_store_cut()

func _store_cut() -> void:
	if _volume == null:
		return
	var progress_volumes: Dictionary = _progress.get("volumeByCase", {})
	progress_volumes[CASE_IDS[_case_index]] = _volume.call("export_strokes")
	_progress["volumeByCase"] = progress_volumes
	if _case_index == 0:
		_progress["volumeFDI16"] = progress_volumes["molar"] # older same-source readers
	_save_progress()
	_refresh()

func _practical_choice(step_index: int, choice: int) -> void:
	var step: Dictionary = _content["practical"][_case_index][step_index]
	var correct := choice == int(step.get("correct", -1))
	_record_practical(step_index, choice, correct, str(step.get("explanation", "")))

func _fdichart_contains(tooth: String) -> bool:
	for quadrant in FDI_CHART_QUADRANTS:
		if (quadrant as Array).has(tooth):
			return true
	return false

func _show_practical_fdi_chart(step_index: int) -> void:
	_page.add_child(_heading("Permanent dentition · FDI tooth selection (source browser chart)", 15))
	_page.add_child(_heading("Choose a two-digit FDI number; this chart is a selection control, NOT 32 source-verified tooth models or anatomical/clinical validation.", 12))
	for quadrant_index in range(FDI_CHART_QUADRANTS.size()):
		var quadrant: Array = FDI_CHART_QUADRANTS[quadrant_index]
		var group := VBoxContainer.new()
		group.name = "KL_FDI_QUADRANT_" + str(quadrant_index)
		group.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		group.add_theme_constant_override("separation", 3)
		var title := _heading(FDI_CHART_HEADERS[quadrant_index] + " · FDI", 13)
		title.name = "KL_FDI_QUADRANT_LABEL_" + str(quadrant_index)
		group.add_child(title)
		var grid := GridContainer.new()
		grid.name = "KL_FDI_QUADRANT_GRID_" + str(quadrant_index)
		grid.columns = 4
		grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_theme_constant_override("h_separation", 4)
		grid.add_theme_constant_override("v_separation", 4)
		group.add_child(grid)
		for tooth in quadrant:
			var code: String = str(tooth)
			var tooth_button := _button(code)
			tooth_button.name = "KL_FDI_TOOTH_" + code
			tooth_button.tooltip_text = "FDI " + code + " · " + FDI_CHART_HEADERS[quadrant_index] + " · permanent dentition; selection only"
			tooth_button.custom_minimum_size = Vector2(0, 38)
			tooth_button.autowrap_mode = TextServer.AUTOWRAP_OFF
			tooth_button.add_theme_font_size_override("font_size", 14)
			if code == FDI[_case_index]:
				tooth_button.tooltip_text += " · highlighted training case tooth"
				var active_border: StyleBoxFlat = tooth_button.get_theme_stylebox("normal") as StyleBoxFlat
				if active_border != null:
					active_border.border_color = Color("#eec680")
					active_border.set_border_width_all(2)
			tooth_button.pressed.connect(_practical_target.bind(step_index, code))
			grid.add_child(tooth_button)
		_page.add_child(group)

func _practical_target(step_index: int, tooth: String) -> void:
	if not _fdichart_contains(tooth):
		return # no fabricated dentition values, no answer mutation
	var step: Dictionary = _content["practical"][_case_index][step_index]
	var correct := tooth == str(step.get("target", ""))
	var detail := str(step.get("success", "FDI target confirmed")) if correct else "Incorrect FDI selection. Recheck the fictional case and try again."
	_record_practical(step_index, tooth, correct, detail)

func _practical_tool(index: int, step_index: int) -> void:
	if index < 1:
		return
	var tools: Array = _content["tools"]
	if index - 1 >= tools.size():
		return
	var chosen: Dictionary = tools[index - 1]
	var step: Dictionary = _content["practical"][_case_index][step_index]
	var correct := str(chosen["id"]) == str(step.get("target", ""))
	_record_practical(step_index, str(chosen["id"]), correct, str(step.get("success", "")))

func _record_practical(step_index: int, response: Variant, correct: bool, detail: String) -> void:
	var answer_key := _key() + ":" + str(step_index)
	(_progress["answers"] as Dictionary)[answer_key] = {
		"selected": response, "correct": correct, "sourceQuestion": step_index}
	_save_progress()
	if _practical_feedback.has(step_index):
		var display: Label = _practical_feedback[step_index]
		display.text = ("Correct. " if correct else "Review required. ") + detail

func _mark_studied() -> void:
	(_progress["studied"] as Dictionary)[_key()] = true
	_save_progress()
	_refresh()


func _journey_state() -> Dictionary:
	var saved: Dictionary = _progress["journey"]
	var id: String = CASE_IDS[_case_index]
	if not saved.has(id):
		saved[id] = {
			"history": [], "tests": [], "diagnosis": -1,
			"primary": -1, "alternative": -1, "consent": false,
			"ordered": 0, "errors": 0
		}
	return saved[id]

func _journey_page_change(delta: int) -> void:
	_journey_stage = clampi(_journey_stage + delta, 0, 5)
	_refresh()

func _journey_ask(kind: String, index: int) -> void:
	if kind not in ["history", "tests"]:
		return
	var rows: Array = _pathways[CASE_IDS[_case_index]][kind]
	if index < 0 or index >= rows.size():
		return
	var row: Array = rows[index]
	var state := _journey_state()
	if str(row[3]) == "bad":
		state["errors"] = int(state["errors"]) + 1
	else:
		var selected: Array = state[kind]
		if not selected.has(str(row[0])):
			selected.append(str(row[0]))
	_save_progress()
	_refresh()

func _journey_diagnosis(index: int) -> void:
	var d: Dictionary = _pathways[CASE_IDS[_case_index]]
	if index < 0 or index >= (d["differential"] as Array).size():
		return
	_journey_state()["diagnosis"] = index
	_save_progress()
	_refresh()

func _journey_plan(kind: String, index: int) -> void:
	if kind not in ["primary", "alternative"]:
		return
	var d: Dictionary = _pathways[CASE_IDS[_case_index]]
	if index < 0 or index >= (d["options"] as Array).size():
		return
	var state := _journey_state()
	var other := "alternative" if kind == "primary" else "primary"
	if int(state[other]) == index:
		push_warning("Primary and alternative treatment choices must be distinct")
		return
	state[kind] = index
	_save_progress()
	_refresh()

func _journey_set_consent(value: bool) -> void:
	_journey_state()["consent"] = value
	_save_progress()

func _journey_procedure(index: int) -> void:
	var d: Dictionary = _pathways[CASE_IDS[_case_index]]
	if index < 0 or index >= (d["procedure"] as Array).size():
		return
	var state := _journey_state()
	if index == int(state["ordered"]):
		state["ordered"] = index + 1
	else:
		state["errors"] = int(state["errors"]) + 1
	_save_progress()
	_refresh()

func _show_journey() -> void:
	var d: Dictionary = _pathways[CASE_IDS[_case_index]]
	var state := _journey_state()
	var titles := ["Anamnese", "Untersuchung", "Arbeitsdiagnose", "Therapieplanung", "Ablauf & Sicherheit", "Auswertung"]
	_page.add_child(_heading("Source-derived clinical pathway · %s" % titles[_journey_stage], 18))
	_page.add_child(_heading("Fictitious patient: " + str(d["chief"]), 14))
	_page.add_child(_heading("These are original educational scenarios. No patient data, clinical calibration, treatment order certification or official exam grading.", 12))
	if _journey_stage <= 1:
		var kind := "history" if _journey_stage == 0 else "tests"
		var rows: Array = d[kind]
		var selected: Array = state[kind]
		_page.add_child(_heading("Select a question or requested test to reveal its original scripted response.", 14))
		for i in range(rows.size()):
			var row: Array = rows[i]
			var chosen: bool = selected.has(str(row[0]))
			var button := _button(("✓ " if chosen else "") + str(row[1]))
			button.pressed.connect(_journey_ask.bind(kind, i))
			_page.add_child(button)
			if chosen:
				_page.add_child(_heading("Patient / source finding: " + str(row[2]), 13))
			elif str(row[3]) == "bad":
				_page.add_child(_heading("This is a distractor; not a diagnostic substitute.", 12))
	elif _journey_stage == 2:
		_page.add_child(_heading("Choose a working diagnosis; the source still requires integrated history, tests, and uncertainty.", 14))
		var diagnoses: Array = d["differential"]
		for i in range(diagnoses.size()):
			var button := _button(("✓ " if int(state["diagnosis"]) == i else "") + str(diagnoses[i]))
			button.pressed.connect(_journey_diagnosis.bind(i))
			_page.add_child(button)
		if int(state["diagnosis"]) >= 0:
			_page.add_child(_heading(("Source choice matched. " if int(state["diagnosis"]) == int(d["correct"]) else "Review the diagnostic reasoning. ") + str(d["why"]), 13))
	elif _journey_stage == 3:
		_page.add_child(_heading("Select TWO distinct treatment choices. Some alternatives are intentionally invalid distractors.", 14))
		var options: Array = d["options"]
		for kind in ["primary", "alternative"]:
			_page.add_child(_heading(kind.capitalize() + " treatment choice:", 15))
			for i in range(options.size()):
				var button := _button(("✓ " if int(state[kind]) == i else "") + str(options[i]))
				button.pressed.connect(_journey_plan.bind(kind, i))
				_page.add_child(button)
		var consent := CheckBox.new()
		consent.text = "I would explain risks, alternatives and request informed consent (exercise acknowledgment only)"
		consent.button_pressed = bool(state["consent"])
		consent.toggled.connect(_journey_set_consent)
		_page.add_child(consent)
	elif _journey_stage == 4:
		_page.add_child(_heading("Select the educational procedure steps in their original source order.", 14))
		var steps: Array = d["procedure"]
		for i in range(steps.size()):
			var button := _button(("✓ " if i < int(state["ordered"]) else "") + "%d. %s" % [i+1,str(steps[i])])
			button.pressed.connect(_journey_procedure.bind(i))
			_page.add_child(button)
		_page.add_child(_heading("Ordered %d/%d; practice sequence errors %d" %
			[int(state["ordered"]),steps.size(),int(state["errors"])], 13))
		_page.add_child(_heading("Original clinical safety note: " + str(d["safety"]), 14))
	else:
		_page.add_child(_heading("Source-guided exercise summary, NOT certified clinical competence.", 15))
		_page.add_child(_heading("History items %d/%d | tests %d/%d" %
			[(state["history"] as Array).size(),(d["history"] as Array).size(),
			(state["tests"] as Array).size(),(d["tests"] as Array).size()], 13))
		_page.add_child(_heading("Working diagnosis index: %d; source option %d" %
			[int(state["diagnosis"]),int(d["correct"])], 13))
		_page.add_child(_heading("Treatment choices: %d / %d | source examples %d / %d" %
			[int(state["primary"]),int(state["alternative"]),int(d["primary"]),int(d["alternative"])], 13))
		_page.add_child(_heading("Consent discussed: %s | ordered steps %d | mistakes %d" %
			[str(bool(state["consent"])),int(state["ordered"]),int(state["errors"])], 13))
		_page.add_child(_heading("Reasoning reference: " + str(d["why"]), 13))
		_page.add_child(_heading("Safety: " + str(d["safety"]), 13))
	_page.add_child(_heading("Clinical journey stage %d / 6" % (_journey_stage + 1), 13))
	var nav := HBoxContainer.new()
	var back := _button("Previous stage")
	back.disabled = _journey_stage == 0
	back.pressed.connect(_journey_page_change.bind(-1))
	nav.add_child(back)
	var forward := _button("Next stage")
	forward.disabled = _journey_stage == 5
	forward.pressed.connect(_journey_page_change.bind(1))
	nav.add_child(forward)
	_page.add_child(nav)


func _show_atlas_controls() -> void:
	if _atlas == null:
		_page.add_child(_heading("Native procedural atlas unavailable. Source file/identity integrity may have failed.", 15))
		return
	_page.add_child(_heading("32 permanent FDI teeth · original browser ToothSolid source", 17))
	_page.add_child(_heading("Procedural, sampled, source-derived educational geometry. Not extracted scans, calibrated anatomy or patient records.", 13))
	_page.add_child(_heading("Selected FDI %s · %d source mesh triangles" %
		[str(_atlas.call("selected")),int(_atlas.call("triangle_count"))], 14))
	for q in range(1,5):
		_page.add_child(_heading("Quadrant %d · %s %s" %
			[q,"maxillary" if q<=2 else "mandibular","right" if q in [1,4] else "left"], 14))
		var grid := GridContainer.new()
		grid.columns=4
		_page.add_child(grid)
		for n in range(1,9):
			var fdi:=str(q)+str(n)
			var button:=_button("FDI "+fdi)
			button.pressed.connect(_atlas_select.bind(fdi))
			grid.add_child(button)
	var orbit:=HBoxContainer.new()
	var left:=_button("Rotate 30° left")
	left.pressed.connect(_atlas_rotate.bind(-30.0))
	orbit.add_child(left)
	var right:=_button("Rotate 30° right")
	right.pressed.connect(_atlas_rotate.bind(30.0))
	orbit.add_child(right)
	_page.add_child(orbit)
	_page.add_child(_heading("Case-specific FDI16 is the only live edited-volume tooth; other FDI meshes are static procedural previews.", 12))

func _atlas_select(fdi: String) -> void:
	if _atlas != null and bool(_atlas.call("select_tooth",fdi)):
		_refresh()

func _atlas_rotate(degrees: float) -> void:
	if _atlas != null:
		_atlas.call("rotate_model",degrees)



func _radiology_state() -> Dictionary:
	var stored: Dictionary = _progress["radiologyByCase"]
	var id: String = CASE_IDS[_case_index]
	if not stored.has(id):
		stored[id] = {"choice":"", "marks":[], "reviewed":false}
	return stored[id]

func _show_radiology() -> void:
	_page.add_child(_heading("Source-generated synthetic radiography · FDI " + FDI[_case_index], 17))
	_page.add_child(_heading("Fictional analytic attenuation model. NOT a real patient X-ray or validated diagnosis. Click the image to indicate a possible finding.", 13))
	var script: GDScript = load("res://radiography-panel.gd")
	if script == null:
		_page.add_child(_heading("Radiography module unavailable", 14))
		return
	var viewer: TextureRect = script.new()
	if not bool(viewer.call("configure",str(_content["sourceGitSHA"]),CASE_IDS[_case_index])):
		_page.add_child(_heading("Radiography source rejected: " + str(viewer.call("error")), 14))
		viewer.free()
		return
	var state: Dictionary = _radiology_state()
	if not bool(viewer.call("set_marks",state.get("marks",[]))):
		state["marks"] = []
		viewer.call("set_marks",[])
	viewer.call("reveal",bool(state.get("reviewed",false)))
	viewer.connect("point_marked",_radiology_mark)
	_page.add_child(viewer)
	var scenario: Dictionary = viewer.call("info")
	_page.add_child(_heading("Original fictional scenario: " + str(scenario["title"]), 14))
	var select := OptionButton.new()
	select.add_item("Choose a simulated interpretation",0)
	for i in range(RADIO_CHOICES.size()):
		select.add_item(RADIO_LABELS[i],i+1)
	select.select(maxi(0,RADIO_CHOICES.find(str(state.get("choice","")))+1))
	select.item_selected.connect(_radiology_choose)
	_page.add_child(select)
	var review := _button("Reveal original source's simulated finding")
	review.pressed.connect(_radiology_review)
	_page.add_child(review)
	if bool(state.get("reviewed",false)):
		var match_source: bool = str(state.get("choice","")) == str(scenario["kind"])
		_page.add_child(_heading(("Matches the predetermined source label. " if match_source else "Does not match the predetermined source label. ") + str(scenario["reference"]), 14))
		_page.add_child(_heading("This is educational source feedback, NOT clinical image interpretation.", 12))
	var reset := _button("Clear this case's synthetic radiography answers")
	reset.pressed.connect(_radiology_reset)
	_page.add_child(reset)
	_page.add_child(_heading("Local marks: %d / 20 · Source review: %s" % [
		(state["marks"] as Array).size(), str(bool(state["reviewed"]))], 12))

func _radiology_mark(point: Vector2) -> void:
	if not point.is_finite() or point.x<0 or point.x>1 or point.y<0 or point.y>1:
		return
	var state := _radiology_state()
	var marks: Array = state["marks"]
	if marks.size() >= 20:
		return
	marks.append([point.x,point.y])
	_save_progress()

func _radiology_choose(index: int) -> void:
	if index<0 or index>RADIO_CHOICES.size():
		return
	var state := _radiology_state()
	state["choice"] = "" if index==0 else RADIO_CHOICES[index-1]
	state["reviewed"] = false
	_save_progress()
	_refresh()

func _radiology_review() -> void:
	_radiology_state()["reviewed"] = true
	_save_progress()
	_refresh()

func _radiology_reset() -> void:
	var state := _radiology_state()
	state["choice"] = ""
	state["marks"] = []
	state["reviewed"] = false
	_save_progress()
	_refresh()

func _show_scan_controls() -> void:
	_page.add_child(_heading("Local STL/OBJ surface inspection", 18))
	_page.add_child(_heading("Choose a licensed local dental surface mesh. Remains on your computer; no upload or patient registration. Maximum 20 MB / 50,000 triangles. Original units not assumed.", 13))
	if _scan == null:
		_page.add_child(_heading("Native scan viewer unavailable", 14))
		return
	_page.add_child(_heading(str(_scan.call("description")), 14))
	var browse := _button("Open local STL / OBJ file")
	browse.pressed.connect(_scan_open_dialog)
	_page.add_child(browse)
	var buttons := HBoxContainer.new()
	var left := _button("Rotate left 30°")
	left.pressed.connect(_scan_rotate.bind(-30.0))
	buttons.add_child(left)
	var right := _button("Rotate right 30°")
	right.pressed.connect(_scan_rotate.bind(30.0))
	buttons.add_child(right)
	_page.add_child(buttons)
	var wire := CheckBox.new()
	wire.text = "Display surface wireframe (mesh inspection)"
	wire.button_pressed = _scan_wireframe
	wire.toggled.connect(_scan_set_wireframe)
	_page.add_child(wire)
	_page.add_child(_heading("Binary STL and OBJ with positive vertex indices supported; negative-index, malformed and ASCII STL files are rejected. The viewer does not interpret radiographs, assign a tooth number or infer diagnoses.", 12))

func _scan_open_dialog() -> void:
	var dialog := FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.filters = PackedStringArray(["*.stl, *.obj ; STL / OBJ surface meshes"])
	dialog.file_selected.connect(_scan_open_path)
	dialog.close_requested.connect(dialog.queue_free)
	_shell.add_child(dialog)
	dialog.popup_centered_ratio(0.65)

func _scan_open_path(path: String) -> void:
	if _scan == null:
		return
	if not bool(_scan.call("load_scan_path",path)):
		push_warning("Local scan import refused: " + str(_scan.call("error")))
	_refresh()

func _scan_rotate(degrees: float) -> void:
	if _scan != null:
		_scan.call("rotate_model",degrees)

func _scan_set_wireframe(enabled: bool) -> void:
	_scan_wireframe = enabled
	if _scan != null:
		_scan.call("set_wireframe",enabled)

func _show_progress() -> void:
	_page.add_child(_heading("Personal local progress (not an official exam score)", 17))
	for c in _cases:
		for s in _stations:
			var k := str(c["id"]) + ":" + str(s["id"])
			var done: bool = (_progress["studied"] as Dictionary).get(k, false)
			_page.add_child(_heading(("✓ " if done else "○ ") + str(c["id"]) + " / " + str(s["title"]), 12))
	_page.add_child(_heading("Reports include saved free-text drafts. Do not enter real patient information. Files stay local unless you share them.", 13))
	var export_button := _button("Export local learning report (.txt)")
	export_button.pressed.connect(_choose_report_path)
	_page.add_child(export_button)
	var clinical_states: Dictionary = _progress.get("journey",{})
	_page.add_child(_heading("Case-specific clinical journey sessions: %d/6" % clinical_states.size(), 14))
	var reset := _button("Reset saved educational progress")
	reset.pressed.connect(_reset_progress)
	_page.add_child(reset)


func _generate_report() -> String:
	# Deterministic offline learning record, not a patient chart or validated score.
	var lines: Array[String] = [
		"KLINIKLAB — SYNTHETIC EDUCATIONAL LEARNING REPORT",
		"Original production source SHA: " + str(_content.get("sourceGitSHA", "")),
		"No patient records, official exam scores, medical diagnoses or clinical validation.",
		"Responses and drafts are locally user-entered. Do not use real patient data.",
		""
	]
	var answers: Dictionary = _progress.get("answers", {})
	var studied: Dictionary = _progress.get("studied", {})
	var notes: Dictionary = _progress.get("notes", {})
	for c in _cases:
		lines.append("CASE FDI %s — %s (fictional)" % [str(c["fdi"]),str(c["title"])])
		for station in _stations:
			var key := str(c["id"]) + ":" + str(station["id"])
			var answered := 0
			var matched := 0
			for record_key in answers:
				if str(record_key).begins_with(key + ":"):
					var item: Variant = answers[record_key]
					if item is Dictionary:
						answered += 1
						if bool(item.get("correct", false)):
							matched += 1
			lines.append("  %s: studied=%s; formative choices=%d; matched source answer=%d" %
				[str(station["title"]),str(bool(studied.get(key,false))),answered,matched])
			if notes.has(key):
				lines.append("  Saved draft (no automated correctness assessment):")
				lines.append(str(notes[key]).substr(0,10000))
		var all_journeys: Dictionary = _progress.get("journey",{})
		if all_journeys.has(str(c["id"])):
			var j: Dictionary = all_journeys[str(c["id"])]
			lines.append("  Native clinical journey: history=%s; tests=%s; workingDiagnosisIndex=%s" %
				[str(j.get("history",[])),str(j.get("tests",[])),str(j.get("diagnosis",-1))])
			lines.append("  Treatment indices A/B=%s/%s; consentExercise=%s; ordered=%s; errors=%s" %
				[str(j.get("primary",-1)),str(j.get("alternative",-1)),str(j.get("consent",false)),
				str(j.get("ordered",0)),str(j.get("errors",0))])
		var synthetic_rad: Dictionary = _progress.get("radiologyByCase", {})
		if synthetic_rad.has(str(c["id"])):
			var rad: Dictionary = synthetic_rad[str(c["id"])]
			lines.append("  Synthetic source radiography: choice=%s; marks=%d; reviewed=%s (not diagnostic)" %
				[str(rad.get("choice","")),(rad.get("marks",[]) as Array).size(),str(bool(rad.get("reviewed",false)))])
		lines.append("")
	var german: Dictionary = _progress.get("fspKpByTask",{})
	lines.append("ORIGINAL FOUR-CASE FSP/KP FORMATIVE GERMAN TRAINING (not an examination result)")
	for id in ["perio","restoration","endo","surgery"]:
		for phase in ["anamnese","aufklaerung","brief","kollegen"]:
			var key: String = str(id)+"|"+str(phase)
			if german.has(key):
				var entry: Dictionary = german[key]
				var result: Dictionary = entry.get("result",{})
				lines.append("  %s / %s: source lexical coverage=%s/10; safety caution count=%d; NOT diagnostic or certified" %
					[id,phase,str(result.get("lexicalScore","not checked")),(result.get("flags",[]) as Array).size()])
				if entry.has("text"):
					lines.append(str(entry["text"]).substr(0,6000))
	lines.append("")
	var volume_logs: Dictionary = _progress.get("volumeByCase", {})
	for id in CASE_IDS:
		if volume_logs.get(id, []) is Array:
			var records: Array = volume_logs.get(id, [])
			lines.append("Synthetic source-tooth %s (FDI %s): %d saved volume-removal strokes, not clinical grading." % [id,FDI[CASE_IDS.find(id)],records.size()])
	for id in _volumes:
		var v: Dictionary = (_volumes[id] as Node3D).call("summary")
		lines.append("Loaded FDI %s grid-based removed sample points (not mm³): %s" % [str(v["fdi"]),str(v["removedSamplePoints"])])
		lines.append("Loaded FDI %s sampled synthetic pulp-grid removal: %s/%s; contact=%s (not clinical pulp safety or diagnosis)" % [
			str(v["fdi"]),str(v.get("removedModelPulpSamplePoints",0)),
			str(v.get("originalModelPulpSamplePoints",0)),
			str(bool(v.get("syntheticPulpRegionContact",false)))])
	lines.append("END OF LOCAL FORMATIVE REPORT")
	return "\n".join(lines) + "\n"

func _choose_report_path() -> void:
	var dialog := FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_SAVE_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.filters = PackedStringArray(["*.txt ; Text report"])
	dialog.current_file = "KlinikLab_Lernbericht.txt"
	dialog.file_selected.connect(_write_report)
	dialog.close_requested.connect(dialog.queue_free)
	_shell.add_child(dialog)
	dialog.popup_centered_ratio(0.65)

func _write_report(path: String) -> void:
	if not path.to_lower().ends_with(".txt"):
		push_warning("Learning reports must be written as .txt")
		return
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_warning("Could not write local report to selected file")
		return
	file.store_string(_generate_report())
	file.close()
	_page.add_child(_heading("Local report saved to: " + path, 13))

func _reset_progress() -> void:
	_quiz_recall_edit = null
	_quiz_recall_key = ""
	_quiz_revealed = false
	_progress["quizRecall"] = {}
	# Reset is intentional; do not restore currently visible letter fields on redraw.
	_letter_fields.clear()
	_plan_fields.clear()
	_writing_review_label = null
	_writing_reference_panel = null
	_draft = null
	_writing_key = ""
	_progress["letterSectionsByCase"] = {}
	_progress["planSectionsByCase"] = {}
	_progress["answers"] = {}
	_progress["notes"] = {}
	_progress["studied"] = {}
	_progress["volumeFDI16"] = []
	_progress["volumeByCase"] = {}
	_progress["journey"] = {}
	_progress["radiologyByCase"] = {}
	_progress["fspKpByTask"] = {}
	_language_draft = null # Do not re-save an old draft during page teardown
	for id in _volumes:
		(_volumes[id] as Node3D).call("reset")
	_save_progress()
	_refresh()

func _show_coverage() -> void:
	_page.add_child(_heading("MIGRATION STATUS · Functional parity is NOT complete", 18))
	if _cc0_clinic != null:
		var cc0: Dictionary = _cc0_clinic.call("summary")
		_page.add_child(_heading("CC0 native imported room meshes=%s, static instrument tray=%s, SHA256 verified, NOT clinically validated" % [str(cc0.get("wholeMeshInstances",0)),str(cc0.get("trayMeshInstances",0))],14))
	var gates: Dictionary = _content.get("migrationGates", {})
	for id in gates:
		var status := str(gates[id])
		if str(id) == "interactiveThreeDPreparation" and _volume != null:
			status = "ALL_SIX_CASE_SPECIFIC_SOURCE_HASHED_EDITABLE_SYNTHETIC_VOLUMES__NO_CLINICAL_CALIBRATION"
		if str(id) == "reportingAndExport":
			status = "LOCAL_TEXT_LEARNING_REPORT_ONLY__NO_VALIDATED_GRADING"
		if str(id) == "clinicalCases":
			status = "SIX_CASES_AND_NATIVE_SIX_STAGE_SOURCE_CLINICAL_JOURNEY"
		if str(id) == "anatomyAtlas" and _atlas != null:
			status = "SOURCE_DERIVED_32_PERMANENT_TEETH_PREVIEW_ONLY__NOT_CLINICALLY_VALIDATED"
		if str(id) == "scanImportAndRadiography" and _scan != null:
			status = "LOCAL_STL_OBJ_AND_SIX_SYNTHETIC_SOURCE_XRAYS__NOT_DIAGNOSTIC"
		if str(id) == "fspKpFormativeRubric" and _language != null:
			status = "4_SOURCE_CASES_16_GERMAN_TASKS_5_SOURCE_KEYWORDS_EACH__NOT_EXAM_GRADE"
		_page.add_child(_heading(str(id) + "  —  " + status, 14))
	_page.add_child(_heading("Already functional here: 3D schematic clinic, exact-source FDI16 before/cut comparison, 6 cases, 7 stations, formative multiple-choice questions, German writing drafts, vocabulary, local progress.", 15))
	_page.add_child(_heading("Now available: all six editable synthetic volumes with optional native direct 3D click-to-cut selection, 32-tooth preview, German source FSP/KP, guided interviews, six-stage clinical journey, offline reports and local STL/OBJ inspection. Still missing: physiological instrument forces, validated German oral/clinical assessment, real radiographic diagnosis, free-form patient, XR/Quest, optional AI and full clinical parity.", 15))
