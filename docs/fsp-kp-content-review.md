# FSP / KP German dental-language workstream
Status: **fictional prototype; dental professional review pending** (29 October 2026).

## Curriculum and baseline audit

The existing `clinical-pathway.js` provides six fictional patient pathways with question selection, clinical tests, diagnostic selection, treatment alternatives, and formative feedback. The existing `dental-practice.js` contains a ten-question permanent-FDI anatomy quiz. `dental-structures.js` provides schematic anatomy; it does not measure real dentition or act as a diagnostic reference.

| Learning outcome | Previous experience | Workstream addition | Assessment |
| --- | --- | --- | --- |
| Patient history / Anamnese | Select patient questions | Compose German questions for endodontic and pericoronitis cases | Five lexical coverage checks |
| Patient explanation and consent / Aufklärung | Planning checkbox | Write patient-friendly explanation, alternatives, warning signs, and consent discussion | Five lexical coverage checks |
| Written record / Befund, Arztbrief | Diagnosis/plan free text | Write coherent German fictional case summary with explicit uncertainties | Five lexical coverage checks |
| Dentist handoff / Arzt-Arzt-Gespräch | No dedicated handoff | Give an oral-style professional summary in written form | Five lexical coverage checks |
| B2/C1 vocabulary | Mixed wording | B2/C1 phrase scaffolds; bilingual DE–EN terminology | Learner comparison with worked examples |
| Retention | Per-case restart | Identify missing concepts and retry each workflow | In-memory local revision only |

## Cases and exemplars

Four complete, internally consistent, **fictional** cases are supplied in `fsp-kp-training.js`:

1. **Zahn 36:** simulated symptoms and test findings supporting *suspected* symptomatic irreversible pulpitis pending full assessment. Each of the four workflows includes a German prompt, B2 scaffold, C1 scaffold, worked model response, and five rubric criteria.
2. **Zahn 48:** simulated local pericoronitis without described systemic spread, with explicit screening for dangerous escalation. Local measures and reassessment are emphasized; systemic antibiotics are not presented as automatic treatment. All four workflows have corresponding exemplars and checks.

3. **Zahn 46:** simulated longstanding gingival bleeding and tooth mobility, possible periodontal disease and unquantified bone loss. Diabetes control is unknown; smoking and plaque-control factors are described without asserting stage or grade. German questions, patient education, written note, and handoff emphasize **full periodontal assessment before classification** and individualized, staged planning.
4. **Zahn 16:** simulated occluso-approximal caries with short cold response and biting discomfort. Neither a definitive pulpal diagnosis nor restoration choice is assumed. Patient-facing communication contrasts a conditional composite filling and indirect onlay/partial crown after evaluation.

All clinical/radiology descriptions are **invented text**, not radiographic analysis or clinical observations. No real patient record is inserted or uploaded.

## Format: dental FSP versus KP

The Zahnärztekammer Schleswig-Holstein page (checked 2026-10-29) describes a **60-minute dental FSP** in three 20-minute stages: physician–patient discussion, handwritten Arztbrief, and professional discussion of the first two stages, **including explaining selected technical terms in patient-friendly language**. It explicitly assesses German language proficiency, not dental knowledge. The simulator has a **separate additional Aufklärung exercise within the patient-conversation learning sequence**, not a claimed fourth official part. Other German states may use different processes. KP content and professional competency must not be conflated with the language exam.

Official SH information: https://www.zahnaerzte-sh.de/zahnaerzte/praxisservice/beruflicher-nachwuchs/auslaendische-berufsqualifikationen/fachsprachpruefung/

## Content references (not clinical signoff)

- European Society of Endodontology. *Quality guidelines for endodontic treatment: consensus report*. International Endodontic Journal 2006;39:921–930. Documented history, clinical and radiographic findings, treatment choices, informed consent, and follow-up: https://www.endodontologie-hagen.de/fileadmin/editorial/endodontie/downloads/Quality_guidelines_for_endodontic_treatment-_consensus_report_of_the_European_Society_of_Endodontology-A4.pdf
- SDCEP, *Drug Prescribing for Dentistry — Acute periodontal conditions*, accessed 2026-10-29. Local measures first for uncomplicated pericoronitis; systemic infection and persistent swelling may require additional assessment and management: https://sdcepdentalprescribing.nhs.scot/guidance/bacterial-infections/acute-periodontal-conditions/
- SDCEP, *Management of spreading or systemic infection*, accessed 2026-10-29: https://www.acutedentalproblems.sdcep.org.uk/guidance/overarching-principles/management-of-spreading-or-systemic-infection/
- European Federation of Periodontology, *Treatment of Stage I–III Periodontitis: S3 Clinical Practice Guideline*, issued July 2020; reviewed 2026-10-29 for stepwise therapy, full assessment, behavior/risk modification, and supportive care: https://www.efp.org/education/continuing-education/clinical-guidelines/guideline-on-treatment-of-stage-i-iii-periodontitis/
- German implementation AWMF 083-043, version 1.2 was listed valid only through **30 Nov 2025** and currently requires renewed currency check; **do not claim that it remains a current German recommendation**: https://www.awmf.org/aktuelles/awmf-aktuell/die-behandlung-von-parodontitis-stadium-i-bis-iii-die-deutsche-implementierung-der-s3-leitlinie-treatment-of-stage-i-iii-periodontitis-der-european-federation-of-periodontology-efp

These are learning-content sources and do **not** constitute clinician approval. Guidelines may change. No medication dose is taught by this prototype.

## Scoring contract and limitations

Each task has **five explicit keyword-regex criteria, worth two points each (0–10)**. Empty, malformed, and unrecognized answers receive zero for missed criteria. A narrow set of explicit unsafe phrases (e.g. automatic antibiotics for every pericoronitis or advising inaction for breathing difficulties) suspends the numeric score and requires review. The warning patterns are not a comprehensive medical safety check. Editing an answer invalidates its old score. Per-criterion feedback identifies concepts to review. Worked model responses cover all five criteria in each exemplar.

This is **lexical coverage**, not a measure of correctness. For example, merely mentioning “Antibiotika” can score keyword credit even if the sentence incorrectly prescribes antibiotics routinely. Similarly, negation, synonyms not in the rules, grammar, fluency, speech intelligibility, professionalism, and diagnostic reasoning are **not** automatically verified. The UI states these limits at the point of scoring; no official FSP/KP readiness score is claimed. In-memory answers and results do not modify existing anatomy or journey scores. Keyboard focus is trapped inside the open modal and returned to its invoking element on close; answers remain in memory only until page reload. No persistence, analytics, or remote calls are present in the new module.

## Clinician / German-language reviewer checklist — outstanding

- [ ] **Diagnosis:** verify endodontic symptom description and uncertainty; confirm that no single test establishes definitive diagnosis. Review gingival/periodontal classification uncertainty for Zahn 46 and pulpal/restorative limits in Zahn 16.
- [ ] **Patient safety:** confirm appropriate red-flag wording for dysphagia, dyspnea, trismus, spreading infection; verify escalation advice.
- [ ] **Consent:** review alternatives, patient comprehension, risk/prognosis, and consent phrasing; verify state-specific expectations. In the restoration case, validate conditional direct versus indirect options, not an automatic treatment choice.
- [ ] **Treatment / contraindications:** review the local-first pericoronitis approach and antibiotic nuance; do not operationalize doses. Review periodontal risk-factor guidance and verify guideline currency with a German periodontist.
- [ ] **Terminology:** German grammar, B2/C1 register, FDI 16/36/46/48 and tooth-side consistency; review colloquial paraphrases of Pulpitis and Dysphagie; cross-review with the Anatomy workstream.
- [ ] **Rubrics:** manually inspect incorrect, misleading and negated responses; QA to check false positives and missed unsafe cases, focus trapping, screen-reader announcements, and small screens.
- [ ] **Exam rules:** re-verify SH FSP description before official use and separately validate any KP-specific claims.

## Required tests and manual checks

```sh
node --test tests/phase5_structures.test.cjs tests/phase6_practice.test.cjs tests/fsp_kp_training.test.cjs
node --check fsp-kp-training.js
cmp fsp-kp-training.js public/fsp-kp-training.js
python3 build_standalone.py
git diff --exit-code -- KlinikLab_DesktopXR_Standalone.html
```

Desktop/mobile and Quest hardware have **not** been manually verified by this workstream. No VR / geometry source file was modified. The following integration-sensitive files must receive coordinator review: `index.html`, `public/index.html`, `server/server.mjs`, `build_standalone.py`, and the generated offline HTML.

## Handoff / review boundaries

Open a pull request from `feature/fsp-kp-training` into `main`, do **not** merge. Request integration review from the coordinator and interdisciplinary content review from a dental professional and German dental-language teacher. Changes to the shared files are specifically flagged for conflict resolution with other feature branches.
