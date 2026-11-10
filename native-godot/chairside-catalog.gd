extends RefCounted
## Case-specific selections share one source-checked instrument preview catalog.
const ADA_MATERIALS := "https://www.ada.org/resources/ada-library/oral-health-topics/materials-for-direct-restorations"
const ADA_SEALANTS := "https://www.ada.org/resources/ada-library/oral-health-topics/dental-sealants"
const ADA_FLUORIDE := "https://www.mouthhealthy.org/all-topics-a-z/fluoride"
const ADA_PLAQUE := "https://www.mouthhealthy.org/all-topics-a-z/plaque"
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
