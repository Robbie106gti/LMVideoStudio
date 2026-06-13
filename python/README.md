# LMVS Python worker (promoted from spike)

Run from `python/` as working directory:

`powershell
.\.venv\Scripts\python.exe -m uvicorn lmvs_worker.main:app --host 127.0.0.1 --port 8765
`

Shared libraries live in `python/lib/`. Sidecar packaging uses `scripts/build-sidecars.ps1`.
