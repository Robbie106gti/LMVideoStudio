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


def _prepare_init_image(init_image, width: int, height: int):
    """Cover-crop reference to fill the SD canvas (no black letterbox bars)."""
    from PIL import Image

    img = init_image.convert("RGB")
    w, h = img.size
    resample = (
        Image.Resampling.NEAREST
        if max(w, h) <= 256
        else Image.Resampling.LANCZOS
    )
    scale = max(width / w, height / h)
    nw = max(1, int(w * scale))
    nh = max(1, int(h * scale))
    resized = img.resize((nw, nh), resample)
    left = max(0, (nw - width) // 2)
    top = max(0, (nh - height) // 2)
    return resized.crop((left, top, left + width, top + height))


DEFAULT_NEGATIVE_PROMPT = (
    "deformed, blurry, bad anatomy, extra limbs, duplicate face, disfigured, "
    "poorly drawn face, mutation, ugly, watermark, text, logo"
)


def _sd_canvas_size(width: int, height: int) -> tuple[int, int]:
    """SD 1.5 works best near 512px on the long edge; dimensions must be multiples of 8."""
    aspect = width / max(height, 1)
    if aspect >= 1.0:
        sd_w = 512
        sd_h = max(8, int(round(512 / aspect / 8)) * 8)
    else:
        sd_h = 512
        sd_w = max(8, int(round(512 * aspect / 8)) * 8)
    return sd_w, sd_h


def generate_image(
    prompt: str,
    *,
    width: int = 512,
    height: int = 512,
    steps: int = 20,
    seed: int = 42,
    init_image=None,
    strength: float = 0.35,
    negative_prompt: str | None = None,
):
    import torch
    from PIL import Image

    pipe = get_sd_pipeline()
    generator = torch.Generator(device="cuda").manual_seed(seed)

    if init_image is not None:
        from diffusers import StableDiffusionImg2ImgPipeline

        img2img = StableDiffusionImg2ImgPipeline.from_pipe(pipe)
        sd_w, sd_h = _sd_canvas_size(width, height)
        init_rgb = _prepare_init_image(init_image, sd_w, sd_h)
        img_steps = max(steps, 28)
        strength_clamped = max(0.05, min(0.95, strength))
        print(
            f"[lmvs] img2img canvas={sd_w}x{sd_h} strength={strength_clamped:.2f} "
            f"steps={img_steps} target={width}x{height}",
            flush=True,
        )
        result = img2img(
            prompt=prompt,
            negative_prompt=negative_prompt or DEFAULT_NEGATIVE_PROMPT,
            image=init_rgb,
            strength=strength_clamped,
            num_inference_steps=img_steps,
            guidance_scale=6.0,
            generator=generator,
        )
        out = result.images[0]
        if (out.width, out.height) != (width, height):
            out = out.resize((width, height), Image.Resampling.LANCZOS)
        return out

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
