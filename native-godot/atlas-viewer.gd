extends Node3D
## Source-derived schematic permanent tooth atlas: all 32 FDI identities.
## Each mesh comes from production ToothSolid/VoxelMesher, NOT external scans.
## Lazy-load SHA256 checked binary at selected native Godot 3D viewpoint.
const MANIFEST := "res://source/atlas/atlas.json"
const ROOT := "res://source/atlas/"
const COLORS := [
	Color(0.94,0.90,0.80),Color(0.86,0.65,0.42),
	Color(0.72,0.30,0.38),Color(0.62,0.51,0.43),
	Color(0.40,0.27,0.27)
]
const TISSUES := ["enamel","dentin","pulp","cementum","caries"]
var _catalog: Dictionary = {}
var _mesh_instance: MeshInstance3D
var _camera: Camera3D
var _selected := ""
var _error := ""
var _last_count := 0

func configure(expected_sha: String) -> bool:
	var data: Variant = JSON.parse_string(FileAccess.get_file_as_string(MANIFEST))
	if not (data is Dictionary):
		_error = "Missing source 32-tooth manifest"
		return false
	var m: Dictionary = data
	if str(m.get("sourceGitSHA",""))!=expected_sha or str(m.get("kind",""))!="SOURCE_PROCEDURAL_SYNTHETIC_32_TOOTH_ATLAS_NOT_CLINICAL":
		_error = "Atlas production revision mismatch"
		return false
	if int(m.get("resolution",0))!=16 or m.get("originalScan",true)!=false or m.get("clinicalAnatomyValidated",true)!=false:
		_error = "Unexpected atlas provenance / clinical claims"
		return false
	if m.get("tissueNames",[])!=TISSUES:
		_error = "Tissue palette parity mismatch"
		return false
	_catalog = m.get("teeth",{})
	if _catalog.size()!=32:
		_error = "Expected 32 permanent source FDI identities"
		return false
	for q in range(1,5):
		for n in range(1,9):
			if not _catalog.has(str(q)+str(n)):
				_error = "Missing source FDI " + str(q)+str(n)
				return false
	_mesh_instance=MeshInstance3D.new()
	_mesh_instance.name="KL_SOURCE_PROCEDURAL_ATLAS_TOOTH"
	add_child(_mesh_instance)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees=Vector3(-35,22,-15)
	sun.light_energy=1.5
	add_child(sun)
	_camera=Camera3D.new()
	_camera.name="KL_NATIVE_ATLAS_CAMERA"
	_camera.position=Vector3(0.0,1.4,9.5)
	_camera.fov=44.0
	add_child(_camera)
	_camera.look_at(Vector3(0,0,0))
	_camera.current=false
	name="KL_NATIVE_32_TOOTH_ATLAS"
	return select_tooth("16")

func error() -> String:
	return _error

func selected() -> String:
	return _selected

func triangle_count() -> int:
	return _last_count

func set_camera_enabled(active: bool) -> void:
	if _camera != null:
		_camera.current=active

func select_tooth(fdi: String) -> bool:
	if not _catalog.has(fdi):
		_error="Unknown FDI identity "+fdi
		return false
	var item: Dictionary=_catalog[fdi]
	if str(item.get("fdi",""))!=fdi:
		_error="Tooth identity mismatch"
		return false
	var path := ROOT + str(item.get("file",""))
	if not FileAccess.file_exists(path) or FileAccess.get_sha256(path)!=str(item.get("sha256","")):
		_error="Source atlas hash mismatch FDI "+fdi
		return false
	var file:=FileAccess.open(path,FileAccess.READ)
	if file==null:
		_error="Could not read FDI "+fdi
		return false
	file.big_endian=false
	if file.get_length()<4:
		_error="Source atlas binary truncated"
		return false
	var count:=int(file.get_32())
	if count<100 or count>30000 or count!=int(item.get("triangles",-1)) or file.get_length()!=4+count*37:
		_error="Source atlas triangle/binary length mismatch"
		return false
	var vertex_buckets: Array=[[],[],[],[],[]]
	var normal_buckets: Array=[[],[],[],[],[]]
	var counts: Array=[0,0,0,0,0]
	for face in range(count):
		var tissue:=int(file.get_8())
		if tissue<0 or tissue>=5:
			_error="Invalid source atlas material"
			return false
		var tri: Array=[]
		for v in range(3):
			var x:=file.get_float()
			var y:=file.get_float()
			var z:=file.get_float()
			var p:=Vector3(x,y,-z)
			if not p.is_finite() or p.length()>6.0:
				_error="Invalid source atlas coordinates"
				return false
			tri.append(p)
		var normal: Vector3=(tri[1]-tri[0]).cross(tri[2]-tri[0])
		if normal.length_squared()<1.0e-18:
			_error="Degenerate atlas source triangle"
			return false
		normal=normal.normalized()
		for point in tri:
			vertex_buckets[tissue].append(point)
			normal_buckets[tissue].append(normal)
		counts[tissue]+=1
	for t in range(5):
		if counts[t]!=int(item["materials"].get(TISSUES[t],0)):
			_error="Original tissue face-count parity mismatch FDI "+fdi
			return false
	var mesh:=ArrayMesh.new()
	for t in range(5):
		if vertex_buckets[t].is_empty():
			continue
		var surface: Array=[]
		surface.resize(Mesh.ARRAY_MAX)
		surface[Mesh.ARRAY_VERTEX]=PackedVector3Array(vertex_buckets[t])
		surface[Mesh.ARRAY_NORMAL]=PackedVector3Array(normal_buckets[t])
		mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,surface)
		var material:=StandardMaterial3D.new()
		material.albedo_color=COLORS[t]
		material.cull_mode=BaseMaterial3D.CULL_DISABLED
		material.roughness=0.64
		mesh.surface_set_material(mesh.get_surface_count()-1,material)
	if _mesh_instance==null or mesh.get_surface_count()==0:
		_error="No native atlas mesh surfaces"
		return false
	_mesh_instance.mesh=mesh
	_selected=fdi
	_last_count=count
	return true
