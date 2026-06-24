import { FSharpRef, Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, int64_type, list_type, bool_type, float64_type, option_type, int32_type, class_type, union_type, string_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { SharePackPanel_view, SharePackModel_$reflection, SharePackMsg_$reflection } from "./SharePackPanel.js";
import { ProjectModule_effectiveMockupDuration, Project as Project_1, StoryboardBlock, Project_$reflection } from "../LMVideoStudio.Domain/Types.js";
import { loadAll, QuickButton_$reflection } from "../PromptQuickButtons.js";
import { isEmpty, map as map_1, ofArray, tryFind, findIndex, skip, singleton, take, append, mapIndexed, indexed, choose, item as item_1, length as length_1, sortBy } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { int32ToString, equals as equals_1, createObj, comparePrimitives } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { equals, max } from "../fable_modules/fable-library-js.4.27.0/BigInt.js";
import { filter as filter_1, defaultArgWith, orElse, bind, map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { utcNow, toUnixTimeMilliseconds } from "../fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { exportPremiereXmlUrl, previewMediaUrl } from "../Api.js";
import { join, isNullOrWhiteSpace } from "../fable_modules/fable-library-js.4.27.0/String.js";
import { empty, singleton as singleton_1, append as append_1, delay, toList, filter, length } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { isDigit } from "../fable_modules/fable-library-js.4.27.0/Char.js";
import { createElement } from "react";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { formatFloat } from "../FormatHelpers.js";
import { tryParse } from "../fable_modules/fable-library-js.4.27.0/Double.js";
import { tryParse as tryParse_1 } from "../fable_modules/fable-library-js.4.27.0/Int32.js";

export class VariantModalMode extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Compare", "Enlarge"];
    }
}

export function VariantModalMode_$reflection() {
    return union_type("LMVideoStudio.Client.Views.StoryboardTimeline.VariantModalMode", [], VariantModalMode, () => [[], [["Item", string_type]]]);
}

export class TimelineMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ImportImage", "ImportStylePack", "MoveBlockUp", "MoveBlockDown", "DragStart", "DropOnIndex", "SelectBlock", "SetVoiceoverScript", "SetImagePrompt", "SetMoodTags", "SetCrossfadeDuration", "SaveBlockFields", "GenerateThumbnail", "SelectThumbnailVariant", "OpenVariantModal", "CloseVariantModal", "EnlargeVariant", "BackToVariantCompare", "ApplyPromptQuickButton", "RefreshPromptQuickButtons", "ImportReferenceImage", "ClearReferenceImage", "UseThumbnailAsReference", "SetReferenceStrength", "ImportAudio", "RefreshMockupPreview", "StartBake", "ExportSharePack", "SharePackMsg", "PreviewFailed", "BakeFailed", "Save", "BackToHub"];
    }
}

export function TimelineMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.StoryboardTimeline.TimelineMsg", [], TimelineMsg, () => [[["Item", class_type("Browser.Types.File", undefined)]], [["Item", class_type("Browser.Types.File", undefined)]], [["Item", class_type("System.Guid")]], [["Item", class_type("System.Guid")]], [["Item", int32_type]], [["Item", int32_type]], [["Item", option_type(class_type("System.Guid"))]], [["Item", string_type]], [["Item", string_type]], [["Item", string_type]], [["Item", int32_type]], [], [], [["Item", string_type]], [], [], [["Item", string_type]], [], [["Item", string_type]], [], [["Item", class_type("Browser.Types.File", undefined)]], [], [], [["Item", float64_type]], [["Item", class_type("Browser.Types.File", undefined)]], [], [], [], [["Item", SharePackMsg_$reflection()]], [["Item", string_type]], [["Item", string_type]], [], []]);
}

export class TimelineModel extends Record {
    constructor(Project, Saving, Generating, Previewing, Baking, PreviewUrl, BakeUrl, PreviewJobId, BakeJobId, Error$, DragIndex, SelectedBlockId, VoiceoverDraft, ImagePromptDraft, MoodTagsDraft, CrossfadeDurationDraft, ImagePromptQuickButtons, ReferenceStrengthDraft, MediaRevision, VariantModal, SharePack) {
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
        this.MoodTagsDraft = MoodTagsDraft;
        this.CrossfadeDurationDraft = (CrossfadeDurationDraft | 0);
        this.ImagePromptQuickButtons = ImagePromptQuickButtons;
        this.ReferenceStrengthDraft = ReferenceStrengthDraft;
        this.MediaRevision = MediaRevision;
        this.VariantModal = VariantModal;
        this.SharePack = SharePack;
    }
}

export function TimelineModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.StoryboardTimeline.TimelineModel", [], TimelineModel, () => [["Project", Project_$reflection()], ["Saving", bool_type], ["Generating", bool_type], ["Previewing", bool_type], ["Baking", bool_type], ["PreviewUrl", option_type(string_type)], ["BakeUrl", option_type(string_type)], ["PreviewJobId", option_type(class_type("System.Guid"))], ["BakeJobId", option_type(class_type("System.Guid"))], ["Error", option_type(string_type)], ["DragIndex", option_type(int32_type)], ["SelectedBlockId", option_type(class_type("System.Guid"))], ["VoiceoverDraft", string_type], ["ImagePromptDraft", string_type], ["MoodTagsDraft", string_type], ["CrossfadeDurationDraft", int32_type], ["ImagePromptQuickButtons", list_type(QuickButton_$reflection())], ["ReferenceStrengthDraft", float64_type], ["MediaRevision", int64_type], ["VariantModal", option_type(VariantModalMode_$reflection())], ["SharePack", option_type(SharePackModel_$reflection())]]);
}

export function StoryboardTimeline_init(project) {
    return new TimelineModel(project, false, false, false, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "", "", "", 300, loadAll(), 0.45, 0n, undefined, undefined);
}

function StoryboardTimeline_sortedBlocks(project) {
    return sortBy((b) => b.Order, project.Blocks, {
        Compare: comparePrimitives,
    });
}

function StoryboardTimeline_mediaCacheBust(model) {
    const bust = max(model.MediaRevision, defaultArg(map(toUnixTimeMilliseconds, model.Project.UpdatedAt), 0n));
    if (equals(bust, 0n)) {
        return toUnixTimeMilliseconds(utcNow());
    }
    else {
        return bust;
    }
}

function StoryboardTimeline_mediaPreviewSrc(model, path) {
    const bust = StoryboardTimeline_mediaCacheBust(model);
    return [previewMediaUrl(model.Project.Id, path, bust), `${path}-${bust}`];
}

function StoryboardTimeline_blockThumbnailUrl(model, block) {
    return map((path) => previewMediaUrl(model.Project.Id, path, StoryboardTimeline_mediaCacheBust(model)), block.ThumbnailPath);
}

function StoryboardTimeline_looksLikeFilename(prompt) {
    if (isNullOrWhiteSpace(prompt)) {
        return false;
    }
    else {
        const t = prompt.trim();
        const lower = t.toLowerCase();
        if (((((lower.endsWith(".png") ? true : lower.endsWith(".jpg")) ? true : lower.endsWith(".jpeg")) ? true : lower.endsWith(".webp")) ? true : lower.endsWith(".gif")) ? true : ((t.indexOf("\\") >= 0) && !(t.indexOf(" ") >= 0))) {
            return true;
        }
        else {
            const digits = length(filter(isDigit, t.split(""))) | 0;
            if (t.length >= 12) {
                if (digits >= ~~((t.length * 2) / 3)) {
                    return true;
                }
                else if (t.indexOf("_") >= 0) {
                    return digits >= 8;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
    }
}

export const StoryboardTimeline_isUnusablePromptDraft = StoryboardTimeline_looksLikeFilename;

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
    if (((((fromIdx < 0) ? true : (toIdx < 0)) ? true : (fromIdx >= length_1(blocks))) ? true : (toIdx >= length_1(blocks))) ? true : (fromIdx === toIdx)) {
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
    return new TimelineModel(StoryboardTimeline_reorderByIndex(model.Project, fromIdx, toIdx), model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, undefined, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

function StoryboardTimeline_reorder(project, blockId, direction) {
    const blocks = StoryboardTimeline_sortedBlocks(project);
    const idx = findIndex((b) => (b.Id === blockId), blocks) | 0;
    if (((idx + direction) < 0) ? true : ((idx + direction) >= length_1(blocks))) {
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
        return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, undefined, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, undefined, model.SharePack);
    }
    else {
        const id = blockId;
        const matchValue = tryFind((b) => (b.Id === id), model.Project.Blocks);
        if (matchValue == null) {
            return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, undefined, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, undefined, model.SharePack);
        }
        else {
            const block = matchValue;
            return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, id, defaultArg(block.VoiceoverScript, ""), defaultArg(block.ImagePrompt, ""), join(", ", block.MoodTags), StoryboardTimeline_blockCrossfadeMs(block, model.Project), model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, undefined, model.SharePack);
        }
    }
}

function StoryboardTimeline_variantModalView(model, block, variants, dispatch) {
    let elems_9, value_37, elems_8;
    return createElement("div", createObj(ofArray([["className", "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"], ["onClick", (ev) => {
        if (equals_1(ev.target, ev.currentTarget)) {
            dispatch(new TimelineMsg(15, []));
        }
    }], (elems_9 = [createElement("div", createObj(ofArray([(value_37 = "w-full max-w-5xl max-h-[90vh] rounded-xl border border-surface-border bg-surface-raised shadow-xl flex flex-col", ["className", value_37]), ["onClick", (ev_1) => {
        ev_1.stopPropagation();
    }], (elems_8 = toList(delay(() => {
        let elems_4, elems_3;
        return append_1(singleton_1(createElement("div", createObj(ofArray([["className", "px-5 py-4 border-b border-surface-border flex items-center justify-between gap-3"], (elems_4 = [createElement("div", createObj(singleton((elems_3 = [createElement("h2", {
            className: "text-lg font-semibold",
            children: "Compare thumbnail variants",
        }), createElement("p", {
            className: "text-xs text-slate-500 mt-0.5",
            children: "Pick one for this block, or open a variant full size.",
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])))), createElement("button", {
            type: "button",
            className: "px-3 py-1.5 rounded-md border border-surface-border text-sm hover:border-accent",
            children: "Close",
            onClick: (_arg_3) => {
                dispatch(new TimelineMsg(15, []));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])))), delay(() => {
            let elems_5, patternInput_1, elems_7, elems_6;
            const matchValue = model.VariantModal;
            let matchResult, path_1;
            if (matchValue != null) {
                if (matchValue.tag === 1) {
                    matchResult = 0;
                    path_1 = matchValue.fields[0];
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
                    return singleton_1(createElement("div", createObj(ofArray([["className", "p-5 flex-1 overflow-auto flex flex-col items-center gap-4"], (elems_5 = [createElement("button", {
                        type: "button",
                        className: "self-start px-3 py-1.5 rounded-md border border-surface-border text-sm hover:border-accent",
                        children: "← Back to comparison",
                        onClick: (_arg_4) => {
                            dispatch(new TimelineMsg(17, []));
                        },
                    }), (patternInput_1 = StoryboardTimeline_mediaPreviewSrc(model, path_1), createElement("img", {
                        key: patternInput_1[1],
                        className: "max-w-full max-h-[70vh] object-contain rounded-lg border border-surface-border",
                        src: patternInput_1[0],
                        alt: "Variant full size",
                    })), createElement("button", {
                        type: "button",
                        className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium",
                        children: "Use this variant",
                        onClick: (_arg_5) => {
                            dispatch(new TimelineMsg(13, [path_1]));
                        },
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])]))));
                default:
                    return singleton_1(createElement("div", createObj(ofArray([["className", "p-5 overflow-auto"], (elems_7 = [createElement("div", createObj(ofArray([["className", "grid grid-cols-1 sm:grid-cols-3 gap-4"], (elems_6 = mapIndexed((vi_1, path_2) => {
                        let elems_2, elems, elems_1;
                        const path = path_2;
                        let selected;
                        const value_88 = vi_1 === 0;
                        selected = defaultArg(map((y) => (path_2 === y), block.ThumbnailPath), value_88);
                        const patternInput = StoryboardTimeline_mediaPreviewSrc(model, path);
                        return createElement("div", createObj(ofArray([["className", "flex flex-col gap-2"], (elems_2 = [createElement("button", createObj(ofArray([["type", "button"], ["className", "rounded-lg border overflow-hidden bg-surface " + (selected ? "border-accent ring-2 ring-accent" : "border-surface-border hover:border-accent/60")], ["onClick", (_arg) => {
                            dispatch(new TimelineMsg(16, [path_2]));
                        }], (elems = [createElement("img", {
                            key: patternInput[1],
                            className: "w-full aspect-video object-cover",
                            src: patternInput[0],
                            alt: `Variant ${vi_1 + 1}`,
                        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])]))), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems_1 = [createElement("button", {
                            type: "button",
                            className: "flex-1 px-2 py-1.5 rounded-md text-xs font-medium " + (selected ? "bg-accent text-white" : "border border-surface-border hover:border-accent"),
                            children: selected ? "Selected" : "Use this",
                            onClick: (_arg_1) => {
                                dispatch(new TimelineMsg(13, [path]));
                            },
                        }), createElement("button", {
                            type: "button",
                            className: "px-2 py-1.5 rounded-md border border-surface-border text-xs hover:border-accent",
                            children: "Large",
                            onClick: (_arg_2) => {
                                dispatch(new TimelineMsg(16, [path]));
                            },
                        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])])));
                    }, variants), ["children", Interop_reactApi.Children.toArray(Array.from(elems_6))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_7))])]))));
            }
        }));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_8))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_9))])])));
}

export function StoryboardTimeline_view(model, dispatch) {
    let elems_31;
    const blocks = StoryboardTimeline_sortedBlocks(model.Project);
    const selected = StoryboardTimeline_selectedBlock(model);
    return createElement("div", createObj(ofArray([["className", "flex flex-col h-full"], (elems_31 = toList(delay(() => {
        let elems_4, children, elems_3, elems_1, elems_2, value_61;
        return append_1(singleton_1(createElement("div", createObj(ofArray([["className", "flex items-center justify-between px-6 py-4 border-b border-surface-border"], (elems_4 = [(children = ofArray([createElement("h1", {
            className: "text-xl font-bold",
            children: model.Project.Name,
        }), createElement("p", {
            className: "text-sm text-slate-500",
            children: `${length_1(blocks)} blocks · default ${model.Project.DefaultMockupDurationSec}s mockup (3–4s)`,
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
            title: "Stitches block thumbnails with CPU FFmpeg Ken Burns zoom. Timing/layout check only — not AI video.",
            children: model.Previewing ? "Stitching preview…" : "Stitch Ken Burns preview",
            onClick: (_arg) => {
                dispatch(new TimelineMsg(25, []));
            },
        }), createElement("button", createObj(ofArray([(value_61 = "px-4 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm font-medium disabled:opacity-50", ["className", value_61]), ["disabled", model.Baking ? true : model.Saving], ["title", "1080p Ken Burns stitch; optional GPU upscale per block when enabled."], ["children", model.Baking ? "Baking…" : "Bake final MP4"], ["onClick", (_arg_1) => {
            dispatch(new TimelineMsg(26, []));
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
                dispatch(new TimelineMsg(27, []));
            },
        }), createElement("button", {
            className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
            disabled: model.Saving,
            children: model.Saving ? "Saving…" : "Save",
            onClick: (_arg_3) => {
                dispatch(new TimelineMsg(31, []));
            },
        }), createElement("button", {
            className: "px-3 py-2 rounded-md border border-surface-border text-sm",
            children: "Close project",
            onClick: (_arg_4) => {
                dispatch(new TimelineMsg(32, []));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])))), delay(() => append_1(singleton_1(defaultArg(map((url) => {
            let elems_5;
            return createElement("div", createObj(ofArray([["className", "px-6 py-4 border-b border-surface-border bg-surface-raised"], (elems_5 = [createElement("h2", {
                className: "text-sm font-semibold mb-1",
                children: "Quick preview (640p Ken Burns · CPU)",
            }), createElement("p", {
                className: "text-xs text-slate-500 mb-2",
                children: "Zoom/pan on still thumbnails for timing — not AI-generated motion.",
            }), createElement("video", {
                className: "w-full max-w-2xl rounded-lg border border-surface-border bg-black",
                controls: true,
                src: url,
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])])));
        }, model.PreviewUrl), defaultOf())), delay(() => append_1(singleton_1(defaultArg(map((url_1) => {
            let elems_6;
            return createElement("div", createObj(ofArray([["className", "px-6 py-4 border-b border-surface-border bg-surface-raised"], (elems_6 = [createElement("h2", {
                className: "text-sm font-semibold mb-1",
                children: "Final export (1080p Ken Burns · CPU)",
            }), createElement("p", {
                className: "text-xs text-slate-500 mb-2",
                children: "Higher-resolution stitch; GPU upscale applies when enabled on blocks.",
            }), createElement("video", {
                className: "w-full max-w-2xl rounded-lg border border-surface-border bg-black",
                controls: true,
                src: url_1,
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_6))])])));
        }, model.BakeUrl), defaultOf())), delay(() => append_1(singleton_1(defaultArg(map((e) => createElement("div", {
            className: "px-6 py-2 text-red-400 text-sm",
            children: e,
        }), model.Error), defaultOf())), delay(() => append_1(singleton_1(defaultArg(map((sp_2) => SharePackPanel_view(sp_2, (arg) => {
            dispatch(new TimelineMsg(28, [arg]));
        }), model.SharePack), defaultOf())), delay(() => {
            let elems_30, elems_12;
            return append_1(singleton_1(createElement("div", createObj(ofArray([["className", "flex flex-1 min-h-0"], (elems_30 = [createElement("div", createObj(ofArray([["className", "flex-1 overflow-x-auto px-6 py-6"], (elems_12 = toList(delay(() => {
                let elems_11;
                return isEmpty(blocks) ? singleton_1(createElement("div", {
                    className: "text-slate-500 text-center py-16 border border-dashed border-surface-border rounded-lg",
                    children: "Import images to build your storyboard timeline.",
                })) : singleton_1(createElement("div", createObj(ofArray([["className", "flex gap-4 min-h-[180px]"], (elems_11 = mapIndexed((i, block) => {
                    let elems_10;
                    const isSelected = defaultArg(map((y) => (block.Id === y), model.SelectedBlockId), false);
                    return createElement("div", createObj(ofArray([["key", block.Id], ["draggable", true], ["className", ("w-44 shrink-0 rounded-lg border overflow-hidden cursor-grab active:cursor-grabbing " + (equals_1(model.DragIndex, i) ? "opacity-60 " : "")) + (isSelected ? "border-accent bg-surface-raised ring-1 ring-accent" : "border-surface-border bg-surface-raised hover:border-accent/60")], ["onDragStart", (ev_2) => {
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
                        let matchValue, url_2, elems_7;
                        return append_1((matchValue = StoryboardTimeline_blockThumbnailUrl(model, block), (matchValue == null) ? singleton_1(createElement("div", {
                            className: "aspect-video bg-surface flex items-center justify-center text-xs text-slate-600 px-2 text-center",
                            children: StoryboardTimeline_blockPlaceholderLabel(block),
                        })) : ((url_2 = matchValue, singleton_1(createElement("div", createObj(ofArray([["className", "aspect-video bg-surface overflow-hidden"], (elems_7 = [createElement("img", {
                            key: defaultArg(map((p) => StoryboardTimeline_mediaPreviewSrc(model, p)[1], block.ThumbnailPath), url_2),
                            className: "w-full h-full object-cover",
                            src: url_2,
                            alt: defaultArg(block.Title, "Block thumbnail"),
                        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_7))])]))))))), delay(() => {
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
                let elems_29, elems_28, elems_15, elems_19, value_279, elems_17, elems_18, matchValue_3, elems_24, elems_25, elems_26, value_413, elems_27, matchValue_5, a_1, value_430;
                return createElement("aside", createObj(ofArray([["className", "w-80 border-l border-surface-border bg-surface-raised flex flex-col shrink-0"], (elems_29 = [createElement("div", {
                    className: "px-4 py-3 border-b border-surface-border font-semibold text-sm",
                    children: defaultArg(block_1.Title, "Block inspector"),
                }), createElement("div", createObj(ofArray([["className", "p-4 space-y-4 text-sm overflow-y-auto flex-1"], (elems_28 = [createElement("div", createObj(singleton((elems_15 = toList(delay(() => append_1(singleton_1(createElement("label", {
                    className: "block text-xs text-slate-500 mb-1",
                    children: "Image prompt",
                })), delay(() => append_1(singleton_1(createElement("textarea", {
                    className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[60px]",
                    placeholder: "Describe the scene to generate…",
                    value: model.ImagePromptDraft,
                    onChange: (ev_7) => {
                        dispatch(new TimelineMsg(8, [ev_7.target.value]));
                    },
                })), delay(() => append_1(StoryboardTimeline_looksLikeFilename(model.ImagePromptDraft) ? singleton_1(createElement("p", {
                    className: "mt-1 text-xs text-amber-400/90",
                    children: "This looks like a filename — use a text description for AI generation, or import the image instead.",
                })) : empty(), delay(() => {
                    let elems_14, elems_13;
                    return !isEmpty(model.ImagePromptQuickButtons) ? singleton_1(createElement("div", createObj(ofArray([["className", "mt-2 space-y-1"], (elems_14 = [createElement("p", {
                        className: "text-xs text-slate-500",
                        children: "Quick prompts",
                    }), createElement("div", createObj(ofArray([["className", "flex flex-wrap gap-1.5"], (elems_13 = map_1((qb) => createElement("button", {
                        type: "button",
                        className: "px-2 py-1 rounded-md border border-surface-border text-xs hover:border-accent hover:text-accent",
                        title: qb.Prompt,
                        children: qb.Label,
                        onClick: (_arg_6) => {
                            dispatch(new TimelineMsg(18, [qb.Prompt]));
                        },
                    }), model.ImagePromptQuickButtons), ["children", Interop_reactApi.Children.toArray(Array.from(elems_13))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_14))])])))) : empty();
                })))))))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_15))])))), createElement("div", createObj(ofArray([["className", "space-y-2 rounded-md border border-surface-border p-3"], (elems_19 = [createElement("label", {
                    className: "block text-xs text-slate-500 mb-1",
                    children: "Reference image (optional, img2img)",
                }), defaultArgWith(map((path) => {
                    let elems_16, patternInput_1, value_269;
                    return createElement("div", createObj(ofArray([["className", "space-y-2"], (elems_16 = [(patternInput_1 = StoryboardTimeline_mediaPreviewSrc(model, path), createElement("img", {
                        key: patternInput_1[1],
                        className: "w-full max-h-32 object-contain rounded border border-surface-border bg-surface",
                        src: patternInput_1[0],
                        alt: "Reference for generation",
                    })), createElement("p", {
                        className: "text-xs text-slate-500 truncate",
                        title: path,
                        children: path,
                    }), createElement("button", createObj(ofArray([["type", "button"], (value_269 = "w-full px-2 py-1.5 rounded-md border border-surface-border text-xs hover:border-red-400 hover:text-red-300", ["className", value_269]), ["children", "Remove reference"], ["onClick", (_arg_7) => {
                        dispatch(new TimelineMsg(21, []));
                    }]])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_16))])])));
                }, bind((g) => g.ReferenceAssetPath, block_1.Generation)), () => {
                    let value_277;
                    return createElement("p", createObj(ofArray([["className", "text-xs text-slate-500"], (value_277 = "Upload a photo or use the block thumbnail to guide GPU generation. Top bar Import image adds a timeline block — use this section to attach a reference for img2img.", ["children", value_277])])));
                }), createElement("label", createObj(ofArray([(value_279 = "block px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm text-center", ["className", value_279]), (elems_17 = [createElement("input", {
                    type: "file",
                    accept: "image/*",
                    className: "hidden",
                    onChange: (ev_8) => {
                        const input_2 = ev_8.target;
                        const files_2 = input_2.files;
                        if (!(files_2 == null) && (files_2.length > 0)) {
                            dispatch(new TimelineMsg(20, [files_2[0]]));
                        }
                    },
                }), createElement("span", {
                    children: "Upload reference image",
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_17))])]))), defaultArg(map((_arg_8) => createElement("button", {
                    type: "button",
                    className: "w-full px-2 py-1.5 rounded-md border border-surface-border text-xs hover:border-accent",
                    children: "Use block thumbnail as reference",
                    onClick: (_arg_9) => {
                        dispatch(new TimelineMsg(22, []));
                    },
                }), filter_1((thumb) => defaultArg(map((y_1) => (thumb !== y_1), bind((g_1) => g_1.ReferenceAssetPath, block_1.Generation)), true), block_1.ThumbnailPath)), defaultOf()), createElement("div", createObj(singleton((elems_18 = [createElement("label", {
                    className: "block text-xs text-slate-500 mb-1",
                    children: `Reference strength: ${formatFloat(2, model.ReferenceStrengthDraft)} (lower = closer to photo; 0.5–0.6 to add props/outfits)`,
                }), createElement("input", {
                    type: "range",
                    min: 0.15,
                    max: 0.65,
                    step: 0.05,
                    className: "w-full",
                    value: model.ReferenceStrengthDraft.toString(),
                    onChange: (ev_9) => {
                        let matchValue_2;
                        let outArg = 0;
                        matchValue_2 = [tryParse(ev_9.target.value, new FSharpRef(() => outArg, (v_2) => {
                            outArg = v_2;
                        })), outArg];
                        if (matchValue_2[0]) {
                            dispatch(new TimelineMsg(23, [matchValue_2[1]]));
                        }
                    },
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_18))]))))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_19))])]))), createElement("button", {
                    className: "w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
                    disabled: model.Generating,
                    children: model.Generating ? "Generating 3 variants…" : ((matchValue_3 = bind((g_2) => g_2.ReferenceAssetPath, block_1.Generation), (matchValue_3 == null) ? "Generate 3 thumbnails (GPU)" : "Generate 3 thumbnails from reference (GPU)")),
                    onClick: (_arg_10) => {
                        dispatch(new TimelineMsg(12, []));
                    },
                }), defaultArg(map((variants) => {
                    let elems_23, elems_20, elems_22;
                    return createElement("div", createObj(ofArray([["className", "space-y-2"], (elems_23 = [createElement("div", createObj(ofArray([["className", "flex items-center justify-between gap-2"], (elems_20 = [createElement("p", {
                        className: "text-xs text-slate-500",
                        children: "Pick a variant",
                    }), createElement("button", {
                        type: "button",
                        className: "text-xs text-accent hover:underline",
                        children: "Compare large…",
                        onClick: (_arg_11) => {
                            dispatch(new TimelineMsg(14, []));
                        },
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_20))])]))), createElement("div", createObj(ofArray([["className", "grid grid-cols-3 gap-2"], (elems_22 = mapIndexed((vi, path_1) => {
                        let elems_21;
                        let selected_1;
                        const value_344 = vi === 0;
                        selected_1 = defaultArg(map((y_2) => (path_1 === y_2), block_1.ThumbnailPath), value_344);
                        const patternInput_2 = StoryboardTimeline_mediaPreviewSrc(model, path_1);
                        const imgKey_2 = patternInput_2[1];
                        return createElement("button", createObj(ofArray([["key", imgKey_2], ["type", "button"], ["className", "aspect-video rounded border overflow-hidden " + (selected_1 ? "border-accent ring-1 ring-accent" : "border-surface-border hover:border-accent/60")], ["onClick", (_arg_12) => {
                            dispatch(new TimelineMsg(13, [path_1]));
                        }], ["onDoubleClick", (_arg_13) => {
                            dispatch(new TimelineMsg(14, []));
                        }], (elems_21 = [createElement("img", {
                            key: imgKey_2,
                            className: "w-full h-full object-cover",
                            src: patternInput_2[0],
                            alt: `Variant ${vi + 1}`,
                        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_21))])])));
                    }, variants), ["children", Interop_reactApi.Children.toArray(Array.from(elems_22))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_23))])])));
                }, filter_1((vs) => (length_1(vs) > 1), bind((g_3) => g_3.ThumbnailVariants, block_1.Generation))), defaultOf()), createElement("div", createObj(singleton((elems_24 = [createElement("label", {
                    className: "block text-xs text-slate-500 mb-1",
                    children: "Crossfade to next (ms)",
                }), createElement("input", {
                    type: "number",
                    min: 0,
                    max: 2000,
                    step: 50,
                    className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm",
                    value: int32ToString(model.CrossfadeDurationDraft),
                    onChange: (ev_10) => {
                        let matchValue_4;
                        let outArg_1 = 0;
                        matchValue_4 = [tryParse_1(ev_10.target.value, 511, false, 32, new FSharpRef(() => outArg_1, (v_4) => {
                            outArg_1 = (v_4 | 0);
                        })), outArg_1];
                        if (matchValue_4[0]) {
                            dispatch(new TimelineMsg(10, [matchValue_4[1]]));
                        }
                    },
                }), createElement("p", {
                    className: "mt-1 text-xs text-slate-500",
                    children: "Crossfade between blocks in Ken Burns preview and bake export.",
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_24))])))), createElement("div", createObj(singleton((elems_25 = [createElement("label", {
                    className: "block text-xs text-slate-500 mb-1",
                    children: "Voiceover script",
                }), createElement("textarea", {
                    className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[80px]",
                    placeholder: "Narration for this block…",
                    value: model.VoiceoverDraft,
                    onChange: (ev_11) => {
                        dispatch(new TimelineMsg(7, [ev_11.target.value]));
                    },
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_25))])))), createElement("div", createObj(singleton((elems_26 = [createElement("label", {
                    className: "block text-xs text-slate-500 mb-1",
                    children: "Mood / tone tags (comma-separated)",
                }), createElement("input", {
                    type: "text",
                    className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm",
                    placeholder: "calm, upbeat, cinematic",
                    value: model.MoodTagsDraft,
                    onChange: (ev_12) => {
                        dispatch(new TimelineMsg(9, [ev_12.target.value]));
                    },
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_26))])))), createElement("label", createObj(ofArray([(value_413 = "block px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm text-center", ["className", value_413]), (elems_27 = [createElement("input", {
                    type: "file",
                    accept: "audio/*",
                    className: "hidden",
                    onChange: (ev_13) => {
                        const input_3 = ev_13.target;
                        const files_3 = input_3.files;
                        if (!(files_3 == null) && (files_3.length > 0)) {
                            dispatch(new TimelineMsg(24, [files_3[0]]));
                        }
                    },
                }), createElement("span", {
                    children: (matchValue_5 = block_1.Audio, (matchValue_5 != null) ? ((matchValue_5.Path != null) ? ((a_1 = matchValue_5, "Replace audio")) : "Import audio") : "Import audio"),
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_27))])]))), defaultArg(map((p_1) => createElement("p", {
                    className: "text-xs text-slate-500 truncate",
                    children: `Audio: ${p_1}`,
                }), bind((a_2) => a_2.Path, block_1.Audio)), defaultOf()), createElement("button", createObj(ofArray([(value_430 = "w-full px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50", ["className", value_430]), ["disabled", model.Saving], ["children", model.Saving ? "Saving…" : "Save block fields"], ["onClick", (_arg_14) => {
                    dispatch(new TimelineMsg(11, []));
                }]])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_28))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_29))])])));
            }, selected), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_30))])])))), delay(() => {
                let block_2;
                return (model.VariantModal != null) ? ((selected != null) ? ((block_2 = selected, singleton_1(defaultArg(map((variants_1) => StoryboardTimeline_variantModalView(model, block_2, variants_1, dispatch), filter_1((vs_1) => (length_1(vs_1) > 1), bind((g_4) => g_4.ThumbnailVariants, block_2.Generation))), defaultOf())))) : singleton_1(defaultOf())) : singleton_1(defaultOf());
            }));
        }))))))))));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_31))])])));
}

export function StoryboardTimeline_setDragIndex(model, idx) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, idx, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_moveUp(model, blockId) {
    return new TimelineModel(StoryboardTimeline_reorder(model.Project, blockId, -1), model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_moveDown(model, blockId) {
    return new TimelineModel(StoryboardTimeline_reorder(model.Project, blockId, 1), model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_withProject(project, model) {
    return StoryboardTimeline_selectBlock(new TimelineModel(project, false, false, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack), model.SelectedBlockId);
}

export function StoryboardTimeline_withProjectAfterGenerate(project, model) {
    const model$0027 = StoryboardTimeline_selectBlock(new TimelineModel(project, false, false, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, toUnixTimeMilliseconds(utcNow()), model.VariantModal, model.SharePack), model.SelectedBlockId);
    const matchValue = StoryboardTimeline_selectedBlock(model$0027);
    if (matchValue == null) {
        return model$0027;
    }
    else {
        const matchValue_1 = bind((g) => g.ThumbnailVariants, matchValue.Generation);
        let matchResult, vs_1;
        if (matchValue_1 != null) {
            if (length_1(matchValue_1) > 1) {
                matchResult = 0;
                vs_1 = matchValue_1;
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
                return new TimelineModel(model$0027.Project, model$0027.Saving, model$0027.Generating, model$0027.Previewing, model$0027.Baking, model$0027.PreviewUrl, model$0027.BakeUrl, model$0027.PreviewJobId, model$0027.BakeJobId, model$0027.Error, model$0027.DragIndex, model$0027.SelectedBlockId, model$0027.VoiceoverDraft, model$0027.ImagePromptDraft, model$0027.MoodTagsDraft, model$0027.CrossfadeDurationDraft, model$0027.ImagePromptQuickButtons, model$0027.ReferenceStrengthDraft, model$0027.MediaRevision, new VariantModalMode(0, []), model$0027.SharePack);
            default:
                return model$0027;
        }
    }
}

export function StoryboardTimeline_withSharePack(sharePack, model) {
    return new TimelineModel(model.Project, false, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, sharePack);
}

export function StoryboardTimeline_updateSharePack(f, model) {
    const matchValue = model.SharePack;
    if (matchValue != null) {
        return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, f(matchValue));
    }
    else {
        return model;
    }
}

export function StoryboardTimeline_clearSharePack(model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, undefined);
}

export function StoryboardTimeline_withPreviewUrl(url, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, false, model.Baking, url, model.BakeUrl, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_withPreviewStarted(jobId, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, true, model.Baking, model.PreviewUrl, model.BakeUrl, jobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_withPreviewError(err, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, false, model.Baking, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, err, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_withBakeStarted(jobId, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, true, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, jobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_withBakeUrl(url, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, false, model.PreviewUrl, url, model.PreviewJobId, model.BakeJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

export function StoryboardTimeline_withBakeError(err, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, false, model.PreviewUrl, model.BakeUrl, model.PreviewJobId, model.BakeJobId, err, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft, model.MoodTagsDraft, model.CrossfadeDurationDraft, model.ImagePromptQuickButtons, model.ReferenceStrengthDraft, model.MediaRevision, model.VariantModal, model.SharePack);
}

