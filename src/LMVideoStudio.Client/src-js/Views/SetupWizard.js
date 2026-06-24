import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, option_type, string_type, union_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { createElement } from "react";
import { equals, createObj } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";
import { singleton as singleton_1, ofArray } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { empty, singleton, append, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";

export class SetupWizardStep extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Welcome", "Bootstrap", "Complete"];
    }
}

export function SetupWizardStep_$reflection() {
    return union_type("LMVideoStudio.Client.Views.SetupWizard.SetupWizardStep", [], SetupWizardStep, () => [[], [], []]);
}

export class SetupWizardMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Next", "Back", "RunBootstrap", "Finish"];
    }
}

export function SetupWizardMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.SetupWizard.SetupWizardMsg", [], SetupWizardMsg, () => [[], [], [], []]);
}

export class SetupWizardModel extends Record {
    constructor(Step, Message) {
        super();
        this.Step = Step;
        this.Message = Message;
    }
}

export function SetupWizardModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.SetupWizard.SetupWizardModel", [], SetupWizardModel, () => [["Step", SetupWizardStep_$reflection()], ["Message", option_type(string_type)]]);
}

const SetupWizard_wizardDoneKey = "lmvs_setup_wizard_done";

export function SetupWizard_isComplete() {
    try {
        return window.localStorage.getItem(SetupWizard_wizardDoneKey) === "1";
    }
    catch (matchValue) {
        return false;
    }
}

export function SetupWizard_markComplete() {
    try {
        window.localStorage.setItem(SetupWizard_wizardDoneKey, "1");
    }
    catch (matchValue) {
    }
}

export function SetupWizard_init() {
    return new SetupWizardModel(new SetupWizardStep(0, []), undefined);
}

export function SetupWizard_view(model, dispatch) {
    let elems_5, elems_4, elems, elems_1, elems_3, elems_2;
    return createElement("div", createObj(ofArray([["className", "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"], (elems_5 = [createElement("div", createObj(ofArray([["className", "w-full max-w-lg rounded-xl border border-surface-border bg-surface-raised shadow-xl"], (elems_4 = [createElement("div", createObj(ofArray([["className", "px-6 py-4 border-b border-surface-border"], (elems = [createElement("h2", {
        className: "text-lg font-semibold",
        children: "Welcome to LMVideoStudio",
    }), createElement("p", {
        className: "text-sm text-slate-400 mt-1",
        children: "First-run setup — verify local AI stack before editing projects.",
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])]))), createElement("div", createObj(ofArray([["className", "px-6 py-5 space-y-4 text-sm"], (elems_1 = toList(delay(() => {
        let matchValue, value_19, value_21, value_17;
        return append((matchValue = model.Step, (matchValue.tag === 1) ? singleton(createElement("p", createObj(singleton_1((value_19 = "Click Continue to open Settings and run bootstrap. Sidecars start automatically in the Tauri desktop app.", ["children", value_19]))))) : ((matchValue.tag === 2) ? singleton(createElement("p", createObj(singleton_1((value_21 = "Setup complete. Import images, generate GPU thumbnails, then stitch a Ken Burns preview to check timing.", ["children", value_21]))))) : singleton(createElement("p", createObj(singleton_1((value_17 = "This wizard runs bootstrap checks for Host, Ollama, Python worker, FFmpeg, and the model catalog. You can re-run bootstrap anytime from Settings.", ["children", value_17]))))))), delay(() => singleton(defaultArg(map((m) => createElement("p", {
            className: "text-accent text-xs",
            children: m,
        }), model.Message), defaultOf()))));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])]))), createElement("div", createObj(ofArray([["className", "px-6 py-4 border-t border-surface-border flex justify-between gap-2"], (elems_3 = [createElement("button", {
        className: "px-3 py-2 rounded-md border border-surface-border text-sm disabled:opacity-40",
        disabled: equals(model.Step, new SetupWizardStep(0, [])),
        children: "Back",
        onClick: (_arg) => {
            dispatch(new SetupWizardMsg(1, []));
        },
    }), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems_2 = toList(delay(() => append(equals(model.Step, new SetupWizardStep(1, [])) ? singleton(createElement("button", {
        className: "px-3 py-2 rounded-md border border-accent text-accent text-sm",
        children: "Run bootstrap",
        onClick: (_arg_1) => {
            dispatch(new SetupWizardMsg(2, []));
        },
    })) : empty(), delay(() => singleton(createElement("button", {
        className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium",
        children: (model.Step.tag === 2) ? "Get started" : "Continue",
        onClick: (_arg_2) => {
            if (model.Step.tag === 2) {
                dispatch(new SetupWizardMsg(3, []));
            }
            else {
                dispatch(new SetupWizardMsg(0, []));
            }
        },
    })))))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])])));
}

export function SetupWizard_next(model) {
    const matchValue = model.Step;
    switch (matchValue.tag) {
        case 1:
            return new SetupWizardModel(new SetupWizardStep(2, []), model.Message);
        case 2:
            return model;
        default:
            return new SetupWizardModel(new SetupWizardStep(1, []), model.Message);
    }
}

export function SetupWizard_back(model) {
    const matchValue = model.Step;
    switch (matchValue.tag) {
        case 1:
            return new SetupWizardModel(new SetupWizardStep(0, []), model.Message);
        case 2:
            return new SetupWizardModel(new SetupWizardStep(1, []), model.Message);
        default:
            return model;
    }
}

