module LMVideoStudio.Client.App

open Elmish
open Fable.Core.JsInterop
open Fable.React
open Fable.React.Props
open Feliz
open LMVideoStudio.Client.Api
open LMVideoStudio.Client.ActivityPanel
open LMVideoStudio.Client.Views.ProjectHub
open LMVideoStudio.Client.Views.StoryboardTimeline
open LMVideoStudio.Client.Views.SharePackPanel
open LMVideoStudio.Client.Views.Settings
open LMVideoStudio.Client.Views.SetupWizard
open LMVideoStudio.Client.Views.Shell
open LMVideoStudio.Client.ErrorReporting

type AppPage =
    | HubPage of ProjectHubModel
    | TimelinePage of TimelineModel
    | SettingsPage of SettingsModel

type HostStartup =
    | Starting
    | Ready
    | Failed of string

type AppModel =
    { Shell: ShellModel
      Page: AppPage
      SetupWizard: SetupWizardModel option
      OpenProjectId: System.Guid option
      HostStartup: HostStartup
      PendingErrorReport: string option }

type AppMsg =
    | ShellMsg of ShellMsg
    | HubMsg of ProjectHubMsg
    | TimelineMsg of TimelineMsg
    | SettingsMsg of SettingsMsg
    | ProjectsLoaded of Result<ProjectSummaryDto list, string>
    | ProjectCreated of Result<LMVideoStudio.Domain.Project, string>
    | ProjectOpened of Result<LMVideoStudio.Domain.Project, string>
    | ProjectSaved of Result<LMVideoStudio.Domain.Project, string>
    | ImportDone of Result<LMVideoStudio.Domain.Project, string>
    | BlockFieldsSaved of Result<LMVideoStudio.Domain.Project, string>
    | GenerateDone of Result<LMVideoStudio.Domain.Project, string>
    | AudioImportDone of Result<LMVideoStudio.Domain.Project, string>
    | PreviewStarted of Result<PreviewStartDto, string>
    | PreviewReady of string
    | BakeReady of string
    | ExistingPreviewMissing
    | SettingsStatus of Result<SystemStatusDto, string>
    | ModelStatusLoaded of Result<ModelStatusDto, string>
    | SettingsActionDone of string
    | OutlineGenerated of Result<OutlineBlockDto list, string>
    | OutlineApplied of Result<LMVideoStudio.Domain.Project, string>
    | StylePackImported of Result<LMVideoStudio.Domain.Project, string>
    | BakeStarted of Result<string, string>
    | SharePackDone of Result<SharePackExportDto, string>
    | SharePackAccountsLoaded of Result<ConnectedAccountsDto, string>
    | SharePackUploadDone of Result<SharePackUploadResultDto, string>
    | ConnectedAccountsLoaded of Result<ConnectedAccountsDto, string>
    | OAuthStartReady of Result<OAuthStartDto, string>
    | OAuthActionDone of string
    | VariantSelected of Result<LMVideoStudio.Domain.Project, string>
    | ProjectDeleted of Result<System.Guid, string>
    | SetupWizardMsg of SetupWizardMsg
    | InitSubscriptions
    | HostReady of Result<unit, string>
    | RetryHostStartup
    | ErrorCaptured of CaptureRequest
    | ErrorReportSubmitted of Result<string, string>
    | PendingErrorStored of string

let init () =
    let activity = ActivityPanel.init ()

    { Shell = Shell.init activity
      Page = HubPage(ProjectHub.init ())
      SetupWizard = if SetupWizard.isComplete () then None else Some(SetupWizard.init ())
      OpenProjectId = None
      HostStartup = Starting
      PendingErrorReport = None },
    Cmd.batch [
        Cmd.ofMsg InitSubscriptions
        Cmd.OfAsync.perform waitForHostHealth () HostReady
    ]

let update msg model =
    match msg with
    | InitSubscriptions ->
        model, Cmd.none

    | ErrorCaptured req ->
        let hostHealthy =
            match model.HostStartup with
            | Ready -> Some true
            | Failed _ -> Some false
            | Starting -> None

        let ollama = model.Shell.SystemStatus |> Option.map (fun s -> s.Ollama)
        let worker = model.Shell.SystemStatus |> Option.map (fun s -> s.Worker)
        let consent = readConsent ()

        match buildReport req hostHealthy ollama worker consent with
        | Error _ -> model, Cmd.none
        | Ok report ->
            let summary =
                { Message = report.Message
                  Source = report.Source
                  Severity = report.Severity
                  Timestamp = report.Timestamp }

            let model' =
                { model with
                    Shell =
                        { model.Shell with
                            Activity = ActivityPanel.setLastError model.Shell.Activity summary }
                    PendingErrorReport = Some(encodeForSubmit report) }

            if shouldAutoSubmit report.Severity consent then
                model',
                Cmd.OfAsync.perform
                    (fun json ->
                        async {
                            let! hostResult = submitErrorReport json

                            match hostResult with
                            | Ok r -> return Ok r
                            | Error _ ->
                                let! fallback = submitErrorReportFallback json
                                return fallback
                        })
                    (encodeForSubmit report)
                    ErrorReportSubmitted
            else
                model', Cmd.ofMsg (PendingErrorStored(encodeForSubmit report))

    | PendingErrorStored _ -> model, Cmd.none

    | ErrorReportSubmitted(Ok msg) ->
        let model' =
            match model.Page with
            | SettingsPage st ->
                { model with
                    Page =
                        SettingsPage
                            { st with
                                Message = Some $"Error report sent: {msg}"
                                ErrorReportingBusy = false } }
            | _ -> model

        model', Cmd.none

    | ErrorReportSubmitted(Error err) ->
        let model' =
            match model.Page with
            | SettingsPage st ->
                { model with
                    Page =
                        SettingsPage
                            { st with
                                Message = Some $"Error report failed: {err}"
                                ErrorReportingBusy = false } }
            | _ -> model

        model', Cmd.none

    | HostReady(Ok _) ->
        { model with HostStartup = Ready },
        Cmd.batch [
            Cmd.OfAsync.perform getProjects () ProjectsLoaded
            Cmd.OfAsync.perform getSystemStatus () SettingsStatus
        ]

    | HostReady(Error err) ->
        { model with HostStartup = Failed err }, Cmd.none

    | RetryHostStartup ->
        { model with
            HostStartup = Starting
            Page = HubPage(ProjectHub.init ()) },
        Cmd.OfAsync.perform waitForHostHealth () HostReady

    | ShellMsg (ShellMsg.EventReceived e) ->
        let events = ActivityPanel.mergeEvent e model.Shell.Activity.Events

        let model' =
            { model with
                Shell =
                    { model.Shell with
                        Activity = { model.Shell.Activity with Events = events } } }

        let previewCmd =
            match model.Page with
            | TimelinePage t ->
                let bakeCmd =
                    match t.BakeJobId with
                    | Some jobId when jobId = e.JobId && e.Phase = "bake" && e.Status = "completed" ->
                        let bust = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()

                        Cmd.OfAsync.perform
                            (fun () ->
                                async {
                                    return previewMediaUrl t.Project.Id "renders/bake/final.mp4" bust
                                })
                            ()
                            BakeReady
                    | Some jobId when jobId = e.JobId && e.Phase = "bake" && e.Status = "failed" ->
                        Cmd.ofMsg (TimelineMsg(BakeFailed e.Message))
                    | _ -> Cmd.none

                let mockupCmd =
                    match t.PreviewJobId with
                    | Some jobId when jobId = e.JobId && e.Phase = "mockup_preview" && e.Status = "completed" ->
                        let bust = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()

                        Cmd.OfAsync.perform
                            (fun () ->
                                async {
                                    let! status = getMockupPreviewStatus t.Project.Id

                                    return
                                        match status with
                                        | Ok(Some dto) -> previewMediaUrl t.Project.Id dto.PreviewPath bust
                                        | Ok None ->
                                            previewMediaUrl t.Project.Id "renders/mockup/preview.mp4" bust
                                        | Error _ ->
                                            previewMediaUrl t.Project.Id "renders/mockup/preview.mp4" bust
                                })
                            ()
                            PreviewReady
                    | Some jobId when jobId = e.JobId && e.Phase = "mockup_preview" && e.Status = "failed" ->
                        Cmd.ofMsg (TimelineMsg(PreviewFailed e.Message))
                    | _ -> Cmd.none

                Cmd.batch [ mockupCmd; bakeCmd ]
            | _ -> Cmd.none

        model', previewCmd

    | ShellMsg ShellMsg.SseConnected ->
        { model with
            Shell =
                { model.Shell with
                    Activity = { model.Shell.Activity with Connected = true } } },
        Cmd.none

    | ShellMsg (ShellMsg.StatusLoaded s) ->
        { model with Shell = { model.Shell with SystemStatus = Some s } }, Cmd.none

    | ShellMsg (ShellMsg.SelectTab Hub) ->
        { model with
            Shell = { model.Shell with Tab = Hub }
            Page = HubPage(ProjectHub.init ())
            OpenProjectId = None },
        Cmd.OfAsync.perform getProjects () ProjectsLoaded

    | ShellMsg (ShellMsg.SelectTab Timeline) ->
        match model.Page with
        | TimelinePage _ ->
            { model with Shell = { model.Shell with Tab = Timeline } }, Cmd.none
        | _ ->
            { model with Shell = { model.Shell with Tab = Timeline } },
            Cmd.ofMsg (HubMsg ProjectHubMsg.Refresh)

    | ShellMsg (ShellMsg.SelectTab Settings) ->
        { model with
            Shell = { model.Shell with Tab = Settings }
            Page = SettingsPage(Settings.init ()) },
        Cmd.batch [
            Cmd.OfAsync.perform getSystemStatus () SettingsStatus
            Cmd.OfAsync.perform getModelStatus () ModelStatusLoaded
            Cmd.OfAsync.perform getConnectedAccounts () ConnectedAccountsLoaded
        ]

    | ProjectsLoaded(Ok items) ->
        match model.Page with
        | HubPage hub ->
            { model with
                Page = HubPage { hub with Summaries = items; Loading = false; Error = None } },
            Cmd.none
        | _ -> model, Cmd.none

    | ProjectsLoaded(Error err) ->
        match model.Page with
        | HubPage hub ->
            let showError =
                match model.HostStartup with
                | Ready -> Some err
                | Starting -> None
                | Failed _ -> Some err

            { model with Page = HubPage { hub with Loading = false; Error = showError } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg ProjectHubMsg.Refresh ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = true } },
            Cmd.OfAsync.perform getProjects () ProjectsLoaded
        | _ -> model, Cmd.none

    | HubMsg (ProjectHubMsg.SetNewName name) ->
        match model.Page with
        | HubPage hub -> { model with Page = HubPage { hub with NewName = name } }, Cmd.none
        | _ -> model, Cmd.none

    | HubMsg ProjectHubMsg.CreateClicked ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = true } },
            Cmd.OfAsync.perform (fun () -> createProject hub.NewName) () ProjectCreated
        | _ -> model, Cmd.none

    | ProjectCreated(Ok project) ->
        { model with
            Shell = { model.Shell with Tab = Timeline }
            Page = TimelinePage(StoryboardTimeline.init project)
            OpenProjectId = Some project.Id },
        Cmd.none

    | ProjectCreated(Error err) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg (ProjectHubMsg.SelectOutlineProject id) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with OutlineProjectId = Some id; OutlineBlocks = None } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg ProjectHubMsg.GenerateOutline ->
        match model.Page with
        | HubPage hub ->
            match hub.OutlineProjectId with
            | None -> model, Cmd.none
            | Some projectId ->
                { model with Page = HubPage { hub with OutlineWorking = true; Error = None } },
                Cmd.OfAsync.perform
                    (fun () -> generateOutline projectId hub.BriefText)
                    ()
                    OutlineGenerated
        | _ -> model, Cmd.none

    | OutlineGenerated(Ok blocks) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with OutlineBlocks = Some blocks; OutlineWorking = false } },
            Cmd.none
        | _ -> model, Cmd.none

    | OutlineGenerated(Error err) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with OutlineWorking = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg ProjectHubMsg.ApproveOutline ->
        match model.Page with
        | HubPage hub ->
            match hub.OutlineProjectId, hub.OutlineBlocks with
            | Some projectId, Some blocks ->
                { model with Page = HubPage { hub with OutlineWorking = true } },
                Cmd.OfAsync.perform
                    (fun () -> applyOutline projectId hub.BriefText blocks)
                    ()
                    OutlineApplied
            | _ -> model, Cmd.none
        | _ -> model, Cmd.none

    | OutlineApplied(Ok project) ->
        { model with
            Shell = { model.Shell with Tab = Timeline }
            Page = TimelinePage(StoryboardTimeline.init project)
            OpenProjectId = Some project.Id },
        Cmd.none

    | OutlineApplied(Error err) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with OutlineWorking = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg ProjectHubMsg.DiscardOutline ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with OutlineBlocks = None } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg (ProjectHubMsg.SetBrief text) ->
        match model.Page with
        | HubPage hub -> { model with Page = HubPage { hub with BriefText = text } }, Cmd.none
        | _ -> model, Cmd.none

    | HubMsg (ProjectHubMsg.OpenProject id) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = true } },
            Cmd.OfAsync.perform (fun () -> getProject id) () ProjectOpened
        | _ -> model, Cmd.none

    | ProjectOpened(Ok project) ->
        { model with
            Shell = { model.Shell with Tab = Timeline }
            Page = TimelinePage(StoryboardTimeline.init project)
            OpenProjectId = Some project.Id },
        Cmd.OfAsync.perform
            (fun () ->
                async {
                    let bust = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
                    let! status = getMockupPreviewStatus project.Id

                    return
                        match status with
                        | Ok(Some dto) -> Some(previewMediaUrl project.Id dto.PreviewPath bust)
                        | Ok None | Error _ -> None
                })
            ()
            (function
                | Some url -> PreviewReady url
                | None -> ExistingPreviewMissing)

    | ProjectOpened(Error err) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | HubMsg (ProjectHubMsg.DeleteProject id) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = true; Error = None } },
            Cmd.OfAsync.perform (fun () -> deleteProject id) () ProjectDeleted
        | TimelinePage t when t.Project.Id = id ->
            { model with Page = TimelinePage { t with Saving = true; Error = None } },
            Cmd.OfAsync.perform (fun () -> deleteProject id) () ProjectDeleted
        | _ -> model, Cmd.none

    | ProjectDeleted(Ok deletedId) ->
        let wasOpen =
            model.OpenProjectId = Some deletedId
            || match model.Page with
               | TimelinePage t -> t.Project.Id = deletedId
               | _ -> false

        if wasOpen then
            { model with
                Shell = { model.Shell with Tab = Hub }
                Page = HubPage(ProjectHub.init ())
                OpenProjectId = None },
            Cmd.OfAsync.perform getProjects () ProjectsLoaded
        else
            match model.Page with
            | HubPage hub ->
                { model with
                    Page =
                        HubPage
                            { hub with
                                Loading = true
                                Error = None
                                OutlineProjectId =
                                    hub.OutlineProjectId
                                    |> Option.filter ((<>) deletedId) } },
                Cmd.OfAsync.perform getProjects () ProjectsLoaded
            | _ -> model, Cmd.OfAsync.perform getProjects () ProjectsLoaded

    | ProjectDeleted(Error err) ->
        match model.Page with
        | HubPage hub ->
            { model with Page = HubPage { hub with Loading = false; Error = Some err } },
            Cmd.none
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.BackToHub ->
        { model with
            Shell = { model.Shell with Tab = Hub }
            Page = HubPage(ProjectHub.init ())
            OpenProjectId = None },
        Cmd.OfAsync.perform getProjects () ProjectsLoaded

    | TimelineMsg (TimelineMsg.MoveBlockUp id) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.moveUp t id) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.MoveBlockDown id) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.moveDown t id) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.DragStart idx) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.setDragIndex t idx) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.DropOnIndex toIdx) ->
        match model.Page with
        | TimelinePage t ->
            match t.DragIndex with
            | Some fromIdx ->
                let reordered = StoryboardTimeline.reorderByDrag t fromIdx toIdx

                let ids =
                    reordered.Project.Blocks
                    |> List.sortBy (fun b -> b.Order)
                    |> List.map (fun b -> b.Id)

                { model with Page = TimelinePage { reordered with Saving = true } },
                Cmd.OfAsync.perform (fun () -> reorderBlocks reordered.Project.Id ids) () ProjectSaved
            | None -> model, Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SelectThumbnailVariant path) ->
        match model.Page with
        | TimelinePage t ->
            match t.SelectedBlockId with
            | None -> model, Cmd.none
            | Some blockId ->
                { model with Page = TimelinePage { t with Saving = true } },
                Cmd.OfAsync.perform
                    (fun () -> selectBlockThumbnail t.Project.Id blockId path)
                    ()
                    VariantSelected
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.ExportSharePack ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = true } },
            Cmd.batch [
                Cmd.OfAsync.perform getConnectedAccounts () SharePackAccountsLoaded
                Cmd.OfAsync.perform (fun () -> exportSharePackDetailed t.Project.Id) () SharePackDone
            ]
        | _ -> model, Cmd.none

    | SharePackAccountsLoaded(Ok accounts) ->
        match model.Page with
        | TimelinePage t ->
            match t.SharePack with
            | Some sp ->
                { model with Page = TimelinePage(StoryboardTimeline.updateSharePack (fun s -> { s with ConnectedAccounts = Some accounts }) t) },
                Cmd.none
            | None -> model, Cmd.none
        | _ -> model, Cmd.none

    | SharePackAccountsLoaded(Error _) -> model, Cmd.none

    | SharePackDone(Ok dto) ->
        match model.Page with
        | TimelinePage t ->
            let accounts =
                t.SharePack
                |> Option.bind (fun sp -> sp.ConnectedAccounts)
                |> Option.defaultValue
                    { Configured = false
                      Accounts = [] }

            let sharePack = SharePackPanel.fromExport dto (Some accounts)

            { model with Page = TimelinePage(StoryboardTimeline.withSharePack sharePack t) },
            Cmd.none
        | _ -> model, Cmd.none

    | SharePackDone(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SharePackMsg SharePackMsg.Dismiss) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.clearSharePack t) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SharePackMsg SharePackMsg.CopyCaption) ->
        match model.Page with
        | TimelinePage t ->
            match t.SharePack with
            | None -> model, Cmd.none
            | Some sp ->
                match SharePackPanel.handleCopyCaption sp with
                | Ok msg ->
                    { model with
                        Page =
                            TimelinePage(
                                StoryboardTimeline.updateSharePack (fun s -> { s with UploadMessage = Some msg }) t
                            ) },
                    Cmd.none
                | Error err ->
                    { model with Page = TimelinePage { t with Error = Some err } },
                    Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SharePackMsg SharePackMsg.OpenYouTubeUpload) ->
        SharePackPanel.handleOpenYouTube ()
        model, Cmd.none

    | TimelineMsg (TimelineMsg.SharePackMsg SharePackMsg.OpenMetaUpload) ->
        SharePackPanel.handleOpenMeta ()
        model, Cmd.none

    | TimelineMsg (TimelineMsg.SharePackMsg SharePackMsg.UploadToYouTube) ->
        match model.Page with
        | TimelinePage t ->
            { model with
                Page =
                    TimelinePage(
                        StoryboardTimeline.updateSharePack (fun sp -> { sp with Uploading = Some "youtube" }) t
                    ) },
            Cmd.OfAsync.perform
                (fun () ->
                    uploadSharePack t.Project.Id "youtube" (Some t.Project.Name) (
                        t.SharePack |> Option.map (fun sp -> sp.CaptionText)
                    ))
                ()
                SharePackUploadDone
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SharePackMsg SharePackMsg.UploadToMeta) ->
        match model.Page with
        | TimelinePage t ->
            { model with
                Page =
                    TimelinePage(
                        StoryboardTimeline.updateSharePack (fun sp -> { sp with Uploading = Some "meta" }) t
                    ) },
            Cmd.OfAsync.perform
                (fun () ->
                    uploadSharePack t.Project.Id "meta" (Some t.Project.Name) (
                        t.SharePack |> Option.map (fun sp -> sp.CaptionText)
                    ))
                ()
                SharePackUploadDone
        | _ -> model, Cmd.none

    | SharePackUploadDone(Ok result) ->
        match model.Page with
        | TimelinePage t ->
            let msg =
                match result.Url with
                | Some url -> $"{result.Message}: {url}"
                | None -> result.Message

            { model with
                Page =
                    TimelinePage(
                        StoryboardTimeline.updateSharePack (fun sp ->
                            { sp with
                                Uploading = None
                                UploadMessage = Some msg }) t
                    ) },
            Cmd.none
        | _ -> model, Cmd.none

    | SharePackUploadDone(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with
                Page =
                    TimelinePage(
                        StoryboardTimeline.updateSharePack (fun sp -> { sp with Uploading = None }) t
                        |> fun t' -> { t' with Error = Some err }
                    ) },
            Cmd.none
        | _ -> model, Cmd.none

    | VariantSelected(Ok project) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withProject project t) },
            Cmd.none
        | _ -> model, Cmd.none

    | VariantSelected(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.Save ->
        match model.Page with
        | TimelinePage t ->
            let ids =
                t.Project.Blocks
                |> List.sortBy (fun b -> b.Order)
                |> List.map (fun b -> b.Id)

            { model with Page = TimelinePage { t with Saving = true } },
            Cmd.OfAsync.perform (fun () -> reorderBlocks t.Project.Id ids) () ProjectSaved
        | _ -> model, Cmd.none

    | ProjectSaved(Ok project) ->
        match model.Page with
        | TimelinePage _ ->
            { model with
                Page =
                    TimelinePage
                        { StoryboardTimeline.init project with
                            Saving = false
                            Error = None } },
            Cmd.none
        | _ -> model, Cmd.none

    | ProjectSaved(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.ImportStylePack file) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = true } },
            Cmd.OfAsync.perform (fun () -> importStylePackLogo t.Project.Id file) () StylePackImported
        | _ -> model, Cmd.none

    | StylePackImported(Ok project) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withProject project t) },
            Cmd.none
        | _ -> model, Cmd.none

    | StylePackImported(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.StartBake ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Baking = true; Error = None } },
            Cmd.OfAsync.perform (fun () -> startBake t.Project.Id) () BakeStarted
        | _ -> model, Cmd.none

    | BakeStarted(Ok jobIdStr) ->
        match model.Page with
        | TimelinePage t ->
            match System.Guid.TryParse jobIdStr with
            | true, jobId ->
                { model with Page = TimelinePage(StoryboardTimeline.withBakeStarted jobId t) },
                Cmd.none
            | _ ->
                { model with Page = TimelinePage(StoryboardTimeline.withBakeError "Invalid bake job id" t) },
                Cmd.none
        | _ -> model, Cmd.none

    | BakeStarted(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withBakeError err t) },
            Cmd.none
        | _ -> model, Cmd.none

    | BakeReady url ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withBakeUrl url t) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (BakeFailed msg) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withBakeError msg t) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.ImportImage file) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = true } },
            Cmd.OfAsync.perform (fun () -> importBlockImage t.Project.Id file) () ImportDone
        | _ -> model, Cmd.none

    | ImportDone(Ok project) ->
        match model.Page with
        | TimelinePage _ ->
            { model with
                Page =
                    TimelinePage
                        { StoryboardTimeline.init project with
                            Saving = false
                            Error = None } },
            Cmd.none
        | _ -> model, Cmd.none

    | ImportDone(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SelectBlock id) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.selectBlock t id) },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SetVoiceoverScript text) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with VoiceoverDraft = text } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SetImagePrompt text) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with ImagePromptDraft = text } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SetMoodTags text) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with MoodTagsDraft = text } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.SetCrossfadeDuration ms) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with CrossfadeDurationDraft = max 0 ms } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.SaveBlockFields ->
        match model.Page with
        | TimelinePage t ->
            match t.SelectedBlockId with
            | None -> model, Cmd.none
            | Some blockId ->
                let prompt =
                    if System.String.IsNullOrWhiteSpace t.ImagePromptDraft then None
                    else Some t.ImagePromptDraft

                let moodTags =
                    t.MoodTagsDraft.Split(',')
                    |> Array.map (fun s -> s.Trim())
                    |> Array.filter (fun s -> not (System.String.IsNullOrWhiteSpace s))
                    |> Array.toList
                    |> fun tags -> if List.isEmpty tags then None else Some tags

                { model with Page = TimelinePage { t with Saving = true } },
                Cmd.OfAsync.perform
                    (fun () ->
                        updateBlock t.Project.Id blockId t.VoiceoverDraft prompt (Some t.CrossfadeDurationDraft) moodTags)
                    ()
                    BlockFieldsSaved
        | _ -> model, Cmd.none

    | BlockFieldsSaved(Ok project) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withProject project t) },
            Cmd.none
        | _ -> model, Cmd.none

    | BlockFieldsSaved(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.GenerateThumbnail ->
        match model.Page with
        | TimelinePage t ->
            match t.SelectedBlockId with
            | None -> model, Cmd.none
            | Some blockId ->
                let prompt =
                    if System.String.IsNullOrWhiteSpace t.ImagePromptDraft then None
                    else Some t.ImagePromptDraft

                { model with Page = TimelinePage { t with Generating = true; Error = None } },
                Cmd.OfAsync.perform
                    (fun () -> generateBlockThumbnail t.Project.Id blockId prompt 3)
                    ()
                    GenerateDone
        | _ -> model, Cmd.none

    | GenerateDone(Ok project) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withProject project t) },
            Cmd.none
        | _ -> model, Cmd.none

    | GenerateDone(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Generating = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg (TimelineMsg.ImportAudio file) ->
        match model.Page with
        | TimelinePage t ->
            match t.SelectedBlockId with
            | None -> model, Cmd.none
            | Some blockId ->
                { model with Page = TimelinePage { t with Saving = true } },
                Cmd.OfAsync.perform
                    (fun () -> importBlockAudio t.Project.Id blockId file)
                    ()
                    AudioImportDone
        | _ -> model, Cmd.none

    | AudioImportDone(Ok project) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withProject project t) },
            Cmd.none
        | _ -> model, Cmd.none

    | AudioImportDone(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage { t with Saving = false; Error = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | TimelineMsg TimelineMsg.RefreshMockupPreview ->
        match model.Page with
        | TimelinePage t ->
            { model with
                Page =
                    TimelinePage
                        { t with
                            Previewing = true
                            Error = None } },
            Cmd.OfAsync.perform (fun () -> refreshMockupPreview t.Project.Id) () PreviewStarted
        | _ -> model, Cmd.none

    | PreviewStarted(Ok dto) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withPreviewStarted dto.JobId t) },
            Cmd.none
        | _ -> model, Cmd.none

    | PreviewStarted(Error err) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withPreviewError err t) },
            Cmd.none
        | _ -> model, Cmd.none

    | PreviewReady url ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withPreviewUrl url t) },
            Cmd.none
        | _ -> model, Cmd.none

    | ExistingPreviewMissing -> model, Cmd.none

    | TimelineMsg (PreviewFailed msg) ->
        match model.Page with
        | TimelinePage t ->
            { model with Page = TimelinePage(StoryboardTimeline.withPreviewError msg t) },
            Cmd.none
        | _ -> model, Cmd.none

    | SettingsStatus(Ok s) ->
        let model' = { model with Shell = { model.Shell with SystemStatus = Some s } }

        match model.Page with
        | SettingsPage st ->
            { model' with Page = SettingsPage { st with Status = Some s } }, Cmd.none
        | _ -> model', Cmd.none

    | SettingsStatus(Error _) -> model, Cmd.none

    | SettingsMsg SettingsMsg.CloseProject ->
        { model with
            Shell = { model.Shell with Tab = Hub }
            Page = HubPage(ProjectHub.init ())
            OpenProjectId = None },
        Cmd.OfAsync.perform getProjects () ProjectsLoaded

    | SettingsMsg SettingsMsg.CheckUpdates ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with CheckingUpdates = true } },
            Cmd.OfAsync.perform checkForUpdates () (fun r -> SettingsActionDone (match r with Ok m -> m | Error e -> e))
        | _ -> model, Cmd.none

    | ModelStatusLoaded(Ok m) ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with ModelStatus = Some m; SyncingModels = false } },
            Cmd.none
        | _ -> model, Cmd.none

    | ModelStatusLoaded(Error _) -> model, Cmd.none

    | SettingsMsg SettingsMsg.RefreshModelStatus ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with SyncingModels = true } },
            Cmd.OfAsync.perform getModelStatus () ModelStatusLoaded
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.SyncModelsCheck ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with SyncingModels = true } },
            Cmd.batch [
                Cmd.OfAsync.perform (fun () -> syncModels false) () (fun r ->
                    SettingsActionDone(match r with Ok _ -> "Model check started" | Error e -> e))
                Cmd.OfAsync.perform getModelStatus () ModelStatusLoaded
            ]
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.SyncModelsPull ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with SyncingModels = true } },
            Cmd.batch [
                Cmd.OfAsync.perform (fun () -> syncModels true) () (fun r ->
                    SettingsActionDone(match r with Ok _ -> "Model sync/pull started" | Error e -> e))
                Cmd.OfAsync.perform getModelStatus () ModelStatusLoaded
            ]
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.DismissFirstRun ->
        Settings.markBootstrapStarted ()

        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with ShowFirstRunBanner = false } },
            Cmd.none
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.RunBootstrap ->
        match model.Page with
        | SettingsPage st ->
            Settings.markBootstrapStarted ()

            { model with Page = SettingsPage { st with ShowFirstRunBanner = false } },
            Cmd.batch [
                Cmd.OfAsync.perform runBootstrap () (fun () -> SettingsActionDone "Bootstrap started")
                Cmd.OfAsync.perform getSystemStatus () SettingsStatus
            ]
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.RepairSetup ->
        match model.Page with
        | SettingsPage _ ->
            model,
            Cmd.OfAsync.perform runRepair () (fun () -> SettingsActionDone "Repair started")
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.ToggleErrorReportingConsent ->
        match model.Page with
        | SettingsPage st ->
            let next = not st.ErrorReportingConsent
            setConsent next

            { model with Page = SettingsPage { st with ErrorReportingConsent = next } },
            Cmd.none
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.FlushErrorReports ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with ErrorReportingBusy = true } },
            Cmd.OfAsync.perform flushErrorReports () (fun r ->
                SettingsActionDone(match r with Ok body -> $"Queued reports flushed: {body}" | Error e -> e))
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.SendPendingErrorReport ->
        match model.PendingErrorReport with
        | None ->
            model,
            Cmd.ofMsg (
                SettingsActionDone "No captured error report yet — reproduce an error or wait for one to occur."
            )
        | Some json ->
            match model.Page with
            | SettingsPage st ->
                { model with Page = SettingsPage { st with ErrorReportingBusy = true } },
                Cmd.OfAsync.perform
                    (fun payload ->
                        async {
                            let! hostResult = submitErrorReport payload

                            match hostResult with
                            | Ok r -> return Ok r
                            | Error _ ->
                                let! fallback = submitErrorReportFallback payload
                                return fallback
                        })
                    json
                    ErrorReportSubmitted
            | _ ->
                model,
                Cmd.OfAsync.perform
                    (fun payload ->
                        async {
                            let! hostResult = submitErrorReport payload

                            match hostResult with
                            | Ok r -> return Ok r
                            | Error _ ->
                                let! fallback = submitErrorReportFallback payload
                                return fallback
                        })
                    json
                    ErrorReportSubmitted

    | SettingsMsg SettingsMsg.ScanConflicts ->
        match model.Page with
        | SettingsPage _ ->
            model,
            Cmd.OfAsync.perform runConflictScan () (fun () -> SettingsActionDone "Conflict scan complete")
        | _ -> model, Cmd.none

    | SettingsMsg SettingsMsg.RefreshConnectedAccounts ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with OAuthBusy = None } },
            Cmd.OfAsync.perform getConnectedAccounts () ConnectedAccountsLoaded
        | _ -> model, Cmd.none

    | ConnectedAccountsLoaded(Ok accounts) ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with ConnectedAccounts = Some accounts; OAuthBusy = None } },
            Cmd.none
        | TimelinePage t ->
            match t.SharePack with
            | Some _ ->
                { model with
                    Page =
                        TimelinePage(
                            StoryboardTimeline.updateSharePack (fun sp -> { sp with ConnectedAccounts = Some accounts }) t
                        ) },
                Cmd.none
            | None -> model, Cmd.none
        | _ -> model, Cmd.none

    | ConnectedAccountsLoaded(Error err) ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with Message = Some err; OAuthBusy = None } },
            Cmd.none
        | _ -> model, Cmd.none

    | SettingsMsg (SettingsMsg.ConnectOAuth provider) ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with OAuthBusy = Some provider } },
            Cmd.OfAsync.perform (fun () -> startOAuth provider) () OAuthStartReady
        | _ -> model, Cmd.none

    | OAuthStartReady(Ok start) ->
        Browser.Dom.window?``open``(start.AuthorizationUrl, "_blank") |> ignore

        match model.Page with
        | SettingsPage st ->
            { model with
                Page =
                    SettingsPage
                        { st with
                            OAuthBusy = None
                            Message = Some $"Complete sign-in in your browser, then click Refresh for {start.Provider}." } },
            Cmd.none
        | _ -> model, Cmd.none

    | OAuthStartReady(Error err) ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with OAuthBusy = None; Message = Some err } },
            Cmd.none
        | _ -> model, Cmd.none

    | SettingsMsg (SettingsMsg.DisconnectOAuth provider) ->
        match model.Page with
        | SettingsPage st ->
            { model with Page = SettingsPage { st with OAuthBusy = Some provider } },
            Cmd.OfAsync.perform (fun () -> disconnectOAuth provider) () (fun r ->
                OAuthActionDone(match r with Ok _ -> $"{provider} disconnected" | Error e -> e))
        | _ -> model, Cmd.none

    | OAuthActionDone msg ->
        match model.Page with
        | SettingsPage st ->
            { model with
                Page = SettingsPage { st with OAuthBusy = None; Message = Some msg } },
            Cmd.OfAsync.perform getConnectedAccounts () ConnectedAccountsLoaded
        | _ -> model, Cmd.none

    | SettingsActionDone msg ->
        let model' =
            match model.Page with
            | SettingsPage st ->
                { model with
                    Page =
                        SettingsPage
                            { st with
                                Message = Some msg
                                CheckingUpdates = false
                                ErrorReportingBusy = false } }
            | _ -> model

        model', Cmd.none

    | SetupWizardMsg SetupWizardMsg.Next ->
        match model.SetupWizard with
        | Some w -> { model with SetupWizard = Some(SetupWizard.next w) }, Cmd.none
        | None -> model, Cmd.none

    | SetupWizardMsg SetupWizardMsg.Back ->
        match model.SetupWizard with
        | Some w -> { model with SetupWizard = Some(SetupWizard.back w) }, Cmd.none
        | None -> model, Cmd.none

    | SetupWizardMsg SetupWizardMsg.RunBootstrap ->
        match model.SetupWizard with
        | Some w ->
            { model with
                Shell = { model.Shell with Tab = Settings }
                Page = SettingsPage(Settings.init ())
                SetupWizard = Some { w with Message = Some "Open Settings — bootstrap started from wizard." } },
            Cmd.batch [
                Cmd.OfAsync.perform runBootstrap () (fun () -> SettingsActionDone "Bootstrap started")
                Cmd.OfAsync.perform getSystemStatus () SettingsStatus
            ]
        | None -> model, Cmd.none

    | SetupWizardMsg SetupWizardMsg.Finish ->
        SetupWizard.markComplete ()
        { model with SetupWizard = None }, Cmd.none

let startupView model dispatch =
    match model.HostStartup with
    | Starting ->
        Html.div [
            prop.className "flex flex-col h-screen items-center justify-center bg-surface text-slate-200 gap-4"
            prop.children [
                Html.h1 [
                    prop.className "text-xl font-semibold"
                    prop.text "Starting LMVideoStudio…"
                ]
                Html.p [
                    prop.className "text-sm text-slate-500 max-w-md text-center"
                    prop.text "Waiting for the local Host service (http://127.0.0.1:17170). This usually takes a few seconds after install."
                ]
                Html.p [ prop.className "text-xs text-slate-600"; prop.text "Loading…" ]
            ]
        ]
    | Failed err ->
        Html.div [
            prop.className "flex flex-col h-screen items-center justify-center bg-surface text-slate-200 gap-4 p-8"
            prop.children [
                Html.h1 [
                    prop.className "text-xl font-semibold text-red-400"
                    prop.text "Could not start Host"
                ]
                Html.p [ prop.className "text-sm text-slate-400 text-center max-w-lg"; prop.text err ]
                Html.button [
                    prop.className "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted font-medium"
                    prop.text "Retry"
                    prop.onClick (fun _ -> dispatch RetryHostStartup)
                ]
            ]
        ]
    | Ready -> Html.none

let view model dispatch =
    let shellDispatch = ShellMsg >> dispatch

    let content =
        match model.Page with
        | HubPage hub -> ProjectHub.view hub (HubMsg >> dispatch)
        | TimelinePage timeline -> StoryboardTimeline.view timeline (TimelineMsg >> dispatch)
        | SettingsPage settings -> Settings.view settings (SettingsMsg >> dispatch)

    let chrome =
        Shell.chrome model.Shell.Tab model.Shell.Activity model.Shell.SystemStatus content shellDispatch
        |> fun shell ->
            match model.SetupWizard with
            | Some wizard ->
                Html.div [
                    prop.children [
                        shell
                        SetupWizard.view wizard (SetupWizardMsg >> dispatch)
                    ]
                ]
            | None -> shell

    match model.HostStartup with
    | Ready -> chrome
    | _ -> startupView model dispatch

module App =
    let mount () =
        Elmish.Program.mkProgram init update view
        |> Elmish.React.Program.withReactBatched "root"
        |> Elmish.Program.withSubscription (fun _ ->
            [
                [ "sse" ], fun dispatch ->
                    let es =
                        subscribeEvents (fun e -> dispatch (ShellMsg(ShellMsg.EventReceived e)))

                    dispatch (ShellMsg ShellMsg.SseConnected)

                    { new System.IDisposable with
                        member _.Dispose() =
                            emitJsExpr es "$0.close()" }

                [ "error-hooks" ], fun dispatch ->
                    ErrorReporting.installHooks (fun req -> dispatch (ErrorCaptured req))
                    { new System.IDisposable with member _.Dispose() = () }
            ])
        |> Elmish.Program.run
