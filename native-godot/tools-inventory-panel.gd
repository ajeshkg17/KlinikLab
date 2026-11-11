extends Control
## Read-only 3D dental-tool inventory. No case scoring or user:// writes.
const CATALOG := preload("res://tools-inventory-catalog.gd")
const PREVIEW := preload("res://chairside-model-preview.gd")

var _entries: Array[Dictionary] = []
var _selector: OptionButton
var _preview: PREVIEW
var _status: Label
var _details: Label
var _cue: Label
var _source: LinkButton

func start() -> void:
	name = "KL_TOOL_INVENTORY"
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_entries = CATALOG.entries()
	var backdrop := ColorRect.new()
	backdrop.color = Color("#101b26")
	add_child(backdrop)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT, Control.PRESET_MODE_MINSIZE, 18)
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 9)
	scroll.add_child(content)

	var heading := HBoxContainer.new()
	content.add_child(heading)
	var title := _text("Dental instrument inventory · 3D study", 24)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_child(title)
	var close := Button.new()
	close.name = "KL_INVENTORY_CLOSE"
	close.text = "Close inventory"
	close.pressed.connect(queue_free)
	heading.add_child(close)
	content.add_child(_text("Choose an item to rotate its study model. These are illustrative assets; this inventory does not assess clinical proficiency or modify learner progress.", 14))

	_selector = OptionButton.new()
	_selector.name = "KL_INVENTORY_SELECT"
	_selector.custom_minimum_size.y = 36
	content.add_child(_selector)
	for index in range(_entries.size()):
		var item: Dictionary = _entries[index]
		_selector.add_item(str(item["name"]) + " · " + str(item["kind"]), index)
	_selector.item_selected.connect(_select_item)

	_status = _text("", 16)
	content.add_child(_status)
	_preview = PREVIEW.new()
	_preview.custom_minimum_size = Vector2(0, 280)
	content.add_child(_preview)
	var rotate := HBoxContainer.new()
	content.add_child(rotate)
	var left := Button.new()
	left.name = "KL_INVENTORY_ROTATE_LEFT"
	left.text = "Rotate left"
	left.pressed.connect(func() -> void: _preview.turn(-0.42))
	rotate.add_child(left)
	var right := Button.new()
	right.name = "KL_INVENTORY_ROTATE_RIGHT"
	right.text = "Rotate right"
	right.pressed.connect(func() -> void: _preview.turn(0.42))
	rotate.add_child(right)
	_details = _text("", 15)
	content.add_child(_details)
	_cue = _text("", 14)
	content.add_child(_cue)
	_source = LinkButton.new()
	_source.name = "KL_INVENTORY_SOURCE"
	_source.text = "View original model source"
	content.add_child(_source)
	if not _entries.is_empty():
		_selector.select(0)
		_select_item(0)

func _text(value: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	return label

func _select_item(index: int) -> void:
	if index < 0 or index >= _entries.size():
		return
	var item: Dictionary = _entries[index]
	_status.text = "%d / %d · %s · %s" % [index + 1, _entries.size(), str(item["name"]), str(item["german"])]
	_details.text = str(item["kind"]) + " · " + str(item["purpose"])
	_cue.text = str(item["cue"])
	_source.uri = str(item["source"])
	_source.visible = _source.uri.begins_with("https://")
	var ready := _preview.show_model(str(item["scene"]))
	if not ready:
		_status.text += " · 3D model not available in this build"
