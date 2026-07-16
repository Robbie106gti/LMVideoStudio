namespace LMVideoStudio.Domain

open System

type ValidationIssue =
    { Path: string
      Message: string }

type ValidationResult =
    | Valid
    | Invalid of ValidationIssue list

module Validation =
    let private issue path message = { Path = path; Message = message }

    let private require (path: string) (condition: bool) (message: string) =
        if condition then [] else [ issue path message ]

    let private validateTransitionEdge (blockId: Guid) (edgeName: string) (edge: TransitionEdge option) =
        match edge with
        | None -> []
        | Some e ->
            [ yield!
                  require
                      $"blocks[{blockId}].transitions.{edgeName}.durationMs"
                      (e.DurationMs > 0)
                      "transition durationMs must be > 0" ]

    let private validateTransitionSpec (blockId: Guid) (spec: TransitionSpec option) =
        match spec with
        | None -> []
        | Some t ->
            [ yield! validateTransitionEdge blockId "inEdge" t.InEdge
              yield! validateTransitionEdge blockId "outEdge" t.OutEdge
              yield! validateTransitionEdge blockId "toNext" t.ToNext ]

    let validateProject (project: Project) : ValidationResult =
        let issues =
            [ yield! require "schemaVersion" (project.SchemaVersion = 1) "schemaVersion must be 1"
              yield! require "name" (not (String.IsNullOrWhiteSpace project.Name)) "name is required"
              yield!
                  require
                      "defaultMockupDurationSec"
                      (project.DefaultMockupDurationSec >= Project.mockupDurationMinSec
                       && project.DefaultMockupDurationSec <= Project.mockupDurationMaxSec)
                      $"defaultMockupDurationSec must be between {Project.mockupDurationMinSec} and {Project.mockupDurationMaxSec}"
              yield!
                  require
                      "renderDefaults.mockup.tier"
                      (project.RenderDefaults.Mockup.Tier = Mockup)
                      "renderDefaults.mockup.tier must be mockup"
              yield!
                  require
                      "renderDefaults.bake.tier"
                      (project.RenderDefaults.Bake.Tier = Bake)
                      "renderDefaults.bake.tier must be bake" ]

        let blockIssues =
            project.Blocks
            |> List.collect (fun b ->
                [ yield! require $"blocks[{b.Id}].order" (b.Order >= 0) "order must be >= 0"
                  yield!
                      require
                          $"blocks[{b.Id}].mockupDurationSec"
                          (b.MockupDurationSec
                           |> Option.map (fun d ->
                               d >= Project.mockupDurationMinSec && d <= Project.mockupDurationMaxSec)
                           |> Option.defaultValue true)
                          $"mockupDurationSec must be between {Project.mockupDurationMinSec} and {Project.mockupDurationMaxSec} when set"
                  yield!
                      require
                          $"blocks[{b.Id}].bakeDurationSec"
                          (b.BakeDurationSec
                           |> Option.map (fun d ->
                               d >= Project.bakeDurationMinSec && d <= Project.bakeDurationMaxSec)
                           |> Option.defaultValue true)
                          $"bakeDurationSec must be between {Project.bakeDurationMinSec} and {Project.bakeDurationMaxSec} when set"
                  yield! validateTransitionSpec b.Id b.Transitions ])

        match issues @ blockIssues with
        | [] -> Valid
        | errs -> Invalid errs
