import { FSharpRef, Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, bool_type, union_type, string_type, option_type, int32_type, class_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ProjectModule_effectiveMockupDuration, Project as Project_1, StoryboardBlock, Project_$reflection } from "../LMVideoStudio.Domain/Types.js";
import { isEmpty, ofArray, map as map_1, tryFind, findIndex, skip, singleton, take, append, mapIndexed, indexed, choose, item as item_1, length, sortBy } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { int32ToString, equals, createObj, comparePrimitives } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { filter, orElse, bind, map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { utcNow, toUnixTimeMilliseconds } from "../fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { exportPremiereXmlUrl, previewMediaUrl } from "../Api.js";
import { isNullOrWhiteSpace } from "../fable_modules/fable-library-js.4.27.0/String.js";
import { createElement } from "react";
import { empty, singleton as singleton_1, append as append_1, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { tryParse } from "../fable_modules/fable-library-js.4.27.0/Int32.js";

export class TimelineMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ImportImage", "ImportStylePack", "MoveBlockUp", "MoveBlockDown", "DragStart", "DropOnIndex", "SelectBlock", "SetVoiceoverScript", "SetImagePrompt", "SetCrossfadeDuration", "SaveBlockFields", "GenerateThumbnail", "SelectThumbnailVariant", "ImportAudio", "RefreshMockupPreview", "StartBake", "ExportSharePack", "PreviewFailed", "BakeFailed", "Save", "BackToHub"];
    }
}

export function TimelineMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.StoryboardTimeline.TimelineMsg", [], TimelineMsg, () => [[["Item", class_type("Browser.Types.File", undefined)]], [["Item", class_type("Browser.Types.File", undefined)]], [["Item", class_type("System.Guid")]], [["Item", class_type("System.Guid")]], [["Item", int32_type]], [["Item", int32_type]], [["Item", option_type(class_type("System.Guid"))]], [["Item", string_type]], [["Item", string_type]], [["Item", int32_type]], [], [], [["Item", string_type]], [["Item", class_type("Browser.Types.File", undefined)]], [], [], [], [["Item", string_type]], [["Item", string_type]], [], []]);
}

export class TimelineModel extends Record {
    constructor(Project, Saving, Generating, Previewing, Baking, PreviewUrl, BakeUrl, PreviewJobId, BakeJobId, Error$, DragIndex, SelectedBlockId, VoiceoverDraft, ImagePromptDraft, CrossfadeDurationDraft) {
        super();
        this.Project = Project;
        this.Saving = Saving;
        this.Generating = Generating;
        this.Previewing = Previewing;
        this.Baking = Baking;
        this.PreviewUrl = PreviewUrl;
        this.BakeUrl = BakeUrl;
        this.PreviewJobId = PreviewJobId;
        this.BakeJobId = BakeJobId;
        this.Error = Error$;
        this.DragIndex = DragIndex;
        this.SelectedBlockId = SelectedBlockId;
        this.VoiceoverDraft = VoiceoverDraft;
        this.ImagePromptDraft = ImagePromptDraft;
        this.CrossfadeDurationDraft = (CrossfadeDurationDraft | 0);
    }
}

export function TimelineModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.StoryboardTimeline.TimelineModel", [], TimelineModel, () => [["Project", Project_$reflection()], ["Saving", bool_type], ["Generating", bool_type], ["Previewing", bool_type], ["Baking", bool_type], ["PreviewUrl", option_type(string_type)], ["BakeUrl", option_type(string_type)], ["PreviewJobId", option_type(class_type("System.Guid"))], ["BakeJobId", option_type(class_type("System.Guid"))], ["Error", option_type(string_type)], ["DragIndex", option_type(int32_type)], ["SelectedBlockId", option_type(class_type("System.Guid"))], ["VoiceoverDraft", string_type], ["ImagePromptDraft", string_type], ["CrossfadeDurationDraft", int32_type]]);
}

export function StoryboardTimeline_init(project) {
    return new TimelineModel(project, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "", "", 300);
}

function StoryboardTimeline_sortedBlocks(project) {
    return sortBy((b) => b.Order, project.Blocks, {
        Compare: comparePrimitives,
    });
}

function StoryboardTimeline_mediaCacheBust(project) {
    return defaultArg(map(toUnixTimeMilliseconds, project.UpdatedAt), toUnixTimeMilliseconds(utcNow()));
}

function StoryboardTimeline_blockThumbnailUrl(projectId, project, block) {
    return map((path) => previewMediaUrl(projectId, path, StoryboardTimeline_mediaCacheBust(project)), block.ThumbnailPath);
}

function StoryboardTimeline_looksLikeFilename(prompt) {
    if (isNullOrWhiteSpace(prompt)) {
        return false;
    }
    else {
        const lower = prompt.trim().toLowerCase();
        if ((((lower.endsWith(".png") ? true : lower.endsWith(".jpg")) ? true : lower.endsWith(".jpeg")) ? true : lower.endsWith(".webp")) ? true : lower.endsWith(".gif")) {
            return true;
        }
        else if (prompt.indexOf("\\") >= 0) {
            return !(prompt.indexOf(" ") >= 0);
        }
        else {
            return false;
        }
    }
}

function StoryboardTimeline_blockPlaceholderLabel(block) {
    const matchValue = block.Title;
    let matchResult, t_1;
    if (matchValue != null) {
        if (!StoryboardTimeline_looksLikeFilename(matchValue)) {
            matchResult = 0;
            t_1 = matchValue;
        }
        else {
            matchResult = 1;
        }
    }
    else {
        matchResult = 1;
    }
    switch (matchResult) {
        case 0:
            return t_1;
        default:
            if (block.Source.tag === 0) {
                return "No image";
            }
            else {
                return "Generated";
            }
    }
}

function StoryboardTimeline_reorderByIndex(project, fromIdx, toIdx) {
    const blocks = StoryboardTimeline_sortedBlocks(project);
    if (((((fromIdx < 0) ? true : (toIdx < 0)) ? true : (fromIdx >= length(blocks))) ? true : (toIdx >= length(blocks))) ? true : (fromIdx === toIdx)) {
        return project;
    }
    else {
        const item = item_1(fromIdx, blocks);
        const without = choose((tupledArg) => {
            if (tupledArg[0] === fromIdx) {
                return undefined;
            }
            else {
                return tupledArg[1];
            }
        }, indexed(blocks));
        const toIdx$0027 = ((toIdx > fromIdx) ? (toIdx - 1) : toIdx) | 0;
        return new Project_1(project.SchemaVersion, project.Id, project.Name, project.CreatedAt, project.UpdatedAt, project.Brief, project.SequencePreset, project.DefaultMockupDurationSec, project.RenderDefaults, project.StylePack, mapIndexed((i_1, b_1) => (new StoryboardBlock(b_1.Id, i_1, b_1.Title, b_1.Source, b_1.ThumbnailPath, b_1.ImagePrompt, b_1.VoiceoverScript, b_1.DirectorNotes, b_1.MoodTags, b_1.MockupDurationSec, b_1.BakeDurationSec, b_1.Transitions, b_1.Audio, b_1.Generation, b_1.Artifacts)), append(take(toIdx$0027, without), append(singleton(item), skip(toIdx$0027, without)))), project.TransitionsDefault);
    }
}

export function StoryboardTimeline_reorderByDrag(model, fromIdx, toIdx) {
    return new TimelineModel(StoryboardTimeline_reorderByIndex(model.Project, fromIdx, toIdx), model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, undefined, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

function StoryboardTimeline_reorder(project, blockId, direction) {
    const blocks = StoryboardTimeline_sortedBlocks(project);
    const idx = findIndex((b) => (b.Id === blockId), blocks) | 0;
    if (((idx + direction) < 0) ? true : ((idx + direction) >= length(blocks))) {
        return project;
    }
    else {
        const a = item_1(idx, blocks);
        const b_1 = item_1(idx + direction, blocks);
        return new Project_1(project.SchemaVersion, project.Id, project.Name, project.CreatedAt, project.UpdatedAt, project.Brief, project.SequencePreset, project.DefaultMockupDurationSec, project.RenderDefaults, project.StylePack, mapIndexed((i_1, b_2) => (new StoryboardBlock(b_2.Id, i_1, b_2.Title, b_2.Source, b_2.ThumbnailPath, b_2.ImagePrompt, b_2.VoiceoverScript, b_2.DirectorNotes, b_2.MoodTags, b_2.MockupDurationSec, b_2.BakeDurationSec, b_2.Transitions, b_2.Audio, b_2.Generation, b_2.Artifacts)), mapIndexed((i, block) => {
            if (i === idx) {
                return b_1;
            }
            else if (i === (idx + direction)) {
                return a;
            }
            else {
                return block;
            }
        }, blocks)), project.TransitionsDefault);
    }
}

function StoryboardTimeline_selectedBlock(model) {
    return bind((id) => tryFind((b) => (b.Id === id), model.Project.Blocks), model.SelectedBlockId);
}

function StoryboardTimeline_blockCrossfadeMs(block, project) {
    return defaultArg(map((e) => e.DurationMs, orElse(bind((t) => t.ToNext, block.Transitions), bind((t_1) => t_1.ToNext, project.TransitionsDefault))), 300);
}

export function StoryboardTimeline_selectBlock(model, blockId) {
    if (blockId == null) {
        return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, undefined, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
    }
    else {
        const id = blockId;
        const matchValue = tryFind((b) => (b.Id === id), model.Project.Blocks);
        if (matchValue == null) {
            return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, undefined, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
        }
        else {
            const block = matchValue;
            return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, id, defaultArg(block.VoiceoverScript, ""), defaultArg(block.ImagePrompt, ""), StoryboardTimeline_blockCrossfadeMs(block, model.Project));
        }
    }
}

export function StoryboardTimeline_view(model, dispatch) {
    let elems_23, elems_4, children, elems_3, elems_1, elems_2, value_61, elems_22, elems_12;
    const blocks = StoryboardTimeline_sortedBlocks(model.Project);
    const selected = StoryboardTimeline_selectedBlock(model);
    return createElement("div", createObj(ofArray([["className", "flex flex-col h-full"], (elems_23 = [createElement("div", createObj(ofArray([["className", "flex items-center justify-between px-6 py-4 border-b border-surface-border"], (elems_4 = [(children = ofArray([createElement("h1", {
        className: "text-xl font-bold",
        children: model.Project.Name,
    }), createElement("p", {
        className: "text-sm text-slate-500",
        children: `${length(blocks)} blocks · default ${model.Project.DefaultMockupDurationSec}s mockup (3–4s)`,
    }), defaultArg(map((sp_1) => {
        let elems;
        return createElement("div", createObj(ofArray([["className", "flex items-center gap-2 mt-1"], (elems = toList(delay(() => append_1(singleton_1(createElement("span", {
            className: "text-xs text-slate-500",
            children: "Style pack:",
        })), delay(() => map_1((hex) => createElement("span", {
            className: "inline-block w-4 h-4 rounded border border-surface-border",
            style: {
                backgroundColor: hex,
            },
            title: hex,
        }), sp_1.DominantColors))))), ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])));
    }, bind((sp) => {
        if (isEmpty(sp.DominantColors)) {
            return undefined;
        }
        else {
            return sp;
        }
    }, model.Project.StylePack)), defaultOf())]), createElement("div", {
        children: Interop_reactApi.Children.toArray(Array.from(children)),
    })), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems_3 = [createElement("label", createObj(ofArray([["className", "px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm"], (elems_1 = [createElement("input", {
        type: "file",
        accept: "image/*",
        className: "hidden",
        onChange: (ev) => {
            const input = ev.target;
            const files = input.files;
            if (!(files == null) && (files.length > 0)) {
                dispatch(new TimelineMsg(1, [files[0]]));
            }
        },
    }), createElement("span", {
        children: "Import logo (style pack)",
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])]))), createElement("label", createObj(ofArray([["className", "px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm"], (elems_2 = [createElement("input", {
        type: "file",
        accept: "image/*",
        className: "hidden",
        onChange: (ev_1) => {
            const input_1 = ev_1.target;
            const files_1 = input_1.files;
            if (!(files_1 == null) && (files_1.length > 0)) {
                dispatch(new TimelineMsg(0, [files_1[0]]));
            }
        },
    }), createElement("span", {
        children: "Import image",
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))), createElement("button", {
        className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
        disabled: model.Saving ? true : model.Previewing,
        title: "CPU FFmpeg libx264 stitch — not GPU",
        children: model.Previewing ? "Rendering preview…" : "Refresh mockup preview",
        onClick: (_arg) => {
            dispatch(new TimelineMsg(14, []));
        },
    }), createElement("button", createObj(ofArray([(value_61 = "px-4 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm font-medium disabled:opacity-50", ["className", value_61]), ["disabled", model.Baking ? true : model.Saving], ["children", model.Baking ? "Baking…" : "Bake final MP4"], ["onClick", (_arg_1) => {
        dispatch(new TimelineMsg(15, []));
    }]]))), createElement("a", {
        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent inline-block",
        href: exportPremiereXmlUrl(model.Project.Id),
        target: "_blank",
        children: "Export Premiere XML",
    }), createElement("button", {
        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50",
        disabled: model.Saving,
        children: "Export share pack",
        onClick: (_arg_2) => {
            dispatch(new TimelineMsg(16, []));
        },
    }), createElement("button", {
        className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
        disabled: model.Saving,
        children: model.Saving ? "Saving…" : "Save",
        onClick: (_arg_3) => {
            dispatch(new TimelineMsg(19, []));
        },
    }), createElement("button", {
        className: "px-3 py-2 rounded-md border border-surface-border text-sm",
        children: "Close project",
        onClick: (_arg_4) => {
            dispatch(new TimelineMsg(20, []));
        },
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])]))), defaultArg(map((url) => {
        let elems_5;
        return createElement("div", createObj(ofArray([["className", "px-6 py-4 border-b border-surface-border bg-surface-raised"], (elems_5 = [createElement("h2", {
            className: "text-sm font-semibold mb-2",
            children: "Mockup preview (640p Ken Burns stitch)",
        }), createElement("video", {
            className: "w-full max-w-2xl rounded-lg border border-surface-border bg-black",
            controls: true,
            src: url,
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])])));
    }, model.PreviewUrl), defaultOf()), defaultArg(map((url_1) => {
        let elems_6;
        return createElement("div", createObj(ofArray([["className", "px-6 py-4 border-b border-surface-border bg-surface-raised"], (elems_6 = [createElement("h2", {
            className: "text-sm font-semibold mb-2",
            children: "Bake export (1080p Ken Burns stitch)",
        }), createElement("video", {
            className: "w-full max-w-2xl rounded-lg border border-surface-border bg-black",
            controls: true,
            src: url_1,
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_6))])])));
    }, model.BakeUrl), defaultOf()), defaultArg(map((e) => createElement("div", {
        className: "px-6 py-2 text-red-400 text-sm",
        children: e,
    }), model.Error), defaultOf()), createElement("div", createObj(ofArray([["className", "flex flex-1 min-h-0"], (elems_22 = [createElement("div", createObj(ofArray([["className", "flex-1 overflow-x-auto px-6 py-6"], (elems_12 = toList(delay(() => {
        let elems_11;
        return isEmpty(blocks) ? singleton_1(createElement("div", {
            className: "text-slate-500 text-center py-16 border border-dashed border-surface-border rounded-lg",
            children: "Import images to build your storyboard timeline.",
        })) : singleton_1(createElement("div", createObj(ofArray([["className", "flex gap-4 min-h-[180px]"], (elems_11 = mapIndexed((i, block) => {
            let elems_10;
            const isSelected = defaultArg(map((y) => (block.Id === y), model.SelectedBlockId), false);
            return createElement("div", createObj(ofArray([["key", block.Id], ["draggable", true], ["className", ("w-44 shrink-0 rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing " + (equals(model.DragIndex, i) ? "opacity-60 " : "")) + (isSelected ? "border-accent bg-surface-raised ring-1 ring-accent" : "border-surface-border bg-surface-raised hover:border-accent/60")], ["onDragStart", (ev_2) => {
                ev_2.dataTransfer.setData("text/plain", int32ToString(i));
                ev_2.dataTransfer.effectAllowed = "move";
                dispatch(new TimelineMsg(4, [i]));
            }], ["onDragOver", (ev_3) => {
                ev_3.preventDefault();
            }], ["onDrop", (ev_4) => {
                ev_4.preventDefault();
                dispatch(new TimelineMsg(5, [i]));
            }], ["onClick", (_arg_5) => {
                dispatch(new TimelineMsg(6, [block.Id]));
            }], (elems_10 = toList(delay(() => {
                let matchValue, elems_7;
                return append_1((matchValue = StoryboardTimeline_blockThumbnailUrl(model.Project.Id, model.Project, block), (matchValue == null) ? singleton_1(createElement("div", {
                    className: "aspect-video bg-surface flex items-center justify-center text-xs text-slate-600 px-2 text-center",
                    children: StoryboardTimeline_blockPlaceholderLabel(block),
                })) : singleton_1(createElement("div", createObj(ofArray([["className", "aspect-video bg-surface overflow-hidden"], (elems_7 = [createElement("img", {
                    className: "w-full h-full object-cover",
                    src: matchValue,
                    alt: defaultArg(block.Title, "Block thumbnail"),
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_7))])]))))), delay(() => {
                    let elems_9, dur, matchValue_1, d, d_1, elems_8;
                    return singleton_1(createElement("div", createObj(ofArray([["className", "p-2 text-xs space-y-2"], (elems_9 = [createElement("div", {
                        className: "text-slate-400",
                        children: (dur = ProjectModule_effectiveMockupDuration(model.Project, block), (matchValue_1 = block.MockupDurationSec, (matchValue_1 != null) ? (((d = matchValue_1, Math.abs(d - dur) > 0.01)) ? ((d_1 = matchValue_1, `#${i + 1} · ${dur}s (from audio)`)) : (`#${i + 1} · ${dur}s`)) : (`#${i + 1} · ${dur}s`))),
                    }), createElement("div", createObj(ofArray([["className", "flex gap-1"], (elems_8 = [createElement("button", {
                        className: "flex-1 py-1 rounded border border-surface-border hover:border-accent",
                        children: "↑",
                        onClick: (ev_5) => {
                            ev_5.stopPropagation();
                            dispatch(new TimelineMsg(2, [block.Id]));
                        },
                    }), createElement("button", {
                        className: "flex-1 py-1 rounded border border-surface-border hover:border-accent",
                        children: "↓",
                        onClick: (ev_6) => {
                            ev_6.stopPropagation();
                            dispatch(new TimelineMsg(3, [block.Id]));
                        },
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_8))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_9))])]))));
                }));
            })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_10))])])));
        }, blocks), ["children", Interop_reactApi.Children.toArray(Array.from(elems_11))])]))));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_12))])]))), defaultArg(map((block_1) => {
        let elems_21, elems_20, elems_13, elems_17, elems_18, value_278, elems_19, matchValue_3, a_1, value_295;
        return createElement("aside", createObj(ofArray([["className", "w-80 border-l border-surface-border bg-surface-raised flex flex-col shrink-0"], (elems_21 = [createElement("div", {
            className: "px-4 py-3 border-b border-surface-border font-semibold text-sm",
            children: defaultArg(block_1.Title, "Block inspector"),
        }), createElement("div", createObj(ofArray([["className", "p-4 space-y-4 text-sm overflow-y-auto flex-1"], (elems_20 = [createElement("div", createObj(singleton((elems_13 = toList(delay(() => append_1(singleton_1(createElement("label", {
            className: "block text-xs text-slate-500 mb-1",
            children: "Image prompt",
        })), delay(() => append_1(singleton_1(createElement("textarea", {
            className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[60px]",
            placeholder: "Describe the scene to generate…",
            value: model.ImagePromptDraft,
            onChange: (ev_7) => {
                dispatch(new TimelineMsg(8, [ev_7.target.value]));
            },
        })), delay(() => (StoryboardTimeline_looksLikeFilename(model.ImagePromptDraft) ? singleton_1(createElement("p", {
            className: "mt-1 text-xs text-amber-400/90",
            children: "This looks like a filename — use a text description for AI generation, or import the image instead.",
        })) : empty()))))))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_13))])))), createElement("button", {
            className: "w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
            disabled: model.Generating,
            children: model.Generating ? "Generating 3 variants…" : "Generate 3 thumbnail variants",
            onClick: (_arg_6) => {
                dispatch(new TimelineMsg(11, []));
            },
        }), defaultArg(map((variants) => {
            let elems_16, elems_15;
            return createElement("div", createObj(ofArray([["className", "space-y-2"], (elems_16 = [createElement("p", {
                className: "text-xs text-slate-500",
                children: "Pick a variant",
            }), createElement("div", createObj(ofArray([["className", "grid grid-cols-3 gap-2"], (elems_15 = mapIndexed((vi, path) => {
                let value_228, elems_14;
                return createElement("button", createObj(ofArray([["type", "button"], ["className", "aspect-video rounded border overflow-hidden " + (((value_228 = (vi === 0), defaultArg(map((y_1) => (path === y_1), block_1.ThumbnailPath), value_228))) ? "border-accent ring-1 ring-accent" : "border-surface-border hover:border-accent/60")], ["onClick", (_arg_7) => {
                    dispatch(new TimelineMsg(12, [path]));
                }], (elems_14 = [createElement("img", {
                    className: "w-full h-full object-cover",
                    src: previewMediaUrl(model.Project.Id, path, StoryboardTimeline_mediaCacheBust(model.Project)),
                    alt: `Variant ${vi + 1}`,
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_14))])])));
            }, variants), ["children", Interop_reactApi.Children.toArray(Array.from(elems_15))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_16))])])));
        }, filter((vs) => (length(vs) > 1), bind((g) => g.ThumbnailVariants, block_1.Generation))), defaultOf()), createElement("div", createObj(singleton((elems_17 = [createElement("label", {
            className: "block text-xs text-slate-500 mb-1",
            children: "Crossfade to next (ms)",
        }), createElement("input", {
            type: "number",
            min: 0,
            max: 2000,
            step: 50,
            className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm",
            value: int32ToString(model.CrossfadeDurationDraft),
            onChange: (ev_8) => {
                let matchValue_2;
                let outArg = 0;
                matchValue_2 = [tryParse(ev_8.target.value, 511, false, 32, new FSharpRef(() => outArg, (v_2) => {
                    outArg = (v_2 | 0);
                })), outArg];
                if (matchValue_2[0]) {
                    dispatch(new TimelineMsg(9, [matchValue_2[1]]));
                }
            },
        }), createElement("p", {
            className: "mt-1 text-xs text-slate-500",
            children: "Per-block transition override for mockup preview and bake.",
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_17))])))), createElement("div", createObj(singleton((elems_18 = [createElement("label", {
            className: "block text-xs text-slate-500 mb-1",
            children: "Voiceover script",
        }), createElement("textarea", {
            className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[80px]",
            placeholder: "Narration for this block…",
            value: model.VoiceoverDraft,
            onChange: (ev_9) => {
                dispatch(new TimelineMsg(7, [ev_9.target.value]));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_18))])))), createElement("label", createObj(ofArray([(value_278 = "block px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm text-center", ["className", value_278]), (elems_19 = [createElement("input", {
            type: "file",
            accept: "audio/*",
            className: "hidden",
            onChange: (ev_10) => {
                const input_2 = ev_10.target;
                const files_2 = input_2.files;
                if (!(files_2 == null) && (files_2.length > 0)) {
                    dispatch(new TimelineMsg(13, [files_2[0]]));
                }
            },
        }), createElement("span", {
            children: (matchValue_3 = block_1.Audio, (matchValue_3 != null) ? ((matchValue_3.Path != null) ? ((a_1 = matchValue_3, "Replace audio")) : "Import audio") : "Import audio"),
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_19))])]))), defaultArg(map((p) => createElement("p", {
            className: "text-xs text-slate-500 truncate",
            children: `Audio: ${p}`,
        }), bind((a_2) => a_2.Path, block_1.Audio)), defaultOf()), createElement("button", createObj(ofArray([(value_295 = "w-full px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50", ["className", value_295]), ["disabled", model.Saving], ["children", model.Saving ? "Saving…" : "Save block fields"], ["onClick", (_arg_8) => {
            dispatch(new TimelineMsg(10, []));
        }]])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_20))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_21))])])));
    }, selected), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_22))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_23))])])));
}

export function StoryboardTimeline_setDragIndex(model, idx) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, idx, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_moveUp(model, blockId) {
    return new TimelineModel(StoryboardTimeline_reorder(model.Project, blockId, -1), model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_moveDown(model, blockId) {
    return new TimelineModel(StoryboardTimeline_reorder(model.Project, blockId, 1), model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_withProject(project, model) {
    return StoryboardTimeline_selectBlock(new TimelineModel(project, false, false, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft), model.SelectedBlockId);
}

export function StoryboardTimeline_withPreviewUrl(url, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, false, model.Baking, url, model.BakeUrl, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_withPreviewStarted(jobId, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, true, model.Baking, model.PreviewUrl, model.BakeUrl, jobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_withPreviewError(err, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, false, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, err, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_withBakeStarted(jobId, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, true, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, jobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_withBakeUrl(url, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, false, model.PreviewUrl, url, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

export function StoryboardTimeline_withBakeError(err, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, false, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, err, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.CrossfadeDurationDraft);
}

