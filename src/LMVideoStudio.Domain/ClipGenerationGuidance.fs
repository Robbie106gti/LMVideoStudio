namespace LMVideoStudio.Domain

type ClipResolutionTier =
    | P1080
    | P900
    | P720

/// VRAM-aware clip length and prompt guidance inspired by local LTX Director 2.0 workflows.
module ClipGenerationGuidance =
    let resolutionTierForShot =
        function
        | FaceCloseUp -> P1080
        | MediumClose -> P900
        | BackWide
        | EnvironmentWide -> P720

    let resolutionLabel =
        function
        | P1080 -> "1080p"
        | P900 -> "900p"
        | P720 -> "720p"

    /// Max recommended AI clip length (seconds) at 25 fps before OOM on typical VRAM budgets.
    let private maxClipSecondsAt8Gb =
        function
        | P1080 -> 8.0
        | P900 -> 12.0
        | P720 -> 19.0

    let maxClipSeconds (vramGb: float) (tier: ClipResolutionTier) =
        let baseline = maxClipSecondsAt8Gb tier

        if vramGb <= 8.5 then
            baseline
        elif vramGb <= 16.5 then
            baseline * 1.5
        else
            baseline * 2.0

    let recommendedMaxSeconds (profile: HardwareProfile) (kind: BlockShotKind) =
        maxClipSeconds (HardwareProfile.vramBudgetGb profile) (resolutionTierForShot kind)

    let recommendedBakeDuration (profile: HardwareProfile) (kind: BlockShotKind) =
        recommendedMaxSeconds profile kind |> min 30.0

    let hasGuideFrame (block: StoryboardBlock) =
        block.ThumbnailPath.IsSome
        || (block.Generation
            |> Option.bind (fun g -> g.ReferenceAssetPath)
            |> Option.isSome)

    let promptHint (block: StoryboardBlock) =
        if hasGuideFrame block then
            "Guide frame set — describe action, camera, and pacing only. For a new location or angle, add a guide image or cut to a new block."
        else
            "No guide frame — describe geography and look (subject, setting, lighting). Use quick prompts for motion once you have a thumbnail."

    let continuationHint (blockIndex: int) (prevBlock: StoryboardBlock option) =
        match blockIndex, prevBlock with
        | 0, _ -> None
        | _, Some prev when hasGuideFrame prev ->
            Some "Previous block has a guide frame — video-to-video continuation works best for motion, not complex camera geography. Use a cut + new guide for location changes."
        | _, _ -> None

    let guidanceSummary (profile: HardwareProfile) (kind: BlockShotKind) =
        let tier = resolutionTierForShot kind
        let res = resolutionLabel tier
        let maxSec = recommendedMaxSeconds profile kind |> int

        $"{res} · up to ~{maxSec}s @ 25fps on {HardwareProfile.label profile}"

    let durationExceedsGuidance (profile: HardwareProfile) (kind: BlockShotKind) (durationSec: float) =
        durationSec > recommendedMaxSeconds profile kind + 0.01

    let suggestedBakeDurationForShot (kind: BlockShotKind) =
        recommendedBakeDuration Minimal kind
