import { Union, Record } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { union_type, record_type, int32_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { max, min } from "../fable_modules/fable-library-js.4.27.0/Double.js";

export const defaultInitialDelayMs = 250;

export const defaultMaxDelayMs = 2000;

export const defaultMaxAttempts = 60;

export class Config extends Record {
    constructor(MaxAttempts, InitialDelayMs, MaxDelayMs) {
        super();
        this.MaxAttempts = (MaxAttempts | 0);
        this.InitialDelayMs = (InitialDelayMs | 0);
        this.MaxDelayMs = (MaxDelayMs | 0);
    }
}

export function Config_$reflection() {
    return record_type("LMVideoStudio.Domain.HostHealthPoll.Config", [], Config, () => [["MaxAttempts", int32_type], ["InitialDelayMs", int32_type], ["MaxDelayMs", int32_type]]);
}

export class AttemptOutcome extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Success", "Retry", "Exhausted"];
    }
}

export function AttemptOutcome_$reflection() {
    return union_type("LMVideoStudio.Domain.HostHealthPoll.AttemptOutcome", [], AttemptOutcome, () => [[], [["nextDelayMs", int32_type]], []]);
}

export const defaultConfig = new Config(defaultMaxAttempts, defaultInitialDelayMs, defaultMaxDelayMs);

export function delayAfterAttempt(attempt, config) {
    return min(config.MaxDelayMs, config.InitialDelayMs + (max(0, attempt - 1) * config.InitialDelayMs));
}

export function evaluateAttempt(attempt, isHealthy, config) {
    if (isHealthy) {
        return new AttemptOutcome(0, []);
    }
    else if (attempt >= config.MaxAttempts) {
        return new AttemptOutcome(2, []);
    }
    else {
        return new AttemptOutcome(1, [delayAfterAttempt(attempt, config)]);
    }
}

