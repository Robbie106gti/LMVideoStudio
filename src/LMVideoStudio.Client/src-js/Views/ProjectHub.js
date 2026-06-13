import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, option_type, bool_type, list_type, union_type, class_type, string_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { OutlineBlockDto_$reflection, ProjectSummaryDto_$reflection } from "../Api.js";
import { map as map_1, mapIndexed, length, ofArray, empty } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { createElement } from "react";
import { createObj } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { singleton, append, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { isNullOrWhiteSpace } from "../fable_modules/fable-library-js.4.27.0/String.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";

export class ProjectHubMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["SetNewName", "CreateClicked", "OpenProject", "SelectOutlineProject", "Refresh", "SetBrief", "GenerateOutline", "ApproveOutline", "DiscardOutline", "DeleteProject"];
    }
}

export function ProjectHubMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.ProjectHub.ProjectHubMsg", [], ProjectHubMsg, () => [[["Item", string_type]], [], [["Item", class_type("System.Guid")]], [["Item", class_type("System.Guid")]], [], [["Item", string_type]], [], [], [], [["Item", class_type("System.Guid")]]]);
}

export class ProjectHubModel extends Record {
    constructor(Summaries, NewName, Loading, Error$, BriefText, OutlineProjectId, OutlineBlocks, OutlineWorking) {
        super();
        this.Summaries = Summaries;
        this.NewName = NewName;
        this.Loading = Loading;
        this.Error = Error$;
        this.BriefText = BriefText;
        this.OutlineProjectId = OutlineProjectId;
        this.OutlineBlocks = OutlineBlocks;
        this.OutlineWorking = OutlineWorking;
    }
}

export function ProjectHubModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.ProjectHub.ProjectHubModel", [], ProjectHubModel, () => [["Summaries", list_type(ProjectSummaryDto_$reflection())], ["NewName", string_type], ["Loading", bool_type], ["Error", option_type(string_type)], ["BriefText", string_type], ["OutlineProjectId", option_type(class_type("System.Guid"))], ["OutlineBlocks", option_type(list_type(OutlineBlockDto_$reflection()))], ["OutlineWorking", bool_type]]);
}

export function ProjectHub_init() {
    return new ProjectHubModel(empty(), "", true, undefined, "", undefined, undefined, false);
}

export function ProjectHub_view(model, dispatch) {
    let elems_9;
    return createElement("div", createObj(ofArray([["className", "max-w-3xl mx-auto p-8 space-y-8"], (elems_9 = toList(delay(() => append(singleton(createElement("h1", {
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
                dispatch(new ProjectHubMsg(4, []));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])))), delay(() => {
            let elems_5;
            return append(singleton(createElement("div", createObj(ofArray([["className", "rounded-lg border border-surface-border p-4 space-y-3"], (elems_5 = [createElement("h2", {
                className: "text-sm font-semibold",
                children: "Brief → outline (Ollama)",
            }), createElement("p", {
                className: "text-xs text-slate-500",
                children: "Select a project below, paste a brief, generate an outline, then approve to create blocks.",
            }), createElement("textarea", {
                className: "w-full rounded-md bg-surface border border-surface-border px-3 py-2 text-sm min-h-[100px]",
                placeholder: "Paste marketing brief or script notes…",
                value: model.BriefText,
                onChange: (ev_1) => {
                    dispatch(new ProjectHubMsg(5, [ev_1.target.value]));
                },
            }), createElement("button", {
                className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
                disabled: (model.OutlineWorking ? true : (model.OutlineProjectId == null)) ? true : isNullOrWhiteSpace(model.BriefText),
                children: model.OutlineWorking ? "Generating…" : "Generate outline",
                onClick: (_arg_2) => {
                    dispatch(new ProjectHubMsg(6, []));
                },
            }), defaultArg(map((id) => createElement("p", {
                className: "text-xs text-slate-500",
                children: `Target project: ${id}`,
            }), model.OutlineProjectId), createElement("p", {
                className: "text-xs text-amber-400/90",
                children: "Click a project below to select it for outline generation.",
            })), defaultArg(map((blocks) => {
                let elems_4, elems_2, elems_3;
                return createElement("div", createObj(ofArray([["className", "space-y-3 border-t border-surface-border pt-3"], (elems_4 = [createElement("p", {
                    className: "text-sm font-medium",
                    children: `${length(blocks)} proposed blocks`,
                }), createElement("ul", createObj(ofArray([["className", "space-y-2 text-sm max-h-48 overflow-y-auto"], (elems_2 = mapIndexed((i, b) => {
                    let elems_1;
                    return createElement("li", createObj(ofArray([["className", "rounded border border-surface-border p-2"], (elems_1 = [createElement("div", {
                        className: "font-medium",
                        children: `${i + 1}. ${b.Title}`,
                    }), createElement("div", {
                        className: "text-xs text-slate-500 mt-1",
                        children: b.VoiceoverScript,
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])));
                }, blocks), ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems_3 = [createElement("button", {
                    className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm disabled:opacity-50",
                    disabled: model.OutlineWorking,
                    children: "Approve → create blocks",
                    onClick: (_arg_3) => {
                        dispatch(new ProjectHubMsg(7, []));
                    },
                }), createElement("button", {
                    className: "px-3 py-2 rounded-md border border-surface-border text-sm",
                    children: "Discard",
                    onClick: (_arg_4) => {
                        dispatch(new ProjectHubMsg(8, []));
                    },
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])));
            }, model.OutlineBlocks), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])])))), delay(() => {
                let elems_8;
                return model.Loading ? singleton(createElement("p", {
                    className: "text-slate-500",
                    children: "Loading…",
                })) : singleton(createElement("ul", createObj(ofArray([["className", "space-y-2"], (elems_8 = map_1((s) => {
                    let elems_7, elems_6, value_129;
                    const selected = defaultArg(map((y) => (s.Id === y), model.OutlineProjectId), false);
                    return createElement("li", createObj(ofArray([["className", "flex items-start gap-2"], (elems_7 = [createElement("button", createObj(ofArray([["className", "flex-1 text-left rounded-lg border px-4 py-3 hover:border-accent " + (selected ? "border-accent bg-surface-raised ring-1 ring-accent" : "border-surface-border bg-surface-raised")], ["onClick", (_arg_5) => {
                        dispatch(new ProjectHubMsg(2, [s.Id]));
                    }], (elems_6 = [createElement("div", {
                        className: "font-medium",
                        children: s.Name,
                    }), createElement("div", {
                        className: "text-xs text-slate-500 mt-1",
                        children: `${s.BlockCount} blocks · click to open timeline`,
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_6))])]))), createElement("button", createObj(ofArray([(value_129 = "mt-1 px-2 py-1 rounded-md border border-red-500/40 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50", ["className", value_129]), ["disabled", model.Loading], ["children", "Delete"], ["onClick", (ev_2) => {
                        ev_2.stopPropagation();
                        if (window.confirm(`Delete project "${s.Name}"? This removes all files and cannot be undone.`)) {
                            dispatch(new ProjectHubMsg(9, [s.Id]));
                        }
                    }]]))), createElement("button", {
                        className: "mt-1 text-xs text-accent hover:underline ml-0",
                        children: selected ? "Selected for outline" : "Select for outline",
                        onClick: (_arg_6) => {
                            dispatch(new ProjectHubMsg(3, [s.Id]));
                        },
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_7))])])));
                }, model.Summaries), ["children", Interop_reactApi.Children.toArray(Array.from(elems_8))])]))));
            }));
        }));
    })))))))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_9))])])));
}

