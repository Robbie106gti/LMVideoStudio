"""Lazy-loaded SD + Real-ESRGAN pipelines for spike gates and worker."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

SD_MODEL = os.environ.get("LMVS_SD_MODEL", "runwayml/stable-diffusion-v1-5")
ESRGAN_MODEL = os.environ.get("LMVS_ESRGAN_MODEL", "RealESRGAN_x2plus")


def configure_hf_cache() -> Path:
    """Pin Hugging Face cache under repo/sidecars to avoid roaming profile bloat."""
    root = os.environ.get("LMVS_REPO_ROOT", "")
    if root:
        cache = Path(root) / "sidecars" / "lmvs_worker" / "hf_cache"
    else:
        cache = Path(__file__).resolve().parents[1] / "hf_cache"
    cache.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("HF_HOME", str(cache))
    os.environ.setdefault("HUGGINGFACE_HUB_CACHE", str(cache / "hub"))
    os.environ.setdefault("TRANSFORMERS_CACHE", str(cache / "transformers"))
    return cache


configure_hf_cache()

_pipe: Any = None
_upsampler: Any = None


def get_sd_pipeline():
    global _pipe
    if _pipe is not None:
        return _pipe

    import torch
    from diffusers import StableDiffusionPipeline

    dtype = torch.float16
    _pipe = StableDiffusionPipeline.from_pretrained(
        SD_MODEL,
        torch_dtype=dtype,
        safety_checker=None,
        requires_safety_checker=False,
    )
    _pipe = _pipe.to("cuda")
    _pipe.enable_attention_slicing()
    return _pipe


def unload_sd_pipeline() -> None:
    global _pipe
    if _pipe is not None:
        del _pipe
        _pipe = None
    from lib.gpu_utils import unload_torch

    unload_torch()


def generate_image(
    prompt: str,
    *,
    width: int = 512,
    height: int = 512,
    steps: int = 20,
    seed: int = 42,
):
    import torch
    from PIL import Image

    pipe = get_sd_pipeline()
    generator = torch.Generator(device="cuda").manual_seed(seed)
    result = pipe(
        prompt,
        width=width,
        height=height,
        num_inference_steps=steps,
        generator=generator,
    )
    return result.images[0]


def get_upsampler():
    global _upsampler
    if _upsampler is not None:
        return _upsampler

    # basicsr expects removed torchvision.transforms.functional_tensor (torchvision 0.24+)
    import sys

    import torchvision.transforms.functional as F

    sys.modules["torchvision.transforms.functional_tensor"] = F

    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer

    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=23,
        num_grow_ch=32,
        scale=2,
    )
    weights_dir = Path(__file__).resolve().parents[1] / "models"
    weights_dir.mkdir(parents=True, exist_ok=True)
    model_path = weights_dir / f"{ESRGAN_MODEL}.pth"
    if not model_path.exists():
        import urllib.request

        url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth"
        print(f"Downloading {ESRGAN_MODEL} weights to {model_path} ...")
        urllib.request.urlretrieve(url, model_path)

    _upsampler = RealESRGANer(
        scale=2,
        model_path=str(model_path),
        model=model,
        tile=400,
        tile_pad=10,
        pre_pad=0,
        half=True,
        device="cuda",
    )
    return _upsampler


def unload_upsampler() -> None:
    global _upsampler
    if _upsampler is not None:
        del _upsampler
        _upsampler = None
    from lib.gpu_utils import unload_torch

    unload_torch()


def upscale_image(image):
    import numpy as np
    from PIL import Image

    upsampler = get_upsampler()
    img_np = np.array(image.convert("RGB"))
    output, _ = upsampler.enhance(img_np, outscale=2)
    return Image.fromarray(output)


def models_loaded_status() -> dict[str, bool]:
    return {"sd": _pipe is not None, "esrgan": _upsampler is not None}
