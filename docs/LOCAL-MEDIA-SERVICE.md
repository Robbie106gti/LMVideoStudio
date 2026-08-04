# Local media service

LMVideoStudio defaults image generation to the Agent System Kit loopback service at `http://127.0.0.1:18761`. Images require `lemonade/image.z-image`. Video remains explicit and opt-in: set `LMVS_VIDEO_PROVIDER=local-media` to require `stable_diffusion_cpp_video/video.fastwan2.2-ti2v-5b`. The host never starts either provider or a model.

If the service, provider, or profile is unavailable, generation fails clearly. It does not fall back. Start the shared service separately and set `LMVS_LOCAL_MEDIA_OUTPUT_ROOT` to the same output root used by that service. When unset, LMVideoStudio uses its project store root.

Video generation defaults to provider `stable_diffusion_cpp_video` and logical model `video.fastwan2.2-ti2v-5b`. The shared service exposes that profile only when the external loopback server advertises both `vid_gen` and a FastWan model. Override `LMVS_LOCAL_MEDIA_VIDEO_PROVIDER` and `LMVS_LOCAL_MEDIA_VIDEO_MODEL` together only for an explicitly qualified alternative such as a ComfyUI workflow.

Set `LMVS_IMAGE_PROVIDER=lemonade` or `worker` only to choose a compatibility path explicitly. Set `LMVS_VIDEO_PROVIDER=sdcpp` only for the legacy FastWan service.

Job protocol: `GET /health`, capability discovery, `POST /v1/media/jobs` (202), status polling, and idempotent cancellation. Returned output paths must stay beneath the current project root; no media output is served over HTTP.

Video uses its own explicit operation and profile under the same job lifecycle. It does not reuse image profiles or introduce VACE implicitly. ComfyUI job IDs are cancelled through its prompt-specific cancellation route, and completed MP4 output is validated before LMVideoStudio attaches it to the block.
