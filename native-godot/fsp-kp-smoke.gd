extends SceneTree
## Verifies native FSP/KP against 68 score outputs computed by the ORIGINAL
## source scorer from fsp-kp-training.js at exact Git SHA. Headless only.

func _initialize() -> void:
	call_deferred("_run")

func _fail(reason: String) -> void:
	push_error("SR11_SOURCE_FSP_KP_PARITY_FAILED " + reason)
	quit(1)

func _run() -> void:
	var sha := FileAccess.get_file_as_string("res://source/expected-sha.txt").strip_edges()
	var source: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://source/fsp-kp.json"))
	if not (source is Dictionary):
		_fail("FSP/KP original source manifest absent")
		return
	var manifest: Dictionary = source
	var language_script: GDScript = load("res://fsp-kp-rubric.gd")
	if language_script == null:
		_fail("Native language scorer not loadable")
		return
	var scorer: RefCounted = language_script.new()
	if not bool(scorer.call("configure",sha)):
		_fail("Source language catalog rejected: "+str(scorer.call("error")))
		return
	var cases: Array = scorer.call("case_ids")
	var phases: Array = scorer.call("phase_ids")
	if cases.size()!=4 or phases.size()!=4 or cases != ["perio","restoration","endo","surgery"] or phases != ["anamnese","aufklaerung","brief","kollegen"]:
		_fail("Source four-case, four-phase identity/order mismatch")
		return
	var probes: Array = manifest.get("parityProbes",[])
	if probes.size()!=68:
		_fail("Missing original JS scorer reference probes")
		return
	for i in range(probes.size()):
		var reference: Dictionary = probes[i]
		var result: Dictionary = scorer.call("score",str(reference["caseId"]),str(reference["phase"]),str(reference["answer"]))
		if bool(result.get("invalid",true)) or int(result.get("lexicalScore",-1)) != int(reference["lexicalScore"]) or bool(result.get("blank",false)) != bool(reference["blank"]):
			_fail("Original JS lexical score parity drift in source probe "+str(i)+" "+str(reference["caseId"])+"/"+str(reference["phase"]))
			return
		var native_flags: Array = result["flags"]
		var expected_flags: Array = reference["flags"]
		if native_flags!=expected_flags:
			_fail("Original safety caution parity drift in probe "+str(i)+": "+str(native_flags)+" vs "+str(expected_flags))
			return
		var checks: Array = result["criteria"]
		var expected: Array = reference["matched"]
		if checks.size()!=5 or expected.size()!=5:
			_fail("Five original language criteria missing in probe "+str(i))
			return
		for j in range(5):
			if bool(checks[j]["matched"])!=bool(expected[j]):
				_fail("Original keyword regex parity drift probe "+str(i)+"/criterion "+str(j))
				return
	if not bool((scorer.call("score","invalid","brief","x") as Dictionary).get("invalid",false)):
		_fail("Unknown language case accepted")
		return
	var app_script: GDScript = load("res://app.gd")
	var app: Node3D = app_script.new()
	if not bool(app.call("_load_source")):
		_fail("Application rejected original language source")
		return
	app.call("_load_progress")
	app.set("_language_case","endo")
	app.set("_language_phase","brief")
	var exercise: Dictionary = (scorer.call("case_data","endo") as Dictionary)["tasks"]["brief"]
	var model: String = exercise["model"]
	var graded: Dictionary = scorer.call("score","endo","brief",model)
	var saved: Dictionary = (app.get("_progress") as Dictionary)["fspKpByTask"]
	saved["endo|brief"]={"text":model,"result":graded}
	app.call("_save_progress")
	var reload: Node3D = app_script.new()
	if not bool(reload.call("_load_source")):
		_fail("Reload app source rejected")
		return
	reload.call("_load_progress")
	var recovered: Dictionary = (reload.get("_progress") as Dictionary)["fspKpByTask"]
	if not recovered.has("endo|brief") or str(recovered["endo|brief"]["text"])!=model:
		_fail("Independent source German freeform case progress did not survive disk reload")
		return
	var report: String = reload.call("_generate_report")
	if not report.contains("ORIGINAL FOUR-CASE FSP/KP") or not report.contains("endo / brief: source lexical coverage="):
		_fail("Offline source-specific language learning report missing")
		return
	reload.call("_reset_progress")
	if not ((reload.get("_progress") as Dictionary)["fspKpByTask"] as Dictionary).is_empty():
		_fail("Global educational reset did not clear original language studio records")
		return
	print("SR11_NATIVE_FSP_KP_68_SOURCE_SCORER_PARITY_PASS four cases / sixteen exercises / explicit safety cautions / local report and progress; NOT EXAM OR CLINICAL VALIDATION")
	quit(0)
