import { replace, split, substring, join } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { map } from "./fable_modules/fable-library-js.4.27.0/Array.js";

function titleCaseWords(s) {
    return join(" ", map((w) => {
        if (w.length === 0) {
            return w;
        }
        else {
            return substring(w, 0, 1).toUpperCase() + substring(w, 1).toLowerCase();
        }
    }, split(s, [" "], undefined, 0)));
}

/**
 * Activity panel row title (includes CPU/GPU hint).
 */
export function activityPhaseTitle(phase) {
    switch (phase) {
        case "mockup_preview":
            return "Preview stitch (CPU FFmpeg)";
        case "image_generate":
            return "Image generate (GPU worker)";
        case "model_sync":
            return "Model sync";
        case "bootstrap":
            return "Bootstrap";
        case "bake":
            return "Bake export (CPU FFmpeg)";
        case "audio_generate":
            return "Voiceover (GPU queue)";
        default:
            return titleCaseWords(replace(phase, "_", " "));
    }
}

/**
 * Footer status bar (short label).
 */
export function footerPhaseTitle(phase) {
    switch (phase) {
        case "mockup_preview":
            return "Preview stitch";
        case "image_generate":
            return "Generate";
        case "model_sync":
            return "Models";
        case "bootstrap":
            return "Bootstrap";
        case "bake":
            return "Bake";
        case "audio_generate":
            return "Voiceover";
        default:
            return titleCaseWords(replace(phase, "_", " "));
    }
}

