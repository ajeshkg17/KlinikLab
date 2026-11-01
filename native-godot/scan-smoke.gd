extends SceneTree
## Local scan parser/mesh native smoke, no clinical or GPU acceptance.
func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var script: GDScript = load("res://scan-viewer.gd")
	if script == null:
		push_error("SR7_SCAN_TEST_FAIL viewer script missing")
		quit(1)
		return
	var viewer: Node3D = script.new()
	var obj := "v 0 0 0\nv 2 0 0\nv 0 1 0\nf 1 2 3\n".to_utf8_buffer()
	if not bool(viewer.call("load_scan_bytes", obj, "obj", "synthetic-test.obj")) or int(viewer.call("triangle_count")) != 1:
		push_error("SR7_SCAN_TEST_FAIL native OBJ triangle/mesh")
		quit(1)
		return
	viewer.call("set_wireframe",true)
	viewer.call("rotate_model",30.0)
	var binary := PackedByteArray()
	binary.resize(134)
	binary.encode_u32(80,1)
	# one triangle in binary STL, normal left zero
	binary.encode_float(96,0.0)
	binary.encode_float(100,0.0)
	binary.encode_float(104,0.0)
	binary.encode_float(108,2.0)
	binary.encode_float(112,0.0)
	binary.encode_float(116,0.0)
	binary.encode_float(120,0.0)
	binary.encode_float(124,1.0)
	binary.encode_float(128,0.0)
	if not bool(viewer.call("load_scan_bytes",binary,"stl","synthetic-test.stl")) or int(viewer.call("triangle_count")) != 1:
		push_error("SR7_SCAN_TEST_FAIL binary STL triangle/mesh: "+str(viewer.call("error")))
		quit(1)
		return
	if bool(viewer.call("load_scan_bytes",PackedByteArray(),"obj")):
		push_error("SR7_SCAN_TEST_FAIL empty scan accepted")
		quit(1)
		return
	if bool(viewer.call("load_scan_bytes","v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 99\n".to_utf8_buffer(),"obj")):
		push_error("SR7_SCAN_TEST_FAIL invalid face accepted")
		quit(1)
		return
	if bool(viewer.call("load_scan_bytes",binary,"exe")):
		push_error("SR7_SCAN_TEST_FAIL unsupported format accepted")
		quit(1)
		return
	print("SR7_NATIVE_LOCAL_STL_OBJ_SCAN_LOGIC_PASS OBJ; BINARY STL; LIMITS; LOCAL ONLY; NO GPU OR CLINICAL VALIDATION")
	quit(0)
