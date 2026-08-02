# Local media service (default image path)

LMVideoStudio now defaults image generation to the Agent System Kit loopback service at `http://127.0.0.1:18761`. It requires the explicit `stable_diffusion_cpp` provider and a qualified `image.z-image` profile. The host never starts this service or a model.

If the service, provider, or profile is unavailable, generation fails clearly. It does not fall back. Start the Agent System Kit `local_media_host.py` separately with an approved machine-local manifest and output root equal to LMVideoStudio's projects root.

Set `LMVS_IMAGE_PROVIDER=lemonade` or `worker` only to choose a compatibility path explicitly. FastWan video remains configured separately with `LMVS_VIDEO_PROVIDER=sdcpp`.

Job protocol: `GET /health`, capability discovery, `POST /v1/media/jobs` (202), status polling, and idempotent cancellation. Returned output paths must stay beneath the current project root; no media output is served over HTTP.

## Phase 2 video proposal

Video must use a separate, explicit capability/profile (for example `video.fastwan-i2v`) under the same job lifecycle. It must not reuse image profiles or introduce VACE implicitly. The direct FastWan evidence is a 121-frame 640x352/24fps Vulkan render in about 38 seconds of model time; a video extension needs separate capability discovery, output validation, cancellation, and quality qualification before implementation.
