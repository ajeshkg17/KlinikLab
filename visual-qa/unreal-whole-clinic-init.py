"""Unreal 5.8 Project/Content/Python/init_unreal.py installed ONLY for SR1J capture.

Epic's -ExecutePythonScript process shuts down immediately after Python
returns. A normal Unreal Editor init_unreal.py startup hook stays alive for
Slate post-tick callbacks, so a 42-second orbit can actually render.
No user-desktop/foreground fallback.
"""
import os
from pathlib import Path

if os.environ.get('KLINIKLAB_SR1J_CAPTURE_ENABLED') == '1':
    this_file = Path(__file__).resolve()
    capture = this_file.with_name('kl_sr1j_capture.py')
    if not capture.is_file():
        raise RuntimeError('Pinned SR1J native Unreal callback module missing')
    scope = {'__name__': '__main__', '__file__': str(capture)}
    exec(compile(capture.read_bytes(), str(capture), 'exec'), scope)
