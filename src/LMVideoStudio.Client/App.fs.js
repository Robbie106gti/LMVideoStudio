import { Record, Union } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { ProjectHub_view, ProjectHubModel, ProjectHubMsg, ProjectHub_init, ProjectHubMsg_$reflection, ProjectHubModel_$reflection } from "./Views/ProjectHub.fs.js";
import { StoryboardTimeline_view, StoryboardTimeline_withPreviewUrl, StoryboardTimeline_withPreviewStarted, StoryboardTimeline_withProject, StoryboardTimeline_withPreviewError, StoryboardTimeline_selectBlock, TimelineModel, StoryboardTimeline_moveDown, StoryboardTimeline_moveUp, StoryboardTimeline_init, TimelineMsg, TimelineMsg_$reflection, TimelineModel_$reflection } from "./Views/StoryboardTimeline.fs.js";
import { Settings_view, SettingsModel, Settings_init, SettingsMsg_$reflection, SettingsModel_$reflection } from "./Views/Settings.fs.js";
import { string_type, list_type, record_type, union_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ShellMsg, Shell_chrome, ShellTab, ShellModel, Shell_init, ShellMsg_$reflection, ShellModel_$reflection } from "./Views/Shell.fs.js";
import { subscribeEvents, checkForUpdates, runConflictScan, runRepair, runBootstrap, refreshMockupPreview, importBlockAudio, generateBlockThumbnail, updateBlock, importBlockImage, reorderBlocks, getProject, createProject, previewMediaUrl, getMockupPreviewStatus, getSystemStatus, getProjects, SystemStatusDto_$reflection, PreviewStartDto_$reflection, ProjectSummaryDto_$reflection } from "./Api.fs.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";
import { Project_$reflection } from "../LMVideoStudio.Domain/Types.fs.js";
import { ActivityPanelState, init as init_1 } from "./ActivityPanel.fs.js";
import { Cmd_none, Cmd_batch } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { sortBy, map, cons, truncate, ofArray, singleton } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { Cmd_OfAsyncWith_perform } from "./fable_modules/Fable.Elmish.5.0.2/./cmd.fs.js";
import { AsyncHelpers_start } from "./fable_modules/Fable.Elmish.5.0.2/./prelude.fs.js";
import { utcNow, toUnixTimeMilliseconds } from "./fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { singleton as singleton_1 } from "./fable_modules/fable-library-js.4.27.0/AsyncBuilder.js";
import { comparePrimitives } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { isNullOrWhiteSpace } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { ProgramModule_mkProgram, ProgramModule_withSubscription, ProgramModule_run } from "./fable_modules/Fable.Elmish.5.0.2/program.fs.js";
import { Program_withReactBatched } from "./fable_modules/Fable.Elmish.React.5.6.0/react.fs.js";

export class AppPage extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["HubPage", "TimelinePage", "SettingsPage"];
    }
}

export function AppPage_$reflection() {
    return union_type("LMVideoStudio.Client.App.AppPage", [], AppPage, () => [[["Item", ProjectHubModel_$reflection()]], [["Item", TimelineModel_$reflection()]], [["Item", SettingsModel_$reflection()]]]);
}

export class AppModel extends Record {
    constructor(Shell, Page) {
        super();
        this.Shell = Shell;
        this.Page = Page;
    }
}

export function AppModel_$reflection() {
    return record_type("LMVideoStudio.Client.App.AppModel", [], AppModel, () => [["Shell", ShellModel_$reflection()], ["Page", AppPage_$reflection()]]);
}

export class AppMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ShellMsg", "HubMsg", "TimelineMsg", "SettingsMsg", "ProjectsLoaded", "ProjectCreated", "ProjectOpened", "ProjectSaved", "ImportDone", "BlockFieldsSaved", "GenerateDone", "AudioImportDone", "PreviewStarted", "PreviewReady", "SettingsStatus", "SettingsActionDone", "InitSubscriptions"];
    }
}

export function AppMsg_$reflection() {
    return union_type("LMVideoStudio.Client.App.AppMsg", [], AppMsg, () => [[["Item", ShellMsg_$reflection()]], [["Item", ProjectHubMsg_$reflection()]], [["Item", TimelineMsg_$reflection()]], [["Item", SettingsMsg_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(ProjectSummaryDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(ProjectSummaryDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [PreviewStartDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", PreviewStartDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [SystemStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", SystemStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], []]);
}

export function init() {
    return [new AppModel(Shell_init(init_1()), new AppPage(0, [ProjectHub_init()])), Cmd_batch(ofArray([singleton((dispatch) => {
        dispatch(new AppMsg(16, []));
    }), Cmd_OfAsyncWith_perform((x) => {
        AsyncHelpers_start(x);
    }, getProjects, undefined, (Item) => (new AppMsg(4, [Item]))), Cmd_OfAsyncWith_perform((x_1) => {
        AsyncHelpers_start(x_1);
    }, getSystemStatus, undefined, (Item_1) => (new AppMsg(14, [Item_1])))]))];
}

export function update(msg, model) {
    let bind$0040_2, bind$0040_4, bind$0040_6, bind$0040_7, bind$0040_8, bind$0040_5, bind$0040, matchValue, t, matchValue_1, jobId_2, bust, jobId_3, bind$0040_9, bind$0040_10, bind$0040_11, bind$0040_12, bind$0040_13, bind$0040_14;
    switch (msg.tag) {
        case 0:
            switch (msg.fields[0].tag) {
                case 2:
                    return [new AppModel((bind$0040_2 = model.Shell, new ShellModel(bind$0040_2.Tab, new ActivityPanelState(model.Shell.Activity.Events, true), bind$0040_2.SystemStatus)), model.Page), Cmd_none()];
                case 3:
                    return [new AppModel((bind$0040_4 = model.Shell, new ShellModel(bind$0040_4.Tab, bind$0040_4.Activity, msg.fields[0].fields[0])), model.Page), Cmd_none()];
                case 0:
                    switch (msg.fields[0].fields[0].tag) {
                        case 1:
                            if (model.Page.tag === 1) {
                                return [new AppModel((bind$0040_6 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_6.Activity, bind$0040_6.SystemStatus)), model.Page), Cmd_none()];
                            }
                            else {
                                return [new AppModel((bind$0040_7 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_7.Activity, bind$0040_7.SystemStatus)), model.Page), singleton((dispatch_1) => {
                                    dispatch_1(new AppMsg(1, [new ProjectHubMsg(3, [])]));
                                })];
                            }
                        case 2:
                            return [new AppModel((bind$0040_8 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_8.Activity, bind$0040_8.SystemStatus)), new AppPage(2, [Settings_init()])), Cmd_OfAsyncWith_perform((x_2) => {
                                AsyncHelpers_start(x_2);
                            }, getSystemStatus, undefined, (Item_2) => (new AppMsg(14, [Item_2])))];
                        default:
                            return [new AppModel((bind$0040_5 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_5.Activity, bind$0040_5.SystemStatus)), new AppPage(0, [ProjectHub_init()])), Cmd_OfAsyncWith_perform((x_1) => {
                                AsyncHelpers_start(x_1);
                            }, getProjects, undefined, (Item_1) => (new AppMsg(4, [Item_1])))];
                    }
                default:
                    return [new AppModel((bind$0040 = model.Shell, new ShellModel(bind$0040.Tab, new ActivityPanelState(truncate(50, cons(msg.fields[0].fields[0], model.Shell.Activity.Events)), model.Shell.Activity.Connected), bind$0040.SystemStatus)), model.Page), (matchValue = model.Page, (matchValue.tag === 1) ? ((t = matchValue.fields[0], (matchValue_1 = t.PreviewJobId, (matchValue_1 != null) ? ((((matchValue_1 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_2 = matchValue_1, (bust = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x) => {
                        AsyncHelpers_start(x);
                    }, () => singleton_1.Delay(() => singleton_1.Bind(getMockupPreviewStatus(t.Project.Id), (_arg) => {
                        const status = _arg;
                        return singleton_1.Return((status.tag === 1) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust) : previewMediaUrl(t.Project.Id, status.fields[0].PreviewPath, bust));
                    })), undefined, (Item) => (new AppMsg(13, [Item])))))) : ((((matchValue_1 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_3 = matchValue_1, singleton((dispatch) => {
                        dispatch(new AppMsg(2, [new TimelineMsg(10, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none()))) : Cmd_none())];
            }
        case 4:
            if (msg.fields[0].tag === 1) {
                const matchValue_4 = model.Page;
                if (matchValue_4.tag === 0) {
                    const hub_1 = matchValue_4.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_1.Summaries, hub_1.NewName, false, msg.fields[0].fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_3 = model.Page;
                if (matchValue_3.tag === 0) {
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(msg.fields[0].fields[0], matchValue_3.fields[0].NewName, false, undefined)])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 1:
            switch (msg.fields[0].tag) {
                case 0: {
                    const matchValue_6 = model.Page;
                    if (matchValue_6.tag === 0) {
                        const hub_3 = matchValue_6.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_3.Summaries, msg.fields[0].fields[0], hub_3.Loading, hub_3.Error)])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_7 = model.Page;
                    if (matchValue_7.tag === 0) {
                        const hub_4 = matchValue_7.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_4.Summaries, hub_4.NewName, true, hub_4.Error)])), Cmd_OfAsyncWith_perform((x_4) => {
                            AsyncHelpers_start(x_4);
                        }, () => createProject(hub_4.NewName), undefined, (Item_4) => (new AppMsg(5, [Item_4])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_9 = model.Page;
                    if (matchValue_9.tag === 0) {
                        const hub_6 = matchValue_9.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_6.Summaries, hub_6.NewName, true, hub_6.Error)])), Cmd_OfAsyncWith_perform((x_5) => {
                            AsyncHelpers_start(x_5);
                        }, () => getProject(msg.fields[0].fields[0]), undefined, (Item_5) => (new AppMsg(6, [Item_5])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                default: {
                    const matchValue_5 = model.Page;
                    if (matchValue_5.tag === 0) {
                        const hub_2 = matchValue_5.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_2.Summaries, hub_2.NewName, true, hub_2.Error)])), Cmd_OfAsyncWith_perform((x_3) => {
                            AsyncHelpers_start(x_3);
                        }, getProjects, undefined, (Item_3) => (new AppMsg(4, [Item_3])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
            }
        case 5:
            if (msg.fields[0].tag === 1) {
                const matchValue_8 = model.Page;
                if (matchValue_8.tag === 0) {
                    const hub_5 = matchValue_8.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_5.Summaries, hub_5.NewName, false, msg.fields[0].fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_9 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_9.Activity, bind$0040_9.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])])), Cmd_none()];
            }
        case 6:
            if (msg.fields[0].tag === 1) {
                const matchValue_10 = model.Page;
                if (matchValue_10.tag === 0) {
                    const hub_7 = matchValue_10.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_7.Summaries, hub_7.NewName, false, msg.fields[0].fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_10 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_10.Activity, bind$0040_10.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])])), Cmd_none()];
            }
        case 2:
            switch (msg.fields[0].tag) {
                case 1: {
                    const matchValue_11 = model.Page;
                    if (matchValue_11.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveUp(matchValue_11.fields[0], msg.fields[0].fields[0])])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_12 = model.Page;
                    if (matchValue_12.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveDown(matchValue_12.fields[0], msg.fields[0].fields[0])])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 11: {
                    const matchValue_13 = model.Page;
                    if (matchValue_13.tag === 1) {
                        const t_3 = matchValue_13.fields[0];
                        const ids = map((b_1) => b_1.Id, sortBy((b) => b.Order, t_3.Project.Blocks, {
                            Compare: comparePrimitives,
                        }));
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_3.Project, true, t_3.Generating, t_3.Previewing, t_3.PreviewUrl, t_3.PreviewJobId, t_3.Error, t_3.DragIndex, t_3.SelectedBlockId, t_3.VoiceoverDraft, t_3.ImagePromptDraft)])), Cmd_OfAsyncWith_perform((x_8) => {
                            AsyncHelpers_start(x_8);
                        }, () => reorderBlocks(t_3.Project.Id, ids), undefined, (Item_7) => (new AppMsg(7, [Item_7])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 0: {
                    const matchValue_16 = model.Page;
                    if (matchValue_16.tag === 1) {
                        const t_5 = matchValue_16.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_5.Project, true, t_5.Generating, t_5.Previewing, t_5.PreviewUrl, t_5.PreviewJobId, t_5.Error, t_5.DragIndex, t_5.SelectedBlockId, t_5.VoiceoverDraft, t_5.ImagePromptDraft)])), Cmd_OfAsyncWith_perform((x_9) => {
                            AsyncHelpers_start(x_9);
                        }, () => importBlockImage(t_5.Project.Id, msg.fields[0].fields[0]), undefined, (Item_8) => (new AppMsg(8, [Item_8])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_19 = model.Page;
                    if (matchValue_19.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_selectBlock(matchValue_19.fields[0], msg.fields[0].fields[0])])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_20 = model.Page;
                    if (matchValue_20.tag === 1) {
                        const t_8 = matchValue_20.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_8.Project, t_8.Saving, t_8.Generating, t_8.Previewing, t_8.PreviewUrl, t_8.PreviewJobId, t_8.Error, t_8.DragIndex, t_8.SelectedBlockId, msg.fields[0].fields[0], t_8.ImagePromptDraft)])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_21 = model.Page;
                    if (matchValue_21.tag === 1) {
                        const t_9 = matchValue_21.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_9.Project, t_9.Saving, t_9.Generating, t_9.Previewing, t_9.PreviewUrl, t_9.PreviewJobId, t_9.Error, t_9.DragIndex, t_9.SelectedBlockId, t_9.VoiceoverDraft, msg.fields[0].fields[0])])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_22 = model.Page;
                    if (matchValue_22.tag === 1) {
                        const t_10 = matchValue_22.fields[0];
                        const matchValue_23 = t_10.SelectedBlockId;
                        if (matchValue_23 != null) {
                            const blockId = matchValue_23;
                            const prompt = isNullOrWhiteSpace(t_10.ImagePromptDraft) ? undefined : t_10.ImagePromptDraft;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_10.Project, true, t_10.Generating, t_10.Previewing, t_10.PreviewUrl, t_10.PreviewJobId, t_10.Error, t_10.DragIndex, t_10.SelectedBlockId, t_10.VoiceoverDraft, t_10.ImagePromptDraft)])), Cmd_OfAsyncWith_perform((x_10) => {
                                AsyncHelpers_start(x_10);
                            }, () => updateBlock(t_10.Project.Id, blockId, t_10.VoiceoverDraft, prompt), undefined, (Item_9) => (new AppMsg(9, [Item_9])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    const matchValue_26 = model.Page;
                    if (matchValue_26.tag === 1) {
                        const t_13 = matchValue_26.fields[0];
                        const matchValue_27 = t_13.SelectedBlockId;
                        if (matchValue_27 != null) {
                            const blockId_1 = matchValue_27;
                            const prompt_1 = isNullOrWhiteSpace(t_13.ImagePromptDraft) ? undefined : t_13.ImagePromptDraft;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_13.Project, t_13.Saving, true, t_13.Previewing, t_13.PreviewUrl, t_13.PreviewJobId, undefined, t_13.DragIndex, t_13.SelectedBlockId, t_13.VoiceoverDraft, t_13.ImagePromptDraft)])), Cmd_OfAsyncWith_perform((x_11) => {
                                AsyncHelpers_start(x_11);
                            }, () => generateBlockThumbnail(t_13.Project.Id, blockId_1, prompt_1), undefined, (Item_10) => (new AppMsg(10, [Item_10])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_30 = model.Page;
                    if (matchValue_30.tag === 1) {
                        const t_16 = matchValue_30.fields[0];
                        const matchValue_31 = t_16.SelectedBlockId;
                        if (matchValue_31 != null) {
                            const blockId_2 = matchValue_31;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_16.Project, true, t_16.Generating, t_16.Previewing, t_16.PreviewUrl, t_16.PreviewJobId, t_16.Error, t_16.DragIndex, t_16.SelectedBlockId, t_16.VoiceoverDraft, t_16.ImagePromptDraft)])), Cmd_OfAsyncWith_perform((x_12) => {
                                AsyncHelpers_start(x_12);
                            }, () => importBlockAudio(t_16.Project.Id, blockId_2, msg.fields[0].fields[0]), undefined, (Item_11) => (new AppMsg(11, [Item_11])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_34 = model.Page;
                    if (matchValue_34.tag === 1) {
                        const t_19 = matchValue_34.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_19.Project, t_19.Saving, t_19.Generating, true, t_19.PreviewUrl, t_19.PreviewJobId, undefined, t_19.DragIndex, t_19.SelectedBlockId, t_19.VoiceoverDraft, t_19.ImagePromptDraft)])), Cmd_OfAsyncWith_perform((x_13) => {
                            AsyncHelpers_start(x_13);
                        }, () => refreshMockupPreview(t_19.Project.Id), undefined, (Item_12) => (new AppMsg(12, [Item_12])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 10: {
                    const matchValue_38 = model.Page;
                    if (matchValue_38.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_38.fields[0])])), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                default:
                    return [new AppModel((bind$0040_11 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_11.Activity, bind$0040_11.SystemStatus)), new AppPage(0, [ProjectHub_init()])), Cmd_OfAsyncWith_perform((x_6) => {
                        AsyncHelpers_start(x_6);
                    }, getProjects, undefined, (Item_6) => (new AppMsg(4, [Item_6])))];
            }
        case 7:
            if (msg.fields[0].tag === 1) {
                const matchValue_15 = model.Page;
                if (matchValue_15.tag === 1) {
                    const t_4 = matchValue_15.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_4.Project, false, t_4.Generating, t_4.Previewing, t_4.PreviewUrl, t_4.PreviewJobId, msg.fields[0].fields[0], t_4.DragIndex, t_4.SelectedBlockId, t_4.VoiceoverDraft, t_4.ImagePromptDraft)])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_12 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_12.Project, false, bind$0040_12.Generating, bind$0040_12.Previewing, bind$0040_12.PreviewUrl, bind$0040_12.PreviewJobId, undefined, bind$0040_12.DragIndex, bind$0040_12.SelectedBlockId, bind$0040_12.VoiceoverDraft, bind$0040_12.ImagePromptDraft))])), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 8:
            if (msg.fields[0].tag === 1) {
                const matchValue_18 = model.Page;
                if (matchValue_18.tag === 1) {
                    const t_6 = matchValue_18.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_6.Project, false, t_6.Generating, t_6.Previewing, t_6.PreviewUrl, t_6.PreviewJobId, msg.fields[0].fields[0], t_6.DragIndex, t_6.SelectedBlockId, t_6.VoiceoverDraft, t_6.ImagePromptDraft)])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_13 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_13.Project, false, bind$0040_13.Generating, bind$0040_13.Previewing, bind$0040_13.PreviewUrl, bind$0040_13.PreviewJobId, undefined, bind$0040_13.DragIndex, bind$0040_13.SelectedBlockId, bind$0040_13.VoiceoverDraft, bind$0040_13.ImagePromptDraft))])), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 9:
            if (msg.fields[0].tag === 1) {
                const matchValue_25 = model.Page;
                if (matchValue_25.tag === 1) {
                    const t_12 = matchValue_25.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_12.Project, false, t_12.Generating, t_12.Previewing, t_12.PreviewUrl, t_12.PreviewJobId, msg.fields[0].fields[0], t_12.DragIndex, t_12.SelectedBlockId, t_12.VoiceoverDraft, t_12.ImagePromptDraft)])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_24 = model.Page;
                if (matchValue_24.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_24.fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 10:
            if (msg.fields[0].tag === 1) {
                const matchValue_29 = model.Page;
                if (matchValue_29.tag === 1) {
                    const t_15 = matchValue_29.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_15.Project, t_15.Saving, false, t_15.Previewing, t_15.PreviewUrl, t_15.PreviewJobId, msg.fields[0].fields[0], t_15.DragIndex, t_15.SelectedBlockId, t_15.VoiceoverDraft, t_15.ImagePromptDraft)])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_28 = model.Page;
                if (matchValue_28.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_28.fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 11:
            if (msg.fields[0].tag === 1) {
                const matchValue_33 = model.Page;
                if (matchValue_33.tag === 1) {
                    const t_18 = matchValue_33.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_18.Project, false, t_18.Generating, t_18.Previewing, t_18.PreviewUrl, t_18.PreviewJobId, msg.fields[0].fields[0], t_18.DragIndex, t_18.SelectedBlockId, t_18.VoiceoverDraft, t_18.ImagePromptDraft)])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_32 = model.Page;
                if (matchValue_32.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_32.fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 12:
            if (msg.fields[0].tag === 1) {
                const matchValue_36 = model.Page;
                if (matchValue_36.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_36.fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_35 = model.Page;
                if (matchValue_35.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewStarted(msg.fields[0].fields[0].JobId, matchValue_35.fields[0])])), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 13: {
            const matchValue_37 = model.Page;
            if (matchValue_37.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewUrl(msg.fields[0], matchValue_37.fields[0])])), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 14:
            if (msg.fields[0].tag === 1) {
                return [model, Cmd_none()];
            }
            else {
                const model$0027_1 = new AppModel((bind$0040_14 = model.Shell, new ShellModel(bind$0040_14.Tab, bind$0040_14.Activity, msg.fields[0].fields[0])), model.Page);
                const matchValue_39 = model.Page;
                if (matchValue_39.tag === 2) {
                    const st = matchValue_39.fields[0];
                    return [new AppModel(model$0027_1.Shell, new AppPage(2, [new SettingsModel(msg.fields[0].fields[0], st.Message, st.CheckingUpdates)])), Cmd_none()];
                }
                else {
                    return [model$0027_1, Cmd_none()];
                }
            }
        case 3:
            switch (msg.fields[0].tag) {
                case 1:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_15) => {
                            AsyncHelpers_start(x_15);
                        }, runBootstrap, undefined, () => (new AppMsg(15, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_16) => {
                            AsyncHelpers_start(x_16);
                        }, getSystemStatus, undefined, (Item_13) => (new AppMsg(14, [Item_13])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                case 3:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_17) => {
                            AsyncHelpers_start(x_17);
                        }, runRepair, undefined, () => (new AppMsg(15, ["Repair started"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                case 2:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_18) => {
                            AsyncHelpers_start(x_18);
                        }, runConflictScan, undefined, () => (new AppMsg(15, ["Conflict scan complete"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                default: {
                    const matchValue_40 = model.Page;
                    if (matchValue_40.tag === 2) {
                        const st_1 = matchValue_40.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_1.Status, st_1.Message, true)])), Cmd_OfAsyncWith_perform((x_14) => {
                            AsyncHelpers_start(x_14);
                        }, checkForUpdates, undefined, (r) => (new AppMsg(15, [(r.tag === 1) ? r.fields[0] : r.fields[0]])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
            }
        case 15: {
            const matchValue_44 = model.Page;
            if (matchValue_44.tag === 2) {
                return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(matchValue_44.fields[0].Status, msg.fields[0], false)])), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        default:
            return [model, Cmd_none()];
    }
}

export function view(model, dispatch) {
    let matchValue;
    return Shell_chrome(model.Shell.Tab, model.Shell.Activity, model.Shell.SystemStatus, (matchValue = model.Page, (matchValue.tag === 1) ? StoryboardTimeline_view(matchValue.fields[0], (arg_2) => {
        dispatch(new AppMsg(2, [arg_2]));
    }) : ((matchValue.tag === 2) ? Settings_view(matchValue.fields[0], (arg_3) => {
        dispatch(new AppMsg(3, [arg_3]));
    }) : ProjectHub_view(matchValue.fields[0], (arg_1) => {
        dispatch(new AppMsg(1, [arg_1]));
    }))), (arg) => {
        dispatch(new AppMsg(0, [arg]));
    });
}

export function App_mount() {
    ProgramModule_run(ProgramModule_withSubscription((_arg) => singleton([singleton("sse"), (dispatch_1) => {
        subscribeEvents((e) => {
            dispatch_1(new AppMsg(0, [new ShellMsg(1, [e])]));
        });
        dispatch_1(new AppMsg(0, [new ShellMsg(2, [])]));
        return {
            Dispose() {
            },
        };
    }]), Program_withReactBatched("root", ProgramModule_mkProgram(init, update, view))));
}

