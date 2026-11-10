extends RefCounted
## Case-specific selections share one source-checked instrument preview catalog.
const ADA_MATERIALS := "https://www.ada.org/resources/ada-library/oral-health-topics/materials-for-direct-restorations"
const ADA_SEALANTS := "https://www.ada.org/resources/ada-library/oral-health-topics/dental-sealants"
const ADA_FLUORIDE := "https://www.mouthhealthy.org/all-topics-a-z/fluoride"
const ADA_PLAQUE := "https://www.mouthhealthy.org/all-topics-a-z/plaque"
const ADA_ROOT_PLANING := "https://www.mouthhealthy.org/all-topics-a-z/scaling-and-root-planing"
const ADA_CHART := "https://www.mouthhealthy.org/all-topics-a-z/periodontics"
const ADA_XRAYS := "https://www.mouthhealthy.org/all-topics-a-z/x-rays"
const ITEMS := {
	"tool.curing_light": {
		"name": "Dental curing light", "german": "Polymerisationslampe",
		"scene": "res://assets/bench/curing-light.glb",
		"cue": "Inspect the wide light-emitting tip of the angled handpiece.",
		"purpose": "Activates the assigned light-cured dental resin.",
		"source": "https://www.ada.org/resources/ada-library/oral-health-topics/dental-curing-lights",
	},
	"tool.ultrasonic_scaler": {
		"name": "Ultrasonic scaler", "german": "Ultraschallscaler",
		"scene": "res://assets/bench/ultrasonic-scaler.glb",
		"cue": "Inspect the narrow metal scaling tip beside the control unit.",
		"purpose": "Removes deposits; it is not a light source.",
		"source": "https://www.dentsplysirona.com/en-us/discover/discover-by-category/preventive/ultrasonic-scaling-for-dental-hygienists/cavitron-ultrasonic-scaling-inserts.html",
	},
	"material.light_cure_composite": {
		"name": "Light-cured resin composite", "german": "Lichthärtendes Komposit",
		"cue": "Illustration · warm tooth-coloured restorative sample",
		"purpose": "The assigned direct composite restoration uses this material.",
		"swatch": Color("#e7c8a3"), "source": ADA_MATERIALS,
	},
	"material.glass_ionomer": {
		"name": "Conventional glass ionomer", "german": "Konventioneller Glasionomerzement",
		"cue": "Illustration · opaque pale sample",
		"purpose": "A separate material family. A conventional formulation sets by an acid–base reaction.",
		"swatch": Color("#e2ded0"), "source": ADA_MATERIALS,
	},
	"material.light_cure_sealant": {
		"name": "Light-cured resin fissure sealant", "german": "Lichthärtender Fissurenversiegler",
		"cue": "Illustration · thin translucent fissure coating",
		"purpose": "A resin pit-and-fissure sealant requiring light activation, as specified by this fictional case.",
		"swatch": Color("#d5e7dd"), "source": ADA_SEALANTS,
	},

	"tool.varnish_brush": {
		"name": "Single-use varnish applicator (synthetic 3D model)", "german": "Fluoridlack-Applikator (schematisch)",
		"scene": "res://assets/bench/synthetic-varnish-applicator.tscn",
		"cue": "Synthetic educational geometry · slim handle, narrow neck and soft applicator tip.",
		"purpose": "Represents a brush for the case-assigned coating; no real device geometry or dosing is modelled.",
		"source": ADA_FLUORIDE,
	},
	"material.fluoride_varnish": {
		"name": "Fluoride varnish", "german": "Fluoridlack",
		"cue": "Illustration · pale gold varnish swatch, not a product photograph",
		"purpose": "The fictional case explicitly selects fluoride varnish to coat the training surfaces; it is not light-cured.",
		"swatch": Color("#e8cf91"), "source": ADA_FLUORIDE,
	},

	"tool.polishing_cup": {
		"name": "Rubber polishing cup (synthetic 3D model)", "german": "Polierkelch / Gummipolierer (schematisch)",
		"scene": "res://assets/bench/synthetic-polishing-cup.tscn",
		"cue": "Synthetic educational geometry · wide rubber cup on a short shaft; examine the flared working end.",
		"purpose": "Represents the assigned cup for an illustrative polishing pass on soft plaque/stain markers, not calculus removal.",
		"source": ADA_PLAQUE,
	},
	"material.prophylaxis_paste": {
		"name": "Fine prophylaxis polishing paste", "german": "Feine Prophylaxepolierpaste",
		"cue": "Illustration · mint-coloured polishing paste swatch (not product-specific)",
		"purpose": "Fictional tray assignment for model surface polishing. Not fluoride varnish, sealant, or a measured abrasive specification.",
		"swatch": Color("#b8d9d0"), "source": ADA_PLAQUE,
	},

	"material.clean_water_coolant": {
		"name": "Clean water coolant for assigned ultrasonic unit", "german": "Kühl-/Spülwasser für den Ultraschallscaler",
		"cue": "Illustration · pale blue coolant swatch, not a bottle or device specification",
		"purpose": "The fictional powered-scaler exercise specifies water flow for coolant/irrigation. This represents a case consumable, not a medication, calibrated fluid volume, or a recommendation for patient treatment.",
		"swatch": Color("#bbdfe7"), "source": ADA_ROOT_PLANING,
	},

	"tool.periodontal_probe": {
		"name": "Periodontal probe (synthetic 3D teaching model)", "german": "Parodontalsonde (schematisch)",
		"scene": "res://assets/bench/synthetic-periodontal-probe.tscn",
		"cue": "Synthetic educational geometry · narrow blunt probing tip with illustrative dark marker bands; the markings are NOT calibrated.",
		"purpose": "Represents a site-checking periodontal probe, not a scaler; no real pocket depth, probing force, tissue response or diagnosis is measured.",
		"source": ADA_CHART,
	},
	"material.site_chart": {
		"name": "Tooth-and-site periodontal chart", "german": "Parodontalstatus mit Zahn- und Stellenzuordnung",
		"cue": "Illustration · blue-green record card for assigned tooth/site identifiers, not real clinical data",
		"purpose": "Fictional study record to associate the two named model sites with their locations. No depths or clinical readings are generated.",
		"swatch": Color("#9acacc"), "source": ADA_CHART,
	},
	"material.shade_guide": {
		"name": "Tooth shade guide (different record type)", "german": "Zahnfarbschlüssel",
		"cue": "Illustration · warm tooth shade card; used for a different clinical task",
		"purpose": "Shade selection cannot substitute for the assigned site-specific periodontal chart.",
		"swatch": Color("#dfc09c"), "source": ADA_CHART,
	},

	"tool.image_pointer": {
		"name": "Image annotation pointer (synthetic 3D teaching model)", "german": "Bildmarkierungs-Zeiger (schematisch)",
		"scene": "res://assets/bench/synthetic-image-pointer.tscn",
		"cue": "Synthetic teaching geometry · straight stylus with a contrasting rounded marker tip, not a dental instrument, X-ray sensor or radiation device.",
		"purpose": "Represents selecting virtual landmarks on an assigned image diagram; it has no clinical measuring or imaging capability.",
		"source": ADA_XRAYS,
	},
	"material.assigned_bitewing_image": {
		"name": "Assigned simulated bitewing diagram and tooth identifiers", "german": "Zugeordnetes Bissflügel-Diagramm mit Zahnnummern",
		"cue": "Illustration · blue-grey image-reference card; not an actual bitewing exposure or patient radiograph.",
		"purpose": "The fictional image-reference sheet names the preassigned proximal landmarks and an intentionally overlapping zone. No clinical findings are inferred.",
		"swatch": Color("#a9c8d7"), "source": ADA_XRAYS,
	},
}

const COMPOSITE := {
	"id": "composite_light_cure_intro",
	"scenario": "composite",
	"title": "Composite restoration bench",
	"case": "Fictional case · Prepare the tray for the assigned light-cured resin restoration.",
	"tool": {
		"choices": ["tool.curing_light", "tool.ultrasonic_scaler"],
		"expected": "tool.curing_light",
		"prompt": "Which instrument activates the assigned material after placement?",
		"correct": "Correct. The optical tip delivers light to the composite.",
		"incorrect": "The scaler has a metal tip for deposits, not light curing. Select the light-emitting instrument.",
	},
	"material": {
		"choices": ["material.light_cure_composite", "material.glass_ionomer"],
		"expected": "material.light_cure_composite",
		"prompt": "Which material does the fictional case specify?",
		"correct": "Correct. This restoration uses light-cured resin composite.",
		"incorrect": "The assigned resin composite is light cured; conventional glass ionomer sets differently.",
	},
	"finish": "Simulate curing with the selected light",
	"finish_event": "simulate_cure",
	"outcome": "Simulation complete · Composite placed, verified and marked cured in this exercise.",
	"reference": ADA_MATERIALS,
}

const SEALANT := {
	"id": "fissure_sealant_light_cure_intro",
	"scenario": "sealant",
	"title": "Fissure sealant bench",
	"case": "Fictional case · An instructor has marked two pits and fissures on a posterior teaching crown. The prescription specifically calls for a LIGHT-CURED resin fissure sealant. Choose its curing instrument and material, then cover both marked fissures in the existing chair simulation.",
	"tool": {
		"choices": ["tool.curing_light", "tool.ultrasonic_scaler"],
		"expected": "tool.curing_light",
		"prompt": "Which 3D instrument delivers the curing light after the sealant is placed?",
		"correct": "Correct. The curing-light tip supplies the activation light required by this particular resin sealant.",
		"incorrect": "The scaler removes deposits; its narrow metal tip cannot light-cure this sealant. Inspect the broad optical tip.",
	},
	"material": {
		"choices": ["material.light_cure_sealant", "material.glass_ionomer"],
		"expected": "material.light_cure_sealant",
		"prompt": "Which material is explicitly specified for this fictional case?",
		"correct": "Correct. The selected resin fissure sealant is light cured as the case requires.",
		"incorrect": "Conventional glass ionomer has different setting chemistry; select the case's specified light-cured resin sealant. Other sealant materials can be used in different real clinical situations.",
	},
	"finish": "Confirm simulated light curing of both coated fissures",
	"finish_event": "simulate_sealant_cure",
	"outcome": "Sealant simulation complete · Both marked fissures were coated and verified in the chair. The selected resin sealant is marked light-cured for this fictional exercise only.",
	"reference": ADA_SEALANTS,
}


const FLUORIDE := {
	"id": "fluoride_varnish_coating_intro",
	"scenario": "fluoride",
	"title": "Fluoride varnish bench",
	"case": "Fictional instructor-assigned case · Demonstrate fluoride varnish on two indicated surfaces of an arch teaching model. This is an educational material and applicator selection exercise, not an actual treatment or dose protocol. No curing light is required.",
	"tool": {
		"choices": ["tool.varnish_brush", "tool.curing_light"],
		"expected": "tool.varnish_brush",
		"prompt": "Which 3D instrument represents applying the assigned varnish to the model surfaces?",
		"correct": "Correct. The schematic disposable brush represents varnish application; no device dose is simulated.",
		"incorrect": "A curing light polymerizes certain resin materials. It is not the varnish applicator for this assigned fluoride-varnish case.",
	},
	"material": {
		"choices": ["material.fluoride_varnish", "material.light_cure_sealant"],
		"expected": "material.fluoride_varnish",
		"prompt": "Which coating material matches the fictional assignment?",
		"correct": "Correct. This exercise specifies fluoride varnish, not a resin pit-and-fissure sealant.",
		"incorrect": "The light-cured fissure sealant is a different preventive material. Select the fluoride varnish explicitly assigned here.",
	},
	"finish": "Record both simulated varnish-coated surfaces",
	"finish_event": "record_fluoride_varnish_coating",
	"outcome": "Fluoride varnish exercise complete · Both assigned training surfaces were coated and verified in the existing chair simulation. This is an illustrative record, not a measured clinical varnish dose or fluoride release.",
	"reference": ADA_FLUORIDE,
}

const CLEANING := {
	"id": "professional_cleaning_polishing_intro",
	"scenario": "cleaning",
	"title": "Professional cleaning bench",
	"case": "Fictional demonstration · An instructor requests a final polishing pass of TWO marked soft-plaque/stain deposits on an arch teaching model using a RUBBER POLISHING CUP and FINE PROPHYLAXIS POLISHING PASTE. Earlier scaling has already been completed; these are soft training markers, not hardened calculus.",
	"tool": {
		"choices": ["tool.polishing_cup", "tool.ultrasonic_scaler"],
		"expected": "tool.polishing_cup",
		"prompt": "Which 3D study instrument matches the specified final polishing pass?",
		"correct": "Correct. The schematic rubber cup matches the assigned polishing step on the teaching arch.",
		"incorrect": "Ultrasonic scalers can remove calculus during other cleaning steps, but this fictional assignment specifically requests a rubber polishing cup for the finishing pass.",
	},
	"material": {
		"choices": ["material.prophylaxis_paste", "material.fluoride_varnish"],
		"expected": "material.prophylaxis_paste",
		"prompt": "Which material is assigned for this model polishing pass?",
		"correct": "Correct. The fictional polishing step specifies fine prophylaxis paste.",
		"incorrect": "Fluoride varnish is a different preventive coating. Select the explicitly assigned fine polishing paste; neither swatch represents a measured clinical formulation.",
	},
	"finish": "Record removal of both simulated soft-deposit markers",
	"finish_event": "record_cleaning_polish_markers",
	"outcome": "Professional cleaning simulation complete · Both marked soft-deposit sites were cleared and verified by the existing chair exercise. This is a model-only polishing record, not a clinically validated plaque/calculus-removal outcome.",
	"reference": ADA_PLAQUE,
}

const ROOT_PLANING := {
	"id": "root_planing_ultrasonic_intro",
	"scenario": "root_planing",
	"title": "Scaling and root planing bench",
	"case": "Fictional supervised periodontal model exercise · The assigned simulated subgingival instrumentation uses an ULTRASONIC SCALER with CLEAN WATER COOLANT to clear two marked ROOT-SURFACE deposits. A clinician would assess the site and instrument suitability in real practice. Here the targets are schematic and no actual periodontal treatment or root smoothing is simulated.",
	"tool": {
		"choices": ["tool.ultrasonic_scaler", "tool.polishing_cup"],
		"expected": "tool.ultrasonic_scaler",
		"prompt": "Which 3D study instrument matches the powered root-surface instrumentation specified by this case?",
		"correct": "Correct. This case specifies the ultrasonic scaler. The narrow metal tip contrasts with the rubber polishing cup.",
		"incorrect": "The rubber polishing cup represents surface polishing. It cannot replace the assigned ultrasonic instrument for these simulated root deposits.",
	},
	"material": {
		"choices": ["material.clean_water_coolant", "material.prophylaxis_paste"],
		"expected": "material.clean_water_coolant",
		"prompt": "Which case consumable is assigned to this water-cooled ultrasonic demonstration?",
		"correct": "Correct. The fictional powered-scaler scenario specifies a water coolant/irrigation supply, without modeling flow or dose.",
		"incorrect": "Fine prophylaxis paste is for a different polishing step. The assigned ultrasonic instrument requires its specified water coolant, not paste.",
	},
	"finish": "Record both simulated root-surface deposits cleared",
	"finish_event": "record_root_surface_instrumentation",
	"outcome": "Scaling and root planing model exercise complete · Both assigned root-surface markers were cleared and verified by the existing chair simulation. This does not assess periodontal pocket therapy, root smoothness, patient outcomes, or clinical competence.",
	"reference": ADA_ROOT_PLANING,
}

const CHART := {
	"id": "periodontal_charting_site_record_intro",
	"scenario": "chart",
	"title": "Periodontal charting bench",
	"case": "Fictional periodontal assessment training model · The instructor assigned two named SITES on a teaching arch for LOCATION RECORDING using a PERIODONTAL PROBE and a TOOTH-AND-SITE CHART. The exercise records which model site was identified; it does NOT generate pocket depths, clinical measurements, diagnostic findings or an actual patient chart.",
	"tool": {
		"choices": ["tool.periodontal_probe", "tool.ultrasonic_scaler"],
		"expected": "tool.periodontal_probe",
		"prompt": "Which 3D study instrument is assigned to the periodontal assessment, rather than deposit removal?",
		"correct": "Correct. The schematic periodontal probe represents site examination; its simulated markings are not a calibrated measuring scale.",
		"incorrect": "The ultrasonic scaler is for instrumentation of deposits, not the periodontal probe assigned for site recording in this fictional case.",
	},
	"material": {
		"label": "site record",
		"choices": ["material.site_chart", "material.shade_guide"],
		"expected": "material.site_chart",
		"prompt": "Which record supports a tooth-and-site periodontal assessment of the two assigned teaching landmarks?",
		"correct": "Correct. The site chart links each assigned teaching landmark with its tooth/site identifier.",
		"incorrect": "A shade guide records tooth colour and cannot replace the site chart needed for this fictional periodontal record.",
	},
	"finish": "Confirm both simulated periodontal site records",
	"finish_event": "record_periodontal_sites",
	"outcome": "Periodontal charting exercise complete · The two assigned model locations were recorded and verified in the chair. No actual pocket depth, clinical finding, patient diagnosis or professional proficiency is claimed.",
	"reference": ADA_CHART,
}

const BITEWING := {
	"id": "bitewing_image_annotation_intro",
	"scenario": "bitewing",
	"title": "Bitewing image review bench",
	"case": "Fictional instructor-supplied IMAGE DIAGRAM exercise · The model marks two predetermined bitewing reference regions. Identify the assigned proximal surface region, then FLAG an intentionally overlapping region as NOT READABLE. This is not a real dental X-ray, exposure, lesion assessment, caries diagnosis or patient report.",
	"tool": {
		"choices": ["tool.image_pointer", "tool.periodontal_probe"],
		"expected": "tool.image_pointer",
		"prompt": "Which 3D study object represents annotating the assigned image rather than examining periodontal tissue?",
		"correct": "Correct. The schematic image pointer selects diagram landmarks; it is not a radiography device.",
		"incorrect": "A periodontal probe represents physical site examination. Select the virtual-image annotation pointer for this case.",
	},
	"material": {
		"label": "image reference",
		"choices": ["material.assigned_bitewing_image", "material.site_chart"],
		"expected": "material.assigned_bitewing_image",
		"prompt": "Which reference matches the assigned diagram and tooth identifiers for these two image landmarks?",
		"correct": "Correct. The fictional image-reference card contains the supplied identifiers and marks the overlap as unreadable.",
		"incorrect": "The periodontal site chart belongs to a different examination. Use the specifically assigned simulated bitewing image reference.",
	},
	"finish": "Record proximal landmark and unreadable overlap",
	"finish_event": "record_bitewing_image_annotations",
	"outcome": "Bitewing image-review simulation complete · The assigned proximal landmark and overlapping, unreadable region were recorded in the existing chair exercise. No radiograph was taken or interpreted for clinical diagnosis.",
	"reference": ADA_XRAYS,
}
