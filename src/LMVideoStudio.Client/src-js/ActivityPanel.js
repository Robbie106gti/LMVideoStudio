import { Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { JobEventDto_$reflection } from "./Api.js";
import { record_type, option_type, bool_type, list_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { LastErrorSummary_$reflection } from "./ErrorReporting.js";
import { map as map_2, isEmpty, ofArray, tryFind, empty, mapIndexed, cons, tryFindIndex, truncate, filter } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { createObj, equals, equalArrays } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { map as map_1, defaultArg, toArray, orElse } from "./fable_modules/fable-library-js.4.27.0/Option.js";
import { replace, split, substring, join } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { map } from "./fable_modules/fable-library-js.4.27.0/Array.js";
import { singleton, append, delay, toList, iterate } from "./fable_modules/fable-library-js.4.27.0/Seq.js";
import { op_Division, toInt64 } from "./fable_modules/fable-library-js.4.27.0/BigInt.js";
import { createElement } from "react";
import { Interop_reactApi } from "./fable_modules/Feliz.2.6.0/Interop.fs.js";
import { defaultOf } from "./fable_modules/fable-library-js.4.27.0/Util.js";

export class ActivityPanelState extends Record {
    constructor(Events, Connected, LastError) {
        super();
        this.Events = Events;
        this.Connected = Connected;
        this.LastError = LastError;
    }
}

export function ActivityPanelState_$reflection() {
    return record_type("LMVideoStudio.Client.ActivityPanel.ActivityPanelState", [], ActivityPanelState, () => [["Events", list_type(JobEventDto_$reflection())], ["Connected", bool_type], ["LastError", option_type(LastErrorSummary_$reflection())]]);
}

const maxEvents = 30;

function isActiveStatus(status) {
    if (status === "running") {
        return true;
    }
    else {
        return status === "pending";
    }
}

function isTerminalStatus(status) {
    if ((status === "completed") ? true : (status === "failed")) {
        return true;
    }
    else {
        return status === "cancelled";
    }
}

function eventKey(e) {
    return [e.JobId, e.Phase, e.Step];
}

/**
 * Merge an incoming SSE event into the activity feed, replacing stale running
 * entries for the same job phase and upserting by job + phase + step.
 */
export function mergeEvent(incoming, events) {
    let matchValue, index;
    const withoutStaleRunning = filter((e) => !((((e.JobId === incoming.JobId) && (e.Phase === incoming.Phase)) && isActiveStatus(e.Status)) && (isTerminalStatus(incoming.Status) ? true : (isActiveStatus(incoming.Status) && (e.Step !== incoming.Step)))), events);
    return truncate(maxEvents, (matchValue = tryFindIndex((e_1) => equalArrays(eventKey(e_1), eventKey(incoming)), withoutStaleRunning), (matchValue == null) ? cons(incoming, withoutStaleRunning) : ((index = (matchValue | 0), mapIndexed((i, e_2) => {
        if (i === index) {
            return incoming;
        }
        else {
            return e_2;
        }
    }, withoutStaleRunning)))));
}

export function init() {
    return new ActivityPanelState(empty(), false, undefined);
}

export function setLastError(state, summary) {
    return new ActivityPanelState(state.Events, state.Connected, summary);
}

/**
 * Most recent running GPU/bootstrap job for status bar hints.
 */
export function activeGpuHint(events) {
    return orElse(tryFind((e) => {
        if (isActiveStatus(e.Status)) {
            return equals(e.Hardware, "gpu");
        }
        else {
            return false;
        }
    }, events), tryFind((e_1) => {
        if (isActiveStatus(e_1.Status)) {
            if ((e_1.Phase === "bootstrap") ? true : (e_1.Phase === "image_generate")) {
                return true;
            }
            else {
                return e_1.Phase === "audio_generate";
            }
        }
        else {
            return false;
        }
    }, events));
}

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

function formatPhase(phase) {
    switch (phase) {
        case "mockup_preview":
            return "Mockup preview (CPU FFmpeg)";
        case "image_generate":
            return "Image generate (GPU worker)";
        case "model_sync":
            return "Model sync";
        case "bootstrap":
            return "Bootstrap";
        case "bake":
            return "Bake";
        case "audio_generate":
            return "Voiceover (GPU queue)";
        default:
            return titleCaseWords(replace(phase, "_", " "));
    }
}

function statusClass(status) {
    switch (status) {
        case "completed":
            return "text-emerald-400";
        case "failed":
            return "text-red-400";
        case "cancelled":
            return "text-slate-500";
        case "running":
        case "pending":
            return "text-amber-400";
        default:
            return "text-slate-400";
    }
}

function statusLabel(status) {
    switch (status) {
        case "running":
            return "running";
        case "pending":
            return "pending";
        case "completed":
            return "done";
        case "failed":
            return "failed";
        case "cancelled":
            return "cancelled";
        default:
            return status;
    }
}

function formatMeta(e) {
    const parts = [];
    iterate((h) => {
        void (parts.push((h === "gpu") ? "GPU" : h.toUpperCase()));
    }, toArray(e.Hardware));
    iterate((cold) => {
        void (parts.push(cold ? "cold compile" : "warm"));
    }, toArray(e.IsColdRun));
    iterate((ms) => {
        void (parts.push(`${toInt64(op_Division(ms, 1000n))}s`));
    }, toArray(e.ElapsedMs));
    iterate((i) => {
        iterate((t) => {
            void (parts.push(`step ${i + 1}/${t}`));
        }, toArray(e.StepTotal));
    }, toArray(e.StepIndex));
    if (parts.length === 0) {
        return undefined;
    }
    else {
        return join(" · ", toList(parts));
    }
}

export function view(state) {
    let elems_4;
    return createElement("aside", createObj(ofArray([["className", "w-72 border-l border-surface-border bg-surface-raised flex flex-col"], (elems_4 = toList(delay(() => {
        let value_2;
        return append(singleton(createElement("div", createObj(ofArray([(value_2 = "px-4 py-3 border-b border-surface-border font-semibold text-sm uppercase tracking-wide text-slate-400", ["className", value_2]), ["children", "Activity"]])))), delay(() => append(singleton(createElement("div", {
            className: "px-4 py-2 text-xs text-slate-500 border-b border-surface-border",
            children: state.Connected ? "Listening to Host events (SSE)" : "Connecting to event stream…",
        })), delay(() => append(singleton(defaultArg(map_1((err) => {
            let elems;
            return createElement("div", createObj(ofArray([["className", "px-4 py-2 text-xs border-b border-red-500/30 bg-red-500/10 text-red-300"], (elems = [createElement("div", {
                className: "font-semibold mb-1",
                children: `Last error (${err.Source})`,
            }), createElement("div", {
                children: err.Message,
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])));
        }, state.LastError), defaultOf())), delay(() => {
            let elems_3;
            return isEmpty(state.Events) ? singleton(createElement("p", {
                className: "px-4 py-3 text-sm text-slate-500",
                children: "No recent activity.",
            })) : singleton(createElement("ul", createObj(ofArray([["className", "flex-1 overflow-y-auto p-3 space-y-2 text-sm"], (elems_3 = map_2((e) => {
                let elems_2, elems_1;
                return createElement("li", createObj(ofArray([["className", "rounded-md bg-surface p-2 border border-surface-border"], (elems_2 = [createElement("div", createObj(ofArray([["className", "text-xs mb-1 flex items-center justify-between gap-2"], (elems_1 = [createElement("span", {
                    className: "text-slate-500 truncate",
                    children: formatPhase(e.Phase),
                }), createElement("span", {
                    className: `${statusClass(e.Status)} shrink-0`,
                    children: statusLabel(e.Status),
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])]))), createElement("div", {
                    children: e.Message,
                }), defaultArg(map_1((meta) => createElement("div", {
                    className: "text-[10px] text-slate-500 mt-1 uppercase tracking-wide",
                    children: meta,
                }), formatMeta(e)), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])])));
            }, truncate(20, state.Events)), ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])]))));
        }))))));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])));
}

