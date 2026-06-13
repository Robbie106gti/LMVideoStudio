import { FSharpRef, Record, Union } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { ProjectHub_view, ProjectHubModel, ProjectHubMsg, ProjectHub_init, ProjectHubMsg_$reflection, ProjectHubModel_$reflection } from "./Views/ProjectHub.js";
import { StoryboardTimeline_view, StoryboardTimeline_withPreviewUrl, StoryboardTimeline_withPreviewStarted, StoryboardTimeline_withBakeUrl, StoryboardTimeline_withBakeStarted, StoryboardTimeline_withProject, StoryboardTimeline_withPreviewError, StoryboardTimeline_selectBlock, StoryboardTimeline_withBakeError, StoryboardTimeline_reorderByDrag, StoryboardTimeline_setDragIndex, StoryboardTimeline_moveDown, StoryboardTimeline_moveUp, StoryboardTimeline_init, TimelineModel, TimelineMsg, TimelineMsg_$reflection, TimelineModel_$reflection } from "./Views/StoryboardTimeline.js";
import { Settings_view, Settings_markBootstrapStarted, SettingsModel, Settings_init, SettingsMsg_$reflection, SettingsModel_$reflection } from "./Views/Settings.js";
import { unit_type, list_type, record_type, class_type, option_type, string_type, union_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ShellMsg, Shell_chrome, ShellTab, ShellModel, Shell_init, ShellMsg_$reflection, ShellModel_$reflection } from "./Views/Shell.js";
import { SetupWizard_view, SetupWizard_next, SetupWizard_markComplete, SetupWizardModel, SetupWizard_back, SetupWizard_init, SetupWizard_isComplete, SetupWizardMsg_$reflection, SetupWizardModel_$reflection } from "./Views/SetupWizard.js";
import { subscribeEvents, runConflictScan, runRepair, runBootstrap, syncModels, checkForUpdates, refreshMockupPreview, importBlockAudio, generateBlockThumbnail, updateBlock, importBlockImage, startBake, importStylePackLogo, exportSharePack, selectBlockThumbnail, reorderBlocks, deleteProject, getProject, applyOutline, generateOutline, createProject, getMockupPreviewStatus, previewMediaUrl, getModelStatus, getSystemStatus, getProjects, waitForHostHealth, OutlineBlockDto_$reflection, ModelStatusDto_$reflection, SystemStatusDto_$reflection, PreviewStartDto_$reflection, ProjectSummaryDto_$reflection } from "./Api.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";
import { Project_$reflection } from "./LMVideoStudio.Domain/Types.js";
import { mergeEvent, ActivityPanelState, init as init_1 } from "./ActivityPanel.js";
import { Cmd_none, Cmd_batch } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { sortBy, map, ofArray, singleton } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { Cmd_OfAsyncWith_perform } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { AsyncHelpers_start } from "./fable_modules/Fable.Elmish.5.0.2/prelude.fs.js";
import { utcNow, toUnixTimeMilliseconds } from "./fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { singleton as singleton_1 } from "./fable_modules/fable-library-js.4.27.0/AsyncBuilder.js";
import { createObj, comparePrimitives, equals } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { filter } from "./fable_modules/fable-library-js.4.27.0/Option.js";
import { max } from "./fable_modules/fable-library-js.4.27.0/Double.js";
import { isNullOrWhiteSpace } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { tryParse } from "./fable_modules/fable-library-js.4.27.0/Guid.js";
import { createElement } from "react";
import { Interop_reactApi } from "./fable_modules/Feliz.2.6.0/Interop.fs.js";
import { defaultOf } from "./fable_modules/fable-library-js.4.27.0/Util.js";
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

export class HostStartup extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Starting", "Ready", "Failed"];
    }
}

export function HostStartup_$reflection() {
    return union_type("LMVideoStudio.Client.App.HostStartup", [], HostStartup, () => [[], [], [["Item", string_type]]]);
}

export class AppModel extends Record {
    constructor(Shell, Page, SetupWizard, OpenProjectId, HostStartup) {
        super();
        this.Shell = Shell;
        this.Page = Page;
        this.SetupWizard = SetupWizard;
        this.OpenProjectId = OpenProjectId;
        this.HostStartup = HostStartup;
    }
}

export function AppModel_$reflection() {
    return record_type("LMVideoStudio.Client.App.AppModel", [], AppModel, () => [["Shell", ShellModel_$reflection()], ["Page", AppPage_$reflection()], ["SetupWizard", option_type(SetupWizardModel_$reflection())], ["OpenProjectId", option_type(class_type("System.Guid"))], ["HostStartup", HostStartup_$reflection()]]);
}

export class AppMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ShellMsg", "HubMsg", "TimelineMsg", "SettingsMsg", "ProjectsLoaded", "ProjectCreated", "ProjectOpened", "ProjectSaved", "ImportDone", "BlockFieldsSaved", "GenerateDone", "AudioImportDone", "PreviewStarted", "PreviewReady", "BakeReady", "ExistingPreviewMissing", "SettingsStatus", "ModelStatusLoaded", "SettingsActionDone", "OutlineGenerated", "OutlineApplied", "StylePackImported", "BakeStarted", "SharePackDone", "VariantSelected", "ProjectDeleted", "SetupWizardMsg", "InitSubscriptions", "HostReady", "RetryHostStartup"];
    }
}

export function AppMsg_$reflection() {
    return union_type("LMVideoStudio.Client.App.AppMsg", [], AppMsg, () => [[["Item", ShellMsg_$reflection()]], [["Item", ProjectHubMsg_$reflection()]], [["Item", TimelineMsg_$reflection()]], [["Item", SettingsMsg_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(ProjectSummaryDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(ProjectSummaryDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [PreviewStartDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", PreviewStartDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", string_type]], [], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [SystemStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", SystemStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [ModelStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", ModelStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(OutlineBlockDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(OutlineBlockDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [class_type("System.Guid"), string_type], FSharpResult$2, () => [[["ResultValue", class_type("System.Guid")]], [["ErrorValue", string_type]]])]], [["Item", SetupWizardMsg_$reflection()]], [], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [unit_type, string_type], FSharpResult$2, () => [[["ResultValue", unit_type]], [["ErrorValue", string_type]]])]], []]);
}

export function init() {
    return [new AppModel(Shell_init(init_1()), new AppPage(0, [ProjectHub_init()]), SetupWizard_isComplete() ? undefined : SetupWizard_init(), undefined, new HostStartup(0, [])), Cmd_batch(ofArray([singleton((dispatch) => {
        dispatch(new AppMsg(27, []));
    }), Cmd_OfAsyncWith_perform((x) => {
        AsyncHelpers_start(x);
    }, waitForHostHealth, undefined, (Item) => (new AppMsg(28, [Item])))]))];
}

export function update(msg, model) {
    let bind$0040_2, bind$0040_4, bind$0040_6, bind$0040_7, bind$0040_8, bind$0040_5, bind$0040, matchValue, t, bakeCmd, matchValue_1, jobId_2, bust, jobId_3, matchValue_2, jobId_6, bust_1, jobId_7, matchValue_6, bind$0040_9, bind$0040_10, bind$0040_11, matchValue_26, bind$0040_12, bind$0040_13, bind$0040_14, bind$0040_15, bind$0040_16, bind$0040_17, matchValue_87, st_8, bind$0040_18;
    switch (msg.tag) {
        case 28:
            if (msg.fields[0].tag === 1) {
                return [new AppModel(model.Shell, model.Page, model.SetupWizard, model.OpenProjectId, new HostStartup(2, [msg.fields[0].fields[0]])), Cmd_none()];
            }
            else {
                return [new AppModel(model.Shell, model.Page, model.SetupWizard, model.OpenProjectId, new HostStartup(1, [])), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x) => {
                    AsyncHelpers_start(x);
                }, getProjects, undefined, (Item) => (new AppMsg(4, [Item]))), Cmd_OfAsyncWith_perform((x_1) => {
                    AsyncHelpers_start(x_1);
                }, getSystemStatus, undefined, (Item_1) => (new AppMsg(16, [Item_1])))]))];
            }
        case 29:
            return [new AppModel(model.Shell, new AppPage(0, [ProjectHub_init()]), model.SetupWizard, model.OpenProjectId, new HostStartup(0, [])), Cmd_OfAsyncWith_perform((x_2) => {
                AsyncHelpers_start(x_2);
            }, waitForHostHealth, undefined, (Item_2) => (new AppMsg(28, [Item_2])))];
        case 0:
            switch (msg.fields[0].tag) {
                case 2:
                    return [new AppModel((bind$0040_2 = model.Shell, new ShellModel(bind$0040_2.Tab, new ActivityPanelState(model.Shell.Activity.Events, true), bind$0040_2.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                case 3:
                    return [new AppModel((bind$0040_4 = model.Shell, new ShellModel(bind$0040_4.Tab, bind$0040_4.Activity, msg.fields[0].fields[0])), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                case 0:
                    switch (msg.fields[0].fields[0].tag) {
                        case 1:
                            if (model.Page.tag === 1) {
                                return [new AppModel((bind$0040_6 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_6.Activity, bind$0040_6.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                            }
                            else {
                                return [new AppModel((bind$0040_7 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_7.Activity, bind$0040_7.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup), singleton((dispatch_2) => {
                                    dispatch_2(new AppMsg(1, [new ProjectHubMsg(4, [])]));
                                })];
                            }
                        case 2:
                            return [new AppModel((bind$0040_8 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_8.Activity, bind$0040_8.SystemStatus)), new AppPage(2, [Settings_init()]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_6) => {
                                AsyncHelpers_start(x_6);
                            }, getSystemStatus, undefined, (Item_6) => (new AppMsg(16, [Item_6]))), Cmd_OfAsyncWith_perform((x_7) => {
                                AsyncHelpers_start(x_7);
                            }, getModelStatus, undefined, (Item_7) => (new AppMsg(17, [Item_7])))]))];
                        default:
                            return [new AppModel((bind$0040_5 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_5.Activity, bind$0040_5.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup), Cmd_OfAsyncWith_perform((x_5) => {
                                AsyncHelpers_start(x_5);
                            }, getProjects, undefined, (Item_5) => (new AppMsg(4, [Item_5])))];
                    }
                default:
                    return [new AppModel((bind$0040 = model.Shell, new ShellModel(bind$0040.Tab, new ActivityPanelState(mergeEvent(msg.fields[0].fields[0], model.Shell.Activity.Events), model.Shell.Activity.Connected), bind$0040.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup), (matchValue = model.Page, (matchValue.tag === 1) ? ((t = matchValue.fields[0], (bakeCmd = ((matchValue_1 = t.BakeJobId, (matchValue_1 != null) ? ((((matchValue_1 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "bake")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_2 = matchValue_1, (bust = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x_3) => {
                        AsyncHelpers_start(x_3);
                    }, () => singleton_1.Delay(() => singleton_1.Return(previewMediaUrl(t.Project.Id, "renders/bake/final.mp4", bust))), undefined, (Item_3) => (new AppMsg(14, [Item_3])))))) : ((((matchValue_1 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "bake")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_3 = matchValue_1, singleton((dispatch) => {
                        dispatch(new AppMsg(2, [new TimelineMsg(18, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none())), Cmd_batch(ofArray([(matchValue_2 = t.PreviewJobId, (matchValue_2 != null) ? ((((matchValue_2 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_6 = matchValue_2, (bust_1 = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x_4) => {
                        AsyncHelpers_start(x_4);
                    }, () => singleton_1.Delay(() => singleton_1.Bind(getMockupPreviewStatus(t.Project.Id), (_arg) => {
                        const status = _arg;
                        return singleton_1.Return((status.tag === 1) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust_1) : ((status.fields[0] == null) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust_1) : previewMediaUrl(t.Project.Id, status.fields[0].PreviewPath, bust_1)));
                    })), undefined, (Item_4) => (new AppMsg(13, [Item_4])))))) : ((((matchValue_2 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_7 = matchValue_2, singleton((dispatch_1) => {
                        dispatch_1(new AppMsg(2, [new TimelineMsg(17, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none()), bakeCmd]))))) : Cmd_none())];
            }
        case 4:
            if (msg.fields[0].tag === 1) {
                const matchValue_5 = model.Page;
                if (matchValue_5.tag === 0) {
                    const hub_1 = matchValue_5.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_1.Summaries, hub_1.NewName, false, (matchValue_6 = model.HostStartup, (matchValue_6.tag === 0) ? undefined : ((matchValue_6.tag === 2) ? msg.fields[0].fields[0] : msg.fields[0].fields[0])), hub_1.BriefText, hub_1.OutlineProjectId, hub_1.OutlineBlocks, hub_1.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_4 = model.Page;
                if (matchValue_4.tag === 0) {
                    const hub = matchValue_4.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(msg.fields[0].fields[0], hub.NewName, false, undefined, hub.BriefText, hub.OutlineProjectId, hub.OutlineBlocks, hub.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 1:
            switch (msg.fields[0].tag) {
                case 0: {
                    const matchValue_8 = model.Page;
                    if (matchValue_8.tag === 0) {
                        const hub_3 = matchValue_8.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_3.Summaries, msg.fields[0].fields[0], hub_3.Loading, hub_3.Error, hub_3.BriefText, hub_3.OutlineProjectId, hub_3.OutlineBlocks, hub_3.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_9 = model.Page;
                    if (matchValue_9.tag === 0) {
                        const hub_4 = matchValue_9.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_4.Summaries, hub_4.NewName, true, hub_4.Error, hub_4.BriefText, hub_4.OutlineProjectId, hub_4.OutlineBlocks, hub_4.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_9) => {
                            AsyncHelpers_start(x_9);
                        }, () => createProject(hub_4.NewName), undefined, (Item_9) => (new AppMsg(5, [Item_9])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_11 = model.Page;
                    if (matchValue_11.tag === 0) {
                        const hub_6 = matchValue_11.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_6.Summaries, hub_6.NewName, hub_6.Loading, hub_6.Error, hub_6.BriefText, msg.fields[0].fields[0], undefined, hub_6.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_12 = model.Page;
                    if (matchValue_12.tag === 0) {
                        const hub_7 = matchValue_12.fields[0];
                        const matchValue_13 = hub_7.OutlineProjectId;
                        if (matchValue_13 != null) {
                            const projectId = matchValue_13;
                            return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_7.Summaries, hub_7.NewName, hub_7.Loading, undefined, hub_7.BriefText, hub_7.OutlineProjectId, hub_7.OutlineBlocks, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_10) => {
                                AsyncHelpers_start(x_10);
                            }, () => generateOutline(projectId, hub_7.BriefText), undefined, (Item_10) => (new AppMsg(19, [Item_10])))];
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
                    const matchValue_16 = model.Page;
                    if (matchValue_16.tag === 0) {
                        const hub_10 = matchValue_16.fields[0];
                        const matchValue_17 = hub_10.OutlineProjectId;
                        const matchValue_18 = hub_10.OutlineBlocks;
                        let matchResult, blocks_1, projectId_1;
                        if (matchValue_17 != null) {
                            if (matchValue_18 != null) {
                                matchResult = 0;
                                blocks_1 = matchValue_18;
                                projectId_1 = matchValue_17;
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
                                return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_10.Summaries, hub_10.NewName, hub_10.Loading, hub_10.Error, hub_10.BriefText, hub_10.OutlineProjectId, hub_10.OutlineBlocks, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_11) => {
                                    AsyncHelpers_start(x_11);
                                }, () => applyOutline(projectId_1, hub_10.BriefText, blocks_1), undefined, (Item_11) => (new AppMsg(20, [Item_11])))];
                            default:
                                return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_21 = model.Page;
                    if (matchValue_21.tag === 0) {
                        const hub_12 = matchValue_21.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_12.Summaries, hub_12.NewName, hub_12.Loading, hub_12.Error, hub_12.BriefText, hub_12.OutlineProjectId, undefined, hub_12.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_22 = model.Page;
                    if (matchValue_22.tag === 0) {
                        const hub_13 = matchValue_22.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_13.Summaries, hub_13.NewName, hub_13.Loading, hub_13.Error, msg.fields[0].fields[0], hub_13.OutlineProjectId, hub_13.OutlineBlocks, hub_13.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_23 = model.Page;
                    if (matchValue_23.tag === 0) {
                        const hub_14 = matchValue_23.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_14.Summaries, hub_14.NewName, true, hub_14.Error, hub_14.BriefText, hub_14.OutlineProjectId, hub_14.OutlineBlocks, hub_14.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_12) => {
                            AsyncHelpers_start(x_12);
                        }, () => getProject(msg.fields[0].fields[0]), undefined, (Item_12) => (new AppMsg(6, [Item_12])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_25 = model.Page;
                    let matchResult_1, hub_16, t_2;
                    switch (matchValue_25.tag) {
                        case 0: {
                            matchResult_1 = 0;
                            hub_16 = matchValue_25.fields[0];
                            break;
                        }
                        case 1: {
                            if (matchValue_25.fields[0].Project.Id === msg.fields[0].fields[0]) {
                                matchResult_1 = 1;
                                t_2 = matchValue_25.fields[0];
                            }
                            else {
                                matchResult_1 = 2;
                            }
                            break;
                        }
                        default:
                            matchResult_1 = 2;
                    }
                    switch (matchResult_1) {
                        case 0:
                            return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_16.Summaries, hub_16.NewName, true, undefined, hub_16.BriefText, hub_16.OutlineProjectId, hub_16.OutlineBlocks, hub_16.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_14) => {
                                AsyncHelpers_start(x_14);
                            }, () => deleteProject(msg.fields[0].fields[0]), undefined, (Item_13) => (new AppMsg(25, [Item_13])))];
                        case 1:
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_2.Project, true, t_2.Generating, t_2.Previewing, t_2.Baking, t_2.PreviewUrl, t_2.BakeUrl, t_2.PreviewJobId, t_2.BakeJobId, undefined, t_2.DragIndex, t_2.SelectedBlockId, t_2.VoiceoverDraft, t_2.ImagePromptDraft, t_2.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_15) => {
                                AsyncHelpers_start(x_15);
                            }, () => deleteProject(msg.fields[0].fields[0]), undefined, (Item_14) => (new AppMsg(25, [Item_14])))];
                        default:
                            return [model, Cmd_none()];
                    }
                }
                default: {
                    const matchValue_7 = model.Page;
                    if (matchValue_7.tag === 0) {
                        const hub_2 = matchValue_7.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_2.Summaries, hub_2.NewName, true, hub_2.Error, hub_2.BriefText, hub_2.OutlineProjectId, hub_2.OutlineBlocks, hub_2.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_8) => {
                            AsyncHelpers_start(x_8);
                        }, getProjects, undefined, (Item_8) => (new AppMsg(4, [Item_8])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
            }
        case 5:
            if (msg.fields[0].tag === 1) {
                const matchValue_10 = model.Page;
                if (matchValue_10.tag === 0) {
                    const hub_5 = matchValue_10.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_5.Summaries, hub_5.NewName, false, msg.fields[0].fields[0], hub_5.BriefText, hub_5.OutlineProjectId, hub_5.OutlineBlocks, hub_5.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_9 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_9.Activity, bind$0040_9.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup), Cmd_none()];
            }
        case 19:
            if (msg.fields[0].tag === 1) {
                const matchValue_15 = model.Page;
                if (matchValue_15.tag === 0) {
                    const hub_9 = matchValue_15.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_9.Summaries, hub_9.NewName, hub_9.Loading, msg.fields[0].fields[0], hub_9.BriefText, hub_9.OutlineProjectId, hub_9.OutlineBlocks, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_14 = model.Page;
                if (matchValue_14.tag === 0) {
                    const hub_8 = matchValue_14.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_8.Summaries, hub_8.NewName, hub_8.Loading, hub_8.Error, hub_8.BriefText, hub_8.OutlineProjectId, msg.fields[0].fields[0], false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 20:
            if (msg.fields[0].tag === 1) {
                const matchValue_20 = model.Page;
                if (matchValue_20.tag === 0) {
                    const hub_11 = matchValue_20.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_11.Summaries, hub_11.NewName, hub_11.Loading, msg.fields[0].fields[0], hub_11.BriefText, hub_11.OutlineProjectId, hub_11.OutlineBlocks, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_10 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_10.Activity, bind$0040_10.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup), Cmd_none()];
            }
        case 6:
            if (msg.fields[0].tag === 1) {
                const matchValue_24 = model.Page;
                if (matchValue_24.tag === 0) {
                    const hub_15 = matchValue_24.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_15.Summaries, hub_15.NewName, false, msg.fields[0].fields[0], hub_15.BriefText, hub_15.OutlineProjectId, hub_15.OutlineBlocks, hub_15.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_11 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_11.Activity, bind$0040_11.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup), Cmd_OfAsyncWith_perform((x_13) => {
                    AsyncHelpers_start(x_13);
                }, () => singleton_1.Delay(() => {
                    const bust_2 = toUnixTimeMilliseconds(utcNow());
                    return singleton_1.Bind(getMockupPreviewStatus(msg.fields[0].fields[0].Id), (_arg_1) => {
                        const status_1 = _arg_1;
                        return singleton_1.Return((status_1.tag === 1) ? undefined : ((status_1.fields[0] == null) ? undefined : previewMediaUrl(msg.fields[0].fields[0].Id, status_1.fields[0].PreviewPath, bust_2)));
                    });
                }), undefined, (_arg_2) => {
                    if (_arg_2 == null) {
                        return new AppMsg(15, []);
                    }
                    else {
                        return new AppMsg(13, [_arg_2]);
                    }
                })];
            }
        case 25:
            if (msg.fields[0].tag === 1) {
                const matchValue_28 = model.Page;
                switch (matchValue_28.tag) {
                    case 0: {
                        const hub_18 = matchValue_28.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_18.Summaries, hub_18.NewName, false, msg.fields[0].fields[0], hub_18.BriefText, hub_18.OutlineProjectId, hub_18.OutlineBlocks, hub_18.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    case 1: {
                        const t_4 = matchValue_28.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_4.Project, false, t_4.Generating, t_4.Previewing, t_4.Baking, t_4.PreviewUrl, t_4.BakeUrl, t_4.PreviewJobId, t_4.BakeJobId, msg.fields[0].fields[0], t_4.DragIndex, t_4.SelectedBlockId, t_4.VoiceoverDraft, t_4.ImagePromptDraft, t_4.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    default:
                        return [model, Cmd_none()];
                }
            }
            else if (equals(model.OpenProjectId, msg.fields[0].fields[0]) ? true : ((matchValue_26 = model.Page, (matchValue_26.tag === 1) && (matchValue_26.fields[0].Project.Id === msg.fields[0].fields[0])))) {
                return [new AppModel((bind$0040_12 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_12.Activity, bind$0040_12.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup), Cmd_OfAsyncWith_perform((x_16) => {
                    AsyncHelpers_start(x_16);
                }, getProjects, undefined, (Item_15) => (new AppMsg(4, [Item_15])))];
            }
            else {
                const matchValue_27 = model.Page;
                if (matchValue_27.tag === 0) {
                    const hub_17 = matchValue_27.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_17.Summaries, hub_17.NewName, true, undefined, hub_17.BriefText, filter((y) => (msg.fields[0].fields[0] !== y), hub_17.OutlineProjectId), hub_17.OutlineBlocks, hub_17.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_17) => {
                        AsyncHelpers_start(x_17);
                    }, getProjects, undefined, (Item_16) => (new AppMsg(4, [Item_16])))];
                }
                else {
                    return [model, Cmd_OfAsyncWith_perform((x_18) => {
                        AsyncHelpers_start(x_18);
                    }, getProjects, undefined, (Item_17) => (new AppMsg(4, [Item_17])))];
                }
            }
        case 2:
            switch (msg.fields[0].tag) {
                case 2: {
                    const matchValue_29 = model.Page;
                    if (matchValue_29.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveUp(matchValue_29.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_30 = model.Page;
                    if (matchValue_30.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveDown(matchValue_30.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_31 = model.Page;
                    if (matchValue_31.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_setDragIndex(matchValue_31.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_32 = model.Page;
                    if (matchValue_32.tag === 1) {
                        const t_8 = matchValue_32.fields[0];
                        const matchValue_33 = t_8.DragIndex;
                        if (matchValue_33 == null) {
                            return [model, Cmd_none()];
                        }
                        else {
                            const reordered = StoryboardTimeline_reorderByDrag(t_8, matchValue_33, msg.fields[0].fields[0]);
                            const ids = map((b_1) => b_1.Id, sortBy((b) => b.Order, reordered.Project.Blocks, {
                                Compare: comparePrimitives,
                            }));
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(reordered.Project, true, reordered.Generating, reordered.Previewing, reordered.Baking, reordered.PreviewUrl, reordered.BakeUrl, reordered.PreviewJobId, reordered.BakeJobId, reordered.Error, reordered.DragIndex, reordered.SelectedBlockId, reordered.VoiceoverDraft, reordered.ImagePromptDraft, reordered.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_21) => {
                                AsyncHelpers_start(x_21);
                            }, () => reorderBlocks(reordered.Project.Id, ids), undefined, (Item_19) => (new AppMsg(7, [Item_19])))];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 12: {
                    const matchValue_34 = model.Page;
                    if (matchValue_34.tag === 1) {
                        const t_9 = matchValue_34.fields[0];
                        const matchValue_35 = t_9.SelectedBlockId;
                        if (matchValue_35 != null) {
                            const blockId = matchValue_35;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_9.Project, true, t_9.Generating, t_9.Previewing, t_9.Baking, t_9.PreviewUrl, t_9.BakeUrl, t_9.PreviewJobId, t_9.BakeJobId, t_9.Error, t_9.DragIndex, t_9.SelectedBlockId, t_9.VoiceoverDraft, t_9.ImagePromptDraft, t_9.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_22) => {
                                AsyncHelpers_start(x_22);
                            }, () => selectBlockThumbnail(t_9.Project.Id, blockId, msg.fields[0].fields[0]), undefined, (Item_20) => (new AppMsg(24, [Item_20])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 16: {
                    const matchValue_36 = model.Page;
                    if (matchValue_36.tag === 1) {
                        const t_10 = matchValue_36.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_10.Project, true, t_10.Generating, t_10.Previewing, t_10.Baking, t_10.PreviewUrl, t_10.BakeUrl, t_10.PreviewJobId, t_10.BakeJobId, t_10.Error, t_10.DragIndex, t_10.SelectedBlockId, t_10.VoiceoverDraft, t_10.ImagePromptDraft, t_10.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_23) => {
                            AsyncHelpers_start(x_23);
                        }, () => exportSharePack(t_10.Project.Id), undefined, (Item_21) => (new AppMsg(23, [Item_21])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 19: {
                    const matchValue_41 = model.Page;
                    if (matchValue_41.tag === 1) {
                        const t_15 = matchValue_41.fields[0];
                        const ids_1 = map((b_3) => b_3.Id, sortBy((b_2) => b_2.Order, t_15.Project.Blocks, {
                            Compare: comparePrimitives,
                        }));
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_15.Project, true, t_15.Generating, t_15.Previewing, t_15.Baking, t_15.PreviewUrl, t_15.BakeUrl, t_15.PreviewJobId, t_15.BakeJobId, t_15.Error, t_15.DragIndex, t_15.SelectedBlockId, t_15.VoiceoverDraft, t_15.ImagePromptDraft, t_15.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_25) => {
                            AsyncHelpers_start(x_25);
                        }, () => reorderBlocks(t_15.Project.Id, ids_1), undefined, (Item_22) => (new AppMsg(7, [Item_22])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_44 = model.Page;
                    if (matchValue_44.tag === 1) {
                        const t_17 = matchValue_44.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_17.Project, true, t_17.Generating, t_17.Previewing, t_17.Baking, t_17.PreviewUrl, t_17.BakeUrl, t_17.PreviewJobId, t_17.BakeJobId, t_17.Error, t_17.DragIndex, t_17.SelectedBlockId, t_17.VoiceoverDraft, t_17.ImagePromptDraft, t_17.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_26) => {
                            AsyncHelpers_start(x_26);
                        }, () => importStylePackLogo(t_17.Project.Id, msg.fields[0].fields[0]), undefined, (Item_23) => (new AppMsg(21, [Item_23])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 15: {
                    const matchValue_47 = model.Page;
                    if (matchValue_47.tag === 1) {
                        const t_20 = matchValue_47.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_20.Project, t_20.Saving, t_20.Generating, t_20.Previewing, true, t_20.PreviewUrl, t_20.BakeUrl, t_20.PreviewJobId, t_20.BakeJobId, undefined, t_20.DragIndex, t_20.SelectedBlockId, t_20.VoiceoverDraft, t_20.ImagePromptDraft, t_20.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_27) => {
                            AsyncHelpers_start(x_27);
                        }, () => startBake(t_20.Project.Id), undefined, (Item_24) => (new AppMsg(22, [Item_24])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 18: {
                    const matchValue_52 = model.Page;
                    if (matchValue_52.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError(msg.fields[0].fields[0], matchValue_52.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 0: {
                    const matchValue_53 = model.Page;
                    if (matchValue_53.tag === 1) {
                        const t_25 = matchValue_53.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_25.Project, true, t_25.Generating, t_25.Previewing, t_25.Baking, t_25.PreviewUrl, t_25.BakeUrl, t_25.PreviewJobId, t_25.BakeJobId, t_25.Error, t_25.DragIndex, t_25.SelectedBlockId, t_25.VoiceoverDraft, t_25.ImagePromptDraft, t_25.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_28) => {
                            AsyncHelpers_start(x_28);
                        }, () => importBlockImage(t_25.Project.Id, msg.fields[0].fields[0]), undefined, (Item_25) => (new AppMsg(8, [Item_25])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_56 = model.Page;
                    if (matchValue_56.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_selectBlock(matchValue_56.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    const matchValue_57 = model.Page;
                    if (matchValue_57.tag === 1) {
                        const t_28 = matchValue_57.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_28.Project, t_28.Saving, t_28.Generating, t_28.Previewing, t_28.Baking, t_28.PreviewUrl, t_28.BakeUrl, t_28.PreviewJobId, t_28.BakeJobId, t_28.Error, t_28.DragIndex, t_28.SelectedBlockId, msg.fields[0].fields[0], t_28.ImagePromptDraft, t_28.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_58 = model.Page;
                    if (matchValue_58.tag === 1) {
                        const t_29 = matchValue_58.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_29.Project, t_29.Saving, t_29.Generating, t_29.Previewing, t_29.Baking, t_29.PreviewUrl, t_29.BakeUrl, t_29.PreviewJobId, t_29.BakeJobId, t_29.Error, t_29.DragIndex, t_29.SelectedBlockId, t_29.VoiceoverDraft, msg.fields[0].fields[0], t_29.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_59 = model.Page;
                    if (matchValue_59.tag === 1) {
                        const t_30 = matchValue_59.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_30.Project, t_30.Saving, t_30.Generating, t_30.Previewing, t_30.Baking, t_30.PreviewUrl, t_30.BakeUrl, t_30.PreviewJobId, t_30.BakeJobId, t_30.Error, t_30.DragIndex, t_30.SelectedBlockId, t_30.VoiceoverDraft, t_30.ImagePromptDraft, max(0, msg.fields[0].fields[0]))]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 10: {
                    const matchValue_60 = model.Page;
                    if (matchValue_60.tag === 1) {
                        const t_31 = matchValue_60.fields[0];
                        const matchValue_61 = t_31.SelectedBlockId;
                        if (matchValue_61 != null) {
                            const blockId_1 = matchValue_61;
                            const prompt = isNullOrWhiteSpace(t_31.ImagePromptDraft) ? undefined : t_31.ImagePromptDraft;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_31.Project, true, t_31.Generating, t_31.Previewing, t_31.Baking, t_31.PreviewUrl, t_31.BakeUrl, t_31.PreviewJobId, t_31.BakeJobId, t_31.Error, t_31.DragIndex, t_31.SelectedBlockId, t_31.VoiceoverDraft, t_31.ImagePromptDraft, t_31.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_29) => {
                                AsyncHelpers_start(x_29);
                            }, () => updateBlock(t_31.Project.Id, blockId_1, t_31.VoiceoverDraft, prompt, t_31.CrossfadeDurationDraft), undefined, (Item_26) => (new AppMsg(9, [Item_26])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 11: {
                    const matchValue_64 = model.Page;
                    if (matchValue_64.tag === 1) {
                        const t_34 = matchValue_64.fields[0];
                        const matchValue_65 = t_34.SelectedBlockId;
                        if (matchValue_65 != null) {
                            const blockId_2 = matchValue_65;
                            const prompt_1 = isNullOrWhiteSpace(t_34.ImagePromptDraft) ? undefined : t_34.ImagePromptDraft;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_34.Project, t_34.Saving, true, t_34.Previewing, t_34.Baking, t_34.PreviewUrl, t_34.BakeUrl, t_34.PreviewJobId, t_34.BakeJobId, undefined, t_34.DragIndex, t_34.SelectedBlockId, t_34.VoiceoverDraft, t_34.ImagePromptDraft, t_34.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_30) => {
                                AsyncHelpers_start(x_30);
                            }, () => generateBlockThumbnail(t_34.Project.Id, blockId_2, prompt_1, 3), undefined, (Item_27) => (new AppMsg(10, [Item_27])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 13: {
                    const matchValue_68 = model.Page;
                    if (matchValue_68.tag === 1) {
                        const t_37 = matchValue_68.fields[0];
                        const matchValue_69 = t_37.SelectedBlockId;
                        if (matchValue_69 != null) {
                            const blockId_3 = matchValue_69;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_37.Project, true, t_37.Generating, t_37.Previewing, t_37.Baking, t_37.PreviewUrl, t_37.BakeUrl, t_37.PreviewJobId, t_37.BakeJobId, t_37.Error, t_37.DragIndex, t_37.SelectedBlockId, t_37.VoiceoverDraft, t_37.ImagePromptDraft, t_37.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_31) => {
                                AsyncHelpers_start(x_31);
                            }, () => importBlockAudio(t_37.Project.Id, blockId_3, msg.fields[0].fields[0]), undefined, (Item_28) => (new AppMsg(11, [Item_28])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 14: {
                    const matchValue_72 = model.Page;
                    if (matchValue_72.tag === 1) {
                        const t_40 = matchValue_72.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_40.Project, t_40.Saving, t_40.Generating, true, t_40.Baking, t_40.PreviewUrl, t_40.BakeUrl, t_40.PreviewJobId, t_40.BakeJobId, undefined, t_40.DragIndex, t_40.SelectedBlockId, t_40.VoiceoverDraft, t_40.ImagePromptDraft, t_40.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_32) => {
                            AsyncHelpers_start(x_32);
                        }, () => refreshMockupPreview(t_40.Project.Id), undefined, (Item_29) => (new AppMsg(12, [Item_29])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 17: {
                    const matchValue_76 = model.Page;
                    if (matchValue_76.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_76.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                default:
                    return [new AppModel((bind$0040_13 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_13.Activity, bind$0040_13.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup), Cmd_OfAsyncWith_perform((x_19) => {
                        AsyncHelpers_start(x_19);
                    }, getProjects, undefined, (Item_18) => (new AppMsg(4, [Item_18])))];
            }
        case 24:
            if (msg.fields[0].tag === 1) {
                const matchValue_38 = model.Page;
                if (matchValue_38.tag === 1) {
                    const t_12 = matchValue_38.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_12.Project, false, t_12.Generating, t_12.Previewing, t_12.Baking, t_12.PreviewUrl, t_12.BakeUrl, t_12.PreviewJobId, t_12.BakeJobId, msg.fields[0].fields[0], t_12.DragIndex, t_12.SelectedBlockId, t_12.VoiceoverDraft, t_12.ImagePromptDraft, t_12.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_37 = model.Page;
                if (matchValue_37.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_37.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 23:
            if (msg.fields[0].tag === 1) {
                const matchValue_40 = model.Page;
                if (matchValue_40.tag === 1) {
                    const t_14 = matchValue_40.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_14.Project, false, t_14.Generating, t_14.Previewing, t_14.Baking, t_14.PreviewUrl, t_14.BakeUrl, t_14.PreviewJobId, t_14.BakeJobId, msg.fields[0].fields[0], t_14.DragIndex, t_14.SelectedBlockId, t_14.VoiceoverDraft, t_14.ImagePromptDraft, t_14.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_39 = model.Page;
                if (matchValue_39.tag === 1) {
                    const t_13 = matchValue_39.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_13.Project, false, t_13.Generating, t_13.Previewing, t_13.Baking, t_13.PreviewUrl, t_13.BakeUrl, t_13.PreviewJobId, t_13.BakeJobId, `Share pack exported: ${msg.fields[0].fields[0]}`, t_13.DragIndex, t_13.SelectedBlockId, t_13.VoiceoverDraft, t_13.ImagePromptDraft, t_13.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 7:
            if (msg.fields[0].tag === 1) {
                const matchValue_43 = model.Page;
                if (matchValue_43.tag === 1) {
                    const t_16 = matchValue_43.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_16.Project, false, t_16.Generating, t_16.Previewing, t_16.Baking, t_16.PreviewUrl, t_16.BakeUrl, t_16.PreviewJobId, t_16.BakeJobId, msg.fields[0].fields[0], t_16.DragIndex, t_16.SelectedBlockId, t_16.VoiceoverDraft, t_16.ImagePromptDraft, t_16.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_14 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_14.Project, false, bind$0040_14.Generating, bind$0040_14.Previewing, bind$0040_14.Baking, bind$0040_14.PreviewUrl, bind$0040_14.BakeUrl, bind$0040_14.PreviewJobId, bind$0040_14.BakeJobId, undefined, bind$0040_14.DragIndex, bind$0040_14.SelectedBlockId, bind$0040_14.VoiceoverDraft, bind$0040_14.ImagePromptDraft, bind$0040_14.CrossfadeDurationDraft))]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 21:
            if (msg.fields[0].tag === 1) {
                const matchValue_46 = model.Page;
                if (matchValue_46.tag === 1) {
                    const t_19 = matchValue_46.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_19.Project, false, t_19.Generating, t_19.Previewing, t_19.Baking, t_19.PreviewUrl, t_19.BakeUrl, t_19.PreviewJobId, t_19.BakeJobId, msg.fields[0].fields[0], t_19.DragIndex, t_19.SelectedBlockId, t_19.VoiceoverDraft, t_19.ImagePromptDraft, t_19.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_45 = model.Page;
                if (matchValue_45.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_45.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 22:
            if (msg.fields[0].tag === 1) {
                const matchValue_50 = model.Page;
                if (matchValue_50.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError(msg.fields[0].fields[0], matchValue_50.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_48 = model.Page;
                if (matchValue_48.tag === 1) {
                    const t_21 = matchValue_48.fields[0];
                    let matchValue_49;
                    let outArg = "00000000-0000-0000-0000-000000000000";
                    matchValue_49 = [tryParse(msg.fields[0].fields[0], new FSharpRef(() => outArg, (v) => {
                        outArg = v;
                    })), outArg];
                    if (matchValue_49[0]) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeStarted(matchValue_49[1], t_21)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError("Invalid bake job id", t_21)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 14: {
            const matchValue_51 = model.Page;
            if (matchValue_51.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeUrl(msg.fields[0], matchValue_51.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 8:
            if (msg.fields[0].tag === 1) {
                const matchValue_55 = model.Page;
                if (matchValue_55.tag === 1) {
                    const t_26 = matchValue_55.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_26.Project, false, t_26.Generating, t_26.Previewing, t_26.Baking, t_26.PreviewUrl, t_26.BakeUrl, t_26.PreviewJobId, t_26.BakeJobId, msg.fields[0].fields[0], t_26.DragIndex, t_26.SelectedBlockId, t_26.VoiceoverDraft, t_26.ImagePromptDraft, t_26.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_15 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_15.Project, false, bind$0040_15.Generating, bind$0040_15.Previewing, bind$0040_15.Baking, bind$0040_15.PreviewUrl, bind$0040_15.BakeUrl, bind$0040_15.PreviewJobId, bind$0040_15.BakeJobId, undefined, bind$0040_15.DragIndex, bind$0040_15.SelectedBlockId, bind$0040_15.VoiceoverDraft, bind$0040_15.ImagePromptDraft, bind$0040_15.CrossfadeDurationDraft))]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 9:
            if (msg.fields[0].tag === 1) {
                const matchValue_63 = model.Page;
                if (matchValue_63.tag === 1) {
                    const t_33 = matchValue_63.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_33.Project, false, t_33.Generating, t_33.Previewing, t_33.Baking, t_33.PreviewUrl, t_33.BakeUrl, t_33.PreviewJobId, t_33.BakeJobId, msg.fields[0].fields[0], t_33.DragIndex, t_33.SelectedBlockId, t_33.VoiceoverDraft, t_33.ImagePromptDraft, t_33.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_62 = model.Page;
                if (matchValue_62.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_62.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 10:
            if (msg.fields[0].tag === 1) {
                const matchValue_67 = model.Page;
                if (matchValue_67.tag === 1) {
                    const t_36 = matchValue_67.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_36.Project, t_36.Saving, false, t_36.Previewing, t_36.Baking, t_36.PreviewUrl, t_36.BakeUrl, t_36.PreviewJobId, t_36.BakeJobId, msg.fields[0].fields[0], t_36.DragIndex, t_36.SelectedBlockId, t_36.VoiceoverDraft, t_36.ImagePromptDraft, t_36.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_66 = model.Page;
                if (matchValue_66.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_66.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 11:
            if (msg.fields[0].tag === 1) {
                const matchValue_71 = model.Page;
                if (matchValue_71.tag === 1) {
                    const t_39 = matchValue_71.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_39.Project, false, t_39.Generating, t_39.Previewing, t_39.Baking, t_39.PreviewUrl, t_39.BakeUrl, t_39.PreviewJobId, t_39.BakeJobId, msg.fields[0].fields[0], t_39.DragIndex, t_39.SelectedBlockId, t_39.VoiceoverDraft, t_39.ImagePromptDraft, t_39.CrossfadeDurationDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_70 = model.Page;
                if (matchValue_70.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_70.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 12:
            if (msg.fields[0].tag === 1) {
                const matchValue_74 = model.Page;
                if (matchValue_74.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_74.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_73 = model.Page;
                if (matchValue_73.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewStarted(msg.fields[0].fields[0].JobId, matchValue_73.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 13: {
            const matchValue_75 = model.Page;
            if (matchValue_75.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewUrl(msg.fields[0], matchValue_75.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 15:
            return [model, Cmd_none()];
        case 16:
            if (msg.fields[0].tag === 1) {
                return [model, Cmd_none()];
            }
            else {
                const model$0027_1 = new AppModel((bind$0040_16 = model.Shell, new ShellModel(bind$0040_16.Tab, bind$0040_16.Activity, msg.fields[0].fields[0])), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup);
                const matchValue_77 = model.Page;
                if (matchValue_77.tag === 2) {
                    const st = matchValue_77.fields[0];
                    return [new AppModel(model$0027_1.Shell, new AppPage(2, [new SettingsModel(msg.fields[0].fields[0], st.ModelStatus, st.Message, st.CheckingUpdates, st.SyncingModels, st.ShowFirstRunBanner)]), model$0027_1.SetupWizard, model$0027_1.OpenProjectId, model$0027_1.HostStartup), Cmd_none()];
                }
                else {
                    return [model$0027_1, Cmd_none()];
                }
            }
        case 3:
            switch (msg.fields[0].tag) {
                case 0: {
                    const matchValue_78 = model.Page;
                    if (matchValue_78.tag === 2) {
                        const st_1 = matchValue_78.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_1.Status, st_1.ModelStatus, st_1.Message, true, st_1.SyncingModels, st_1.ShowFirstRunBanner)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_34) => {
                            AsyncHelpers_start(x_34);
                        }, checkForUpdates, undefined, (r) => (new AppMsg(18, [(r.tag === 1) ? r.fields[0] : r.fields[0]])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_80 = model.Page;
                    if (matchValue_80.tag === 2) {
                        const st_3 = matchValue_80.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_3.Status, st_3.ModelStatus, st_3.Message, st_3.CheckingUpdates, true, st_3.ShowFirstRunBanner)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_OfAsyncWith_perform((x_35) => {
                            AsyncHelpers_start(x_35);
                        }, getModelStatus, undefined, (Item_31) => (new AppMsg(17, [Item_31])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_81 = model.Page;
                    if (matchValue_81.tag === 2) {
                        const st_4 = matchValue_81.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_4.Status, st_4.ModelStatus, st_4.Message, st_4.CheckingUpdates, true, st_4.ShowFirstRunBanner)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_36) => {
                            AsyncHelpers_start(x_36);
                        }, () => syncModels(false), undefined, (r_1) => (new AppMsg(18, [(r_1.tag === 1) ? r_1.fields[0] : "Model check started"]))), Cmd_OfAsyncWith_perform((x_37) => {
                            AsyncHelpers_start(x_37);
                        }, getModelStatus, undefined, (Item_32) => (new AppMsg(17, [Item_32])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_82 = model.Page;
                    if (matchValue_82.tag === 2) {
                        const st_5 = matchValue_82.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_5.Status, st_5.ModelStatus, st_5.Message, st_5.CheckingUpdates, true, st_5.ShowFirstRunBanner)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_38) => {
                            AsyncHelpers_start(x_38);
                        }, () => syncModels(true), undefined, (r_2) => (new AppMsg(18, [(r_2.tag === 1) ? r_2.fields[0] : "Model sync/pull started"]))), Cmd_OfAsyncWith_perform((x_39) => {
                            AsyncHelpers_start(x_39);
                        }, getModelStatus, undefined, (Item_33) => (new AppMsg(17, [Item_33])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    Settings_markBootstrapStarted();
                    const matchValue_83 = model.Page;
                    if (matchValue_83.tag === 2) {
                        const st_6 = matchValue_83.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_6.Status, st_6.ModelStatus, st_6.Message, st_6.CheckingUpdates, st_6.SyncingModels, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_84 = model.Page;
                    if (matchValue_84.tag === 2) {
                        const st_7 = matchValue_84.fields[0];
                        Settings_markBootstrapStarted();
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_7.Status, st_7.ModelStatus, st_7.Message, st_7.CheckingUpdates, st_7.SyncingModels, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_40) => {
                            AsyncHelpers_start(x_40);
                        }, runBootstrap, undefined, () => (new AppMsg(18, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_41) => {
                            AsyncHelpers_start(x_41);
                        }, getSystemStatus, undefined, (Item_34) => (new AppMsg(16, [Item_34])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_42) => {
                            AsyncHelpers_start(x_42);
                        }, runRepair, undefined, () => (new AppMsg(18, ["Repair started"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                case 2:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_43) => {
                            AsyncHelpers_start(x_43);
                        }, runConflictScan, undefined, () => (new AppMsg(18, ["Conflict scan complete"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                default:
                    return [new AppModel((bind$0040_17 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_17.Activity, bind$0040_17.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup), Cmd_OfAsyncWith_perform((x_33) => {
                        AsyncHelpers_start(x_33);
                    }, getProjects, undefined, (Item_30) => (new AppMsg(4, [Item_30])))];
            }
        case 17:
            if (msg.fields[0].tag === 1) {
                return [model, Cmd_none()];
            }
            else {
                const matchValue_79 = model.Page;
                if (matchValue_79.tag === 2) {
                    const st_2 = matchValue_79.fields[0];
                    return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_2.Status, msg.fields[0].fields[0], st_2.Message, st_2.CheckingUpdates, false, st_2.ShowFirstRunBanner)]), model.SetupWizard, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 18:
            return [(matchValue_87 = model.Page, (matchValue_87.tag === 2) ? ((st_8 = matchValue_87.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_8.Status, st_8.ModelStatus, msg.fields[0], false, st_8.SyncingModels, st_8.ShowFirstRunBanner)]), model.SetupWizard, model.OpenProjectId, model.HostStartup))) : model), Cmd_none()];
        case 26:
            switch (msg.fields[0].tag) {
                case 1: {
                    const matchValue_89 = model.SetupWizard;
                    if (matchValue_89 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, model.Page, SetupWizard_back(matchValue_89), model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_90 = model.SetupWizard;
                    if (matchValue_90 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        const w_2 = matchValue_90;
                        return [new AppModel((bind$0040_18 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_18.Activity, bind$0040_18.SystemStatus)), new AppPage(2, [Settings_init()]), new SetupWizardModel(w_2.Step, "Open Settings — bootstrap started from wizard."), model.OpenProjectId, model.HostStartup), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_44) => {
                            AsyncHelpers_start(x_44);
                        }, runBootstrap, undefined, () => (new AppMsg(18, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_45) => {
                            AsyncHelpers_start(x_45);
                        }, getSystemStatus, undefined, (Item_35) => (new AppMsg(16, [Item_35])))]))];
                    }
                }
                case 3: {
                    SetupWizard_markComplete();
                    return [new AppModel(model.Shell, model.Page, undefined, model.OpenProjectId, model.HostStartup), Cmd_none()];
                }
                default: {
                    const matchValue_88 = model.SetupWizard;
                    if (matchValue_88 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, model.Page, SetupWizard_next(matchValue_88), model.OpenProjectId, model.HostStartup), Cmd_none()];
                    }
                }
            }
        default:
            return [model, Cmd_none()];
    }
}

export function startupView(model, dispatch) {
    let elems_1, elems, value_8;
    const matchValue = model.HostStartup;
    switch (matchValue.tag) {
        case 2:
            return createElement("div", createObj(ofArray([["className", "flex flex-col h-screen items-center justify-center bg-surface text-slate-200 gap-4 p-8"], (elems_1 = [createElement("h1", {
                className: "text-xl font-semibold text-red-400",
                children: "Could not start Host",
            }), createElement("p", {
                className: "text-sm text-slate-400 text-center max-w-lg",
                children: matchValue.fields[0],
            }), createElement("button", {
                className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted font-medium",
                children: "Retry",
                onClick: (_arg) => {
                    dispatch(new AppMsg(29, []));
                },
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])));
        case 1:
            return defaultOf();
        default:
            return createElement("div", createObj(ofArray([["className", "flex flex-col h-screen items-center justify-center bg-surface text-slate-200 gap-4"], (elems = [createElement("h1", {
                className: "text-xl font-semibold",
                children: "Starting LMVideoStudio…",
            }), createElement("p", createObj(ofArray([["className", "text-sm text-slate-500 max-w-md text-center"], (value_8 = "Waiting for the local Host service (http://127.0.0.1:17170). This usually takes a few seconds after install.", ["children", value_8])]))), createElement("p", {
                className: "text-xs text-slate-600",
                children: "Loading…",
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])));
    }
}

export function view(model, dispatch) {
    let matchValue, elems;
    if (model.HostStartup.tag === 1) {
        const shell = Shell_chrome(model.Shell.Tab, model.Shell.Activity, model.Shell.SystemStatus, (matchValue = model.Page, (matchValue.tag === 1) ? StoryboardTimeline_view(matchValue.fields[0], (arg_2) => {
            dispatch(new AppMsg(2, [arg_2]));
        }) : ((matchValue.tag === 2) ? Settings_view(matchValue.fields[0], (arg_3) => {
            dispatch(new AppMsg(3, [arg_3]));
        }) : ProjectHub_view(matchValue.fields[0], (arg_1) => {
            dispatch(new AppMsg(1, [arg_1]));
        }))), (arg) => {
            dispatch(new AppMsg(0, [arg]));
        });
        const matchValue_1 = model.SetupWizard;
        if (matchValue_1 == null) {
            return shell;
        }
        else {
            return createElement("div", createObj(singleton((elems = [shell, SetupWizard_view(matchValue_1, (arg_4) => {
                dispatch(new AppMsg(26, [arg_4]));
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))]))));
        }
    }
    else {
        return startupView(model, dispatch);
    }
}

export function App_mount() {
    ProgramModule_run(ProgramModule_withSubscription((_arg) => singleton([singleton("sse"), (dispatch_1) => {
        const es = subscribeEvents((e) => {
            dispatch_1(new AppMsg(0, [new ShellMsg(1, [e])]));
        });
        dispatch_1(new AppMsg(0, [new ShellMsg(2, [])]));
        return {
            Dispose() {
                es.close();
            },
        };
    }]), Program_withReactBatched("root", ProgramModule_mkProgram(init, update, view))));
}

