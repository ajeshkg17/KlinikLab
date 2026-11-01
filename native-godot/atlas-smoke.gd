extends SceneTree
## 32 distinct exact-source anatomical identity and material/triangle tests.
## Native 3D mesh tests only; no Windows GPU, clinical validation or Quest.
func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var src:=FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var script: GDScript=load("res://atlas-viewer.gd")
	if script==null:
		push_error("SR6_ATLAS_SMOKE_FAIL script missing")
		quit(1)
		return
	var atlas: Node3D=script.new()
	if not bool(atlas.call("configure",src)):
		push_error("SR6_ATLAS_SMOKE_FAIL configure "+str(atlas.call("error")))
		quit(1)
		return
	var total:=0
	for q in range(1,5):
		for number in range(1,9):
			var fdi:=str(q)+str(number)
			if not bool(atlas.call("select_tooth",fdi)):
				push_error("SR6_ATLAS_SMOKE_FAIL FDI "+fdi+" "+str(atlas.call("error")))
				quit(1)
				return
			var count:=int(atlas.call("triangle_count"))
			if str(atlas.call("selected"))!=fdi or count<100:
				push_error("SR6_ATLAS_SMOKE_FAIL wrong source FDI "+fdi)
				quit(1)
				return
			total+=count
	if bool(atlas.call("select_tooth","19")):
		push_error("SR6_ATLAS_SMOKE_FAIL invalid FDI accepted")
		quit(1)
		return
	print("SR6_NATIVE_SOURCE_32_ATLAS_LOGIC_PASS source_sha="+src+" permanent_teeth=32 triangles="+str(total)+" NO GPU/CLINICAL VALIDATION")
	quit(0)
