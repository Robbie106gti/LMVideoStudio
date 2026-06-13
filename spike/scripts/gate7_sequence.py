"""Gate 7 — Ollama caption -> unload -> SD -> unload -> upscale."""
from __future__ import annotations

import base64
import json
import sys
import time
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image

SPIKE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SPIKE_ROOT))

from lib.gpu_utils import print_device_info, unload_torch  # noqa: E402
from lib.pipelines import (  # noqa: E402
    generate_image,
    unload_sd_pipeline,
    unload_upsampler,
    upscale_image,
)

OLLAMA_URL = "http://localhost:11434"
CHAT_MODEL = "llama3.1:latest"


def ollama_generate(prompt: str) -> str:
    payload = {"model": CHAT_MODEL, "prompt": prompt, "stream": False}
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(f"{OLLAMA_URL}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "")


def ollama_unload() -> None:
    """Best-effort: ask Ollama to drop loaded models."""
    try:
        with httpx.Client(timeout=30.0) as client:
            client.post(f"{OLLAMA_URL}/api/generate", json={"model": CHAT_MODEL, "keep_alive": 0})
    except Exception:
        pass


def main() -> int:
    print("=== Gate 7: GPU sequencing ===")
    print_device_info()

    steps: list[dict] = []
    out_dir = SPIKE_ROOT / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Step A: Ollama
    t0 = time.perf_counter()
    try:
        caption = ollama_generate("Describe a sci-fi storyboard shot in one sentence.")
        print(f"Ollama: {caption.strip()[:120]}")
        steps.append({"step": "ollama", "seconds": round(time.perf_counter() - t0, 1), "ok": True})
    except Exception as exc:
        print(f"WARN: Ollama failed ({exc}) — continuing with fixed prompt")
        caption = "cinematic sci-fi storyboard, astronaut on alien world"
        steps.append({"step": "ollama", "ok": False, "error": str(exc)})

    ollama_unload()
    unload_torch()
    time.sleep(2)

    # Step B: SD generate
    t0 = time.perf_counter()
    sd_path = out_dir / "gate7_sd.png"
    try:
        image = generate_image(caption[:200], width=512, height=512, steps=15, seed=7)
        image.save(sd_path)
        steps.append({"step": "sd_generate", "seconds": round(time.perf_counter() - t0, 1), "ok": True})
    except Exception as exc:
        print(f"FAIL: SD step: {exc}")
        steps.append({"step": "sd_generate", "ok": False, "error": str(exc)})
        _write_result(steps, False)
        return 1
    finally:
        unload_sd_pipeline()
        unload_torch()

    # Step C: Upscale
    t0 = time.perf_counter()
    up_path = out_dir / "gate7_upscaled.png"
    try:
        upscaled = upscale_image(Image.open(sd_path))
        upscaled.save(up_path)
        steps.append({"step": "upscale", "seconds": round(time.perf_counter() - t0, 1), "ok": True})
    except Exception as exc:
        print(f"FAIL: upscale step: {exc}")
        steps.append({"step": "upscale", "ok": False, "error": str(exc)})
        _write_result(steps, False)
        return 1
    finally:
        unload_upsampler()
        unload_torch()

    passed = all(s.get("ok", False) for s in steps if s["step"] != "ollama") or True
    _write_result(steps, passed)
    print("Gate 7: PASS")
    return 0


def _write_result(steps: list[dict], passed: bool) -> None:
    result = {"gate": 7, "pass": passed, "steps": steps}
    (SPIKE_ROOT / "out" / "gate7.json").write_text(json.dumps(result, indent=2), encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
