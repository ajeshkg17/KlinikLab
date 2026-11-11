extends RefCounted
## Independent, read-only instrument inventory. No additions to the 20 chair scenarios.
## All six new assets are taken from the previously downloaded 3DAssets.dev
## Dental Practice and Surgery CC0 pack (local, SHA-verified at build time).
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
	return result
