import { FSharpRef, Record } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { list_type, class_type, record_type, option_type, bool_type, string_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { isNullOrWhiteSpace, substring, isNullOrEmpty } from "../fable_modules/fable-library-js.4.27.0/String.js";
import { fold } from "../fable_modules/fable-library-js.4.27.0/Array.js";
import { replace } from "../fable_modules/fable-library-js.4.27.0/RegExp.js";
import { toList as toList_1, isEmpty, empty, map, filter } from "../fable_modules/fable-library-js.4.27.0/Map.js";
import { value as value_5, defaultArg, map as map_1 } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { toArray, isEmpty as isEmpty_1, empty as empty_1, length, map as map_2, truncate as truncate_1 } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { Result_MapError, FSharpResult$2 } from "../fable_modules/fable-library-js.4.27.0/Result.js";
import { newGuid } from "../fable_modules/fable-library-js.4.27.0/Guid.js";
import { tryParse, minValue, utcNow } from "../fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { uncurry2, comparePrimitives } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { empty as empty_2, singleton, append, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { toString } from "../fable_modules/fable-library-js.4.27.0/Date.js";

export class SystemSnapshot extends Record {
    constructor(Os, AppVersion, HostHealthy, OllamaReachable, WorkerReachable) {
        super();
        this.Os = Os;
        this.AppVersion = AppVersion;
        this.HostHealthy = HostHealthy;
        this.OllamaReachable = OllamaReachable;
        this.WorkerReachable = WorkerReachable;
    }
}

export function SystemSnapshot_$reflection() {
    return record_type("LMVideoStudio.Domain.ErrorReport.SystemSnapshot", [], SystemSnapshot, () => [["Os", string_type], ["AppVersion", string_type], ["HostHealthy", option_type(bool_type)], ["OllamaReachable", option_type(bool_type)], ["WorkerReachable", option_type(bool_type)]]);
}

export class ErrorReport extends Record {
    constructor(Id, Timestamp, Source, Severity, Message, Stack, Context, System, ActivityTail, UserConsented) {
        super();
        this.Id = Id;
        this.Timestamp = Timestamp;
        this.Source = Source;
        this.Severity = Severity;
        this.Message = Message;
        this.Stack = Stack;
        this.Context = Context;
        this.System = System;
        this.ActivityTail = ActivityTail;
        this.UserConsented = UserConsented;
    }
}

export function ErrorReport_$reflection() {
    return record_type("LMVideoStudio.Domain.ErrorReport.ErrorReport", [], ErrorReport, () => [["Id", class_type("System.Guid")], ["Timestamp", class_type("System.DateTimeOffset")], ["Source", string_type], ["Severity", string_type], ["Message", string_type], ["Stack", option_type(string_type)], ["Context", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, string_type])], ["System", option_type(SystemSnapshot_$reflection())], ["ActivityTail", list_type(string_type)], ["UserConsented", bool_type]]);
}

export const appVersion = "0.1.0";

const maxFieldLength = 4000;

const maxActivityLines = 20;

const secretPatterns = [/api[_-]?key\s*[:=]\s*\S+/gui, /bearer\s+\S+/gui, /authorization\s*[:=]\s*\S+/gui, /password\s*[:=]\s*\S+/gui, /secret\s*[:=]\s*\S+/gui, /token\s*[:=]\s*\S+/gui];

const projectPathPattern = /(projects[\/\\][^\/\\]+[\/\\].+)/gui;

export function truncate(maxLen, value) {
    if (isNullOrEmpty(value)) {
        return value;
    }
    else if (value.length <= maxLen) {
        return value;
    }
    else {
        return substring(value, 0, maxLen) + "…";
    }
}

export function redactSecrets(text) {
    if (isNullOrEmpty(text)) {
        return text;
    }
    else {
        return fold((acc, pattern) => replace(pattern, acc, "[redacted]"), text, secretPatterns);
    }
}

export function redactProjectPaths(text) {
    if (isNullOrEmpty(text)) {
        return text;
    }
    else {
        return replace(projectPathPattern, text, "[project-path]");
    }
}

export function sanitizeText(text) {
    return truncate(maxFieldLength, redactProjectPaths(redactSecrets(text)));
}

export function sanitizeContext(ctx) {
    return filter((k, _arg_1) => {
        const key = k.toLowerCase();
        return !((((((((key.indexOf("apikey") >= 0) ? true : (key.indexOf("api_key") >= 0)) ? true : (key.indexOf("password") >= 0)) ? true : (key.indexOf("secret") >= 0)) ? true : (key.indexOf("token") >= 0)) ? true : (key.indexOf("authorization") >= 0)) ? true : (key.indexOf("projectjson") >= 0)) ? true : (key.indexOf("project_json") >= 0));
    }, map((_arg, v) => sanitizeText(v), ctx));
}

export function sanitize(report) {
    return new ErrorReport(report.Id, report.Timestamp, report.Source, report.Severity, sanitizeText(report.Message), map_1(sanitizeText, report.Stack), sanitizeContext(report.Context), report.System, truncate_1(maxActivityLines, map_2(sanitizeText, report.ActivityTail)), report.UserConsented);
}

export function validate(report) {
    if (isNullOrWhiteSpace(report.Message)) {
        return new FSharpResult$2(1, ["message is required"]);
    }
    else if (report.Message.length > maxFieldLength) {
        return new FSharpResult$2(1, ["message too long"]);
    }
    else if (defaultArg(map_1((s) => (s.length > maxFieldLength), report.Stack), false)) {
        return new FSharpResult$2(1, ["stack too long"]);
    }
    else if (length(report.ActivityTail) > maxActivityLines) {
        return new FSharpResult$2(1, ["activity tail too long"]);
    }
    else {
        return new FSharpResult$2(0, [report]);
    }
}

export function create(source, severity, message, stack, context, systemSnapshot, activityTail, userConsented) {
    return validate(sanitize(new ErrorReport(newGuid(), utcNow(), source, severity, message, stack, defaultArg(context, empty({
        Compare: comparePrimitives,
    })), systemSnapshot, defaultArg(activityTail, empty_1()), userConsented)));
}

function encodeSystemSnapshot(s) {
    return Thoth_Json_Net_Encode_object(toList(delay(() => append(singleton(["os", Thoth_Json_Net_Encode_string(s.Os)]), delay(() => append(singleton(["appVersion", Thoth_Json_Net_Encode_string(s.AppVersion)]), delay(() => append((s.HostHealthy != null) ? singleton(["hostHealthy", Thoth_Json_Net_Encode_bool(value_5(s.HostHealthy))]) : empty_2(), delay(() => append((s.OllamaReachable != null) ? singleton(["ollamaReachable", Thoth_Json_Net_Encode_bool(value_5(s.OllamaReachable))]) : empty_2(), delay(() => ((s.WorkerReachable != null) ? singleton(["workerReachable", Thoth_Json_Net_Encode_bool(value_5(s.WorkerReachable))]) : empty_2()))))))))))));
}

const systemSnapshotDecoder = (path_5) => ((v) => Thoth_Json_Net_Decode_object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4;
    return new SystemSnapshot((objectArg = get$.Required, objectArg.Field("os", Thoth_Json_Net_Decode_string)), (objectArg_1 = get$.Required, objectArg_1.Field("appVersion", Thoth_Json_Net_Decode_string)), (objectArg_2 = get$.Optional, objectArg_2.Field("hostHealthy", Thoth_Json_Net_Decode_bool)), (objectArg_3 = get$.Optional, objectArg_3.Field("ollamaReachable", Thoth_Json_Net_Decode_bool)), (objectArg_4 = get$.Optional, objectArg_4.Field("workerReachable", Thoth_Json_Net_Decode_bool)));
}, path_5, v));

export function encode(report) {
    return Thoth_Json_Net_Encode_object(toList(delay(() => append(singleton(["id", Thoth_Json_Net_Encode_guid(report.Id)]), delay(() => append(singleton(["timestamp", Thoth_Json_Net_Encode_string(toString(report.Timestamp, "o"))]), delay(() => append(singleton(["source", Thoth_Json_Net_Encode_string(report.Source)]), delay(() => append(singleton(["severity", Thoth_Json_Net_Encode_string(report.Severity)]), delay(() => append(singleton(["message", Thoth_Json_Net_Encode_string(report.Message)]), delay(() => append((report.Stack != null) ? singleton(["stack", Thoth_Json_Net_Encode_string(value_5(report.Stack))]) : empty_2(), delay(() => append(!isEmpty(report.Context) ? singleton(["context", Thoth_Json_Net_Encode_object(map_2((tupledArg) => [tupledArg[0], Thoth_Json_Net_Encode_string(tupledArg[1])], toList_1(report.Context)))]) : empty_2(), delay(() => append((report.System != null) ? singleton(["system", encodeSystemSnapshot(value_5(report.System))]) : empty_2(), delay(() => append(!isEmpty_1(report.ActivityTail) ? singleton(["activityTail", Thoth_Json_Net_Encode_array(toArray(map_2(Thoth_Json_Net_Encode_string, report.ActivityTail)))]) : empty_2(), delay(() => singleton(["userConsented", Thoth_Json_Net_Encode_bool(report.UserConsented)]))))))))))))))))))))));
}

export const decode = (path_10) => ((v_1) => Thoth_Json_Net_Decode_object((get$) => {
    let arg_1, objectArg, objectArg_1, s, objectArg_2, matchValue, outArg, objectArg_3, objectArg_4, objectArg_5, objectArg_6, objectArg_7, objectArg_8, objectArg_9;
    const context = defaultArg((arg_1 = Thoth_Json_Net_Decode_dict(Thoth_Json_Net_Decode_string), (objectArg = get$.Optional, objectArg.Field("context", uncurry2(arg_1)))), empty({
        Compare: comparePrimitives,
    }));
    return new ErrorReport((objectArg_1 = get$.Required, objectArg_1.Field("id", Thoth_Json_Net_Decode_guid)), (s = ((objectArg_2 = get$.Required, objectArg_2.Field("timestamp", Thoth_Json_Net_Decode_string))), (matchValue = ((outArg = minValue(), [tryParse(s, new FSharpRef(() => outArg, (v) => {
        outArg = v;
    })), outArg])), matchValue[0] ? matchValue[1] : utcNow())), (objectArg_3 = get$.Required, objectArg_3.Field("source", Thoth_Json_Net_Decode_string)), (objectArg_4 = get$.Required, objectArg_4.Field("severity", Thoth_Json_Net_Decode_string)), (objectArg_5 = get$.Required, objectArg_5.Field("message", Thoth_Json_Net_Decode_string)), (objectArg_6 = get$.Optional, objectArg_6.Field("stack", Thoth_Json_Net_Decode_string)), context, (objectArg_7 = get$.Optional, objectArg_7.Field("system", uncurry2(systemSnapshotDecoder))), defaultArg((objectArg_8 = get$.Optional, objectArg_8.Field("activityTail", (path_8, value_2) => Thoth_Json_Net_Decode_list(Thoth_Json_Net_Decode_string, path_8, value_2))), empty_1()), defaultArg((objectArg_9 = get$.Optional, objectArg_9.Field("userConsented", Thoth_Json_Net_Decode_bool)), false));
}, path_10, v_1));

export function encodeToString(report) {
    return Thoth_Json_Net_Encode_toString(0, encode(report));
}

export function decodeFromString(json) {
    return Result_MapError((e) => e, Thoth_Json_Net_Decode_fromString(uncurry2(decode), json));
}

