#!/usr/bin/env python3
"""Place only already independently reviewed, byte-pinned CC0 original source assets.
No license ambiguity, no site scraping, no model modifications or clinical approval."""
import argparse
import hashlib
import json
import pathlib

def digest(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for p in iter(lambda:f.read(1024*1024),b""):h.update(p)
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",required=True)
    ap.add_argument("--destination",required=True)
    ap.add_argument("--review-manifest",required=True)
    args=ap.parse_args()
    src=pathlib.Path(args.source)
    dest=pathlib.Path(args.destination)
    m=json.loads(pathlib.Path(args.review_manifest).read_text(encoding="utf-8"))
    att=json.loads((src/"source-attestation.json").read_text(encoding="utf-8"))
    assert m["status"]=="REVIEWED_CC0_STATIC_VISUAL_PROTOTYPES_ONLY"
    assert m["licenseSPDX"]=="CC0-1.0" and att["license"]=="CC0-1.0"
    assert m["review"]["originalPreviewSourceCodeSha"]=="e99cea92c7903894c4364d69577c0be4c1c87692"
    assert m["review"]["githubRunId"]==41292878372 and m["review"]["clinicalAccepted"] is False
    if [x["candidateId"] for x in m["files"]]!=["instrument-tray","whole-clinic-starter"]:
        raise RuntimeError("Strict reviewed CC0 candidate allowlist changed")
    if dest.resolve().name!="3dassets-dental":
        raise RuntimeError("Expected an isolated assets/cc0/3dassets-dental source folder")
    if len(att["assets"])!=len(m["files"]):
        raise RuntimeError("Source downloader inventory changed")
    report=[]
    for item in m["files"]:
        if item["licenseAccepted"] is not True or not item["visualStatus"].startswith("ACCEPT_") or item["clinicalStatus"]!="NOT_VALIDATED" or item["fdiSuitability"]!="NOT_APPLICABLE":
            raise RuntimeError("CC0 personal-use visual candidate not independently accepted or clinical gate changed")
        original=next(x for x in att["assets"] if x["id"]==item["candidateId"])
        if (item["sourceUrl"]!=original["originalUrl"] or
            item["sha256"]!=original["originalSha256"] or
            item["bytes"]!=original["bytes"] or
            item["sourceVersion"]!=original["sourceVersion"] or
            item["destFilename"] not in ("instrument-tray-v1.glb","whole-clinic-starter-v1.glb")):
            raise RuntimeError("Exact original source SHA/version/size mismatch")
        source=src/original["originalGlbFilename"]
        target=dest/item["destFilename"]
        if target.exists():raise RuntimeError("Refusing to replace source binary candidate: "+target.name)
        if digest(source)!=item["sha256"]:raise RuntimeError("Original CC0 GLB SHA256 mismatch")
        with target.open("xb") as f:f.write(source.read_bytes())
        if target.stat().st_size!=item["bytes"] or digest(target)!=item["sha256"]:
            raise RuntimeError("Published exact binary changed")
        report.append({"filename":target.name,"sha256":item["sha256"],"bytes":item["bytes"],
                       "status":item["visualStatus"],"clinicalAccepted":False})
    print("CC0_REVIEWED_ORIGINAL_BINARIES_PUBLISHED_NO_TRANSFORM "+json.dumps(report))
if __name__=="__main__":main()
