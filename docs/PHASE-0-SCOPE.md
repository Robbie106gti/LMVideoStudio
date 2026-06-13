# Phase 0 — Explicit scope boundary

> **Rule:** If it is not listed under **In scope**, it is **not Phase 0** — no matter what else the architecture plan mentions.

North Star v1 is the personal ship target **after** Phases 0–2. Phase 0 only gets the shell, sidecars, bootstrap, and a manual storyboard you can install and update.

## In scope (Phase 0)

| Area | Deliverable |
|------|-------------|
| **Shell** | Tauri + Fable app window, navigation shell, empty project hub |
| **Sidecars** | Spawn/monitor F# Host + embedded Python venv worker (spike pattern) |
| **Bootstrap** | First-run + Repair: driver preflight, Ollama, `sync_models.ps1 -Pull`, sidecar health |
| **Activity UX** | Bootstrap step list, status bar (sidecars/GPU), ActivityPanel skeleton |
| **Conflicts** | `detect_gpu_conflicts.ps1` → Host `/system/conflicts/scan` (advisory) |
| **Job events** | SSE skeleton + [`job-events.schema.json`](job-events.schema.json) |
| **Storyboard MVP** | Project folder CRUD, timeline import/reorder/save (no AI); **default 3–4 s mockup block duration** in domain types |
| **Schema** | [`project.schema.json`](project.schema.json) — validate on Host load (headless handoff ready; CLI in Phase 4) |
| **Build** | `build-sidecars.ps1` skeleton (local ROCm venv copy) |
| **Updater** | Tauri updater config + stub “Check for updates” (no release required yet) |
| **Bake-in** | Pinned deps, no torchao check, GPU single-flight queue skeleton in Host |

## Explicitly out of scope (Phase 0)

- AI thumbnail / audio generation UI
- Brief → outline, prompt templates, ×3 variants
- Ken Burns export, Premiere XML, Share Pack, PDF, **Bake job**, **`lmvs` CLI**
- Undo/redo, mood tags, style pack auto-extract (Phase 1b+)
- OAuth, stores, Mac port, ComfyUI, cloud providers
- PyInstaller frozen worker (track B only)
- GitHub Actions release with GPU build (local sidecar build OK)

## Exit criteria

1. Install from local/dev installer path on 9070 XT machine.
2. Bootstrap completes with visible step progress (including cold GPU message if warmup runs).
3. Create project → import images → reorder blocks → save — **no terminal**.
4. `bootstrap_smoke.ps1` passes (Gate 10).
5. Repair setup restarts sidecars and re-runs model check.
6. (Stretch) One tagged Release + in-app update works.

## Scripts (preflight / smoke)

```powershell
.\scripts\detect_gpu_conflicts.ps1
.\scripts\check_spike_deps.ps1
.\scripts\bootstrap_smoke.ps1
.\scripts\sync_models.ps1 -Check
```

## After Phase 0

Phase 1 = storyboard polish (templates, notes, import wizard) + mockup duration defaults.  
Phase 2 = **one** thumbnail generate path (mockup profile, not ×3).  
Phase 4a = mockup preview reel; Phase 4b = bake full video.  
North Star v1 = Phase 2 + mockup preview + bake MP4 + **one** handoff path + **`lmvs validate|preview|bake`**.
