import { Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { union_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { HardwareProfile, HardwareProfileModule_label, HardwareProfileModule_vramBudgetGb } from "./HardwareProfile.js";
import { min } from "../fable_modules/fable-library-js.4.27.0/Double.js";
import { bind } from "../fable_modules/fable-library-js.4.27.0/Option.js";

export class ClipResolutionTier extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["P1080", "P900", "P720"];
    }
}

export function ClipResolutionTier_$reflection() {
    return union_type("LMVideoStudio.Domain.ClipResolutionTier", [], ClipResolutionTier, () => [[], [], []]);
}

export function ClipGenerationGuidance_resolutionTierForShot(_arg) {
    switch (_arg.tag) {
        case 1:
            return new ClipResolutionTier(1, []);
        case 2:
        case 3:
            return new ClipResolutionTier(2, []);
        default:
            return new ClipResolutionTier(0, []);
    }
}

export function ClipGenerationGuidance_resolutionLabel(_arg) {
    switch (_arg.tag) {
        case 1:
            return "900p";
        case 2:
            return "720p";
        default:
            return "1080p";
    }
}

function ClipGenerationGuidance_maxClipSecondsAt8Gb(_arg) {
    switch (_arg.tag) {
        case 1:
            return 12;
        case 2:
            return 19;
        default:
            return 8;
    }
}

export function ClipGenerationGuidance_maxClipSeconds(vramGb, tier) {
    const baseline = ClipGenerationGuidance_maxClipSecondsAt8Gb(tier);
    if (vramGb <= 8.5) {
        return baseline;
    }
    else if (vramGb <= 16.5) {
        return baseline * 1.5;
    }
    else {
        return baseline * 2;
    }
}

export function ClipGenerationGuidance_recommendedMaxSeconds(profile, kind) {
    return ClipGenerationGuidance_maxClipSeconds(HardwareProfileModule_vramBudgetGb(profile), ClipGenerationGuidance_resolutionTierForShot(kind));
}

export function ClipGenerationGuidance_recommendedBakeDuration(profile, kind) {
    return min(30, ClipGenerationGuidance_recommendedMaxSeconds(profile, kind));
}

export function ClipGenerationGuidance_hasGuideFrame(block) {
    if (block.ThumbnailPath != null) {
        return true;
    }
    else {
        return bind((g) => g.ReferenceAssetPath, block.Generation) != null;
    }
}

export function ClipGenerationGuidance_promptHint(block) {
    if (ClipGenerationGuidance_hasGuideFrame(block)) {
        return "Guide frame set — describe action, camera, and pacing only. For a new location or angle, add a guide image or cut to a new block.";
    }
    else {
        return "No guide frame — describe geography and look (subject, setting, lighting). Use quick prompts for motion once you have a thumbnail.";
    }
}

export function ClipGenerationGuidance_continuationHint(blockIndex, prevBlock) {
    let matchResult, prev_1;
    if (blockIndex === 0) {
        matchResult = 0;
    }
    else if (prevBlock != null) {
        if (ClipGenerationGuidance_hasGuideFrame(prevBlock)) {
            matchResult = 1;
            prev_1 = prevBlock;
        }
        else {
            matchResult = 2;
        }
    }
    else {
        matchResult = 2;
    }
    switch (matchResult) {
        case 0:
            return undefined;
        case 1:
            return "Previous block has a guide frame — video-to-video continuation works best for motion, not complex camera geography. Use a cut + new guide for location changes.";
        default:
            return undefined;
    }
}

export function ClipGenerationGuidance_guidanceSummary(profile, kind) {
    return `${ClipGenerationGuidance_resolutionLabel(ClipGenerationGuidance_resolutionTierForShot(kind))} · up to ~${~~ClipGenerationGuidance_recommendedMaxSeconds(profile, kind)}s @ 25fps on ${HardwareProfileModule_label(profile)}`;
}

export function ClipGenerationGuidance_durationExceedsGuidance(profile, kind, durationSec) {
    return durationSec > (ClipGenerationGuidance_recommendedMaxSeconds(profile, kind) + 0.01);
}

export function ClipGenerationGuidance_suggestedBakeDurationForShot(kind) {
    return ClipGenerationGuidance_recommendedBakeDuration(new HardwareProfile(0, []), kind);
}
