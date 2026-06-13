import { trimStart, replace, isNullOrWhiteSpace } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { list_type, int64_type, float64_type, option_type, bool_type, record_type, int32_type, string_type, class_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { float, fromString, bool, int64, list as list_2, int, string, guid, object } from "./fable_modules/Thoth.Json.10.4.1/Decode.fs.js";
import { equals, uncurry2 } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { singleton } from "./fable_modules/fable-library-js.4.27.0/AsyncBuilder.js";
import { sleep, awaitPromise } from "./fable_modules/fable-library-js.4.27.0/Async.js";
import { subscribeSse, importFile, fetchJson } from "../fetch.js";
import { evaluateAttempt, defaultConfig } from "./LMVideoStudio.Domain/HostHealthPoll.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";
import { guid as guid_1, object as object_1, toString } from "./fable_modules/Thoth.Json.10.4.1/Encode.fs.js";
import { decodeProject } from "./ProjectJson.js";
import { empty, singleton as singleton_1, ofArray, append, map, toArray } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { filter, map as map_1, defaultArg } from "./fable_modules/fable-library-js.4.27.0/Option.js";
import { writeErrorReportTauri, checkForUpdatesFallback, checkForUpdatesTauri } from "../tauriInterop.js";

export const defaultHostBase = "http://127.0.0.1:17170";

export function hostBase() {
    try {
        const cfg = window.__LMVS_HOST__;
        let matchResult, v_1;
        if (cfg != null) {
            if (!isNullOrWhiteSpace(cfg)) {
                matchResult = 0;
                v_1 = cfg;
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
                return v_1;
            default:
                return defaultHostBase;
        }
    }
    catch (matchValue) {
        return defaultHostBase;
    }
}

export class ProjectSummaryDto extends Record {
    constructor(Id, Name, Path, BlockCount) {
        super();
        this.Id = Id;
        this.Name = Name;
        this.Path = Path;
        this.BlockCount = (BlockCount | 0);
    }
}

export function ProjectSummaryDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.ProjectSummaryDto", [], ProjectSummaryDto, () => [["Id", class_type("System.Guid")], ["Name", string_type], ["Path", string_type], ["BlockCount", int32_type]]);
}

export class WorkerDeviceDto extends Record {
    constructor(Rocm, VramGb, DeviceName) {
        super();
        this.Rocm = Rocm;
        this.VramGb = VramGb;
        this.DeviceName = DeviceName;
    }
}

export function WorkerDeviceDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.WorkerDeviceDto", [], WorkerDeviceDto, () => [["Rocm", option_type(bool_type)], ["VramGb", option_type(float64_type)], ["DeviceName", option_type(string_type)]]);
}

export class SystemStatusDto extends Record {
    constructor(Host, Ollama, Worker$, WarmupComplete, Ffmpeg, WorkerDevice) {
        super();
        this.Host = Host;
        this.Ollama = Ollama;
        this.Worker = Worker$;
        this.WarmupComplete = WarmupComplete;
        this.Ffmpeg = Ffmpeg;
        this.WorkerDevice = WorkerDevice;
    }
}

export function SystemStatusDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.SystemStatusDto", [], SystemStatusDto, () => [["Host", string_type], ["Ollama", bool_type], ["Worker", bool_type], ["WarmupComplete", bool_type], ["Ffmpeg", option_type(bool_type)], ["WorkerDevice", option_type(WorkerDeviceDto_$reflection())]]);
}

export class ModelStatusDto extends Record {
    constructor(OllamaReachable, WorkerReachable, ManifestPath, ManifestExists) {
        super();
        this.OllamaReachable = OllamaReachable;
        this.WorkerReachable = WorkerReachable;
        this.ManifestPath = ManifestPath;
        this.ManifestExists = ManifestExists;
    }
}

export function ModelStatusDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.ModelStatusDto", [], ModelStatusDto, () => [["OllamaReachable", bool_type], ["WorkerReachable", bool_type], ["ManifestPath", string_type], ["ManifestExists", bool_type]]);
}

export class JobEventDto extends Record {
    constructor(JobId, Phase, Step, Message, Status, Timestamp, Hardware, ElapsedMs, IsColdRun, StepIndex, StepTotal) {
        super();
        this.JobId = JobId;
        this.Phase = Phase;
        this.Step = Step;
        this.Message = Message;
        this.Status = Status;
        this.Timestamp = Timestamp;
        this.Hardware = Hardware;
        this.ElapsedMs = ElapsedMs;
        this.IsColdRun = IsColdRun;
        this.StepIndex = StepIndex;
        this.StepTotal = StepTotal;
    }
}

export function JobEventDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.JobEventDto", [], JobEventDto, () => [["JobId", class_type("System.Guid")], ["Phase", string_type], ["Step", string_type], ["Message", string_type], ["Status", string_type], ["Timestamp", string_type], ["Hardware", option_type(string_type)], ["ElapsedMs", option_type(int64_type)], ["IsColdRun", option_type(bool_type)], ["StepIndex", option_type(int32_type)], ["StepTotal", option_type(int32_type)]]);
}

const summaryDecoder = (path_3) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3;
    return new ProjectSummaryDto((objectArg = get$.Required, objectArg.Field("id", guid)), (objectArg_1 = get$.Required, objectArg_1.Field("name", string)), (objectArg_2 = get$.Required, objectArg_2.Field("path", string)), (objectArg_3 = get$.Required, objectArg_3.Field("blockCount", uncurry2(int))));
}, path_3, v));

const summariesDecoder = (path) => ((value) => list_2(uncurry2(summaryDecoder), path, value));

const jobEventDecoder = (path_8) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5, objectArg_6, objectArg_7, objectArg_8, objectArg_9, objectArg_10;
    return new JobEventDto((objectArg = get$.Required, objectArg.Field("jobId", guid)), (objectArg_1 = get$.Required, objectArg_1.Field("phase", string)), (objectArg_2 = get$.Required, objectArg_2.Field("step", string)), (objectArg_3 = get$.Required, objectArg_3.Field("message", string)), (objectArg_4 = get$.Required, objectArg_4.Field("status", string)), (objectArg_5 = get$.Required, objectArg_5.Field("timestamp", string)), (objectArg_6 = get$.Optional, objectArg_6.Field("hardware", string)), (objectArg_7 = get$.Optional, objectArg_7.Field("elapsedMs", uncurry2(int64))), (objectArg_8 = get$.Optional, objectArg_8.Field("isColdRun", bool)), (objectArg_9 = get$.Optional, objectArg_9.Field("stepIndex", uncurry2(int))), (objectArg_10 = get$.Optional, objectArg_10.Field("stepTotal", uncurry2(int))));
}, path_8, v));

function reportApiFailure(method, path, status, message) {
    throw 1;
    if ((() => {
        throw 1;
    })()) {
        return undefined;
    }
    else if ((status === 0) ? true : (status >= 500)) {
        return (() => {
            throw 1;
        })();
    }
    else {
        return undefined;
    }
}

function fetchAsync(url, method, body) {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => singleton.Bind(awaitPromise(fetchJson(url)(method)(body)), (_arg) => {
        let matchValue, req;
        const result = _arg;
        return singleton.Combine((matchValue = reportApiFailure(method, url, result[0], result[1]), (matchValue == null) ? (singleton.Zero()) : ((req = matchValue, ((() => {
            throw 1;
        })(), singleton.Zero())))), singleton.Delay(() => singleton.Return(result)));
    })), (_arg_1) => {
        throw 1;
        return singleton.Return([0, _arg_1.message]);
    }));
}

function isHostHealthy() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/health`, "GET", undefined), (_arg) => {
        const status = _arg[0] | 0;
        return singleton.Return(((status >= 200) && (status < 300)) && (_arg[1].indexOf("ok") >= 0));
    }));
}

/**
 * Poll Host `/health` with exponential backoff before the UI loads projects.
 */
export function waitForHostHealth() {
    return singleton.Delay(() => {
        let attempt = 0;
        let result = undefined;
        return singleton.Combine(singleton.While(() => ((attempt < defaultConfig.MaxAttempts) && (result == null)), singleton.Delay(() => {
            attempt = ((attempt + 1) | 0);
            return singleton.Bind(isHostHealthy(), (_arg) => {
                const matchValue = evaluateAttempt(attempt, _arg, defaultConfig);
                switch (matchValue.tag) {
                    case 2: {
                        result = (new FSharpResult$2(1, ["Host did not become ready within 60 seconds"]));
                        return singleton.Zero();
                    }
                    case 1:
                        return singleton.Bind(sleep(matchValue.fields[0]), () => singleton.Return(undefined));
                    default: {
                        result = (new FSharpResult$2(0, [undefined]));
                        return singleton.Zero();
                    }
                }
            });
        })), singleton.Delay(() => singleton.Return((result == null) ? (new FSharpResult$2(1, ["Host did not become ready within 60 seconds"])) : result)));
    });
}

export function getProjects() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if (status === 0) {
            return singleton.Return(new FSharpResult$2(1, [`Host request failed: ${text}`]));
        }
        else if ((status >= 200) && (status < 300)) {
            const matchValue = fromString(uncurry2(summariesDecoder), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function createProject(name) {
    return singleton.Delay(() => {
        const body = toString(0, object_1([["name", name]]));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            if (status === 0) {
                return singleton.Return(new FSharpResult$2(1, [`Host request failed: ${text}`]));
            }
            else if ((status >= 200) && (status < 300)) {
                const matchValue = decodeProject(text);
                return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
            }
            else {
                return singleton.Return(new FSharpResult$2(1, [text]));
            }
        });
    });
}

export function getProject(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = decodeProject(text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function deleteProject(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}`, "DELETE", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        return (status === 0) ? singleton.Return(new FSharpResult$2(1, [`Host request failed: ${text}`])) : ((status === 204) ? singleton.Return(new FSharpResult$2(0, [projectId])) : ((status === 404) ? singleton.Return(new FSharpResult$2(1, ["Project not found"])) : singleton.Return(new FSharpResult$2(1, [text]))));
    }));
}

export function reorderBlocks(projectId, blockIds) {
    return singleton.Delay(() => {
        const body = toString(0, object_1([["blockIds", toArray(map(guid_1, blockIds))]]));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/blocks/reorder`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            if ((status >= 200) && (status < 300)) {
                const matchValue = decodeProject(text);
                return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
            }
            else {
                return singleton.Return(new FSharpResult$2(1, [text]));
            }
        });
    });
}

export function importBlockImage(projectId, file) {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => singleton.Bind(awaitPromise(importFile(`${hostBase()}/projects/${projectId}/blocks/import`)(file)), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if (status === 0) {
            return singleton.Return(new FSharpResult$2(1, [`Host request failed: ${text}`]));
        }
        else if ((status >= 200) && (status < 300)) {
            let projectJson;
            try {
                const doc = JSON.parse(text);
                projectJson = doc.projectJson;
            }
            catch (matchValue) {
                projectJson = undefined;
            }
            if (projectJson == null) {
                return singleton.ReturnFrom(getProject(projectId));
            }
            else {
                const json = projectJson;
                return singleton.Return(decodeProject(json));
            }
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    })), (_arg_1) => singleton.Return(new FSharpResult$2(1, [_arg_1.message]))));
}

export function getSystemStatus() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/system/status`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString((path_9, v_1) => object((get$_1) => {
                let objectArg_3, objectArg_4, objectArg_5, objectArg_6, objectArg_7, objectArg_8;
                return new SystemStatusDto((objectArg_3 = get$_1.Required, objectArg_3.Field("host", string)), (objectArg_4 = get$_1.Required, objectArg_4.Field("ollama", bool)), (objectArg_5 = get$_1.Required, objectArg_5.Field("worker", bool)), defaultArg((objectArg_6 = get$_1.Optional, objectArg_6.Field("warmupComplete", bool)), false), (objectArg_7 = get$_1.Optional, objectArg_7.Field("ffmpeg", bool)), (objectArg_8 = get$_1.Optional, objectArg_8.Field("workerDevice", (path_3, v) => object((get$) => {
                    let objectArg, objectArg_1, objectArg_2;
                    return new WorkerDeviceDto((objectArg = get$.Optional, objectArg.Field("rocm", bool)), (objectArg_1 = get$.Optional, objectArg_1.Field("vramGb", float)), (objectArg_2 = get$.Optional, objectArg_2.Field("deviceName", string)));
                }, path_3, v))));
            }, path_9, v_1), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function runBootstrap() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/system/bootstrap`, "POST", ""), (_arg) => singleton.Return(undefined)));
}

export function runConflictScan() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/system/conflicts/scan`, "POST", ""), (_arg) => singleton.Return(undefined)));
}

export function runRepair() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/system/repair`, "POST", ""), (_arg) => singleton.Return(undefined)));
}

export function generateBlockThumbnail(projectId, blockId, prompt, variantCount) {
    return singleton.Delay(() => {
        const body = toString(0, object_1(append(ofArray([["profile", "mockup"], ["variantCount", variantCount], ["upscale", true]]), defaultArg(map_1((p) => singleton_1(["prompt", p]), filter((arg) => !isNullOrWhiteSpace(arg), prompt)), empty()))));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/blocks/${blockId}/generate`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            if ((status >= 200) && (status < 300)) {
                let projectJson;
                try {
                    const doc = JSON.parse(text);
                    projectJson = doc.projectJson;
                }
                catch (matchValue) {
                    projectJson = undefined;
                }
                if (projectJson == null) {
                    return singleton.ReturnFrom(getProject(projectId));
                }
                else {
                    const json = projectJson;
                    return singleton.Return(decodeProject(json));
                }
            }
            else {
                return singleton.Return(new FSharpResult$2(1, [text]));
            }
        });
    });
}

export function updateBlock(projectId, blockId, voiceoverScript, imagePrompt, crossfadeDurationMs, moodTags) {
    return singleton.Delay(() => {
        const transitionFields = defaultArg(map_1((ms) => singleton_1(["transitions", object_1([["toNext", object_1([["type", "crossfade"], ["durationMs", ms]])]])]), crossfadeDurationMs), empty());
        const moodFields = defaultArg(map_1((tags) => singleton_1(["moodTags", (() => {
            throw 1;
        })()]), moodTags), empty());
        const body = toString(0, object_1(append(singleton_1(["voiceoverScript", voiceoverScript]), append(defaultArg(map_1((p) => singleton_1(["imagePrompt", p]), imagePrompt), empty()), append(transitionFields, moodFields)))));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/blocks/${blockId}`, "PATCH", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            return ((status >= 200) && (status < 300)) ? singleton.Return(decodeProject(text)) : singleton.Return(new FSharpResult$2(1, [text]));
        });
    });
}

export function importBlockAudio(projectId, blockId, file) {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => singleton.Bind(awaitPromise(importFile(`${hostBase()}/projects/${projectId}/blocks/${blockId}/audio/import`)(file)), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if (status === 0) {
            return singleton.Return(new FSharpResult$2(1, [`Host request failed: ${text}`]));
        }
        else if ((status >= 200) && (status < 300)) {
            let projectJson;
            try {
                const doc = JSON.parse(text);
                projectJson = doc.projectJson;
            }
            catch (matchValue) {
                projectJson = undefined;
            }
            if (projectJson == null) {
                return singleton.ReturnFrom(getProject(projectId));
            }
            else {
                const json = projectJson;
                return singleton.Return(decodeProject(json));
            }
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    })), (_arg_1) => singleton.Return(new FSharpResult$2(1, [_arg_1.message]))));
}

export class PreviewStartDto extends Record {
    constructor(JobId, PreviewPath, EventsUrl) {
        super();
        this.JobId = JobId;
        this.PreviewPath = PreviewPath;
        this.EventsUrl = EventsUrl;
    }
}

export function PreviewStartDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.PreviewStartDto", [], PreviewStartDto, () => [["JobId", class_type("System.Guid")], ["PreviewPath", string_type], ["EventsUrl", string_type]]);
}

export class PreviewStatusDto extends Record {
    constructor(PreviewPath, MediaUrl) {
        super();
        this.PreviewPath = PreviewPath;
        this.MediaUrl = MediaUrl;
    }
}

export function PreviewStatusDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.PreviewStatusDto", [], PreviewStatusDto, () => [["PreviewPath", string_type], ["MediaUrl", string_type]]);
}

const previewStartDecoder = (path_3) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2;
    return new PreviewStartDto((objectArg = get$.Required, objectArg.Field("jobId", guid)), (objectArg_1 = get$.Required, objectArg_1.Field("previewPath", string)), (objectArg_2 = get$.Required, objectArg_2.Field("eventsUrl", string)));
}, path_3, v));

const previewStatusDecoder = (path_2) => ((v) => object((get$) => {
    let objectArg, objectArg_1;
    return new PreviewStatusDto((objectArg = get$.Required, objectArg.Field("previewPath", string)), (objectArg_1 = get$.Required, objectArg_1.Field("mediaUrl", string)));
}, path_2, v));

export function refreshMockupPreview(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/preview`, "POST", ""), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString(uncurry2(previewStartDecoder), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function getMockupPreviewStatus(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/preview`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            if (!(() => {
                try {
                    const doc = JSON.parse(text);
                    const raw = doc.ready;
                    return (raw == null) ? true : raw;
                }
                catch (matchValue) {
                    return true;
                }
            })()) {
                return singleton.Return(new FSharpResult$2(0, [undefined]));
            }
            else {
                const matchValue_1 = fromString(uncurry2(previewStatusDecoder), text);
                return (matchValue_1.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue_1.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue_1.fields[0]]));
            }
        }
        else {
            return (status === 404) ? singleton.Return(new FSharpResult$2(0, [undefined])) : singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function previewMediaUrl(projectId, relativePath, cacheBust) {
    const path = replace(trimStart(relativePath, "/"), "\\", "/");
    return `${hostBase()}/projects/${projectId}/media/${path}?v=${cacheBust}`;
}

export function startBake(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/bake`, "POST", ""), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        return ((status >= 200) && (status < 300)) ? singleton.TryWith(singleton.Delay(() => {
            const doc = JSON.parse(text);
            const jobId = doc.jobId;
            return singleton.Return(new FSharpResult$2(0, [jobId]));
        }), (_arg_1) => singleton.Return(new FSharpResult$2(1, [_arg_1.message]))) : singleton.Return(new FSharpResult$2(1, [text]));
    }));
}

export class OutlineBlockDto extends Record {
    constructor(Title, VoiceoverScript, ImagePrompt) {
        super();
        this.Title = Title;
        this.VoiceoverScript = VoiceoverScript;
        this.ImagePrompt = ImagePrompt;
    }
}

export function OutlineBlockDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.OutlineBlockDto", [], OutlineBlockDto, () => [["Title", string_type], ["VoiceoverScript", string_type], ["ImagePrompt", string_type]]);
}

const outlineBlockDecoder = (path_3) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2;
    return new OutlineBlockDto((objectArg = get$.Required, objectArg.Field("title", string)), (objectArg_1 = get$.Required, objectArg_1.Field("voiceoverScript", string)), (objectArg_2 = get$.Required, objectArg_2.Field("imagePrompt", string)));
}, path_3, v));

export function generateOutline(projectId, brief) {
    return singleton.Delay(() => {
        const body = toString(0, object_1([["brief", brief]]));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/outline/generate`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            if ((status >= 200) && (status < 300)) {
                const matchValue = fromString((path_1, v) => object((get$) => {
                    const objectArg = get$.Required;
                    return objectArg.Field("blocks", (path, value_2) => list_2(uncurry2(outlineBlockDecoder), path, value_2));
                }, path_1, v), text);
                return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
            }
            else {
                return singleton.Return(new FSharpResult$2(1, [text]));
            }
        });
    });
}

export function applyOutline(projectId, brief, blocks) {
    return singleton.Delay(() => {
        const body = toString(0, object_1([["brief", brief], ["blocks", toArray(map((b) => object_1([["title", b.Title], ["voiceoverScript", b.VoiceoverScript], ["imagePrompt", b.ImagePrompt]]), blocks))]]));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/outline/apply`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            return ((status >= 200) && (status < 300)) ? singleton.Return(decodeProject(text)) : singleton.Return(new FSharpResult$2(1, [text]));
        });
    });
}

export function importStylePackLogo(projectId, file) {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => singleton.Bind(awaitPromise(importFile(`${hostBase()}/projects/${projectId}/style-pack/import`)(file)), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            let projectJson;
            try {
                const doc = JSON.parse(text);
                projectJson = doc.projectJson;
            }
            catch (matchValue) {
                projectJson = undefined;
            }
            if (projectJson == null) {
                return singleton.ReturnFrom(getProject(projectId));
            }
            else {
                const json = projectJson;
                return singleton.Return(decodeProject(json));
            }
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    })), (_arg_1) => singleton.Return(new FSharpResult$2(1, [_arg_1.message]))));
}

export function exportPremiereXmlUrl(projectId) {
    return `${hostBase()}/projects/${projectId}/export/premiere`;
}

export function getModelStatus() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/models/status`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString((path_4, v) => object((get$) => {
                let objectArg, objectArg_1, objectArg_2, objectArg_3;
                return new ModelStatusDto((objectArg = get$.Required, objectArg.Field("ollamaReachable", bool)), (objectArg_1 = get$.Required, objectArg_1.Field("workerReachable", bool)), (objectArg_2 = get$.Required, objectArg_2.Field("manifestPath", string)), (objectArg_3 = get$.Required, objectArg_3.Field("manifestExists", bool)));
            }, path_4, v), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function syncModels(pull) {
    return singleton.Delay(() => {
        const body = pull ? "{\"pull\":true}" : "";
        return singleton.Bind(fetchAsync(`${hostBase()}/models/sync`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            return ((status >= 200) && (status < 300)) ? singleton.Return(new FSharpResult$2(0, [text])) : singleton.Return(new FSharpResult$2(1, [text]));
        });
    });
}

export function selectBlockThumbnail(projectId, blockId, thumbnailPath) {
    return singleton.Delay(() => {
        const body = toString(0, object_1([["thumbnailPath", thumbnailPath]]));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/blocks/${blockId}`, "PATCH", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            return ((status >= 200) && (status < 300)) ? singleton.Return(decodeProject(text)) : singleton.Return(new FSharpResult$2(1, [text]));
        });
    });
}

export function exportSharePack(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/export/share-pack`, "POST", ""), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        return ((status >= 200) && (status < 300)) ? singleton.Return(new FSharpResult$2(0, [text])) : singleton.Return(new FSharpResult$2(1, [text]));
    }));
}

export function checkForUpdates() {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => (equals((() => {
        try {
            return window.__LMVS_BUILD_FLAVOR__;
        }
        catch (matchValue) {
            return undefined;
        }
    })(), "microsoft-store") ? singleton.Return(new FSharpResult$2(0, ["Updates are managed by the Microsoft Store"])) : singleton.Bind(awaitPromise(checkForUpdatesTauri()), (_arg) => {
        const tauriResult = _arg;
        return (!(tauriResult == null) && !isNullOrWhiteSpace(tauriResult)) ? singleton.Return(new FSharpResult$2(0, [tauriResult])) : singleton.Bind(awaitPromise(checkForUpdatesFallback("0.1.0")), (_arg_1) => singleton.Return(new FSharpResult$2(0, [_arg_1])));
    }))), (_arg_2) => singleton.Return(new FSharpResult$2(1, [_arg_2.message]))));
}

export function subscribeEvents(onEvent) {
    return subscribeSse(`${hostBase()}/events`)((data) => {
        const matchValue = fromString(uncurry2(jobEventDecoder), data);
        if (matchValue.tag === 1) {
        }
        else {
            onEvent(matchValue.fields[0]);
        }
    });
}

export function submitErrorReport(json) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/api/v1/reports`, "POST", json), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        return ((status >= 200) && (status < 300)) ? singleton.Return(new FSharpResult$2(0, [text])) : ((status === 0) ? singleton.Return(new FSharpResult$2(1, [`Host request failed: ${text}`])) : singleton.Return(new FSharpResult$2(1, [text])));
    }));
}

export function flushErrorReports() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/api/v1/reports/flush`, "POST", ""), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        return ((status >= 200) && (status < 300)) ? singleton.Return(new FSharpResult$2(0, [text])) : singleton.Return(new FSharpResult$2(1, [text]));
    }));
}

export function submitErrorReportFallback(json) {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => singleton.Bind(awaitPromise(writeErrorReportTauri(json)), (_arg) => singleton.Return(new FSharpResult$2(0, [_arg])))), (_arg_1) => singleton.Return(new FSharpResult$2(1, [_arg_1.message]))));
}

export class ConnectedAccountDto extends Record {
    constructor(Provider, Connected, AccountName, AccountId, PageName, ExpiresAtUtc, Configured) {
        super();
        this.Provider = Provider;
        this.Connected = Connected;
        this.AccountName = AccountName;
        this.AccountId = AccountId;
        this.PageName = PageName;
        this.ExpiresAtUtc = ExpiresAtUtc;
        this.Configured = Configured;
    }
}

export function ConnectedAccountDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.ConnectedAccountDto", [], ConnectedAccountDto, () => [["Provider", string_type], ["Connected", bool_type], ["AccountName", option_type(string_type)], ["AccountId", option_type(string_type)], ["PageName", option_type(string_type)], ["ExpiresAtUtc", option_type(string_type)], ["Configured", bool_type]]);
}

export class ConnectedAccountsDto extends Record {
    constructor(Configured, Accounts) {
        super();
        this.Configured = Configured;
        this.Accounts = Accounts;
    }
}

export function ConnectedAccountsDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.ConnectedAccountsDto", [], ConnectedAccountsDto, () => [["Configured", bool_type], ["Accounts", list_type(ConnectedAccountDto_$reflection())]]);
}

export class SharePackExportDto extends Record {
    constructor(OutputDir, Files, CaptionPath, CaptionText, ReadmePath, MediaBase) {
        super();
        this.OutputDir = OutputDir;
        this.Files = Files;
        this.CaptionPath = CaptionPath;
        this.CaptionText = CaptionText;
        this.ReadmePath = ReadmePath;
        this.MediaBase = MediaBase;
    }
}

export function SharePackExportDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.SharePackExportDto", [], SharePackExportDto, () => [["OutputDir", string_type], ["Files", list_type(string_type)], ["CaptionPath", string_type], ["CaptionText", string_type], ["ReadmePath", string_type], ["MediaBase", string_type]]);
}

export class OAuthStartDto extends Record {
    constructor(AuthorizationUrl, State, Provider) {
        super();
        this.AuthorizationUrl = AuthorizationUrl;
        this.State = State;
        this.Provider = Provider;
    }
}

export function OAuthStartDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.OAuthStartDto", [], OAuthStartDto, () => [["AuthorizationUrl", string_type], ["State", string_type], ["Provider", string_type]]);
}

export class SharePackUploadResultDto extends Record {
    constructor(Platform, VideoId, Url, Message) {
        super();
        this.Platform = Platform;
        this.VideoId = VideoId;
        this.Url = Url;
        this.Message = Message;
    }
}

export function SharePackUploadResultDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.SharePackUploadResultDto", [], SharePackUploadResultDto, () => [["Platform", string_type], ["VideoId", option_type(string_type)], ["Url", option_type(string_type)], ["Message", string_type]]);
}

const connectedAccountDecoder = (path_7) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5, objectArg_6;
    return new ConnectedAccountDto((objectArg = get$.Required, objectArg.Field("provider", string)), (objectArg_1 = get$.Required, objectArg_1.Field("connected", bool)), (objectArg_2 = get$.Optional, objectArg_2.Field("accountName", string)), (objectArg_3 = get$.Optional, objectArg_3.Field("accountId", string)), (objectArg_4 = get$.Optional, objectArg_4.Field("pageName", string)), (objectArg_5 = get$.Optional, objectArg_5.Field("expiresAtUtc", string)), (objectArg_6 = get$.Required, objectArg_6.Field("configured", bool)));
}, path_7, v));

const connectedAccountsDecoder = (path_2) => ((v) => object((get$) => {
    let objectArg, objectArg_1;
    return new ConnectedAccountsDto((objectArg = get$.Required, objectArg.Field("configured", bool)), (objectArg_1 = get$.Required, objectArg_1.Field("accounts", (path_1, value_1) => list_2(uncurry2(connectedAccountDecoder), path_1, value_1))));
}, path_2, v));

const sharePackExportDecoder = (path_7) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5;
    return new SharePackExportDto((objectArg = get$.Required, objectArg.Field("outputDir", string)), (objectArg_1 = get$.Required, objectArg_1.Field("files", (path_2, value_2) => list_2(string, path_2, value_2))), (objectArg_2 = get$.Required, objectArg_2.Field("captionPath", string)), defaultArg((objectArg_3 = get$.Optional, objectArg_3.Field("captionText", string)), ""), (objectArg_4 = get$.Required, objectArg_4.Field("readmePath", string)), (objectArg_5 = get$.Required, objectArg_5.Field("mediaBase", string)));
}, path_7, v));

const oauthStartDecoder = (path_3) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2;
    return new OAuthStartDto((objectArg = get$.Required, objectArg.Field("authorizationUrl", string)), (objectArg_1 = get$.Required, objectArg_1.Field("state", string)), (objectArg_2 = get$.Required, objectArg_2.Field("provider", string)));
}, path_3, v));

const sharePackUploadResultDecoder = (path_4) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3;
    return new SharePackUploadResultDto((objectArg = get$.Required, objectArg.Field("platform", string)), (objectArg_1 = get$.Optional, objectArg_1.Field("videoId", string)), (objectArg_2 = get$.Optional, objectArg_2.Field("url", string)), (objectArg_3 = get$.Required, objectArg_3.Field("message", string)));
}, path_4, v));

export function getConnectedAccounts() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/settings/connected-accounts`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString(uncurry2(connectedAccountsDecoder), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function startOAuth(provider) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/oauth/${provider}/start`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString(uncurry2(oauthStartDecoder), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function disconnectOAuth(provider) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/oauth/${provider}`, "DELETE", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        return ((status >= 200) && (status < 300)) ? singleton.Return(new FSharpResult$2(0, [text])) : singleton.Return(new FSharpResult$2(1, [text]));
    }));
}

export function exportSharePackDetailed(projectId) {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/export/share-pack`, "POST", ""), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString(uncurry2(sharePackExportDecoder), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
        }
    }));
}

export function uploadSharePack(projectId, platform, title, description) {
    return singleton.Delay(() => {
        const body = toString(0, object_1(append(singleton_1(["platform", platform]), append(defaultArg(map_1((t) => singleton_1(["title", t]), title), empty()), defaultArg(map_1((d) => singleton_1(["description", d]), description), empty())))));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/export/share-pack/upload`, "POST", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            if ((status >= 200) && (status < 300)) {
                const matchValue = fromString(uncurry2(sharePackUploadResultDecoder), text);
                return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
            }
            else {
                return singleton.Return(new FSharpResult$2(1, [text]));
            }
        });
    });
}

