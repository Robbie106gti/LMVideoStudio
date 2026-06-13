import { equals, uncurry2, uncurry3 } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Util.js";
import { tryParse, minValue } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/DateOffset.js";
import { FSharpRef } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Types.js";
import { SequencePresetModule_toSchemaValue, Project, StylePack, RenderDefaults, ProjectModule_defaultMockupDurationSec, SequencePresetModule_fromSchemaValue, StoryboardBlock, BlockArtifacts, BlockGeneration, BlockAudio, RenderProfile, RenderTier, TransitionSpec, TransitionEdge, MockupAudioQuality, AudioSource, BlockSource, UpscaleTier, KenBurnsMode, TransitionType } from "./Types.fs.js";
import { singleton, isEmpty, append as append_1, empty, ofArray, map, toArray } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/List.js";
import { map as map_1, toArray as toArray_1, defaultArg } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Option.js";
import { singleton as singleton_1, append, delay, toList } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Seq.js";
import { toString } from "../LMVideoStudio.Client/fable_modules/fable-library-js.4.27.0/Date.js";

const dateTimeOffsetDecoder = (path_2) => ((value) => Thoth_Json_Net_Decode_andThen(uncurry3((s) => {
    let matchValue;
    let outArg = minValue();
    matchValue = [tryParse(s, new FSharpRef(() => outArg, (v) => {
        outArg = v;
    })), outArg];
    if (matchValue[0]) {
        return (arg10$0040) => ((arg20$0040) => Thoth_Json_Net_Decode_succeed(matchValue[1], arg10$0040, arg20$0040));
    }
    else {
        return (path_1) => ((arg20$0040_1) => Thoth_Json_Net_Decode_fail(`Invalid date-time: ${s}`, path_1, arg20$0040_1));
    }
}), Thoth_Json_Net_Decode_string, path_2, value));

function transitionTypeCodec(_arg) {
    switch (_arg) {
        case "cut":
            return new TransitionType(0, []);
        case "fade":
            return new TransitionType(1, []);
        case "crossfade":
            return new TransitionType(2, []);
        case "slide_left":
            return new TransitionType(3, []);
        case "slide_right":
            return new TransitionType(4, []);
        case "dissolve":
            return new TransitionType(5, []);
        default:
            throw new Error(`Unknown transition type: ${_arg}`);
    }
}

function transitionTypeToString(_arg) {
    switch (_arg.tag) {
        case 1:
            return "fade";
        case 2:
            return "crossfade";
        case 3:
            return "slide_left";
        case 4:
            return "slide_right";
        case 5:
            return "dissolve";
        default:
            return "cut";
    }
}

function kenBurnsCodec(_arg) {
    switch (_arg) {
        case "none":
            return new KenBurnsMode(0, []);
        case "simple":
            return new KenBurnsMode(1, []);
        case "full":
            return new KenBurnsMode(2, []);
        default:
            throw new Error(`Unknown kenBurns: ${_arg}`);
    }
}

function kenBurnsToString(_arg) {
    switch (_arg.tag) {
        case 1:
            return "simple";
        case 2:
            return "full";
        default:
            return "none";
    }
}

function upscaleCodec(_arg) {
    switch (_arg) {
        case "none":
            return new UpscaleTier(0, []);
        case "2x":
            return new UpscaleTier(1, []);
        case "4x":
            return new UpscaleTier(2, []);
        default:
            throw new Error(`Unknown upscale: ${_arg}`);
    }
}

function upscaleToString(_arg) {
    switch (_arg.tag) {
        case 1:
            return "2x";
        case 2:
            return "4x";
        default:
            return "none";
    }
}

function blockSourceCodec(_arg) {
    switch (_arg) {
        case "imported":
            return new BlockSource(0, []);
        case "generated":
            return new BlockSource(1, []);
        default:
            throw new Error(`Unknown block source: ${_arg}`);
    }
}

function blockSourceToString(_arg) {
    if (_arg.tag === 1) {
        return "generated";
    }
    else {
        return "imported";
    }
}

function audioSourceCodec(_arg) {
    switch (_arg) {
        case "imported":
            return new AudioSource(1, []);
        case "generated":
            return new AudioSource(2, []);
        case "none":
            return new AudioSource(0, []);
        default:
            throw new Error(`Unknown audio source: ${_arg}`);
    }
}

function audioSourceToString(_arg) {
    switch (_arg.tag) {
        case 2:
            return "generated";
        case 0:
            return "none";
        default:
            return "imported";
    }
}

function mockupQualityCodec(_arg) {
    switch (_arg) {
        case "rough":
            return new MockupAudioQuality(0, []);
        case "full":
            return new MockupAudioQuality(1, []);
        default:
            throw new Error(`Unknown mockupQuality: ${_arg}`);
    }
}

function mockupQualityToString(_arg) {
    if (_arg.tag === 1) {
        return "full";
    }
    else {
        return "rough";
    }
}

function encodeStringList(items) {
    return Thoth_Json_Net_Encode_array(toArray(map(Thoth_Json_Net_Encode_string, items)));
}

export const transitionEdgeDecoder = (path_2) => ((v) => Thoth_Json_Net_Decode_object((get$) => {
    let objectArg, objectArg_1;
    return new TransitionEdge((objectArg = get$.Required, objectArg.Field("type", (path_1, value) => Thoth_Json_Net_Decode_map(transitionTypeCodec, Thoth_Json_Net_Decode_string, path_1, value))), defaultArg((objectArg_1 = get$.Optional, objectArg_1.Field("durationMs", uncurry2(Thoth_Json_Net_Decode_int))), 300));
}, path_2, v));

export function transitionEdgeEncoder(edge) {
    return Thoth_Json_Net_Encode_object(ofArray([["type", Thoth_Json_Net_Encode_string(transitionTypeToString(edge.Type))], ["durationMs", Thoth_Json_Net_Encode_int(edge.DurationMs)]]));
}

export const transitionSpecDecoder = (path) => ((v) => Thoth_Json_Net_Decode_object((get$) => {
    let objectArg, objectArg_1, objectArg_2;
    return new TransitionSpec((objectArg = get$.Optional, objectArg.Field("in", uncurry2(transitionEdgeDecoder))), (objectArg_1 = get$.Optional, objectArg_1.Field("out", uncurry2(transitionEdgeDecoder))), (objectArg_2 = get$.Optional, objectArg_2.Field("toNext", uncurry2(transitionEdgeDecoder))));
}, path, v));

export function transitionSpecEncoder(spec) {
    return Thoth_Json_Net_Encode_object(toList(delay(() => append(ofArray(toArray_1(map_1((e) => ["in", transitionEdgeEncoder(e)], spec.InEdge))), delay(() => append(ofArray(toArray_1(map_1((e_1) => ["out", transitionEdgeEncoder(e_1)], spec.OutEdge))), delay(() => ofArray(toArray_1(map_1((e_2) => ["toNext", transitionEdgeEncoder(e_2)], spec.ToNext))))))))));
}

export function renderProfileDecoder(tier) {
    return (path_5) => ((v) => Thoth_Json_Net_Decode_object((get$) => {
        let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4;
        return new RenderProfile(tier, defaultArg((objectArg = get$.Optional, objectArg.Field("width", uncurry2(Thoth_Json_Net_Decode_int))), equals(tier, new RenderTier(0, [])) ? 640 : 1920), defaultArg((objectArg_1 = get$.Optional, objectArg_1.Field("height", uncurry2(Thoth_Json_Net_Decode_int))), equals(tier, new RenderTier(0, [])) ? 360 : 1080), defaultArg((objectArg_2 = get$.Optional, objectArg_2.Field("kenBurns", (path_1, value_2) => Thoth_Json_Net_Decode_map(kenBurnsCodec, Thoth_Json_Net_Decode_string, path_1, value_2))), equals(tier, new RenderTier(0, [])) ? (new KenBurnsMode(1, [])) : (new KenBurnsMode(2, []))), defaultArg((objectArg_3 = get$.Optional, objectArg_3.Field("upscale", (path_3, value_4) => Thoth_Json_Net_Decode_map(upscaleCodec, Thoth_Json_Net_Decode_string, path_3, value_4))), equals(tier, new RenderTier(0, [])) ? (new UpscaleTier(0, [])) : (new UpscaleTier(1, []))), defaultArg((objectArg_4 = get$.Optional, objectArg_4.Field("useComfyClip", Thoth_Json_Net_Decode_bool)), false));
    }, path_5, v));
}

export function renderProfileEncoder(profile) {
    return Thoth_Json_Net_Encode_object(ofArray([["tier", Thoth_Json_Net_Encode_string(equals(profile.Tier, new RenderTier(0, [])) ? "mockup" : "bake")], ["width", Thoth_Json_Net_Encode_int(profile.Width)], ["height", Thoth_Json_Net_Encode_int(profile.Height)], ["kenBurns", Thoth_Json_Net_Encode_string(kenBurnsToString(profile.KenBurns))], ["upscale", Thoth_Json_Net_Encode_string(upscaleToString(profile.Upscale))], ["useComfyClip", Thoth_Json_Net_Encode_bool(profile.UseComfyClip)]]));
}

export const blockDecoder = (path_23) => ((v_3) => Thoth_Json_Net_Decode_object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5, objectArg_6, objectArg_7, objectArg_8, objectArg_9, objectArg_10, objectArg_11, objectArg_12, objectArg_16, objectArg_19;
    return new StoryboardBlock((objectArg = get$.Required, objectArg.Field("id", Thoth_Json_Net_Decode_guid)), (objectArg_1 = get$.Required, objectArg_1.Field("order", uncurry2(Thoth_Json_Net_Decode_int))), (objectArg_2 = get$.Optional, objectArg_2.Field("title", Thoth_Json_Net_Decode_string)), (objectArg_3 = get$.Required, objectArg_3.Field("source", (path_3, value_1) => Thoth_Json_Net_Decode_map(blockSourceCodec, Thoth_Json_Net_Decode_string, path_3, value_1))), (objectArg_4 = get$.Optional, objectArg_4.Field("thumbnailPath", Thoth_Json_Net_Decode_string)), (objectArg_5 = get$.Optional, objectArg_5.Field("imagePrompt", Thoth_Json_Net_Decode_string)), (objectArg_6 = get$.Optional, objectArg_6.Field("voiceoverScript", Thoth_Json_Net_Decode_string)), (objectArg_7 = get$.Optional, objectArg_7.Field("directorNotes", Thoth_Json_Net_Decode_string)), defaultArg((objectArg_8 = get$.Optional, objectArg_8.Field("moodTags", (path_9, value_2) => Thoth_Json_Net_Decode_list(Thoth_Json_Net_Decode_string, path_9, value_2))), empty()), (objectArg_9 = get$.Optional, objectArg_9.Field("mockupDurationSec", Thoth_Json_Net_Decode_float)), (objectArg_10 = get$.Optional, objectArg_10.Field("bakeDurationSec", Thoth_Json_Net_Decode_float)), (objectArg_11 = get$.Optional, objectArg_11.Field("transitions", uncurry2(transitionSpecDecoder))), (objectArg_12 = get$.Optional, objectArg_12.Field("audio", (path_17, v) => Thoth_Json_Net_Decode_object((g) => {
        let objectArg_13, objectArg_14, objectArg_15;
        return new BlockAudio((objectArg_13 = g.Optional, objectArg_13.Field("path", Thoth_Json_Net_Decode_string)), defaultArg((objectArg_14 = g.Optional, objectArg_14.Field("source", (path_14, value_4) => Thoth_Json_Net_Decode_map(audioSourceCodec, Thoth_Json_Net_Decode_string, path_14, value_4))), new AudioSource(0, [])), defaultArg((objectArg_15 = g.Optional, objectArg_15.Field("mockupQuality", (path_16, value_6) => Thoth_Json_Net_Decode_map(mockupQualityCodec, Thoth_Json_Net_Decode_string, path_16, value_6))), new MockupAudioQuality(0, [])));
    }, path_17, v))), (objectArg_16 = get$.Optional, objectArg_16.Field("generation", (path_19, v_1) => Thoth_Json_Net_Decode_object((g_1) => {
        let objectArg_17, objectArg_18;
        return new BlockGeneration((objectArg_17 = g_1.Optional, objectArg_17.Field("seed", uncurry2(Thoth_Json_Net_Decode_int))), (objectArg_18 = g_1.Optional, objectArg_18.Field("referenceAssetPath", Thoth_Json_Net_Decode_string)));
    }, path_19, v_1))), (objectArg_19 = get$.Optional, objectArg_19.Field("artifacts", (path_22, v_2) => Thoth_Json_Net_Decode_object((g_2) => {
        let objectArg_20, objectArg_21;
        return new BlockArtifacts((objectArg_20 = g_2.Optional, objectArg_20.Field("mockupVideoPath", Thoth_Json_Net_Decode_string)), (objectArg_21 = g_2.Optional, objectArg_21.Field("bakeVideoPath", Thoth_Json_Net_Decode_string)));
    }, path_22, v_2))));
}, path_23, v_3));

export function blockEncoder(block) {
    const optional = (name, value) => ofArray(toArray_1(map_1((v) => [name, v], value)));
    return Thoth_Json_Net_Encode_object(append_1(ofArray([["id", Thoth_Json_Net_Encode_guid(block.Id)], ["order", Thoth_Json_Net_Encode_int(block.Order)], ["source", Thoth_Json_Net_Encode_string(blockSourceToString(block.Source))]]), append_1(optional("title", map_1(Thoth_Json_Net_Encode_string, block.Title)), append_1(optional("thumbnailPath", map_1(Thoth_Json_Net_Encode_string, block.ThumbnailPath)), append_1(optional("imagePrompt", map_1(Thoth_Json_Net_Encode_string, block.ImagePrompt)), append_1(optional("voiceoverScript", map_1(Thoth_Json_Net_Encode_string, block.VoiceoverScript)), append_1(optional("directorNotes", map_1(Thoth_Json_Net_Encode_string, block.DirectorNotes)), append_1(isEmpty(block.MoodTags) ? empty() : singleton(["moodTags", encodeStringList(block.MoodTags)]), append_1(optional("mockupDurationSec", map_1(Thoth_Json_Net_Encode_float, block.MockupDurationSec)), append_1(optional("bakeDurationSec", map_1(Thoth_Json_Net_Encode_float, block.BakeDurationSec)), append_1(optional("transitions", map_1(transitionSpecEncoder, block.Transitions)), append_1(optional("audio", map_1((a) => Thoth_Json_Net_Encode_object(toList(delay(() => append(optional("path", map_1(Thoth_Json_Net_Encode_string, a.Path)), delay(() => append(singleton_1(["source", Thoth_Json_Net_Encode_string(audioSourceToString(a.Source))]), delay(() => singleton_1(["mockupQuality", Thoth_Json_Net_Encode_string(mockupQualityToString(a.MockupQuality))])))))))), block.Audio)), append_1(optional("generation", map_1((g) => Thoth_Json_Net_Encode_object(toList(delay(() => append(optional("seed", map_1(Thoth_Json_Net_Encode_int, g.Seed)), delay(() => optional("referenceAssetPath", map_1(Thoth_Json_Net_Encode_string, g.ReferenceAssetPath))))))), block.Generation)), optional("artifacts", map_1((a_1) => Thoth_Json_Net_Encode_object(toList(delay(() => append(optional("mockupVideoPath", map_1(Thoth_Json_Net_Encode_string, a_1.MockupVideoPath)), delay(() => optional("bakeVideoPath", map_1(Thoth_Json_Net_Encode_string, a_1.BakeVideoPath))))))), block.Artifacts)))))))))))))));
}

function encodeBlockList(blocks) {
    return Thoth_Json_Net_Encode_array(toArray(map(blockEncoder, blocks)));
}

export const projectDecoder = (path_12) => ((v_2) => Thoth_Json_Net_Decode_object((get$) => {
    let objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5, objectArg_6, objectArg_7, objectArg_8, objectArg_11, objectArg_15, objectArg_16;
    let sequencePresetRaw;
    const objectArg = get$.Required;
    sequencePresetRaw = objectArg.Field("sequencePreset", Thoth_Json_Net_Decode_string);
    let sequencePreset;
    const matchValue = SequencePresetModule_fromSchemaValue(sequencePresetRaw);
    if (matchValue == null) {
        throw new Error(`Unknown sequencePreset: ${sequencePresetRaw}`);
    }
    else {
        sequencePreset = matchValue;
    }
    return new Project((objectArg_1 = get$.Required, objectArg_1.Field("schemaVersion", uncurry2(Thoth_Json_Net_Decode_int))), (objectArg_2 = get$.Required, objectArg_2.Field("id", Thoth_Json_Net_Decode_guid)), (objectArg_3 = get$.Required, objectArg_3.Field("name", Thoth_Json_Net_Decode_string)), (objectArg_4 = get$.Optional, objectArg_4.Field("createdAt", uncurry2(dateTimeOffsetDecoder))), (objectArg_5 = get$.Optional, objectArg_5.Field("updatedAt", uncurry2(dateTimeOffsetDecoder))), (objectArg_6 = get$.Optional, objectArg_6.Field("brief", Thoth_Json_Net_Decode_string)), sequencePreset, defaultArg((objectArg_7 = get$.Optional, objectArg_7.Field("defaultMockupDurationSec", Thoth_Json_Net_Decode_float)), ProjectModule_defaultMockupDurationSec), (objectArg_8 = get$.Required, objectArg_8.Field("renderDefaults", (path_5, v) => Thoth_Json_Net_Decode_object((g) => {
        let arg_19, objectArg_9, arg_21, objectArg_10;
        return new RenderDefaults((arg_19 = renderProfileDecoder(new RenderTier(0, [])), (objectArg_9 = g.Required, objectArg_9.Field("mockup", uncurry2(arg_19)))), (arg_21 = renderProfileDecoder(new RenderTier(1, [])), (objectArg_10 = g.Required, objectArg_10.Field("bake", uncurry2(arg_21)))));
    }, path_5, v))), (objectArg_11 = get$.Optional, objectArg_11.Field("stylePack", (path_10, v_1) => Thoth_Json_Net_Decode_object((g_1) => {
        let objectArg_12, objectArg_13, objectArg_14;
        return new StylePack(defaultArg((objectArg_12 = g_1.Optional, objectArg_12.Field("dominantColors", (path_7, value_1) => Thoth_Json_Net_Decode_list(Thoth_Json_Net_Decode_string, path_7, value_1))), empty()), (objectArg_13 = g_1.Optional, objectArg_13.Field("aspectRatio", Thoth_Json_Net_Decode_string)), (objectArg_14 = g_1.Optional, objectArg_14.Field("notes", Thoth_Json_Net_Decode_string)));
    }, path_10, v_1))), defaultArg((objectArg_15 = get$.Optional, objectArg_15.Field("blocks", (path_11, value_3) => Thoth_Json_Net_Decode_list(uncurry2(blockDecoder), path_11, value_3))), empty()), (objectArg_16 = get$.Optional, objectArg_16.Field("transitionsDefault", uncurry2(transitionSpecDecoder))));
}, path_12, v_2));

export function projectEncoder(project) {
    const optional = (name, value) => ofArray(toArray_1(map_1((v) => [name, v], value)));
    return Thoth_Json_Net_Encode_object(append_1(ofArray([["schemaVersion", Thoth_Json_Net_Encode_int(project.SchemaVersion)], ["id", Thoth_Json_Net_Encode_guid(project.Id)], ["name", Thoth_Json_Net_Encode_string(project.Name)], ["sequencePreset", Thoth_Json_Net_Encode_string(SequencePresetModule_toSchemaValue(project.SequencePreset))], ["defaultMockupDurationSec", Thoth_Json_Net_Encode_float(project.DefaultMockupDurationSec)], ["renderDefaults", Thoth_Json_Net_Encode_object(ofArray([["mockup", renderProfileEncoder(project.RenderDefaults.Mockup)], ["bake", renderProfileEncoder(project.RenderDefaults.Bake)]]))], ["blocks", encodeBlockList(project.Blocks)]]), append_1(optional("createdAt", map_1((d) => Thoth_Json_Net_Encode_string(toString(d, "O")), project.CreatedAt)), append_1(optional("updatedAt", map_1((d_1) => Thoth_Json_Net_Encode_string(toString(d_1, "O")), project.UpdatedAt)), append_1(optional("brief", map_1(Thoth_Json_Net_Encode_string, project.Brief)), append_1(optional("stylePack", map_1((sp) => Thoth_Json_Net_Encode_object(toList(delay(() => append(isEmpty(sp.DominantColors) ? empty() : singleton(["dominantColors", encodeStringList(sp.DominantColors)]), delay(() => append(optional("aspectRatio", map_1(Thoth_Json_Net_Encode_string, sp.AspectRatio)), delay(() => optional("notes", map_1(Thoth_Json_Net_Encode_string, sp.Notes))))))))), project.StylePack)), optional("transitionsDefault", map_1(transitionSpecEncoder, project.TransitionsDefault))))))));
}

export function encodeProject(project) {
    return Thoth_Json_Net_Encode_toString(2, projectEncoder(project));
}

export function decodeProject(json) {
    return Thoth_Json_Net_Decode_fromString(uncurry2(projectDecoder), json);
}

export function decodeBlocks(json) {
    return Thoth_Json_Net_Decode_fromString((path, value) => Thoth_Json_Net_Decode_list(uncurry2(blockDecoder), path, value), json);
}

