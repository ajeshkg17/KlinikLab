# Approved screenshot baselines

Screenshots generated during CI are **candidate evidence**, not automatically approved reference images.

1. Run the QA Chromium job for an agreed commit and browser version. Inspect `qa-chromium-evidence` (desktop tutorial, desktop practice, mobile navigation, report.json).
2. A reviewer confirms the image contains **no identifiable patient or account data**, has appropriate content and no clipping, overlap or accessibility defect. Do not approve a baseline to make a currently failing UI look green.
3. Copy each approved PNG to this directory using the corresponding filename. Hash it using `sha256sum visual-qa/baselines/<name>.png`.
4. Add an entry to `manifest.json` under `captures` with exact SHA-256, GitHub Actions run URL, reviewed source commit SHA, approver, approval date, Chromium major version, and capture viewport width/height.
5. Review the PNG and manifest in the same PR. The comparator refuses unapproved PNGs and hashes/viewport/browser versions that do not match. Do **not** copy screenshots from unrelated OS/GPU/browser environments as a pixel baseline.
6. Once committed, PR CI compares fresh screenshots to approved baselines using the existing 5% changed-pixel threshold (RGB channel difference >35). This tolerance is pragmatic, not a guarantee of visual correctness. Review all diffs and reapprove when the intended UI changes.

No baselines have been approved yet. A `NO_APPROVED_BASELINE` status is deliberately **not** `COMPARED_PASS`, and human visual review remains required.

### Manifest entry example (schema only; not an approved entry)

```json
{
  "schemaVersion": 1,
  "captures": {
    "desktop-tutorial": {
      "sha256": "<64 lowercase hex characters from approved image>",
      "approvedBy": "<reviewer GitHub handle>",
      "approvedAt": "YYYY-MM-DD",
      "sourceCommit": "<40-character commit SHA>",
      "sourceRun": "https://github.com/ajeshkg17/KlinikLab/actions/runs/<id>",
      "browserMajor": 142,
      "viewport": {"width": 1440, "height": 900}
    }
  }
}
```

These values are illustrative, **not real approvals**. Review metadata records the approval process; it does not cryptographically prove who reviewed it. The coordinator should require GitHub PR review on baseline changes.
