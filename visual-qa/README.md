# KlinikLab local visual-feedback worker

This is a local **Playwright screenshot agent**, not a remote shell. It watches a JSON file in the existing `main` branch and publishes screenshot images to a separate `visual-feedback` branch in the **same public GitHub repository**. It uses a new Chrome browser profile (no saved accounts) to inspect only `http://127.0.0.1:8787/`. No command execution, arbitrary JS, arbitrary links, form typing or API calls are accepted from jobs.

## Install on `officegopi` (normal PowerShell)

From your existing KlinikLab checkout directory, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\visual-qa\setup.ps1
```

You need Windows Chrome, Git, Node.js 20+, and GitHub **push** authorization in that account (`gh auth login` if Git Credential Manager isn't already authenticated). No Tailscale Funnel is needed. The existing 10-second GitHub auto-pull remains unchanged.

When installed, start it in a **separate terminal** from the website server:

```powershell
node .\visual-qa\worker.mjs
```

It checks the local `visual-qa/jobs/current.json` every 10 seconds. For the first run, it launches Chrome and creates PNG screenshots, then commits them to [visual-feedback](https://github.com/ajeshkg17/KlinikLab/tree/visual-feedback). A result will be available at `visual-feedback/runs/baseline-2026-10-29-01/manifest.json` and sibling PNG files. Keep the terminal running for subsequent jobs. `node .\visual-qa\worker.mjs --once` runs one job and exits.

The worker's **own** Git clone is stored outside OneDrive at `%LOCALAPPDATA%\KlinikLabVisualWorker\results-git`. This prevents screenshot commits from restarting the local server's main-branch sync loop. A successfully uploaded job is marked completed in `%LOCALAPPDATA%\KlinikLabVisualWorker\processed.json`. To run more screenshots, change the `jobId` and `scenes` in `current.json` on GitHub `main`; do not just change an old scene with the same job ID.

## Why a second Git branch?

Your existing sync pulls `main` and restarts the server. Publishing images to `main` would cause a new pull and unnecessary restart, which could break the screenshot job. A separate branch avoids that. It is still the same GitHub repository, and you can view all the PNGs online.

## Safety and limitations

- **Your repository is public. Every screenshot uploaded to `visual-feedback` is public.** Use fictional cases only; do not photograph a real patient chart, identity, credentials or private files.
- Screenshots are captured from an isolated new browser context; jobs only allow a fixed list of KlinikLab UI controls, fixed local hostname/port, fixed viewport limits, and at most 14 scenes.
- Worker operations require the current Windows user's GitHub push credentials. Do **not** paste tokens into chat or save access tokens in JSON files.
- Chrome is launched visibly (`headless:false`) for a better chance of GPU-accelerated rendering; do not lock the session or minimize the worker browser during captures. These are **desktop** Playwright screenshots, not actual Quest 2 headset frames or haptic validation.
- Because server auto-restart may occur after a `main` update, the worker waits for localhost to respond before testing.
- Worker runs only while its PowerShell window remains open; it is not installed as a background service or scheduled task.
- A failed Git push leaves output in `%LOCALAPPDATA%\KlinikLabVisualWorker\pending` and prints a warning. Test by opening the `visual-feedback` branch; no report of successful upload should be assumed without seeing it there.

## Designing future jobs

Edit `visual-qa/jobs/current.json` and increase the **jobId**. Every scene starts from a fresh browser page and may include a short sequence of approved actions. Valid `capture` choices are `page`, `stage`, `scene`, `tooth`, `volume`, `radiograph`, and `imaging`. Valid `action` choices: `click` (with fixed control IDs in `worker-core.mjs`), `orbit` (bounded mouse drag), and `wait` (100–3000ms). There are no arbitrary selector/script/URL parameters.

Tests: `npm --prefix visual-qa test` (from the checkout root). Job validation: `node visual-qa/worker.mjs --validate`.