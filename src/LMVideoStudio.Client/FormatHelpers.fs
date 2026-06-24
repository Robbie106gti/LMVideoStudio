module LMVideoStudio.Client.FormatHelpers

open Fable.Core.JsInterop

/// Fable-safe float formatting (avoid :F1 / :F0 in `$""` — compiles to broken `%P(F1)` in JS).
let formatFloat (decimals: int) (value: float) =
    if decimals <= 0 then
        string (int (System.Math.Round(value)))
    else
        emitJsExpr (value, decimals) "$0.toFixed($1)"

let formatVramGb (gb: float) = $"{formatFloat 1 gb} GB VRAM"

let formatGpuStatusGb (gb: float) = $"GPU {formatFloat 0 gb} GB"
