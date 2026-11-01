extends SceneTree
## Tests exact source field, 3D topology editing, undo, reset and JSON replay.
## Runs only in Godot headless, NOT evidence of Windows Vulkan GPU pixels.
func _initialize() -> void:
	call_deferred("_smoke")

func _assert(ok: bool, message: String) -> bool:
	if not ok:
		push_error("KL_NATIVE_VOLUME_FAILED " + message)
		quit(1)
		return false
	return true

func _smoke() -> void:
	var expected := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript = load("res://volume-cut.gd")
	if not _assert(script != null, "GDScript missing"):
		return
	var edit: Node3D = script.new()
	if not _assert(bool(edit.call("configure",expected)), "Source field configure / mesh failed: "+str(edit.call("error"))):
		return
	var base: Dictionary = edit.call("summary")
	if not _assert(int(base["triangles"]) > 500 and int(base["removedSamplePoints"]) == 0,"Baseline geometry unexpected"):
		return
	if not _assert(bool(edit.call("cut_to",Vector3(0.0,1.01,0.0),0.22)), "Source restoration cut failed"):
		return
	var changed: Dictionary = edit.call("summary")
	if not _assert(int(changed["removedSamplePoints"])>0 and int(changed["triangles"])!=int(base["triangles"]), "3D geometry unchanged"):
		return
	var saved: Array = edit.call("export_strokes")
	if not _assert(saved.size()==1 and bool(edit.call("undo")), "Undo or export failed"):
		return
	var undo_state: Dictionary = edit.call("summary")
	if not _assert(int(undo_state["removedSamplePoints"])==0 and int(undo_state["triangles"])==int(base["triangles"]), "Undo did not restore baseline"):
		return
	if not _assert(bool(edit.call("restore_strokes",saved)), "JSON stroke replay failed"):
		return
	var reloaded: Dictionary = edit.call("summary")
	if not _assert(int(reloaded["removedSamplePoints"])==int(changed["removedSamplePoints"]), "Restored volume drift"):
		return
	edit.call("reset")
	if not _assert(int((edit.call("summary") as Dictionary)["strokes"])==0, "Reset left strokes"):
		return
	if not _assert(not bool(edit.call("cut_to",Vector3(99,1,0),0.22)) and not bool(edit.call("cut_to",Vector3(0,1,0),1.2)), "Invalid bur position/radius accepted"):
		return
	print("SR3_NATIVE_FDI16_VOLUME_LOGIC_PASS source field; dynamic mesh; undo; replay; reset; bounds; NO GPU OR CLINICAL VALIDATION")
	quit(0)
