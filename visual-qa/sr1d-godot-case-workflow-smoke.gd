extends SceneTree
## SR1D real Godot headless case/station *logic* regression; no GPU pixels.
## This test is deliberately separate from owner-PC private Vulkan acceptance.
func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene := Node3D.new()
	scene.name = "SR1D_TEST_SCENE"
	root.add_child(scene)
	for label in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		var tooth := Node3D.new()
		tooth.name = label
		scene.add_child(tooth)
	var source_script: GDScript = load("res://sr1d-godot-case-workflow.gd")
	if source_script == null:
		push_error("Missing native workflow script")
		quit(3)
		return
	var workflow: CanvasLayer = source_script.new()
	scene.add_child(workflow)
	var first: Dictionary = workflow.call("evidence_state")
	if not first.get("valid", false) or first.get("selectedCaseId", "") != "molar" or \
		first.get("selectedFDI", "") != "16" or \
		first.get("selectedStationId", "") != "interview":
		push_error("Expected original FDI16/interview on native clinic entry")
		quit(4)
		return
	for label in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		if not (scene.get_node(label) as Node3D).visible:
			push_error("Original FDI16 was not initially visible")
			quit(5)
			return
	workflow.call("select_case", 1)
	workflow.call("select_station", 4)
	var changed: Dictionary = workflow.call("evidence_state")
	if changed.get("selectedCaseId", "") != "endo" or \
		changed.get("selectedFDI", "") != "36" or \
		changed.get("selectedStationId", "") != "practical" or \
		changed.get("originalFDI16GeometryAvailable", true):
		push_error("Actual production case switch did not select correct FDI36/practical")
		quit(6)
		return
	for label in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		if (scene.get_node(label) as Node3D).visible:
			push_error("Incorrectly presenting FDI16 as FDI36")
			quit(7)
			return
	if changed.get("fullKlinikLabApplicationMigrated", true) or \
		changed.get("originalCaseSpecificSimulationImplemented", true):
		push_error("Native migration milestone overstated full application features")
		quit(8)
		return
	if (changed.get("caseStationEvents", []) as Array).size() < 4:
		push_error("Missing expected initial and changed native state events")
		quit(9)
		return
	workflow.call("select_case", 0)
	for label in ["KL_FDI16_BEFORE", "KL_FDI16_AFTER"]:
		if not (scene.get_node(label) as Node3D).visible:
			push_error("Original native FDI16 did not restore on return to molar case")
			quit(10)
			return
	print("SR1D_GODOT_CASE_STATION_LOGIC_PASSED: 6 cases, 7 stations, FDI16 -> FDI36 -> FDI16; NO native GPU proof")
	quit(0)
