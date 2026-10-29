# KlinikLab — 3D Procedural Anatomy and FSP/KP Practice

**Version:** 1.0 (29 October 2026)  
**Audience:** India-trained BDS graduate preparing for FSP and Kenntnisprüfung (KP) in Germany.  
**Status:** Functional education prototype. **NOT a clinically validated dental simulator or a certified KP assessment.**

## What is new

A true sampled **three-dimensional editable solid** replaces the prior 2D-only preparation target in the primary practice workflow:

- The model contains an enamel exterior, nested dentin and pulp chamber / primary canal pathways, plus roots. It can be orbited, viewed occlusally, and cut along a longitudinal plane.
- The cutting tool removes spheres from a 3D implicit solid. Marching tetrahedra remeshes the changed tooth volume after each interaction; this is not merely painting a 2D image.
- A cross-section inset is computed from exactly the same solid as the 3D model, including the new voids after cutting.
- The demonstrated bur has a visible moving position; the **Demonstration** action shows a conservative, *schematic* sequence. Do not interpret these animations as recommendations for exact access dimensions, depths, speed, pressure, or bur selection.
- Model-derived metrics: target-volume coverage, fraction of removed volume inside the target, off-target volume fraction, and collision with the *virtual* pulp chamber. These are unitless and **not clinically calibrated**.
- `↓ Bericht` exports local JSON records: 3D bur coordinates, modeled measurements, procedure type and model limitations.
- `✦ KI-Feedback` sends these measurements to the existing Gemini clinical feedback workflow **only when the backend is configured**.
- Six cases remain: 16 posterior composite, 36 endodontic access, 11 anterior restoration/trauma, 26 crown, 48 oral surgery and 46 periodontology.

Surgery and periodontology currently provide only anatomy/orientation animations; they **do not** pretend to simulate extractions or professional scaling with geometric scoring.

## Running the offline simulator

Open **`KlinikLab_3D_Procedures_Standalone.html`** in a desktop browser (Chrome / Edge). No external libraries or internet connection are necessary for the offline tools.

1. Choose **KP — Praktische Übungen** and a patient case, e.g., Zahn 16.
2. Click **3D Präparation** above the model.
3. Use **Schnittbild** to reveal tissue layers and **Okklusal** for a top view.
4. Select **Präparieren**. Change the relative cutting depth and bur radius with the sliders; drag over the occlusal model to subtract 3D material. Orbiting is intentionally disabled while drilling to keep the top-view projection predictable.
5. Watch the numerical feedback. Choose **Demonstration** to see an illustrative animated series, **↺ Neustart** to restore the original tooth or **↓ Bericht** to export a JSON measurement record.

**Measurement interpretation:** For restorative and crown cases, collision with the modeled pulp is flagged. In the endodontic-access case, chamber entry is expected and is labelled accordingly. Anatomical variations, the biological condition of the real pulp, the accuracy of depth, and clinical suitability of a preparation are not measured.

## Gemini AI setup (optional)

The standalone HTML intentionally contains **no API key**. AI features require the Node backend or configured Netlify deployment. In the source folder:

```bash
export GEMINI_API_KEY='YOUR_PRIVATE_KEY'
node server/server.mjs
```

Windows PowerShell:

```powershell
$env:GEMINI_API_KEY='YOUR_PRIVATE_KEY'
node server/server.mjs
```

Navigate to `http://127.0.0.1:8787` on the same computer. Do **not** paste a private key into the HTML or publish it. For public hosting, set `GEMINI_API_KEY` and optionally `AI_ACCESS_CODE` in the hosting provider's server environment. The current default model is configured in `server/ai-core.mjs` and can be overridden by `GEMINI_MODEL`.

AI is **formative**: the underlying Gemini call receives scenario data, the learner's treatment plan, measured geometry and UI action traces. It must not invent unseen haptics, instrument angulation, occlusal clearance, preparation margins or clinical exam results.

## VR compatibility

The original clinic-view engine retains experimental WebXR support when served over HTTPS in Meta Quest Browser. **The new volumetric trainer currently renders into a 2D browser canvas** even though its geometry and cuts are genuinely three dimensional. It can be viewed in the Quest Browser as a webpage; an immersive stereo VR interaction layer and Quest controller-based drilling have **not been implemented or verified**. Testing on the physical Quest 2 is still required.

## How the anatomy is built

**Original procedural mesh**, not copied from YouTube or derived from unlicensed medical scans. An implicitly modeled tooth surface is sampled on a 3D grid, extracting triangles with marching tetrahedra. Maxillary first-molar examples have three primary roots (MB, DB, palatal), mandibular molars have two modeled roots, and the anterior example has one modeled root. Nested mathematical surfaces approximate enamel, dentin and pulp chamber / primary canal pathways. The chamber and roots are educational approximations; MB2, complex curvatures, individual patient morphology, gingival architecture, periodontal ligament, soft tissues and biological response are not modeled. Geometry coordinates use *normalized model units*, not millimeters.

The source code, geometry, shaders (where applicable), source documentation and controls remain editable. No third-party 3D artwork is included.

## Clinical validation checklist — PENDING

An independent licensed dentist/prosthodontist/endodontist should review the following **before** using this simulator as a formal skill or readiness assessment:

- Crown and root morphology for each individual FDI tooth; especially maxillary three-rooted molar and canal variability.
- Enamel-dentin junction, pulp chamber roof/floor, pulpal horns, dentinal wall thickness and root canal locations against representative validated 3D dental scan data.
- Definitions of the target volume for MOD, access cavity, anterior lesion and crown preparation; proposed scoring thresholds versus measured objective expert ratings on validated typodonts.
- Collision/margin performance across bur radii and trajectory paths; geometric resolution and edge artifacts.
- Correct handling of deep caries and pulpal exposure versus intentional endodontic access.
- German-language procedural order, indications, radiographic interpretation, material-specific protocols, infection control and informed consent.
- Formal review of interaction ergonomics and controller tracking before attempting immersive hand-skill training.

**No independent dentist has yet completed these checks.** Until then, these models are original and anatomically *informed*, but **not clinically reviewed**.

## Relevant published / official sources

- German Approbationsordnung für Zahnärzte und Zahnärztinnen, § 110: https://www.gesetze-im-internet.de/zappro/__110.html — categories of practical KP tasks.
- EFCD–ESE–ORCA S3 deep-caries guideline (2026 publication): https://pmc.ncbi.nlm.nih.gov/articles/PMC13099699/ — selective/stepwise removal for deep lesions where appropriate; not every dark area should be fully excavated indiscriminately.
- American Association of Endodontists, Treatment Standards: https://www.aae.org/specialty/wp-content/uploads/sites/2/2018/04/TreatmentStandards_Whitepaper.pdf — anatomy, preoperative imaging and access planning.
- Kottoor et al., maxillary molar root/canal anatomy: https://pmc.ncbi.nlm.nih.gov/articles/PMC3246733/ — three principal roots and common canal variations.

These are references used to orient the *training scope and safety messaging*, not endorsements or reviews of this application or its models.

## Quality assurance performed

- Node.js structural tests across all six cases and seven station combinations.
- Mocked Gemini patient/plan/procedure tests, server-side API validation and key-handling checks.
- Headless Chromium interactive rendering of desktop and mobile cases (using inline HTML, because local navigation is restricted in the test browser).
- Test of 3D material removal, section panel, reset, changing cases, expected endodontic demo progression, modeled pulp contact and mobile controls.
- Automated visual snapshots are in `preview/` when included in the distribution.

Neither a clinical outcome study nor headset test was performed. Interactions are stylized educational exercises and should be combined with supervised clinical/phantom practice.
