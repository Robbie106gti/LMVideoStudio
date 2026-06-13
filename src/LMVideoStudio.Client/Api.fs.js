import { trimStart, replace, isNullOrWhiteSpace } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { bool_type, record_type, int32_type, string_type, class_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { bool, fromString, list as list_2, int, string, guid, object } from "./fable_modules/Thoth.Json.10.4.1/Decode.fs.js";
import { uncurry2 } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { singleton } from "./fable_modules/fable-library-js.4.27.0/AsyncBuilder.js";
import { awaitPromise } from "./fable_modules/fable-library-js.4.27.0/Async.js";
import { subscribeSse, importFile, fetchJson } from "./fetch.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";
import { guid as guid_1, object as object_1, toString } from "./fable_modules/Thoth.Json.10.4.1/Encode.fs.js";
import { decodeProject } from "./ProjectJson.fs.js";
import { empty, singleton as singleton_1, append, map, toArray } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { map as map_1, defaultArg } from "./fable_modules/fable-library-js.4.27.0/Option.js";

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

export class SystemStatusDto extends Record {
    constructor(Host, Ollama, Worker$, WarmupComplete) {
        super();
        this.Host = Host;
        this.Ollama = Ollama;
        this.Worker = Worker$;
        this.WarmupComplete = WarmupComplete;
    }
}

export function SystemStatusDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.SystemStatusDto", [], SystemStatusDto, () => [["Host", string_type], ["Ollama", bool_type], ["Worker", bool_type], ["WarmupComplete", bool_type]]);
}

export class JobEventDto extends Record {
    constructor(JobId, Phase, Step, Message, Status, Timestamp) {
        super();
        this.JobId = JobId;
        this.Phase = Phase;
        this.Step = Step;
        this.Message = Message;
        this.Status = Status;
        this.Timestamp = Timestamp;
    }
}

export function JobEventDto_$reflection() {
    return record_type("LMVideoStudio.Client.Api.JobEventDto", [], JobEventDto, () => [["JobId", class_type("System.Guid")], ["Phase", string_type], ["Step", string_type], ["Message", string_type], ["Status", string_type], ["Timestamp", string_type]]);
}

const summaryDecoder = (path_3) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3;
    return new ProjectSummaryDto((objectArg = get$.Required, objectArg.Field("id", guid)), (objectArg_1 = get$.Required, objectArg_1.Field("name", string)), (objectArg_2 = get$.Required, objectArg_2.Field("path", string)), (objectArg_3 = get$.Required, objectArg_3.Field("blockCount", uncurry2(int))));
}, path_3, v));

const summariesDecoder = (path) => ((value) => list_2(uncurry2(summaryDecoder), path, value));

const jobEventDecoder = (path_6) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5;
    return new JobEventDto((objectArg = get$.Required, objectArg.Field("jobId", guid)), (objectArg_1 = get$.Required, objectArg_1.Field("phase", string)), (objectArg_2 = get$.Required, objectArg_2.Field("step", string)), (objectArg_3 = get$.Required, objectArg_3.Field("message", string)), (objectArg_4 = get$.Required, objectArg_4.Field("status", string)), (objectArg_5 = get$.Required, objectArg_5.Field("timestamp", string)));
}, path_6, v));

function fetchAsync(url, method, body) {
    return singleton.Delay(() => singleton.TryWith(singleton.Delay(() => singleton.Bind(awaitPromise(fetchJson(url)(method)(body)), (_arg) => singleton.Return(_arg))), (_arg_1) => singleton.Return([0, _arg_1.message])));
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
    return singleton.Delay(() => singleton.Bind(awaitPromise(importFile(`${hostBase()}/projects/${projectId}/blocks/import`)(file)), (_arg) => {
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
    }));
}

export function getSystemStatus() {
    return singleton.Delay(() => singleton.Bind(fetchAsync(`${hostBase()}/system/status`, "GET", undefined), (_arg) => {
        const text = _arg[1];
        const status = _arg[0] | 0;
        if ((status >= 200) && (status < 300)) {
            const matchValue = fromString((path_4, v) => object((get$) => {
                let objectArg, objectArg_1, objectArg_2, objectArg_3;
                return new SystemStatusDto((objectArg = get$.Required, objectArg.Field("host", string)), (objectArg_1 = get$.Required, objectArg_1.Field("ollama", bool)), (objectArg_2 = get$.Required, objectArg_2.Field("worker", bool)), defaultArg((objectArg_3 = get$.Optional, objectArg_3.Field("warmupComplete", bool)), false));
            }, path_4, v), text);
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

export function generateBlockThumbnail(projectId, blockId, prompt) {
    return singleton.Delay(() => {
        let p_1;
        const body = (prompt != null) ? (!isNullOrWhiteSpace(prompt) ? ((p_1 = prompt, toString(0, object_1([["profile", "mockup"], ["variantCount", 1], ["prompt", p_1]])))) : toString(0, object_1([["profile", "mockup"], ["variantCount", 1]]))) : toString(0, object_1([["profile", "mockup"], ["variantCount", 1]]));
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

export function updateBlock(projectId, blockId, voiceoverScript, imagePrompt) {
    return singleton.Delay(() => {
        const body = toString(0, object_1(append(singleton_1(["voiceoverScript", voiceoverScript]), defaultArg(map_1((p) => singleton_1(["imagePrompt", p]), imagePrompt), empty()))));
        return singleton.Bind(fetchAsync(`${hostBase()}/projects/${projectId}/blocks/${blockId}`, "PATCH", body), (_arg) => {
            const text = _arg[1];
            const status = _arg[0] | 0;
            return ((status >= 200) && (status < 300)) ? singleton.Return(decodeProject(text)) : singleton.Return(new FSharpResult$2(1, [text]));
        });
    });
}

export function importBlockAudio(projectId, blockId, file) {
    return singleton.Delay(() => singleton.Bind(awaitPromise(importFile(`${hostBase()}/projects/${projectId}/blocks/${blockId}/audio/import`)(file)), (_arg) => {
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
    }));
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
            const matchValue = fromString(uncurry2(previewStatusDecoder), text);
            return (matchValue.tag === 1) ? singleton.Return(new FSharpResult$2(1, [matchValue.fields[0]])) : singleton.Return(new FSharpResult$2(0, [matchValue.fields[0]]));
        }
        else {
            return singleton.Return(new FSharpResult$2(1, [text]));
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

export function checkForUpdates() {
    return singleton.Delay(() => singleton.Return(new FSharpResult$2(0, ["Update check stub (configure GitHub Releases in tauri.conf.json)"])));
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

