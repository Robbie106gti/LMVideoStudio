"""Minimal FastAPI worker — spike Gate 5 prototype."""
from __future__ import annotations

import base64
import io
import math
import os
import struct
import sys
import wave
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
    configure_hf_cache,
    generate_image,
    models_loaded_status,
    unload_sd_pipeline,
    unload_upsampler,
    upscale_image,
)

app = FastAPI(title="LMVS Spike Worker", version="0.0.1-spike")
PORT = int(os.environ.get("LMVS_WORKER_PORT", "8765"))

configure_hf_cache()


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    width: int = 512
    height: int = 512
    steps: int = 20
    seed: int = 42


class UpscaleRequest(BaseModel):
    image_base64: str


class AudioGenerateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def synthesize_voiceover_wav(text: str, sample_rate: int = 22050) -> bytes:
    """Placeholder local TTS — tone pattern sized to script length (Phase 0 stub)."""
    words = max(1, len(text.split()))
    duration_sec = min(30.0, max(1.2, words * 0.35))
    n_samples = int(sample_rate * duration_sec)
    buf = io.BytesIO()

    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)

        frames = bytearray()
        for i in range(n_samples):
            t = i / sample_rate
            # Gentle alternating tones — audible placeholder until full TTS model ships
            freq = 220.0 + (hash(text) % 80)
            amp = 0.18 * (0.85 + 0.15 * math.sin(t * 2.5))
            sample = int(amp * 32767 * math.sin(2 * math.pi * freq * t))
            frames.extend(struct.pack("<h", sample))

        wf.writeframes(bytes(frames))

    return buf.getvalue()


@app.get("/health")
def health():
    info = torch_device_info()
    return {
        "rocm": info.get("rocm", False),
        "vram_gb": info.get("vram_gb"),
        "device_name": info.get("device_name"),
        "torch_device": info.get("torch_device"),
        "models_loaded": models_loaded_status(),
        "hf_cache": str(configure_hf_cache()),
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


@app.post("/audio/generate")
def audio_generate(req: AudioGenerateRequest):
    """TTS stub — synthesizes WAV via GPU queue slot; full TTS model deferred."""
    unload_sd_pipeline()
    unload_upsampler()
    wav_bytes = synthesize_voiceover_wav(req.text.strip())
    return {
        "audio_base64": base64.b64encode(wav_bytes).decode("ascii"),
        "format": "wav",
        "device": _device_payload(),
    }


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
