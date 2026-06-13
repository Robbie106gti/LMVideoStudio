import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { float64_type, class_type, list_type, string_type, option_type, record_type, bool_type, int32_type, union_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { utcNow } from "../fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { newGuid } from "../fable_modules/fable-library-js.4.27.0/Guid.js";
import { tryFind as tryFind_1, choose, mapIndexed, map, empty } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { tryFind, ofList } from "../fable_modules/fable-library-js.4.27.0/Map.js";
import { comparePrimitives } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { bind, orElse, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";

export class SequencePreset extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Preset1080p24", "Preset1080p25", "Preset1080p30", "Preset4k24", "Preset1080x1920Vertical", "Preset1080Square"];
    }
}

export function SequencePreset_$reflection() {
    return union_type("LMVideoStudio.Domain.SequencePreset", [], SequencePreset, () => [[], [], [], [], [], []]);
}

export function SequencePresetModule_toSchemaValue(_arg) {
    switch (_arg.tag) {
        case 1:
            return "1080p25";
        case 2:
            return "1080p30";
        case 3:
            return "4k24";
        case 4:
            return "1080x1920_vertical";
        case 5:
            return "1080_square";
        default:
            return "1080p24";
    }
}

export function SequencePresetModule_fromSchemaValue(_arg) {
    switch (_arg) {
        case "1080p24":
            return new SequencePreset(0, []);
        case "1080p25":
            return new SequencePreset(1, []);
        case "1080p30":
            return new SequencePreset(2, []);
        case "4k24":
            return new SequencePreset(3, []);
        case "1080x1920_vertical":
            return new SequencePreset(4, []);
        case "1080_square":
            return new SequencePreset(5, []);
        default:
            return undefined;
    }
}

export class RenderTier extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Mockup", "Bake"];
    }
}

export function RenderTier_$reflection() {
    return union_type("LMVideoStudio.Domain.RenderTier", [], RenderTier, () => [[], []]);
}

export class KenBurnsMode extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Disabled", "Simple", "FullKenBurns"];
    }
}

export function KenBurnsMode_$reflection() {
    return union_type("LMVideoStudio.Domain.KenBurnsMode", [], KenBurnsMode, () => [[], [], []]);
}

export class UpscaleTier extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["NoUpscale", "TwoX", "FourX"];
    }
}

export function UpscaleTier_$reflection() {
    return union_type("LMVideoStudio.Domain.UpscaleTier", [], UpscaleTier, () => [[], [], []]);
}

export class RenderProfile extends Record {
    constructor(Tier, Width, Height, KenBurns, Upscale, UseComfyClip) {
        super();
        this.Tier = Tier;
        this.Width = (Width | 0);
        this.Height = (Height | 0);
        this.KenBurns = KenBurns;
        this.Upscale = Upscale;
        this.UseComfyClip = UseComfyClip;
    }
}

export function RenderProfile_$reflection() {
    return record_type("LMVideoStudio.Domain.RenderProfile", [], RenderProfile, () => [["Tier", RenderTier_$reflection()], ["Width", int32_type], ["Height", int32_type], ["KenBurns", KenBurnsMode_$reflection()], ["Upscale", UpscaleTier_$reflection()], ["UseComfyClip", bool_type]]);
}

export const RenderProfileModule_defaultMockup = new RenderProfile(new RenderTier(0, []), 640, 360, new KenBurnsMode(1, []), new UpscaleTier(0, []), false);

export const RenderProfileModule_defaultBake = new RenderProfile(new RenderTier(1, []), 1920, 1080, new KenBurnsMode(2, []), new UpscaleTier(1, []), false);

export class TransitionType extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Cut", "Fade", "Crossfade", "SlideLeft", "SlideRight", "Dissolve"];
    }
}

export function TransitionType_$reflection() {
    return union_type("LMVideoStudio.Domain.TransitionType", [], TransitionType, () => [[], [], [], [], [], []]);
}

export class TransitionEdge extends Record {
    constructor(Type, DurationMs) {
        super();
        this.Type = Type;
        this.DurationMs = (DurationMs | 0);
    }
}

export function TransitionEdge_$reflection() {
    return record_type("LMVideoStudio.Domain.TransitionEdge", [], TransitionEdge, () => [["Type", TransitionType_$reflection()], ["DurationMs", int32_type]]);
}

export class TransitionSpec extends Record {
    constructor(InEdge, OutEdge, ToNext) {
        super();
        this.InEdge = InEdge;
        this.OutEdge = OutEdge;
        this.ToNext = ToNext;
    }
}

export function TransitionSpec_$reflection() {
    return record_type("LMVideoStudio.Domain.TransitionSpec", [], TransitionSpec, () => [["InEdge", option_type(TransitionEdge_$reflection())], ["OutEdge", option_type(TransitionEdge_$reflection())], ["ToNext", option_type(TransitionEdge_$reflection())]]);
}

export const TransitionSpecModule_defaultMockup = new TransitionSpec(undefined, undefined, new TransitionEdge(new TransitionType(2, []), 300));

export class BlockSource extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Imported", "Generated"];
    }
}

export function BlockSource_$reflection() {
    return union_type("LMVideoStudio.Domain.BlockSource", [], BlockSource, () => [[], []]);
}

export class AudioSource extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["NoAudio", "Imported", "Generated"];
    }
}

export function AudioSource_$reflection() {
    return union_type("LMVideoStudio.Domain.AudioSource", [], AudioSource, () => [[], [], []]);
}

export class MockupAudioQuality extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["Rough", "FullQuality"];
    }
}

export function MockupAudioQuality_$reflection() {
    return union_type("LMVideoStudio.Domain.MockupAudioQuality", [], MockupAudioQuality, () => [[], []]);
}

export class BlockAudio extends Record {
    constructor(Path, Source, MockupQuality) {
        super();
        this.Path = Path;
        this.Source = Source;
        this.MockupQuality = MockupQuality;
    }
}

export function BlockAudio_$reflection() {
    return record_type("LMVideoStudio.Domain.BlockAudio", [], BlockAudio, () => [["Path", option_type(string_type)], ["Source", AudioSource_$reflection()], ["MockupQuality", MockupAudioQuality_$reflection()]]);
}

export class BlockGeneration extends Record {
    constructor(Seed, ReferenceAssetPath, ThumbnailVariants) {
        super();
        this.Seed = Seed;
        this.ReferenceAssetPath = ReferenceAssetPath;
        this.ThumbnailVariants = ThumbnailVariants;
    }
}

export function BlockGeneration_$reflection() {
    return record_type("LMVideoStudio.Domain.BlockGeneration", [], BlockGeneration, () => [["Seed", option_type(int32_type)], ["ReferenceAssetPath", option_type(string_type)], ["ThumbnailVariants", option_type(list_type(string_type))]]);
}

export class BlockArtifacts extends Record {
    constructor(MockupVideoPath, BakeVideoPath, UpscaledImagePath) {
        super();
        this.MockupVideoPath = MockupVideoPath;
        this.BakeVideoPath = BakeVideoPath;
        this.UpscaledImagePath = UpscaledImagePath;
    }
}

export function BlockArtifacts_$reflection() {
    return record_type("LMVideoStudio.Domain.BlockArtifacts", [], BlockArtifacts, () => [["MockupVideoPath", option_type(string_type)], ["BakeVideoPath", option_type(string_type)], ["UpscaledImagePath", option_type(string_type)]]);
}

export class StoryboardBlock extends Record {
    constructor(Id, Order, Title, Source, ThumbnailPath, ImagePrompt, VoiceoverScript, DirectorNotes, MoodTags, MockupDurationSec, BakeDurationSec, Transitions, Audio, Generation, Artifacts) {
        super();
        this.Id = Id;
        this.Order = (Order | 0);
        this.Title = Title;
        this.Source = Source;
        this.ThumbnailPath = ThumbnailPath;
        this.ImagePrompt = ImagePrompt;
        this.VoiceoverScript = VoiceoverScript;
        this.DirectorNotes = DirectorNotes;
        this.MoodTags = MoodTags;
        this.MockupDurationSec = MockupDurationSec;
        this.BakeDurationSec = BakeDurationSec;
        this.Transitions = Transitions;
        this.Audio = Audio;
        this.Generation = Generation;
        this.Artifacts = Artifacts;
    }
}

export function StoryboardBlock_$reflection() {
    return record_type("LMVideoStudio.Domain.StoryboardBlock", [], StoryboardBlock, () => [["Id", class_type("System.Guid")], ["Order", int32_type], ["Title", option_type(string_type)], ["Source", BlockSource_$reflection()], ["ThumbnailPath", option_type(string_type)], ["ImagePrompt", option_type(string_type)], ["VoiceoverScript", option_type(string_type)], ["DirectorNotes", option_type(string_type)], ["MoodTags", list_type(string_type)], ["MockupDurationSec", option_type(float64_type)], ["BakeDurationSec", option_type(float64_type)], ["Transitions", option_type(TransitionSpec_$reflection())], ["Audio", option_type(BlockAudio_$reflection())], ["Generation", option_type(BlockGeneration_$reflection())], ["Artifacts", option_type(BlockArtifacts_$reflection())]]);
}

export class StylePack extends Record {
    constructor(DominantColors, AspectRatio, Notes) {
        super();
        this.DominantColors = DominantColors;
        this.AspectRatio = AspectRatio;
        this.Notes = Notes;
    }
}

export function StylePack_$reflection() {
    return record_type("LMVideoStudio.Domain.StylePack", [], StylePack, () => [["DominantColors", list_type(string_type)], ["AspectRatio", option_type(string_type)], ["Notes", option_type(string_type)]]);
}

export class RenderDefaults extends Record {
    constructor(Mockup, Bake) {
        super();
        this.Mockup = Mockup;
        this.Bake = Bake;
    }
}

export function RenderDefaults_$reflection() {
    return record_type("LMVideoStudio.Domain.RenderDefaults", [], RenderDefaults, () => [["Mockup", RenderProfile_$reflection()], ["Bake", RenderProfile_$reflection()]]);
}

export class Project extends Record {
    constructor(SchemaVersion, Id, Name, CreatedAt, UpdatedAt, Brief, SequencePreset, DefaultMockupDurationSec, RenderDefaults, StylePack, Blocks, TransitionsDefault) {
        super();
        this.SchemaVersion = (SchemaVersion | 0);
        this.Id = Id;
        this.Name = Name;
        this.CreatedAt = CreatedAt;
        this.UpdatedAt = UpdatedAt;
        this.Brief = Brief;
        this.SequencePreset = SequencePreset;
        this.DefaultMockupDurationSec = DefaultMockupDurationSec;
        this.RenderDefaults = RenderDefaults;
        this.StylePack = StylePack;
        this.Blocks = Blocks;
        this.TransitionsDefault = TransitionsDefault;
    }
}

export function Project_$reflection() {
    return record_type("LMVideoStudio.Domain.Project", [], Project, () => [["SchemaVersion", int32_type], ["Id", class_type("System.Guid")], ["Name", string_type], ["CreatedAt", option_type(class_type("System.DateTimeOffset"))], ["UpdatedAt", option_type(class_type("System.DateTimeOffset"))], ["Brief", option_type(string_type)], ["SequencePreset", SequencePreset_$reflection()], ["DefaultMockupDurationSec", float64_type], ["RenderDefaults", RenderDefaults_$reflection()], ["StylePack", option_type(StylePack_$reflection())], ["Blocks", list_type(StoryboardBlock_$reflection())], ["TransitionsDefault", option_type(TransitionSpec_$reflection())]]);
}

export const ProjectModule_mockupDurationMinSec = 3;

export const ProjectModule_mockupDurationMaxSec = 4;

export const ProjectModule_defaultMockupDurationSec = 3.5;

export function ProjectModule_create(name) {
    const now = utcNow();
    return new Project(1, newGuid(), name, now, now, undefined, new SequencePreset(0, []), ProjectModule_defaultMockupDurationSec, new RenderDefaults(RenderProfileModule_defaultMockup, RenderProfileModule_defaultBake), undefined, empty(), TransitionSpecModule_defaultMockup);
}

export function ProjectModule_touch(project) {
    return new Project(project.SchemaVersion, project.Id, project.Name, project.CreatedAt, utcNow(), project.Brief, project.SequencePreset, project.DefaultMockupDurationSec, project.RenderDefaults, project.StylePack, project.Blocks, project.TransitionsDefault);
}

export function ProjectModule_reorderBlocks(project, blockIds) {
    const lookup = ofList(map((b) => [b.Id, b], project.Blocks), {
        Compare: comparePrimitives,
    });
    return ProjectModule_touch(new Project(project.SchemaVersion, project.Id, project.Name, project.CreatedAt, project.UpdatedAt, project.Brief, project.SequencePreset, project.DefaultMockupDurationSec, project.RenderDefaults, project.StylePack, mapIndexed((i, b_1) => (new StoryboardBlock(b_1.Id, i, b_1.Title, b_1.Source, b_1.ThumbnailPath, b_1.ImagePrompt, b_1.VoiceoverScript, b_1.DirectorNotes, b_1.MoodTags, b_1.MockupDurationSec, b_1.BakeDurationSec, b_1.Transitions, b_1.Audio, b_1.Generation, b_1.Artifacts)), choose((id) => tryFind(id, lookup), blockIds)), project.TransitionsDefault));
}

export function ProjectModule_effectiveMockupDuration(project, block) {
    return defaultArg(block.MockupDurationSec, project.DefaultMockupDurationSec);
}

/**
 * Prefer upscaled asset for bake Ken Burns when the Host has produced one.
 */
export function ProjectModule_preferBakeImagePath(block) {
    return orElse(orElse(bind((a) => a.UpscaledImagePath, block.Artifacts), bind((g) => bind((vs) => tryFind_1((p) => (p.indexOf("upscaled") >= 0), vs), g.ThumbnailVariants), block.Generation)), block.ThumbnailPath);
}

