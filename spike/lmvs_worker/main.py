"""Minimal FastAPI worker — spike Gate 5 prototype."""
from __future__ import annotations

import base64
import io
import os
import sys
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field
from PIL import Image

# Allow running from repo root or frozen bundle
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.gpu_utils import torch_device_info, unload_torch  # noqa: E402
from lib.pipelines import (  # noqa: E402
    generate_image,
    models_loaded_status,
    unload_sd_pipeline,
    unload_upsampler,
    upscale_image,
)

app = FastAPI(title="LMVS Spike Worker", version="0.0.1-spike")
PORT = int(os.environ.get("LMVS_WORKER_PORT", "8765"))


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    width: int = 512
    height: int = 512
    steps: int = 20
    seed: int = 42


class UpscaleRequest(BaseModel):
    image_base64: str


@app.get("/health")
def health():
    info = torch_device_info()
    return {
        "rocm": info.get("rocm", False),
        "vram_gb": info.get("vram_gb"),
        "device_name": info.get("device_name"),
        "torch_device": info.get("torch_device"),
        "models_loaded": models_loaded_status(),
    }


def _device_payload() -> dict[str, Any]:
    info = torch_device_info()
    return {
        "rocm": info.get("rocm", False),
        "device_name": info.get("device_name"),
        "torch_device": info.get("torch_device"),
        "vram_gb": info.get("vram_gb"),
    }


@app.post("/image/generate")
def image_generate(req: GenerateRequest):
    unload_upsampler()
    image = generate_image(
        req.prompt,
        width=req.width,
        height=req.height,
        steps=req.steps,
        seed=req.seed,
    )
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return {
        "image_base64": base64.b64encode(buf.getvalue()).decode("ascii"),
        "device": _device_payload(),
    }


@app.post("/image/upscale")
def image_upscale(req: UpscaleRequest):
    unload_sd_pipeline()
    raw = base64.b64decode(req.image_base64)
    image = Image.open(io.BytesIO(raw))
    upscaled = upscale_image(image)
    buf = io.BytesIO()
    upscaled.save(buf, format="PNG")
    return {"image_base64": base64.b64encode(buf.getvalue()).decode("ascii")}


@app.post("/unload")
def unload_all():
    unload_sd_pipeline()
    unload_upsampler()
    unload_torch()
    return {"ok": True}


def main():
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")


if __name__ == "__main__":
    main()
