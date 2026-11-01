# Dental asset candidate catalog

Reviewed for the personal-use KlinikLab training app on 2026-11-01. This is an asset research record, not clinical approval.

## Current usable collection

The repository already contains 16 University of Dundee permanent-tooth surface models, credited under CC BY 4.0. See the existing [Dundee asset notice](../../assets/dundee/README.md) (or `output/kliniklab-engine-bakeoff/shared-assets/DUNDEE_ASSET_LICENSE.md` in the local bakeoff workspace) for original source, conversion provenance, attribution, and limitations.

These are the best current license-documented dental candidates. They are surface meshes; they do not provide enamel/dentin/pulp, caries, or a patient-calibrated drilling volume. Dental review is still needed before treating them as teaching standards.

## Downloaded and rendered locally

| NIH 3D entry | Local review | Blender result | Decision |
|---|---|---|---|
| [3DPX-000902 — Upper mandible with teeth](https://3d.nih.gov/entries/902) | Downloaded GLB; 98,258 vertices, 197,901 triangles, one mesh | Local preview at `output/kliniklab-engine-bakeoff/shared-assets/asset-candidates/NIH3D-000902/preview-upper-mandible.png` | Looks like a rough/partial scan fragment, not a clean tooth set. NIH entry did not expose an assigned license in the reviewed page. Keep local only; do not integrate or redistribute until rights are confirmed. |
| [3DPX-003003 — Lower dental tooth model](https://3d.nih.gov/entries/3DPX-003003) | Downloaded GLB; description says a patient's upper teeth with a printable base; 2,248,810 vertices, 1,590,098 triangles, one combined mesh | Local preview at `output/kliniklab-engine-bakeoff/shared-assets/asset-candidates/NIH3D-003003/preview-patient-derived-arch.png` | Visible arch, but includes a large base and scan artifacts, and teeth are not separate for FDI interaction. NIH entry did not expose an assigned license in the reviewed page. Keep local only pending rights and anatomy review. |

The NIH terms say each entry's assigned license must be checked and NIH does not guarantee scientific accuracy. Personal use permits us to consider non-commercial assets where their licenses allow it, but it does not make public GitHub redistribution permissible. So the two NIH GLBs and their renders remain on the PC until their licenses are clarified.

## Other sources to investigate

- [University of Dundee Permanent Dentition on Sketchfab](https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b) is listed CC BY 4.0. The download button required Sketchfab login, so no sign-in was attempted. The existing Dundee tooth collection is already in the repository.
- GrabCAD has no specific instrument selected yet; its help guidance says to get the original designer's permission for uses beyond personal use.
- No specific Embodi3D, TurboSquid, or CGTrader dental asset has been vetted or downloaded yet. Search individual listings and record license, attribution, source, mesh structure, and suitability before acquisition.

## Next review

Development chat: inspect the catalog and local preview paths if accessible, search for more candidate tooth, jaw, tissue, and instrument assets, and report whether an independently reusable license and separable FDI anatomy are present. Keep unlicensed files out of public GitHub. Do not treat model-download, import, or rendering success as clinical validation.
