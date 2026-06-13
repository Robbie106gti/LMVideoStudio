namespace LMVideoStudio.Domain

/// VRAM / GPU profile presets for queue scheduling (Phase 0 skeleton).
type HardwareProfile =
    | Minimal
    | Standard
    | High

module HardwareProfile =
    let defaultProfile = Standard

    let vramBudgetGb =
        function
        | Minimal -> 8.0
        | Standard -> 16.0
        | High -> 24.0

    let label =
        function
        | Minimal -> "Minimal (8 GB)"
        | Standard -> "Standard (16 GB)"
        | High -> "High (24 GB+)"

type GpuJobKind =
    | ImageGenerate
    | ImageUpscale
    | AudioGenerate
    | MockupPreview
    | BakeExport

type GpuJobStatus =
    | Queued
    | Running
    | Completed
    | Failed
    | Cancelled

type GpuJobRequest =
    { Id: System.Guid
      Kind: GpuJobKind
      Profile: HardwareProfile
      EnqueuedAt: System.DateTimeOffset }

/// Single-flight GPU queue contract (Host implements execution).
type IGpuJobQueue =
    abstract Enqueue: GpuJobRequest -> Async<GpuJobRequest>
    abstract TryDequeue: unit -> GpuJobRequest option
    abstract Current: GpuJobRequest option
    abstract CompleteCurrent: GpuJobStatus -> unit
