# Quest 2 VR headset acceptance checklist

**Physical Quest 2 verification: BLOCKED / NOT PERFORMED.** Mock/WebXR code checks cannot demonstrate human comfort, readable per-eye text, real controller tracking, sustained FPS, or clinical training validity.

## Required code verification

```sh
node --test tests/quest2_vr_guide.test.cjs
node --check engine.js && node --check xr-guide.js && node --check xr-procedure.js
cmp engine.js public/engine.js
cmp xr-guide.js public/xr-guide.js
cmp xr-procedure.js public/xr-procedure.js
python3 build_standalone.py && git diff --exit-code -- KlinikLab_DesktopXR_Standalone.html
```

## Physical Quest 2 script

1. Visit KlinikLab in **Meta Quest Browser over HTTPS**. Confirm immersive-VR entry; an ordinary desktop browser is not headset validation.
2. Seated and, if safe, standing: examine all five guide pages in **each eye**. Record measured distances, text readability, Back/Next/Close button reach, and comfort. Do not assume the 78% furniture and 68% lesson-board scales are optimal.
3. With **left controller**, test ray and index-trigger on guide buttons, seven lesson modules, available answers, teeth and tools. Repeat using **right controller**, including single-controller tracking.
4. While guide is visible, aim at an underlying tooth/practice target and press trigger: no tooth selection or cutting should happen. Verify guide controls still respond if an underlying interactive object overlaps the ray.
5. Start optional simulated preparation; hold trigger, press either **grip**, and confirm the guide reopens and cutting stops immediately. Close guide and confirm a fresh trigger press is needed to resume.
6. Safely obstruct/untrack each controller. Missing pose must remove its ray and must not cause unintended cutting upon recovery. Re-test trigger and grip.
7. Exit with the Quest system menu. Verify the original desktop mesh size, hit geometry and 32 FDI tooth interactions remain unchanged. Enter/exit **three times** to check teardown and reentry.
8. If tools permit, measure FPS/frame time during normal views and tooth-mesh updates. Record device firmware/browser versions and attach **actual headset** captures, not simulator screenshots.

## Evidence record

| Gate | Result | Status |
| --- | --- | --- |
| Quest firmware / browser | Not recorded | BLOCKED |
| Per-eye readability and reachability | Not measured | BLOCKED |
| Left/right controller, grip, missing-pose inputs | Not physically tested | BLOCKED |
| Exit/reentry and geometry restoration | Not physically tested | BLOCKED |
| GPU/FPS and headset screenshots | Not measured/captured | BLOCKED |

Clinical, treatment-competence and FSP/KP certification gates are **not verified**. The root XR files mirror into `public/`, and the generated standalone HTML is a **shared integration artifact**: coordinate merging with the parallel workstreams; do not merge this branch without review.
