extends TextureRect
## Offline fictional radiography viewer. SHA-pinned source-generated pixels.
## Designed as a bounded educational interpretation exercise, NEVER imaging
## of a patient, diagnostic radiograph or clinically calibrated radiography.
signal point_marked(normalized: Vector2)

const INDEX := "res://source/radiography/manifest.json"
const PREFIX := "res://source/radiography/"
const CASES := {"molar":"16","endo":"36","anterior":"11",
	"crown":"26","surgery":"48","perio":"46"}
const KINDS := {"molar":"caries","endo":"apex","anterior":"trauma",
	"crown":"normal","surgery":"impaction","perio":"bone"}

var _info: Dictionary = {}
var _marks: Array = []
var _reveal := false
var _error := ""

func configure(expected_sha: String, case_id: String) -> bool:
	if not CASES.has(case_id):
		_error = "Unknown case identity"
		return false
	var source: Variant = JSON.parse_string(FileAccess.get_file_as_string(INDEX))
	if not (source is Dictionary):
		_error = "Synthetic source radiography manifest missing"
		return false
	var manifest: Dictionary = source
	if str(manifest.get("kind", "")) != "SOURCE_SYNTHETIC_RADIOGRAPHY_EDUCATIONAL_PROJECTION_NOT_PATIENT_DATA" or str(manifest.get("sourceGitSHA","")) != expected_sha or manifest.get("patientImage",true) != false or manifest.get("clinicalAccuracyValidated",true) != false:
		_error = "Unexpected source radiography revision or clinical claim"
		return false
	var cases: Dictionary = manifest.get("cases", {})
	if cases.size() != 6 or not cases.has(case_id):
		_error = "Incomplete six-case source radiography catalog"
		return false
	var m: Dictionary = cases[case_id]
	var fdi: String = CASES[case_id]
	var image_name := "fdi" + fdi + "-synthetic.png"
	if str(m.get("id","")) != case_id or str(m.get("fdi","")) != fdi or str(m.get("kind","")) != str(KINDS[case_id]) or str(m.get("file","")) != image_name:
		_error = "Source case, FDI or simulated finding does not match"
		return false
	var image_path := PREFIX + image_name
	if not FileAccess.file_exists(image_path) or FileAccess.get_sha256(image_path) != str(m.get("sha256","")):
		_error = "Synthetic image checksum mismatch"
		return false
	var original: Image = Image.load_from_file(image_path)
	var size: Array = manifest.get("imageSize", [])
	if original == null or size.size()!=2 or original.get_width() != int(size[0]) or original.get_height() != int(size[1]) or original.get_width()!=360 or original.get_height()!=240:
		_error = "Unverified synthetic image dimensions"
		return false
	texture = ImageTexture.create_from_image(original)
	if texture == null:
		_error = "Could not instantiate source radiography texture"
		return false
	_info = m
	mouse_filter = Control.MOUSE_FILTER_STOP
	custom_minimum_size = Vector2(468,312)
	expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	stretch_mode = TextureRect.STRETCH_SCALE
	return true

func error() -> String:
	return _error

func info() -> Dictionary:
	return _info.duplicate(true)

func set_marks(value: Variant) -> bool:
	if not (value is Array) or value.size()>20:
		return false
	var clean: Array = []
	for row in value:
		if not (row is Array) or row.size()!=2:
			return false
		var x := float(row[0])
		var y := float(row[1])
		if not is_finite(x) or not is_finite(y) or x<0 or x>1 or y<0 or y>1:
			return false
		clean.append(Vector2(x,y))
	_marks = clean
	queue_redraw()
	return true

func reveal(enabled: bool) -> void:
	_reveal = enabled
	queue_redraw()

func marks_count() -> int:
	return _marks.size()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var click: InputEventMouseButton = event
		if click.pressed and click.button_index == MOUSE_BUTTON_LEFT and _marks.size()<20:
			if size.x<=0.0 or size.y<=0.0:
				return
			var point := Vector2(clampf(click.position.x/size.x,0.0,1.0),
				clampf(click.position.y/size.y,0.0,1.0))
			_marks.append(point)
			point_marked.emit(point)
			queue_redraw()
			accept_event()

func _draw() -> void:
	var marker_color := Color("#ffd37c")
	for marker in _marks:
		var center: Vector2 = marker * size
		draw_arc(center,10.0,0.0,TAU,32,marker_color,2.0,true)
		draw_line(center+Vector2(-14,0),center+Vector2(14,0),marker_color,1.6,true)
		draw_line(center+Vector2(0,-14),center+Vector2(0,14),marker_color,1.6,true)
	if _reveal:
		var zone := Rect2(Vector2(size.x*.43,size.y*.25),Vector2(size.x*.14,size.y*.16))
		var kind: String = str(_info.get("kind",""))
		if kind == "apex":
			zone.position.y = size.y*.75
		elif kind == "bone":
			zone.position.y = size.y*.42
		draw_rect(zone,Color("#65e6a6"),false,2.5,true)
