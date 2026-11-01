extends RefCounted
## Resolves ORIGINAL, SHA-verified raw bytes in editor and the portable EXE.
## Godot exports imported OBJ/GLB as remapped mesh/scene resources, which may
## no longer expose the original byte stream through FileAccess(res://...).
## The Windows release therefore carries exact, SHA-256 audited raw sidecars.
## Never replaces ResourceLoader.load of the Godot native converted PackedScene.

static func verified_path(source_path: String, expected_sha256: String) -> String:
	if expected_sha256.length()!=64 or not (
		source_path.begins_with("res://source/") or
		source_path.begins_with("res://assets/cc0/3dassets-dental/") or
		source_path.begins_with("res://assets/dundee/")
	):
		return ""
	var rel := source_path.trim_prefix("res://")
	if rel.contains("..") or rel.contains("\\") or rel.begins_with("/") or rel.is_empty():
		return ""
	if FileAccess.file_exists(source_path) and FileAccess.get_sha256(source_path)==expected_sha256:
		return source_path
	var sidecar: String = OS.get_executable_path().get_base_dir().path_join("verified-raw-source").path_join(rel)
	if FileAccess.file_exists(sidecar) and FileAccess.get_sha256(sidecar)==expected_sha256:
		return sidecar
	return ""

static func verified_bytes_available(source_path: String, expected_sha256: String) -> bool:
	return not verified_path(source_path,expected_sha256).is_empty()
