"""Unreal 5.8 persistent Editor startup callback, NOT -ExecutePythonScript.

The init_unreal.py hook may run before the startup map is fully ready.
Defer the camera module until Slate has started ticking, then bootstrap.
Neither hook needs user foreground or input.
"""
import os
import time
from pathlib import Path
import unreal

if os.environ.get('KLINIKLAB_SR1J_CAPTURE_ENABLED') == '1':
    _source = Path(__file__).resolve().with_name('kl_sr1j_capture.py')
    if not _source.is_file():
        raise RuntimeError('Pinned SR1J native Unreal callback module missing')
    _start = time.monotonic()
    _bootstrap_handle = None
    _loaded = False

    def _start_sr1j_when_editor_ready(_delta):
        global _loaded
        if _loaded or time.monotonic() - _start < 4.0:
            return
        _loaded = True
        try:
            unreal.unregister_slate_post_tick_callback(_bootstrap_handle)
            scope = {'__name__':'__main__','__file__':str(_source)}
            exec(compile(_source.read_bytes(), str(_source), 'exec'), scope)
            unreal.log('KlinikLab native UE whole-clinic callback bootstrapped from Editor init')
        except Exception as exc:
            unreal.log_error('SR1J native Editor startup blocked: '+str(exc))
            unreal.SystemLibrary.quit_editor()

    _bootstrap_handle = unreal.register_slate_post_tick_callback(
        _start_sr1j_when_editor_ready)
