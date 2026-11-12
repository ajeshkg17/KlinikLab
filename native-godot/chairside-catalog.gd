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
const ADA_MOUTHGUARDS := "https://www.mouthhealthy.org/all-topics-a-z/mouthguards"
const ADA_EXTRACTIONS := "https://www.mouthhealthy.org/all-topics-a-z/extractions"
const ITEMS := {
	"tool.sectional_matrix_placement_forceps": {
		"name": "Sectional matrix ring placement forceps (schematic 3D study)",
		"german": "Matrizenringzange / Ringseparierzange (3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-sectional-matrix-forceps.tscn",
		"cue": "Original simplified 3D forceps with paired ring-engagement beaks, representing the family used to handle a sectional matrix separation ring.",
		"purpose": "The instructor-assigned instrument-family recognition model. This is not a patient-safe placement tool and no ring spreading, contact formation or actual restoration is simulated.",
		"source": ADA_MATERIALS,
	},
	"tool.rubber_dam_clamp_forceps_alternative": {
		"name": "Rubber dam clamp forceps (schematic 3D alternative)",
		"german": "Kofferdam-Klammerzange (3D-Vergleichsmodell)",
		"scene": "res://assets/inventory/synthetic-rubber-dam-clamp-forceps.tscn",
		"cue": "Original schematic clamp-placement forceps, visually similar but intended for engaging a rubber-dam clamp instead of a sectional matrix separation ring.",
		"purpose": "A real different dental instrument family, but not the one assigned for this fictional matrix ring identification task. Does not demonstrate clinical clamp handling.",
		"source": ADA_MATERIALS,
	},
	"material.sectional_matrix_ring_reference": {
		"name": "Instructor's sectional matrix ring and tooth-contact diagram key (fictional)",
		"german": "Lehrkarte: Teilmatrizenring und Kontaktpunkt-Modellmarkierung",
		"cue": "Illustration · pale teal instructor card labels a sectional matrix ring and its assigned posterior model contact-region marker; no clinical gap measurement.",
		"purpose": "A fictional identity/diagram-label reference for this assigned instrument family. The original composite chair still shows a virtual defect and restoration site, not actual matrix-ring placement.",
		"swatch": Color("#abd6d4"), "source": ADA_MATERIALS,
	},
	"material.rubber_dam_clamp_reference": {
		"name": "Rubber dam clamp positioning diagram key (fictional alternative)",
		"german": "Lehrkarte: Kofferdamklammer und Isolationsbereich (Vergleich)",
		"cue": "Illustration · soft orange study card denotes a rubber dam clamp and isolation fixture, not a sectional matrix ring.",
		"purpose": "Plausible for a different model-isolation exercise, but not the assigned sectional matrix forceps and reference task. No physical isolation or patient treatment.",
		"swatch": Color("#edc8a7"), "source": ADA_MATERIALS,
	},
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
	"tool.nabers_furcation_study": {
		"name": "Curved Nabers furcation probe (schematic 3D study)", "german": "Nabers-Furkationssonde (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-nabers-furcation-probe.tscn",
		"cue": "Original rotating study geometry: pronounced curving terminal arm with a rounded noncalibrated tip, no anatomical insertion.",
		"purpose": "Instructor-assigned instrument silhouette for recognising a Nabers probe. No true furcation penetration, classification, force or clinical measurement.",
		"source": ADA_CHART,
	},
	"tool.unc15_furcation_distractor": {
		"name": "UNC-15 pocket probe (schematic 3D alternative)", "german": "UNC-15-Parodontalsonde (schematisches Vergleichsmodell)",
		"scene": "res://assets/inventory/synthetic-unc15-periodontal-probe.tscn",
		"cue": "Original study model: straighter shank and fifteen decorative graduation marks, not the curved Nabers study tip.",
		"purpose": "Recognise a different periodontal instrument; uncalibrated marks do not measure pocket depths.",
		"source": ADA_CHART,
	},
	"material.assigned_furcation_locator": {
		"name": "Instructor-assigned furcation-reference location key (fictional)",
		"german": "Zugeordnete Furkations-Lokalisationsvorlage (Lehrmodell)",
		"cue": "Illustration · turquoise card identifying exactly two assigned left/right model markers; not an image or patient record.",
		"purpose": "The case-specific key for the two highlighted locations in the EXISTING chart chair, not a representation of furcation anatomy, attachment loss, probing depths or classification.",
		"swatch": Color("#a6d5ce"), "source": ADA_CHART,
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

	"tool.bitewing_receptor_holder_study": {
		"name": "Bitewing receptor holder (schematic 3D study)", "german": "Bissflügel-Sensorhalter (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-bitewing-receptor-holder.tscn",
		"cue": "Original red-pattern bitewing holder silhouette with a horizontal receptor-grip and illustrated biteblock.",
		"purpose": "The case-assigned holder identity for a simulated bitewing setup. This model cannot guide actual sensor placement, radiation exposure or safe beam alignment.",
		"source": ADA_XRAYS,
	},
	"tool.endo_receptor_holder_study": {
		"name": "Endodontic receptor holder (schematic 3D study)", "german": "Endodontischer Sensorhalter (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-endo-radiograph-holder.tscn",
		"cue": "Different green-pattern endodontic holder silhouette with study space for an endodontic working instrument.",
		"purpose": "A valid different equipment family but not this case's assigned bitewing holder; no actual endodontic X-ray acquisition or placement guidance.",
		"source": ADA_XRAYS,
	},
	"material.bitewing_receptor_reference_key": {
		"name": "Assigned bitewing holder and two-region image key (fictional)",
		"german": "Bissflügel-Sensorhalter- und Bildstellen-Vorlage (Lehrkarte)",
		"cue": "Illustration · pale blue instructor card labelling the BITEWING study holder plus the two existing image-region targets: proximal marker and unreadable overlap.",
		"purpose": "This case-specific location key links an assigned model holder with two simulated bitewing image regions. No X-ray exposure, actual receptor position, patient chart or diagnostic inference.",
		"swatch": Color("#b7dbe9"), "source": ADA_XRAYS,
	},
	"material.endodontic_apical_reference_key": {
		"name": "Endodontic apical image-location key (fictional alternative)",
		"german": "Endodontische apikale Bildreferenz-Vorlage (Vergleichskarte)",
		"cue": "Illustration · warm orange endodontic apical-location reference rather than a bitewing proximal overlap diagram.",
		"purpose": "A plausible reference for a different simulated radiography case; not the instructor's assigned bitewing holder and two-region key.",
		"swatch": Color("#e6c9a7"), "source": ADA_XRAYS,
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

	"tool.wax_occlusion_rim_study": {
		"name": "Wax occlusion rim on denture baseplate (schematic 3D study)", "german": "Wachsbisswall / Bissschablone (3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-bite-registration-wax-rim.tscn",
		"cue": "Recognise an arch-shaped wax rim on a simple baseplate without individual prosthetic tooth crowns, unlike the completed full-arch denture.",
		"purpose": "A plausible different prosthodontic laboratory stage, but not the completed denture object assigned for this case. No jaw-relation measurement, vertical dimension, patient anatomy or actual wax record.",
		"source": ADA_DENTURES,
	},
	"material.finished_denture_posterior_key": {
		"name": "Instructor's completed-denture arch and posterior target key (fictional)",
		"german": "Lehrkarte: Vollprothese und hintere Modellmarkierung",
		"cue": "Illustration · blue-green completed-denture model arch and instructor-designated posterior landmark; no patient records or fitting evidence.",
		"purpose": "The case-specific key for matching the completed denture study arch and posterior teaching marker in the original full-denture chair.",
		"swatch": Color("#b0d6d0"), "source": ADA_DENTURES,
	},
	"material.wax_rim_jaw_relation_key": {
		"name": "Wax-rim jaw-relation record reference (fictional alternative)",
		"german": "Lehrkarte: Bisswall und Kieferrelationsregistrat (Vergleich)",
		"cue": "Illustration · amber record-making reference for a wax-rim study, rather than a finished full-arch denture.",
		"purpose": "Plausible reference for a different laboratory learning exercise. Does not represent the completed-denture and posterior landmark assigned here.",
		"swatch": Color("#e4c5a0"), "source": ADA_DENTURES,
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

	"tool.hand_h_file_recognition": {
		"name": "Hedström hand file (schematic 3D study)", "german": "Hedström-Handfeile / H-Feile (3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-hedstrom-h-file.tscn",
		"cue": "A short colored finger grip and long simplified fluted manual-file silhouette distinguish this H-file study object from a motor-driven file.",
		"purpose": "The instructor-assigned visual identification prop. It never enters a tooth or simulates cutting, ISO size, taper, sterility, canal instrumentation or treatment.",
		"source": AAE_ROOT_CANAL,
	},
	"tool.niti_rotary_file_alternative": {
		"name": "NiTi rotary endodontic file (schematic 3D alternative)", "german": "NiTi-Maschinenfeile / rotierende Wurzelkanalfeile (3D-Lehrmodell)",
		"scene": "res://assets/inventory/synthetic-niti-rotary-file.tscn",
		"cue": "A compact motor-latch connector and a study-tapered flute pattern distinguish this separate rotary-file family from the H-file finger handle.",
		"purpose": "Plausible different endodontic instrument, but not the manual H-file silhouette the fictional instructor assigned. No rotation, torque calibration or actual canal preparation.",
		"source": AAE_ROOT_CANAL,
	},
	"material.manual_file_canal_reference": {
		"name": "Instructor's manual H-file and two-location canal diagram key (fictional)",
		"german": "Lehrkarte: Handfeile und zwei Wurzelkanal-Referenzstellen",
		"cue": "Illustration · pale lavender instructor card with the assigned MANUAL FILE identity plus two chamber/canal diagram target markers.",
		"purpose": "Fictional pairing of an instrument-recognition exercise with two existing schematic diagram markers. Not a length measurement, canal path, technique or patient record.",
		"swatch": Color("#c7c3e3"), "source": AAE_ROOT_CANAL,
	},
	"material.rotary_file_reference_alternative": {
		"name": "Rotary NiTi file motor setup reference (fictional alternative)",
		"german": "Lehrkarte: Rotierende NiTi-Maschinenfeile (Vergleich)",
		"cue": "Illustration · muted turquoise rotary-motor reference card, not the assigned manual-file and chamber/canal label key.",
		"purpose": "Belongs to a different imaginary rotary-file exercise; no RPM, torque, actual motor use, clinical preparation or imaging.",
		"swatch": Color("#afd4cf"), "source": AAE_ROOT_CANAL,
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

	"tool.sports_mouthguard_study": {
		"name": "Upper-arch sports mouthguard (synthetic 3D study object)", "german": "Sportmundschutz für den Oberkiefer (schematisches Lehrmodell)",
		"scene": "res://assets/bench/synthetic-sports-mouthguard.tscn",
		"cue": "Original thick opaque U-shaped training guard with raised outer rim, broad occlusal training pads and a contrasting assigned coverage marker. Not a manufactured, fitted protective device.",
		"purpose": "Distinguishes the instructor-assigned mock upper-arch sports guard from the thinner stage-marked clear-aligner teaching tray. Does not establish actual impact attenuation, material thickness, retention, occlusion or safety.",
		"source": ADA_MOUTHGUARDS,
	},
	"material.mouthguard_upper_arch_reference": {
		"name": "Assigned upper-arch guard and coverage-landmark diagram", "german": "Oberkiefer-Sportmundschutz und Abdeckungsmarkierung (Lehrvorlage)",
		"cue": "Illustration · a fictional upper-arch map highlighting the teacher-assigned seating and coverage points. Not a dental scan, fitting record or protection certificate.",
		"purpose": "Identifies the simulated arch and target coverage marker in the preassigned chair task. No clinical fit, wearing comfort or protective performance is evaluated.",
		"swatch": Color("#ecd2b2"), "source": ADA_MOUTHGUARDS,
	},

	"tool.training_forceps_study": {
		"name": "Model extraction forceps (synthetic 3D teaching object)", "german": "Modell-Extraktionszange (schematisches 3D-Lehrmodell)",
		"scene": "res://assets/bench/synthetic-training-forceps.tscn",
		"cue": "Original oversized blunt model jaws with pivot and two schematic handles. This is not a working forceps, sterile instrument, torque model or procedure demonstration.",
		"purpose": "Identifies the instructor-assigned fictional forceps model for an abstract extraction setup; does not represent root anatomy, grip forces, leverage, tissue injury or surgical technique.",
		"source": ADA_EXTRACTIONS,
	},
	"material.assigned_extraction_tooth_and_adjacent_record": {
		"name": "Instructor-assigned model tooth and two-adjacent-tooth checklist", "german": "Zugeordneter Modellzahn und Nachbarzahn-Checkliste (Lehrvorlage)",
		"cue": "Illustration · a fictional ID for one assigned model tooth and separate labels for its two neighbours. Not a patient chart, consent, radiograph or clinical tooth verification.",
		"purpose": "Links the existing chair's target tooth and two adjacent-check landmarks to a teacher-specified exercise sheet. Does not verify a real surgical site or predict outcome.",
		"swatch": Color("#e3c4b7"), "source": ADA_EXTRACTIONS,
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


const MATRIX_FORCEPS := {
	"id": "sectional_matrix_vs_rubber_dam_forceps_intro",
	"scenario": "composite",
	"title": "Sectional matrix versus rubber-dam clamp forceps bench",
	"case": "FICTIONAL assistant tray-preparation and diagram-label recognition task · The instructor specifies a SECTIONAL MATRIX RING PLACEMENT FORCEPS study object, rather than RUBBER-DAM CLAMP FORCEPS, for a posterior composite illustration. Compare and rotate two preexisting 3D instrument silhouettes, select the instructor's MATRIX RING DIAGRAM KEY rather than an isolation-clamp reference, and enter the UNCHANGED composite chair to REMOVE the marked virtual defect and PLACE virtual composite. The chair does NOT physically simulate matrix-ring engagement, ring separation, contact shaping or rubber-dam isolation. There is no real tooth, patient, working instrument, clinical restoration, or material placement outcome.",
	"tool": {
		"label": "matrix placement instrument study",
		"choices": ["tool.sectional_matrix_placement_forceps", "tool.rubber_dam_clamp_forceps_alternative"],
		"expected": "tool.sectional_matrix_placement_forceps",
		"prompt": "Which rotatable study forceps was assigned for identifying a sectional matrix separation ring, not a rubber-dam clamp?",
		"correct": "Correct. This schematic instrument represents sectional matrix ring placement forceps; no ring manipulation is modeled.",
		"incorrect": "The rubber-dam clamp forceps belong to isolation tasks. This instructor assigned the separate sectional matrix ring forceps.",
	},
	"material": {
		"label": "assigned matrix-ring diagram key",
		"choices": ["material.sectional_matrix_ring_reference", "material.rubber_dam_clamp_reference"],
		"expected": "material.sectional_matrix_ring_reference",
		"prompt": "Which instructor reference card matches the sectional matrix instrument family and assigned restoration diagram?",
		"correct": "Correct. The matrix ring teaching card identifies the assigned component without simulating placement or a patient contact.",
		"incorrect": "The rubber-dam clamp card depicts a different isolation instrument. It is not the specified sectional matrix reference.",
	},
	"finish": "Record sectional matrix forceps identity and composite model labels",
	"finish_event": "record_sectional_matrix_forceps_recognition",
	"outcome": "Sectional matrix instrument recognition complete · The unchanged composite chair verified the two prescribed virtual restoration diagram actions. No matrix ring placement, contact point formation, rubber dam isolation, clinical restoration, or patient treatment was performed.",
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


const FURCATION := {
	"id": "furcation_model_landmark_review_intro",
	"scenario": "chart",
	"title": "Furcation probe and model-site recording bench",
	"case": "FICTIONAL teaching-arch recognition exercise · The instructor labels two generic chart-fixture model landmarks LEFT and RIGHT as furcation-reference LOCATIONS. Identify the curved NABERS STUDY PROBE rather than the UNC-15 POCKET PROBE, select the ASSIGNED TWO-SITE LOCATOR KEY, and enter the UNCHANGED periodontal chart chair to record its two model site markers. That chair is NOT a furcation anatomy model. No patient tooth, horizontal probe passage, pocket depth, classification, periodontal finding, intervention or clinical competence is assessed.",
	"tool": {
		"label": "probe study model",
		"choices": ["tool.nabers_furcation_study", "tool.unc15_furcation_distractor"],
		"expected": "tool.nabers_furcation_study",
		"prompt": "Which rotatable 3D model matches the instructor's curved Nabers furcation probe rather than a pocket-depth style probe?",
		"correct": "Correct. The curved study shape represents the Nabers instrument family. It does not measure any real furcation.",
		"incorrect": "The UNC-15 carries illustrative straight-shank marks; this instructor assigned the curved Nabers study model.",
	},
	"material": {
		"label": "site locator key",
		"choices": ["material.assigned_furcation_locator", "material.site_chart"],
		"expected": "material.assigned_furcation_locator",
		"prompt": "Which fictional record explicitly identifies the instructor's two assigned model reference locations for this bench?",
		"correct": "Correct. The custom locator key identifies the LEFT and RIGHT model markers without claiming clinical findings.",
		"incorrect": "A general periodontal chart serves another lesson; it does not provide this fictional instructor's two assigned site identifiers.",
	},
	"finish": "Record the two assigned furcation-reference model locations",
	"finish_event": "record_furcation_model_reference_locations",
	"outcome": "Furcation-reference location recognition complete · The unchanged chart chair verified two generic model locations. No actual furcation anatomy, grade, pocket depth, probing force, diagnosis or treatment outcome was evaluated.",
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


const BITEWING_HOLDER := {
	"id": "bitewing_receptor_holder_reference_intro",
	"scenario": "bitewing",
	"title": "Bitewing sensor holder and image reference bench",
	"case": "FICTIONAL assistant preparation and IMAGE-DIAGRAM exercise · The instructor assigns a BITEWING HOLDER MODEL (not an endodontic periapical holder) and an illustrated TWO-REGION BITEWING REFERENCE KEY. Compare the two rotatable 3D study holders, select the assigned card, then reuse the EXISTING bitewing image-review chair to identify the specified proximal model region and FLAG a deliberately overlapping region as unreadable. There is no actual X-ray image, sensor placement, radiation exposure, tube positioning, vertical or horizontal angulation, overlap prediction, caries diagnosis, patient record or clinical competency assessment.",
	"tool": {
		"label": "receptor holder study model",
		"choices": ["tool.bitewing_receptor_holder_study", "tool.endo_receptor_holder_study"],
		"expected": "tool.bitewing_receptor_holder_study",
		"prompt": "Which rotatable study model matches the instructor-assigned bitewing receptor holder rather than the endodontic holder?",
		"correct": "Correct. The bitewing holder study has a distinct biteblock and receptor shape; this does not demonstrate positioning or exposure safety.",
		"incorrect": "The contrasting endodontic holder represents a different receptor-holding task; the fictional assignment specifies a bitewing holder.",
	},
	"material": {
		"label": "assigned image location key",
		"choices": ["material.bitewing_receptor_reference_key", "material.endodontic_apical_reference_key"],
		"expected": "material.bitewing_receptor_reference_key",
		"prompt": "Which instructor-made key connects the selected bitewing study holder to the two image-region markers in the existing simulation?",
		"correct": "Correct. The two-region bitewing key identifies the proximal reference marker and the intentionally unreadable overlap zone.",
		"incorrect": "The apical endodontic reference belongs to another simulated case and does not identify these bitewing diagram regions.",
	},
	"finish": "Record bitewing model-holder selection and two image-region labels",
	"finish_event": "record_bitewing_holder_and_image_reference",
	"outcome": "Bitewing holder identification and reference review complete · The unchanged bitewing chair verified the two assigned image-diagram actions, including one region that must be flagged unreadable. No real radiographic placement, exposure, diagnostic interpretation or patient treatment was performed.",
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


const DENTURE_VS_WAX_RIM := {
	"id": "complete_denture_vs_wax_rim_recognition_intro",
	"scenario": "full_denture",
	"title": "Completed denture versus wax bite rim recognition bench",
	"case": "FICTIONAL prosthodontic study-object identification · The instructor assigned a FINISHED FULL-DENTURE MODEL with a posterior reference marker, NOT a wax occlusion rim used as a separate jaw-relation record stage. Rotate the TWO ORIGINAL 3D STUDY OBJECTS and select the finished denture, then select its matching posterior marker key. Enter the UNCHANGED full-denture chair to SEAT THE COMPLETE MODEL ARCH and CHECK ITS POSTERIOR TEACHING LANDMARK. No impression, actual jaw relation, vertical dimension, functional fit, retention, occlusal assessment, patient anatomy, treatment or clinical competence is represented.",
	"tool": {
		"label": "prosthodontic 3D study object",
		"choices": ["tool.complete_denture_arch", "tool.wax_occlusion_rim_study"],
		"expected": "tool.complete_denture_arch",
		"prompt": "Which rotatable study model is the completed full-arch denture, rather than a wax bite rim on a record base?",
		"correct": "Correct. The complete denture study shows a full arch of prosthetic teeth; the wax rim represents a different laboratory stage.",
		"incorrect": "The wax occlusion rim is an illustrative jaw-relation record base and is not the completed full-arch denture assigned here.",
	},
	"material": {
		"label": "assigned finished-denture marker key",
		"choices": ["material.finished_denture_posterior_key", "material.wax_rim_jaw_relation_key"],
		"expected": "material.finished_denture_posterior_key",
		"prompt": "Which instructor card links the completed denture arch to the posterior model landmark checked in this case?",
		"correct": "Correct. This card identifies the assigned finished-arch and its fictional posterior teaching marker.",
		"incorrect": "The wax-rim jaw-relation reference belongs to a different laboratory stage, not the assigned complete-denture model check.",
	},
	"finish": "Record completed-denture identity and posterior model landmark",
	"finish_event": "record_finished_denture_vs_wax_rim_review",
	"outcome": "Completed-denture model identification and reference review complete · The unchanged full-denture chair verified the preassigned full arch and posterior diagram landmark. No patient fit, retention, jaw-relation measurement, occlusion, treatment or clinical outcome was assessed.",
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


const ENDO_FILE := {
	"id": "endo_manual_file_canal_reference_intro",
	"scenario": "endo",
	"title": "Manual H-file recognition and canal diagram bench",
	"case": "FICTIONAL instructor-assigned instrument-recognition AND DIAGRAM-LABELLING exercise · Distinguish the HEDSTRÖM MANUAL H-FILE study model from a NiTi ROTARY FILE model, then choose the supplied manual-file TWO-MARKER REFERENCE KEY. The learner continues into the UNCHANGED endodontic diagram chair to trace the PREASSIGNED CHAMBER and CANAL MODEL LOCATIONS. The chair uses a virtual diagram annotation pointer, NOT an H-file inserted into root anatomy. No actual tooth, canal entry, instrumentation, working length, hand-file technique, irrigation, obturation, diagnosis, clinical procedure or patient outcome is simulated.",
	"tool": {
		"label": "endodontic file study model",
		"choices": ["tool.hand_h_file_recognition", "tool.niti_rotary_file_alternative"],
		"expected": "tool.hand_h_file_recognition",
		"prompt": "Which rotatable study file matches the instructor's assigned MANUAL Hedström H-file instead of a rotary motor-driven file?",
		"correct": "Correct. The manual H-file silhouette has a finger handle. This is instrument-family identification only.",
		"incorrect": "The NiTi rotary-file model has a motor-latch connection. Choose the specified manual H-file study model.",
	},
	"material": {
		"label": "instructor canal reference key",
		"choices": ["material.manual_file_canal_reference", "material.rotary_file_reference_alternative"],
		"expected": "material.manual_file_canal_reference",
		"prompt": "Which fictional instructor card pairs the manual-file assignment with the two chamber/canal diagram markers?",
		"correct": "Correct. This H-file reference card names the two simulated diagram locations without supplying clinical canal anatomy or length.",
		"incorrect": "The rotary NiTi equipment card is a plausible different exercise, not the assigned manual-file and canal-label reference.",
	},
	"finish": "Record manual H-file identity and two canal-diagram markers",
	"finish_event": "record_manual_h_file_canal_reference_review",
	"outcome": "Manual H-file study recognition and diagram review complete · The unchanged endodontic chair recorded its two preset chamber/canal markers. No real root-canal instrumentation, diagnosis, working length, canal anatomy, treatment or patient outcome was evaluated.",
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

const MOUTHGUARD := {
	"id": "mouthguard_mock_upper_arch_coverage_intro",
	"scenario": "mouthguard",
	"title": "Custom mouthguard fitting bench",
	"case": "Fictional sports-mouthguard teaching fixture · The instructor assigns a THICK UPPER-ARCH GUARD STUDY OBJECT and a MATCHING UPPER-ARCH COVERAGE DIAGRAM. Compare the guard to a stage-04 aligner, then use the unchanged chair to SEAT the assigned mock guard and CHECK its fixed coverage landmark. No impact-protection effectiveness, actual guard fit, occlusion, retention, material strength, safety certification, treatment or patient outcome is measured.",
	"tool": {
		"label": "study appliance",
		"choices": ["tool.sports_mouthguard_study", "tool.aligner_stage04_tray"],
		"expected": "tool.sports_mouthguard_study",
		"prompt": "Which rotating 3D model is the assigned thick sports mouthguard for this fictional upper-arch coverage exercise?",
		"correct": "Correct. The opaque, rimmed sports-guard teaching model differs from the translucent stage-04 orthodontic aligner.",
		"incorrect": "The stage-04 aligner is assigned to a different orthodontic model and cannot replace this sports-mouthguard study object.",
	},
	"material": {
		"label": "coverage reference",
		"choices": ["material.mouthguard_upper_arch_reference", "material.assigned_aligner_stage04_plan"],
		"expected": "material.mouthguard_upper_arch_reference",
		"prompt": "Which instructor-supplied diagram identifies the upper arch and premarked coverage landmark for this guard?",
		"correct": "Correct. The mock upper-arch map shows the teacher-specified coverage landmark only, not a protective performance measurement.",
		"incorrect": "The stage-04 orthodontic plan describes a simulated aligner stage, not the assigned guard coverage landmark.",
	},
	"finish": "Record mock guard seating and assigned arch-coverage landmark",
	"finish_event": "record_mouthguard_mock_coverage_review",
	"outcome": "Mouthguard model fitting complete · The assigned guard seating and arch-coverage teaching landmark were verified in the existing chair simulation. No protection, impact performance, retention, clinical fit, occlusal adjustment or patient outcome was assessed.",
	"reference": ADA_MOUTHGUARDS,
}

const EXTRACTION := {
	"id": "extraction_mock_tool_site_check_intro",
	"scenario": "extraction",
	"title": "Extraction simulation setup bench",
	"case": "Fictional supervised MODEL EXTRACTION SETUP · The instructor assigns ONE PREIDENTIFIED MODEL TOOTH and TWO ADJACENT MODEL CHECKS. Select the BLUNT SYNTHETIC TRAINING FORCEPS and a matching tooth-plus-neighbours checklist, then enter the UNCHANGED existing chair simulation to perform its two labelled model actions. This does not establish a real tooth identity, clinical consent, local anaesthesia, extraction technique, tooth/periodontal anatomy, required force, surgical safety or patient outcome.",
	"tool": {
		"label": "study instrument",
		"choices": ["tool.training_forceps_study", "tool.periodontal_probe"],
		"expected": "tool.training_forceps_study",
		"prompt": "Which rotating 3D model is the assigned blunt training forceps for this fictional extraction setup, rather than the probe?",
		"correct": "Correct. The model forceps represents the instructor's assigned simulation object; its geometry does not demonstrate a safe technique.",
		"incorrect": "The periodontal probe is for a separate fictional site-assessment bench; it is not the assigned model forceps here.",
	},
	"material": {
		"label": "site checklist",
		"choices": ["material.assigned_extraction_tooth_and_adjacent_record", "material.site_chart"],
		"expected": "material.assigned_extraction_tooth_and_adjacent_record",
		"prompt": "Which instructor-made fictional checklist identifies the target model tooth and BOTH adjacent-tooth check landmarks?",
		"correct": "Correct. The assigned exercise sheet identifies one model tooth and both neighbour checks without verifying any real clinical site.",
		"incorrect": "The periodontal site chart does not identify this model extraction tooth and its two adjacent-check landmarks.",
	},
	"finish": "Record fictional assigned-tooth and adjacent-model checks",
	"finish_event": "record_extraction_mock_setup_review",
	"outcome": "Extraction setup model exercise complete · The existing chair recorded the assigned model-tooth action and the adjacent-teeth check. No real extraction, tooth identity verification, clinical safety, anatomical measurement, patient treatment or outcome was assessed.",
	"reference": ADA_EXTRACTIONS,
}
