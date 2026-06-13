import { Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { JobEventDto_$reflection } from "./Api.js";
import { record_type, bool_type, list_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { map as map_1, isEmpty, ofArray, empty, mapIndexed, cons, tryFindIndex, truncate, filter } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { createObj, equalArrays } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { replace, split, substring, join } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { map } from "./fable_modules/fable-library-js.4.27.0/Array.js";
import { createElement } from "react";
import { singleton, append, delay, toList } from "./fable_modules/fable-library-js.4.27.0/Seq.js";
import { Interop_reactApi } from "./fable_modules/Feliz.2.6.0/Interop.fs.js";

export class ActivityPanelState extends Record {
    constructor(Events, Connected) {
        super();
        this.Events = Events;
        this.Connected = Connected;
    }
}

export function ActivityPanelState_$reflection() {
    return record_type("LMVideoStudio.Client.ActivityPanel.ActivityPanelState", [], ActivityPanelState, () => [["Events", list_type(JobEventDto_$reflection())], ["Connected", bool_type]]);
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
    return new ActivityPanelState(empty(), false);
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

export function view(state) {
    let elems_3;
    return createElement("aside", createObj(ofArray([["className", "w-72 border-l border-surface-border bg-surface-raised flex flex-col"], (elems_3 = toList(delay(() => {
        let value_2;
        return append(singleton(createElement("div", createObj(ofArray([(value_2 = "px-4 py-3 border-b border-surface-border font-semibold text-sm uppercase tracking-wide text-slate-400", ["className", value_2]), ["children", "Activity"]])))), delay(() => append(singleton(createElement("div", {
            className: "px-4 py-2 text-xs text-slate-500 border-b border-surface-border",
            children: state.Connected ? "Listening to Host events (SSE)" : "Connecting to event stream…",
        })), delay(() => {
            let elems_2;
            return isEmpty(state.Events) ? singleton(createElement("p", {
                className: "px-4 py-3 text-sm text-slate-500",
                children: "No recent activity.",
            })) : singleton(createElement("ul", createObj(ofArray([["className", "flex-1 overflow-y-auto p-3 space-y-2 text-sm"], (elems_2 = map_1((e) => {
                let elems_1, elems;
                return createElement("li", createObj(ofArray([["className", "rounded-md bg-surface p-2 border border-surface-border"], (elems_1 = [createElement("div", createObj(ofArray([["className", "text-xs mb-1 flex items-center justify-between gap-2"], (elems = [createElement("span", {
                    className: "text-slate-500 truncate",
                    children: formatPhase(e.Phase),
                }), createElement("span", {
                    className: `${statusClass(e.Status)} shrink-0`,
                    children: statusLabel(e.Status),
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])]))), createElement("div", {
                    children: e.Message,
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])));
            }, truncate(20, state.Events)), ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))));
        }))));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])));
}

