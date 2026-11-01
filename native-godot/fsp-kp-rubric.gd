extends RefCounted
## Native port of the ORIGINAL browser FSP/KP 5-criterion lexical checker.
## Four original fictional cases, four exercises per case, 5 source checks.
## Keyword coverage is NOT grammatical, communicative or clinical competence.

const INDEX := "res://source/fsp-kp.json"
const CASE_IDS := ["perio","restoration","endo","surgery"]
const PHASE_IDS := ["anamnese","aufklaerung","brief","kollegen"]
const FDIs := {"perio":"46","restoration":"16","endo":"36","surgery":"48"}
const METHOD := "Original formative German keyword coverage ONLY. No grammar, fluency, negation reasoning, patient safety/clinical correctness or official FSP/KP grade."

var _source: Dictionary = {}
var _error := ""

func error() -> String:
	return _error

func configure(expected_sha: String) -> bool:
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(INDEX))
	if not (parsed is Dictionary):
		_error = "Original FSP/KP source file unavailable"
		return false
	var d: Dictionary = parsed
	if str(d.get("sourceGitSHA","")) != expected_sha or str(d.get("kind","")) != "BOUNDED_ORIGINAL_FSP_KP_FORMATIVE_LEXICAL_TRAINING_NOT_CLINICAL_ASSESSMENT" or int(d.get("schemaVersion",0)) != 1:
		_error = "Original FSP source commit or schema mismatch"
		return false
	if d.get("clinicalReviewPending",false) != true or d.get("certifiedLanguageExam",true) != false:
		_error = "FSP/KP clinical validation flag unexpectedly changed"
		return false
	if d.get("caseOrder",[]) != CASE_IDS or d.get("phaseOrder",[]) != PHASE_IDS:
		_error = "Original FSP/KP case or exercise order drift"
		return false
	var cases: Dictionary = d.get("cases",{})
	var phases: Array = d.get("phases",[])
	if cases.size()!=4 or phases.size()!=4 or str(d.get("sourceSHA256","")).length()!=64:
		_error = "Incomplete exact-source FSP case/phase contract"
		return false
	for id in CASE_IDS:
		var c: Dictionary = cases.get(id,{})
		if str(c.get("fdi","")) != str(FDIs[id]) or str(c.get("id","")) != id:
			_error = "FDI/source language case identity mismatch " + id
			return false
		var tasks: Dictionary = c.get("tasks",{})
		if tasks.size()!=4:
			_error = "Missing source language prompts for " + id
			return false
		for phase in PHASE_IDS:
			var task: Dictionary = tasks.get(phase,{})
			var checks: Array = task.get("checks",[])
			if checks.size()!=5:
				_error = "Source lexical rubric has no five-criterion contract"
				return false
			for check in checks:
				if not (check is Dictionary) or str(check.get("pattern","")).length()>200:
					_error = "Unsafe source lexical criterion"
					return false
				if _compile(str(check.get("pattern",""))) == null:
					_error = "Native regex cannot parse source criterion: " + id+"/"+phase
					return false
	_source = d
	return true

func _compile(pattern: String) -> RegEx:
	var re := RegEx.new()
	if re.compile("(?i)" + pattern) != OK:
		return null
	return re

func case_ids() -> Array:
	return CASE_IDS.duplicate()

func phase_ids() -> Array:
	return PHASE_IDS.duplicate()

func case_data(id: String) -> Dictionary:
	var cases: Dictionary = _source.get("cases",{})
	if not cases.has(id):
		return {}
	return cases[id]

func phase_data(id: String, phase: String) -> Dictionary:
	var data := case_data(id)
	if data.is_empty() or not PHASE_IDS.has(phase):
		return {}
	return (data["tasks"] as Dictionary).get(phase,{})

func _matches(pattern: String, value: String) -> bool:
	var re := _compile(pattern)
	return re != null and re.search(value) != null

func _safety_review(value: String) -> Array:
	var flags: Array = []
	var split := RegEx.new()
	split.compile("[.!?;\\n]+")
	var clauses := split.sub(value.to_lower(), "|", true).split("|")
	for clause in clauses:
		if _matches("\\b(?:antibiotika\\s+sind\\s+(?:immer|grundsätzlich|routinemäßig)\\s+(?:notwendig|erforderlich|indiziert)|(?:immer|routinemäßig|grundsätzlich)\\s+antibiotika\\s+(?:geben|verordnen|verschreiben)|antibiotika\\s+bei\\s+jeder\\s+perikoronitis)\\b",clause) and not _matches("\\b(?:nicht|keine|niemals)\\s+(?:immer|grundsätzlich|routinemäßig)\\b",clause):
			var msg := "Pauschale Antibiotikagabe ohne fallbezogene Indikation ist nicht gerechtfertigt. Bitte fachlich prüfen."
			if not flags.has(msg):
				flags.append(msg)
		if _matches("\\b(?:atemnot|schluckbeschwerden|dysphagie)\\b.{0,65}\\b(?:abwarten|zu\\s+hause\\s+bleiben|keine\\s+hilfe\\s+holen)\\b",clause) and not _matches("\\b(?:nicht|niemals|keinesfalls)\\s+abwarten\\b",clause):
			var msg := "Atem- oder relevante Schluckprobleme dürfen nicht mit Abwarten bagatellisiert werden. Bitte dringend fachlich prüfen."
			if not flags.has(msg):
				flags.append(msg)
	return flags

func score(case_id: String, phase_id: String, answer: String) -> Dictionary:
	var task := phase_data(case_id,phase_id)
	if task.is_empty() or answer.length()>6000:
		return {"invalid":true,"caseId":case_id,"phaseId":phase_id}
	var trimmed := answer.strip_edges()
	var checks: Array = task["checks"]
	var matched := 0
	var results: Array = []
	for check in checks:
		var hit: bool = not trimmed.is_empty() and _matches(str(check["pattern"]),trimmed)
		if hit:
			matched += 1
		results.append({"label":check["label"],"tip":check["tip"],"matched":hit})
	var flags := _safety_review(trimmed)
	return {"caseId":case_id,"phaseId":phase_id,
		"lexicalScore":matched*2,"score":matched*2 if flags.is_empty() else null,
		"max":10,"blank":trimmed.is_empty(),"flags":flags,"criteria":results,
		"method":METHOD,"invalid":false}
