import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, class_type, union_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";

export class HardwareProfile extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Minimal", "Standard", "High"];
    }
}

export function HardwareProfile_$reflection() {
    return union_type("LMVideoStudio.Domain.HardwareProfile", [], HardwareProfile, () => [[], [], []]);
}

export const HardwareProfileModule_defaultProfile = new HardwareProfile(1, []);

export function HardwareProfileModule_vramBudgetGb(_arg) {
    switch (_arg.tag) {
        case 1:
            return 16;
        case 2:
            return 24;
        default:
            return 8;
    }
}

export function HardwareProfileModule_label(_arg) {
    switch (_arg.tag) {
        case 1:
            return "Standard (16 GB)";
        case 2:
            return "High (24 GB+)";
        default:
            return "Minimal (8 GB)";
    }
}

export class GpuJobKind extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["ImageGenerate", "ImageUpscale", "AudioGenerate", "MockupPreview", "BakeExport"];
    }
}

export function GpuJobKind_$reflection() {
    return union_type("LMVideoStudio.Domain.GpuJobKind", [], GpuJobKind, () => [[], [], [], [], []]);
}

export class GpuJobStatus extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Queued", "Running", "Completed", "Failed", "Cancelled"];
    }
}

export function GpuJobStatus_$reflection() {
    return union_type("LMVideoStudio.Domain.GpuJobStatus", [], GpuJobStatus, () => [[], [], [], [], []]);
}

export class GpuJobRequest extends Record {
    constructor(Id, Kind, Profile, EnqueuedAt) {
        super();
        this.Id = Id;
        this.Kind = Kind;
        this.Profile = Profile;
        this.EnqueuedAt = EnqueuedAt;
    }
}

export function GpuJobRequest_$reflection() {
    return record_type("LMVideoStudio.Domain.GpuJobRequest", [], GpuJobRequest, () => [["Id", class_type("System.Guid")], ["Kind", GpuJobKind_$reflection()], ["Profile", HardwareProfile_$reflection()], ["EnqueuedAt", class_type("System.DateTimeOffset")]]);
}

