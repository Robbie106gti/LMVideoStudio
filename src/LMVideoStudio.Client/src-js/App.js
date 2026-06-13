import { FSharpRef, Record, Union } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { ProjectHub_view, ProjectHubModel, ProjectHubMsg, ProjectHub_init, ProjectHubMsg_$reflection, ProjectHubModel_$reflection } from "./Views/ProjectHub.js";
import { StoryboardTimeline_view, StoryboardTimeline_withPreviewUrl, StoryboardTimeline_withPreviewStarted, StoryboardTimeline_withBakeUrl, StoryboardTimeline_withBakeStarted, StoryboardTimeline_withProject, StoryboardTimeline_withPreviewError, StoryboardTimeline_selectBlock, StoryboardTimeline_withBakeError, StoryboardTimeline_reorderByDrag, StoryboardTimeline_setDragIndex, StoryboardTimeline_moveDown, StoryboardTimeline_moveUp, StoryboardTimeline_init, TimelineModel, TimelineMsg, TimelineMsg_$reflection, TimelineModel_$reflection } from "./Views/StoryboardTimeline.js";
import { Settings_view, Settings_markBootstrapStarted, Settings_init, SettingsModel, SettingsMsg_$reflection, SettingsModel_$reflection } from "./Views/Settings.js";
import { unit_type, list_type, record_type, class_type, option_type, string_type, union_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ShellMsg, Shell_chrome, ShellTab, ShellModel, Shell_init, ShellMsg_$reflection, ShellModel_$reflection } from "./Views/Shell.js";
import { SetupWizard_view, SetupWizard_next, SetupWizard_markComplete, SetupWizardModel, SetupWizard_back, SetupWizard_init, SetupWizard_isComplete, SetupWizardMsg_$reflection, SetupWizardModel_$reflection } from "./Views/SetupWizard.js";
import { subscribeEvents, runConflictScan, flushErrorReports, runRepair, runBootstrap, syncModels, checkForUpdates, refreshMockupPreview, importBlockAudio, generateBlockThumbnail, updateBlock, importBlockImage, startBake, importStylePackLogo, exportSharePack, selectBlockThumbnail, reorderBlocks, deleteProject, getProject, applyOutline, generateOutline, createProject, getMockupPreviewStatus, previewMediaUrl, getModelStatus, getSystemStatus, getProjects, submitErrorReportFallback, submitErrorReport, waitForHostHealth, OutlineBlockDto_$reflection, ModelStatusDto_$reflection, SystemStatusDto_$reflection, PreviewStartDto_$reflection, ProjectSummaryDto_$reflection } from "./Api.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";
import { Project_$reflection } from "./LMVideoStudio.Domain/Types.js";
import { installHooks, setConsent, shouldAutoSubmit, encodeForSubmit, LastErrorSummary, buildReport, readConsent, CaptureRequest_$reflection } from "./ErrorReporting.js";
import { Cmd_none, Cmd_batch } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { isEmpty, sortBy, map as map_1, ofArray, singleton } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { Cmd_OfAsyncWith_perform } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { AsyncHelpers_start } from "./fable_modules/Fable.Elmish.5.0.2/prelude.fs.js";
import { filter, map } from "./fable_modules/fable-library-js.4.27.0/Option.js";
import { singleton as singleton_1 } from "./fable_modules/fable-library-js.4.27.0/AsyncBuilder.js";
import { utcNow, toUnixTimeMilliseconds } from "./fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { createObj, comparePrimitives, equals } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { max } from "./fable_modules/fable-library-js.4.27.0/Double.js";
import { split, isNullOrWhiteSpace } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { map as map_2 } from "./fable_modules/fable-library-js.4.27.0/Array.js";
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
    constructor(Shell, Page, SetupWizard, OpenProjectId, HostStartup, PendingErrorReport) {
        super();
        this.Shell = Shell;
        this.Page = Page;
        this.SetupWizard = SetupWizard;
        this.OpenProjectId = OpenProjectId;
        this.HostStartup = HostStartup;
        this.PendingErrorReport = PendingErrorReport;
    }
}

export function AppModel_$reflection() {
    return record_type("LMVideoStudio.Client.App.AppModel", [], AppModel, () => [["Shell", ShellModel_$reflection()], ["Page", AppPage_$reflection()], ["SetupWizard", option_type(SetupWizardModel_$reflection())], ["OpenProjectId", option_type(class_type("System.Guid"))], ["HostStartup", HostStartup_$reflection()], ["PendingErrorReport", option_type(string_type)]]);
}

export class AppMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ShellMsg", "HubMsg", "TimelineMsg", "SettingsMsg", "ProjectsLoaded", "ProjectCreated", "ProjectOpened", "ProjectSaved", "ImportDone", "BlockFieldsSaved", "GenerateDone", "AudioImportDone", "PreviewStarted", "PreviewReady", "BakeReady", "ExistingPreviewMissing", "SettingsStatus", "ModelStatusLoaded", "SettingsActionDone", "OutlineGenerated", "OutlineApplied", "StylePackImported", "BakeStarted", "SharePackDone", "VariantSelected", "ProjectDeleted", "SetupWizardMsg", "InitSubscriptions", "HostReady", "RetryHostStartup", "ErrorCaptured", "ErrorReportSubmitted", "PendingErrorStored"];
    }
}

export function AppMsg_$reflection() {
    return union_type("LMVideoStudio.Client.App.AppMsg", [], AppMsg, () => [[["Item", ShellMsg_$reflection()]], [["Item", ProjectHubMsg_$reflection()]], [["Item", TimelineMsg_$reflection()]], [["Item", SettingsMsg_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(ProjectSummaryDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(ProjectSummaryDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [PreviewStartDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", PreviewStartDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", string_type]], [], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [SystemStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", SystemStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [ModelStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", ModelStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(OutlineBlockDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(OutlineBlockDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [class_type("System.Guid"), string_type], FSharpResult$2, () => [[["ResultValue", class_type("System.Guid")]], [["ErrorValue", string_type]]])]], [["Item", SetupWizardMsg_$reflection()]], [], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [unit_type, string_type], FSharpResult$2, () => [[["ResultValue", unit_type]], [["ErrorValue", string_type]]])]], [], [["Item", CaptureRequest_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", string_type]]]);
}

export function init() {
    return [new AppModel(Shell_init((() => {
        throw 1;
    })()), new AppPage(0, [ProjectHub_init()]), SetupWizard_isComplete() ? undefined : SetupWizard_init(), undefined, new HostStartup(0, []), undefined), Cmd_batch(ofArray([singleton((dispatch) => {
        dispatch(new AppMsg(27, []));
    }), Cmd_OfAsyncWith_perform((x) => {
        AsyncHelpers_start(x);
    }, waitForHostHealth, undefined, (Item) => (new AppMsg(28, [Item])))]))];
}

export function update(msg, model) {
    let bind$0040, msg_1, matchValue_3, st_1, matchValue_2, st, bind$0040_3, bind$0040_5, bind$0040_7, bind$0040_8, bind$0040_9, bind$0040_6, bind$0040_1, matchValue_4, t, bakeCmd, matchValue_5, jobId_2, bust, jobId_3, matchValue_6, jobId_6, bust_1, jobId_7, matchValue_10, bind$0040_10, bind$0040_11, bind$0040_12, matchValue_30, bind$0040_13, bind$0040_14, array_1, bind$0040_15, bind$0040_16, bind$0040_17, bind$0040_18, matchValue_96, st_13, bind$0040_19;
    switch (msg.tag) {
        case 30: {
            let hostHealthy;
            const matchValue = model.HostStartup;
            hostHealthy = ((matchValue.tag === 2) ? false : ((matchValue.tag === 0) ? undefined : true));
            const ollama = map((s) => s.Ollama, model.Shell.SystemStatus);
            const worker = map((s_1) => s_1.Worker, model.Shell.SystemStatus);
            const consent = readConsent();
            const matchValue_1 = buildReport(msg.fields[0], hostHealthy, ollama, worker, consent);
            if (matchValue_1.tag === 0) {
                const report = matchValue_1.fields[0];
                const summary = new LastErrorSummary(report.Message, report.Source, report.Severity, report.Timestamp);
                const model$0027 = new AppModel((bind$0040 = model.Shell, new ShellModel(bind$0040.Tab, (() => {
                    throw 1;
                })(), bind$0040.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, encodeForSubmit(report));
                if (shouldAutoSubmit(report.Severity, consent)) {
                    return [model$0027, Cmd_OfAsyncWith_perform((x) => {
                        AsyncHelpers_start(x);
                    }, (json) => singleton_1.Delay(() => singleton_1.Bind(submitErrorReport(json), (_arg) => {
                        const hostResult = _arg;
                        return (hostResult.tag === 1) ? singleton_1.Bind(submitErrorReportFallback(json), (_arg_1) => singleton_1.Return(_arg_1)) : singleton_1.Return(new FSharpResult$2(0, [hostResult.fields[0]]));
                    })), encodeForSubmit(report), (Item) => (new AppMsg(31, [Item])))];
                }
                else {
                    return [model$0027, (msg_1 = (new AppMsg(32, [encodeForSubmit(report)])), singleton((dispatch) => {
                        dispatch(msg_1);
                    }))];
                }
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 32:
            return [model, Cmd_none()];
        case 31:
            if (msg.fields[0].tag === 1) {
                return [(matchValue_3 = model.Page, (matchValue_3.tag === 2) ? ((st_1 = matchValue_3.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_1.Status, st_1.ModelStatus, `Error report failed: ${msg.fields[0].fields[0]}`, st_1.CheckingUpdates, st_1.SyncingModels, st_1.ShowFirstRunBanner, st_1.ErrorReportingConsent, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport))) : model), Cmd_none()];
            }
            else {
                return [(matchValue_2 = model.Page, (matchValue_2.tag === 2) ? ((st = matchValue_2.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st.Status, st.ModelStatus, `Error report sent: ${msg.fields[0].fields[0]}`, st.CheckingUpdates, st.SyncingModels, st.ShowFirstRunBanner, st.ErrorReportingConsent, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport))) : model), Cmd_none()];
            }
        case 28:
            if (msg.fields[0].tag === 1) {
                return [new AppModel(model.Shell, model.Page, model.SetupWizard, model.OpenProjectId, new HostStartup(2, [msg.fields[0].fields[0]]), model.PendingErrorReport), Cmd_none()];
            }
            else {
                return [new AppModel(model.Shell, model.Page, model.SetupWizard, model.OpenProjectId, new HostStartup(1, []), model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_1) => {
                    AsyncHelpers_start(x_1);
                }, getProjects, undefined, (Item_1) => (new AppMsg(4, [Item_1]))), Cmd_OfAsyncWith_perform((x_2) => {
                    AsyncHelpers_start(x_2);
                }, getSystemStatus, undefined, (Item_2) => (new AppMsg(16, [Item_2])))]))];
            }
        case 29:
            return [new AppModel(model.Shell, new AppPage(0, [ProjectHub_init()]), model.SetupWizard, model.OpenProjectId, new HostStartup(0, []), model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_3) => {
                AsyncHelpers_start(x_3);
            }, waitForHostHealth, undefined, (Item_3) => (new AppMsg(28, [Item_3])))];
        case 0:
            switch (msg.fields[0].tag) {
                case 2:
                    return [new AppModel((bind$0040_3 = model.Shell, new ShellModel(bind$0040_3.Tab, (() => {
                        throw 1;
                    })(), bind$0040_3.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                case 3:
                    return [new AppModel((bind$0040_5 = model.Shell, new ShellModel(bind$0040_5.Tab, bind$0040_5.Activity, msg.fields[0].fields[0])), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                case 0:
                    switch (msg.fields[0].fields[0].tag) {
                        case 1:
                            if (model.Page.tag === 1) {
                                return [new AppModel((bind$0040_7 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_7.Activity, bind$0040_7.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                            }
                            else {
                                return [new AppModel((bind$0040_8 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_8.Activity, bind$0040_8.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), singleton((dispatch_3) => {
                                    dispatch_3(new AppMsg(1, [new ProjectHubMsg(4, [])]));
                                })];
                            }
                        case 2:
                            return [new AppModel((bind$0040_9 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_9.Activity, bind$0040_9.SystemStatus)), new AppPage(2, [Settings_init()]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_7) => {
                                AsyncHelpers_start(x_7);
                            }, getSystemStatus, undefined, (Item_7) => (new AppMsg(16, [Item_7]))), Cmd_OfAsyncWith_perform((x_8) => {
                                AsyncHelpers_start(x_8);
                            }, getModelStatus, undefined, (Item_8) => (new AppMsg(17, [Item_8])))]))];
                        default:
                            return [new AppModel((bind$0040_6 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_6.Activity, bind$0040_6.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_6) => {
                                AsyncHelpers_start(x_6);
                            }, getProjects, undefined, (Item_6) => (new AppMsg(4, [Item_6])))];
                    }
                default: {
                    let events;
                    throw 1;
                    return [new AppModel((bind$0040_1 = model.Shell, new ShellModel(bind$0040_1.Tab, new null(), bind$0040_1.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), (matchValue_4 = model.Page, (matchValue_4.tag === 1) ? ((t = matchValue_4.fields[0], (bakeCmd = ((matchValue_5 = t.BakeJobId, (matchValue_5 != null) ? ((((matchValue_5 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "bake")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_2 = matchValue_5, (bust = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x_4) => {
                        AsyncHelpers_start(x_4);
                    }, () => singleton_1.Delay(() => singleton_1.Return(previewMediaUrl(t.Project.Id, "renders/bake/final.mp4", bust))), undefined, (Item_4) => (new AppMsg(14, [Item_4])))))) : ((((matchValue_5 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "bake")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_3 = matchValue_5, singleton((dispatch_1) => {
                        dispatch_1(new AppMsg(2, [new TimelineMsg(20, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none())), Cmd_batch(ofArray([(matchValue_6 = t.PreviewJobId, (matchValue_6 != null) ? ((((matchValue_6 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_6 = matchValue_6, (bust_1 = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x_5) => {
                        AsyncHelpers_start(x_5);
                    }, () => singleton_1.Delay(() => singleton_1.Bind(getMockupPreviewStatus(t.Project.Id), (_arg_2) => {
                        const status = _arg_2;
                        return singleton_1.Return((status.tag === 1) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust_1) : ((status.fields[0] == null) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust_1) : previewMediaUrl(t.Project.Id, status.fields[0].PreviewPath, bust_1)));
                    })), undefined, (Item_5) => (new AppMsg(13, [Item_5])))))) : ((((matchValue_6 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_7 = matchValue_6, singleton((dispatch_2) => {
                        dispatch_2(new AppMsg(2, [new TimelineMsg(19, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none()), bakeCmd]))))) : Cmd_none())];
                }
            }
        case 4:
            if (msg.fields[0].tag === 1) {
                const matchValue_9 = model.Page;
                if (matchValue_9.tag === 0) {
                    const hub_1 = matchValue_9.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_1.Summaries, hub_1.NewName, false, (matchValue_10 = model.HostStartup, (matchValue_10.tag === 0) ? undefined : ((matchValue_10.tag === 2) ? msg.fields[0].fields[0] : msg.fields[0].fields[0])), hub_1.BriefText, hub_1.OutlineProjectId, hub_1.OutlineBlocks, hub_1.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_8 = model.Page;
                if (matchValue_8.tag === 0) {
                    const hub = matchValue_8.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(msg.fields[0].fields[0], hub.NewName, false, undefined, hub.BriefText, hub.OutlineProjectId, hub.OutlineBlocks, hub.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 1:
            switch (msg.fields[0].tag) {
                case 0: {
                    const matchValue_12 = model.Page;
                    if (matchValue_12.tag === 0) {
                        const hub_3 = matchValue_12.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_3.Summaries, msg.fields[0].fields[0], hub_3.Loading, hub_3.Error, hub_3.BriefText, hub_3.OutlineProjectId, hub_3.OutlineBlocks, hub_3.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_13 = model.Page;
                    if (matchValue_13.tag === 0) {
                        const hub_4 = matchValue_13.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_4.Summaries, hub_4.NewName, true, hub_4.Error, hub_4.BriefText, hub_4.OutlineProjectId, hub_4.OutlineBlocks, hub_4.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_10) => {
                            AsyncHelpers_start(x_10);
                        }, () => createProject(hub_4.NewName), undefined, (Item_10) => (new AppMsg(5, [Item_10])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_15 = model.Page;
                    if (matchValue_15.tag === 0) {
                        const hub_6 = matchValue_15.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_6.Summaries, hub_6.NewName, hub_6.Loading, hub_6.Error, hub_6.BriefText, msg.fields[0].fields[0], undefined, hub_6.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_16 = model.Page;
                    if (matchValue_16.tag === 0) {
                        const hub_7 = matchValue_16.fields[0];
                        const matchValue_17 = hub_7.OutlineProjectId;
                        if (matchValue_17 != null) {
                            const projectId = matchValue_17;
                            return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_7.Summaries, hub_7.NewName, hub_7.Loading, undefined, hub_7.BriefText, hub_7.OutlineProjectId, hub_7.OutlineBlocks, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_11) => {
                                AsyncHelpers_start(x_11);
                            }, () => generateOutline(projectId, hub_7.BriefText), undefined, (Item_11) => (new AppMsg(19, [Item_11])))];
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
                    const matchValue_20 = model.Page;
                    if (matchValue_20.tag === 0) {
                        const hub_10 = matchValue_20.fields[0];
                        const matchValue_21 = hub_10.OutlineProjectId;
                        const matchValue_22 = hub_10.OutlineBlocks;
                        let matchResult, blocks_1, projectId_1;
                        if (matchValue_21 != null) {
                            if (matchValue_22 != null) {
                                matchResult = 0;
                                blocks_1 = matchValue_22;
                                projectId_1 = matchValue_21;
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
                                return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_10.Summaries, hub_10.NewName, hub_10.Loading, hub_10.Error, hub_10.BriefText, hub_10.OutlineProjectId, hub_10.OutlineBlocks, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_12) => {
                                    AsyncHelpers_start(x_12);
                                }, () => applyOutline(projectId_1, hub_10.BriefText, blocks_1), undefined, (Item_12) => (new AppMsg(20, [Item_12])))];
                            default:
                                return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_25 = model.Page;
                    if (matchValue_25.tag === 0) {
                        const hub_12 = matchValue_25.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_12.Summaries, hub_12.NewName, hub_12.Loading, hub_12.Error, hub_12.BriefText, hub_12.OutlineProjectId, undefined, hub_12.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_26 = model.Page;
                    if (matchValue_26.tag === 0) {
                        const hub_13 = matchValue_26.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_13.Summaries, hub_13.NewName, hub_13.Loading, hub_13.Error, msg.fields[0].fields[0], hub_13.OutlineProjectId, hub_13.OutlineBlocks, hub_13.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_27 = model.Page;
                    if (matchValue_27.tag === 0) {
                        const hub_14 = matchValue_27.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_14.Summaries, hub_14.NewName, true, hub_14.Error, hub_14.BriefText, hub_14.OutlineProjectId, hub_14.OutlineBlocks, hub_14.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_13) => {
                            AsyncHelpers_start(x_13);
                        }, () => getProject(msg.fields[0].fields[0]), undefined, (Item_13) => (new AppMsg(6, [Item_13])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_29 = model.Page;
                    let matchResult_1, hub_16, t_2;
                    switch (matchValue_29.tag) {
                        case 0: {
                            matchResult_1 = 0;
                            hub_16 = matchValue_29.fields[0];
                            break;
                        }
                        case 1: {
                            if (matchValue_29.fields[0].Project.Id === msg.fields[0].fields[0]) {
                                matchResult_1 = 1;
                                t_2 = matchValue_29.fields[0];
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
                            return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_16.Summaries, hub_16.NewName, true, undefined, hub_16.BriefText, hub_16.OutlineProjectId, hub_16.OutlineBlocks, hub_16.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_15) => {
                                AsyncHelpers_start(x_15);
                            }, () => deleteProject(msg.fields[0].fields[0]), undefined, (Item_14) => (new AppMsg(25, [Item_14])))];
                        case 1:
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_2.Project, true, t_2.Generating, t_2.Previewing, t_2.Baking, t_2.PreviewUrl, t_2.BakeUrl, t_2.PreviewJobId, t_2.BakeJobId, undefined, t_2.DragIndex, t_2.SelectedBlockId, t_2.VoiceoverDraft, t_2.ImagePromptDraft, t_2.MoodTagsDraft, t_2.CrossfadeDurationDraft, t_2.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_16) => {
                                AsyncHelpers_start(x_16);
                            }, () => deleteProject(msg.fields[0].fields[0]), undefined, (Item_15) => (new AppMsg(25, [Item_15])))];
                        default:
                            return [model, Cmd_none()];
                    }
                }
                default: {
                    const matchValue_11 = model.Page;
                    if (matchValue_11.tag === 0) {
                        const hub_2 = matchValue_11.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_2.Summaries, hub_2.NewName, true, hub_2.Error, hub_2.BriefText, hub_2.OutlineProjectId, hub_2.OutlineBlocks, hub_2.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_9) => {
                            AsyncHelpers_start(x_9);
                        }, getProjects, undefined, (Item_9) => (new AppMsg(4, [Item_9])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
            }
        case 5:
            if (msg.fields[0].tag === 1) {
                const matchValue_14 = model.Page;
                if (matchValue_14.tag === 0) {
                    const hub_5 = matchValue_14.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_5.Summaries, hub_5.NewName, false, msg.fields[0].fields[0], hub_5.BriefText, hub_5.OutlineProjectId, hub_5.OutlineBlocks, hub_5.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_10 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_10.Activity, bind$0040_10.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
        case 19:
            if (msg.fields[0].tag === 1) {
                const matchValue_19 = model.Page;
                if (matchValue_19.tag === 0) {
                    const hub_9 = matchValue_19.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_9.Summaries, hub_9.NewName, hub_9.Loading, msg.fields[0].fields[0], hub_9.BriefText, hub_9.OutlineProjectId, hub_9.OutlineBlocks, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_18 = model.Page;
                if (matchValue_18.tag === 0) {
                    const hub_8 = matchValue_18.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_8.Summaries, hub_8.NewName, hub_8.Loading, hub_8.Error, hub_8.BriefText, hub_8.OutlineProjectId, msg.fields[0].fields[0], false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 20:
            if (msg.fields[0].tag === 1) {
                const matchValue_24 = model.Page;
                if (matchValue_24.tag === 0) {
                    const hub_11 = matchValue_24.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_11.Summaries, hub_11.NewName, hub_11.Loading, msg.fields[0].fields[0], hub_11.BriefText, hub_11.OutlineProjectId, hub_11.OutlineBlocks, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_11 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_11.Activity, bind$0040_11.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
        case 6:
            if (msg.fields[0].tag === 1) {
                const matchValue_28 = model.Page;
                if (matchValue_28.tag === 0) {
                    const hub_15 = matchValue_28.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_15.Summaries, hub_15.NewName, false, msg.fields[0].fields[0], hub_15.BriefText, hub_15.OutlineProjectId, hub_15.OutlineBlocks, hub_15.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                return [new AppModel((bind$0040_12 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_12.Activity, bind$0040_12.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_14) => {
                    AsyncHelpers_start(x_14);
                }, () => singleton_1.Delay(() => {
                    const bust_2 = toUnixTimeMilliseconds(utcNow());
                    return singleton_1.Bind(getMockupPreviewStatus(msg.fields[0].fields[0].Id), (_arg_3) => {
                        const status_1 = _arg_3;
                        return singleton_1.Return((status_1.tag === 1) ? undefined : ((status_1.fields[0] == null) ? undefined : previewMediaUrl(msg.fields[0].fields[0].Id, status_1.fields[0].PreviewPath, bust_2)));
                    });
                }), undefined, (_arg_4) => {
                    if (_arg_4 == null) {
                        return new AppMsg(15, []);
                    }
                    else {
                        return new AppMsg(13, [_arg_4]);
                    }
                })];
            }
        case 25:
            if (msg.fields[0].tag === 1) {
                const matchValue_32 = model.Page;
                switch (matchValue_32.tag) {
                    case 0: {
                        const hub_18 = matchValue_32.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_18.Summaries, hub_18.NewName, false, msg.fields[0].fields[0], hub_18.BriefText, hub_18.OutlineProjectId, hub_18.OutlineBlocks, hub_18.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    case 1: {
                        const t_4 = matchValue_32.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_4.Project, false, t_4.Generating, t_4.Previewing, t_4.Baking, t_4.PreviewUrl, t_4.BakeUrl, t_4.PreviewJobId, t_4.BakeJobId, msg.fields[0].fields[0], t_4.DragIndex, t_4.SelectedBlockId, t_4.VoiceoverDraft, t_4.ImagePromptDraft, t_4.MoodTagsDraft, t_4.CrossfadeDurationDraft, t_4.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    default:
                        return [model, Cmd_none()];
                }
            }
            else if (equals(model.OpenProjectId, msg.fields[0].fields[0]) ? true : ((matchValue_30 = model.Page, (matchValue_30.tag === 1) && (matchValue_30.fields[0].Project.Id === msg.fields[0].fields[0])))) {
                return [new AppModel((bind$0040_13 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_13.Activity, bind$0040_13.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_17) => {
                    AsyncHelpers_start(x_17);
                }, getProjects, undefined, (Item_16) => (new AppMsg(4, [Item_16])))];
            }
            else {
                const matchValue_31 = model.Page;
                if (matchValue_31.tag === 0) {
                    const hub_17 = matchValue_31.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_17.Summaries, hub_17.NewName, true, undefined, hub_17.BriefText, filter((y) => (msg.fields[0].fields[0] !== y), hub_17.OutlineProjectId), hub_17.OutlineBlocks, hub_17.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_18) => {
                        AsyncHelpers_start(x_18);
                    }, getProjects, undefined, (Item_17) => (new AppMsg(4, [Item_17])))];
                }
                else {
                    return [model, Cmd_OfAsyncWith_perform((x_19) => {
                        AsyncHelpers_start(x_19);
                    }, getProjects, undefined, (Item_18) => (new AppMsg(4, [Item_18])))];
                }
            }
        case 2:
            switch (msg.fields[0].tag) {
                case 22:
                    return [new AppModel((bind$0040_14 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_14.Activity, bind$0040_14.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_20) => {
                        AsyncHelpers_start(x_20);
                    }, getProjects, undefined, (Item_19) => (new AppMsg(4, [Item_19])))];
                case 2: {
                    const matchValue_33 = model.Page;
                    if (matchValue_33.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveUp(matchValue_33.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_34 = model.Page;
                    if (matchValue_34.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveDown(matchValue_34.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_35 = model.Page;
                    if (matchValue_35.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_setDragIndex(matchValue_35.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_36 = model.Page;
                    if (matchValue_36.tag === 1) {
                        const t_8 = matchValue_36.fields[0];
                        const matchValue_37 = t_8.DragIndex;
                        if (matchValue_37 == null) {
                            return [model, Cmd_none()];
                        }
                        else {
                            const reordered = StoryboardTimeline_reorderByDrag(t_8, matchValue_37, msg.fields[0].fields[0]);
                            const ids = map_1((b_1) => b_1.Id, sortBy((b) => b.Order, reordered.Project.Blocks, {
                                Compare: comparePrimitives,
                            }));
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(reordered.Project, true, reordered.Generating, reordered.Previewing, reordered.Baking, reordered.PreviewUrl, reordered.BakeUrl, reordered.PreviewJobId, reordered.BakeJobId, reordered.Error, reordered.DragIndex, reordered.SelectedBlockId, reordered.VoiceoverDraft, reordered.ImagePromptDraft, reordered.MoodTagsDraft, reordered.CrossfadeDurationDraft, reordered.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_22) => {
                                AsyncHelpers_start(x_22);
                            }, () => reorderBlocks(reordered.Project.Id, ids), undefined, (Item_20) => (new AppMsg(7, [Item_20])))];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 13: {
                    const matchValue_38 = model.Page;
                    if (matchValue_38.tag === 1) {
                        const t_9 = matchValue_38.fields[0];
                        const matchValue_39 = t_9.SelectedBlockId;
                        if (matchValue_39 != null) {
                            const blockId = matchValue_39;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_9.Project, true, t_9.Generating, t_9.Previewing, t_9.Baking, t_9.PreviewUrl, t_9.BakeUrl, t_9.PreviewJobId, t_9.BakeJobId, t_9.Error, t_9.DragIndex, t_9.SelectedBlockId, t_9.VoiceoverDraft, t_9.ImagePromptDraft, t_9.MoodTagsDraft, t_9.CrossfadeDurationDraft, t_9.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_23) => {
                                AsyncHelpers_start(x_23);
                            }, () => selectBlockThumbnail(t_9.Project.Id, blockId, msg.fields[0].fields[0]), undefined, (Item_21) => (new AppMsg(24, [Item_21])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 17: {
                    const matchValue_40 = model.Page;
                    if (matchValue_40.tag === 1) {
                        const t_10 = matchValue_40.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_10.Project, true, t_10.Generating, t_10.Previewing, t_10.Baking, t_10.PreviewUrl, t_10.BakeUrl, t_10.PreviewJobId, t_10.BakeJobId, t_10.Error, t_10.DragIndex, t_10.SelectedBlockId, t_10.VoiceoverDraft, t_10.ImagePromptDraft, t_10.MoodTagsDraft, t_10.CrossfadeDurationDraft, t_10.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_24) => {
                            AsyncHelpers_start(x_24);
                        }, () => exportSharePack(t_10.Project.Id), undefined, (Item_22) => (new AppMsg(23, [Item_22])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 21: {
                    const matchValue_45 = model.Page;
                    if (matchValue_45.tag === 1) {
                        const t_15 = matchValue_45.fields[0];
                        const ids_1 = map_1((b_3) => b_3.Id, sortBy((b_2) => b_2.Order, t_15.Project.Blocks, {
                            Compare: comparePrimitives,
                        }));
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_15.Project, true, t_15.Generating, t_15.Previewing, t_15.Baking, t_15.PreviewUrl, t_15.BakeUrl, t_15.PreviewJobId, t_15.BakeJobId, t_15.Error, t_15.DragIndex, t_15.SelectedBlockId, t_15.VoiceoverDraft, t_15.ImagePromptDraft, t_15.MoodTagsDraft, t_15.CrossfadeDurationDraft, t_15.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_26) => {
                            AsyncHelpers_start(x_26);
                        }, () => reorderBlocks(t_15.Project.Id, ids_1), undefined, (Item_23) => (new AppMsg(7, [Item_23])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_48 = model.Page;
                    if (matchValue_48.tag === 1) {
                        const t_17 = matchValue_48.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_17.Project, true, t_17.Generating, t_17.Previewing, t_17.Baking, t_17.PreviewUrl, t_17.BakeUrl, t_17.PreviewJobId, t_17.BakeJobId, t_17.Error, t_17.DragIndex, t_17.SelectedBlockId, t_17.VoiceoverDraft, t_17.ImagePromptDraft, t_17.MoodTagsDraft, t_17.CrossfadeDurationDraft, t_17.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_27) => {
                            AsyncHelpers_start(x_27);
                        }, () => importStylePackLogo(t_17.Project.Id, msg.fields[0].fields[0]), undefined, (Item_24) => (new AppMsg(21, [Item_24])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 16: {
                    const matchValue_51 = model.Page;
                    if (matchValue_51.tag === 1) {
                        const t_20 = matchValue_51.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_20.Project, t_20.Saving, t_20.Generating, t_20.Previewing, true, t_20.PreviewUrl, t_20.BakeUrl, t_20.PreviewJobId, t_20.BakeJobId, undefined, t_20.DragIndex, t_20.SelectedBlockId, t_20.VoiceoverDraft, t_20.ImagePromptDraft, t_20.MoodTagsDraft, t_20.CrossfadeDurationDraft, t_20.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_28) => {
                            AsyncHelpers_start(x_28);
                        }, () => startBake(t_20.Project.Id), undefined, (Item_25) => (new AppMsg(22, [Item_25])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 20: {
                    const matchValue_56 = model.Page;
                    if (matchValue_56.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError(msg.fields[0].fields[0], matchValue_56.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 0: {
                    const matchValue_57 = model.Page;
                    if (matchValue_57.tag === 1) {
                        const t_25 = matchValue_57.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_25.Project, true, t_25.Generating, t_25.Previewing, t_25.Baking, t_25.PreviewUrl, t_25.BakeUrl, t_25.PreviewJobId, t_25.BakeJobId, t_25.Error, t_25.DragIndex, t_25.SelectedBlockId, t_25.VoiceoverDraft, t_25.ImagePromptDraft, t_25.MoodTagsDraft, t_25.CrossfadeDurationDraft, t_25.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_29) => {
                            AsyncHelpers_start(x_29);
                        }, () => importBlockImage(t_25.Project.Id, msg.fields[0].fields[0]), undefined, (Item_26) => (new AppMsg(8, [Item_26])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_60 = model.Page;
                    if (matchValue_60.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_selectBlock(matchValue_60.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    const matchValue_61 = model.Page;
                    if (matchValue_61.tag === 1) {
                        const t_28 = matchValue_61.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_28.Project, t_28.Saving, t_28.Generating, t_28.Previewing, t_28.Baking, t_28.PreviewUrl, t_28.BakeUrl, t_28.PreviewJobId, t_28.BakeJobId, t_28.Error, t_28.DragIndex, t_28.SelectedBlockId, msg.fields[0].fields[0], t_28.ImagePromptDraft, t_28.MoodTagsDraft, t_28.CrossfadeDurationDraft, t_28.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_62 = model.Page;
                    if (matchValue_62.tag === 1) {
                        const t_29 = matchValue_62.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_29.Project, t_29.Saving, t_29.Generating, t_29.Previewing, t_29.Baking, t_29.PreviewUrl, t_29.BakeUrl, t_29.PreviewJobId, t_29.BakeJobId, t_29.Error, t_29.DragIndex, t_29.SelectedBlockId, t_29.VoiceoverDraft, msg.fields[0].fields[0], t_29.MoodTagsDraft, t_29.CrossfadeDurationDraft, t_29.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_63 = model.Page;
                    if (matchValue_63.tag === 1) {
                        const t_30 = matchValue_63.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_30.Project, t_30.Saving, t_30.Generating, t_30.Previewing, t_30.Baking, t_30.PreviewUrl, t_30.BakeUrl, t_30.PreviewJobId, t_30.BakeJobId, t_30.Error, t_30.DragIndex, t_30.SelectedBlockId, t_30.VoiceoverDraft, t_30.ImagePromptDraft, msg.fields[0].fields[0], t_30.CrossfadeDurationDraft, t_30.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 10: {
                    const matchValue_64 = model.Page;
                    if (matchValue_64.tag === 1) {
                        const t_31 = matchValue_64.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_31.Project, t_31.Saving, t_31.Generating, t_31.Previewing, t_31.Baking, t_31.PreviewUrl, t_31.BakeUrl, t_31.PreviewJobId, t_31.BakeJobId, t_31.Error, t_31.DragIndex, t_31.SelectedBlockId, t_31.VoiceoverDraft, t_31.ImagePromptDraft, t_31.MoodTagsDraft, max(0, msg.fields[0].fields[0]), t_31.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 11: {
                    const matchValue_65 = model.Page;
                    if (matchValue_65.tag === 1) {
                        const t_32 = matchValue_65.fields[0];
                        const matchValue_66 = t_32.SelectedBlockId;
                        if (matchValue_66 != null) {
                            const blockId_1 = matchValue_66;
                            const prompt = isNullOrWhiteSpace(t_32.ImagePromptDraft) ? undefined : t_32.ImagePromptDraft;
                            let moodTags;
                            const tags = ofArray((array_1 = map_2((s_3) => s_3.trim(), split(t_32.MoodTagsDraft, [","], undefined, 0)), array_1.filter((s_4) => !isNullOrWhiteSpace(s_4))));
                            moodTags = (isEmpty(tags) ? undefined : tags);
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_32.Project, true, t_32.Generating, t_32.Previewing, t_32.Baking, t_32.PreviewUrl, t_32.BakeUrl, t_32.PreviewJobId, t_32.BakeJobId, t_32.Error, t_32.DragIndex, t_32.SelectedBlockId, t_32.VoiceoverDraft, t_32.ImagePromptDraft, t_32.MoodTagsDraft, t_32.CrossfadeDurationDraft, t_32.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_30) => {
                                AsyncHelpers_start(x_30);
                            }, () => updateBlock(t_32.Project.Id, blockId_1, t_32.VoiceoverDraft, prompt, t_32.CrossfadeDurationDraft, moodTags), undefined, (Item_27) => (new AppMsg(9, [Item_27])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 12: {
                    const matchValue_69 = model.Page;
                    if (matchValue_69.tag === 1) {
                        const t_35 = matchValue_69.fields[0];
                        const matchValue_70 = t_35.SelectedBlockId;
                        if (matchValue_70 != null) {
                            const blockId_2 = matchValue_70;
                            const prompt_1 = isNullOrWhiteSpace(t_35.ImagePromptDraft) ? undefined : t_35.ImagePromptDraft;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_35.Project, t_35.Saving, true, t_35.Previewing, t_35.Baking, t_35.PreviewUrl, t_35.BakeUrl, t_35.PreviewJobId, t_35.BakeJobId, undefined, t_35.DragIndex, t_35.SelectedBlockId, t_35.VoiceoverDraft, t_35.ImagePromptDraft, t_35.MoodTagsDraft, t_35.CrossfadeDurationDraft, t_35.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_31) => {
                                AsyncHelpers_start(x_31);
                            }, () => generateBlockThumbnail(t_35.Project.Id, blockId_2, prompt_1, 3), undefined, (Item_28) => (new AppMsg(10, [Item_28])))];
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
                    const matchValue_73 = model.Page;
                    if (matchValue_73.tag === 1) {
                        const t_38 = matchValue_73.fields[0];
                        const matchValue_74 = t_38.SelectedBlockId;
                        if (matchValue_74 != null) {
                            const blockId_3 = matchValue_74;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_38.Project, true, t_38.Generating, t_38.Previewing, t_38.Baking, t_38.PreviewUrl, t_38.BakeUrl, t_38.PreviewJobId, t_38.BakeJobId, t_38.Error, t_38.DragIndex, t_38.SelectedBlockId, t_38.VoiceoverDraft, t_38.ImagePromptDraft, t_38.MoodTagsDraft, t_38.CrossfadeDurationDraft, t_38.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_32) => {
                                AsyncHelpers_start(x_32);
                            }, () => importBlockAudio(t_38.Project.Id, blockId_3, msg.fields[0].fields[0]), undefined, (Item_29) => (new AppMsg(11, [Item_29])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 15: {
                    const matchValue_77 = model.Page;
                    if (matchValue_77.tag === 1) {
                        const t_41 = matchValue_77.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_41.Project, t_41.Saving, t_41.Generating, true, t_41.Baking, t_41.PreviewUrl, t_41.BakeUrl, t_41.PreviewJobId, t_41.BakeJobId, undefined, t_41.DragIndex, t_41.SelectedBlockId, t_41.VoiceoverDraft, t_41.ImagePromptDraft, t_41.MoodTagsDraft, t_41.CrossfadeDurationDraft, t_41.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_33) => {
                            AsyncHelpers_start(x_33);
                        }, () => refreshMockupPreview(t_41.Project.Id), undefined, (Item_30) => (new AppMsg(12, [Item_30])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 19: {
                    const matchValue_81 = model.Page;
                    if (matchValue_81.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_81.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                default:
                    throw new Error("Match failure: LMVideoStudio.Client.App.AppMsg");
            }
        case 24:
            if (msg.fields[0].tag === 1) {
                const matchValue_42 = model.Page;
                if (matchValue_42.tag === 1) {
                    const t_12 = matchValue_42.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_12.Project, false, t_12.Generating, t_12.Previewing, t_12.Baking, t_12.PreviewUrl, t_12.BakeUrl, t_12.PreviewJobId, t_12.BakeJobId, msg.fields[0].fields[0], t_12.DragIndex, t_12.SelectedBlockId, t_12.VoiceoverDraft, t_12.ImagePromptDraft, t_12.MoodTagsDraft, t_12.CrossfadeDurationDraft, t_12.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_41 = model.Page;
                if (matchValue_41.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_41.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 23:
            if (msg.fields[0].tag === 1) {
                const matchValue_44 = model.Page;
                if (matchValue_44.tag === 1) {
                    const t_14 = matchValue_44.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_14.Project, false, t_14.Generating, t_14.Previewing, t_14.Baking, t_14.PreviewUrl, t_14.BakeUrl, t_14.PreviewJobId, t_14.BakeJobId, msg.fields[0].fields[0], t_14.DragIndex, t_14.SelectedBlockId, t_14.VoiceoverDraft, t_14.ImagePromptDraft, t_14.MoodTagsDraft, t_14.CrossfadeDurationDraft, t_14.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_43 = model.Page;
                if (matchValue_43.tag === 1) {
                    const t_13 = matchValue_43.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_13.Project, false, t_13.Generating, t_13.Previewing, t_13.Baking, t_13.PreviewUrl, t_13.BakeUrl, t_13.PreviewJobId, t_13.BakeJobId, `Share pack exported: ${msg.fields[0].fields[0]}`, t_13.DragIndex, t_13.SelectedBlockId, t_13.VoiceoverDraft, t_13.ImagePromptDraft, t_13.MoodTagsDraft, t_13.CrossfadeDurationDraft, t_13.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 7:
            if (msg.fields[0].tag === 1) {
                const matchValue_47 = model.Page;
                if (matchValue_47.tag === 1) {
                    const t_16 = matchValue_47.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_16.Project, false, t_16.Generating, t_16.Previewing, t_16.Baking, t_16.PreviewUrl, t_16.BakeUrl, t_16.PreviewJobId, t_16.BakeJobId, msg.fields[0].fields[0], t_16.DragIndex, t_16.SelectedBlockId, t_16.VoiceoverDraft, t_16.ImagePromptDraft, t_16.MoodTagsDraft, t_16.CrossfadeDurationDraft, t_16.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_15 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_15.Project, false, bind$0040_15.Generating, bind$0040_15.Previewing, bind$0040_15.Baking, bind$0040_15.PreviewUrl, bind$0040_15.BakeUrl, bind$0040_15.PreviewJobId, bind$0040_15.BakeJobId, undefined, bind$0040_15.DragIndex, bind$0040_15.SelectedBlockId, bind$0040_15.VoiceoverDraft, bind$0040_15.ImagePromptDraft, bind$0040_15.MoodTagsDraft, bind$0040_15.CrossfadeDurationDraft, bind$0040_15.SharePack))]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 21:
            if (msg.fields[0].tag === 1) {
                const matchValue_50 = model.Page;
                if (matchValue_50.tag === 1) {
                    const t_19 = matchValue_50.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_19.Project, false, t_19.Generating, t_19.Previewing, t_19.Baking, t_19.PreviewUrl, t_19.BakeUrl, t_19.PreviewJobId, t_19.BakeJobId, msg.fields[0].fields[0], t_19.DragIndex, t_19.SelectedBlockId, t_19.VoiceoverDraft, t_19.ImagePromptDraft, t_19.MoodTagsDraft, t_19.CrossfadeDurationDraft, t_19.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_49 = model.Page;
                if (matchValue_49.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_49.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 22:
            if (msg.fields[0].tag === 1) {
                const matchValue_54 = model.Page;
                if (matchValue_54.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError(msg.fields[0].fields[0], matchValue_54.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_52 = model.Page;
                if (matchValue_52.tag === 1) {
                    const t_21 = matchValue_52.fields[0];
                    let matchValue_53;
                    let outArg = "00000000-0000-0000-0000-000000000000";
                    matchValue_53 = [tryParse(msg.fields[0].fields[0], new FSharpRef(() => outArg, (v) => {
                        outArg = v;
                    })), outArg];
                    if (matchValue_53[0]) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeStarted(matchValue_53[1], t_21)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError("Invalid bake job id", t_21)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 14: {
            const matchValue_55 = model.Page;
            if (matchValue_55.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeUrl(msg.fields[0], matchValue_55.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 8:
            if (msg.fields[0].tag === 1) {
                const matchValue_59 = model.Page;
                if (matchValue_59.tag === 1) {
                    const t_26 = matchValue_59.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_26.Project, false, t_26.Generating, t_26.Previewing, t_26.Baking, t_26.PreviewUrl, t_26.BakeUrl, t_26.PreviewJobId, t_26.BakeJobId, msg.fields[0].fields[0], t_26.DragIndex, t_26.SelectedBlockId, t_26.VoiceoverDraft, t_26.ImagePromptDraft, t_26.MoodTagsDraft, t_26.CrossfadeDurationDraft, t_26.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_16 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_16.Project, false, bind$0040_16.Generating, bind$0040_16.Previewing, bind$0040_16.Baking, bind$0040_16.PreviewUrl, bind$0040_16.BakeUrl, bind$0040_16.PreviewJobId, bind$0040_16.BakeJobId, undefined, bind$0040_16.DragIndex, bind$0040_16.SelectedBlockId, bind$0040_16.VoiceoverDraft, bind$0040_16.ImagePromptDraft, bind$0040_16.MoodTagsDraft, bind$0040_16.CrossfadeDurationDraft, bind$0040_16.SharePack))]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 9:
            if (msg.fields[0].tag === 1) {
                const matchValue_68 = model.Page;
                if (matchValue_68.tag === 1) {
                    const t_34 = matchValue_68.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_34.Project, false, t_34.Generating, t_34.Previewing, t_34.Baking, t_34.PreviewUrl, t_34.BakeUrl, t_34.PreviewJobId, t_34.BakeJobId, msg.fields[0].fields[0], t_34.DragIndex, t_34.SelectedBlockId, t_34.VoiceoverDraft, t_34.ImagePromptDraft, t_34.MoodTagsDraft, t_34.CrossfadeDurationDraft, t_34.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_67 = model.Page;
                if (matchValue_67.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_67.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 10:
            if (msg.fields[0].tag === 1) {
                const matchValue_72 = model.Page;
                if (matchValue_72.tag === 1) {
                    const t_37 = matchValue_72.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_37.Project, t_37.Saving, false, t_37.Previewing, t_37.Baking, t_37.PreviewUrl, t_37.BakeUrl, t_37.PreviewJobId, t_37.BakeJobId, msg.fields[0].fields[0], t_37.DragIndex, t_37.SelectedBlockId, t_37.VoiceoverDraft, t_37.ImagePromptDraft, t_37.MoodTagsDraft, t_37.CrossfadeDurationDraft, t_37.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_71 = model.Page;
                if (matchValue_71.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_71.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 11:
            if (msg.fields[0].tag === 1) {
                const matchValue_76 = model.Page;
                if (matchValue_76.tag === 1) {
                    const t_40 = matchValue_76.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_40.Project, false, t_40.Generating, t_40.Previewing, t_40.Baking, t_40.PreviewUrl, t_40.BakeUrl, t_40.PreviewJobId, t_40.BakeJobId, msg.fields[0].fields[0], t_40.DragIndex, t_40.SelectedBlockId, t_40.VoiceoverDraft, t_40.ImagePromptDraft, t_40.MoodTagsDraft, t_40.CrossfadeDurationDraft, t_40.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_75 = model.Page;
                if (matchValue_75.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_75.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 12:
            if (msg.fields[0].tag === 1) {
                const matchValue_79 = model.Page;
                if (matchValue_79.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_79.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_78 = model.Page;
                if (matchValue_78.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewStarted(msg.fields[0].fields[0].JobId, matchValue_78.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 13: {
            const matchValue_80 = model.Page;
            if (matchValue_80.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewUrl(msg.fields[0], matchValue_80.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
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
                const model$0027_4 = new AppModel((bind$0040_17 = model.Shell, new ShellModel(bind$0040_17.Tab, bind$0040_17.Activity, msg.fields[0].fields[0])), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport);
                const matchValue_82 = model.Page;
                if (matchValue_82.tag === 2) {
                    const st_2 = matchValue_82.fields[0];
                    return [new AppModel(model$0027_4.Shell, new AppPage(2, [new SettingsModel(msg.fields[0].fields[0], st_2.ModelStatus, st_2.Message, st_2.CheckingUpdates, st_2.SyncingModels, st_2.ShowFirstRunBanner, st_2.ErrorReportingConsent, st_2.ErrorReportingBusy)]), model$0027_4.SetupWizard, model$0027_4.OpenProjectId, model$0027_4.HostStartup, model$0027_4.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model$0027_4, Cmd_none()];
                }
            }
        case 3:
            switch (msg.fields[0].tag) {
                case 0: {
                    const matchValue_83 = model.Page;
                    if (matchValue_83.tag === 2) {
                        const st_3 = matchValue_83.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_3.Status, st_3.ModelStatus, st_3.Message, true, st_3.SyncingModels, st_3.ShowFirstRunBanner, st_3.ErrorReportingConsent, st_3.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_35) => {
                            AsyncHelpers_start(x_35);
                        }, checkForUpdates, undefined, (r_1) => (new AppMsg(18, [(r_1.tag === 1) ? r_1.fields[0] : r_1.fields[0]])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_85 = model.Page;
                    if (matchValue_85.tag === 2) {
                        const st_5 = matchValue_85.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_5.Status, st_5.ModelStatus, st_5.Message, st_5.CheckingUpdates, true, st_5.ShowFirstRunBanner, st_5.ErrorReportingConsent, st_5.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_36) => {
                            AsyncHelpers_start(x_36);
                        }, getModelStatus, undefined, (Item_32) => (new AppMsg(17, [Item_32])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_86 = model.Page;
                    if (matchValue_86.tag === 2) {
                        const st_6 = matchValue_86.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_6.Status, st_6.ModelStatus, st_6.Message, st_6.CheckingUpdates, true, st_6.ShowFirstRunBanner, st_6.ErrorReportingConsent, st_6.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_37) => {
                            AsyncHelpers_start(x_37);
                        }, () => syncModels(false), undefined, (r_2) => (new AppMsg(18, [(r_2.tag === 1) ? r_2.fields[0] : "Model check started"]))), Cmd_OfAsyncWith_perform((x_38) => {
                            AsyncHelpers_start(x_38);
                        }, getModelStatus, undefined, (Item_33) => (new AppMsg(17, [Item_33])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_87 = model.Page;
                    if (matchValue_87.tag === 2) {
                        const st_7 = matchValue_87.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_7.Status, st_7.ModelStatus, st_7.Message, st_7.CheckingUpdates, true, st_7.ShowFirstRunBanner, st_7.ErrorReportingConsent, st_7.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_39) => {
                            AsyncHelpers_start(x_39);
                        }, () => syncModels(true), undefined, (r_3) => (new AppMsg(18, [(r_3.tag === 1) ? r_3.fields[0] : "Model sync/pull started"]))), Cmd_OfAsyncWith_perform((x_40) => {
                            AsyncHelpers_start(x_40);
                        }, getModelStatus, undefined, (Item_34) => (new AppMsg(17, [Item_34])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    Settings_markBootstrapStarted();
                    const matchValue_88 = model.Page;
                    if (matchValue_88.tag === 2) {
                        const st_8 = matchValue_88.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_8.Status, st_8.ModelStatus, st_8.Message, st_8.CheckingUpdates, st_8.SyncingModels, false, st_8.ErrorReportingConsent, st_8.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_89 = model.Page;
                    if (matchValue_89.tag === 2) {
                        const st_9 = matchValue_89.fields[0];
                        Settings_markBootstrapStarted();
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_9.Status, st_9.ModelStatus, st_9.Message, st_9.CheckingUpdates, st_9.SyncingModels, false, st_9.ErrorReportingConsent, st_9.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_41) => {
                            AsyncHelpers_start(x_41);
                        }, runBootstrap, undefined, () => (new AppMsg(18, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_42) => {
                            AsyncHelpers_start(x_42);
                        }, getSystemStatus, undefined, (Item_35) => (new AppMsg(16, [Item_35])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_43) => {
                            AsyncHelpers_start(x_43);
                        }, runRepair, undefined, () => (new AppMsg(18, ["Repair started"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                case 9: {
                    const matchValue_91 = model.Page;
                    if (matchValue_91.tag === 2) {
                        const st_10 = matchValue_91.fields[0];
                        const next = !st_10.ErrorReportingConsent;
                        setConsent(next);
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_10.Status, st_10.ModelStatus, st_10.Message, st_10.CheckingUpdates, st_10.SyncingModels, st_10.ShowFirstRunBanner, next, st_10.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 10: {
                    const matchValue_92 = model.Page;
                    if (matchValue_92.tag === 2) {
                        const st_11 = matchValue_92.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_11.Status, st_11.ModelStatus, st_11.Message, st_11.CheckingUpdates, st_11.SyncingModels, st_11.ShowFirstRunBanner, st_11.ErrorReportingConsent, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_44) => {
                            AsyncHelpers_start(x_44);
                        }, flushErrorReports, undefined, (r_4) => (new AppMsg(18, [(r_4.tag === 1) ? r_4.fields[0] : (`Queued reports flushed: ${r_4.fields[0]}`)])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 11: {
                    const matchValue_93 = model.PendingErrorReport;
                    if (matchValue_93 != null) {
                        const json_1 = matchValue_93;
                        const matchValue_94 = model.Page;
                        if (matchValue_94.tag === 2) {
                            const st_12 = matchValue_94.fields[0];
                            return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_12.Status, st_12.ModelStatus, st_12.Message, st_12.CheckingUpdates, st_12.SyncingModels, st_12.ShowFirstRunBanner, st_12.ErrorReportingConsent, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_45) => {
                                AsyncHelpers_start(x_45);
                            }, (payload) => singleton_1.Delay(() => singleton_1.Bind(submitErrorReport(payload), (_arg_5) => {
                                const hostResult_1 = _arg_5;
                                return (hostResult_1.tag === 1) ? singleton_1.Bind(submitErrorReportFallback(payload), (_arg_6) => singleton_1.Return(_arg_6)) : singleton_1.Return(new FSharpResult$2(0, [hostResult_1.fields[0]]));
                            })), json_1, (Item_36) => (new AppMsg(31, [Item_36])))];
                        }
                        else {
                            return [model, Cmd_OfAsyncWith_perform((x_46) => {
                                AsyncHelpers_start(x_46);
                            }, (payload_1) => singleton_1.Delay(() => singleton_1.Bind(submitErrorReport(payload_1), (_arg_7) => {
                                const hostResult_2 = _arg_7;
                                return (hostResult_2.tag === 1) ? singleton_1.Bind(submitErrorReportFallback(payload_1), (_arg_8) => singleton_1.Return(_arg_8)) : singleton_1.Return(new FSharpResult$2(0, [hostResult_2.fields[0]]));
                            })), json_1, (Item_37) => (new AppMsg(31, [Item_37])))];
                        }
                    }
                    else {
                        return [model, singleton((dispatch_4) => {
                            dispatch_4(new AppMsg(18, ["No captured error report yet — reproduce an error or wait for one to occur."]));
                        })];
                    }
                }
                case 2:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_47) => {
                            AsyncHelpers_start(x_47);
                        }, runConflictScan, undefined, () => (new AppMsg(18, ["Conflict scan complete"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                default:
                    return [new AppModel((bind$0040_18 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_18.Activity, bind$0040_18.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_34) => {
                        AsyncHelpers_start(x_34);
                    }, getProjects, undefined, (Item_31) => (new AppMsg(4, [Item_31])))];
            }
        case 17:
            if (msg.fields[0].tag === 1) {
                return [model, Cmd_none()];
            }
            else {
                const matchValue_84 = model.Page;
                if (matchValue_84.tag === 2) {
                    const st_4 = matchValue_84.fields[0];
                    return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_4.Status, msg.fields[0].fields[0], st_4.Message, st_4.CheckingUpdates, false, st_4.ShowFirstRunBanner, st_4.ErrorReportingConsent, st_4.ErrorReportingBusy)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 18:
            return [(matchValue_96 = model.Page, (matchValue_96.tag === 2) ? ((st_13 = matchValue_96.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_13.Status, st_13.ModelStatus, msg.fields[0], false, st_13.SyncingModels, st_13.ShowFirstRunBanner, st_13.ErrorReportingConsent, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport))) : model), Cmd_none()];
        case 26:
            switch (msg.fields[0].tag) {
                case 1: {
                    const matchValue_98 = model.SetupWizard;
                    if (matchValue_98 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, model.Page, SetupWizard_back(matchValue_98), model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_99 = model.SetupWizard;
                    if (matchValue_99 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        const w_2 = matchValue_99;
                        return [new AppModel((bind$0040_19 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_19.Activity, bind$0040_19.SystemStatus)), new AppPage(2, [Settings_init()]), new SetupWizardModel(w_2.Step, "Open Settings — bootstrap started from wizard."), model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_48) => {
                            AsyncHelpers_start(x_48);
                        }, runBootstrap, undefined, () => (new AppMsg(18, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_49) => {
                            AsyncHelpers_start(x_49);
                        }, getSystemStatus, undefined, (Item_38) => (new AppMsg(16, [Item_38])))]))];
                    }
                }
                case 3: {
                    SetupWizard_markComplete();
                    return [new AppModel(model.Shell, model.Page, undefined, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                default: {
                    const matchValue_97 = model.SetupWizard;
                    if (matchValue_97 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, model.Page, SetupWizard_next(matchValue_97), model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
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
    ProgramModule_run(ProgramModule_withSubscription((_arg) => ofArray([[singleton("sse"), (dispatch_1) => {
        const es = subscribeEvents((e) => {
            dispatch_1(new AppMsg(0, [new ShellMsg(1, [e])]));
        });
        dispatch_1(new AppMsg(0, [new ShellMsg(2, [])]));
        return {
            Dispose() {
                es.close();
            },
        };
    }], [singleton("error-hooks"), (dispatch_2) => {
        installHooks((req) => {
            dispatch_2(new AppMsg(30, [req]));
        });
        return {
            Dispose() {
            },
        };
    }]]), Program_withReactBatched("root", ProgramModule_mkProgram(init, update, view))));
}

