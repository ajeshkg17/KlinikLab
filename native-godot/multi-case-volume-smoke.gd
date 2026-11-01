extends SceneTree
## All 6 original source-derived case volumes must be real native Godot
## geometry, independently editable and identity checked.
## Headless topology only — NOT Windows GPU pixels, anatomy or clinical QA.
const IDS := ["molar","endo","anterior","crown","surgery","perio"]
const FDIs := ["16","36","11","26","48","46"]

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR9_SIX_CASE_VOLUME_TEST_FAILED: " + reason)
	quit(1)

func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var source: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://source/editable-case-volumes.json"))
	if not (source is Dictionary) or str(source.get("sourceGitSHA",""))!=sha:
		_fail("Source index missing or Git SHA drift")
		return
	var index: Dictionary = source
	var entries: Dictionary = index.get("cases", {})
	if entries.size()!=6:
		_fail("All six case volume identities required")
		return
	var script: GDScript = load("res://volume-cut.gd")
	if script==null:
		_fail("Editor script not parsed")
		return
	var objects: Dictionary = {}
	var counts: Dictionary = {}
	for i in range(IDS.size()):
		var id: String = IDS[i]
		var fdi: String = FDIs[i]
		if not entries.has(id) or str(entries[id].get("fdi", "")) != fdi:
			_fail("Source exported incorrect clinical case identity "+id)
			return
		var editor: Node3D = script.new()
		if not bool(editor.call("configure",sha,id)):
			_fail("Real native case configuration failed "+id+": "+str(editor.call("error")))
			return
		var base: Dictionary = editor.call("summary")
		if str(base.get("fdi","")) != fdi or str(base.get("caseId","")) != id or int(base.get("triangles",0)) < 500 or int(base.get("removedSamplePoints",-1)) != 0:
			_fail("Case volume is mislabeled, empty or pre-cut: "+id)
			return
		objects[id] = editor
		counts[id] = int(base["triangles"])
		if not bool(editor.call("cut_to",Vector3(0.0,1.01,0.0),0.22)):
			_fail("Case-specific synthetic 3D removal was ineffective: "+id)
			return
		var edited: Dictionary = editor.call("summary")
		if int(edited["removedSamplePoints"]) < 1 or int(edited["triangles"]) == counts[id]:
			_fail("Case-specific signed-distance topology did not change: "+id)
			return
		if (editor.call("export_strokes") as Array).size() != 1:
			_fail("Case-specific stroke journal missing: "+id)
			return
	var empty_pair: Node3D = script.new()
	if bool(empty_pair.call("configure",sha,"invented")):
		_fail("Unknown case accepted")
		return
	for id in ["molar","surgery","perio"]:
		var volume: Node3D = objects[id]
		var prior: Dictionary = volume.call("summary")
		var saved: Array = volume.call("export_strokes")
		if not bool(volume.call("undo")):
			_fail("Case undo unavailable "+id)
			return
		var undone: Dictionary = volume.call("summary")
		if int(undone["removedSamplePoints"])!=0 or int(undone["triangles"])!=counts[id]:
			_fail("Undo failed to reconstruct original mesh "+id)
			return
		if not bool(volume.call("restore_strokes",saved)):
			_fail("Case source-verified stroke replay failed "+id)
			return
		if int((volume.call("summary") as Dictionary)["removedSamplePoints"]) != int(prior["removedSamplePoints"]):
			_fail("Replayed signed-distance volume drift "+id)
			return
	# Reject malformed cross-case strokes rather than applying uncontrolled coordinates.
	var invalid: Array = [{"at":[99.0,0.0,0.0],"radius":0.22}]
	var anterior: Node3D = objects["anterior"]
	if bool(anterior.call("restore_strokes", invalid)):
		_fail("Out-of-bounds session accepted")
		return
	if int((anterior.call("summary") as Dictionary)["removedSamplePoints"])!=0:
		_fail("Invalid journal failed to reset case")
		return
	var surgery: Node3D = objects["surgery"]
	var perio: Node3D = objects["perio"]
	if str((surgery.call("summary") as Dictionary)["fdi"]) == str((perio.call("summary") as Dictionary)["fdi"]):
		_fail("Case FDI identity collapsed across equivalent tooth-class source fields")
		return
	print("SR9_NATIVE_ALL_SIX_CASE_EDITABLE_VOLUMES_PASS source_sha="+sha+" FDI=16,36,11,26,48,46 cut/undo/replay/identity; NO GPU/CLINICAL ACCEPTANCE")
	quit(0)
