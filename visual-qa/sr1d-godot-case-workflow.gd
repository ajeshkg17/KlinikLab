extends CanvasLayer
## SR1D native KlinikLab educational case/station workflow.
## Exact source is production app.js, exported separately and SHA-pinned.
## The original FDI16 comparison is *only* available for case molar/16.
## Do not confuse this small native navigation with a port of patient interaction,
## instrument physics, full case-specific geometry, AI or clinical scoring.

const MANIFEST_PATH := "res://source/kliniklab-native-cases.json"
const SOURCE_SHA_PATH := "res://source/expected-sha.txt"
const EXPECTED_CASE_IDS := ["molar", "endo", "anterior", "crown", "surgery", "perio"]
const EXPECTED_FDI := ["16", "36", "11", "26", "48", "46"]
const EXPECTED_STATIONS := ["interview", "letter", "handover", "written", "practical", "viva", "clinic"]

var _cases: Array = []
var _stations: Array = []
var _case_index: int = 0
var _station_index: int = 0
var _events: Array = []
var _scene: Node3D
var _title: Label
var _case_body: Label
var _station_title: Label
var _station_body: Label
var _geometry_note: Label
var _case_buttons: Array[Button] = []
var _ok: bool = false

func _ready() -> void:
	name = "KL_NATIVE_SOURCE_CASE_STATION_WORKFLOW"
	_scene = get_parent() as Node3D
	_ok = _load_and_validate_manifest()
	if not _ok:
		push_error("SR1D native case workflow source validation FAILED")
		return
	_build_ui()
	select_case(0)
	select_station(0)
	print("SR1D_CASES_STATIONS_READY: six production cases and seven stations, incomplete native workflow")

func _load_and_validate_manifest() -> bool:
	var source_sha := FileAccess.get_file_as_string(SOURCE_SHA_PATH).strip_edges()
	var raw := FileAccess.get_file_as_string(MANIFEST_PATH)
	var parsed: Variant = JSON.parse_string(raw)
	if not(parsed is Dictionary):
		return false
	var manifest: Dictionary = parsed
	if source_sha.length() != 40 or manifest.get("sourceGitSHA", "") != source_sha:
		return false
	if int(manifest.get("schemaVersion", -1)) != 1 or \
		manifest.get("kind", "") != "PRODUCTION_CASE_AND_STATION_METADATA_NOT_FULL_APP":
		return false
	if manifest.get("syntheticCasesOnly", false) != true or \
		manifest.get("clinicalAssessmentValidated", true) != false:
		return false
	_cases = manifest.get("cases", [])
	_stations = manifest.get("stations", [])
	if _cases.size() != 6 or _stations.size() != 7:
		return false
	if int(manifest.get("caseCount", 0)) != 6 or int(manifest.get("stationCount", 0)) != 7:
		return false
	for i in range(6):
		var c: Dictionary = _cases[i]
		if c.get("id", "") != EXPECTED_CASE_IDS[i] or c.get("fdi", "") != EXPECTED_FDI[i]:
			return false
		for k in ["title", "complaint", "history", "exam", "risk", "primaryPlan", "alternativePlan"]:
			if str(c.get(k, "")).length() < 3:
				return false
	for i in range(7):
		var s: Dictionary = _stations[i]
		if s.get("id", "") != EXPECTED_STATIONS[i] or \
			str(s.get("title", "")).length() < 3:
			return false
	return true

func _label(words: String, size: int = 17) -> Label:
	var l := Label.new()
	l.text = words
	l.add_theme_font_size_override("font_size", size)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return l

func _button(words: String) -> Button:
	var b := Button.new()
	b.text = words
	b.custom_minimum_size = Vector2(154, 40)
	b.add_theme_font_size_override("font_size", 16)
	return b

func _build_ui() -> void:
	var panel := PanelContainer.new()
	panel.name = "KL_PRODUCTION_CASE_PANEL"
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.position = Vector2(1210, 90)
	panel.custom_minimum_size = Vector2(368, 720)
	add_child(panel)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	panel.add_child(col)
	col.add_child(_label("KLINIKLAB / CLINICAL CASES", 22))
	col.add_child(_label("Exact production app.js • six synthetic training cases", 14))
	var grid := GridContainer.new()
	grid.columns = 2
	col.add_child(grid)
	for i in range(_cases.size()):
		var c: Dictionary = _cases[i]
		var b := _button(str(c["fdi"]) + "  " + str(c["id"]).capitalize())
		b.pressed.connect(Callable(self, "select_case").bind(i))
		grid.add_child(b)
		_case_buttons.append(b)
	_title = _label("", 20)
	_title.custom_minimum_size = Vector2(355, 55)
	col.add_child(_title)
	_case_body = _label("", 15)
	_case_body.custom_minimum_size = Vector2(355, 135)
	col.add_child(_case_body)
	var step_row := HBoxContainer.new()
	col.add_child(step_row)
	var prev := _button("Previous station")
	var next := _button("Next station")
	prev.pressed.connect(Callable(self, "previous_station"))
	next.pressed.connect(Callable(self, "next_station"))
	step_row.add_child(prev)
	step_row.add_child(next)
	_station_title = _label("", 18)
	col.add_child(_station_title)
	_station_body = _label("", 15)
	_station_body.custom_minimum_size = Vector2(355, 95)
	col.add_child(_station_body)
	_geometry_note = _label("", 14)
	_geometry_note.add_theme_color_override("font_color", Color(0.98, 0.77, 0.42))
	col.add_child(_geometry_note)
	col.add_child(_label("Educational navigation only. No calibrated cut, scoring, AI, patient record or physical Quest.", 13))

func select_case(index: int) -> void:
	if not _ok or index < 0 or index >= _cases.size():
		return
	_case_index = index
	var c: Dictionary = _cases[index]
	_title.text = "FDI " + str(c["fdi"]) + " • " + str(c["title"])
	_case_body.text = "Complaint: " + str(c["complaint"]) + "\nDiagnosis hypothesis: " + str(c["diagnosis"])
	for i in range(_case_buttons.size()):
		_case_buttons[i].disabled = (i == index)
	var original_fdi_visible: bool = str(c["fdi"]) == "16"
	for node_name in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		var tooth: Node3D = _scene.get_node_or_null(node_name)
		if tooth != null:
			tooth.visible = original_fdi_visible
	_geometry_note.text = ("Source FDI16 before/after visible; not a calibrated simulation." if original_fdi_visible else
		"FDI " + str(c["fdi"]) + ": native case metadata only. Original case-specific drillable tooth NOT PORTED.")
	_events.append({"type":"case", "id":c["id"], "fdi":c["fdi"],
		"originalFDI16GeometryVisible":original_fdi_visible})
	_render_station()

func select_station(index: int) -> void:
	if not _ok or index < 0 or index >= _stations.size():
		return
	_station_index = index
	var s: Dictionary = _stations[index]
	_events.append({"type":"station", "id":s["id"], "track":s["track"]})
	_render_station()

func next_station() -> void:
	select_station((_station_index + 1) % _stations.size())

func previous_station() -> void:
	select_station((_station_index - 1 + _stations.size()) % _stations.size())

func _render_station() -> void:
	if _station_title == null or _station_body == null:
		return
	var s: Dictionary = _stations[_station_index]
	_station_title.text = str(_station_index + 1) + "/7  " + str(s["title"])
	_station_body.text = str(s["description"])

func evidence_state() -> Dictionary:
	if not _ok:
		return {"valid":false}
	return {
		"valid":true, "caseCount":_cases.size(), "stationCount":_stations.size(),
		"selectedCaseId":_cases[_case_index]["id"], "selectedFDI":_cases[_case_index]["fdi"],
		"selectedStationId":_stations[_station_index]["id"],
		"originalFDI16GeometryAvailable":_cases[_case_index]["fdi"] == "16",
		"caseStationEvents":_events.duplicate(true),
		"workflowNavigationImplemented":true,
		"fullKlinikLabApplicationMigrated":false,
		"clinicalAssessmentValidated":false,
		"originalCaseSpecificSimulationImplemented":false
	}
