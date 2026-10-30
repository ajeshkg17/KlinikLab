# KlinikLab — phased XR and dental anatomy roadmap

## Phase 4 — tool catalog (implemented; PC visual recheck pending)
The owner-PC IWER run `pc-xr-phase4-event-sync-20261030-02` passed 22 functional checks at commit `9afa997e5443d7465473abbbcdf0f5aff9db668d` and uploaded 10 XR captures. This is not a physical Quest 2 test. Follow-up work adjusts catalog purpose/controls spacing; visually validate the update before acceptance.

## Phase 5 — combined VR regression and physical Quest 2 readiness
Exercise initial table visibility and individual tools, both-hand grip pickup/release, controller silhouette, stereo projections, catalog item selection/purpose, return/reset, help open/close, re-entry, tracking loss, and interaction isolation in one exact-commit owner-PC job. Keep performance advisory distinct from functional pass/fail. Prepare a **manual hardware acceptance protocol** for Meta Quest 2; do not claim hardware execution without headset evidence.

## Phase 6 — realistic full-mouth dental anatomy and proportions
Replace oversized generic crowns with type-specific incisor, canine, premolar, and molar anatomy and realistic relative proportions. Resolve FDI quadrants, arch position, upper/lower jaw, and left/right orientation. Establish representative geometry checks for upper/lower anterior/posterior teeth. Keep whole-mouth geometry at physical proportions; magnification affects only the explicit detail view.

## Phase 7 — selected-tooth fidelity and persistent treatment state
Bind the enlarged treatment tooth to the current FDI selection, updating distinct anatomy on selection changes. Store per-FDI treatment state, preserve it across overview/detail navigation and re-selection, and ensure interactions modify only the intended tooth. Verify representative upper/lower, left/right, anterior/posterior cases with owner-PC XR captures and unit/interaction regressions.

These phases are planned follow-up work, not completed implementations. All WebXR screenshots must originate on the owner PC and be uploaded with exact-commit metadata; GitHub Actions remains source/unit/build only.
