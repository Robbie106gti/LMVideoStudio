.PHONY: dev test test-gpu test-gpu-stress build build-fast verify-sidecars
dev:
	powershell -ExecutionPolicy Bypass -File scripts/dev.ps1

test:
	powershell -ExecutionPolicy Bypass -File scripts/test.ps1

test-gpu:
	powershell -ExecutionPolicy Bypass -File scripts/gpu_e2e_smoke.ps1

test-gpu-stress:
	powershell -ExecutionPolicy Bypass -File scripts/gpu_e2e_smoke.ps1 -Stress

build:
	powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1

build-fast:
	powershell -ExecutionPolicy Bypass -File scripts/build-sidecars.ps1 -SkipVenvCopy
	powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1 -SkipSidecars -AllowSpikeVenvFallback

verify-sidecars:
	powershell -ExecutionPolicy Bypass -File scripts/verify-sidecar-staging.ps1
