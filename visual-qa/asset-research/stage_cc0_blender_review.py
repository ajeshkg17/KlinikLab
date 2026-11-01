#!/usr/bin/env python3
"""Fail-closed publication staging of ORIGINAL CC0 Blender previews; never .glb.
Run on a detached visual-feedback worktree at a unique never-used directory."""
import argparse
import hashlib
import json
import pathlib
import shutil
import struct

def digest(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for chunk in iter(lambda:f.read(1048576),b""):h.update(chunk)
    return h.hexdigest()

def main():
    p=argparse.ArgumentParser()
    for x in ["--batch","--source","--renders","--target","--source-code-sha","--workflow-run"]:
        p.add_argument(x,required=True)
    args=p.parse_args()
    batch=json.loads(pathlib.Path(args.batch).read_text())
    sr=json.loads((pathlib.Path(args.source)/"source-attestation.json").read_text())
    assert batch["license"]=="CC0-1.0" and batch["publishDerivedPreview"] is True
    assert batch["publishOriginalBinary"] is False and len(batch["items"])==2
    assert sr["license"]=="CC0-1.0" and len(sr["assets"])==2
    for expected,actual in zip(batch["items"],sr["assets"]):
        if expected["id"]!=actual["id"] or expected["sourceUrl"]!=actual["originalUrl"]:
            raise RuntimeError("Downloaded source identity does not match allowlisted immutable CC0 item")
        source=pathlib.Path(args.source)/actual["originalGlbFilename"]
        if digest(source)!=actual["originalSha256"]:
            raise RuntimeError("Original CC0 source GLB hash mismatch")
    target=pathlib.Path(args.target)
    if target.exists():raise RuntimeError("Immutable review path already exists; never overwrite")
    target.mkdir(parents=True)
    result={"schemaVersion":1,"status":"NATIVE_BLENDER_PREVIEWS_PENDING_ASSISTANT_PIXEL_REVIEW",
      "workflowRun":args.workflow_run,"exactSourceCodeSHA":args.source_code_sha,
      "publisher":batch["publisher"],"license":"CC0-1.0",
      "licenseDeed":batch["licenseDeed"],"sourcePack":batch["sourcePack"],
      "visualAccepted":False,"clinicalAccepted":False,"binaryModelsPublished":False,
      "items":[]}
    readme=["# Original native Blender previews — CC0 dental prop and clinic batch","",
      "Batch: `"+batch["batchId"]+"`. Runner GitHub SHA: `"+args.source_code_sha+"`.",
      "Source: "+batch["sourcePack"]+"; licensing: [CC0 1.0]("+batch["licenseDeed"]+").",
      "Creator: "+batch["creator"]+". Model files were downloaded only from the pinned official CDN.",
      "**No .glb model binaries were committed.** Real Blender-generated original PNGs only.",
      "Visual acceptance: **pending independent direct pixel review**. Clinical acceptance: **NO**.",
      "This is a clinic scene/prop candidate review, **not** migration of full KlinikLab or a calibrated dental simulation.",""]
    for item in batch["items"]:
        details=json.loads((pathlib.Path(args.renders)/item["id"]/"blender-inspection.json").read_text())
        source=next(x for x in sr["assets"] if x["id"]==item["id"])
        if details["sourceOriginalSha256"]!=source["originalSha256"] or details["candidateId"]!=item["id"]:
            raise RuntimeError("Blender preview not from original source GLB")
        if not details["nativeBlenderVersion"] or details["importedTriangleCount"]<50 or len(details["nativePreviewImages"])!=2:
            raise RuntimeError("Missing native Blender geometry or two images")
        images=[]
        for png in details["nativePreviewImages"]:
            src=pathlib.Path(args.renders)/item["id"]/png["filename"]
            data=src.read_bytes()
            if data[:8]!=b"\x89PNG\r\n\x1a\n" or len(data)<25000:
                raise RuntimeError("Invalid actual PNG preview bytes")
            if struct.unpack_from(">II",data,16)!=(1200,800):
                raise RuntimeError("Native Blender preview dimensions incorrect")
            if digest(src)!=png["sha256"]:
                raise RuntimeError("Original native Blender self-reported PNG SHA256 mismatch")
            dst=target/png["filename"]
            with dst.open("xb") as out:out.write(data)
            if digest(dst)!=png["sha256"]:
                raise RuntimeError("PNG modified during publication staging")
            images.append({"filename":dst.name,"sha256":png["sha256"],"bytes":len(data)})
        details_dst=target/(item["id"]+"-blender-inspection.json")
        details_dst.write_text(json.dumps(details,indent=2)+"\n")
        result["items"].append({
          "candidateId":item["id"],"title":item["title"],"sourcePage":item["sourcePage"],
          "sourceOriginalUrl":item["sourceUrl"],"version":item["version"],
          "originalSha256":source["originalSha256"],"originalBytes":source["bytes"],
          "blenderVersion":details["nativeBlenderVersion"],
          "importedMeshCount":details["importedMeshObjectCount"],
          "importedTriangles":details["importedTriangleCount"],
          "originalPreviews":images,"fdIValidated":False,
          "visualAccepted":False,"clinicalAccepted":False})
        readme.extend(["## "+item["title"],"",
          "Source: "+item["sourcePage"]+"; immutable binary version: "+item["version"]+".",
          "Original binary SHA-256: `"+source["originalSha256"]+"`.",
          "Native Blender: "+details["nativeBlenderVersion"]+
          "; meshes: "+str(details["importedMeshObjectCount"])+
          "; triangles: "+str(details["importedTriangleCount"])+".",
          "No FDI applicability, clinical mechanism accuracy, or visual review has been verified.",""])
        for im in images:readme.extend(["![Real Blender preview "+im["filename"]+"](./"+im["filename"]+")",""])
    (target/"asset-batch-evidence.json").write_text(json.dumps(result,indent=2)+"\n")
    (target/"README.md").write_text("\n".join(readme)+"\n")
    print("NATIVE_CC0_BLENDER_PREVIEWS_STAGED_PENDING_PIXEL_REVIEW "+str(target))
if __name__=="__main__":main()
