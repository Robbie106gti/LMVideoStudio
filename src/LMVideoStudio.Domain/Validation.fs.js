import { Union, Record } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Types.js";
import { union_type, list_type, record_type, string_type } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Reflection.js";
import { isEmpty, collect, append, singleton, empty } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/List.js";
import { append as append_1, delay, toList } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Seq.js";
import { isNullOrWhiteSpace } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/String.js";
import { RenderTier, ProjectModule_mockupDurationMaxSec, ProjectModule_mockupDurationMinSec } from "./Types.fs.js";
import { equals } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Util.js";
import { map, defaultArg } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Option.js";

export class ValidationIssue extends Record {
    constructor(Path, Message) {
        super();
        this.Path = Path;
        this.Message = Message;
    }
}

export function ValidationIssue_$reflection() {
    return record_type("LMVideoStudio.Domain.ValidationIssue", [], ValidationIssue, () => [["Path", string_type], ["Message", string_type]]);
}

export class ValidationResult extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Valid", "Invalid"];
    }
}

export function ValidationResult_$reflection() {
    return union_type("LMVideoStudio.Domain.ValidationResult", [], ValidationResult, () => [[], [["Item", list_type(ValidationIssue_$reflection())]]]);
}

function Validation_issue(path, message) {
    return new ValidationIssue(path, message);
}

function Validation_require(path, condition, message) {
    if (condition) {
        return empty();
    }
    else {
        return singleton(Validation_issue(path, message));
    }
}

export function Validation_validateProject(project) {
    const matchValue = append(toList(delay(() => append_1(Validation_require("schemaVersion", project.SchemaVersion === 1, "schemaVersion must be 1"), delay(() => append_1(Validation_require("name", !isNullOrWhiteSpace(project.Name), "name is required"), delay(() => append_1(Validation_require("defaultMockupDurationSec", (project.DefaultMockupDurationSec >= ProjectModule_mockupDurationMinSec) && (project.DefaultMockupDurationSec <= ProjectModule_mockupDurationMaxSec), `defaultMockupDurationSec must be between ${ProjectModule_mockupDurationMinSec} and ${ProjectModule_mockupDurationMaxSec}`), delay(() => append_1(Validation_require("renderDefaults.mockup.tier", equals(project.RenderDefaults.Mockup.Tier, new RenderTier(0, [])), "renderDefaults.mockup.tier must be mockup"), delay(() => Validation_require("renderDefaults.bake.tier", equals(project.RenderDefaults.Bake.Tier, new RenderTier(1, [])), "renderDefaults.bake.tier must be bake"))))))))))), collect((b) => toList(delay(() => append_1(Validation_require(`blocks[${b.Id}].order`, b.Order >= 0, "order must be >= 0"), delay(() => Validation_require(`blocks[${b.Id}].mockupDurationSec`, defaultArg(map((d) => {
        if (d >= ProjectModule_mockupDurationMinSec) {
            return d <= ProjectModule_mockupDurationMaxSec;
        }
        else {
            return false;
        }
    }, b.MockupDurationSec), true), `mockupDurationSec must be between ${ProjectModule_mockupDurationMinSec} and ${ProjectModule_mockupDurationMaxSec} when set`))))), project.Blocks));
    if (isEmpty(matchValue)) {
        return new ValidationResult(0, []);
    }
    else {
        return new ValidationResult(1, [matchValue]);
    }
}

