import { FSharpRef, Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { option_type, record_type, class_type, string_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { installErrorHooks, getActivityTail, detectOs, appendActivityLine, writeErrorReportingConsent, readErrorReportingConsent } from "../errorReporting.js";
import { decodeFromString, encodeToString, create, SystemSnapshot, appVersion } from "./LMVideoStudio.Domain/ErrorReport.js";
import { ofArray } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { ofSeq, empty } from "./fable_modules/fable-library-js.4.27.0/Map.js";
import { comparePrimitives } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { map } from "./fable_modules/fable-library-js.4.27.0/Seq.js";
import { FSharpResult$2 } from "./fable_modules/fable-library-js.4.27.0/Result.js";

export class LastErrorSummary extends Record {
    constructor(Message, Source, Severity, Timestamp) {
        super();
        this.Message = Message;
        this.Source = Source;
        this.Severity = Severity;
        this.Timestamp = Timestamp;
    }
}

export function LastErrorSummary_$reflection() {
    return record_type("LMVideoStudio.Client.ErrorReporting.LastErrorSummary", [], LastErrorSummary, () => [["Message", string_type], ["Source", string_type], ["Severity", string_type], ["Timestamp", class_type("System.DateTimeOffset")]]);
}

export class CaptureRequest extends Record {
    constructor(Source, Severity, Message, Stack, Context) {
        super();
        this.Source = Source;
        this.Severity = Severity;
        this.Message = Message;
        this.Stack = Stack;
        this.Context = Context;
    }
}

export function CaptureRequest_$reflection() {
    return record_type("LMVideoStudio.Client.ErrorReporting.CaptureRequest", [], CaptureRequest, () => [["Source", string_type], ["Severity", string_type], ["Message", string_type], ["Stack", option_type(string_type)], ["Context", class_type("Microsoft.FSharp.Collections.FSharpMap`2", [string_type, string_type])]]);
}

export const consentKey = "lmvs_error_reporting_consent";

export function readConsent() {
    return readErrorReportingConsent();
}

export function setConsent(enabled) {
    writeErrorReportingConsent(enabled);
}

export function logActivity(line) {
    appendActivityLine(line);
}

function systemSnapshot(hostHealthy, ollamaReachable, workerReachable) {
    return new SystemSnapshot(detectOs(), appVersion, hostHealthy, ollamaReachable, workerReachable);
}

function toSummary(report) {
    return new LastErrorSummary(report.Message, report.Source, report.Severity, report.Timestamp);
}

export function buildReport(req, hostHealthy, ollamaReachable, workerReachable, userConsented) {
    return create(req.Source, req.Severity, req.Message, req.Stack, req.Context, systemSnapshot(hostHealthy, ollamaReachable, workerReachable), ofArray(getActivityTail()), userConsented);
}

export function installHooks(onCaptured) {
    installErrorHooks((raw) => {
        let message;
        try {
            message = raw.message;
        }
        catch (matchValue) {
            message = "Unknown error";
        }
        let stack;
        try {
            const s = raw.stack;
            stack = ((s == null) ? undefined : s);
        }
        catch (matchValue_1) {
            stack = undefined;
        }
        onCaptured(new CaptureRequest((() => {
            try {
                return raw.source;
            }
            catch (matchValue_2) {
                return "client";
            }
        })(), (() => {
            try {
                return raw.severity;
            }
            catch (matchValue_3) {
                return "error";
            }
        })(), message, stack, (() => {
            try {
                const ctx = raw.context;
                return (ctx == null) ? empty({
                    Compare: comparePrimitives,
                }) : ofSeq(map((k) => [k, ctx[k]], Object.keys(ctx)), {
                    Compare: comparePrimitives,
                });
            }
            catch (matchValue_4) {
                return empty({
                    Compare: comparePrimitives,
                });
            }
        })()));
    });
}

export function shouldAutoSubmit(severity, userConsented) {
    if (userConsented) {
        return true;
    }
    else {
        return severity === "fatal";
    }
}

export function encodeForSubmit(report) {
    return encodeToString(report);
}

export function decodeSummaryFromJson(json) {
    const matchValue = decodeFromString(json);
    if (matchValue.tag === 1) {
        return new FSharpResult$2(1, [matchValue.fields[0]]);
    }
    else {
        return new FSharpResult$2(0, [toSummary(matchValue.fields[0])]);
    }
}

const captureHandler = new FSharpRef(undefined);

export function setCaptureHandler(handler) {
    captureHandler.contents = handler;
}

export function tryCapture(req) {
    const matchValue = captureHandler.contents;
    if (matchValue == null) {
    }
    else {
        matchValue(req);
    }
}

