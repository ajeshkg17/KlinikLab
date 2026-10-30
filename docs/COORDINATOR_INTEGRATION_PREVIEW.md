# Coordinator integration preview — 30 October 2026

This branch combines the existing work for source review and isolated engineering checks.
It is not deployed to the office PC and is not an approved release or replacement for
reviewing the original PRs. No worker branches or main were changed.

## Included source heads

| Work | PR | Included head |
|---|---|---|
| Quest VR | #13 | ba2e34360bd3bb8a097bd09d1faf15e408abc303 |
| Dental anatomy | #15 | d5257a50644b7d418db19297d7402868b436a68d |
| FSP/KP | #14 | d910d3d3aba8c618d4e7545954de06dd84d75100 |
| Existing QA engineering checks | #12 | 98fbfbaa3769799961770b37163ec7039fe27f2d |
| Video heading fix | #17 | e363a631909e3301db13353d8b3fa6c383823429 |
| XR lifecycle recovery | #18 | 5db573751d26b2ab9cfcee226042110d772a2b8c |

Base: main at 428d6b2d8fadd881d74d587bcaff3279da489949.

Source merges combined cleanly, including the anatomy/QA overlap in
tests/babylon-preview.test.mjs. The standalone HTML was regenerated from the
combined sources with the FSP-updated builder. Generated-file merges alone were
not used as build evidence. The coordinator fixes include their focused tests.

## Observed isolated checks

- All application Node suites: 114 passed, zero failed.
- Existing visual-worker/helper unit tests: 8 passed, zero failed; no worker jobs executed.
- Existing scenario logic: all six cases and 42 case/station templates passed.
- Static checks: 25 byte-identical frontend mirrors and 65 JavaScript syntax checks.
- Local transient HTTP smoke: 22 referenced assets, two binary assets and restricted-path checks passed.
- Standalone regeneration: verified separately using scripts/qa_gate.py bundle.

These checks ran in the coordinator's isolated environment, not on the office PC.
No browser, screenshot, pixel comparison, emulator or physical Quest test ran.

## Remaining gates

- Review original PRs and choose/authorize sequential integration into main.
- Recheck source heads before applying this snapshot: workers can advance independently.
- Resolve draft/content gates; dental and German-language review remain unperformed.
- Confirm the hosted checkout SHA and restart before approved integrated PC QA.
- Extend QA's written FSP coverage from 36/48 to all four cases (36/48/46/16).
- Verify #16 in the real integrated DOM; the isolated regression is not browser acceptance.
- Emulator access and physical Quest 2 acceptance remain unperformed.
- Screenshot budget and retention remain proposals; no cleanup or history rewrite authorized.

The branch is published without opening a PR so that the existing automatic
pull-request Chromium screenshot workflow is not started prematurely. Do not
dispatch that workflow or the shared worker before the existing QA gates are met.
