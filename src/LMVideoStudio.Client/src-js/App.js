import { FSharpRef, Record, Union } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { ProjectHub_view, ProjectHubModel, ProjectHubMsg, ProjectHub_init, ProjectHubMsg_$reflection, ProjectHubModel_$reflection } from "./Views/ProjectHub.js";
import { StoryboardTimeline_view, StoryboardTimeline_withPreviewUrl, StoryboardTimeline_withPreviewStarted, StoryboardTimeline_withProjectAfterGenerate, StoryboardTimeline_withBakeUrl, StoryboardTimeline_withBakeStarted, StoryboardTimeline_withProject, StoryboardTimeline_withSharePack, StoryboardTimeline_withPreviewError, StoryboardTimeline_isUnusablePromptDraft, VariantModalMode, StoryboardTimeline_withBakeError, StoryboardTimeline_clearSharePack, StoryboardTimeline_updateSharePack, StoryboardTimeline_reorderByDrag, StoryboardTimeline_setDragIndex, StoryboardTimeline_moveDown, StoryboardTimeline_moveUp, StoryboardTimeline_init, StoryboardTimeline_selectBlock, TimelineMsg, TimelineModel, TimelineMsg_$reflection, TimelineModel_$reflection } from "./Views/StoryboardTimeline.js";
import { Settings_view, Settings_markBootstrapStarted, Settings_init, SettingsModel, SettingsMsg_$reflection, SettingsModel_$reflection } from "./Views/Settings.js";
import { tuple_type, unit_type, list_type, record_type, class_type, option_type, string_type, union_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ShellMsg, Shell_chrome, ShellTab, ShellModel, Shell_init, ShellMsg_$reflection, ShellModel_$reflection } from "./Views/Shell.js";
import { SetupWizard_view, SetupWizard_next, SetupWizard_markComplete, SetupWizardModel, SetupWizard_back, SetupWizard_init, SetupWizard_isComplete, SetupWizardMsg_$reflection, SetupWizardModel_$reflection } from "./Views/SetupWizard.js";
import { subscribeEvents, disconnectOAuth, startOAuth, runConflictScan, flushErrorReports, runRepair, runBootstrap, syncModels, checkForUpdates, ConnectedAccountsDto, refreshMockupPreview, importBlockAudio, useBlockThumbnailAsReference, clearBlockReferenceImage, importBlockReferenceImage, generateBlockThumbnail, updateBlock, importBlockImage, startBake, importStylePackLogo, uploadSharePack, exportSharePackDetailed, selectBlockThumbnail, reorderBlocks, deleteProject, applyOutline, generateOutline, createProject, getProject, getMockupPreviewStatus, previewMediaUrl, getConnectedAccounts, getModelStatus, getSystemStatus, getProjects, submitErrorReportFallback, submitErrorReport, waitForHostHealth, OAuthStartDto_$reflection, SharePackUploadResultDto_$reflection, ConnectedAccountsDto_$reflection, SharePackExportDto_$reflection, OutlineBlockDto_$reflection, ModelStatusDto_$reflection, SystemStatusDto_$reflection, PreviewStartDto_$reflection, ProjectSummaryDto_$reflection } from "./Api.js";
import { Result_Map, FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";
import { Project_$reflection } from "./LMVideoStudio.Domain/Types.js";
import { installHooks, setConsent, shouldAutoSubmit, encodeForSubmit, LastErrorSummary, buildReport, readConsent, CaptureRequest_$reflection } from "./ErrorReporting.js";
import { subscribe as subscribe_1, parseCurrent, ensureInitialHash, syncRoute, AppRoute, AppRoute_$reflection } from "./AppNavigation.js";
import { mergeEvent, ActivityPanelState, setLastError, init as init_1 } from "./ActivityPanel.js";
import { Cmd_none, Cmd_batch } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { tryLast, empty, tryFind, isEmpty, sortBy, map as map_1, ofArray, singleton } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { Cmd_OfAsyncWith_perform } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { AsyncHelpers_start } from "./fable_modules/Fable.Elmish.5.0.2/prelude.fs.js";
import { bind, filter, defaultArg, map } from "./fable_modules/fable-library-js.4.27.0/Option.js";
import { singleton as singleton_1 } from "./fable_modules/fable-library-js.4.27.0/AsyncBuilder.js";
import { removeCustom, addCustom, loadAll } from "./PromptQuickButtons.js";
import { utcNow, toUnixTimeMilliseconds } from "./fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { createObj, comparePrimitives, equals } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { SharePackPanel_fromExport, SharePackPanel_handleOpenMeta, SharePackPanel_handleOpenYouTube, SharePackModel, SharePackPanel_handleCopyCaption } from "./Views/SharePackPanel.js";
import { min, max } from "./fable_modules/fable-library-js.4.27.0/Double.js";
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
        return ["ShellMsg", "HubMsg", "TimelineMsg", "SettingsMsg", "ProjectsLoaded", "ProjectCreated", "ProjectOpened", "ProjectSaved", "ImportDone", "BlockFieldsSaved", "GenerateDone", "AudioImportDone", "PreviewStarted", "PreviewReady", "BakeReady", "ExistingPreviewMissing", "SettingsStatus", "ModelStatusLoaded", "SettingsActionDone", "OutlineGenerated", "OutlineApplied", "StylePackImported", "BakeStarted", "SharePackDone", "SharePackAccountsLoaded", "SharePackUploadDone", "ConnectedAccountsLoaded", "OAuthStartReady", "OAuthActionDone", "VariantSelected", "ReferenceImageChanged", "ProjectDeleted", "SetupWizardMsg", "InitSubscriptions", "HostReady", "RetryHostStartup", "ErrorCaptured", "ErrorReportSubmitted", "PendingErrorStored", "NavigationChanged", "ProjectLoadedForRoute"];
    }
}

export function AppMsg_$reflection() {
    return union_type("LMVideoStudio.Client.App.AppMsg", [], AppMsg, () => [[["Item", ShellMsg_$reflection()]], [["Item", ProjectHubMsg_$reflection()]], [["Item", TimelineMsg_$reflection()]], [["Item", SettingsMsg_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(ProjectSummaryDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(ProjectSummaryDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [PreviewStartDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", PreviewStartDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", string_type]], [], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [SystemStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", SystemStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [ModelStatusDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", ModelStatusDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [list_type(OutlineBlockDto_$reflection()), string_type], FSharpResult$2, () => [[["ResultValue", list_type(OutlineBlockDto_$reflection())]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [SharePackExportDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", SharePackExportDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [ConnectedAccountsDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", ConnectedAccountsDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [SharePackUploadResultDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", SharePackUploadResultDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [ConnectedAccountsDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", ConnectedAccountsDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [OAuthStartDto_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", OAuthStartDto_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [Project_$reflection(), string_type], FSharpResult$2, () => [[["ResultValue", Project_$reflection()]], [["ErrorValue", string_type]]])]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [class_type("System.Guid"), string_type], FSharpResult$2, () => [[["ResultValue", class_type("System.Guid")]], [["ErrorValue", string_type]]])]], [["Item", SetupWizardMsg_$reflection()]], [], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [unit_type, string_type], FSharpResult$2, () => [[["ResultValue", unit_type]], [["ErrorValue", string_type]]])]], [], [["Item", CaptureRequest_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [string_type, string_type], FSharpResult$2, () => [[["ResultValue", string_type]], [["ErrorValue", string_type]]])]], [["Item", string_type]], [["Item", AppRoute_$reflection()]], [["Item", union_type("Microsoft.FSharp.Core.FSharpResult`2", [tuple_type(Project_$reflection(), option_type(class_type("System.Guid"))), string_type], FSharpResult$2, () => [[["ResultValue", tuple_type(Project_$reflection(), option_type(class_type("System.Guid")))]], [["ErrorValue", string_type]]])]]]);
}

function routeFromModel(model) {
    const matchValue = model.Page;
    switch (matchValue.tag) {
        case 2:
            return new AppRoute(1, []);
        case 1: {
            const t = matchValue.fields[0];
            return new AppRoute(2, [t.Project.Id, t.SelectedBlockId]);
        }
        default:
            return new AppRoute(0, []);
    }
}

function navCmd(model) {
    return syncRoute(routeFromModel(model));
}

function withNav(model) {
    return [model, navCmd(model)];
}

export function init() {
    return [new AppModel(Shell_init(init_1()), new AppPage(0, [ProjectHub_init()]), SetupWizard_isComplete() ? undefined : SetupWizard_init(), undefined, new HostStartup(0, []), undefined), Cmd_batch(ofArray([singleton((dispatch) => {
        dispatch(new AppMsg(33, []));
    }), Cmd_OfAsyncWith_perform((x) => {
        AsyncHelpers_start(x);
    }, waitForHostHealth, undefined, (Item) => (new AppMsg(34, [Item])))]))];
}

export function update(msg, model) {
    let bind$0040, msg_1, matchValue_3, st_1, matchValue_2, st, bind$0040_3, bind$0040_4, bind$0040_5, bind$0040_15, bind$0040_16, bind$0040_17, bind$0040_6, bind$0040_1, bind$0040_2, matchValue_4, t, bakeCmd, matchValue_5, jobId_2, bust, jobId_3, matchValue_6, jobId_6, bust_1, jobId_7, bind$0040_8, bind$0040_9, bind$0040_10, bind$0040_11, bind$0040_7, bind$0040_13, bind$0040_14, bind$0040_12, matchValue_11, bind$0040_18, bind$0040_19, bind$0040_20, matchValue_31, bind$0040_21, array_1, bind$0040_22, value_1, t$0027, bind$0040_23, bind$0040_24, bind$0040_25, matchValue_136, st_25, bind$0040_26;
    switch (msg.tag) {
        case 36: {
            let hostHealthy;
            const matchValue = model.HostStartup;
            hostHealthy = ((matchValue.tag === 2) ? false : ((matchValue.tag === 0) ? undefined : true));
            const ollama = map((s) => s.Ollama, model.Shell.SystemStatus);
            const worker = map((s_1) => s_1.Worker, model.Shell.SystemStatus);
            const consent = readConsent();
            const matchValue_1 = buildReport(msg.fields[0], hostHealthy, ollama, worker, consent);
            if (matchValue_1.tag === 0) {
                const report = matchValue_1.fields[0];
                const model$0027 = new AppModel((bind$0040 = model.Shell, new ShellModel(bind$0040.Tab, setLastError(model.Shell.Activity, new LastErrorSummary(report.Message, report.Source, report.Severity, report.Timestamp)), bind$0040.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, encodeForSubmit(report));
                if (shouldAutoSubmit(report.Severity, consent)) {
                    return [model$0027, Cmd_OfAsyncWith_perform((x) => {
                        AsyncHelpers_start(x);
                    }, (json) => singleton_1.Delay(() => singleton_1.Bind(submitErrorReport(json), (_arg) => {
                        const hostResult = _arg;
                        return (hostResult.tag === 1) ? singleton_1.Bind(submitErrorReportFallback(json), (_arg_1) => singleton_1.Return(_arg_1)) : singleton_1.Return(new FSharpResult$2(0, [hostResult.fields[0]]));
                    })), encodeForSubmit(report), (Item) => (new AppMsg(37, [Item])))];
                }
                else {
                    return [model$0027, (msg_1 = (new AppMsg(38, [encodeForSubmit(report)])), singleton((dispatch) => {
                        dispatch(msg_1);
                    }))];
                }
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 38:
            return [model, Cmd_none()];
        case 37:
            if (msg.fields[0].tag === 1) {
                return [(matchValue_3 = model.Page, (matchValue_3.tag === 2) ? ((st_1 = matchValue_3.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_1.Status, st_1.ModelStatus, `Error report failed: ${msg.fields[0].fields[0]}`, st_1.CheckingUpdates, st_1.SyncingModels, st_1.ShowFirstRunBanner, st_1.ErrorReportingConsent, false, st_1.ConnectedAccounts, st_1.OAuthBusy, st_1.QuickButtonsCustom, st_1.QuickButtonLabelDraft, st_1.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport))) : model), Cmd_none()];
            }
            else {
                return [(matchValue_2 = model.Page, (matchValue_2.tag === 2) ? ((st = matchValue_2.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st.Status, st.ModelStatus, `Error report sent: ${msg.fields[0].fields[0]}`, st.CheckingUpdates, st.SyncingModels, st.ShowFirstRunBanner, st.ErrorReportingConsent, false, st.ConnectedAccounts, st.OAuthBusy, st.QuickButtonsCustom, st.QuickButtonLabelDraft, st.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport))) : model), Cmd_none()];
            }
        case 34:
            if (msg.fields[0].tag === 1) {
                return [new AppModel(model.Shell, model.Page, model.SetupWizard, model.OpenProjectId, new HostStartup(2, [msg.fields[0].fields[0]]), model.PendingErrorReport), Cmd_none()];
            }
            else {
                ensureInitialHash();
                const initialRoute = defaultArg(parseCurrent(), new AppRoute(0, []));
                return [new AppModel(model.Shell, model.Page, model.SetupWizard, model.OpenProjectId, new HostStartup(1, []), model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_1) => {
                    AsyncHelpers_start(x_1);
                }, getProjects, undefined, (Item_1) => (new AppMsg(4, [Item_1]))), Cmd_OfAsyncWith_perform((x_2) => {
                    AsyncHelpers_start(x_2);
                }, getSystemStatus, undefined, (Item_2) => (new AppMsg(16, [Item_2]))), singleton((dispatch_1) => {
                    dispatch_1(new AppMsg(39, [initialRoute]));
                })]))];
            }
        case 35:
            return [new AppModel(model.Shell, new AppPage(0, [ProjectHub_init()]), model.SetupWizard, model.OpenProjectId, new HostStartup(0, []), model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_3) => {
                AsyncHelpers_start(x_3);
            }, waitForHostHealth, undefined, (Item_3) => (new AppMsg(34, [Item_3])))];
        case 0:
            switch (msg.fields[0].tag) {
                case 2:
                    return [new AppModel((bind$0040_3 = model.Shell, new ShellModel(bind$0040_3.Tab, (bind$0040_4 = model.Shell.Activity, new ActivityPanelState(bind$0040_4.Events, true, bind$0040_4.LastError)), bind$0040_3.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                case 3:
                    return [new AppModel((bind$0040_5 = model.Shell, new ShellModel(bind$0040_5.Tab, bind$0040_5.Activity, msg.fields[0].fields[0])), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                case 0:
                    switch (msg.fields[0].fields[0].tag) {
                        case 1: {
                            const matchValue_8 = model.Page;
                            if (matchValue_8.tag === 1) {
                                const t_3 = matchValue_8.fields[0];
                                const patternInput_4 = withNav(new AppModel((bind$0040_15 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_15.Activity, bind$0040_15.SystemStatus)), new AppPage(1, [new TimelineModel(t_3.Project, t_3.Saving, t_3.Generating, t_3.Previewing, t_3.Baking, t_3.PreviewUrl, t_3.BakeUrl, t_3.PreviewJobId, t_3.BakeJobId, t_3.Error, t_3.DragIndex, t_3.SelectedBlockId, t_3.VoiceoverDraft, t_3.ImagePromptDraft, t_3.MoodTagsDraft, t_3.CrossfadeDurationDraft, loadAll(), t_3.ReferenceStrengthDraft, t_3.MediaRevision, t_3.VariantModal, t_3.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport));
                                return [patternInput_4[0], patternInput_4[1]];
                            }
                            else {
                                const patternInput_5 = withNav(new AppModel((bind$0040_16 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_16.Activity, bind$0040_16.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport));
                                return [patternInput_5[0], Cmd_batch(ofArray([patternInput_5[1], singleton((dispatch_4) => {
                                    dispatch_4(new AppMsg(1, [new ProjectHubMsg(4, [])]));
                                })]))];
                            }
                        }
                        case 2: {
                            const patternInput_6 = withNav(new AppModel((bind$0040_17 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_17.Activity, bind$0040_17.SystemStatus)), new AppPage(2, [Settings_init()]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport));
                            return [patternInput_6[0], Cmd_batch(ofArray([patternInput_6[1], Cmd_OfAsyncWith_perform((x_14) => {
                                AsyncHelpers_start(x_14);
                            }, getSystemStatus, undefined, (Item_12) => (new AppMsg(16, [Item_12]))), Cmd_OfAsyncWith_perform((x_15) => {
                                AsyncHelpers_start(x_15);
                            }, getModelStatus, undefined, (Item_13) => (new AppMsg(17, [Item_13]))), Cmd_OfAsyncWith_perform((x_16) => {
                                AsyncHelpers_start(x_16);
                            }, getConnectedAccounts, undefined, (Item_14) => (new AppMsg(26, [Item_14])))]))];
                        }
                        default: {
                            const patternInput = withNav(new AppModel((bind$0040_6 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_6.Activity, bind$0040_6.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport));
                            return [patternInput[0], Cmd_batch(ofArray([patternInput[1], Cmd_OfAsyncWith_perform((x_6) => {
                                AsyncHelpers_start(x_6);
                            }, getProjects, undefined, (Item_6) => (new AppMsg(4, [Item_6])))]))];
                        }
                    }
                default:
                    return [new AppModel((bind$0040_1 = model.Shell, new ShellModel(bind$0040_1.Tab, (bind$0040_2 = model.Shell.Activity, new ActivityPanelState(mergeEvent(msg.fields[0].fields[0], model.Shell.Activity.Events), bind$0040_2.Connected, bind$0040_2.LastError)), bind$0040_1.SystemStatus)), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), (matchValue_4 = model.Page, (matchValue_4.tag === 1) ? ((t = matchValue_4.fields[0], (bakeCmd = ((matchValue_5 = t.BakeJobId, (matchValue_5 != null) ? ((((matchValue_5 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "bake")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_2 = matchValue_5, (bust = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x_4) => {
                        AsyncHelpers_start(x_4);
                    }, () => singleton_1.Delay(() => singleton_1.Return(previewMediaUrl(t.Project.Id, "renders/bake/final.mp4", bust))), undefined, (Item_4) => (new AppMsg(14, [Item_4])))))) : ((((matchValue_5 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "bake")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_3 = matchValue_5, singleton((dispatch_2) => {
                        dispatch_2(new AppMsg(2, [new TimelineMsg(30, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none())), Cmd_batch(ofArray([(matchValue_6 = t.PreviewJobId, (matchValue_6 != null) ? ((((matchValue_6 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "completed")) ? ((jobId_6 = matchValue_6, (bust_1 = toUnixTimeMilliseconds(utcNow()), Cmd_OfAsyncWith_perform((x_5) => {
                        AsyncHelpers_start(x_5);
                    }, () => singleton_1.Delay(() => singleton_1.Bind(getMockupPreviewStatus(t.Project.Id), (_arg_2) => {
                        const status = _arg_2;
                        return singleton_1.Return((status.tag === 1) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust_1) : ((status.fields[0] == null) ? previewMediaUrl(t.Project.Id, "renders/mockup/preview.mp4", bust_1) : previewMediaUrl(t.Project.Id, status.fields[0].PreviewPath, bust_1)));
                    })), undefined, (Item_5) => (new AppMsg(13, [Item_5])))))) : ((((matchValue_6 === msg.fields[0].fields[0].JobId) && (msg.fields[0].fields[0].Phase === "mockup_preview")) && (msg.fields[0].fields[0].Status === "failed")) ? ((jobId_7 = matchValue_6, singleton((dispatch_3) => {
                        dispatch_3(new AppMsg(2, [new TimelineMsg(29, [msg.fields[0].fields[0].Message])]));
                    }))) : Cmd_none())) : Cmd_none()), bakeCmd]))))) : Cmd_none())];
            }
        case 39:
            if (equals(routeFromModel(model), msg.fields[0])) {
                return [model, Cmd_none()];
            }
            else {
                switch (msg.fields[0].tag) {
                    case 1: {
                        const patternInput_2 = withNav(new AppModel((bind$0040_8 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_8.Activity, bind$0040_8.SystemStatus)), new AppPage(2, [Settings_init()]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport));
                        return [patternInput_2[0], Cmd_batch(ofArray([patternInput_2[1], Cmd_OfAsyncWith_perform((x_8) => {
                            AsyncHelpers_start(x_8);
                        }, getSystemStatus, undefined, (Item_8) => (new AppMsg(16, [Item_8]))), Cmd_OfAsyncWith_perform((x_9) => {
                            AsyncHelpers_start(x_9);
                        }, getModelStatus, undefined, (Item_9) => (new AppMsg(17, [Item_9]))), Cmd_OfAsyncWith_perform((x_10) => {
                            AsyncHelpers_start(x_10);
                        }, getConnectedAccounts, undefined, (Item_10) => (new AppMsg(26, [Item_10])))]))];
                    }
                    case 2: {
                        const projectId = msg.fields[0].fields[0];
                        const blockId = msg.fields[0].fields[1];
                        const matchValue_7 = model.Page;
                        let matchResult, t_2;
                        if (matchValue_7.tag === 1) {
                            if (matchValue_7.fields[0].Project.Id === projectId) {
                                matchResult = 0;
                                t_2 = matchValue_7.fields[0];
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
                                return [new AppModel((bind$0040_9 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_9.Activity, bind$0040_9.SystemStatus)), new AppPage(1, [StoryboardTimeline_selectBlock(t_2, blockId)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                            default:
                                return [new AppModel((bind$0040_10 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_10.Activity, bind$0040_10.SystemStatus)), new AppPage(0, [(bind$0040_11 = ProjectHub_init(), new ProjectHubModel(bind$0040_11.Summaries, bind$0040_11.NewName, true, bind$0040_11.Error, bind$0040_11.BriefText, bind$0040_11.OutlineProjectId, bind$0040_11.OutlineBlocks, bind$0040_11.OutlineWorking))]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_11) => {
                                    AsyncHelpers_start(x_11);
                                }, () => getProject(projectId), undefined, (r_1) => (new AppMsg(40, [Result_Map((p) => [p, blockId], r_1)])))];
                        }
                    }
                    default: {
                        const patternInput_1 = withNav(new AppModel((bind$0040_7 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_7.Activity, bind$0040_7.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport));
                        return [patternInput_1[0], Cmd_batch(ofArray([patternInput_1[1], Cmd_OfAsyncWith_perform((x_7) => {
                            AsyncHelpers_start(x_7);
                        }, getProjects, undefined, (Item_7) => (new AppMsg(4, [Item_7])))]))];
                    }
                }
            }
        case 40:
            if (msg.fields[0].tag === 1) {
                const patternInput_3 = withNav(new AppModel((bind$0040_13 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_13.Activity, bind$0040_13.SystemStatus)), new AppPage(0, [(bind$0040_14 = ProjectHub_init(), new ProjectHubModel(bind$0040_14.Summaries, bind$0040_14.NewName, false, msg.fields[0].fields[0], bind$0040_14.BriefText, bind$0040_14.OutlineProjectId, bind$0040_14.OutlineBlocks, bind$0040_14.OutlineWorking))]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport));
                return [patternInput_3[0], Cmd_batch(ofArray([patternInput_3[1], Cmd_OfAsyncWith_perform((x_13) => {
                    AsyncHelpers_start(x_13);
                }, getProjects, undefined, (Item_11) => (new AppMsg(4, [Item_11])))]))];
            }
            else {
                return [new AppModel((bind$0040_12 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_12.Activity, bind$0040_12.SystemStatus)), new AppPage(1, [StoryboardTimeline_selectBlock(StoryboardTimeline_init(msg.fields[0].fields[0][0]), msg.fields[0].fields[0][1])]), model.SetupWizard, msg.fields[0].fields[0][0].Id, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_12) => {
                    AsyncHelpers_start(x_12);
                }, () => singleton_1.Delay(() => {
                    const bust_2 = toUnixTimeMilliseconds(utcNow());
                    return singleton_1.Bind(getMockupPreviewStatus(msg.fields[0].fields[0][0].Id), (_arg_3) => {
                        const status_1 = _arg_3;
                        return singleton_1.Return((status_1.tag === 1) ? undefined : ((status_1.fields[0] == null) ? undefined : previewMediaUrl(msg.fields[0].fields[0][0].Id, status_1.fields[0].PreviewPath, bust_2)));
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
        case 4:
            if (msg.fields[0].tag === 1) {
                const matchValue_10 = model.Page;
                if (matchValue_10.tag === 0) {
                    const hub_1 = matchValue_10.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_1.Summaries, hub_1.NewName, false, (matchValue_11 = model.HostStartup, (matchValue_11.tag === 0) ? undefined : ((matchValue_11.tag === 2) ? msg.fields[0].fields[0] : msg.fields[0].fields[0])), hub_1.BriefText, hub_1.OutlineProjectId, hub_1.OutlineBlocks, hub_1.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_9 = model.Page;
                if (matchValue_9.tag === 0) {
                    const hub = matchValue_9.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(msg.fields[0].fields[0], hub.NewName, false, undefined, hub.BriefText, hub.OutlineProjectId, hub.OutlineBlocks, hub.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 1:
            switch (msg.fields[0].tag) {
                case 0: {
                    const matchValue_13 = model.Page;
                    if (matchValue_13.tag === 0) {
                        const hub_3 = matchValue_13.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_3.Summaries, msg.fields[0].fields[0], hub_3.Loading, hub_3.Error, hub_3.BriefText, hub_3.OutlineProjectId, hub_3.OutlineBlocks, hub_3.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_14 = model.Page;
                    if (matchValue_14.tag === 0) {
                        const hub_4 = matchValue_14.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_4.Summaries, hub_4.NewName, true, hub_4.Error, hub_4.BriefText, hub_4.OutlineProjectId, hub_4.OutlineBlocks, hub_4.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_18) => {
                            AsyncHelpers_start(x_18);
                        }, () => createProject(hub_4.NewName), undefined, (Item_16) => (new AppMsg(5, [Item_16])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_16 = model.Page;
                    if (matchValue_16.tag === 0) {
                        const hub_6 = matchValue_16.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_6.Summaries, hub_6.NewName, hub_6.Loading, hub_6.Error, hub_6.BriefText, msg.fields[0].fields[0], undefined, hub_6.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_17 = model.Page;
                    if (matchValue_17.tag === 0) {
                        const hub_7 = matchValue_17.fields[0];
                        const matchValue_18 = hub_7.OutlineProjectId;
                        if (matchValue_18 != null) {
                            const projectId_1 = matchValue_18;
                            return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_7.Summaries, hub_7.NewName, hub_7.Loading, undefined, hub_7.BriefText, hub_7.OutlineProjectId, hub_7.OutlineBlocks, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_19) => {
                                AsyncHelpers_start(x_19);
                            }, () => generateOutline(projectId_1, hub_7.BriefText), undefined, (Item_17) => (new AppMsg(19, [Item_17])))];
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
                    const matchValue_21 = model.Page;
                    if (matchValue_21.tag === 0) {
                        const hub_10 = matchValue_21.fields[0];
                        const matchValue_22 = hub_10.OutlineProjectId;
                        const matchValue_23 = hub_10.OutlineBlocks;
                        let matchResult_1, blocks_1, projectId_2;
                        if (matchValue_22 != null) {
                            if (matchValue_23 != null) {
                                matchResult_1 = 0;
                                blocks_1 = matchValue_23;
                                projectId_2 = matchValue_22;
                            }
                            else {
                                matchResult_1 = 1;
                            }
                        }
                        else {
                            matchResult_1 = 1;
                        }
                        switch (matchResult_1) {
                            case 0:
                                return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_10.Summaries, hub_10.NewName, hub_10.Loading, hub_10.Error, hub_10.BriefText, hub_10.OutlineProjectId, hub_10.OutlineBlocks, true)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_20) => {
                                    AsyncHelpers_start(x_20);
                                }, () => applyOutline(projectId_2, hub_10.BriefText, blocks_1), undefined, (Item_18) => (new AppMsg(20, [Item_18])))];
                            default:
                                return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_26 = model.Page;
                    if (matchValue_26.tag === 0) {
                        const hub_12 = matchValue_26.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_12.Summaries, hub_12.NewName, hub_12.Loading, hub_12.Error, hub_12.BriefText, hub_12.OutlineProjectId, undefined, hub_12.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_27 = model.Page;
                    if (matchValue_27.tag === 0) {
                        const hub_13 = matchValue_27.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_13.Summaries, hub_13.NewName, hub_13.Loading, hub_13.Error, msg.fields[0].fields[0], hub_13.OutlineProjectId, hub_13.OutlineBlocks, hub_13.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_28 = model.Page;
                    if (matchValue_28.tag === 0) {
                        const hub_14 = matchValue_28.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_14.Summaries, hub_14.NewName, true, hub_14.Error, hub_14.BriefText, hub_14.OutlineProjectId, hub_14.OutlineBlocks, hub_14.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_21) => {
                            AsyncHelpers_start(x_21);
                        }, () => getProject(msg.fields[0].fields[0]), undefined, (Item_19) => (new AppMsg(6, [Item_19])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_30 = model.Page;
                    let matchResult_2, hub_16, t_5;
                    switch (matchValue_30.tag) {
                        case 0: {
                            matchResult_2 = 0;
                            hub_16 = matchValue_30.fields[0];
                            break;
                        }
                        case 1: {
                            if (matchValue_30.fields[0].Project.Id === msg.fields[0].fields[0]) {
                                matchResult_2 = 1;
                                t_5 = matchValue_30.fields[0];
                            }
                            else {
                                matchResult_2 = 2;
                            }
                            break;
                        }
                        default:
                            matchResult_2 = 2;
                    }
                    switch (matchResult_2) {
                        case 0:
                            return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_16.Summaries, hub_16.NewName, true, undefined, hub_16.BriefText, hub_16.OutlineProjectId, hub_16.OutlineBlocks, hub_16.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_23) => {
                                AsyncHelpers_start(x_23);
                            }, () => deleteProject(msg.fields[0].fields[0]), undefined, (Item_20) => (new AppMsg(31, [Item_20])))];
                        case 1:
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_5.Project, true, t_5.Generating, t_5.Previewing, t_5.Baking, t_5.PreviewUrl, t_5.BakeUrl, t_5.PreviewJobId, t_5.BakeJobId, undefined, t_5.DragIndex, t_5.SelectedBlockId, t_5.VoiceoverDraft, t_5.ImagePromptDraft, t_5.MoodTagsDraft, t_5.CrossfadeDurationDraft, t_5.ImagePromptQuickButtons, t_5.ReferenceStrengthDraft, t_5.MediaRevision, t_5.VariantModal, t_5.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_24) => {
                                AsyncHelpers_start(x_24);
                            }, () => deleteProject(msg.fields[0].fields[0]), undefined, (Item_21) => (new AppMsg(31, [Item_21])))];
                        default:
                            return [model, Cmd_none()];
                    }
                }
                default: {
                    const matchValue_12 = model.Page;
                    if (matchValue_12.tag === 0) {
                        const hub_2 = matchValue_12.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_2.Summaries, hub_2.NewName, true, hub_2.Error, hub_2.BriefText, hub_2.OutlineProjectId, hub_2.OutlineBlocks, hub_2.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_17) => {
                            AsyncHelpers_start(x_17);
                        }, getProjects, undefined, (Item_15) => (new AppMsg(4, [Item_15])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
            }
        case 5:
            if (msg.fields[0].tag === 1) {
                const matchValue_15 = model.Page;
                if (matchValue_15.tag === 0) {
                    const hub_5 = matchValue_15.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_5.Summaries, hub_5.NewName, false, msg.fields[0].fields[0], hub_5.BriefText, hub_5.OutlineProjectId, hub_5.OutlineBlocks, hub_5.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const patternInput_7 = withNav(new AppModel((bind$0040_18 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_18.Activity, bind$0040_18.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup, model.PendingErrorReport));
                return [patternInput_7[0], patternInput_7[1]];
            }
        case 19:
            if (msg.fields[0].tag === 1) {
                const matchValue_20 = model.Page;
                if (matchValue_20.tag === 0) {
                    const hub_9 = matchValue_20.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_9.Summaries, hub_9.NewName, hub_9.Loading, msg.fields[0].fields[0], hub_9.BriefText, hub_9.OutlineProjectId, hub_9.OutlineBlocks, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_19 = model.Page;
                if (matchValue_19.tag === 0) {
                    const hub_8 = matchValue_19.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_8.Summaries, hub_8.NewName, hub_8.Loading, hub_8.Error, hub_8.BriefText, hub_8.OutlineProjectId, msg.fields[0].fields[0], false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 20:
            if (msg.fields[0].tag === 1) {
                const matchValue_25 = model.Page;
                if (matchValue_25.tag === 0) {
                    const hub_11 = matchValue_25.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_11.Summaries, hub_11.NewName, hub_11.Loading, msg.fields[0].fields[0], hub_11.BriefText, hub_11.OutlineProjectId, hub_11.OutlineBlocks, false)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const patternInput_8 = withNav(new AppModel((bind$0040_19 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_19.Activity, bind$0040_19.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup, model.PendingErrorReport));
                return [patternInput_8[0], patternInput_8[1]];
            }
        case 6:
            if (msg.fields[0].tag === 1) {
                const matchValue_29 = model.Page;
                if (matchValue_29.tag === 0) {
                    const hub_15 = matchValue_29.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_15.Summaries, hub_15.NewName, false, msg.fields[0].fields[0], hub_15.BriefText, hub_15.OutlineProjectId, hub_15.OutlineBlocks, hub_15.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const patternInput_9 = withNav(new AppModel((bind$0040_20 = model.Shell, new ShellModel(new ShellTab(1, []), bind$0040_20.Activity, bind$0040_20.SystemStatus)), new AppPage(1, [StoryboardTimeline_init(msg.fields[0].fields[0])]), model.SetupWizard, msg.fields[0].fields[0].Id, model.HostStartup, model.PendingErrorReport));
                return [patternInput_9[0], Cmd_batch(ofArray([patternInput_9[1], Cmd_OfAsyncWith_perform((x_22) => {
                    AsyncHelpers_start(x_22);
                }, () => singleton_1.Delay(() => {
                    const bust_3 = toUnixTimeMilliseconds(utcNow());
                    return singleton_1.Bind(getMockupPreviewStatus(msg.fields[0].fields[0].Id), (_arg_5) => {
                        const status_2 = _arg_5;
                        return singleton_1.Return((status_2.tag === 1) ? undefined : ((status_2.fields[0] == null) ? undefined : previewMediaUrl(msg.fields[0].fields[0].Id, status_2.fields[0].PreviewPath, bust_3)));
                    });
                }), undefined, (_arg_6) => {
                    if (_arg_6 == null) {
                        return new AppMsg(15, []);
                    }
                    else {
                        return new AppMsg(13, [_arg_6]);
                    }
                })]))];
            }
        case 31:
            if (msg.fields[0].tag === 1) {
                const matchValue_33 = model.Page;
                switch (matchValue_33.tag) {
                    case 0: {
                        const hub_18 = matchValue_33.fields[0];
                        return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_18.Summaries, hub_18.NewName, false, msg.fields[0].fields[0], hub_18.BriefText, hub_18.OutlineProjectId, hub_18.OutlineBlocks, hub_18.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    case 1: {
                        const t_7 = matchValue_33.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_7.Project, false, t_7.Generating, t_7.Previewing, t_7.Baking, t_7.PreviewUrl, t_7.BakeUrl, t_7.PreviewJobId, t_7.BakeJobId, msg.fields[0].fields[0], t_7.DragIndex, t_7.SelectedBlockId, t_7.VoiceoverDraft, t_7.ImagePromptDraft, t_7.MoodTagsDraft, t_7.CrossfadeDurationDraft, t_7.ImagePromptQuickButtons, t_7.ReferenceStrengthDraft, t_7.MediaRevision, t_7.VariantModal, t_7.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    default:
                        return [model, Cmd_none()];
                }
            }
            else if (equals(model.OpenProjectId, msg.fields[0].fields[0]) ? true : ((matchValue_31 = model.Page, (matchValue_31.tag === 1) && (matchValue_31.fields[0].Project.Id === msg.fields[0].fields[0])))) {
                const patternInput_10 = withNav(new AppModel((bind$0040_21 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_21.Activity, bind$0040_21.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport));
                return [patternInput_10[0], Cmd_batch(ofArray([patternInput_10[1], Cmd_OfAsyncWith_perform((x_25) => {
                    AsyncHelpers_start(x_25);
                }, getProjects, undefined, (Item_22) => (new AppMsg(4, [Item_22])))]))];
            }
            else {
                const matchValue_32 = model.Page;
                if (matchValue_32.tag === 0) {
                    const hub_17 = matchValue_32.fields[0];
                    return [new AppModel(model.Shell, new AppPage(0, [new ProjectHubModel(hub_17.Summaries, hub_17.NewName, true, undefined, hub_17.BriefText, filter((y) => (msg.fields[0].fields[0] !== y), hub_17.OutlineProjectId), hub_17.OutlineBlocks, hub_17.OutlineWorking)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_26) => {
                        AsyncHelpers_start(x_26);
                    }, getProjects, undefined, (Item_23) => (new AppMsg(4, [Item_23])))];
                }
                else {
                    return [model, Cmd_OfAsyncWith_perform((x_27) => {
                        AsyncHelpers_start(x_27);
                    }, getProjects, undefined, (Item_24) => (new AppMsg(4, [Item_24])))];
                }
            }
        case 2:
            switch (msg.fields[0].tag) {
                case 2: {
                    const matchValue_34 = model.Page;
                    if (matchValue_34.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveUp(matchValue_34.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3: {
                    const matchValue_35 = model.Page;
                    if (matchValue_35.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_moveDown(matchValue_35.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_36 = model.Page;
                    if (matchValue_36.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_setDragIndex(matchValue_36.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_37 = model.Page;
                    if (matchValue_37.tag === 1) {
                        const t_11 = matchValue_37.fields[0];
                        const matchValue_38 = t_11.DragIndex;
                        if (matchValue_38 == null) {
                            return [model, Cmd_none()];
                        }
                        else {
                            const reordered = StoryboardTimeline_reorderByDrag(t_11, matchValue_38, msg.fields[0].fields[0]);
                            const ids = map_1((b_1) => b_1.Id, sortBy((b) => b.Order, reordered.Project.Blocks, {
                                Compare: comparePrimitives,
                            }));
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(reordered.Project, true, reordered.Generating, reordered.Previewing, reordered.Baking, reordered.PreviewUrl, reordered.BakeUrl, reordered.PreviewJobId, reordered.BakeJobId, reordered.Error, reordered.DragIndex, reordered.SelectedBlockId, reordered.VoiceoverDraft, reordered.ImagePromptDraft, reordered.MoodTagsDraft, reordered.CrossfadeDurationDraft, reordered.ImagePromptQuickButtons, reordered.ReferenceStrengthDraft, reordered.MediaRevision, reordered.VariantModal, reordered.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_30) => {
                                AsyncHelpers_start(x_30);
                            }, () => reorderBlocks(reordered.Project.Id, ids), undefined, (Item_26) => (new AppMsg(7, [Item_26])))];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 13: {
                    const matchValue_39 = model.Page;
                    if (matchValue_39.tag === 1) {
                        const t_12 = matchValue_39.fields[0];
                        const matchValue_40 = t_12.SelectedBlockId;
                        if (matchValue_40 != null) {
                            const blockId_2 = matchValue_40;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_12.Project, true, t_12.Generating, t_12.Previewing, t_12.Baking, t_12.PreviewUrl, t_12.BakeUrl, t_12.PreviewJobId, t_12.BakeJobId, t_12.Error, t_12.DragIndex, t_12.SelectedBlockId, t_12.VoiceoverDraft, t_12.ImagePromptDraft, t_12.MoodTagsDraft, t_12.CrossfadeDurationDraft, t_12.ImagePromptQuickButtons, t_12.ReferenceStrengthDraft, t_12.MediaRevision, t_12.VariantModal, t_12.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_31) => {
                                AsyncHelpers_start(x_31);
                            }, () => selectBlockThumbnail(t_12.Project.Id, blockId_2, msg.fields[0].fields[0]), undefined, (Item_27) => (new AppMsg(29, [Item_27])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 27: {
                    const matchValue_41 = model.Page;
                    if (matchValue_41.tag === 1) {
                        const t_13 = matchValue_41.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_13.Project, true, t_13.Generating, t_13.Previewing, t_13.Baking, t_13.PreviewUrl, t_13.BakeUrl, t_13.PreviewJobId, t_13.BakeJobId, t_13.Error, t_13.DragIndex, t_13.SelectedBlockId, t_13.VoiceoverDraft, t_13.ImagePromptDraft, t_13.MoodTagsDraft, t_13.CrossfadeDurationDraft, t_13.ImagePromptQuickButtons, t_13.ReferenceStrengthDraft, t_13.MediaRevision, t_13.VariantModal, t_13.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_32) => {
                            AsyncHelpers_start(x_32);
                        }, getConnectedAccounts, undefined, (Item_28) => (new AppMsg(24, [Item_28]))), Cmd_OfAsyncWith_perform((x_33) => {
                            AsyncHelpers_start(x_33);
                        }, () => exportSharePackDetailed(t_13.Project.Id), undefined, (Item_29) => (new AppMsg(23, [Item_29])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 28:
                    switch (msg.fields[0].fields[0].tag) {
                        case 0: {
                            const matchValue_47 = model.Page;
                            if (matchValue_47.tag === 1) {
                                const t_18 = matchValue_47.fields[0];
                                const matchValue_48 = t_18.SharePack;
                                if (matchValue_48 != null) {
                                    const matchValue_49 = SharePackPanel_handleCopyCaption(matchValue_48);
                                    if (matchValue_49.tag === 1) {
                                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_18.Project, t_18.Saving, t_18.Generating, t_18.Previewing, t_18.Baking, t_18.PreviewUrl, t_18.BakeUrl, t_18.PreviewJobId, t_18.BakeJobId, matchValue_49.fields[0], t_18.DragIndex, t_18.SelectedBlockId, t_18.VoiceoverDraft, t_18.ImagePromptDraft, t_18.MoodTagsDraft, t_18.CrossfadeDurationDraft, t_18.ImagePromptQuickButtons, t_18.ReferenceStrengthDraft, t_18.MediaRevision, t_18.VariantModal, t_18.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                                    }
                                    else {
                                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_updateSharePack((s_4) => (new SharePackModel(s_4.OutputDir, s_4.Files, s_4.CaptionPath, s_4.CaptionText, s_4.ReadmePath, s_4.MediaBase, s_4.Uploading, matchValue_49.fields[0], s_4.ConnectedAccounts)), t_18)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                                    }
                                }
                                else {
                                    return [model, Cmd_none()];
                                }
                            }
                            else {
                                return [model, Cmd_none()];
                            }
                        }
                        case 1: {
                            SharePackPanel_handleOpenYouTube();
                            return [model, Cmd_none()];
                        }
                        case 2: {
                            SharePackPanel_handleOpenMeta();
                            return [model, Cmd_none()];
                        }
                        case 3: {
                            const matchValue_50 = model.Page;
                            if (matchValue_50.tag === 1) {
                                const t_19 = matchValue_50.fields[0];
                                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_updateSharePack((sp_3) => (new SharePackModel(sp_3.OutputDir, sp_3.Files, sp_3.CaptionPath, sp_3.CaptionText, sp_3.ReadmePath, sp_3.MediaBase, "youtube", sp_3.UploadMessage, sp_3.ConnectedAccounts)), t_19)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_34) => {
                                    AsyncHelpers_start(x_34);
                                }, () => uploadSharePack(t_19.Project.Id, "youtube", t_19.Project.Name, map((sp_4) => sp_4.CaptionText, t_19.SharePack)), undefined, (Item_30) => (new AppMsg(25, [Item_30])))];
                            }
                            else {
                                return [model, Cmd_none()];
                            }
                        }
                        case 4: {
                            const matchValue_51 = model.Page;
                            if (matchValue_51.tag === 1) {
                                const t_20 = matchValue_51.fields[0];
                                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_updateSharePack((sp_5) => (new SharePackModel(sp_5.OutputDir, sp_5.Files, sp_5.CaptionPath, sp_5.CaptionText, sp_5.ReadmePath, sp_5.MediaBase, "meta", sp_5.UploadMessage, sp_5.ConnectedAccounts)), t_20)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_35) => {
                                    AsyncHelpers_start(x_35);
                                }, () => uploadSharePack(t_20.Project.Id, "meta", t_20.Project.Name, map((sp_6) => sp_6.CaptionText, t_20.SharePack)), undefined, (Item_31) => (new AppMsg(25, [Item_31])))];
                            }
                            else {
                                return [model, Cmd_none()];
                            }
                        }
                        default: {
                            const matchValue_46 = model.Page;
                            if (matchValue_46.tag === 1) {
                                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_clearSharePack(matchValue_46.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                            }
                            else {
                                return [model, Cmd_none()];
                            }
                        }
                    }
                case 31: {
                    const matchValue_57 = model.Page;
                    if (matchValue_57.tag === 1) {
                        const t_25 = matchValue_57.fields[0];
                        const ids_1 = map_1((b_3) => b_3.Id, sortBy((b_2) => b_2.Order, t_25.Project.Blocks, {
                            Compare: comparePrimitives,
                        }));
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_25.Project, true, t_25.Generating, t_25.Previewing, t_25.Baking, t_25.PreviewUrl, t_25.BakeUrl, t_25.PreviewJobId, t_25.BakeJobId, t_25.Error, t_25.DragIndex, t_25.SelectedBlockId, t_25.VoiceoverDraft, t_25.ImagePromptDraft, t_25.MoodTagsDraft, t_25.CrossfadeDurationDraft, t_25.ImagePromptQuickButtons, t_25.ReferenceStrengthDraft, t_25.MediaRevision, t_25.VariantModal, t_25.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_37) => {
                            AsyncHelpers_start(x_37);
                        }, () => reorderBlocks(t_25.Project.Id, ids_1), undefined, (Item_32) => (new AppMsg(7, [Item_32])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_60 = model.Page;
                    if (matchValue_60.tag === 1) {
                        const t_27 = matchValue_60.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_27.Project, true, t_27.Generating, t_27.Previewing, t_27.Baking, t_27.PreviewUrl, t_27.BakeUrl, t_27.PreviewJobId, t_27.BakeJobId, t_27.Error, t_27.DragIndex, t_27.SelectedBlockId, t_27.VoiceoverDraft, t_27.ImagePromptDraft, t_27.MoodTagsDraft, t_27.CrossfadeDurationDraft, t_27.ImagePromptQuickButtons, t_27.ReferenceStrengthDraft, t_27.MediaRevision, t_27.VariantModal, t_27.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_38) => {
                            AsyncHelpers_start(x_38);
                        }, () => importStylePackLogo(t_27.Project.Id, msg.fields[0].fields[0]), undefined, (Item_33) => (new AppMsg(21, [Item_33])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 26: {
                    const matchValue_63 = model.Page;
                    if (matchValue_63.tag === 1) {
                        const t_30 = matchValue_63.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_30.Project, t_30.Saving, t_30.Generating, t_30.Previewing, true, t_30.PreviewUrl, t_30.BakeUrl, t_30.PreviewJobId, t_30.BakeJobId, undefined, t_30.DragIndex, t_30.SelectedBlockId, t_30.VoiceoverDraft, t_30.ImagePromptDraft, t_30.MoodTagsDraft, t_30.CrossfadeDurationDraft, t_30.ImagePromptQuickButtons, t_30.ReferenceStrengthDraft, t_30.MediaRevision, t_30.VariantModal, t_30.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_39) => {
                            AsyncHelpers_start(x_39);
                        }, () => startBake(t_30.Project.Id), undefined, (Item_34) => (new AppMsg(22, [Item_34])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 30: {
                    const matchValue_68 = model.Page;
                    if (matchValue_68.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError(msg.fields[0].fields[0], matchValue_68.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 0: {
                    const matchValue_69 = model.Page;
                    if (matchValue_69.tag === 1) {
                        const t_35 = matchValue_69.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_35.Project, true, t_35.Generating, t_35.Previewing, t_35.Baking, t_35.PreviewUrl, t_35.BakeUrl, t_35.PreviewJobId, t_35.BakeJobId, t_35.Error, t_35.DragIndex, t_35.SelectedBlockId, t_35.VoiceoverDraft, t_35.ImagePromptDraft, t_35.MoodTagsDraft, t_35.CrossfadeDurationDraft, t_35.ImagePromptQuickButtons, t_35.ReferenceStrengthDraft, t_35.MediaRevision, t_35.VariantModal, t_35.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_40) => {
                            AsyncHelpers_start(x_40);
                        }, () => importBlockImage(t_35.Project.Id, msg.fields[0].fields[0]), undefined, (Item_35) => (new AppMsg(8, [Item_35])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_72 = model.Page;
                    if (matchValue_72.tag === 1) {
                        return withNav(new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_selectBlock(matchValue_72.fields[0], msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport));
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 14: {
                    const matchValue_73 = model.Page;
                    if (matchValue_73.tag === 1) {
                        const t_40 = matchValue_73.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_40.Project, t_40.Saving, t_40.Generating, t_40.Previewing, t_40.Baking, t_40.PreviewUrl, t_40.BakeUrl, t_40.PreviewJobId, t_40.BakeJobId, t_40.Error, t_40.DragIndex, t_40.SelectedBlockId, t_40.VoiceoverDraft, t_40.ImagePromptDraft, t_40.MoodTagsDraft, t_40.CrossfadeDurationDraft, t_40.ImagePromptQuickButtons, t_40.ReferenceStrengthDraft, t_40.MediaRevision, new VariantModalMode(0, []), t_40.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 15: {
                    const matchValue_74 = model.Page;
                    if (matchValue_74.tag === 1) {
                        const t_41 = matchValue_74.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_41.Project, t_41.Saving, t_41.Generating, t_41.Previewing, t_41.Baking, t_41.PreviewUrl, t_41.BakeUrl, t_41.PreviewJobId, t_41.BakeJobId, t_41.Error, t_41.DragIndex, t_41.SelectedBlockId, t_41.VoiceoverDraft, t_41.ImagePromptDraft, t_41.MoodTagsDraft, t_41.CrossfadeDurationDraft, t_41.ImagePromptQuickButtons, t_41.ReferenceStrengthDraft, t_41.MediaRevision, undefined, t_41.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 16: {
                    const matchValue_75 = model.Page;
                    if (matchValue_75.tag === 1) {
                        const t_42 = matchValue_75.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_42.Project, t_42.Saving, t_42.Generating, t_42.Previewing, t_42.Baking, t_42.PreviewUrl, t_42.BakeUrl, t_42.PreviewJobId, t_42.BakeJobId, t_42.Error, t_42.DragIndex, t_42.SelectedBlockId, t_42.VoiceoverDraft, t_42.ImagePromptDraft, t_42.MoodTagsDraft, t_42.CrossfadeDurationDraft, t_42.ImagePromptQuickButtons, t_42.ReferenceStrengthDraft, t_42.MediaRevision, new VariantModalMode(1, [msg.fields[0].fields[0]]), t_42.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 17: {
                    const matchValue_76 = model.Page;
                    if (matchValue_76.tag === 1) {
                        const t_43 = matchValue_76.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_43.Project, t_43.Saving, t_43.Generating, t_43.Previewing, t_43.Baking, t_43.PreviewUrl, t_43.BakeUrl, t_43.PreviewJobId, t_43.BakeJobId, t_43.Error, t_43.DragIndex, t_43.SelectedBlockId, t_43.VoiceoverDraft, t_43.ImagePromptDraft, t_43.MoodTagsDraft, t_43.CrossfadeDurationDraft, t_43.ImagePromptQuickButtons, t_43.ReferenceStrengthDraft, t_43.MediaRevision, new VariantModalMode(0, []), t_43.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 18: {
                    const matchValue_77 = model.Page;
                    if (matchValue_77.tag === 1) {
                        const t_44 = matchValue_77.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_44.Project, t_44.Saving, t_44.Generating, t_44.Previewing, t_44.Baking, t_44.PreviewUrl, t_44.BakeUrl, t_44.PreviewJobId, t_44.BakeJobId, t_44.Error, t_44.DragIndex, t_44.SelectedBlockId, t_44.VoiceoverDraft, msg.fields[0].fields[0], t_44.MoodTagsDraft, t_44.CrossfadeDurationDraft, t_44.ImagePromptQuickButtons, t_44.ReferenceStrengthDraft, t_44.MediaRevision, t_44.VariantModal, t_44.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 19: {
                    const matchValue_78 = model.Page;
                    if (matchValue_78.tag === 1) {
                        const t_45 = matchValue_78.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_45.Project, t_45.Saving, t_45.Generating, t_45.Previewing, t_45.Baking, t_45.PreviewUrl, t_45.BakeUrl, t_45.PreviewJobId, t_45.BakeJobId, t_45.Error, t_45.DragIndex, t_45.SelectedBlockId, t_45.VoiceoverDraft, t_45.ImagePromptDraft, t_45.MoodTagsDraft, t_45.CrossfadeDurationDraft, loadAll(), t_45.ReferenceStrengthDraft, t_45.MediaRevision, t_45.VariantModal, t_45.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    const matchValue_79 = model.Page;
                    if (matchValue_79.tag === 1) {
                        const t_46 = matchValue_79.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_46.Project, t_46.Saving, t_46.Generating, t_46.Previewing, t_46.Baking, t_46.PreviewUrl, t_46.BakeUrl, t_46.PreviewJobId, t_46.BakeJobId, t_46.Error, t_46.DragIndex, t_46.SelectedBlockId, msg.fields[0].fields[0], t_46.ImagePromptDraft, t_46.MoodTagsDraft, t_46.CrossfadeDurationDraft, t_46.ImagePromptQuickButtons, t_46.ReferenceStrengthDraft, t_46.MediaRevision, t_46.VariantModal, t_46.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 8: {
                    const matchValue_80 = model.Page;
                    if (matchValue_80.tag === 1) {
                        const t_47 = matchValue_80.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_47.Project, t_47.Saving, t_47.Generating, t_47.Previewing, t_47.Baking, t_47.PreviewUrl, t_47.BakeUrl, t_47.PreviewJobId, t_47.BakeJobId, t_47.Error, t_47.DragIndex, t_47.SelectedBlockId, t_47.VoiceoverDraft, msg.fields[0].fields[0], t_47.MoodTagsDraft, t_47.CrossfadeDurationDraft, t_47.ImagePromptQuickButtons, t_47.ReferenceStrengthDraft, t_47.MediaRevision, t_47.VariantModal, t_47.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 9: {
                    const matchValue_81 = model.Page;
                    if (matchValue_81.tag === 1) {
                        const t_48 = matchValue_81.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_48.Project, t_48.Saving, t_48.Generating, t_48.Previewing, t_48.Baking, t_48.PreviewUrl, t_48.BakeUrl, t_48.PreviewJobId, t_48.BakeJobId, t_48.Error, t_48.DragIndex, t_48.SelectedBlockId, t_48.VoiceoverDraft, t_48.ImagePromptDraft, msg.fields[0].fields[0], t_48.CrossfadeDurationDraft, t_48.ImagePromptQuickButtons, t_48.ReferenceStrengthDraft, t_48.MediaRevision, t_48.VariantModal, t_48.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 10: {
                    const matchValue_82 = model.Page;
                    if (matchValue_82.tag === 1) {
                        const t_49 = matchValue_82.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_49.Project, t_49.Saving, t_49.Generating, t_49.Previewing, t_49.Baking, t_49.PreviewUrl, t_49.BakeUrl, t_49.PreviewJobId, t_49.BakeJobId, t_49.Error, t_49.DragIndex, t_49.SelectedBlockId, t_49.VoiceoverDraft, t_49.ImagePromptDraft, t_49.MoodTagsDraft, max(0, msg.fields[0].fields[0]), t_49.ImagePromptQuickButtons, t_49.ReferenceStrengthDraft, t_49.MediaRevision, t_49.VariantModal, t_49.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 11: {
                    const matchValue_83 = model.Page;
                    if (matchValue_83.tag === 1) {
                        const t_50 = matchValue_83.fields[0];
                        const matchValue_84 = t_50.SelectedBlockId;
                        if (matchValue_84 != null) {
                            const blockId_3 = matchValue_84;
                            const prompt_1 = isNullOrWhiteSpace(t_50.ImagePromptDraft) ? undefined : t_50.ImagePromptDraft;
                            let moodTags;
                            const tags = ofArray((array_1 = map_2((s_5) => s_5.trim(), split(t_50.MoodTagsDraft, [","], undefined, 0)), array_1.filter((s_6) => !isNullOrWhiteSpace(s_6))));
                            moodTags = (isEmpty(tags) ? undefined : tags);
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_50.Project, true, t_50.Generating, t_50.Previewing, t_50.Baking, t_50.PreviewUrl, t_50.BakeUrl, t_50.PreviewJobId, t_50.BakeJobId, t_50.Error, t_50.DragIndex, t_50.SelectedBlockId, t_50.VoiceoverDraft, t_50.ImagePromptDraft, t_50.MoodTagsDraft, t_50.CrossfadeDurationDraft, t_50.ImagePromptQuickButtons, t_50.ReferenceStrengthDraft, t_50.MediaRevision, t_50.VariantModal, t_50.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_43) => {
                                AsyncHelpers_start(x_43);
                            }, () => updateBlock(t_50.Project.Id, blockId_3, t_50.VoiceoverDraft, prompt_1, t_50.CrossfadeDurationDraft, moodTags), undefined, (Item_37) => (new AppMsg(9, [Item_37])))];
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
                    const matchValue_87 = model.Page;
                    if (matchValue_87.tag === 1) {
                        const t_53 = matchValue_87.fields[0];
                        const matchValue_88 = t_53.SelectedBlockId;
                        if (matchValue_88 != null) {
                            const blockId_4 = matchValue_88;
                            const block_2 = tryFind((b_5) => (b_5.Id === blockId_4), t_53.Project.Blocks);
                            const useThumbnail = !(bind((g) => g.ReferenceAssetPath, bind((b_6) => b_6.Generation, block_2)) != null) && (bind((b_7) => b_7.ThumbnailPath, block_2) != null);
                            const prompt_2 = StoryboardTimeline_isUnusablePromptDraft(t_53.ImagePromptDraft) ? undefined : (isNullOrWhiteSpace(t_53.ImagePromptDraft) ? undefined : t_53.ImagePromptDraft);
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_53.Project, t_53.Saving, true, t_53.Previewing, t_53.Baking, t_53.PreviewUrl, t_53.BakeUrl, t_53.PreviewJobId, t_53.BakeJobId, undefined, t_53.DragIndex, t_53.SelectedBlockId, t_53.VoiceoverDraft, t_53.ImagePromptDraft, t_53.MoodTagsDraft, t_53.CrossfadeDurationDraft, t_53.ImagePromptQuickButtons, t_53.ReferenceStrengthDraft, t_53.MediaRevision, t_53.VariantModal, t_53.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_44) => {
                                AsyncHelpers_start(x_44);
                            }, () => generateBlockThumbnail(t_53.Project.Id, blockId_4, prompt_2, 3, t_53.ReferenceStrengthDraft, useThumbnail), undefined, (Item_38) => (new AppMsg(10, [Item_38])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 20: {
                    const matchValue_89 = model.Page;
                    if (matchValue_89.tag === 1) {
                        const t_54 = matchValue_89.fields[0];
                        const matchValue_90 = t_54.SelectedBlockId;
                        if (matchValue_90 != null) {
                            const blockId_5 = matchValue_90;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_54.Project, true, t_54.Generating, t_54.Previewing, t_54.Baking, t_54.PreviewUrl, t_54.BakeUrl, t_54.PreviewJobId, t_54.BakeJobId, t_54.Error, t_54.DragIndex, t_54.SelectedBlockId, t_54.VoiceoverDraft, t_54.ImagePromptDraft, t_54.MoodTagsDraft, t_54.CrossfadeDurationDraft, t_54.ImagePromptQuickButtons, t_54.ReferenceStrengthDraft, t_54.MediaRevision, t_54.VariantModal, t_54.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_45) => {
                                AsyncHelpers_start(x_45);
                            }, () => importBlockReferenceImage(t_54.Project.Id, blockId_5, msg.fields[0].fields[0]), undefined, (Item_39) => (new AppMsg(30, [Item_39])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 21: {
                    const matchValue_91 = model.Page;
                    if (matchValue_91.tag === 1) {
                        const t_55 = matchValue_91.fields[0];
                        const matchValue_92 = t_55.SelectedBlockId;
                        if (matchValue_92 != null) {
                            const blockId_6 = matchValue_92;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_55.Project, true, t_55.Generating, t_55.Previewing, t_55.Baking, t_55.PreviewUrl, t_55.BakeUrl, t_55.PreviewJobId, t_55.BakeJobId, t_55.Error, t_55.DragIndex, t_55.SelectedBlockId, t_55.VoiceoverDraft, t_55.ImagePromptDraft, t_55.MoodTagsDraft, t_55.CrossfadeDurationDraft, t_55.ImagePromptQuickButtons, t_55.ReferenceStrengthDraft, t_55.MediaRevision, t_55.VariantModal, t_55.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_46) => {
                                AsyncHelpers_start(x_46);
                            }, () => clearBlockReferenceImage(t_55.Project.Id, blockId_6), undefined, (Item_40) => (new AppMsg(30, [Item_40])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 22: {
                    const matchValue_93 = model.Page;
                    if (matchValue_93.tag === 1) {
                        const t_56 = matchValue_93.fields[0];
                        const matchValue_94 = t_56.SelectedBlockId;
                        if (matchValue_94 != null) {
                            const blockId_7 = matchValue_94;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_56.Project, true, t_56.Generating, t_56.Previewing, t_56.Baking, t_56.PreviewUrl, t_56.BakeUrl, t_56.PreviewJobId, t_56.BakeJobId, t_56.Error, t_56.DragIndex, t_56.SelectedBlockId, t_56.VoiceoverDraft, t_56.ImagePromptDraft, t_56.MoodTagsDraft, t_56.CrossfadeDurationDraft, t_56.ImagePromptQuickButtons, t_56.ReferenceStrengthDraft, t_56.MediaRevision, t_56.VariantModal, t_56.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_47) => {
                                AsyncHelpers_start(x_47);
                            }, () => useBlockThumbnailAsReference(t_56.Project.Id, blockId_7), undefined, (Item_41) => (new AppMsg(30, [Item_41])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 23: {
                    const matchValue_95 = model.Page;
                    if (matchValue_95.tag === 1) {
                        const t_57 = matchValue_95.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_57.Project, t_57.Saving, t_57.Generating, t_57.Previewing, t_57.Baking, t_57.PreviewUrl, t_57.BakeUrl, t_57.PreviewJobId, t_57.BakeJobId, t_57.Error, t_57.DragIndex, t_57.SelectedBlockId, t_57.VoiceoverDraft, t_57.ImagePromptDraft, t_57.MoodTagsDraft, t_57.CrossfadeDurationDraft, t_57.ImagePromptQuickButtons, max(0.15, min(0.65, msg.fields[0].fields[0])), t_57.MediaRevision, t_57.VariantModal, t_57.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 24: {
                    const matchValue_100 = model.Page;
                    if (matchValue_100.tag === 1) {
                        const t_62 = matchValue_100.fields[0];
                        const matchValue_101 = t_62.SelectedBlockId;
                        if (matchValue_101 != null) {
                            const blockId_8 = matchValue_101;
                            return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_62.Project, true, t_62.Generating, t_62.Previewing, t_62.Baking, t_62.PreviewUrl, t_62.BakeUrl, t_62.PreviewJobId, t_62.BakeJobId, t_62.Error, t_62.DragIndex, t_62.SelectedBlockId, t_62.VoiceoverDraft, t_62.ImagePromptDraft, t_62.MoodTagsDraft, t_62.CrossfadeDurationDraft, t_62.ImagePromptQuickButtons, t_62.ReferenceStrengthDraft, t_62.MediaRevision, t_62.VariantModal, t_62.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_48) => {
                                AsyncHelpers_start(x_48);
                            }, () => importBlockAudio(t_62.Project.Id, blockId_8, msg.fields[0].fields[0]), undefined, (Item_42) => (new AppMsg(11, [Item_42])))];
                        }
                        else {
                            return [model, Cmd_none()];
                        }
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 25: {
                    const matchValue_104 = model.Page;
                    if (matchValue_104.tag === 1) {
                        const t_65 = matchValue_104.fields[0];
                        return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_65.Project, t_65.Saving, t_65.Generating, true, t_65.Baking, t_65.PreviewUrl, t_65.BakeUrl, t_65.PreviewJobId, t_65.BakeJobId, undefined, t_65.DragIndex, t_65.SelectedBlockId, t_65.VoiceoverDraft, t_65.ImagePromptDraft, t_65.MoodTagsDraft, t_65.CrossfadeDurationDraft, t_65.ImagePromptQuickButtons, t_65.ReferenceStrengthDraft, t_65.MediaRevision, t_65.VariantModal, t_65.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_49) => {
                            AsyncHelpers_start(x_49);
                        }, () => refreshMockupPreview(t_65.Project.Id), undefined, (Item_43) => (new AppMsg(12, [Item_43])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 29: {
                    const matchValue_108 = model.Page;
                    if (matchValue_108.tag === 1) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_108.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                default: {
                    const patternInput_11 = withNav(new AppModel((bind$0040_22 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_22.Activity, bind$0040_22.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport));
                    return [patternInput_11[0], Cmd_batch(ofArray([patternInput_11[1], Cmd_OfAsyncWith_perform((x_28) => {
                        AsyncHelpers_start(x_28);
                    }, getProjects, undefined, (Item_25) => (new AppMsg(4, [Item_25])))]))];
                }
            }
        case 24:
            if (msg.fields[0].tag === 1) {
                return [model, Cmd_none()];
            }
            else {
                const matchValue_42 = model.Page;
                if (matchValue_42.tag === 1) {
                    const t_14 = matchValue_42.fields[0];
                    const matchValue_43 = t_14.SharePack;
                    if (matchValue_43 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        const sp = matchValue_43;
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_updateSharePack((s_3) => (new SharePackModel(s_3.OutputDir, s_3.Files, s_3.CaptionPath, s_3.CaptionText, s_3.ReadmePath, s_3.MediaBase, s_3.Uploading, s_3.UploadMessage, msg.fields[0].fields[0])), t_14)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 23:
            if (msg.fields[0].tag === 1) {
                const matchValue_45 = model.Page;
                if (matchValue_45.tag === 1) {
                    const t_16 = matchValue_45.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_16.Project, false, t_16.Generating, t_16.Previewing, t_16.Baking, t_16.PreviewUrl, t_16.BakeUrl, t_16.PreviewJobId, t_16.BakeJobId, msg.fields[0].fields[0], t_16.DragIndex, t_16.SelectedBlockId, t_16.VoiceoverDraft, t_16.ImagePromptDraft, t_16.MoodTagsDraft, t_16.CrossfadeDurationDraft, t_16.ImagePromptQuickButtons, t_16.ReferenceStrengthDraft, t_16.MediaRevision, t_16.VariantModal, t_16.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_44 = model.Page;
                if (matchValue_44.tag === 1) {
                    const t_15 = matchValue_44.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withSharePack(SharePackPanel_fromExport(msg.fields[0].fields[0], (value_1 = (new ConnectedAccountsDto(false, empty())), defaultArg(bind((sp_1) => sp_1.ConnectedAccounts, t_15.SharePack), value_1))), t_15)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 25:
            if (msg.fields[0].tag === 1) {
                const matchValue_54 = model.Page;
                if (matchValue_54.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [(t$0027 = StoryboardTimeline_updateSharePack((sp_8) => (new SharePackModel(sp_8.OutputDir, sp_8.Files, sp_8.CaptionPath, sp_8.CaptionText, sp_8.ReadmePath, sp_8.MediaBase, undefined, sp_8.UploadMessage, sp_8.ConnectedAccounts)), matchValue_54.fields[0]), new TimelineModel(t$0027.Project, t$0027.Saving, t$0027.Generating, t$0027.Previewing, t$0027.Baking, t$0027.PreviewUrl, t$0027.BakeUrl, t$0027.PreviewJobId, t$0027.BakeJobId, msg.fields[0].fields[0], t$0027.DragIndex, t$0027.SelectedBlockId, t$0027.VoiceoverDraft, t$0027.ImagePromptDraft, t$0027.MoodTagsDraft, t$0027.CrossfadeDurationDraft, t$0027.ImagePromptQuickButtons, t$0027.ReferenceStrengthDraft, t$0027.MediaRevision, t$0027.VariantModal, t$0027.SharePack))]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_52 = model.Page;
                if (matchValue_52.tag === 1) {
                    let msg_8;
                    const matchValue_53 = msg.fields[0].fields[0].Url;
                    msg_8 = ((matchValue_53 == null) ? msg.fields[0].fields[0].Message : (`${msg.fields[0].fields[0].Message}: ${matchValue_53}`));
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_updateSharePack((sp_7) => (new SharePackModel(sp_7.OutputDir, sp_7.Files, sp_7.CaptionPath, sp_7.CaptionText, sp_7.ReadmePath, sp_7.MediaBase, undefined, msg_8, sp_7.ConnectedAccounts)), matchValue_52.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 29:
            if (msg.fields[0].tag === 1) {
                const matchValue_56 = model.Page;
                if (matchValue_56.tag === 1) {
                    const t_24 = matchValue_56.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_24.Project, false, t_24.Generating, t_24.Previewing, t_24.Baking, t_24.PreviewUrl, t_24.BakeUrl, t_24.PreviewJobId, t_24.BakeJobId, msg.fields[0].fields[0], t_24.DragIndex, t_24.SelectedBlockId, t_24.VoiceoverDraft, t_24.ImagePromptDraft, t_24.MoodTagsDraft, t_24.CrossfadeDurationDraft, t_24.ImagePromptQuickButtons, t_24.ReferenceStrengthDraft, t_24.MediaRevision, t_24.VariantModal, t_24.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_55 = model.Page;
                if (matchValue_55.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_55.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 7:
            if (msg.fields[0].tag === 1) {
                const matchValue_59 = model.Page;
                if (matchValue_59.tag === 1) {
                    const t_26 = matchValue_59.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_26.Project, false, t_26.Generating, t_26.Previewing, t_26.Baking, t_26.PreviewUrl, t_26.BakeUrl, t_26.PreviewJobId, t_26.BakeJobId, msg.fields[0].fields[0], t_26.DragIndex, t_26.SelectedBlockId, t_26.VoiceoverDraft, t_26.ImagePromptDraft, t_26.MoodTagsDraft, t_26.CrossfadeDurationDraft, t_26.ImagePromptQuickButtons, t_26.ReferenceStrengthDraft, t_26.MediaRevision, t_26.VariantModal, t_26.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [(bind$0040_23 = StoryboardTimeline_init(msg.fields[0].fields[0]), new TimelineModel(bind$0040_23.Project, false, bind$0040_23.Generating, bind$0040_23.Previewing, bind$0040_23.Baking, bind$0040_23.PreviewUrl, bind$0040_23.BakeUrl, bind$0040_23.PreviewJobId, bind$0040_23.BakeJobId, undefined, bind$0040_23.DragIndex, bind$0040_23.SelectedBlockId, bind$0040_23.VoiceoverDraft, bind$0040_23.ImagePromptDraft, bind$0040_23.MoodTagsDraft, bind$0040_23.CrossfadeDurationDraft, bind$0040_23.ImagePromptQuickButtons, bind$0040_23.ReferenceStrengthDraft, bind$0040_23.MediaRevision, bind$0040_23.VariantModal, bind$0040_23.SharePack))]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        case 21:
            if (msg.fields[0].tag === 1) {
                const matchValue_62 = model.Page;
                if (matchValue_62.tag === 1) {
                    const t_29 = matchValue_62.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_29.Project, false, t_29.Generating, t_29.Previewing, t_29.Baking, t_29.PreviewUrl, t_29.BakeUrl, t_29.PreviewJobId, t_29.BakeJobId, msg.fields[0].fields[0], t_29.DragIndex, t_29.SelectedBlockId, t_29.VoiceoverDraft, t_29.ImagePromptDraft, t_29.MoodTagsDraft, t_29.CrossfadeDurationDraft, t_29.ImagePromptQuickButtons, t_29.ReferenceStrengthDraft, t_29.MediaRevision, t_29.VariantModal, t_29.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_61 = model.Page;
                if (matchValue_61.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_61.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 22:
            if (msg.fields[0].tag === 1) {
                const matchValue_66 = model.Page;
                if (matchValue_66.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError(msg.fields[0].fields[0], matchValue_66.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_64 = model.Page;
                if (matchValue_64.tag === 1) {
                    const t_31 = matchValue_64.fields[0];
                    let matchValue_65;
                    let outArg = "00000000-0000-0000-0000-000000000000";
                    matchValue_65 = [tryParse(msg.fields[0].fields[0], new FSharpRef(() => outArg, (v) => {
                        outArg = v;
                    })), outArg];
                    if (matchValue_65[0]) {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeStarted(matchValue_65[1], t_31)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeError("Invalid bake job id", t_31)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 14: {
            const matchValue_67 = model.Page;
            if (matchValue_67.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withBakeUrl(msg.fields[0], matchValue_67.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 8:
            if (msg.fields[0].tag === 1) {
                const matchValue_71 = model.Page;
                if (matchValue_71.tag === 1) {
                    const t_38 = matchValue_71.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_38.Project, false, t_38.Generating, t_38.Previewing, t_38.Baking, t_38.PreviewUrl, t_38.BakeUrl, t_38.PreviewJobId, t_38.BakeJobId, msg.fields[0].fields[0], t_38.DragIndex, t_38.SelectedBlockId, t_38.VoiceoverDraft, t_38.ImagePromptDraft, t_38.MoodTagsDraft, t_38.CrossfadeDurationDraft, t_38.ImagePromptQuickButtons, t_38.ReferenceStrengthDraft, t_38.MediaRevision, t_38.VariantModal, t_38.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else if (model.Page.tag === 1) {
                const lastBlock = tryLast(sortBy((b_4) => b_4.Order, msg.fields[0].fields[0].Blocks, {
                    Compare: comparePrimitives,
                }));
                let timeline_1;
                if (lastBlock == null) {
                    timeline_1 = StoryboardTimeline_init(msg.fields[0].fields[0]);
                }
                else {
                    const block = lastBlock;
                    const t_37 = StoryboardTimeline_selectBlock(StoryboardTimeline_init(msg.fields[0].fields[0]), block.Id);
                    timeline_1 = (new TimelineModel(t_37.Project, t_37.Saving, t_37.Generating, t_37.Previewing, t_37.Baking, t_37.PreviewUrl, t_37.BakeUrl, t_37.PreviewJobId, t_37.BakeJobId, t_37.Error, t_37.DragIndex, t_37.SelectedBlockId, t_37.VoiceoverDraft, "", t_37.MoodTagsDraft, t_37.CrossfadeDurationDraft, t_37.ImagePromptQuickButtons, t_37.ReferenceStrengthDraft, t_37.MediaRevision, t_37.VariantModal, t_37.SharePack));
                }
                const model$0027_16 = new AppModel(model.Shell, new AppPage(1, [new TimelineModel(timeline_1.Project, false, timeline_1.Generating, timeline_1.Previewing, timeline_1.Baking, timeline_1.PreviewUrl, timeline_1.BakeUrl, timeline_1.PreviewJobId, timeline_1.BakeJobId, undefined, timeline_1.DragIndex, timeline_1.SelectedBlockId, timeline_1.VoiceoverDraft, timeline_1.ImagePromptDraft, timeline_1.MoodTagsDraft, timeline_1.CrossfadeDurationDraft, timeline_1.ImagePromptQuickButtons, timeline_1.ReferenceStrengthDraft, timeline_1.MediaRevision, timeline_1.VariantModal, timeline_1.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport);
                if (lastBlock == null) {
                    return [model$0027_16, Cmd_none()];
                }
                else {
                    const block_1 = lastBlock;
                    return [model$0027_16, Cmd_OfAsyncWith_perform((x_42) => {
                        AsyncHelpers_start(x_42);
                    }, () => useBlockThumbnailAsReference(msg.fields[0].fields[0].Id, block_1.Id), undefined, (Item_36) => (new AppMsg(30, [Item_36])))];
                }
            }
            else {
                return [model, Cmd_none()];
            }
        case 9:
            if (msg.fields[0].tag === 1) {
                const matchValue_86 = model.Page;
                if (matchValue_86.tag === 1) {
                    const t_52 = matchValue_86.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_52.Project, false, t_52.Generating, t_52.Previewing, t_52.Baking, t_52.PreviewUrl, t_52.BakeUrl, t_52.PreviewJobId, t_52.BakeJobId, msg.fields[0].fields[0], t_52.DragIndex, t_52.SelectedBlockId, t_52.VoiceoverDraft, t_52.ImagePromptDraft, t_52.MoodTagsDraft, t_52.CrossfadeDurationDraft, t_52.ImagePromptQuickButtons, t_52.ReferenceStrengthDraft, t_52.MediaRevision, t_52.VariantModal, t_52.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_85 = model.Page;
                if (matchValue_85.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_85.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 30:
            if (msg.fields[0].tag === 1) {
                const matchValue_97 = model.Page;
                if (matchValue_97.tag === 1) {
                    const t_59 = matchValue_97.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_59.Project, false, t_59.Generating, t_59.Previewing, t_59.Baking, t_59.PreviewUrl, t_59.BakeUrl, t_59.PreviewJobId, t_59.BakeJobId, msg.fields[0].fields[0], t_59.DragIndex, t_59.SelectedBlockId, t_59.VoiceoverDraft, t_59.ImagePromptDraft, t_59.MoodTagsDraft, t_59.CrossfadeDurationDraft, t_59.ImagePromptQuickButtons, t_59.ReferenceStrengthDraft, t_59.MediaRevision, t_59.VariantModal, t_59.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_96 = model.Page;
                if (matchValue_96.tag === 1) {
                    const t$0027_1 = StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_96.fields[0]);
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t$0027_1.Project, t$0027_1.Saving, t$0027_1.Generating, t$0027_1.Previewing, t$0027_1.Baking, t$0027_1.PreviewUrl, t$0027_1.BakeUrl, t$0027_1.PreviewJobId, t$0027_1.BakeJobId, t$0027_1.Error, t$0027_1.DragIndex, t$0027_1.SelectedBlockId, t$0027_1.VoiceoverDraft, StoryboardTimeline_isUnusablePromptDraft(t$0027_1.ImagePromptDraft) ? "" : t$0027_1.ImagePromptDraft, t$0027_1.MoodTagsDraft, t$0027_1.CrossfadeDurationDraft, t$0027_1.ImagePromptQuickButtons, t$0027_1.ReferenceStrengthDraft, t$0027_1.MediaRevision, t$0027_1.VariantModal, t$0027_1.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 10:
            if (msg.fields[0].tag === 1) {
                const matchValue_99 = model.Page;
                if (matchValue_99.tag === 1) {
                    const t_61 = matchValue_99.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_61.Project, t_61.Saving, false, t_61.Previewing, t_61.Baking, t_61.PreviewUrl, t_61.BakeUrl, t_61.PreviewJobId, t_61.BakeJobId, msg.fields[0].fields[0], t_61.DragIndex, t_61.SelectedBlockId, t_61.VoiceoverDraft, t_61.ImagePromptDraft, t_61.MoodTagsDraft, t_61.CrossfadeDurationDraft, t_61.ImagePromptQuickButtons, t_61.ReferenceStrengthDraft, t_61.MediaRevision, t_61.VariantModal, t_61.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_98 = model.Page;
                if (matchValue_98.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProjectAfterGenerate(msg.fields[0].fields[0], matchValue_98.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 11:
            if (msg.fields[0].tag === 1) {
                const matchValue_103 = model.Page;
                if (matchValue_103.tag === 1) {
                    const t_64 = matchValue_103.fields[0];
                    return [new AppModel(model.Shell, new AppPage(1, [new TimelineModel(t_64.Project, false, t_64.Generating, t_64.Previewing, t_64.Baking, t_64.PreviewUrl, t_64.BakeUrl, t_64.PreviewJobId, t_64.BakeJobId, msg.fields[0].fields[0], t_64.DragIndex, t_64.SelectedBlockId, t_64.VoiceoverDraft, t_64.ImagePromptDraft, t_64.MoodTagsDraft, t_64.CrossfadeDurationDraft, t_64.ImagePromptQuickButtons, t_64.ReferenceStrengthDraft, t_64.MediaRevision, t_64.VariantModal, t_64.SharePack)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_102 = model.Page;
                if (matchValue_102.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withProject(msg.fields[0].fields[0], matchValue_102.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 12:
            if (msg.fields[0].tag === 1) {
                const matchValue_106 = model.Page;
                if (matchValue_106.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewError(msg.fields[0].fields[0], matchValue_106.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_105 = model.Page;
                if (matchValue_105.tag === 1) {
                    return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewStarted(msg.fields[0].fields[0].JobId, matchValue_105.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 13: {
            const matchValue_107 = model.Page;
            if (matchValue_107.tag === 1) {
                return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_withPreviewUrl(msg.fields[0], matchValue_107.fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
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
                const model$0027_17 = new AppModel((bind$0040_24 = model.Shell, new ShellModel(bind$0040_24.Tab, bind$0040_24.Activity, msg.fields[0].fields[0])), model.Page, model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport);
                const matchValue_109 = model.Page;
                if (matchValue_109.tag === 2) {
                    const st_2 = matchValue_109.fields[0];
                    return [new AppModel(model$0027_17.Shell, new AppPage(2, [new SettingsModel(msg.fields[0].fields[0], st_2.ModelStatus, st_2.Message, st_2.CheckingUpdates, st_2.SyncingModels, st_2.ShowFirstRunBanner, st_2.ErrorReportingConsent, st_2.ErrorReportingBusy, st_2.ConnectedAccounts, st_2.OAuthBusy, st_2.QuickButtonsCustom, st_2.QuickButtonLabelDraft, st_2.QuickButtonPromptDraft)]), model$0027_17.SetupWizard, model$0027_17.OpenProjectId, model$0027_17.HostStartup, model$0027_17.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model$0027_17, Cmd_none()];
                }
            }
        case 3:
            switch (msg.fields[0].tag) {
                case 15: {
                    const matchValue_110 = model.Page;
                    if (matchValue_110.tag === 2) {
                        const st_3 = matchValue_110.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_3.Status, st_3.ModelStatus, st_3.Message, st_3.CheckingUpdates, st_3.SyncingModels, st_3.ShowFirstRunBanner, st_3.ErrorReportingConsent, st_3.ErrorReportingBusy, st_3.ConnectedAccounts, st_3.OAuthBusy, st_3.QuickButtonsCustom, msg.fields[0].fields[0], st_3.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 16: {
                    const matchValue_111 = model.Page;
                    if (matchValue_111.tag === 2) {
                        const st_4 = matchValue_111.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_4.Status, st_4.ModelStatus, st_4.Message, st_4.CheckingUpdates, st_4.SyncingModels, st_4.ShowFirstRunBanner, st_4.ErrorReportingConsent, st_4.ErrorReportingBusy, st_4.ConnectedAccounts, st_4.OAuthBusy, st_4.QuickButtonsCustom, st_4.QuickButtonLabelDraft, msg.fields[0].fields[0])]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 17: {
                    const matchValue_112 = model.Page;
                    if (matchValue_112.tag === 2) {
                        const st_5 = matchValue_112.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_5.Status, st_5.ModelStatus, st_5.Message, st_5.CheckingUpdates, st_5.SyncingModels, st_5.ShowFirstRunBanner, st_5.ErrorReportingConsent, st_5.ErrorReportingBusy, st_5.ConnectedAccounts, st_5.OAuthBusy, addCustom(st_5.QuickButtonLabelDraft, st_5.QuickButtonPromptDraft), "", "")]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), singleton((dispatch_5) => {
                            dispatch_5(new AppMsg(2, [new TimelineMsg(19, [])]));
                        })];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 18: {
                    const matchValue_113 = model.Page;
                    if (matchValue_113.tag === 2) {
                        const st_6 = matchValue_113.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_6.Status, st_6.ModelStatus, st_6.Message, st_6.CheckingUpdates, st_6.SyncingModels, st_6.ShowFirstRunBanner, st_6.ErrorReportingConsent, st_6.ErrorReportingBusy, st_6.ConnectedAccounts, st_6.OAuthBusy, removeCustom(msg.fields[0].fields[0]), st_6.QuickButtonLabelDraft, st_6.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), singleton((dispatch_6) => {
                            dispatch_6(new AppMsg(2, [new TimelineMsg(19, [])]));
                        })];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 0: {
                    const matchValue_114 = model.Page;
                    if (matchValue_114.tag === 2) {
                        const st_7 = matchValue_114.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_7.Status, st_7.ModelStatus, st_7.Message, true, st_7.SyncingModels, st_7.ShowFirstRunBanner, st_7.ErrorReportingConsent, st_7.ErrorReportingBusy, st_7.ConnectedAccounts, st_7.OAuthBusy, st_7.QuickButtonsCustom, st_7.QuickButtonLabelDraft, st_7.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_51) => {
                            AsyncHelpers_start(x_51);
                        }, checkForUpdates, undefined, (r_2) => (new AppMsg(18, [(r_2.tag === 1) ? r_2.fields[0] : r_2.fields[0]])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 4: {
                    const matchValue_116 = model.Page;
                    if (matchValue_116.tag === 2) {
                        const st_9 = matchValue_116.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_9.Status, st_9.ModelStatus, st_9.Message, st_9.CheckingUpdates, true, st_9.ShowFirstRunBanner, st_9.ErrorReportingConsent, st_9.ErrorReportingBusy, st_9.ConnectedAccounts, st_9.OAuthBusy, st_9.QuickButtonsCustom, st_9.QuickButtonLabelDraft, st_9.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_52) => {
                            AsyncHelpers_start(x_52);
                        }, getModelStatus, undefined, (Item_45) => (new AppMsg(17, [Item_45])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 5: {
                    const matchValue_117 = model.Page;
                    if (matchValue_117.tag === 2) {
                        const st_10 = matchValue_117.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_10.Status, st_10.ModelStatus, st_10.Message, st_10.CheckingUpdates, true, st_10.ShowFirstRunBanner, st_10.ErrorReportingConsent, st_10.ErrorReportingBusy, st_10.ConnectedAccounts, st_10.OAuthBusy, st_10.QuickButtonsCustom, st_10.QuickButtonLabelDraft, st_10.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_53) => {
                            AsyncHelpers_start(x_53);
                        }, () => syncModels(false), undefined, (r_3) => (new AppMsg(18, [(r_3.tag === 1) ? r_3.fields[0] : "Model check started"]))), Cmd_OfAsyncWith_perform((x_54) => {
                            AsyncHelpers_start(x_54);
                        }, getModelStatus, undefined, (Item_46) => (new AppMsg(17, [Item_46])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 6: {
                    const matchValue_118 = model.Page;
                    if (matchValue_118.tag === 2) {
                        const st_11 = matchValue_118.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_11.Status, st_11.ModelStatus, st_11.Message, st_11.CheckingUpdates, true, st_11.ShowFirstRunBanner, st_11.ErrorReportingConsent, st_11.ErrorReportingBusy, st_11.ConnectedAccounts, st_11.OAuthBusy, st_11.QuickButtonsCustom, st_11.QuickButtonLabelDraft, st_11.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_55) => {
                            AsyncHelpers_start(x_55);
                        }, () => syncModels(true), undefined, (r_4) => (new AppMsg(18, [(r_4.tag === 1) ? r_4.fields[0] : "Model sync/pull started"]))), Cmd_OfAsyncWith_perform((x_56) => {
                            AsyncHelpers_start(x_56);
                        }, getModelStatus, undefined, (Item_47) => (new AppMsg(17, [Item_47])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 7: {
                    Settings_markBootstrapStarted();
                    const matchValue_119 = model.Page;
                    if (matchValue_119.tag === 2) {
                        const st_12 = matchValue_119.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_12.Status, st_12.ModelStatus, st_12.Message, st_12.CheckingUpdates, st_12.SyncingModels, false, st_12.ErrorReportingConsent, st_12.ErrorReportingBusy, st_12.ConnectedAccounts, st_12.OAuthBusy, st_12.QuickButtonsCustom, st_12.QuickButtonLabelDraft, st_12.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 1: {
                    const matchValue_120 = model.Page;
                    if (matchValue_120.tag === 2) {
                        const st_13 = matchValue_120.fields[0];
                        Settings_markBootstrapStarted();
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_13.Status, st_13.ModelStatus, st_13.Message, st_13.CheckingUpdates, st_13.SyncingModels, false, st_13.ErrorReportingConsent, st_13.ErrorReportingBusy, st_13.ConnectedAccounts, st_13.OAuthBusy, st_13.QuickButtonsCustom, st_13.QuickButtonLabelDraft, st_13.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_57) => {
                            AsyncHelpers_start(x_57);
                        }, runBootstrap, undefined, () => (new AppMsg(18, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_58) => {
                            AsyncHelpers_start(x_58);
                        }, getSystemStatus, undefined, (Item_48) => (new AppMsg(16, [Item_48])))]))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 3:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_59) => {
                            AsyncHelpers_start(x_59);
                        }, runRepair, undefined, () => (new AppMsg(18, ["Repair started"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                case 9: {
                    const matchValue_122 = model.Page;
                    if (matchValue_122.tag === 2) {
                        const st_14 = matchValue_122.fields[0];
                        const next = !st_14.ErrorReportingConsent;
                        setConsent(next);
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_14.Status, st_14.ModelStatus, st_14.Message, st_14.CheckingUpdates, st_14.SyncingModels, st_14.ShowFirstRunBanner, next, st_14.ErrorReportingBusy, st_14.ConnectedAccounts, st_14.OAuthBusy, st_14.QuickButtonsCustom, st_14.QuickButtonLabelDraft, st_14.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 10: {
                    const matchValue_123 = model.Page;
                    if (matchValue_123.tag === 2) {
                        const st_15 = matchValue_123.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_15.Status, st_15.ModelStatus, st_15.Message, st_15.CheckingUpdates, st_15.SyncingModels, st_15.ShowFirstRunBanner, st_15.ErrorReportingConsent, true, st_15.ConnectedAccounts, st_15.OAuthBusy, st_15.QuickButtonsCustom, st_15.QuickButtonLabelDraft, st_15.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_60) => {
                            AsyncHelpers_start(x_60);
                        }, flushErrorReports, undefined, (r_5) => (new AppMsg(18, [(r_5.tag === 1) ? r_5.fields[0] : (`Queued reports flushed: ${r_5.fields[0]}`)])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 11: {
                    const matchValue_124 = model.PendingErrorReport;
                    if (matchValue_124 != null) {
                        const json_1 = matchValue_124;
                        const matchValue_125 = model.Page;
                        if (matchValue_125.tag === 2) {
                            const st_16 = matchValue_125.fields[0];
                            return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_16.Status, st_16.ModelStatus, st_16.Message, st_16.CheckingUpdates, st_16.SyncingModels, st_16.ShowFirstRunBanner, st_16.ErrorReportingConsent, true, st_16.ConnectedAccounts, st_16.OAuthBusy, st_16.QuickButtonsCustom, st_16.QuickButtonLabelDraft, st_16.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_61) => {
                                AsyncHelpers_start(x_61);
                            }, (payload) => singleton_1.Delay(() => singleton_1.Bind(submitErrorReport(payload), (_arg_7) => {
                                const hostResult_1 = _arg_7;
                                return (hostResult_1.tag === 1) ? singleton_1.Bind(submitErrorReportFallback(payload), (_arg_8) => singleton_1.Return(_arg_8)) : singleton_1.Return(new FSharpResult$2(0, [hostResult_1.fields[0]]));
                            })), json_1, (Item_49) => (new AppMsg(37, [Item_49])))];
                        }
                        else {
                            return [model, Cmd_OfAsyncWith_perform((x_62) => {
                                AsyncHelpers_start(x_62);
                            }, (payload_1) => singleton_1.Delay(() => singleton_1.Bind(submitErrorReport(payload_1), (_arg_9) => {
                                const hostResult_2 = _arg_9;
                                return (hostResult_2.tag === 1) ? singleton_1.Bind(submitErrorReportFallback(payload_1), (_arg_10) => singleton_1.Return(_arg_10)) : singleton_1.Return(new FSharpResult$2(0, [hostResult_2.fields[0]]));
                            })), json_1, (Item_50) => (new AppMsg(37, [Item_50])))];
                        }
                    }
                    else {
                        return [model, singleton((dispatch_7) => {
                            dispatch_7(new AppMsg(18, ["No captured error report yet — reproduce an error or wait for one to occur."]));
                        })];
                    }
                }
                case 2:
                    if (model.Page.tag === 2) {
                        return [model, Cmd_OfAsyncWith_perform((x_63) => {
                            AsyncHelpers_start(x_63);
                        }, runConflictScan, undefined, () => (new AppMsg(18, ["Conflict scan complete"])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                case 12: {
                    const matchValue_127 = model.Page;
                    if (matchValue_127.tag === 2) {
                        const st_17 = matchValue_127.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_17.Status, st_17.ModelStatus, st_17.Message, st_17.CheckingUpdates, st_17.SyncingModels, st_17.ShowFirstRunBanner, st_17.ErrorReportingConsent, st_17.ErrorReportingBusy, st_17.ConnectedAccounts, undefined, st_17.QuickButtonsCustom, st_17.QuickButtonLabelDraft, st_17.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_64) => {
                            AsyncHelpers_start(x_64);
                        }, getConnectedAccounts, undefined, (Item_51) => (new AppMsg(26, [Item_51])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 13: {
                    const matchValue_131 = model.Page;
                    if (matchValue_131.tag === 2) {
                        const st_20 = matchValue_131.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_20.Status, st_20.ModelStatus, st_20.Message, st_20.CheckingUpdates, st_20.SyncingModels, st_20.ShowFirstRunBanner, st_20.ErrorReportingConsent, st_20.ErrorReportingBusy, st_20.ConnectedAccounts, msg.fields[0].fields[0], st_20.QuickButtonsCustom, st_20.QuickButtonLabelDraft, st_20.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_65) => {
                            AsyncHelpers_start(x_65);
                        }, () => startOAuth(msg.fields[0].fields[0]), undefined, (Item_52) => (new AppMsg(27, [Item_52])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                case 14: {
                    const matchValue_134 = model.Page;
                    if (matchValue_134.tag === 2) {
                        const st_23 = matchValue_134.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_23.Status, st_23.ModelStatus, st_23.Message, st_23.CheckingUpdates, st_23.SyncingModels, st_23.ShowFirstRunBanner, st_23.ErrorReportingConsent, st_23.ErrorReportingBusy, st_23.ConnectedAccounts, msg.fields[0].fields[0], st_23.QuickButtonsCustom, st_23.QuickButtonLabelDraft, st_23.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_66) => {
                            AsyncHelpers_start(x_66);
                        }, () => disconnectOAuth(msg.fields[0].fields[0]), undefined, (r_8) => (new AppMsg(28, [(r_8.tag === 1) ? r_8.fields[0] : (`${msg.fields[0].fields[0]} disconnected`)])))];
                    }
                    else {
                        return [model, Cmd_none()];
                    }
                }
                default: {
                    const patternInput_12 = withNav(new AppModel((bind$0040_25 = model.Shell, new ShellModel(new ShellTab(0, []), bind$0040_25.Activity, bind$0040_25.SystemStatus)), new AppPage(0, [ProjectHub_init()]), model.SetupWizard, undefined, model.HostStartup, model.PendingErrorReport));
                    return [patternInput_12[0], Cmd_batch(ofArray([patternInput_12[1], Cmd_OfAsyncWith_perform((x_50) => {
                        AsyncHelpers_start(x_50);
                    }, getProjects, undefined, (Item_44) => (new AppMsg(4, [Item_44])))]))];
                }
            }
        case 17:
            if (msg.fields[0].tag === 1) {
                return [model, Cmd_none()];
            }
            else {
                const matchValue_115 = model.Page;
                if (matchValue_115.tag === 2) {
                    const st_8 = matchValue_115.fields[0];
                    return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_8.Status, msg.fields[0].fields[0], st_8.Message, st_8.CheckingUpdates, false, st_8.ShowFirstRunBanner, st_8.ErrorReportingConsent, st_8.ErrorReportingBusy, st_8.ConnectedAccounts, st_8.OAuthBusy, st_8.QuickButtonsCustom, st_8.QuickButtonLabelDraft, st_8.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 26:
            if (msg.fields[0].tag === 1) {
                const matchValue_130 = model.Page;
                if (matchValue_130.tag === 2) {
                    const st_19 = matchValue_130.fields[0];
                    return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_19.Status, st_19.ModelStatus, msg.fields[0].fields[0], st_19.CheckingUpdates, st_19.SyncingModels, st_19.ShowFirstRunBanner, st_19.ErrorReportingConsent, st_19.ErrorReportingBusy, st_19.ConnectedAccounts, undefined, st_19.QuickButtonsCustom, st_19.QuickButtonLabelDraft, st_19.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                const matchValue_128 = model.Page;
                switch (matchValue_128.tag) {
                    case 2: {
                        const st_18 = matchValue_128.fields[0];
                        return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_18.Status, st_18.ModelStatus, st_18.Message, st_18.CheckingUpdates, st_18.SyncingModels, st_18.ShowFirstRunBanner, st_18.ErrorReportingConsent, st_18.ErrorReportingBusy, msg.fields[0].fields[0], undefined, st_18.QuickButtonsCustom, st_18.QuickButtonLabelDraft, st_18.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                    case 1: {
                        const t_70 = matchValue_128.fields[0];
                        if (t_70.SharePack == null) {
                            return [model, Cmd_none()];
                        }
                        else {
                            return [new AppModel(model.Shell, new AppPage(1, [StoryboardTimeline_updateSharePack((sp_9) => (new SharePackModel(sp_9.OutputDir, sp_9.Files, sp_9.CaptionPath, sp_9.CaptionText, sp_9.ReadmePath, sp_9.MediaBase, sp_9.Uploading, sp_9.UploadMessage, msg.fields[0].fields[0])), t_70)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                        }
                    }
                    default:
                        return [model, Cmd_none()];
                }
            }
        case 27:
            if (msg.fields[0].tag === 1) {
                const matchValue_133 = model.Page;
                if (matchValue_133.tag === 2) {
                    const st_22 = matchValue_133.fields[0];
                    return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_22.Status, st_22.ModelStatus, msg.fields[0].fields[0], st_22.CheckingUpdates, st_22.SyncingModels, st_22.ShowFirstRunBanner, st_22.ErrorReportingConsent, st_22.ErrorReportingBusy, st_22.ConnectedAccounts, undefined, st_22.QuickButtonsCustom, st_22.QuickButtonLabelDraft, st_22.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
            else {
                window.open(msg.fields[0].fields[0].AuthorizationUrl, "_blank");
                const matchValue_132 = model.Page;
                if (matchValue_132.tag === 2) {
                    const st_21 = matchValue_132.fields[0];
                    return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_21.Status, st_21.ModelStatus, `Complete sign-in in your browser, then click Refresh for ${msg.fields[0].fields[0].Provider}.`, st_21.CheckingUpdates, st_21.SyncingModels, st_21.ShowFirstRunBanner, st_21.ErrorReportingConsent, st_21.ErrorReportingBusy, st_21.ConnectedAccounts, undefined, st_21.QuickButtonsCustom, st_21.QuickButtonLabelDraft, st_21.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                else {
                    return [model, Cmd_none()];
                }
            }
        case 28: {
            const matchValue_135 = model.Page;
            if (matchValue_135.tag === 2) {
                const st_24 = matchValue_135.fields[0];
                return [new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_24.Status, st_24.ModelStatus, msg.fields[0], st_24.CheckingUpdates, st_24.SyncingModels, st_24.ShowFirstRunBanner, st_24.ErrorReportingConsent, st_24.ErrorReportingBusy, st_24.ConnectedAccounts, undefined, st_24.QuickButtonsCustom, st_24.QuickButtonLabelDraft, st_24.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_OfAsyncWith_perform((x_67) => {
                    AsyncHelpers_start(x_67);
                }, getConnectedAccounts, undefined, (Item_53) => (new AppMsg(26, [Item_53])))];
            }
            else {
                return [model, Cmd_none()];
            }
        }
        case 18:
            return [(matchValue_136 = model.Page, (matchValue_136.tag === 2) ? ((st_25 = matchValue_136.fields[0], new AppModel(model.Shell, new AppPage(2, [new SettingsModel(st_25.Status, st_25.ModelStatus, msg.fields[0], false, st_25.SyncingModels, st_25.ShowFirstRunBanner, st_25.ErrorReportingConsent, false, st_25.ConnectedAccounts, st_25.OAuthBusy, st_25.QuickButtonsCustom, st_25.QuickButtonLabelDraft, st_25.QuickButtonPromptDraft)]), model.SetupWizard, model.OpenProjectId, model.HostStartup, model.PendingErrorReport))) : model), Cmd_none()];
        case 32:
            switch (msg.fields[0].tag) {
                case 1: {
                    const matchValue_138 = model.SetupWizard;
                    if (matchValue_138 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, model.Page, SetupWizard_back(matchValue_138), model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                    }
                }
                case 2: {
                    const matchValue_139 = model.SetupWizard;
                    if (matchValue_139 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        const w_2 = matchValue_139;
                        return [new AppModel((bind$0040_26 = model.Shell, new ShellModel(new ShellTab(2, []), bind$0040_26.Activity, bind$0040_26.SystemStatus)), new AppPage(2, [Settings_init()]), new SetupWizardModel(w_2.Step, "Open Settings — bootstrap started from wizard."), model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_batch(ofArray([Cmd_OfAsyncWith_perform((x_68) => {
                            AsyncHelpers_start(x_68);
                        }, runBootstrap, undefined, () => (new AppMsg(18, ["Bootstrap started"]))), Cmd_OfAsyncWith_perform((x_69) => {
                            AsyncHelpers_start(x_69);
                        }, getSystemStatus, undefined, (Item_54) => (new AppMsg(16, [Item_54])))]))];
                    }
                }
                case 3: {
                    SetupWizard_markComplete();
                    return [new AppModel(model.Shell, model.Page, undefined, model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
                }
                default: {
                    const matchValue_137 = model.SetupWizard;
                    if (matchValue_137 == null) {
                        return [model, Cmd_none()];
                    }
                    else {
                        return [new AppModel(model.Shell, model.Page, SetupWizard_next(matchValue_137), model.OpenProjectId, model.HostStartup, model.PendingErrorReport), Cmd_none()];
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
                    dispatch(new AppMsg(35, []));
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
                dispatch(new AppMsg(32, [arg_4]));
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
            dispatch_2(new AppMsg(36, [req]));
        });
        return {
            Dispose() {
            },
        };
    }], [singleton("navigation"), (dispatch_3) => subscribe_1((arg) => {
        dispatch_3(new AppMsg(39, [arg]));
    })]]), Program_withReactBatched("root", ProgramModule_mkProgram(init, update, view))));
}

