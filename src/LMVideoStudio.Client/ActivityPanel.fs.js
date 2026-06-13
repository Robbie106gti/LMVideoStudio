import { Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { JobEventDto_$reflection } from "./Api.fs.js";
import { record_type, bool_type, list_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { truncate, map, ofArray, empty } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { createElement } from "react";
import { createObj } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { Interop_reactApi } from "./fable_modules/Feliz.2.6.0/./Interop.fs.js";

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

export function init() {
    return new ActivityPanelState(empty(), false);
}

export function view(state) {
    let elems_2, value_2, elems_1;
    return createElement("aside", createObj(ofArray([["className", "w-72 border-l border-surface-border bg-surface-raised flex flex-col"], (elems_2 = [createElement("div", createObj(ofArray([(value_2 = "px-4 py-3 border-b border-surface-border font-semibold text-sm uppercase tracking-wide text-slate-400", ["className", value_2]), ["children", "Activity"]]))), createElement("div", {
        className: "px-4 py-2 text-xs text-slate-500 border-b border-surface-border",
        children: state.Connected ? "Listening to Host events (SSE)" : "Connecting to event stream…",
    }), createElement("ul", createObj(ofArray([["className", "flex-1 overflow-y-auto p-3 space-y-2 text-sm"], (elems_1 = map((e) => {
        let elems;
        return createElement("li", createObj(ofArray([["className", "rounded-md bg-surface p-2 border border-surface-border"], (elems = [createElement("div", {
            className: "text-xs text-slate-500 mb-1",
            children: `${e.Phase} · ${e.Status}`,
        }), createElement("div", {
            children: e.Message,
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])));
    }, truncate(20, state.Events)), ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])])));
}

