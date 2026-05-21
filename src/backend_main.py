import os
import sys
import threading
import time

import uvicorn


if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

from main import app


def _is_process_running(pid: int) -> bool:
    if pid <= 0:
        return False

    if sys.platform == "win32":
        import ctypes

        process_query_limited_information = 0x1000
        handle = ctypes.windll.kernel32.OpenProcess(
            process_query_limited_information,
            False,
            pid,
        )
        if handle:
            ctypes.windll.kernel32.CloseHandle(handle)
            return True
        return False

    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _watch_parent_process() -> None:
    parent_pid = int(os.getenv("NAVISTAR_PARENT_PID", "0") or "0")
    if not parent_pid:
        return

    while True:
        if not _is_process_running(parent_pid):
            os._exit(0)
        time.sleep(1)


if __name__ == "__main__":
    if os.getenv("NAVISTAR_PARENT_PID"):
        threading.Thread(target=_watch_parent_process, daemon=True).start()

    port = int(os.getenv("NAVISTAR_BACKEND_PORT", "8000"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
