extends RefCounted
## Read-only anatomy reference provenance: never implies clinical/volume validation.
## Source facts are derived from the original exported FDI case and practical tasks.
const CASE_FDI := {"molar":"16","endo":"36","anterior":"11","crown":"26","surgery":"48","perio":"46"}
const DUNDEE := "University of Dundee, School of Dentistry · CC BY 4.0"

static func sections(case_id: String, fdi: String, tasks: Array, model_loaded: bool, clearance: Dictionary = {}) -> Array[Dictionary]:
	if not CASE_FDI.has(case_id) or str(CASE_FDI[case_id]) != fdi:
		return []
	var external := ""
	match fdi:
		"36", "26":
			external = "SOURCE-VERIFIED EXTERNAL SURFACE — " + DUNDEE + (". Native GLB loaded." if model_loaded else ". Asset missing or invalid: labelled fallback; no real model loaded.")
		"16":
			external = "ILLUSTRATIVE EXTERNAL SURFACE — mirrored from source FDI 26, " + DUNDEE + (". Mirrored reference loaded." if model_loaded else ". Mirrored asset missing: labelled fallback.") + " NOT an independently verified FDI 16 right-side model."
		_:
			external = "NO CLEARED EXTERNAL SURFACE IN NATIVE BUILD — no candidate GLB bundled."
			if not clearance.is_empty():
				external += " Exact-side candidate: " + str(clearance.get("source","unverified")) + "; licence: " + str(clearance.get("license","unverified")) + ". Redistribution/derivative review pending."
	var names: Array[String] = []
	for task in tasks:
		if task is Dictionary and task.has("title"):
			names.append(str(task["title"]))
	var task_text := "; ".join(names) if names.size() > 0 else "No exported practical task titles available."
	return [
		{"id":"external","heading":"External morphology / model provenance","body":external},
		{"id":"internal","heading":"Internal structures / clinical anatomy","body":"No source-verified internal enamel, dentin, pulp, root-canal, periodontal, or nerve segmentation is supplied by these external surface GLBs. No patient-specific internal anatomy or clinically calibrated cutting volume is claimed."},
		{"id":"source","heading":"Source-supported facts / original practical","body":"Source case " + case_id + " · FDI " + fdi + ". Original exported practical task titles: " + task_text + ". These are exercise prompts, not anatomical measurements or clinical findings."},
		{"id":"synthetic","heading":"Illustrative and synthetic educational content","body":"The editable training tooth is separately generated, synthetic sampled geometry; bur changes and checklist self-reports are formative only, not calibrated treatment, source-verified internal anatomy, or clinical certification."}
	]
