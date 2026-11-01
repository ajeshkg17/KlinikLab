extends SceneTree
## Native SHA-scoped raw asset resolver. Regression is an EDITOR/CI source
## check; actual Windows packaged sidecar requires separate release verification.
func _initialize() -> void:
	call_deferred("_run")
func _fail(reason: String) -> void:
	push_error("SR16_RAW_SOURCE_RESOLVER_TEST_FAILED "+reason)
	quit(1)
func _run() -> void:
	var resolver: GDScript = load("res://raw-source.gd")
	if resolver==null:
		_fail("Raw-source resolver GDScript unavailable")
		return
	var manifest: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://source/kliniklab-export-manifest.json"))
	if not (manifest is Dictionary):
		_fail("Original source manifest missing")
		return
	var m: Dictionary = manifest
	var originals: Dictionary = m.get("originals",{})
	for file in ["fdi16-before.obj","fdi16-after-cut.obj","kliniklab-fdi16.mtl"]:
		var expected := str(originals.get(file,""))
		var p: String = resolver.verified_path("res://source/"+file,expected)
		if p.is_empty() or FileAccess.get_sha256(p)!=expected:
			_fail("Original immutable FDI16 source asset is not resolved/hash verified: "+file)
			return
		if not str(resolver.verified_path("res://source/"+file,"0".repeat(64))).is_empty():
			_fail("Mismatched original OBJ SHA accepted: "+file)
			return
	var clinic: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://assets/cc0/3dassets-dental/clinic-manifest.json"))
	if not (clinic is Dictionary):
		_fail("Approved CC0 source-manifest missing")
		return
	for item in (clinic as Dictionary).get("assets",[]):
		var row: Dictionary = item
		for pair in [[str(row["name"])+".source",str(row["sha256"])],
			[str(row["godotFile"]),str(row["godotSha256"])]]:
			var p: String = resolver.verified_path("res://assets/cc0/3dassets-dental/"+str(pair[0]),str(pair[1]))
			if p.is_empty() or FileAccess.get_sha256(p)!=str(pair[1]):
				_fail("CC0 original/dequantized file is not source-verified: "+str(pair[0]))
				return
	for bad in ["res://source/../app.gd","res://evil.txt","user://app.dat","res://source/..\\secret.obj"]:
		if not str(resolver.verified_path(bad,"0".repeat(64))).is_empty():
			_fail("Unsafe resource resolution allowed "+bad)
			return
	print("SR16_EDITOR_ORIGINAL_FDI16_AND_CC0_RAW_SHA_RESOLVER_PASS; exported Windows bundle independently verified in release workflow; NO GPU/PIXEL CLAIM")
	quit(0)
