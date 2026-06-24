module LMVideoStudio.Client.AppNavigation

open Fable.Core.JsInterop

type AppRoute =
    | RouteHub
    | RouteSettings
    | RouteProject of System.Guid * System.Guid option

let private readHash () =
    try
        Browser.Dom.window.location.hash
    with _ ->
        ""

let parseHash (hash: string) =
    let path =
        hash.Trim().TrimStart('#').Split('?', '&').[0].Trim('/')

    if path = "" then
        Some RouteHub
    elif path = "settings" then
        Some RouteSettings
    elif path.StartsWith("project/") then
        let segments = path.Split('/') |> Array.filter (fun s -> s <> "")

        match segments with
        | [| "project"; projectId |] ->
            match System.Guid.TryParse projectId with
            | true, pid -> Some(RouteProject(pid, None))
            | _ -> None
        | [| "project"; projectId; "block"; blockId |] ->
            match System.Guid.TryParse projectId, System.Guid.TryParse blockId with
            | (true, pid), (true, bid) -> Some(RouteProject(pid, Some bid))
            | _ -> None
        | _ -> None
    else
        None

let parseCurrent () = parseHash (readHash ())

let toHash route =
    match route with
    | RouteHub -> "#/"
    | RouteSettings -> "#/settings"
    | RouteProject(pid, None) -> $"#/project/{pid}"
    | RouteProject(pid, Some bid) -> $"#/project/{pid}/block/{bid}"

let private setHash route replace =
    let hash = toHash route

    if readHash () <> hash then
        if replace then
            Browser.Dom.window.history.replaceState(null, "", hash)
        else
            Browser.Dom.window.history.pushState(null, "", hash)

let push route = setHash route false

let replace route = setHash route true

let syncRoute route =
    Elmish.Cmd.ofEffect (fun _ -> push route)

let subscribe onRouteChanged =
    let onChange _ =
        onRouteChanged (parseCurrent () |> Option.defaultValue RouteHub)

    Browser.Dom.window.addEventListener("popstate", onChange)
    Browser.Dom.window.addEventListener("hashchange", onChange)

    { new System.IDisposable with
        member _.Dispose() =
            Browser.Dom.window.removeEventListener("popstate", onChange)
            Browser.Dom.window.removeEventListener("hashchange", onChange) }

let ensureInitialHash () =
    if readHash() = "" then
        replace RouteHub
