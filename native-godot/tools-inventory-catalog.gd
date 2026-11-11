extends RefCounted
## Independent, read-only instrument inventory. No additions to the 20 chair scenarios.
## Six downloaded CC0 models are sourced from the previously tracked pack;
## additional handheld instruments are original schematic teaching geometry.
const BENCH := preload("res://chairside-catalog.gd")
const PACK_URL := "https://3dassets.dev/packs/dental-practice-and-surgery"
const EXTRA := [
	{
		"id": "inventory.instrument_tray",
		"name": "Examination instrument tray",
		"german": "Untersuchungsinstrumente auf Tray",
		"kind": "Examination set",
		"scene": "res://assets/inventory/instrument-tray.glb",
		"cue": "Inspect the tray, mouth mirror, tapered probe, college tweezers and cotton rolls.",
		"purpose": "A grouped static 3D study set, not individually selectable or sterilisation-verified instruments.",
		"source": PACK_URL,
	},
	{
		"id": "inventory.impression_trays",
		"name": "Upper and lower impression tray set",
		"german": "Abformlöffel-Set (Ober- und Unterkiefer)",
		"kind": "Impression equipment",
		"scene": "res://assets/inventory/impression-trays.glb",
		"cue": "Compare the U-shaped perforated upper/lower tray silhouettes and coloured handles.",
		"purpose": "Static visual reference only; no patient size, fit, or impression technique is validated.",
		"source": PACK_URL,
	},
	{
		"id": "inventory.xray_sensor_tray",
		"name": "Intraoral X-ray sensor tray",
		"german": "Röntgensensor-Ablage",
		"kind": "Imaging equipment",
		"scene": "res://assets/inventory/xray-sensor-tray.glb",
		"cue": "Identify the sensor storage tray as an imaging accessory, not an X-ray generator.",
		"purpose": "Equipment recognition only; no radiation exposure or radiographic interpretation.",
		"source": PACK_URL,
	},
	{
		"id": "inventory.suction_unit",
		"name": "Dental suction unit",
		"german": "Dentale Absaugeinheit",
		"kind": "Operatory equipment",
		"scene": "res://assets/inventory/suction-unit.glb",
		"cue": "Locate the pump casing, collection jar and suction connection points.",
		"purpose": "Stationary equipment model; no suction capacity, hygiene or patient-use instructions.",
		"source": PACK_URL,
	},
	{
		"id": "inventory.articulator",
		"name": "Dental articulator with model casts",
		"german": "Artikulator mit Modellen",
		"kind": "Dental laboratory",
		"scene": "res://assets/inventory/articulator.glb",
		"cue": "Inspect the hinged frame, incisal pin and upper/lower mounted model arches.",
		"purpose": "Study prop; no registered jaw relation, occlusion accuracy or prosthetic fitting is claimed.",
		"source": PACK_URL,
	},
	{
		"id": "inventory.ultrasonic_cleaner",
		"name": "Ultrasonic cleaning bath",
		"german": "Ultraschall-Reinigungsbad",
		"kind": "Instrument reprocessing",
		"scene": "res://assets/inventory/ultrasonic-cleaner.glb",
		"cue": "Identify the ultrasonic bath enclosure used in an instrument reprocessing room.",
		"purpose": "Equipment recognition only; ultrasonic cleaning does not substitute for validated sterilisation.",
		"source": PACK_URL,
	},
]


## Original schematic instruments for 3D recognition, not scanned or dimensionally accurate.
## The 'source' below is a clinical-identification REFERENCE, not a model download.
const HAND_TOOLS := [
	{
		"id": "handtool.explorer_23",
		"name": "Shepherd's-hook dental explorer (No. 23)",
		"german": "Zahnsonde / Explorer Nr. 23",
		"kind": "Examination · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-explorer-23.tscn",
		"cue": "Look for the slender bent tip and hook-shaped terminal section. Compare it with the blunt periodontal probe.",
		"purpose": "Illustrative tip silhouette for identification only; not a tooth-contact method, diagnostic test or clinical specification.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.college_pliers",
		"name": "College cotton pliers / tweezers",
		"german": "College-Pinzette / zahnärztliche Pinzette",
		"kind": "Examination · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-college-pliers.tscn",
		"cue": "Identify two spring arms converging toward a pair of angled gripping tips.",
		"purpose": "Schematic transfer/gripping instrument; no grasping physics, sterility or patient use is simulated.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.spoon_excavator",
		"name": "Spoon excavator",
		"german": "Löffelexkavator",
		"kind": "Restorative · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-spoon-excavator.tscn",
		"cue": "Look for a small spoon-shaped terminal working end, distinct from a smooth ball burnisher.",
		"purpose": "Schematic depiction of an excavator profile; bowl is not a sharp or calibrated cutting edge.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.ball_burnisher",
		"name": "Ball burnisher",
		"german": "Kugelglätter / Kugelpolierer",
		"kind": "Restorative · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-ball-burnisher.tscn",
		"cue": "Compare the smooth rounded metal ball working end with the excavator's hollow-looking spoon.",
		"purpose": "Recognition of rounded restorative modelling tips; no material smoothing behaviour is simulated.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.k_file",
		"name": "Endodontic K-file (finger instrument)",
		"german": "Endodontische K-Feile / Handfeile",
		"kind": "Endodontics · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-k-file.tscn",
		"cue": "Note the short coloured finger handle and illustrative fluted, tapered shaft.",
		"purpose": "Not a clinically correct ISO size, length, flute pitch or cutting geometry; not for canal insertion training.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.finger_spreader",
		"name": "Endodontic finger spreader",
		"german": "Finger-Spreader / Wurzelkanalspreizer",
		"kind": "Endodontics · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-finger-spreader.tscn",
		"cue": "Contrast the smooth, tapered pointed working end with the K-file's fluted outline.",
		"purpose": "Tool identification only; no working length, pressure, obturation or clinical technique is established.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.sickle_scaler",
		"name": "Double-ended sickle scaler",
		"german": "Doppelseitiger Sichelscaler",
		"kind": "Periodontics · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-sickle-scaler.tscn",
		"cue": "Look at the two angled hook-like terminal ends versus the single-ended periodontal probe.",
		"purpose": "Illustrative external silhouette, not an anatomical or clinically sharp scaling-edge model.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
	{
		"id": "handtool.composite_spatula",
		"name": "Composite placement spatula",
		"german": "Komposit-Modellierinstrument / Kunststoffspatel",
		"kind": "Restorative · schematic hand instrument",
		"scene": "res://assets/inventory/synthetic-composite-spatula.tscn",
		"cue": "Identify the flattened paddle-like placement end and the second adaptation tip.",
		"purpose": "Schematic restoration-material placement instrument; no adhesive, filling material or patient manipulation.",
		"source": "https://www.ergodenta.dk/blog/information-12/dental-instruments-by-procedure-tray-set-ups-for-dental-nurses-and-assistants-204",
	},
]

static func entries() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for item_key in BENCH.ITEMS.keys():
		var id := str(item_key)
		if not id.begins_with("tool."):
			continue
		var study_item: Dictionary = BENCH.ITEMS[id]
		result.append({
			"id": id,
			"name": str(study_item["name"]),
			"german": str(study_item["german"]),
			"kind": "Existing bench study model",
			"scene": str(study_item["scene"]),
			"cue": str(study_item["cue"]),
			"purpose": str(study_item["purpose"]),
			"source": str(study_item["source"]),
		})
	for entry: Dictionary in EXTRA:
		result.append(entry.duplicate(true))
	for entry: Dictionary in HAND_TOOLS:
		result.append(entry.duplicate(true))
	return result
