import { round, int32ToString } from "./fable_modules/fable-library-js.4.27.0/Util.js";

/**
 * Fable-safe float formatting (avoid :F1 / :F0 in `$""` — compiles to broken `%P(F1)` in JS).
 */
export function formatFloat(decimals, value) {
    if (decimals <= 0) {
        return int32ToString(~~round(value));
    }
    else {
        return value.toFixed(decimals);
    }
}

export function formatVramGb(gb) {
    return `${formatFloat(1, gb)} GB VRAM`;
}

export function formatGpuStatusGb(gb) {
    return `GPU ${formatFloat(0, gb)} GB`;
}

