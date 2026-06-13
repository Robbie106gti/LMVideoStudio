"""Shared GPU helpers for spike gates."""
from __future__ import annotations

import gc
import os
from typing import Any


def configure_hip_visible_devices() -> str | None:
    """Respect HIP_VISIBLE_DEVICES if set; callers may set before import torch."""
    return os.environ.get("HIP_VISIBLE_DEVICES")


def unload_torch() -> None:
    """Best-effort GPU memory release between pipeline steps."""
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    except ImportError:
        pass


def torch_device_info() -> dict[str, Any]:
    import torch

    available = torch.cuda.is_available()
    info: dict[str, Any] = {
        "rocm": available,
        "device_count": torch.cuda.device_count() if available else 0,
        "hip_visible_devices": configure_hip_visible_devices(),
    }
    if available:
        props = torch.cuda.get_device_properties(0)
        info["device_name"] = torch.cuda.get_device_name(0)
        info["vram_gb"] = round(props.total_memory / 1e9, 1)
        info["torch_version"] = torch.__version__
    return info


def print_device_info(prefix: str = "") -> dict[str, Any]:
    info = torch_device_info()
    label = f"{prefix} " if prefix else ""
    print(f"{label}torch.cuda.is_available(): {info['rocm']}")
    if info["rocm"]:
        print(f"{label}device: {info['device_name']}")
        print(f"{label}vram_gb: {info['vram_gb']}")
        print(f"{label}torch: {info.get('torch_version', '?')}")
    if info.get("hip_visible_devices") is not None:
        print(f"{label}HIP_VISIBLE_DEVICES={info['hip_visible_devices']}")
    return info
