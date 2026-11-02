extends RefCounted
## Descriptive reference clearance registry, not an anatomical/clinical validation.
## Source URLs are metadata, never downloaded by native code.
const STATUS := {
 "11":{"caseId":"anterior","status":"not-cleared","source":"OPEN DENTISTRY / UFSC (ID 11a)","license":"CC BY-NC-SA (per source listing)","url":"https://sketchfab.com/3d-models/dente-11-upper-right-central-incisor-id-11a-63be208b66214c5d9afb647bdaa8a81e","reason":"Exact-side candidate; NonCommercial/ShareAlike redistribution review pending; no imported mesh"},
 "48":{"caseId":"surgery","status":"not-cleared","source":"OPEN DENTISTRY / UFSC (ID 48a)","license":"CC BY-NC-SA (per source listing)","url":"https://sketchfab.com/3d-models/dente-48-lower-right-third-molar-id-48a-6ab34e265b73467a94be29b3887a1c64","reason":"Exact-side candidate; NonCommercial/ShareAlike redistribution review pending; no imported mesh"},
 "46":{"caseId":"perio","status":"not-cleared","source":"OPEN DENTISTRY / UFSC (ID 46c)","license":"CC BY-NC-SA (per source listing)","url":"https://sketchfab.com/3d-models/dente-46-lower-right-first-molar-id-46c-79ea3b60a12441c3acb11b204bc21bea","reason":"Exact-side candidate; NonCommercial/ShareAlike redistribution review pending; no imported mesh"}
}

static func status_for(fdi: String) -> Dictionary:
 if not STATUS.has(fdi):
  return {}
 return (STATUS[fdi] as Dictionary).duplicate(true)

static func disclosure(fdi: String) -> String:
 var meta: Dictionary = status_for(fdi)
 if meta.is_empty():
  return ""
 return "FDI %s external surface reference unavailable in native build. %s; %s. %s. SOURCE: %s. Synthetic editable training geometry is separate and NOT clinically validated." % [fdi,str(meta["source"]),str(meta["license"]),str(meta["reason"]),str(meta["url"])]
