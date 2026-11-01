extends SceneTree
## SR15 synthetic pulp-grid indicators, NOT clinical anatomy, depth or safety.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIs := ["16","36","11","26","48","46"]
const TOTAL := 21875
func _initialize() -> void:
	call_deferred("_run")
func _fail(message: String) -> void:
	push_error("SR15_NATIVE_PULP_SAMPLE_FAILED: "+message)
	quit(1)
func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript = load("res://volume-cut.gd")
	if script==null:
		_fail("Native source volume not loadable")
		return
	for i in range(IDS.size()):
		var editor: Node3D = script.new()
		if not bool(editor.call("configure",sha,IDS[i])):
			_fail("Source tooth unavailable "+IDS[i])
			return
		var original: Dictionary = editor.call("summary")
		var baseline_pulp := int(original.get("originalModelPulpSamplePoints",0))
		if str(original["fdi"])!=FDIs[i] or baseline_pulp<=0 or int(original.get("removedModelPulpSamplePoints",-1))!=0 or bool(original.get("syntheticPulpRegionContact",true)):
			_fail("Unedited case pulp model invalid: "+IDS[i])
			return
		var source: PackedFloat32Array = editor.get("_source_fields")
		var points: PackedVector3Array = editor.get("_points")
		if source.size()!=4*TOTAL or points.size()!=TOTAL:
			_fail("Source scalar fields/grid changed "+IDS[i])
			return
		var candidate := Vector3.ZERO
		var found := false
		for k in range(TOTAL):
			if source[k]>=0.0 or source[2*TOTAL+k]>=0.0:
				continue
			var point: Vector3 = points[k]
			if absf(point.x)>0.95 or absf(point.z)>0.85 or point.y < -1.25 or point.y > 1.10:
				continue
			candidate=point
			found=true
			break
		if not found:
			_fail("No editable synthetic source pulp-grid sample for "+IDS[i])
			return
		if not bool(editor.call("cut_to",candidate,0.28)):
			_fail("Case-specific synthetic pulse removal failed "+IDS[i])
			return
		var changed: Dictionary = editor.call("summary")
		if not bool(changed.get("syntheticPulpRegionContact",false)) or int(changed.get("removedModelPulpSamplePoints",0))<=0 or int(changed["removedSamplePoints"])<int(changed["removedModelPulpSamplePoints"]):
			_fail("Pulp region not counted as subset of source tooth removal "+IDS[i])
			return
		var journal: Array = editor.call("export_strokes")
		if journal.size()!=1 or not bool(editor.call("undo")):
			_fail("Synthetic pulp undo/export did not work "+IDS[i])
			return
		if int((editor.call("summary") as Dictionary)["removedModelPulpSamplePoints"])!=0:
			_fail("Undo failed to restore synthetic source pulp grid "+IDS[i])
			return
		if not bool(editor.call("restore_strokes",journal)) or int((editor.call("summary") as Dictionary)["removedModelPulpSamplePoints"])!=int(changed["removedModelPulpSamplePoints"]):
			_fail("Saved native pulp region indicator replay drift "+IDS[i])
			return
		editor.call("reset")
		if bool((editor.call("summary") as Dictionary)["syntheticPulpRegionContact"]):
			_fail("Synthetic pulp region reset retained history "+IDS[i])
			return
		editor.free()
	print("SR15_NATIVE_SIX_CASE_PULP_SAMPLE_INDICATOR_PASS six FDI model fields/cut/undo/replay/reset; NO CLINICAL OR RTX ACCEPTANCE")
	quit(0)
