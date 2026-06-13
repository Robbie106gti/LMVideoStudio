import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, int32_type, bool_type, union_type, string_type, option_type, class_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ProjectModule_effectiveMockupDuration, BlockSource, Project, StoryboardBlock, Project_$reflection } from "../../LMVideoStudio.Domain/Types.fs.js";
import { singleton as singleton_1, isEmpty, ofArray, tryFind, mapIndexed, item, length, findIndex, sortBy } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { equals, createObj, comparePrimitives } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { map, defaultArg, bind } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { createElement } from "react";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/./Interop.fs.js";
import { defaultOf } from "../fable_modules/Feliz.2.6.0/../fable-library-js.4.27.0/Util.js";
import { singleton, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";

export class TimelineMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ImportImage", "MoveBlockUp", "MoveBlockDown", "SelectBlock", "SetVoiceoverScript", "SetImagePrompt", "SaveBlockFields", "GenerateThumbnail", "ImportAudio", "RefreshMockupPreview", "PreviewFailed", "Save", "BackToHub"];
    }
}

export function TimelineMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.StoryboardTimeline.TimelineMsg", [], TimelineMsg, () => [[["Item", class_type("Browser.Types.File", undefined)]], [["Item", class_type("System.Guid")]], [["Item", class_type("System.Guid")]], [["Item", option_type(class_type("System.Guid"))]], [["Item", string_type]], [["Item", string_type]], [], [], [["Item", class_type("Browser.Types.File", undefined)]], [], [["Item", string_type]], [], []]);
}

export class TimelineModel extends Record {
    constructor(Project, Saving, Generating, Previewing, PreviewUrl, PreviewJobId, Error$, DragIndex, SelectedBlockId, VoiceoverDraft, ImagePromptDraft) {
        super();
        this.Project = Project;
        this.Saving = Saving;
        this.Generating = Generating;
        this.Previewing = Previewing;
        this.PreviewUrl = PreviewUrl;
        this.PreviewJobId = PreviewJobId;
        this.Error = Error$;
        this.DragIndex = DragIndex;
        this.SelectedBlockId = SelectedBlockId;
        this.VoiceoverDraft = VoiceoverDraft;
        this.ImagePromptDraft = ImagePromptDraft;
    }
}

export function TimelineModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.StoryboardTimeline.TimelineModel", [], TimelineModel, () => [["Project", Project_$reflection()], ["Saving", bool_type], ["Generating", bool_type], ["Previewing", bool_type], ["PreviewUrl", option_type(string_type)], ["PreviewJobId", option_type(class_type("System.Guid"))], ["Error", option_type(string_type)], ["DragIndex", option_type(int32_type)], ["SelectedBlockId", option_type(class_type("System.Guid"))], ["VoiceoverDraft", string_type], ["ImagePromptDraft", string_type]]);
}

export function StoryboardTimeline_init(project) {
    return new TimelineModel(project, false, false, false, undefined, undefined, undefined, undefined, undefined, "", "");
}

function StoryboardTimeline_sortedBlocks(project) {
    return sortBy((b) => b.Order, project.Blocks, {
        Compare: comparePrimitives,
    });
}

function StoryboardTimeline_reorder(project, blockId, direction) {
    const blocks = StoryboardTimeline_sortedBlocks(project);
    const idx = findIndex((b) => (b.Id === blockId), blocks) | 0;
    if (((idx + direction) < 0) ? true : ((idx + direction) >= length(blocks))) {
        return project;
    }
    else {
        const a = item(idx, blocks);
        const b_1 = item(idx + direction, blocks);
        return new Project(project.SchemaVersion, project.Id, project.Name, project.CreatedAt, project.UpdatedAt, project.Brief, project.SequencePreset, project.DefaultMockupDurationSec, project.RenderDefaults, project.StylePack, mapIndexed((i_1, b_2) => (new StoryboardBlock(b_2.Id, i_1, b_2.Title, b_2.Source, b_2.ThumbnailPath, b_2.ImagePrompt, b_2.VoiceoverScript, b_2.DirectorNotes, b_2.MoodTags, b_2.MockupDurationSec, b_2.BakeDurationSec, b_2.Transitions, b_2.Audio, b_2.Generation, b_2.Artifacts)), mapIndexed((i, block) => {
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

export function StoryboardTimeline_selectBlock(model, blockId) {
    if (blockId == null) {
        return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.PreviewUrl, model.PreviewJobId, model.Error, model.DragIndex, undefined, model.VoiceoverDraft, model.ImagePromptDraft);
    }
    else {
        const id = blockId;
        const matchValue = tryFind((b) => (b.Id === id), model.Project.Blocks);
        if (matchValue == null) {
            return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.PreviewUrl, model.PreviewJobId, model.Error, model.DragIndex, undefined, model.VoiceoverDraft, model.ImagePromptDraft);
        }
        else {
            const block = matchValue;
            return new TimelineModel(model.Project, model.Saving, model.Generating, model.Previewing, model.PreviewUrl, model.PreviewJobId, model.Error, model.DragIndex, id, defaultArg(block.VoiceoverScript, ""), defaultArg(block.ImagePrompt, ""));
        }
    }
}

export function StoryboardTimeline_view(model, dispatch) {
    let elems_15, elems_2, children, elems_1, elems, elems_14, elems_8;
    const blocks = StoryboardTimeline_sortedBlocks(model.Project);
    const selected = StoryboardTimeline_selectedBlock(model);
    return createElement("div", createObj(ofArray([["className", "flex flex-col h-full"], (elems_15 = [createElement("div", createObj(ofArray([["className", "flex items-center justify-between px-6 py-4 border-b border-surface-border"], (elems_2 = [(children = ofArray([createElement("h1", {
        className: "text-xl font-bold",
        children: model.Project.Name,
    }), createElement("p", {
        className: "text-sm text-slate-500",
        children: `${length(blocks)} blocks · default ${model.Project.DefaultMockupDurationSec}s mockup (3–4s)`,
    })]), createElement("div", {
        children: Interop_reactApi.Children.toArray(Array.from(children)),
    })), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems_1 = [createElement("label", createObj(ofArray([["className", "px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm"], (elems = [createElement("input", {
        type: "file",
        accept: "image/*",
        className: "hidden",
        onChange: (ev) => {
            const input = ev.target;
            const files = input.files;
            if (!(files == null) && (files.length > 0)) {
                dispatch(new TimelineMsg(0, [files[0]]));
            }
        },
    }), createElement("span", {
        children: "Import image",
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])]))), createElement("button", {
        className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
        disabled: model.Saving ? true : model.Previewing,
        children: model.Previewing ? "Rendering preview…" : "Refresh mockup preview",
        onClick: (_arg) => {
            dispatch(new TimelineMsg(9, []));
        },
    }), createElement("button", {
        className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
        disabled: model.Saving,
        children: model.Saving ? "Saving…" : "Save",
        onClick: (_arg_1) => {
            dispatch(new TimelineMsg(11, []));
        },
    }), createElement("button", {
        className: "px-3 py-2 rounded-md border border-surface-border text-sm",
        children: "Projects",
        onClick: (_arg_2) => {
            dispatch(new TimelineMsg(12, []));
        },
    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))), defaultArg(map((url) => {
        let elems_3;
        return createElement("div", createObj(ofArray([["className", "px-6 py-4 border-b border-surface-border bg-surface-raised"], (elems_3 = [createElement("h2", {
            className: "text-sm font-semibold mb-2",
            children: "Mockup preview (640p Ken Burns stitch)",
        }), createElement("video", {
            className: "w-full max-w-2xl rounded-lg border border-surface-border bg-black",
            controls: true,
            src: url,
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])));
    }, model.PreviewUrl), defaultOf()), defaultArg(map((e) => createElement("div", {
        className: "px-6 py-2 text-red-400 text-sm",
        children: e,
    }), model.Error), defaultOf()), createElement("div", createObj(ofArray([["className", "flex flex-1 min-h-0"], (elems_14 = [createElement("div", createObj(ofArray([["className", "flex-1 overflow-x-auto px-6 py-6"], (elems_8 = toList(delay(() => {
        let elems_7;
        return isEmpty(blocks) ? singleton(createElement("div", {
            className: "text-slate-500 text-center py-16 border border-dashed border-surface-border rounded-lg",
            children: "Import images to build your storyboard timeline.",
        })) : singleton(createElement("div", createObj(ofArray([["className", "flex gap-4 min-h-[180px]"], (elems_7 = mapIndexed((i, block) => {
            let elems_6, elems_5, elems_4;
            return createElement("div", createObj(ofArray([["key", block.Id], ["className", "w-44 shrink-0 rounded-lg border overflow-hidden cursor-pointer " + (defaultArg(map((y) => (block.Id === y), model.SelectedBlockId), false) ? "border-accent bg-surface-raised ring-1 ring-accent" : "border-surface-border bg-surface-raised hover:border-accent/60")], ["onClick", (_arg_3) => {
                dispatch(new TimelineMsg(3, [block.Id]));
            }], (elems_6 = [createElement("div", {
                className: "aspect-video bg-surface flex items-center justify-center text-xs text-slate-600 px-2 text-center",
                children: defaultArg(block.Title, equals(block.Source, new BlockSource(1, [])) ? "Generated" : "Block"),
            }), createElement("div", createObj(ofArray([["className", "p-2 text-xs space-y-2"], (elems_5 = [createElement("div", {
                className: "text-slate-400",
                children: `#${i + 1} · ${ProjectModule_effectiveMockupDuration(model.Project, block)}s`,
            }), createElement("div", createObj(ofArray([["className", "flex gap-1"], (elems_4 = [createElement("button", {
                className: "flex-1 py-1 rounded border border-surface-border hover:border-accent",
                children: "↑",
                onClick: (ev_1) => {
                    ev_1.stopPropagation();
                    dispatch(new TimelineMsg(1, [block.Id]));
                },
            }), createElement("button", {
                className: "flex-1 py-1 rounded border border-surface-border hover:border-accent",
                children: "↓",
                onClick: (ev_2) => {
                    ev_2.stopPropagation();
                    dispatch(new TimelineMsg(2, [block.Id]));
                },
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_6))])])));
        }, blocks), ["children", Interop_reactApi.Children.toArray(Array.from(elems_7))])]))));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_8))])]))), defaultArg(map((block_1) => {
        let elems_13, elems_12, elems_9, elems_10, value_148, elems_11, matchValue, a_1, value_165;
        return createElement("aside", createObj(ofArray([["className", "w-80 border-l border-surface-border bg-surface-raised flex flex-col shrink-0"], (elems_13 = [createElement("div", {
            className: "px-4 py-3 border-b border-surface-border font-semibold text-sm",
            children: defaultArg(block_1.Title, "Block inspector"),
        }), createElement("div", createObj(ofArray([["className", "p-4 space-y-4 text-sm overflow-y-auto flex-1"], (elems_12 = [createElement("div", createObj(singleton_1((elems_9 = [createElement("label", {
            className: "block text-xs text-slate-500 mb-1",
            children: "Image prompt",
        }), createElement("textarea", {
            className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[60px]",
            value: model.ImagePromptDraft,
            onChange: (ev_3) => {
                dispatch(new TimelineMsg(5, [ev_3.target.value]));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_9))])))), createElement("button", {
            className: "w-full px-3 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium disabled:opacity-50",
            disabled: model.Generating,
            children: model.Generating ? "Generating…" : "Generate thumbnail",
            onClick: (_arg_4) => {
                dispatch(new TimelineMsg(7, []));
            },
        }), createElement("div", createObj(singleton_1((elems_10 = [createElement("label", {
            className: "block text-xs text-slate-500 mb-1",
            children: "Voiceover script",
        }), createElement("textarea", {
            className: "w-full rounded-md bg-surface border border-surface-border px-2 py-1 text-sm min-h-[80px]",
            placeholder: "Narration for this block…",
            value: model.VoiceoverDraft,
            onChange: (ev_4) => {
                dispatch(new TimelineMsg(4, [ev_4.target.value]));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_10))])))), createElement("label", createObj(ofArray([(value_148 = "block px-3 py-2 rounded-md border border-surface-border cursor-pointer hover:border-accent text-sm text-center", ["className", value_148]), (elems_11 = [createElement("input", {
            type: "file",
            accept: "audio/*",
            className: "hidden",
            onChange: (ev_5) => {
                const input_1 = ev_5.target;
                const files_1 = input_1.files;
                if (!(files_1 == null) && (files_1.length > 0)) {
                    dispatch(new TimelineMsg(8, [files_1[0]]));
                }
            },
        }), createElement("span", {
            children: (matchValue = block_1.Audio, (matchValue != null) ? ((matchValue.Path != null) ? ((a_1 = matchValue, "Replace audio")) : "Import audio") : "Import audio"),
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_11))])]))), defaultArg(map((p) => createElement("p", {
            className: "text-xs text-slate-500 truncate",
            children: `Audio: ${p}`,
        }), bind((a_2) => a_2.Path, block_1.Audio)), defaultOf()), createElement("button", createObj(ofArray([(value_165 = "w-full px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50", ["className", value_165]), ["disabled", model.Saving], ["children", model.Saving ? "Saving…" : "Save block fields"], ["onClick", (_arg_5) => {
            dispatch(new TimelineMsg(6, []));
        }]])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_12))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_13))])])));
    }, selected), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_14))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_15))])])));
}

export function StoryboardTimeline_moveUp(model, blockId) {
    return new TimelineModel(StoryboardTimeline_reorder(model.Project, blockId, -1), model.Saving, model.Generating, model.Previewing, model.PreviewUrl, model.PreviewJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft);
}

export function StoryboardTimeline_moveDown(model, blockId) {
    return new TimelineModel(StoryboardTimeline_reorder(model.Project, blockId, 1), model.Saving, model.Generating, model.Previewing, model.PreviewUrl, model.PreviewJobId, model.Error, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft);
}

export function StoryboardTimeline_withProject(project, model) {
    return StoryboardTimeline_selectBlock(new TimelineModel(project, false, false, model.Previewing, model.PreviewUrl, model.PreviewJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft), model.SelectedBlockId);
}

export function StoryboardTimeline_withPreviewUrl(url, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, false, url, model.PreviewJobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft);
}

export function StoryboardTimeline_withPreviewStarted(jobId, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, true, model.PreviewUrl, jobId, undefined, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft);
}

export function StoryboardTimeline_withPreviewError(err, model) {
    return new TimelineModel(model.Project, model.Saving, model.Generating, false, model.PreviewUrl, model.PreviewJobId, err, model.DragIndex, model.SelectedBlockId, model.VoiceoverDraft, model.ImagePromptDraft);
}

