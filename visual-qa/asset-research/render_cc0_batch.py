#!/usr/bin/env python3
"""HEADLESS real Blender glTF import + two original preview PNGs per CC0 candidate.
This script only evaluates scene meshes. It never edits source GLB files."""
import bpy
import sys
import json
import pathlib
import hashlib
import math
from mathutils import Vector

def args_after_separator():
    if "--" not in sys.argv:raise RuntimeError("Missing Blender -- args")
    argv=sys.argv[sys.argv.index("--")+1:]
    if len(argv)!=5 or argv[0]!="--input" or argv[2]!="--output" or argv[4] not in ("instrument-tray","whole-clinic-starter"):
        raise RuntimeError("Expected --input PATH --output PATH <allowlisted id>")
    return pathlib.Path(argv[1]).resolve(),pathlib.Path(argv[3]).resolve(),argv[4]

def sha(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for data in iter(lambda:f.read(1024*1024),b""):h.update(data)
    return h.hexdigest()

def look_at(obj,point):
    vec=Vector(point)-obj.location
    obj.rotation_euler=vec.to_track_quat("-Z","Y").to_euler()

def area_light(name,location,power,size):
    light=bpy.data.lights.new(name,"AREA")
    light.energy=power;light.shape="DISK";light.size=size
    object=bpy.data.objects.new(name,light)
    bpy.context.collection.objects.link(object)
    object.location=location
    look_at(object,(0,0,0))
    return object

def main():
    glb,out,id=args_after_separator()
    if not glb.is_file() or glb.suffix.lower()!=".glb":raise RuntimeError("Original pinned GLB missing")
    if out.exists():raise RuntimeError("Never overwrite a prior Blender preview evidence folder")
    out.mkdir(parents=True)
    original_hash=sha(glb)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb),loglevel=40)
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    if not meshes:raise RuntimeError("Native Blender glTF import produced no meshes")
    bpy.context.view_layer.update()
    positions=[o.matrix_world@Vector(x) for o in meshes for x in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in positions) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in positions) for i in range(3)))
    dims=hi-lo
    diameter=max(dims)
    if diameter<1e-4 or diameter>1000:raise RuntimeError("Unusable imported world bounding box")
    center=(hi+lo)*0.5
    num_faces=sum(sum(1 for p in o.data.polygons) for o in meshes)
    num_verts=sum(len(o.data.vertices) for o in meshes)
    triangles=sum(sum(max(0,len(poly.vertices)-2) for poly in o.data.polygons) for o in meshes)
    if triangles<50 or triangles>2000000:raise RuntimeError("Unreasonable original mesh polygon count")
    if id=="instrument-tray" and triangles>100000:
        raise RuntimeError("Instrument tray source exceeds declared small-prop complexity")
    if id=="whole-clinic-starter" and triangles<5000:
        raise RuntimeError("Clinic render has implausibly few triangles")
    # Geometry is left in its exact imported world position/scale. Add only lights,
    # backdrop and cameras. The separate Blender report distinguishes display props.
    world=bpy.data.worlds.new("KlinikLab neutral review backdrop")
    bpy.context.scene.world=world
    world.use_nodes=True
    background=world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value=(0.21,0.235,0.27,1)
    background.inputs["Strength"].default_value=0.9
    scale=max(diameter,0.1)
    area_light("Review key",center+Vector((scale*0.8,-scale*1.15,scale*1.7)),max(180,350*diameter*diameter),scale)
    area_light("Review fill",center+Vector((-scale*1.2,scale*0.6,scale*0.9)),max(100,200*diameter*diameter),scale)
    area_light("Review rim",center+Vector((scale*0.2,scale*0.9,scale*1.3)),max(100,240*diameter*diameter),scale)
    cam_data=bpy.data.cameras.new("Source candidate inspection")
    camera=bpy.data.objects.new("Source candidate inspection",cam_data)
    bpy.context.collection.objects.link(camera)
    bpy.context.scene.camera=camera
    cam_data.type="ORTHO"
    cam_data.ortho_scale=diameter*1.65
    scene=bpy.context.scene
    scene.render.resolution_x=1200
    scene.render.resolution_y=800
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=False
    try:scene.render.engine="BLENDER_EEVEE_NEXT"
    except Exception:
        try:scene.render.engine="BLENDER_EEVEE"
        except Exception:
            scene.render.engine="CYCLES"
            scene.cycles.samples=16
    if scene.render.engine in ("BLENDER_EEVEE","BLENDER_EEVEE_NEXT"):
        try:scene.eevee.taa_render_samples=48
        except Exception:pass
    scene.render.image_settings.color_depth="8"
    scene.view_settings.view_transform="Standard"
    scene.camera.data.lens=40
    images=[]
    for label,offset in (
        ("overview",(0.9,-1.1,0.8)),
        ("angled",(-0.85,-0.75,1.1))
    ):
        camera.location=center+Vector(offset)*max(diameter,0.3)*1.65
        look_at(camera,center)
        outpath=out/(id+"-"+label+".png")
        scene.render.filepath=str(outpath)
        bpy.ops.render.render(write_still=True)
        if not outpath.exists() or outpath.stat().st_size<25000:
            raise RuntimeError("Real Blender image absent or implausibly small "+str(outpath))
        images.append({"filename":outpath.name,"sha256":sha(outpath),
                       "bytes":outpath.stat().st_size,"view":label,
                       "width":1200,"height":800})
    report={"candidateId":id,"nativeBlenderVersion":bpy.app.version_string,
      "sourceOriginalFilename":glb.name,"sourceOriginalSha256":original_hash,
      "importedMeshObjectCount":len(meshes),"objectNames":[o.name for o in meshes][:80],
      "importedVertexCount":num_verts,"importedFaceCount":num_faces,
      "importedTriangleCount":triangles,
      "sourceWorldBoundsXYZMeters":[float(round(x,6)) for x in dims],
      "sourceBoundsCenter":[float(round(x,6)) for x in center],
      "nativePreviewImages":images,
      "sceneGeometryModified":False,"fdIValidated":False,
      "independentlyReviewedPixels":False,"clinicalAccepted":False,
      "assetVisualStatus":"RENDERED_AWAITING_DIRECT_PIXEL_INSPECTION",
      "possibleIssues":["Synthetic/AI-assisted schematic geometry; inspect actual pixels",
                        "Dimensions, dental ergonomics and functional tool mechanism unverified"],
      "license":"CC0-1.0"}
    (out/"blender-inspection.json").write_text(json.dumps(report,indent=2)+"\n")
    print("BLENDER_NATIVE_ASSET_RENDERED "+json.dumps({
        "candidateId":id,"triangles":triangles,
        "images":[x["filename"] for x in images],"originalSha256":original_hash}))
if __name__=="__main__":main()
