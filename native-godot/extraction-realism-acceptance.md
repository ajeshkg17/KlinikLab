# FDI35–37 textured extraction / synthetic gum acceptance gate

This describes a **local, independent** Godot 4.7.2 gate. It does not run
on the paused watcher, access a shared learner profile, or require Unity.
Until the gate passes on an exact source SHA, do not propagate the new
surface-mounting pattern to other cases.

1. In a disposable *clean checkout* of the candidate head, record
   `git rev-parse HEAD` and `git write-tree`. Require an unused output
   directory and build:
   `node native-godot/build-app.mjs --source-dir=<checkout> --output=<fresh-build> --expected-sha=<40-hex-head>`.
2. In the **disposable generated project** (not the source checkout), set
   `application/config/use_custom_user_dir=true` and a unique
   `application/config/custom_user_dir_name` such as
   `KlinikLabExtractionTrial-<random>/profile`. Put the trial folder under
   Windows Roaming AppData with the matching name. Probe
   `OS.get_user_data_dir()` before launching; the trial runner refuses
   to proceed unless it resolves inside `<trial-folder>/profile`.
   Do not redirect or touch any existing KlinikLab learner profile.
3. Set **both** viewport and window size in the disposable
   `project.godot` for either 1280×720 or 1600×900. Do not rely on
   `--resolution` alone. Import with Godot 4.7.2 headless
   `--path <fresh-build> --import`, and check that the
   `mandibular_first_molar-training.glb`,
   `mandibular_left_second_premolar-training.glb` and
   `mandibular_second_molar-training.glb` scenes load with original
   512×512 albedo textures.
4. Run this project's built-in chair replay using a new output/profile:
   ```powershell
   & $Godot --headless --path $Build --write-movie (Join-Path $Trial 'chair-gameplay.avi') --fixed-fps 24 --script res://procedure-lab-trial.gd -- $Trial --mode=chair --video
   if ($LASTEXITCODE -ne 0) { throw 'Chair replay did not pass' }
   ```
   The generated **local** evidence is
   `<trial-folder>/chair-gameplay.avi`,
   `<trial-folder>/result.json`, and the Godot log you supplied using
   `--log-file`. No replay archive is committed to the repository.
5. Check `result.json` for the **exact candidate `source_sha`**,
   `mode=chair`, `status=pass`, two 20/20 chair extractions,
   `learner_journal_unchanged=true`, and the
   `extraction_neighbours` keys `35` and `37` with
   `albedo_px=[512,512]`, source blob attribution and
   `texturePreserved=true`. The `synthetic_socket_exposed` flag must
   be true after release. The trial also tests jaw close/reopen, blocked
   wrong-tooth contact, adjacent tooth perturbation/rejection/recovery,
   neighbour stability, restart and same-pose exit.
6. Repeat steps 1–5 with a **different fresh build and profile** at the
   other resolution. Use ffprobe to check **encoded video dimensions**;
   extract frames showing the seated three teeth and scalloped gingival
   margins, released FDI36 with dark socket visible, and restart with
   the original tooth reseated. Reviewer must confirm no clipping,
   reversed/mirrored identity or implausible gum-to-crown intersections.

Only then consider subsequent bounded batches for other playable fixtures.
Any non-Dundee source, mirrored geometry, or synthetic illustrative tooth
must be explicitly identified; do not imply anatomical certification.
Headless 20/20 and correctly sized AVI are **not** by themselves human
physical-input, GPU/visual, Quest, or qualified clinical acceptance.
