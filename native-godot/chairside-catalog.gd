extends RefCounted
## Case-specific selections share one source-checked instrument preview catalog.
const ADA_MATERIALS := "https://www.ada.org/resources/ada-library/oral-health-topics/materials-for-direct-restorations"
const ADA_SEALANTS := "https://www.ada.org/resources/ada-library/oral-health-topics/dental-sealants"
const ADA_FLUORIDE := "https://www.mouthhealthy.org/all-topics-a-z/fluoride"
const ADA_PLAQUE := "https://www.mouthhealthy.org/all-topics-a-z/plaque"
const ADA_ROOT_PLANING := "https://www.mouthhealthy.org/all-topics-a-z/scaling-and-root-planing"
const ADA_CHART := "https://www.mouthhealthy.org/all-topics-a-z/periodontics"
const ADA_XRAYS := "https://www.mouthhealthy.org/all-topics-a-z/x-rays"
const ADA_ORAL_CANCER := "https://www.mouthhealthy.org/all-topics-a-z/oral-cancer"
const ADA_VENEERS := "https://www.mouthhealthy.org/all-topics-a-z/veneers"
const ADA_INLAYS := "https://www.mouthhealthy.org/all-topics-a-z/fillings-gold-inlays"
const ADA_CROWNS := "https://www.mouthhealthy.org/all-topics-a-z/crowns"
const ADA_BRIDGES := "https://www.mouthhealthy.org/all-topics-a-z/bridges"
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

	"tool.examination_mirror": {
		"name": "Intraoral examination mirror (synthetic 3D model)", "german": "Mundspiegel (schematisch)",
		"scene": "res://assets/bench/synthetic-examination-mirror.tscn",
		"cue": "Synthetic educational geometry · long shaft and a rounded reflective disc. Not dimensionally calibrated or suitable for real use.",
		"purpose": "Represents the mirror assigned for visual inspection of an oral soft-tissue teaching fixture; not a diagnostic sensor.",
		"source": ADA_ORAL_CANCER,
	},
	"material.soft_tissue_location_record": {
		"name": "Soft-tissue location and appearance record (fictional)", "german": "Schleimhautbefund-Lokalisationsbogen (schematisch)",
		"cue": "Illustration · teal location card; not a photograph, clinical finding or a patient chart.",
		"purpose": "Assigned record template for two labelled model landmarks and a note that the observation requires supervised clinical review. No diagnosis is generated.",
		"swatch": Color("#a9d8cb"), "source": ADA_ORAL_CANCER,
	},

	"tool.veneer_shell": {
		"name": "Mock facial veneer shell (synthetic 3D fixture)", "german": "Veneerschale (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-veneer-shell.tscn",
		"cue": "Synthetic illustrative 3D shell silhouette with a marked incisal edge; geometry is not an exact clinical restoration.",
		"purpose": "A schematic lab-supplied facial shell for comparing model seating and an incisal landmark; it is not a calibrated patient-specific veneer.",
		"source": ADA_VENEERS,
	},
	"material.veneer_fit_reference": {
		"name": "Matched veneer outline and incisal landmark reference", "german": "Veneer-Passungs- und Schneidekanten-Vorlage (schematisch)",
		"cue": "Illustration · warm neutral reference card showing the model's assigned fitting landmarks, not a real patient impression.",
		"purpose": "Identifies the fictional target veneer outline and incisal marker used for this two-step try-in exercise. Does not provide bonding, occlusal, margin-gap or colour calibration.",
		"swatch": Color("#e5cdb3"), "source": ADA_VENEERS,
	},

	"tool.inlay_insert": {
		"name": "Mock indirect inlay insert (synthetic 3D fixture)", "german": "Einlagefüllung / Inlay (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-inlay-insert.tscn",
		"cue": "Synthetic 3D stepped insert with a visible outline marker. Shape is illustrative, not derived from a clinical tooth preparation or digital impression.",
		"purpose": "The assigned model insert for checking the fictional prepared-outline target; not a real milled restoration or measured contact/margin surface.",
		"source": ADA_INLAYS,
	},
	"material.inlay_outline_reference": {
		"name": "Matched inlay cavity-outline and seating reference", "german": "Inlay-Präparationsumriss- und Sitzvorlage (schematisch)",
		"cue": "Illustration · pale blue reference card with a named model cavity outline and marker; not a patient scan.",
		"purpose": "Specifies the fictional prepared outline and landmark for model matching. No marginal-gap, internal-contact, occlusion or cementation metrics are simulated.",
		"swatch": Color("#b8d5e7"), "source": ADA_INLAYS,
	},

	"tool.crown_shell": {
		"name": "Mock full-coverage crown (synthetic 3D study object)", "german": "Krone (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-crown-shell.tscn",
		"cue": "Synthetic full-coverage crown silhouette with a highlighted cervical margin landmark; solid illustrative shapes, not a true hollow fitting surface.",
		"purpose": "Represents the specified mock crown for seating on a named teaching model; it cannot establish measured marginal adaptation, contacts or occlusion.",
		"source": ADA_CROWNS,
	},
	"material.crown_fit_reference": {
		"name": "Assigned crown model and cervical-margin reference card", "german": "Kronenmodell mit Randmarkierungs-Vorlage (schematisch)",
		"cue": "Illustration · assigned preparation outline and cervical teaching landmark, not a clinical working cast or patient scan.",
		"purpose": "Identifies the fictional prepared model and the exact cervical landmark to check. This does not contain patient measurements, marginal gap, contacts or bite data.",
		"swatch": Color("#d6d4c2"), "source": ADA_CROWNS,
	},

	"tool.bridge_framework": {
		"name": "Mock three-unit fixed bridge (synthetic 3D study fixture)", "german": "Dreigliedrige Brücke (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-bridge-framework.tscn",
		"cue": "Original schematic 3D model: two abutment-shaped supports and one central pontic with contrasting study marker; geometry does not depict a clinical cemented fit.",
		"purpose": "Represents the assigned fictional fixed bridge spanning one missing model tooth; not a calibrated framework, connector-strength assessment or patient-specific prosthesis.",
		"source": ADA_BRIDGES,
	},
	"material.bridge_support_reference": {
		"name": "Bridge abutment-and-pontic matching reference", "german": "Brückenpfeiler- und Brückenglied-Zuordnung (Lehrvorlage)",
		"cue": "Illustration · a two-support and central-pontic target card, not a clinical working model or patient scan.",
		"purpose": "Identifies the two assigned model support units and the pontic marker. Does not quantify fit, occlusal contacts, biological width or connector dimensions.",
		"swatch": Color("#c6d9d0"), "source": ADA_BRIDGES,
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

const ORAL_EXAM := {
	"id": "oral_soft_tissue_observation_intro",
	"scenario": "oral_exam",
	"title": "Oral soft-tissue screening bench",
	"case": "Fictional preassigned oral mucosa teaching fixture · The instructor highlights two locations for a superficial VISUAL OBSERVATION and LOCATION RECORD using a MOUTH MIRROR. The simulated mark is not an oral cancer diagnosis. Identify the assigned model finding and record its location for supervisor review; no lesion classification, risk assessment, palpation, biopsy or patient screening is performed.",
	"tool": {
		"choices": ["tool.examination_mirror", "tool.periodontal_probe"],
		"expected": "tool.examination_mirror",
		"prompt": "Which 3D study instrument is assigned for viewing the model soft-tissue region?",
		"correct": "Correct. This fictional visual-inspection task specifies an intraoral mirror rather than periodontal probing.",
		"incorrect": "The periodontal probe is for a different examination task; do not substitute it for the assigned mirror in this model-only visual observation.",
	},
	"material": {
		"label": "observation record",
		"choices": ["material.soft_tissue_location_record", "material.site_chart"],
		"expected": "material.soft_tissue_location_record",
		"prompt": "Which fictional record matches the assigned soft-tissue finding location and appearance?",
		"correct": "Correct. The soft-tissue location record is for communicating an observation for supervised review; it does not establish a diagnosis.",
		"incorrect": "A tooth-and-site periodontal chart does not replace a soft-tissue observation record in this fictional case.",
	},
	"finish": "Record model finding and location for review",
	"finish_event": "record_soft_tissue_observation",
	"outcome": "Oral soft-tissue screening exercise complete · Both assigned model annotations were verified in the existing chair. These are training markers, not oral-cancer findings, clinical screening results or patient data.",
	"reference": ADA_ORAL_CANCER,
}

const VENEER := {
	"id": "veneer_mock_try_in_intro",
	"scenario": "veneer",
	"title": "Veneer try-in bench",
	"case": "Fictional anterior-teaching-crown case · An instructor supplies a MOCK FACIAL VENEER SHELL and a MATCHED INCISAL-LANDMARK REFERENCE CARD. The two abstract chair actions are to SEAT the model shell and CHECK its incisal marker. This is not a cementation, preparation, colour matching, marginal-fit measurement or patient veneer procedure.",
	"tool": {
		"label": "study object",
		"choices": ["tool.veneer_shell", "tool.examination_mirror"],
		"expected": "tool.veneer_shell",
		"prompt": "Which rotating 3D study object is the mock restoration to be seated in this model-specific try-in?",
		"correct": "Correct. The illustrative facial shell is the assigned model restoration; its form is schematic, not patient-specific.",
		"incorrect": "The mouth mirror is useful for viewing clinical sites but cannot replace the lab-assigned shell that this fictional case asks you to seat.",
	},
	"material": {
		"label": "fit reference",
		"choices": ["material.veneer_fit_reference", "material.site_chart"],
		"expected": "material.veneer_fit_reference",
		"prompt": "Which supplied reference identifies the target shell outline and incisal landmark for this case?",
		"correct": "Correct. The matched fit card supplies the fictional target shell outline and incisal marker without clinical fit measurements.",
		"incorrect": "A periodontal chart describes tooth and site observations; choose the veneer-specific model fitting reference.",
	},
	"finish": "Record mock veneer seating and incisal alignment check",
	"finish_event": "record_veneer_mock_try_in",
	"outcome": "Veneer model try-in complete · The model shell and incisal teaching landmark were recorded and verified through the existing chair scenario. No adhesive bonding, measured margin, clinical fit or real patient outcome is claimed.",
	"reference": ADA_VENEERS,
}

const INLAY := {
	"id": "inlay_mock_indirect_try_in_intro",
	"scenario": "inlay",
	"title": "Indirect inlay try-in bench",
	"case": "Fictional prepared-cavity teaching model · The instructor supplies a MOCK INDIRECT INLAY INSERT and its MATCHED CAVITY-OUTLINE REFERENCE. Seat the insert in the model's prepared outline and verify one indicated outline landmark. This is NOT a patient restoration: internal adaptation, proximal contacts, occlusion, cementation, adhesive bonding and precise marginal gaps are not measured.",
	"tool": {
		"label": "study object",
		"choices": ["tool.inlay_insert", "tool.veneer_shell"],
		"expected": "tool.inlay_insert",
		"prompt": "Which rotating study object is the inlay insert assigned to the prepared cavity of this model?",
		"correct": "Correct. The synthetic stepped inlay represents the fictional indirect insert to be seated in the assigned model outline.",
		"incorrect": "A facial veneer shell covers a different model surface; it does not match this case's specified indirect inlay insert.",
	},
	"material": {
		"label": "fit reference",
		"choices": ["material.inlay_outline_reference", "material.veneer_fit_reference"],
		"expected": "material.inlay_outline_reference",
		"prompt": "Which schematic reference specifies the matched cavity outline and the assigned seating landmark?",
		"correct": "Correct. The inlay outline card gives the two case-specific model reference points, not measured clinical fit.",
		"incorrect": "A veneer incisal-outline card belongs to a different mock restoration. Select the matched cavity-outline reference for this inlay.",
	},
	"finish": "Record mock inlay seating and outline landmark",
	"finish_event": "record_inlay_mock_try_in",
	"outcome": "Indirect inlay model try-in complete · The fictional insert and assigned prepared-outline landmark were marked in the existing chair simulation. No clinical marginal adaptation, adhesive cementation or patient outcome was assessed.",
	"reference": ADA_INLAYS,
}

const CROWN := {
	"id": "crown_mock_full_coverage_try_in_intro",
	"scenario": "crown",
	"title": "Crown try-in bench",
	"case": "Fictional prepared-tooth teaching model · An instructor assigns a MOCK FULL-COVERAGE CROWN and its MATCHED PREPARATION-AND-MARGIN REFERENCE. The model chair asks the learner to SEAT the crown and CHECK a predetermined cervical landmark. This does not simulate a hollow crown's actual fit, tooth preparation, marginal-gap measurement, occlusal adjustment, cementation, or a real patient procedure.",
	"tool": {
		"label": "study object",
		"choices": ["tool.crown_shell", "tool.inlay_insert"],
		"expected": "tool.crown_shell",
		"prompt": "Which rotating 3D model is the specified full-coverage mock restoration for this crown try-in?",
		"correct": "Correct. The assigned schematic crown represents full coverage; its geometry does not reproduce a calibrated fitting surface.",
		"incorrect": "An inlay is a different indirect restoration used within a prepared outline. It is not the full-coverage crown assigned in this fictional case.",
	},
	"material": {
		"label": "fit reference",
		"choices": ["material.crown_fit_reference", "material.inlay_outline_reference"],
		"expected": "material.crown_fit_reference",
		"prompt": "Which assigned study reference identifies the crown preparation and cervical-margin landmark?",
		"correct": "Correct. The crown-specific reference names the model preparation and teaching margin marker, without measured adaptation.",
		"incorrect": "The inlay's cavity-outline reference is a different case. Use the crown's matched preparation and margin marker instead.",
	},
	"finish": "Record crown seating and cervical landmark check",
	"finish_event": "record_crown_mock_try_in",
	"outcome": "Crown model try-in complete · The assigned crown seating and cervical teaching landmark were verified in the existing chair simulation. No clinical fit, margin quality, cementation or patient outcome was assessed.",
	"reference": ADA_CROWNS,
}

const BRIDGE := {
	"id": "bridge_mock_three_unit_try_in_intro",
	"scenario": "bridge",
	"title": "Fixed bridge try-in bench",
	"case": "Fictional three-unit fixed-bridge teaching fixture · The instructor assigns a mock bridge spanning ONE missing tooth between TWO labelled model supports. Identify the BRIDGE STUDY OBJECT and its MATCHED ABUTMENT–PONTIC REFERENCE, then use the unchanged chair to SEAT across supports and CHECK the pontic landmark. This is not clinical cementation, abutment preparation, fit measurement, pontic-tissue assessment or patient treatment.",
	"tool": {
		"label": "study object",
		"choices": ["tool.bridge_framework", "tool.crown_shell"],
		"expected": "tool.bridge_framework",
		"prompt": "Which 3D model is assigned to span the two study supports across the missing-tooth site?",
		"correct": "Correct. The synthetic three-unit framework includes two study support positions and an illustrative central pontic.",
		"incorrect": "The single-unit crown is a different restoration and does not represent the prescribed three-unit bridge in this fictional case.",
	},
	"material": {
		"label": "fit reference",
		"choices": ["material.bridge_support_reference", "material.crown_fit_reference"],
		"expected": "material.bridge_support_reference",
		"prompt": "Which case reference identifies both support units and the pontic landmark for this model try-in?",
		"correct": "Correct. The bridge-specific card identifies the assigned two supports and model pontic target. No clinical adaptation is measured.",
		"incorrect": "The single-crown preparation reference does not identify both model supports and pontic; select the assigned bridge reference.",
	},
	"finish": "Record mock bridge seating and pontic landmark",
	"finish_event": "record_bridge_mock_try_in",
	"outcome": "Fixed bridge model try-in complete · The assigned support-seating action and pontic teaching landmark were verified in the existing chair. No clinical fit, cementation, implant loading or patient outcome was assessed.",
	"reference": ADA_BRIDGES,
}
