extends RefCounted
## Fictional, preassigned education drills. Each row is an independent
## procedure with a setup choice and a review choice, never an operative recipe.
const ADA := "https://www.mouthhealthy.org/all-topics-a-z"
const AAO := "https://aaoinfo.org/treatments/aligners/"
const AAE := "https://www.aae.org/patients/root-canal-treatment/"
const RETREAT := "https://www.aae.org/patients/root-canal-treatment/endodontic-treatment-options/endodontic-retreatment/"
const DRILLS := [
	["chart", "Periodontal charting", "The assigned visit is a periodontal assessment.",
		"Periodontal probe and chart", "Bite registration and shade guide", "Recorded pocket measurements linked to tooth and site", "A tooth shade without site measurements", ADA],
	["bitewing", "Bitewing image review", "The tutor has supplied a bitewing for an image interpretation exercise.",
		"Assigned image and matching tooth identifiers", "Denture model and shade guide", "Identify the tooth surfaces and flag areas that cannot be read", "Treat all overlapping surfaces as clear", "https://www.mouthhealthy.org/all-topics-a-z/x-rays"],
	["oral_exam", "Oral soft-tissue screening", "The fictional exam record includes a soft-tissue finding to document.",
		"Soft-tissue chart and examination mirror", "Curing light and restorative matrix", "Record the location and appearance for supervised review", "Record only the tooth shade", ADA],
	["cleaning", "Professional cleaning", "The tutor has assigned a routine professional cleaning demonstration.",
		"Cleaning tray and tooth surface map", "Crown impression and bridge model", "Record the surfaces covered and remaining deposits in the exercise", "Record the shade of a laboratory crown", ADA],
	["root_planing", "Scaling and root planing", "A periodontal training case supplies a site-specific treatment plan.",
		"Assigned periodontal sites and instrumentation tray", "Sealant material and fissure map", "Compare periodontal sites against the assigned plan and record the follow-up", "Mark the exercise complete based on the tooth shade", "https://www.ada.org/resources/research/science/evidence-based-dental-research"],
	["sealant", "Fissure sealant", "The instructor identifies an occlusal surface for a sealant demonstration.",
		"Sealant kit and the assigned fissure map", "Crown shade guide and provisional model", "Review coverage of the marked pits and fissures", "Review only the shade of adjacent teeth", "https://www.ada.org/resources/ada-library/oral-health-topics/dental-sealants"],
	["fluoride", "Fluoride varnish", "The exercise specifies an approved varnish and teaching model.",
		"Varnish applicator and approved product label", "Veneer shade tab and impression tray", "Record the assigned product and demonstration surfaces", "Record a denture adjustment instead", ADA],
	["composite", "Direct composite restoration", "The case plan specifies a direct tooth-coloured restoration.",
		"Composite material and the assigned restorative tray", "Full denture and pressure indicator", "Inspect the model restoration's margins and contacts", "Grade the restoration only by matching its shade", "https://www.ada.org/resources/ada-library/oral-health-topics/materials-for-direct-restorations"],
	["veneer", "Veneer try-in", "A mock laboratory veneer is ready for a fit-and-appearance review.",
		"Assigned veneer, model and shade reference", "Periodontal chart and probe", "Check fit and appearance against the assigned veneer plan", "Record only posterior pocket depths", ADA],
	["inlay", "Indirect inlay try-in", "The lab has supplied an inlay for a defined cavity in the teaching model.",
		"Matched inlay and prepared model", "Space maintainer and appliance model", "Review seating in the cavity and margin fit on the model", "Review only the facial colour of the adjacent tooth", ADA],
	["crown", "Crown try-in", "The case provides a crown and the model of the assigned tooth.",
		"Matched crown, working model and fit record", "Fluoride varnish and surface map", "Review seating, margins and contacts against the model", "Assume full seating from shade alone", ADA],
	["bridge", "Fixed bridge try-in", "The fixture represents a bridge spanning one missing tooth.",
		"Assigned bridge and abutment model", "Sealant kit and single-tooth chart", "Confirm the fit across the supporting units and review the pontic area", "Check just the colour of the missing-tooth replacement", ADA],
	["full_denture", "Complete denture fitting", "The fictional case uses a complete removable denture.",
		"Complete denture and matching arch model", "Single-tooth crown and shade tab", "Record fit, stability and any pressure areas on the model", "Record a single crown margin", "https://www.ada.org/resources/ada-library/oral-health-topics/dentures"],
	["partial_denture", "Partial denture fitting", "The model retains natural teeth and has a removable partial appliance.",
		"Partial framework and matching tooth-supported model", "Complete denture made for a different arch", "Review seating at the planned supports and check retention on the model", "Ignore the remaining teeth when recording the fit", ADA],
	["implant", "Implant restoration review", "The model contains an implant-supported crown for inspection.",
		"Matching implant restoration and implant model", "Veneer and enamel shade tab only", "Confirm the assigned implant site and restoration match before recording fit", "Identify the unit by crown colour alone", ADA],
	["endo", "Root canal model review", "The endodontic exercise provides an initial treatment case and canal diagram.",
		"Assigned canal diagram and endodontic training tray", "Full denture model and pressure indicator", "Compare the model canal map with the supplied exercise record", "Record only crown shade and skip canal identification", AAE],
	["retreat", "Endodontic retreatment review", "The exercise supplies records from a previously treated tooth.",
		"Prior treatment images and the assigned retreatment case", "Unused sealant kit without the prior record", "Compare the prior and supplied follow-up images and flag unresolved findings", "Document it as a first treatment without reviewing prior records", RETREAT],
	["extraction", "Extraction simulation setup", "The exercise assigns a specific tooth for a supervised model extraction.",
		"Model tooth identification and the assigned extraction tray", "Sealant kit and preventive surface map", "Verify the documented tooth against the simulation plan and record the model outcome", "Accept a different tooth from the same arch", ADA],
	["aligner", "Clear aligner fitting", "The teaching fixture includes numbered aligners and a model.",
		"Assigned aligner stage and matching arch model", "Fixed bridge and a single-tooth cast", "Check seating and stage number against the prescribed model plan", "Assume any transparent tray is the assigned stage", AAO],
	["mouthguard", "Custom mouthguard fitting", "A training case provides a sports mouthguard and arch model.",
		"Mouthguard and matching upper-arch model", "Endodontic file set and canal diagram", "Review seating, coverage and retention against the exercise model", "Grade it by colour alone", "https://www.ada.org/resources/ada-library/oral-health-topics"],
]

var index := 0
var stage := 0
var errors := 0
var pass_number := 0
var feedback := ""

func start(drill_index: int) -> void:
	index = clampi(drill_index, 0, DRILLS.size() - 1)
	stage = 0
	errors = 0
	pass_number += 1
	feedback = ""

func choose(at_stage: int, option: int) -> void:
	if at_stage != stage or stage >= 2 or option not in [0, 1]:
		return
	if option != 0:
		errors += 1
		feedback = "Try again. Compare the choices with the assigned exercise."
		return
	stage += 1
	feedback = "Setup confirmed." if stage == 1 else "Exercise complete."

func score() -> int:
	return stage * 10
