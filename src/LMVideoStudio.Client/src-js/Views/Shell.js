import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, option_type, obj_type, union_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { JobEventDto_$reflection, SystemStatusDto_$reflection } from "../Api.js";
import { bind, defaultArg, map } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { createElement } from "react";
import { equals, createObj } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";
import { ofArray } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { replace } from "../fable_modules/fable-library-js.4.27.0/String.js";

export class ShellTab extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Hub", "Timeline", "Settings"];
    }
}

export function ShellTab_$reflection() {
    return union_type("LMVideoStudio.Client.Views.Shell.ShellTab", [], ShellTab, () => [[], [], []]);
}

export class ShellModel extends Record {
    constructor(Tab, Activity, SystemStatus) {
        super();
        this.Tab = Tab;
        this.Activity = Activity;
        this.SystemStatus = SystemStatus;
    }
}

export function ShellModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.Shell.ShellModel", [], ShellModel, () => [["Tab", ShellTab_$reflection()], ["Activity", obj_type], ["SystemStatus", option_type(SystemStatusDto_$reflection())]]);
}

export class ShellMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["SelectTab", "EventReceived", "SseConnected", "StatusLoaded"];
    }
}

export function ShellMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.Shell.ShellMsg", [], ShellMsg, () => [[["Item", ShellTab_$reflection()]], [["Item", JobEventDto_$reflection()]], [], [["Item", SystemStatusDto_$reflection()]]]);
}

export function Shell_init(activity) {
    return new ShellModel(new ShellTab(0, []), activity, undefined);
}

export function Shell_statusBar(status, activity) {
    let value_1, elems;
    const gpuJob = map((e) => (`${(() => {
        throw 1;
    })()}: ${e.Message}${defaultArg(map((b) => {
        if (b) {
            return " (cold — first GPU compile may take several minutes)";
        }
        else {
            return " (warm)";
        }
    }, e.IsColdRun), "")}`), (() => {
        throw 1;
    })());
    return createElement("footer", createObj(ofArray([(value_1 = "h-8 border-t border-surface-border bg-surface-raised px-4 flex items-center gap-4 text-xs text-slate-500 min-w-0", ["className", value_1]), (elems = [createElement("span", {
        className: "shrink-0",
        children: "LMVideoStudio",
    }), defaultArg(map((s) => {
        const ollama = s.Ollama ? "✓" : "—";
        const worker = s.Worker ? "✓" : "—";
        const warmup = s.WarmupComplete ? "warm" : "cold";
        const gpuHint = bind((d) => {
            if (equals(d.Rocm, true)) {
                return map((gb) => (`GPU %P(F0)GB · ${gb}`), d.VramGb);
            }
            else {
                return undefined;
            }
        }, s.WorkerDevice);
        return createElement("span", {
            className: "shrink-0",
            children: (gpuHint == null) ? (`Host OK · Ollama ${ollama} · Worker ${worker}`) : (`Host OK · Ollama ${ollama} · Worker ${worker} · ${gpuHint}`),
        });
    }, status), createElement("span", {
        className: "shrink-0",
        children: "Host —",
    })), defaultArg(map((text) => createElement("span", {
        className: "truncate text-amber-400/90",
        title: text,
        children: text,
    }), gpuJob), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])));
}

function Shell_formatPhase(phase) {
    switch (phase) {
        case "mockup_preview":
            return "Preview";
        case "image_generate":
            return "Generate";
        case "bootstrap":
            return "Bootstrap";
        case "bake":
            return "Bake";
        case "audio_generate":
            return "Voiceover";
        default:
            return replace(phase, "_", " ");
    }
}

export function Shell_navButton(label, tab, current, dispatch) {
    return createElement("button", {
        className: equals(tab, current) ? "px-3 py-2 text-sm font-medium text-accent border-b-2 border-accent" : "px-3 py-2 text-sm text-slate-400 hover:text-slate-200",
        children: label,
        onClick: (_arg) => {
            dispatch(new ShellMsg(0, [tab]));
        },
    });
}

export function Shell_chrome(tab, activity, status, content, dispatch) {
    let elems_3, elems_1, elems, elems_2;
    return createElement("div", createObj(ofArray([["className", "flex flex-col h-screen"], (elems_3 = [createElement("header", createObj(ofArray([["className", "border-b border-surface-border bg-surface-raised"], (elems_1 = [createElement("div", createObj(ofArray([["className", "px-4 flex items-center gap-6"], (elems = [createElement("span", {
        className: "font-semibold tracking-tight py-3",
        children: "LMVideoStudio",
    }), Shell_navButton("Projects", new ShellTab(0, []), tab, dispatch), Shell_navButton("Timeline", new ShellTab(1, []), tab, dispatch), Shell_navButton("Settings", new ShellTab(2, []), tab, dispatch)], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])]))), createElement("div", createObj(ofArray([["className", "flex flex-1 min-h-0"], (elems_2 = [content, (() => {
        throw 1;
    })()], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))), Shell_statusBar(status, activity)], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])));
}

