# Pinned Draco decoder (third-party Apache-2.0)

These files are copied without modification from Google Draco, commit [`d429de84b52a860705507da0884764c5d8321423`](https://github.com/google/draco/commit/d429de84b52a860705507da0884764c5d8321423), paths `javascript/draco_wasm_wrapper_gltf.js`, `javascript/draco_decoder_gltf.wasm`, `javascript/draco_decoder_gltf.js` and `LICENSE`. Copyright holders and attribution are as in the upstream license. The full Apache License, Version 2.0 text is included in `LICENSE.txt`.

The decoder is loaded only by the optional imported-GLB atlas and is served from this project's local `/assets/draco/` URLs. We bundled it because the Babylon CDN's versioned WASM decoder URL returned HTTP 404 during our workstation QA. It must not be used to load arbitrary, untrusted URLs or executable scripts from GitHub job files.
