"""Shared GPU helpers for spike gates and the Python worker."""
from __future__ import annotations

import gc
import os
import sys
from typing import Any


def _is_darwin() -> bool:
    return sys.platform == "darwin"


def configure_hip_visible_devices() -> str | None:
    """Respect HIP_VISIBLE_DEVICES if set; callers may set before import torch."""
    return os.environ.get("HIP_VISIBLE_DEVICES")


def _mps_available() -> bool:
    try:
        import torch

        return bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available())
    except ImportError:
        return False


def unload_torch() -> None:
    """Best-effort GPU memory release between pipeline steps."""
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
        elif _is_darwin() and _mps_available():
            torch.mps.empty_cache()
    except ImportError:
        pass


def torch_active_device() -> str:
    """PyTorch device string: cuda (ROCm/CUDA), mps (Apple Silicon), or cpu."""
    try:
        import torch

        if torch.cuda.is_available():
            return f"cuda:{torch.cuda.current_device()}"
        if _is_darwin() and _mps_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def torch_device_info() -> dict[str, Any]:
    import torch

    cuda_available = torch.cuda.is_available()
    mps_available = _is_darwin() and _mps_available()
    backend = "mps" if mps_available else ("cuda" if cuda_available else "cpu")

    info: dict[str, Any] = {
        "platform": sys.platform,
        "backend": backend,
        "rocm": cuda_available,
        "mps": mps_available,
        "device_count": torch.cuda.device_count() if cuda_available else (1 if mps_available else 0),
        "hip_visible_devices": configure_hip_visible_devices(),
        "torch_device": torch_active_device(),
        "torch_version": torch.__version__,
    }

    if cuda_available:
        props = torch.cuda.get_device_properties(0)
        info["device_name"] = torch.cuda.get_device_name(0)
        # PyTorch reports bytes; use GiB (1024^3) so a "16 GB" card shows 16, not ~17 from / 1e9.
        info["vram_gb"] = round(props.total_memory / (1024**3), 1)
    elif mps_available:
        info["device_name"] = "Apple Metal (MPS)"
    return info


def print_device_info(prefix: str = "") -> dict[str, Any]:
    info = torch_device_info()
    label = f"{prefix} " if prefix else ""
    print(f"{label}backend: {info['backend']}")
    if info["rocm"]:
        print(f"{label}torch.cuda.is_available(): True")
        print(f"{label}device: {info.get('device_name', '?')}")
        print(f"{label}vram_gb: {info.get('vram_gb', '?')}")
    elif info.get("mps"):
        print(f"{label}torch.backends.mps.is_available(): True")
        print(f"{label}device: {info.get('device_name', 'Apple Metal (MPS)')}")
    print(f"{label}torch: {info.get('torch_version', '?')}")
    if info.get("hip_visible_devices") is not None:
        print(f"{label}HIP_VISIBLE_DEVICES={info['hip_visible_devices']}")
    return info
