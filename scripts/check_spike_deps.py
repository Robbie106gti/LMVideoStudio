"""Verify worker venv guardrails for Phase 0 bake-in."""
import importlib.util
import sys


def main() -> int:
    issues: list[str] = []
    if importlib.util.find_spec("torchao"):
        issues.append("torchao is installed — remove it")
    try:
        import torch

        if not torch.cuda.is_available():
            issues.append("torch.cuda.is_available() is False")
        else:
            print(f"ROCm OK: {torch.cuda.get_device_name(0)} torch {torch.__version__}")
    except Exception as exc:
        issues.append(f"torch: {exc}")

    for line in issues:
        print(f"ISSUE: {line}")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
