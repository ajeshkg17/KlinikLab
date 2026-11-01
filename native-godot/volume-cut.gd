extends Node3D
## Editable synthetic case-specific tooth. The four scalar fields are sampled from
## production ToothSolid at EXACT Git SHA during build, not hand-approximated.
## Marching tetrahedra runs natively; carving is true 3D union-of-spheres
## subtraction. Not a calibrated bur, medical scan or clinical score.

const GRID := 24
const HEIGHT := 34
const TOTAL := 21875
const MIN_POS := Vector3(-1.39, -1.67, -1.22)
const MAX_POS := Vector3(1.39, 1.44, 1.22)
const TETRA := [[0,5,1,6], [0,1,2,6], [0,2,3,6], [0,3,7,6], [0,7,4,6], [0,4,5,6]]
const TISSUES := ["enamel", "dentin", "pulp", "cementum", "caries"]
const PALETTE := [
	Color(0.94,0.90,0.80), Color(0.86,0.65,0.42),
	Color(0.72,0.30,0.38), Color(0.62,0.51,0.43),
	Color(0.40,0.27,0.27)
]
const MAX_STROKES := 32
const CASE_FDI := {"molar":"16","endo":"36","anterior":"11","crown":"26","surgery":"48","perio":"46"}
const CASE_CLASS := {"molar":"molar","endo":"molar","anterior":"incisor",
	"crown":"molar","surgery":"molar","perio":"molar"}

var _source_fields := PackedFloat32Array()
var _points := PackedVector3Array()
var _signed := PackedFloat32Array()
var _strokes: Array = []
var _mesh_instance: MeshInstance3D
var _initial_inside := 0
var _original_pulp_samples := 0
var _removed := 0
var _removed_pulp_samples := 0
var _triangle_count := 0
var _error := ""
var _fdi := ""
var _case_id := ""

func configure(expected_sha: String, case_id: String = "molar") -> bool:
	if not CASE_FDI.has(case_id):
		_error = "Unknown clinical synthetic case"
		return false
	var fdi: String = CASE_FDI[case_id]
	var index: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://source/editable-case-volumes.json"))
	if not (index is Dictionary):
		_error = "Missing six-case source volume index"
		return false
	var catalog: Dictionary = index
	var items: Dictionary = catalog.get("cases", {})
	if str(catalog.get("sourceGitSHA", "")) != expected_sha or str(catalog.get("kind", "")) != "SOURCE_DERIVED_SIX_SYNTHETIC_EDITABLE_CASE_VOLUMES_NOT_CLINICAL" or items.size() != 6 or not items.has(case_id):
		_error = "Volume source revision or six-case catalog mismatch"
		return false
	var item: Dictionary = items[case_id]
	if str(item.get("fdi","")) != fdi:
		_error = "Source catalog FDI mismatch"
		return false
	var manifest_path := "res://source/fdi" + fdi + "-volume-field-manifest.json"
	var info: Variant = JSON.parse_string(FileAccess.get_file_as_string(manifest_path))
	if not (info is Dictionary):
		_error = "Missing exact synthetic FDI " + fdi + " source field manifest"
		return false
	var m: Dictionary = info
	if str(m.get("sourceGitSHA", "")) != expected_sha or str(m.get("model", "")) != "ORIGINAL_PROCEDURAL_SYNTHETIC_CASE_VOLUME_UNCALIBRATED" or str(m.get("caseId", "")) != case_id or str(m.get("fdi","")) != fdi or str(m.get("toothClass","")) != str(CASE_CLASS[case_id]):
		_error = "Source clinical case, tooth class or FDI manifest mismatch"
		return false
	if str(item.get("sha256", "")) != str(m.get("fieldSHA256", "")) or str(item.get("file", "")) != "fdi" + fdi + "-volume-field.bin":
		_error = "Independent source catalog/field checksum mismatch"
		return false
	if int(m.get("resolution", -1)) != GRID or int(m.get("ny", -1)) != HEIGHT or int(m.get("sampleCount", -1)) != TOTAL:
		_error = "Unsupported production voxel resolution"
		return false
	if m.get("channels", []) != ["outer", "dentin", "pulp", "caries"]:
		_error = "Production scalar-field channels changed"
		return false
	var path := "res://source/fdi" + fdi + "-volume-field.bin"
	if not FileAccess.file_exists(path) or FileAccess.get_sha256(path) != str(m.get("fieldSHA256", "")):
		_error = "Original scalar field SHA256 mismatch"
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null or file.get_length() != TOTAL * 4 * 4:
		_error = "Wrong source field byte count"
		return false
	file.big_endian = false
	_source_fields.resize(TOTAL * 4)
	for idx in range(TOTAL * 4):
		var value := file.get_float()
		if not is_finite(value):
			_error = "Nonfinite original field sample"
			return false
		_source_fields[idx] = value
	file.close()
	_points.resize(TOTAL)
	_signed.resize(TOTAL)
	for i in range(GRID + 1):
		for j in range(HEIGHT + 1):
			for k in range(GRID + 1):
				var id := _id(i,j,k)
				_points[id] = Vector3(
					MIN_POS.x + i * (MAX_POS.x - MIN_POS.x) / GRID,
					MIN_POS.y + j * (MAX_POS.y - MIN_POS.y) / HEIGHT,
					MIN_POS.z + k * (MAX_POS.z - MIN_POS.z) / GRID)
				if _source_fields[id] < 0.0:
					_initial_inside += 1
					if _source_fields[2 * TOTAL + id] < 0.0:
						_original_pulp_samples += 1
	_mesh_instance = MeshInstance3D.new()
	_mesh_instance.name = "KL_FDI" + fdi + "_REGENERATED_TISSUE_MESH"
	add_child(_mesh_instance)
	name = "KL_FDI" + fdi + "_EDITABLE_CUT"
	_fdi = fdi
	_case_id = case_id
	position.x = 2.9
	_rebuild()
	return _initial_inside > 0 and _triangle_count > 500

func error() -> String:
	return _error

func _id(i: int, j: int, k: int) -> int:
	return ((i * (HEIGHT + 1) + j) * (GRID + 1) + k)

func _channel_value(channel: int, p: Vector3) -> float:
	var fx := clampf((p.x - MIN_POS.x) * GRID / (MAX_POS.x-MIN_POS.x),0.0,float(GRID))
	var fy := clampf((p.y - MIN_POS.y) * HEIGHT / (MAX_POS.y-MIN_POS.y),0.0,float(HEIGHT))
	var fz := clampf((p.z - MIN_POS.z) * GRID / (MAX_POS.z-MIN_POS.z),0.0,float(GRID))
	var x0 := mini(int(floor(fx)), GRID - 1)
	var y0 := mini(int(floor(fy)), HEIGHT - 1)
	var z0 := mini(int(floor(fz)), GRID - 1)
	var tx := fx-x0
	var ty := fy-y0
	var tz := fz-z0
	var offset := channel * TOTAL
	var result := 0.0
	for dx in range(2):
		for dy in range(2):
			for dz in range(2):
				var weight := (tx if dx == 1 else 1.0-tx) * (ty if dy == 1 else 1.0-ty) * (tz if dz == 1 else 1.0-tz)
				result += weight * _source_fields[offset+_id(x0+dx,y0+dy,z0+dz)]
	return result

func _tissue_at(p: Vector3) -> int:
	if _channel_value(2,p) < 0.0:
		return 2 # pulp
	if _channel_value(1,p) < 0.0:
		return 1 # dentin
	if p.y < -0.17:
		return 3 # cementum
	if _channel_value(3,p) < 0.0:
		return 4 # caries
	return 0 # enamel

func _interpolate(a: int, b: int) -> Vector3:
	var va := _signed[a]
	var vb := _signed[b]
	var fraction := clampf(va / (va-vb) if absf(va-vb)>1.0e-12 else 0.5, 0.0, 1.0)
	return _points[a].lerp(_points[b],fraction)

func _append_triangle(p: Array, verts: Array, norms: Array) -> void:
	var a := Vector3(p[0].x,p[0].y,-p[0].z)
	var b := Vector3(p[1].x,p[1].y,-p[1].z)
	var c := Vector3(p[2].x,p[2].y,-p[2].z)
	var normal := (b-a).cross(c-a)
	if normal.length_squared() <= 1.0e-16:
		return
	normal = normal.normalized()
	var tissue := _tissue_at((p[0]+p[1]+p[2]) / 3.0)
	for vertex in [a,b,c]:
		verts[tissue].append(vertex)
		norms[tissue].append(normal)
	_triangle_count += 1

func _rebuild() -> void:
	_removed = 0
	_removed_pulp_samples = 0
	for idx in range(TOTAL):
		var p := _points[idx]
		var value := _source_fields[idx]
		for stroke in _strokes:
			for center in stroke["points"]:
				var distance: float = p.distance_to(center) - float(stroke["radius"])
				value = maxf(value, -distance)
		_signed[idx] = value
		if _source_fields[idx] < 0.0 and value >= 0.0:
			_removed += 1
			if _source_fields[2 * TOTAL + idx] < 0.0:
				_removed_pulp_samples += 1
	var vertices: Array = [[], [], [], [], []]
	var normals: Array = [[], [], [], [], []]
	_triangle_count = 0
	for i in range(GRID):
		for j in range(HEIGHT):
			for k in range(GRID):
				var cube := [
					_id(i,j,k),_id(i+1,j,k),_id(i+1,j+1,k),_id(i,j+1,k),
					_id(i,j,k+1),_id(i+1,j,k+1),_id(i+1,j+1,k+1),_id(i,j+1,k+1)
				]
				var low := INF
				var high := -INF
				for v in cube:
					low = minf(low, _signed[v])
					high = maxf(high, _signed[v])
				if low >= 0.0 or high <= 0.0:
					continue
				for tet in TETRA:
					var inside: Array = []
					var outside: Array = []
					for corner in tet:
						var id: int = cube[corner]
						if _signed[id] < 0.0:
							inside.append(id)
						else:
							outside.append(id)
					if inside.size() == 0 or inside.size() == 4:
						continue
					if inside.size() == 1:
						var a: int = inside[0]
						_append_triangle([_interpolate(a,outside[0]),_interpolate(a,outside[1]),_interpolate(a,outside[2])],vertices,normals)
					elif inside.size() == 3:
						var a: int = outside[0]
						_append_triangle([_interpolate(a,inside[0]),_interpolate(a,inside[1]),_interpolate(a,inside[2])],vertices,normals)
					else:
						var a: int = inside[0]
						var b: int = inside[1]
						var c: int = outside[0]
						var d: int = outside[1]
						var q := _interpolate(a,d)
						var r := _interpolate(b,c)
						_append_triangle([_interpolate(a,c),q,r],vertices,normals)
						_append_triangle([q,_interpolate(b,d),r],vertices,normals)
	var mesh := ArrayMesh.new()
	for t in range(TISSUES.size()):
		if vertices[t].is_empty():
			continue
		var surface: Array = []
		surface.resize(Mesh.ARRAY_MAX)
		surface[Mesh.ARRAY_VERTEX] = PackedVector3Array(vertices[t])
		surface[Mesh.ARRAY_NORMAL] = PackedVector3Array(normals[t])
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,surface)
		var material := StandardMaterial3D.new()
		material.albedo_color = PALETTE[t]
		material.roughness = 0.65
		material.cull_mode = BaseMaterial3D.CULL_DISABLED
		mesh.surface_set_material(mesh.get_surface_count()-1,material)
	if _mesh_instance != null:
		_mesh_instance.mesh = mesh

func ray_hit(world_origin: Vector3, world_direction: Vector3) -> Dictionary:
	# Use intersections with the ACTUAL current triangle surfaces, not
	# a sphere / schematic click target or another tooth's preview.
	# The mesh is displayed in local -Z while source grid uses +Z.
	if not world_origin.is_finite() or not world_direction.is_finite() or world_direction.length_squared()<0.5 or world_direction.length_squared()>1.5:
		return {"found":false}
	if not is_inside_tree() or _mesh_instance == null or _mesh_instance.mesh == null or not visible:
		return {"found":false}
	var origin := to_local(world_origin)
	var end := to_local(world_origin + world_direction.normalized()*50.0)
	var mesh: ArrayMesh = _mesh_instance.mesh as ArrayMesh
	var distance := INF
	var nearest := Vector3.ZERO
	for surface in range(mesh.get_surface_count()):
		var arrays: Array = mesh.surface_get_arrays(surface)
		var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
		for idx in range(0,vertices.size()-2,3):
			var intersection: Variant = Geometry3D.segment_intersects_triangle(
				origin,end,vertices[idx],vertices[idx+1],vertices[idx+2])
			if intersection is Vector3:
				var at: Vector3 = intersection
				var d := origin.distance_squared_to(at)
				if d < distance:
					nearest = at
					distance = d
	if not is_finite(distance):
		return {"found":false}
	var field := Vector3(nearest.x,nearest.y,-nearest.z)
	# Native editable volume bounds and original case-specific identity.
	if field.x < -1.15 or field.x > 1.15 or field.y < -1.5 or field.y > 1.3 or field.z < -1.0 or field.z > 1.0:
		return {"found":false}
	return {"found":true,"at":field,"distance":sqrt(distance),"fdi":_fdi,"caseId":_case_id}

func cut_to(p: Vector3, radius: float) -> bool:
	if not p.is_finite() or not is_finite(radius) or radius < 0.06 or radius > 0.35:
		return false
	if p.x < -1.15 or p.x > 1.15 or p.y < -1.5 or p.y > 1.3 or p.z < -1.0 or p.z > 1.0:
		return false
	if _strokes.size() >= MAX_STROKES:
		return false
	var points: Array = []
	if not _strokes.is_empty():
		var prev: Vector3 = _strokes.back()["at"]
		var distance := prev.distance_to(p)
		if distance <= 0.65:
			var steps := clampi(int(ceil(distance / 0.045)),1,12)
			for n in range(steps):
				points.append(prev.lerp(p,float(n+1)/steps))
	if points.is_empty():
		points.append(p)
	var earlier := _removed
	_strokes.append({"at":p,"radius":radius,"points":points})
	_rebuild()
	if _removed <= earlier:
		_strokes.pop_back()
		_rebuild()
		return false
	return true

func undo() -> bool:
	if _strokes.is_empty():
		return false
	_strokes.pop_back()
	_rebuild()
	return true

func reset() -> void:
	_strokes.clear()
	_rebuild()

func export_strokes() -> Array:
	var result: Array = []
	for stroke in _strokes:
		var v: Vector3 = stroke["at"]
		result.append({"at":[v.x,v.y,v.z],"radius":stroke["radius"]})
	return result

func restore_strokes(value: Variant) -> bool:
	if not (value is Array) or value.size() > MAX_STROKES:
		return false
	var incoming: Array = value
	_strokes.clear()
	_rebuild()
	for row in incoming:
		if not (row is Dictionary):
			reset()
			return false
		var a: Variant = row.get("at", [])
		if not (a is Array) or a.size()!=3:
			reset()
			return false
		var p := Vector3(float(a[0]),float(a[1]),float(a[2]))
		if not cut_to(p,float(row.get("radius",-1.0))):
			reset()
			return false
	return true

func summary() -> Dictionary:
	return {
		"fdi":_fdi,
		"caseId":_case_id,
		"strokes":_strokes.size(),
		"triangles":_triangle_count,
		"removedSamplePoints":_removed,
		"originalInsideSamplePoints":_initial_inside,
		"originalModelPulpSamplePoints":_original_pulp_samples,
		"removedModelPulpSamplePoints":_removed_pulp_samples,
		"syntheticPulpRegionContact":_removed_pulp_samples > 0,
		"modelPulpRemovedPercentApprox":100.0*_removed_pulp_samples/maxf(1.0,float(_original_pulp_samples)),
		"removedPercentApprox":100.0*_removed/maxf(1.0,float(_initial_inside)),
		"units":"synthetic sampling grid, not clinical millimeters"
	}
