import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, bool_type, string_type, option_type, union_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { SystemStatusDto_$reflection } from "../Api.fs.js";
import { createElement } from "react";
import { createObj } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/./Interop.fs.js";
import { ofArray } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { defaultOf } from "../fable_modules/Feliz.2.6.0/../fable-library-js.4.27.0/Util.js";

export class SettingsMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["CheckUpdates", "RunBootstrap", "ScanConflicts", "RepairSetup"];
    }
}

export function SettingsMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.Settings.SettingsMsg", [], SettingsMsg, () => [[], [], [], []]);
}

export class SettingsModel extends Record {
    constructor(Status, Message, CheckingUpdates) {
        super();
        this.Status = Status;
        this.Message = Message;
        this.CheckingUpdates = CheckingUpdates;
    }
}

export function SettingsModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.Settings.SettingsModel", [], SettingsModel, () => [["Status", option_type(SystemStatusDto_$reflection())], ["Message", option_type(string_type)], ["CheckingUpdates", bool_type]]);
}

export function Settings_init() {
    return new SettingsModel(undefined, undefined, false);
}

export function Settings_view(model, dispatch) {
    let elems_2, elems_1;
    return createElement("div", createObj(ofArray([["className", "max-w-xl mx-auto p-8 space-y-6"], (elems_2 = [createElement("h1", {
        className: "text-2xl font-bold",
        children: "Settings",
    }), defaultArg(map((s) => {
        let elems;
        return createElement("div", createObj(ofArray([["className", "rounded-lg border border-surface-border p-4 space-y-2 text-sm"], (elems = [createElement("div", {
            children: `Host: ${s.Host}`,
        }), createElement("div", {
            children: s.Ollama ? "Ollama: reachable" : "Ollama: offline",
        }), createElement("div", {
            children: s.Worker ? "Worker: reachable" : "Worker: offline",
        }), createElement("div", {
            children: s.WarmupComplete ? "GPU warmup: complete" : "GPU warmup: pending",
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])));
    }, model.Status), defaultOf()), createElement("div", createObj(ofArray([["className", "flex flex-col gap-2"], (elems_1 = [createElement("button", {
        className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
        children: "Check for updates",
        disabled: model.CheckingUpdates,
        onClick: (_arg) => {
            dispatch(new SettingsMsg(0, []));
        },
    }), createElement("button", {
        className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
        children: "Run bootstrap",
        onClick: (_arg_1) => {
            dispatch(new SettingsMsg(1, []));
        },
    }), createElement("button", {
        className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
        children: "Repair setup",
        onClick: (_arg_2) => {
            dispatch(new SettingsMsg(3, []));
        },
    }), createElement("button", {
        className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
        children: "Scan GPU conflicts",
        onClick: (_arg_3) => {
            dispatch(new SettingsMsg(2, []));
        },
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])]))), defaultArg(map((m) => createElement("p", {
        className: "text-sm text-slate-400",
        children: m,
    }), model.Message), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])])));
}

