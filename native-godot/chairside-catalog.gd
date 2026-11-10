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
const ADA_DENTURES := "https://www.ada.org/resources/ada-library/oral-health-topics/dentures"
const ADA_PARTIAL_DENTURES := "https://www.mouthhealthy.org/all-topics-a-z/dentures-partial"
const ADA_IMPLANTS := "https://www.mouthhealthy.org/all-topics-a-z/implants"
const AAE_ROOT_CANAL := "https://www.aae.org/patients/root-canal-treatment/"
const AAE_RETREATMENT := "https://www.aae.org/patients/root-canal-treatment/endodontic-treatment-options/endodontic-retreatment/"
const AAO_ALIGNERS := "https://aaoinfo.org/treatments/aligners/"
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

	"tool.complete_denture_arch": {
		"name": "Complete removable denture (synthetic 3D arch study object)", "german": "Vollprothese (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/bench/synthetic-complete-denture.tscn",
		"cue": "Original primitive-mesh U-shaped gum ridge and off-white arch teeth, with a posterior blue study landmark. Not a patient-specific prosthesis.",
		"purpose": "Represents the instructor-assigned fictional complete denture arch. The shape is neither calibrated for oral tissues nor suitable to evaluate retention, stability, occlusion or pressure areas.",
		"source": ADA_DENTURES,
	},
	"material.complete_denture_arch_reference": {
		"name": "Matched full-arch seating and posterior-landmark reference", "german": "Vollprothesen-Bogen- und hintere Markierungs-Vorlage",
		"cue": "Illustration · a model-arch map with the assigned posterior marker; no patient impression, bite registration or pressure finding.",
		"purpose": "Identifies the fictional full-arch reference and posterior location to record in this supervised model exercise. No clinical fit or mucosal findings are generated.",
		"swatch": Color("#b5d4c9"), "source": ADA_DENTURES,
	},

	"tool.partial_denture_framework": {
		"name": "Removable partial denture (synthetic 3D teaching framework)", "german": "Teilprothese (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/bench/synthetic-partial-denture.tscn",
		"cue": "Original open U-shaped schematic connector with three replacement-tooth markers and two contrasting clasp/support identifiers. Not a patient-specific framework.",
		"purpose": "Represents an assigned fictional removable partial denture beside retained natural teeth shown in the chair fixture; does not model an actual insertion path, clasp force, tooth contact or mucosal support.",
		"source": ADA_PARTIAL_DENTURES,
	},
	"material.partial_denture_support_reference": {
		"name": "Assigned remaining-teeth and support-landmark diagram", "german": "Teilprothesen-Pfeilerzahn- und Auflage-Markierung (Lehrvorlage)",
		"cue": "Illustration · an assigned partial-denture location record identifying surviving model teeth, planned support sites and a target landmark. Not a clinical working cast.",
		"purpose": "Provides identifiers for the fictional tooth-supported partial framework and its support marker. No retention, pressure, measured seating, occlusion or patient condition is inferred.",
		"swatch": Color("#c3d3ea"), "source": ADA_PARTIAL_DENTURES,
	},

	"tool.implant_crown_study": {
		"name": "Implant-supported crown assembly (synthetic 3D study object)", "german": "Implantatgetragene Krone (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/bench/synthetic-implant-crown.tscn",
		"cue": "Original primitive-mesh study object: a support cylinder, separate neck/abutment band, illustrative crown and a blue interface marker. Not a dimensionally accurate implant connection.",
		"purpose": "Represents the assigned fictional implant-supported restoration and its model interface landmark. Does not demonstrate clinical implant placement, osseointegration, screw torque, abutment compatibility or load transfer.",
		"source": ADA_IMPLANTS,
	},
	"material.implant_site_interface_reference": {
		"name": "Assigned implant site and interface-landmark record (fictional)", "german": "Implantatposition und Verbindungsmarkierung (Lehrvorlage)",
		"cue": "Illustration · a labelled model implant site with one preassigned interface marker. Not a radiograph, patient chart or verified component specification.",
		"purpose": "Links the synthetic implant-supported study crown to its assigned fixture site and teaching interface landmark. No implant-system identification, radiographic diagnosis or clinical fit decision is possible.",
		"swatch": Color("#b8d5dd"), "source": ADA_IMPLANTS,
	},

	"tool.canal_tracing_stylus": {
		"name": "Model canal tracing stylus (synthetic 3D annotation pointer)", "german": "Wurzelkanal-Markierungsstift (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-canal-tracing-stylus.tscn",
		"cue": "Synthetic 3D diagram-tracing stylus with a blue alignment marker; this is a virtual annotation object, not a root canal instrument, file or calibrated probe.",
		"purpose": "Identifies preassigned chamber and canal marks in a fictional teaching diagram. Does not model insertion into a tooth, working length, canal anatomy, instrumentation, irrigation or obturation.",
		"source": AAE_ROOT_CANAL,
	},
	"material.assigned_canal_diagram": {
		"name": "Assigned schematic chamber and canal tracing map", "german": "Zugeordnetes Pulpenkammer- und Wurzelkanal-Schema",
		"cue": "Illustration · a fictional single-canal tracing card with predetermined chamber and canal markers; not a radiograph, treatment plan or actual anatomy.",
		"purpose": "Names the two teacher-specified virtual tracing targets, without suggesting a clinical canal count, morphology, working length or diagnosis.",
		"swatch": Color("#c1c9e7"), "source": AAE_ROOT_CANAL,
	},

	"tool.record_comparison_pointer": {
		"name": "Prior/current record comparison pointer (synthetic 3D teaching object)", "german": "Vorher-Nachher-Befundvergleich-Zeiger (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-record-comparison-pointer.tscn",
		"cue": "Original two-headed model pointer with contrasting prior/current markers. It annotates schematic record panels; not an endodontic file, radiograph reader or diagnostic instrument.",
		"purpose": "Selects two preassigned locations in a fictional before-and-after diagram. Cannot assess healing, pathology, treatment quality or indications for actual retreatment.",
		"source": AAE_RETREATMENT,
	},
	"material.assigned_prior_current_record": {
		"name": "Matched fictional prior/current endodontic record pair", "german": "Zugeordnetes Vor- und Nachbefund-Schema (Lehrvorlage)",
		"cue": "Illustration · a paired prior and current teaching record with one assigned model reference and one instructor-flagged discrepancy. Not patient radiographs or a clinical finding.",
		"purpose": "Identifies the historical reference and instructor-specified discrepancy in this case, without diagnosing failure, infection, healing or whether treatment is necessary.",
		"swatch": Color("#bec5dc"), "source": AAE_RETREATMENT,
	},

	"tool.aligner_stage04_tray": {
		"name": "Fictional stage-04 clear aligner tray (synthetic 3D study object)", "german": "Aligner-Schiene, Modellstufe 04 (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/bench/synthetic-aligner-stage04.tscn",
		"cue": "Original U-shaped, translucent teaching tray with four blue stage markers. This numbered learning fixture is not an impression, scan, prescribed aligner or patient-specific polymer shell.",
		"purpose": "Identifies the assigned simulated stage 04 among case choices, without predicting tooth movement, attachment fit, actual seating, biomechanics, wear schedule or treatment.",
		"source": AAO_ALIGNERS,
	},
	"material.assigned_aligner_stage04_plan": {
		"name": "Instructor-assigned stage-04 and matching arch diagram", "german": "Zugeordnete Aligner-Stufe 04 und Zahnmodell-Schema",
		"cue": "Illustration · the fictional arch and stage number 04 are preassigned; no patient record, scan, orthodontic prescription or clinical treatment sequence.",
		"purpose": "Connects a model-only aligner stage identifier to the chair's two preset learning targets; it does not assess tooth movement or seating accuracy.",
		"swatch": Color("#b5dcea"), "source": AAO_ALIGNERS,
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

const FULL_DENTURE := {
	"id": "complete_denture_mock_arch_fitting_intro",
	"scenario": "full_denture",
	"title": "Complete denture fitting bench",
	"case": "Fictional complete removable-denture teaching fixture · The instructor assigns a MODEL DENTURE ARCH and a MATCHED FULL-ARCH REFERENCE. Identify the simulated removable arch rather than a fixed bridge, then enter the unchanged chair to SEAT the COMPLETE ARCH and CHECK a POSTERIOR TEACHING LANDMARK. This exercise cannot measure fit, retention, stability, pressure areas, occlusion, speech, function or patient outcomes.",
	"tool": {
		"label": "study object",
		"choices": ["tool.complete_denture_arch", "tool.bridge_framework"],
		"expected": "tool.complete_denture_arch",
		"prompt": "Which rotating 3D study object is the removable full-arch model, not a fixed three-unit bridge?",
		"correct": "Correct. The schematic U-shaped denture represents the instructor-assigned complete removable arch. It is not clinically fitted.",
		"incorrect": "The fixed three-unit bridge spans a local missing-tooth space; it is not the complete removable arch assigned in this model-only exercise.",
	},
	"material": {
		"label": "arch reference",
		"choices": ["material.complete_denture_arch_reference", "material.bridge_support_reference"],
		"expected": "material.complete_denture_arch_reference",
		"prompt": "Which supplied study reference identifies the full arch and its posterior landmark?",
		"correct": "Correct. The matching arch card identifies the simulated posterior study location, without a tissue or pressure finding.",
		"incorrect": "The bridge-support reference identifies two abutments and a pontic for a fixed restoration, not this complete-denture arch.",
	},
	"finish": "Record simulated full-arch seating and posterior landmark",
	"finish_event": "record_complete_denture_mock_fitting",
	"outcome": "Complete denture model-fitting exercise complete · The assigned full-arch seating and posterior teaching landmark were verified in the existing chair simulation. No retention, pressure-area, occlusal, clinical-fit or patient outcome was assessed.",
	"reference": ADA_DENTURES,
}

const PARTIAL_DENTURE := {
	"id": "partial_denture_mock_support_fitting_intro",
	"scenario": "partial_denture",
	"title": "Removable partial denture fitting bench",
	"case": "Fictional tooth-supported removable-partial-denture teaching fixture · The instructor assigns a PARTIAL DENTURE FRAMEWORK with replacement-tooth markers for a model that RETAINS NATURAL TEETH, plus a MATCHED SUPPORT-LANDMARK REFERENCE. Compare this partial framework to a complete arch, then SEAT the model beside remaining teeth and CHECK the assigned SUPPORT MARKER using the unchanged chair. No insertion path, clasp retention, pressure areas, clinical fit, tissue support, occlusion or real patient care is evaluated.",
	"tool": {
		"label": "study object",
		"choices": ["tool.partial_denture_framework", "tool.complete_denture_arch"],
		"expected": "tool.partial_denture_framework",
		"prompt": "Which rotating 3D study object belongs to the model with retained natural teeth and selected replacement-tooth sites?",
		"correct": "Correct. The open synthetic partial framework represents the assigned removable appliance beside remaining model teeth. Its clasps are illustrative only.",
		"incorrect": "The complete denture replaces a full arch and does not correspond to this fictional model with remaining natural teeth.",
	},
	"material": {
		"label": "support reference",
		"choices": ["material.partial_denture_support_reference", "material.complete_denture_arch_reference"],
		"expected": "material.partial_denture_support_reference",
		"prompt": "Which assigned study record identifies the remaining model teeth and the planned support landmark?",
		"correct": "Correct. The partial-denture reference labels the retained-teeth sites and one fictional support marker; it does not quantify real fit or clasp force.",
		"incorrect": "A complete-denture full-arch reference omits the retained teeth and support marker assigned to this particular partial appliance.",
	},
	"finish": "Record simulated partial seating and support landmark",
	"finish_event": "record_partial_denture_mock_fitting",
	"outcome": "Removable partial denture model-fitting exercise complete · Seating beside the model's retained teeth and the assigned support landmark were recorded in the existing chair simulation. No retention, clasp force, support quality, clinical fit or patient outcome was assessed.",
	"reference": ADA_PARTIAL_DENTURES,
}

const IMPLANT := {
	"id": "implant_mock_restoration_site_review_intro",
	"scenario": "implant",
	"title": "Implant restoration review bench",
	"case": "Fictional implant-restoration inspection fixture · An instructor assigns a SCHEMATIC IMPLANT-SUPPORTED CROWN ASSEMBLY and MATCHED SITE-AND-INTERFACE RECORD. Match the study restoration to the designated implant site and mark the provided interface landmark in the unchanged chair. This is not implant surgery, torque selection, clinical abutment fitting, radiographic interpretation, occlusal loading or a treatment recommendation.",
	"tool": {
		"label": "study object",
		"choices": ["tool.implant_crown_study", "tool.crown_shell"],
		"expected": "tool.implant_crown_study",
		"prompt": "Which 3D study object includes the model implant support, abutment marker and crown assigned to this fixture?",
		"correct": "Correct. The synthetic implant-crown assembly includes a marked implant-interface study region. It is not a calibrated component connection.",
		"incorrect": "The single-crown shell represents a different model-only restoration and does not carry the implant support/interface annotation for this assigned task.",
	},
	"material": {
		"label": "site reference",
		"choices": ["material.implant_site_interface_reference", "material.crown_fit_reference"],
		"expected": "material.implant_site_interface_reference",
		"prompt": "Which fictional reference identifies the assigned implant fixture site and its interface landmark?",
		"correct": "Correct. The case reference links the simulated implant site to the marker to be recorded; it does not establish a clinical fit.",
		"incorrect": "A crown margin reference for a different restoration does not identify the assigned implant site and interface landmark.",
	},
	"finish": "Record simulated implant-site match and interface landmark",
	"finish_event": "record_implant_mock_site_review",
	"outcome": "Implant restoration model review complete · The assigned site match and interface study marker were recorded with the existing chair. No implant-system compatibility, screw torque, osseointegration, loading, clinical fit or patient outcome was assessed.",
	"reference": ADA_IMPLANTS,
}

const ENDO := {
	"id": "endo_mock_chamber_canal_map_review_intro",
	"scenario": "endo",
	"title": "Root canal model review bench",
	"case": "Fictional instructor-assigned ROOT CANAL DIAGRAM review · The supplied schematic shows ONE PREMARKED CHAMBER and ONE PREMARKED CANAL path. Select the diagram tracing stylus and the ASSIGNED CANAL MAP; then trace the chamber and assigned canal markers in the unchanged chair. This is not root canal therapy, working-length determination, anatomical identification, instrumentation, irrigation, obturation, diagnosis or a real patient record.",
	"tool": {
		"label": "study pointer",
		"choices": ["tool.canal_tracing_stylus", "tool.image_pointer"],
		"expected": "tool.canal_tracing_stylus",
		"prompt": "Which rotating 3D study pointer is specifically assigned to trace the fictional chamber and canal markers?",
		"correct": "Correct. The labelled synthetic tracing stylus marks the preassigned schematic canal; it is not an endodontic hand file or clinical probe.",
		"incorrect": "The image pointer belongs to the separate bitewing-diagram lesson and does not represent the assigned canal tracing tool in this case.",
	},
	"material": {
		"label": "canal reference",
		"choices": ["material.assigned_canal_diagram", "material.assigned_bitewing_image"],
		"expected": "material.assigned_canal_diagram",
		"prompt": "Which supplied fictional reference contains the two preassigned chamber and canal tracing locations?",
		"correct": "Correct. The assigned model canal diagram shows the teaching targets, not a clinical canal morphology or length.",
		"incorrect": "The simulated bitewing image marks proximal surfaces and overlap, not the preassigned chamber/canal targets.",
	},
	"finish": "Record fictional chamber and canal map tracing",
	"finish_event": "record_endo_mock_canal_map_review",
	"outcome": "Root canal diagram review complete · The two assigned schematic markers were recorded in the original chair exercise. No real root anatomy, treatment, canal preparation, working length, diagnosis or patient outcome was assessed.",
	"reference": AAE_ROOT_CANAL,
}

const RETREAT := {
	"id": "retreat_mock_prior_current_record_review_intro",
	"scenario": "retreat",
	"title": "Endodontic retreatment record review bench",
	"case": "Fictional instructor-supplied PRIOR/CURRENT RECORD COMPARISON · One prior-model landmark and one current-panel discrepancy are PREMARKED on a synthetic worksheet. Select the two-panel annotation pointer and the paired reference card, then mark the prior landmark and flag the assigned discrepancy in the unchanged chair. The exercise does not determine treatment failure, pathology, healing, retreatment indications, clinical radiographic findings, or patient care.",
	"tool": {
		"label": "study pointer",
		"choices": ["tool.record_comparison_pointer", "tool.canal_tracing_stylus"],
		"expected": "tool.record_comparison_pointer",
		"prompt": "Which rotating model pointer identifies both prior and current record panels rather than a single assigned canal path?",
		"correct": "Correct. The double-marker synthetic pointer identifies the two teacher-labelled panels; it is not a diagnostic instrument.",
		"incorrect": "The canal tracing stylus belongs to a single-diagram exercise. This case requires comparing two instructor-assigned record panels.",
	},
	"material": {
		"label": "record reference",
		"choices": ["material.assigned_prior_current_record", "material.assigned_canal_diagram"],
		"expected": "material.assigned_prior_current_record",
		"prompt": "Which fictional reference pairs the prior model panel with the current panel and its preflagged discrepancy?",
		"correct": "Correct. The matched two-panel worksheet identifies the assigned reference and discrepancy. It is not a patient radiograph or diagnosis.",
		"incorrect": "The single-canal schematic does not contain both prior and current record panels. Use the matched comparison worksheet.",
	},
	"finish": "Record fictional prior landmark and current discrepancy",
	"finish_event": "record_retreat_mock_record_comparison",
	"outcome": "Endodontic record-comparison exercise complete · The supplied prior model landmark and instructor-preflagged current discrepancy were marked in the existing chair. No radiographic diagnosis, pathology, retreatment decision, clinical result or patient outcome was assessed.",
	"reference": AAE_RETREATMENT,
}

const ALIGNER := {
	"id": "aligner_mock_stage04_fit_review_intro",
	"scenario": "aligner",
	"title": "Clear aligner stage matching bench",
	"case": "Fictional orthodontic teaching fixture · The instructor has PREASSIGNED STAGE 04 of a schematic clear-aligner sequence to a matching model arch. Choose the stage-marked ALIGNER STUDY TRAY rather than a complete denture, select its matching stage-and-arch diagram, and use the original chair to SEAT the assigned model stage and CHECK its fixed seating landmark. No clinical fit, aligner force, attachment engagement, tooth movement, wear schedule, treatment plan or patient outcome is assessed.",
	"tool": {
		"label": "study appliance",
		"choices": ["tool.aligner_stage04_tray", "tool.complete_denture_arch"],
		"expected": "tool.aligner_stage04_tray",
		"prompt": "Which rotating 3D model represents the instructor-assigned removable stage-04 aligner, not a complete denture?",
		"correct": "Correct. The light-blue teaching tray carries four stage identifiers and belongs to the fictional matching arch exercise.",
		"incorrect": "A complete denture replaces an arch of missing teeth; it is not the assigned stage-04 model aligner.",
	},
	"material": {
		"label": "stage reference",
		"choices": ["material.assigned_aligner_stage04_plan", "material.complete_denture_arch_reference"],
		"expected": "material.assigned_aligner_stage04_plan",
		"prompt": "Which instructor-issued reference matches the schematic arch with stage 04?",
		"correct": "Correct. The assigned stage-04 map names the fictional arch and seating marker without prescribing orthodontic treatment.",
		"incorrect": "The complete-denture arch reference has no assigned aligner stage or seating marker for this model task.",
	},
	"finish": "Record assigned aligner stage and model seating landmark",
	"finish_event": "record_aligner_mock_stage04_review",
	"outcome": "Clear aligner stage matching complete · The assigned teaching stage and fixed seating landmark were verified in the existing chair simulation. No orthodontic biomechanics, fit measurement, tooth movement, treatment planning or patient outcome was assessed.",
	"reference": AAO_ALIGNERS,
}
