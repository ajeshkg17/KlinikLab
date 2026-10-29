#!/usr/bin/env python3
"""Deterministic, dependency-free integration checks for KlinikLab.

This is a *desktop/local* engineering gate. It does not test an XR headset,
clinical correctness, or third-party network availability.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SUFFIXES = {".html", ".js", ".css"}
JS_SUFFIXES = {".js", ".cjs", ".mjs"}
SKIP_PARTS = {"node_modules", ".git", "assets", "__pycache__"}


def run(*args: str) -> None:
    print("+", " ".join(args), flush=True)
    subprocess.run(args, cwd=ROOT, check=True)


def mirror_and_syntax() -> None:
    public = ROOT / "public"
    mirrors = sorted(
        file for file in public.rglob("*")
        if file.is_file() and file.suffix in FRONTEND_SUFFIXES
    )
    # Only referenced modules must have a matching public export; legacy
    # root-only files (e.g. unused ux.css) are not part of the deployed bundle.
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    referenced = re.findall(r'(?:src|href)="([a-zA-Z0-9_-]+[.](?:js|css))"', html)
    if not referenced:
        raise AssertionError("QA-STATIC-005: no deployed JS/CSS references detected")
    for name in referenced:
        if not (public / name).is_file():
            raise AssertionError(f"QA-STATIC-004: deployed module lacks public mirror: {name}")
    if not mirrors:
        raise AssertionError("QA-STATIC-001: no root/public mirror files discovered")
    for mirror in mirrors:
        original = ROOT / mirror.relative_to(public)
        if not original.is_file() or original.read_bytes() != mirror.read_bytes():
            raise AssertionError(f"QA-STATIC-002: source/public mirror drift: {mirror.name}")

    modules = sorted(
        file for file in ROOT.rglob("*")
        if file.is_file()
        and file.suffix in JS_SUFFIXES
        and not (set(file.relative_to(ROOT).parts) & SKIP_PARTS)
    )
    if not modules:
        raise AssertionError("QA-STATIC-003: JavaScript discovery returned no modules")
    for module in modules:
        run("node", "--check", str(module.relative_to(ROOT)))
    print(f"QA-STATIC PASS: {len(mirrors)} byte-identical mirrors, {len(modules)} JS syntax checks", flush=True)


def standalone() -> None:
    artifact = ROOT / "KlinikLab_DesktopXR_Standalone.html"
    if not artifact.is_file():
        raise AssertionError("QA-BUNDLE-001: committed standalone HTML missing")
    original = artifact.read_bytes()
    run(sys.executable, "build_standalone.py")
    first = artifact.read_bytes()
    if first != original:
        raise AssertionError("QA-BUNDLE-002: committed standalone differs from regenerated output")
    run(sys.executable, "build_standalone.py")
    if artifact.read_bytes() != first:
        raise AssertionError("QA-BUNDLE-003: standalone regeneration is not deterministic")
    run("git", "diff", "--exit-code", "--", artifact.name)
    print("QA-BUNDLE PASS: byte-for-byte standalone reproducibility", flush=True)


def http_smoke() -> None:
    # Reserve a free port briefly. A start failure is explicit and never silently skipped.
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    env = {**os.environ, "PORT": str(port), "GEMINI_API_KEY": "", "AI_ACCESS_CODE": ""}
    # Avoid retaining server output in the working tree, even after exceptions.
    import tempfile
    with tempfile.TemporaryFile() as log:
        proc = subprocess.Popen(
            ["node", "server/server.mjs"], cwd=ROOT, env=env,
            stdout=log, stderr=subprocess.STDOUT,
        )
        try:
            for _ in range(70):
                if proc.poll() is not None:
                    raise AssertionError(f"QA-HTTP-001: server exited with {proc.returncode}")
                try:
                    with urlopen(origin + "/api/health", timeout=1) as response:
                        if response.status == 200:
                            break
                except (URLError, TimeoutError):
                    time.sleep(0.1)
            else:
                raise AssertionError("QA-HTTP-002: server not ready within 7s")

            def request(path: str, expected: int = 200) -> bytes:
                try:
                    with urlopen(origin + path, timeout=5) as result:
                        actual, data, headers = result.status, result.read(), result.headers
                except HTTPError as e:
                    actual, data, headers = e.code, e.read(), e.headers
                if actual != expected:
                    raise AssertionError(f"QA-HTTP-003: GET {path} expected {expected}, got {actual}")
                if headers.get("x-content-type-options") != "nosniff":
                    raise AssertionError(f"QA-HTTP-004: nosniff missing on {path}")
                return data

            html = request("/index.html")
            if html != (ROOT / "index.html").read_bytes():
                raise AssertionError("QA-HTTP-005: root HTML content mismatch")
            assets = sorted(set(re.findall(rb'(?:src|href)="([a-zA-Z0-9_-]+\.(?:js|css))"', html)))
            if not assets:
                raise AssertionError("QA-HTTP-006: no referenced scripts/stylesheets")
            for asset in assets:
                name = asset.decode("ascii")
                if request("/" + name) != (ROOT / name).read_bytes():
                    raise AssertionError(f"QA-HTTP-007: served asset differs: {name}")
            for model in (
                "assets/dundee/maxillary_first_molar.glb",
                "assets/draco/draco_decoder_gltf.wasm",
            ):
                if request("/" + model) != (ROOT / model).read_bytes():
                    raise AssertionError(f"QA-HTTP-008: served binary mismatch: {model}")
            for forbidden in ("/server/server.mjs", "/build_standalone.py", "/README.md", "/.env"):
                request(forbidden, 404)
            request("/api/ai", 405)
            print(f"QA-HTTP PASS: {len(assets)} referenced assets, 2 binary assets, restricted paths", flush=True)
        except Exception:
            log.flush()
            log.seek(0)
            print("QA-HTTP server log:\n" + log.read().decode("utf-8", "replace")[-4000:], file=sys.stderr)
            raise
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=3)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("gate", nargs="?", choices=("all", "static", "http", "bundle"), default="all")
    args = parser.parse_args()
    if args.gate in ("all", "static"):
        mirror_and_syntax()
    if args.gate in ("all", "http"):
        http_smoke()
    if args.gate in ("all", "bundle"):
        standalone()


if __name__ == "__main__":
    main()
