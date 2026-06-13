"""Gate 2 — diffusers 512x512 thumbnail, no torchao."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

SPIKE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SPIKE_ROOT))

from lib.gpu_utils import print_device_info, unload_torch  # noqa: E402
from lib.pipelines import generate_image, unload_sd_pipeline  # noqa: E402


def main() -> int:
    print("=== Gate 2: diffusers generate ===")
    print_device_info()

    # Confirm no torchao
    try:
        import importlib.util

        if importlib.util.find_spec("torchao") is not None:
            print("FAIL: torchao is installed — remove it")
            return 1
    except Exception:
        pass

    out_path = SPIKE_ROOT / "out" / "gate2.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    prompt = "cinematic storyboard frame, lone astronaut on red planet, wide shot, moody lighting"
    start = time.perf_counter()
    try:
        image = generate_image(prompt, width=512, height=512, steps=20, seed=42)
        image.save(out_path)
    except Exception as exc:
        print(f"FAIL: generation error: {exc}")
        return 1
    finally:
        unload_sd_pipeline()
        unload_torch()

    elapsed = time.perf_counter() - start
    # Cold first run includes ROCm AOTriton compile; warm runs are typically <30s.
    passed = out_path.exists() and out_path.stat().st_size > 0 and elapsed < 300

    result = {
        "gate": 2,
        "pass": passed,
        "seconds": round(elapsed, 1),
        "output": str(out_path),
        "note": "Pass if image written within 300s (cold ROCm compile on first run can exceed 120s)",
    }
    (SPIKE_ROOT / "out" / "gate2.json").write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Wrote {out_path} in {elapsed:.1f}s")
    if passed:
        print("Gate 2: PASS")
        return 0
    print(f"Gate 2: FAIL (time limit 120s, got {elapsed:.1f}s)")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
