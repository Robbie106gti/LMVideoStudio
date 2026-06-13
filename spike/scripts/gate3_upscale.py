"""Gate 3 — Real-ESRGAN 2x upscale of gate2.png."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from PIL import Image

SPIKE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SPIKE_ROOT))

from lib.gpu_utils import print_device_info, unload_torch  # noqa: E402
from lib.pipelines import unload_upsampler, upscale_image  # noqa: E402


def main() -> int:
    print("=== Gate 3: Real-ESRGAN upscale ===")
    print_device_info()

    src = SPIKE_ROOT / "out" / "gate2.png"
    if not src.exists():
        print(f"FAIL: Run gate2 first — missing {src}")
        return 1

    dst = SPIKE_ROOT / "out" / "gate3_upscaled.png"
    start = time.perf_counter()
    try:
        image = Image.open(src)
        upscaled = upscale_image(image)
        upscaled.save(dst)
    except Exception as exc:
        print(f"FAIL: upscale error: {exc}")
        return 1
    finally:
        unload_upsampler()
        unload_torch()

    elapsed = time.perf_counter() - start
    passed = dst.exists() and dst.stat().st_size > src.stat().st_size

    result = {
        "gate": 3,
        "pass": passed,
        "seconds": round(elapsed, 1),
        "input": str(src),
        "output": str(dst),
        "input_size": src.stat().st_size,
        "output_size": dst.stat().st_size,
    }
    (SPIKE_ROOT / "out" / "gate3.json").write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Wrote {dst} in {elapsed:.1f}s")
    if passed:
        print("Gate 3: PASS")
        return 0
    print("Gate 3: FAIL")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
