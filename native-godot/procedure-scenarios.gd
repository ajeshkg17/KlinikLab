extends RefCounted
## Each record specifies a fixture, a tool, and an ordered list of model changes.
## These are fictional object interactions with no clinical measurements.
const SCENARIOS := {
	"chart": ["arch", "Probe", ["Record left site", "Record right site"], "mark"],
	"bitewing": ["image", "Image pointer", ["Identify proximal surfaces", "Flag overlap"], "mark"],
	"oral_exam": ["soft", "Examination mirror", ["Locate simulated finding", "Record location"], "mark"],
	"cleaning": ["arch", "Polishing cup", ["Remove left deposit", "Remove right deposit"], "remove"],
	"root_planing": ["roots", "Scaler", ["Clear marked root surface", "Clear second root surface"], "remove"],
	"sealant": ["crown", "Sealant applicator", ["Coat first fissure", "Coat second fissure"], "coat"],
	"fluoride": ["arch", "Varnish brush", ["Coat left training surface", "Coat right training surface"], "coat"],
	"composite": ["crown", "Restorative handpiece", ["Remove marked defect", "Place virtual composite"], "restore"],
	"veneer": ["anterior", "Veneer", ["Seat facial shell", "Check incisal landmark"], "seat"],
	"inlay": ["crown", "Inlay", ["Seat in the prepared outline", "Check outline landmark"], "seat"],
	"crown": ["crown", "Crown", ["Seat on the prepared model", "Check the margin landmark"], "seat"],
	"bridge": ["gap", "Bridge", ["Seat across the supports", "Check the pontic landmark"], "seat"],
	"full_denture": ["soft", "Complete denture", ["Seat the complete arch", "Check the posterior landmark"], "seat"],
	"partial_denture": ["gap", "Partial denture", ["Seat beside the remaining teeth", "Check the support landmark"], "seat"],
	"implant": ["implant", "Implant restoration", ["Match the restoration to the site", "Check the interface landmark"], "seat"],
	"endo": ["canal", "Canal tracing instrument", ["Trace the chamber", "Trace the assigned canal"], "mark"],
	"retreat": ["comparison", "Image pointer", ["Mark prior model reference", "Flag current discrepancy"], "mark"],
	"extraction": ["arch", "Training forceps", ["Release the assigned tooth", "Check both adjacent teeth"], "extract"],
	"aligner": ["arch", "Numbered aligner", ["Seat the assigned stage", "Check the seating landmark"], "seat"],
	"mouthguard": ["arch", "Mouthguard", ["Seat the matching guard", "Check the coverage landmark"], "seat"],
}
const ADA_TOPICS := "https://www.mouthhealthy.org/all-topics-a-z/"
const TOPICS := {
	"chart": "periodontics", "oral_exam": "oral-cancer", "cleaning": "plaque",
	"root_planing": "scaling-and-root-planing", "fluoride": "fluoride", "composite": "composite-fillings",
	"veneer": "veneers", "inlay": "fillings-gold-inlays", "crown": "crowns", "bridge": "bridges",
	"partial_denture": "dentures-partial", "implant": "implants", "extraction": "extractions",
	"mouthguard": "mouthguards",
}

static func for_drill(index: int) -> Dictionary:
	var row: Array = preload("res://procedure-drills.gd").DRILLS[index]
	var record: Array = SCENARIOS[row[0]]
	var reference: String = ADA_TOPICS + str(TOPICS[row[0]]) if TOPICS.has(row[0]) else row[7]
	return {"id": row[0], "title": row[1], "reference": reference, "model": record[0],
		"tool": record[1], "actions": record[2], "effect": record[3]}
