"""Smoke tests for worker GET /health — no GPU required."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from lmvs_worker.main import app

HEALTH_KEYS = frozenset(
    {"rocm", "vram_gb", "device_name", "torch_device", "models_loaded", "hf_cache"}
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_returns_200_with_expected_keys(client: TestClient) -> None:
    """Mocked device info — runs in CI without torch or GPU."""
    mock_info = {
        "rocm": False,
        "vram_gb": None,
        "device_name": None,
        "torch_device": "cpu",
    }
    with patch("lmvs_worker.main.torch_device_info", return_value=mock_info):
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert HEALTH_KEYS <= set(body.keys())
    assert body["rocm"] is False
    assert body["torch_device"] == "cpu"
    assert body["vram_gb"] is None
    assert body["device_name"] is None
    assert body["models_loaded"] == {"sd": False, "esrgan": False}
    assert isinstance(body["hf_cache"], str)
    assert body["hf_cache"]


def test_health_graceful_when_torch_missing(client: TestClient) -> None:
    """Simulate absent torch by returning CPU fallback fields from the mock."""
    mock_info = {
        "rocm": False,
        "vram_gb": None,
        "device_name": None,
        "torch_device": "cpu",
    }
    with patch("lmvs_worker.main.torch_device_info", return_value=mock_info):
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    for key in ("rocm", "device_name", "torch_device", "vram_gb"):
        assert key in body


def test_health_live_when_torch_available(client: TestClient) -> None:
    """Integration check when torch is installed (CPU-only hosts OK)."""
    pytest.importorskip("torch")
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert HEALTH_KEYS <= set(body.keys())
    assert isinstance(body["rocm"], bool)
    assert isinstance(body["torch_device"], str)
    assert body["torch_device"]  # non-empty device string
    if body["vram_gb"] is not None:
        assert isinstance(body["vram_gb"], (int, float))
    if body["device_name"] is not None:
        assert isinstance(body["device_name"], str)
