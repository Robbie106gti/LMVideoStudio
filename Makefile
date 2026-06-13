.PHONY: dev test build build-fast
dev:
	powershell -ExecutionPolicy Bypass -File scripts/dev.ps1

test:
	powershell -ExecutionPolicy Bypass -File scripts/test.ps1

build:
	powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1

build-fast:
	powershell -ExecutionPolicy Bypass -File scripts/build-sidecars.ps1 -SkipVenvCopy
	powershell -ExecutionPolicy Bypass -File scripts/build-installer.ps1 -SkipSidecars
