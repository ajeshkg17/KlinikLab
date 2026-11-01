extends Node3D
## SR2 Godot-first interactive APPLICATION FOUNDATION, not a finished full port.
## Runs in a standalone Godot 4.7.2 desktop app with a source-exact
## 3D clinic and real native case/station/exercise interaction.
## Source-only educational content, no patient records, no AI or calibrated drill.

const CONTENT := "res://source/app-content.json"
const CASES := "res://source/kliniklab-native-cases.json"
const SOURCE_SHA := "res://source/expected-sha.txt"
const PROGRESS := "user://kliniklab-native-progress-v2.json"
const CASE_IDS := ["molar", "endo", "anterior", "crown", "surgery", "perio"]
const FDI := ["16", "36", "11", "26", "48", "46"]
const STATION_IDS := ["interview", "letter", "handover", "written", "practical", "viva", "clinic"]
const INK := Color("#153842")
const SEA := Color("#06786f")
const PAPER := Color("#eaf2f0")

var _content: Dictionary = {}
var _cases: Array = []
var _stations: Array = []
var _case_index := 0
var _station_index := 0
var _quiz_index := 0
var _progress: Dictionary = {}
var _scene: Node3D
var _shell: CanvasLayer
var _view := "clinic"
var _camera_mode := "overview"
var _page: VBoxContainer
var _progress_label: Label
var _middle: Control
var _answer_label: Label
var _draft: TextEdit
var _boot_error := ""

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
	var workspace := Node3D.new()
	workspace.name = "KL_COMPLETE_OPERATORY_WORKSPACE"
	workspace.set_script(load("res://sr1c-godot-clinic-overview.gd"))
	_scene.add_child(workspace)
	_build_app()
	_set_camera_mode("overview")
	_select_case(0)
	_select_station(0)
	print("SR2_GODOT_APP_FOUNDATION_READY 6 cases / 7 stations / source quizzes / native progress. FULL APP NOT YET PORTED")

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
	return true

func _load_progress() -> void:
	_progress = {"schemaVersion": 2, "sourceGitSHA": str(_content["sourceGitSHA"]),
		"answers": {}, "notes": {}, "studied": {}, "selectedCase": 0, "selectedStation": 0}
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
	b.custom_minimum_size = Vector2(0, 35)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return b

func _panel(col: VBoxContainer, width: int) -> PanelContainer:
	var p := PanelContainer.new()
	p.custom_minimum_size = Vector2(width, 0)
	p.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(p)
	return p

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
	var top := HBoxContainer.new()
	outer.add_child(top)
	top.add_child(_heading("KLINIKLAB • NATIVE APPLICATION", 22))
	for section in ["clinic", "learning", "progress", "coverage"]:
		var b := _button(section.capitalize())
		b.pressed.connect(_switch_view.bind(section))
		top.add_child(b)
	for mode in ["overview", "teeth"]:
		var camera_button := _button(mode.capitalize() + " camera")
		camera_button.pressed.connect(_set_camera_mode.bind(mode))
		top.add_child(camera_button)
	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	outer.add_child(body)
	var left := VBoxContainer.new()
	left.custom_minimum_size = Vector2(280, 0)
	body.add_child(left)
	_panel(left, 280)
	var nav := ScrollContainer.new()
	nav.custom_minimum_size = Vector2(280, 660)
	nav.size_flags_vertical = Control.SIZE_EXPAND_FILL
	left.add_child(nav)
	var nav_col := VBoxContainer.new()
	nav.add_child(nav_col)
	nav_col.add_child(_heading("Cases • source-derived", 17))
	for i in range(_cases.size()):
		var c: Dictionary = _cases[i]
		var btn := _button("FDI " + str(c["fdi"]) + "  " + str(c["id"]).capitalize())
		btn.pressed.connect(_select_case.bind(i))
		nav_col.add_child(btn)
	nav_col.add_child(_heading("Training stations", 17))
	for i in range(_stations.size()):
		var st: Dictionary = _stations[i]
		var btn := _button("%d · %s" % [i + 1, str(st["title"])])
		btn.pressed.connect(_select_station.bind(i))
		nav_col.add_child(btn)
	_middle = Control.new()
	_middle.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_middle.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(_middle)
	var right := VBoxContainer.new()
	right.custom_minimum_size = Vector2(520, 0)
	body.add_child(right)
	var pane := PanelContainer.new()
	pane.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(pane)
	var scroll := ScrollContainer.new()
	pane.add_child(scroll)
	_page = VBoxContainer.new()
	_page.custom_minimum_size = Vector2(500, 0)
	_page.add_theme_constant_override("separation", 10)
	scroll.add_child(_page)
	_progress_label = _heading("", 13)
	outer.add_child(_progress_label)
	outer.add_child(_heading("Synthetic educational cases · local only · no medical-device/clinical/exam validation · complete app port IN PROGRESS", 12))

func _show_blocked(reason: String) -> void:
	_shell = CanvasLayer.new()
	add_child(_shell)
	var label := Label.new()
	label.text = "KLINIKLAB NATIVE STARTUP BLOCKED: " + reason
	label.position = Vector2(20, 20)
	_shell.add_child(label)

func _clear_page() -> void:
	for c in _page.get_children():
		_page.remove_child(c)
		c.queue_free()
	_draft = null
	_answer_label = null

func _key() -> String:
	return CASE_IDS[_case_index] + ":" + STATION_IDS[_station_index]

func _select_case(index: int) -> void:
	if index < 0 or index >= _cases.size():
		return
	_case_index = index
	_quiz_index = 0
	_show_case_geometry()
	_save_progress()
	_refresh()

func _select_station(index: int) -> void:
	if index < 0 or index >= _stations.size():
		return
	_station_index = index
	_quiz_index = 0
	_save_progress()
	_refresh()

func _show_case_geometry() -> void:
	if _scene == null:
		return
	var show_original: bool = CASE_IDS[_case_index] == "molar"
	for node_name in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		var original: Node3D = _scene.get_node_or_null(node_name)
		if original != null:
			original.visible = show_original

func _set_camera_mode(mode: String) -> void:
	if _scene == null or not (mode in ["overview", "teeth"]):
		return
	_camera_mode = mode
	var camera: Camera3D = _scene.get_node_or_null("KL_NATIVE_GODOT_FDI16_COMPARISON_CAMERA") as Camera3D
	if camera == null:
		push_warning("Godot original scene camera unavailable")
		return
	if mode == "overview":
		camera.position = Vector3(0.0, 5.0, 28.0)
		camera.fov = 60.0
		camera.look_at(Vector3(0.0, 0.0, -2.5))
	else:
		camera.position = Vector3(0.0, 1.7, 13.2)
		camera.fov = 47.0
		camera.look_at(Vector3(0.0, 0.5, 0.0))
	camera.current = true

func _switch_view(view: String) -> void:
	if not (view in ["clinic", "learning", "progress", "coverage"]):
		return
	_view = view
	if _scene != null:
		_scene.visible = view == "clinic"
	_middle.visible = view == "clinic"
	_refresh()

func _refresh() -> void:
	if _page == null:
		return
	_clear_page()
	var c: Dictionary = _cases[_case_index]
	var s: Dictionary = _stations[_station_index]
	_page.add_child(_heading("FDI " + str(c["fdi"]) + "  " + str(c["title"]), 21))
	_page.add_child(_heading("Station %d/7 · %s" % [_station_index + 1, str(s["title"])], 17))
	if _view == "progress":
		_show_progress()
	elif _view == "coverage":
		_show_coverage()
	else:
		_page.add_child(_heading("Complaint: " + str(c["complaint"]), 15))
		_page.add_child(_heading("Medical history: " + str(c["history"]), 14))
		_page.add_child(_heading("Exam: " + str(c["exam"]), 14))
		_page.add_child(_heading("Risk/uncertainty: " + str(c["risk"]), 14))
		if CASE_IDS[_case_index] != "molar":
			_page.add_child(_heading("FDI %s: source case content is real; original drillable case geometry NOT PORTED. FDI16 is hidden." % FDI[_case_index], 14))
		else:
			_page.add_child(_heading("Original FDI16 BEFORE / simulated-cut meshes visible. These are static source states, not real-time bur subtraction.", 14))
		_show_station()
	_progress_label.text = "Completed study records: %d · Answer records: %d · Offline educational progress" % [
		(_progress["studied"] as Dictionary).size(), (_progress["answers"] as Dictionary).size()]

func _show_station() -> void:
	var station: String = str(STATION_IDS[_station_index])
	if station in ["interview", "handover", "viva", "clinic"]:
		_show_quiz(station)
	elif station == "practical":
		_show_practical()
	else:
		_show_writing(station)
	var studied := _button("Mark this case/station studied (formative only)")
	studied.pressed.connect(_mark_studied)
	_page.add_child(studied)

func _show_quiz(station: String) -> void:
	var questions: Array = _content["quiz"][station]
	_quiz_index = clampi(_quiz_index, 0, questions.size() - 1)
	var q: Dictionary = questions[_quiz_index]
	_page.add_child(_heading("Practice question %d/%d: %s" % [
		_quiz_index + 1, questions.size(), str(q["question"])], 16))
	for i in range(3):
		var b := _button("%d. %s" % [i + 1, str(q["options"][i])])
		b.pressed.connect(_answer.bind(station, _quiz_index, i))
		_page.add_child(b)
	_answer_label = _heading("Choose one response. Explanations are formative, not clinical grading.", 14)
	_page.add_child(_answer_label)
	var next := _button("Next source question")
	next.pressed.connect(_next_question)
	_page.add_child(next)

func _answer(station: String, index: int, choice: int) -> void:
	if choice < 0 or choice > 2:
		return
	var q: Dictionary = _content["quiz"][station][index]
	var correct := choice == int(q["correct"])
	var answer_key := _key() + ":" + str(index)
	(_progress["answers"] as Dictionary)[answer_key] = {
		"selected": choice, "correct": correct, "sourceQuestion": index}
	_save_progress()
	if _answer_label != null:
		_answer_label.text = ("Correct. " if correct else "Review suggested. ") + str(q["explanation"])

func _next_question() -> void:
	var questions: Array = _content["quiz"][STATION_IDS[_station_index]]
	_quiz_index = (_quiz_index + 1) % questions.size()
	_refresh()

func _show_writing(station: String) -> void:
	var c: Dictionary = _cases[_case_index]
	var prompt := "Write a German FSP clinical letter using the history, examination, uncertainty and plan." if station == "letter" else 		"Create a reasoned differential diagnosis and compare TWO treatment choices; include consent and safety checks."
	_page.add_child(_heading(prompt, 15))
	_page.add_child(_heading("Working diagnosis: " + str(c["diagnosis"]), 14))
	_page.add_child(_heading("Option A: " + str(c["primaryPlan"]), 14))
	_page.add_child(_heading("Option B: " + str(c["alternativePlan"]), 14))
	_draft = TextEdit.new()
	_draft.custom_minimum_size = Vector2(475, 240)
	_draft.text = str((_progress["notes"] as Dictionary).get(_key(), ""))
	_page.add_child(_draft)
	var save := _button("Save draft on this computer")
	save.pressed.connect(_save_draft)
	_page.add_child(save)
	_page.add_child(_heading("Self-study note only. No automatic validated FSP/KP grading.", 13))

func _save_draft() -> void:
	if _draft == null:
		return
	if _draft.text.length() > 10000:
		_draft.text = _draft.text.substr(0, 10000)
	(_progress["notes"] as Dictionary)[_key()] = _draft.text
	_save_progress()

func _show_practical() -> void:
	var c: Dictionary = _cases[_case_index]
	_page.add_child(_heading("Treatment: " + str(c["primaryPlan"]), 15))
	_page.add_child(_heading("Alternative: " + str(c["alternativePlan"]), 15))
	_page.add_child(_heading("Choose a virtual instrument to inspect its original name. No force/torque or case-specific drill geometry is simulated.", 14))
	var instruments: Array = _content["tools"]
	for item in instruments:
		var t: Dictionary = item
		var b := _button(str(t["german"]) + " / " + str(t["english"]))
		b.pressed.connect(_select_tool.bind(str(t["id"]), str(t["german"])))
		_page.add_child(b)
	_answer_label = _heading("No instrument selected", 13)
	_page.add_child(_answer_label)

func _select_tool(id: String, label_text: String) -> void:
	(_progress["notes"] as Dictionary)[_key() + ":tool"] = id
	_save_progress()
	if _answer_label != null:
		_answer_label.text = "Selected: " + label_text + " · vocabulary exercise only"

func _mark_studied() -> void:
	(_progress["studied"] as Dictionary)[_key()] = true
	_save_progress()
	_refresh()

func _show_progress() -> void:
	_page.add_child(_heading("Personal local progress (not an official exam score)", 17))
	for c in _cases:
		for s in _stations:
			var k := str(c["id"]) + ":" + str(s["id"])
			var done: bool = (_progress["studied"] as Dictionary).get(k, false)
			_page.add_child(_heading(("✓ " if done else "○ ") + str(c["id"]) + " / " + str(s["title"]), 12))
	var reset := _button("Reset saved educational progress")
	reset.pressed.connect(_reset_progress)
	_page.add_child(reset)

func _reset_progress() -> void:
	_progress["answers"] = {}
	_progress["notes"] = {}
	_progress["studied"] = {}
	_save_progress()
	_refresh()

func _show_coverage() -> void:
	_page.add_child(_heading("MIGRATION STATUS · Functional parity is NOT complete", 18))
	var gates: Dictionary = _content.get("migrationGates", {})
	for id in gates:
		_page.add_child(_heading(str(id) + "  —  " + str(gates[id]), 14))
	_page.add_child(_heading("Already functional here: 3D schematic clinic, exact-source FDI16 before/cut comparison, 6 cases, 7 stations, formative multiple-choice questions, German writing drafts, vocabulary, local progress.", 15))
	_page.add_child(_heading("Not ported: live voxel cutting, licensed 32-tooth atlas, intraoral STL/OBJ import, radiography, XR/Quest, server Gemini AI, validated grading and complete reports. Continue using original browser app for these functions.", 15))
