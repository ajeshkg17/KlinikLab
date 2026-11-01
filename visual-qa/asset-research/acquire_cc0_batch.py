#!/usr/bin/env python3
"""Acquires ONLY the two pinned upstream CC0 files; no search, auth or HTML scraping.
Original bytes and sha256 remain in the job's private artifact until reviewed."""
import argparse
import hashlib
import json
import pathlib
import ssl
import struct
import urllib.parse
import urllib.request

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",required=True)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    m=json.loads(pathlib.Path(a.manifest).read_text(encoding="utf-8"))
    assert m["schemaVersion"]==1 and m["license"]=="CC0-1.0" and m["publishOriginalBinary"] is False
    expected={
      "instrument-tray":"https://cdn.3dassets.dev/assets/34383/v1/model.glb",
      "whole-clinic-starter":"https://cdn.3dassets.dev/assets/34423/v1/model.glb"
    }
    if {i["id"]:i["sourceUrl"] for i in m["items"]}!=expected:
        raise RuntimeError("SOURCE_ALLOWLIST_CHANGED: refuse unreviewed download")
    out=pathlib.Path(a.out).resolve()
    out.mkdir(parents=True,exist_ok=False)
    report={"schemaVersion":1,"batchId":m["batchId"],"license":"CC0-1.0",
      "publisher":m["publisher"],"publisherLicenseTerms":m["publisherLicenseTerms"],
      "sourcePack":m["sourcePack"],"sourceVersion":"v1 immutable CDN paths",
      "acquisitionStatus":"DOWNLOADED_SOURCE_NOT_YET_VISUALLY_REVIEWED",
      "assets":[],"clinicalAccepted":False,"visualAccepted":False,"licenseTermsChecked":True}
    context=ssl.create_default_context()
    for item in m["items"]:
        u=urllib.parse.urlparse(item["sourceUrl"])
        if (u.scheme,u.netloc)!=("https","cdn.3dassets.dev") or not u.path.endswith("/v1/model.glb"):
            raise RuntimeError("Unapproved source host or version "+item["id"])
        req=urllib.request.Request(item["sourceUrl"],headers={
            "User-Agent":"KlinikLab-CC0-asset-evaluation/1.0",
            "Accept":"model/gltf-binary,application/octet-stream,*/*"})
        with urllib.request.urlopen(req,timeout=60,context=context) as resp:
            fin=urllib.parse.urlparse(resp.geturl())
            if (fin.scheme,fin.netloc)!=("https","cdn.3dassets.dev"):
                raise RuntimeError("Unexpected download redirect outside licensed publisher: "+resp.geturl())
            chunks=[];count=0
            while True:
                part=resp.read(65536)
                if not part:break
                count+=len(part)
                if count>item["maxBytes"]:raise RuntimeError("Unapproved oversized binary "+item["id"])
                chunks.append(part)
        data=b"".join(chunks)
        if len(data)<128 or data[:4]!=b"glTF" or struct.unpack_from("<II",data,4)!=(2,len(data)):
            raise RuntimeError("Downloaded asset is not a complete binary glTF 2.0 file: "+item["id"])
        # Prevent rendering a file with missing chunks or malformed container.
        offset=12
        found_json=False
        while offset<len(data):
            if offset+8>len(data):raise RuntimeError("Truncated GLB chunk header")
            clen,typ=struct.unpack_from("<II",data,offset)
            offset+=8
            if clen<=0 or offset+clen>len(data):raise RuntimeError("Invalid glTF chunk length")
            if typ==0x4e4f534a:
                try:
                    j=json.loads(data[offset:offset+clen].rstrip(b" \x00").decode("utf-8"))
                except Exception as e:raise RuntimeError("Malformed embedded glTF JSON") from e
                if j.get("asset",{}).get("version")!="2.0":
                    raise RuntimeError("Unexpected glTF JSON version")
                found_json=True
            offset+=clen
        if not found_json or offset!=len(data):raise RuntimeError("No valid glTF JSON chunk")
        dst=out/(item["id"]+".glb")
        with dst.open("xb") as f:f.write(data)
        digest=hashlib.sha256(data).hexdigest()
        report["assets"].append({
           "id":item["id"],"sourcePage":item["sourcePage"],
           "originalUrl":item["sourceUrl"],"actualFinalUrl":resp.geturl(),
           "sourceVersion":item["version"],"creator":m["creator"],
           "license":"CC0-1.0","licenseDeed":m["licenseDeed"],
           "bytes":len(data),"originalSha256":digest,
           "originalGlbFilename":dst.name,"trianglesClaimedByPublisher":item["claimedTriangles"],
           "claimNotIndependentlyVerified":True,"visualAccepted":False,"clinicalAccepted":False,
           "publicBinaryUploaded":False})
    (out/"source-attestation.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("CC0_ORIGINAL_DOWNLOADS_VERIFIED "+json.dumps([
        {"id":x["id"],"sha256":x["originalSha256"],"bytes":x["bytes"]} for x in report["assets"]]))
if __name__=="__main__":main()
