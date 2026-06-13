import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, option_type, bool_type, list_type, union_type, class_type, string_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ProjectSummaryDto_$reflection } from "../Api.fs.js";
import { singleton as singleton_1, map as map_1, ofArray, empty } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { createElement } from "react";
import { createObj } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { singleton, append, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { defaultOf } from "../fable_modules/Feliz.2.6.0/../fable-library-js.4.27.0/Util.js";
import { isNullOrWhiteSpace } from "../fable_modules/fable-library-js.4.27.0/String.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/./Interop.fs.js";

export class ProjectHubMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["SetNewName", "CreateClicked", "OpenProject", "Refresh"];
    }
}

export function ProjectHubMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.ProjectHub.ProjectHubMsg", [], ProjectHubMsg, () => [[["Item", string_type]], [], [["Item", class_type("System.Guid")]], []]);
}

export class ProjectHubModel extends Record {
    constructor(Summaries, NewName, Loading, Error$) {
        super();
        this.Summaries = Summaries;
        this.NewName = NewName;
        this.Loading = Loading;
        this.Error = Error$;
    }
}

export function ProjectHubModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.ProjectHub.ProjectHubModel", [], ProjectHubModel, () => [["Summaries", list_type(ProjectSummaryDto_$reflection())], ["NewName", string_type], ["Loading", bool_type], ["Error", option_type(string_type)]]);
}

export function ProjectHub_init() {
    return new ProjectHubModel(empty(), "", true, undefined);
}

export function ProjectHub_view(model, dispatch) {
    let elems_3;
    return createElement("div", createObj(ofArray([["className", "max-w-3xl mx-auto p-8"], (elems_3 = toList(delay(() => append(singleton(createElement("h1", {
        className: "text-2xl font-bold mb-2",
        children: "Projects",
    })), delay(() => append(singleton(createElement("p", {
        className: "text-slate-400 mb-6",
        children: "Create a storyboard project — import images, reorder blocks, save without a terminal.",
    })), delay(() => append(singleton(defaultArg(map((err) => createElement("div", {
        className: "mb-4 text-red-400 text-sm",
        children: err,
    }), model.Error), defaultOf())), delay(() => {
        let elems;
        return append(singleton(createElement("div", createObj(ofArray([["className", "flex gap-2 mb-8"], (elems = [createElement("input", {
            className: "flex-1 rounded-md bg-surface-raised border border-surface-border px-3 py-2",
            placeholder: "New project name",
            value: model.NewName,
            onChange: (ev) => {
                dispatch(new ProjectHubMsg(0, [ev.target.value]));
            },
        }), createElement("button", {
            className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted font-medium disabled:opacity-50",
            disabled: model.Loading ? true : isNullOrWhiteSpace(model.NewName),
            children: "Create",
            onClick: (_arg) => {
                dispatch(new ProjectHubMsg(1, []));
            },
        }), createElement("button", {
            className: "px-3 py-2 rounded-md border border-surface-border text-slate-300",
            children: "Refresh",
            onClick: (_arg_1) => {
                dispatch(new ProjectHubMsg(3, []));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])))), delay(() => {
            let elems_2;
            return model.Loading ? singleton(createElement("p", {
                className: "text-slate-500",
                children: "Loading…",
            })) : singleton(createElement("ul", createObj(ofArray([["className", "space-y-2"], (elems_2 = map_1((s) => {
                let value_43, elems_1;
                const children = singleton_1(createElement("button", createObj(ofArray([(value_43 = "w-full text-left rounded-lg border border-surface-border bg-surface-raised px-4 py-3 hover:border-accent", ["className", value_43]), ["onClick", (_arg_2) => {
                    dispatch(new ProjectHubMsg(2, [s.Id]));
                }], (elems_1 = [createElement("div", {
                    className: "font-medium",
                    children: s.Name,
                }), createElement("div", {
                    className: "text-xs text-slate-500 mt-1",
                    children: `${s.BlockCount} blocks`,
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])]))));
                return createElement("li", {
                    children: Interop_reactApi.Children.toArray(Array.from(children)),
                });
            }, model.Summaries), ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))));
        }));
    })))))))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])));
}

