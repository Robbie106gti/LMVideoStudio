"""Gate 1 — ROCm PyTorch sees the GPU."""
from __future__ import annotations

import json
import sys
from pathlib import Path

SPIKE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SPIKE_ROOT))

from lib.gpu_utils import print_device_info  # noqa: E402


def main() -> int:
    print("=== Gate 1: ROCm PyTorch ===")
    info = print_device_info()

    # List all devices if multiple
    import torch

    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            print(f"  device[{i}]: {torch.cuda.get_device_name(i)}")

    passed = bool(info.get("rocm"))
    name = str(info.get("device_name", "")).lower()
    if passed and "9070" not in name and "radeon" not in name:
        print("WARN: GPU name does not mention Radeon/9070 — verify HIP_VISIBLE_DEVICES")

    out = SPIKE_ROOT / "out" / "gate1.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {
                "gate": 1,
                "pass": passed,
                "info": info,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    if passed:
        print("\nGate 1: PASS")
        return 0
    print("\nGate 1: FAIL — try: $env:HIP_VISIBLE_DEVICES='1' (or '0')")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
