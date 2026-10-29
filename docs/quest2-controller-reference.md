# Quest 2 controller reference (WebXR)

This is the **prototype software mapping**, not physical headset acceptance.

| Controller action | WebXR event / source | In-app behavior |
| --- | --- | --- |
| Point with either 6DoF controller | `targetRaySpace` pose | Visible controller ray; selectable lesson/module/tooth/tool |
| Index trigger press | `selectstart` | Choose target; while guide is open, Back/Next/Close are the only selections and underlying tooth/tools/cuts are blocked |
| Index trigger hold/release | `selectstart` / `selectend` | Optional simulated preparation continues/stops while active; material cuts are not calibrated for depth, force, or clinical action |
| Either grip press | `squeezestart` | Opens help if closed; recenters toward latest headset pose even if already open, retaining page while open |
| VR HELP launcher | `guide:open` ray + select | Reopens guide, re-centers and returns to page 1 |
| Exit VR | Quest system menu / WebXR `end` | Restores desktop mesh and guide hit geometry; cleans controller ray state |

## Behavior and limitations

- Controller render slots are selected by **handedness**, not by array order or gamepad button index. Missing target-ray poses hide the affected controller ray.
- Help is a native in-world panel, **not DOM overlay**. On initial valid viewer pose it places its center 4 cm below initial eye height, in the user's starting facing direction. The guide remains world-fixed after anchoring; grip provides a recovery/recenter shortcut.
- Controls work with left or right controller, as exposed by the browser's WebXR events; no joystick motion, hand-tracking support, or button-index assumptions are implemented.
- The seven-module lesson board and workstation stay **world-fixed**; their visibility and reach at extreme initial headset yaw are **unverified**.
- WebXR mock tests are software checks. Physical Quest 2 reachability, legibility, collisions/comfort, tracking and frame rates are **BLOCKED** pending real headset measurements.
- `KlinikLab_DesktopXR_Standalone.html` and mirrored `public/` XR sources are shared artifacts requiring coordinator review before merging.
