import { SequencePresetModule_toSchemaValue, Project, TransitionSpecModule_defaultMockup, RenderDefaults, RenderProfileModule_defaultBake, RenderProfileModule_defaultMockup, ProjectModule_defaultMockupDurationSec, SequencePreset, SequencePresetModule_fromSchemaValue, StoryboardBlock, BlockGeneration, BlockSource, TransitionType } from "./LMVideoStudio.Domain/Types.js";
import { fromString, float, list as list_2, map, string, int, guid, object } from "./fable_modules/Thoth.Json.10.4.1/Decode.fs.js";
import { equals, uncurry2 } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { map as map_1, filter, defaultArg } from "./fable_modules/fable-library-js.4.27.0/Option.js";
import { map as map_2, toArray, singleton as singleton_1, isEmpty, empty } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { toString, guid as guid_1, object as object_1 } from "./fable_modules/Thoth.Json.10.4.1/Encode.fs.js";
import { singleton, append, delay, toList } from "./fable_modules/fable-library-js.4.27.0/Seq.js";

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
            throw new Error(`Unknown transition: ${_arg}`);
    }
}

function blockSourceCodec(_arg) {
    switch (_arg) {
        case "imported":
            return new BlockSource(0, []);
        case "generated":
            return new BlockSource(1, []);
        default:
            throw new Error(`Unknown source: ${_arg}`);
    }
}

const blockDecoder = (path_16) => ((v_1) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5, objectArg_6, objectArg_7, objectArg_8, objectArg_9, objectArg_10, objectArg_11;
    return new StoryboardBlock((objectArg = get$.Required, objectArg.Field("id", guid)), (objectArg_1 = get$.Required, objectArg_1.Field("order", uncurry2(int))), (objectArg_2 = get$.Optional, objectArg_2.Field("title", string)), (objectArg_3 = get$.Required, objectArg_3.Field("source", (path_3, value_3) => map(blockSourceCodec, string, path_3, value_3))), (objectArg_4 = get$.Optional, objectArg_4.Field("thumbnailPath", string)), (objectArg_5 = get$.Optional, objectArg_5.Field("imagePrompt", string)), (objectArg_6 = get$.Optional, objectArg_6.Field("voiceoverScript", string)), (objectArg_7 = get$.Optional, objectArg_7.Field("directorNotes", string)), defaultArg((objectArg_8 = get$.Optional, objectArg_8.Field("moodTags", (path_9, value_9) => list_2(string, path_9, value_9))), empty()), (objectArg_9 = get$.Optional, objectArg_9.Field("mockupDurationSec", float)), (objectArg_10 = get$.Optional, objectArg_10.Field("bakeDurationSec", float)), undefined, undefined, (objectArg_11 = get$.Optional, objectArg_11.Field("generation", (path_15, v) => object((g) => {
        let objectArg_12, objectArg_13, objectArg_14;
        return new BlockGeneration((objectArg_12 = g.Optional, objectArg_12.Field("seed", uncurry2(int))), (objectArg_13 = g.Optional, objectArg_13.Field("referenceAssetPath", string)), filter((arg_30) => !isEmpty(arg_30), (objectArg_14 = g.Optional, objectArg_14.Field("thumbnailVariants", (path_14, value_15) => list_2(string, path_14, value_15)))));
    }, path_15, v))), undefined);
}, path_16, v_1));

export const projectDecoder = (path_6) => ((v) => object((get$) => {
    let objectArg, objectArg_1, objectArg_2, objectArg_3, objectArg_4, objectArg_5, objectArg_6;
    const preset = defaultArg(SequencePresetModule_fromSchemaValue((objectArg = get$.Required, objectArg.Field("sequencePreset", string))), new SequencePreset(0, []));
    return new Project((objectArg_1 = get$.Required, objectArg_1.Field("schemaVersion", uncurry2(int))), (objectArg_2 = get$.Required, objectArg_2.Field("id", guid)), (objectArg_3 = get$.Required, objectArg_3.Field("name", string)), undefined, undefined, (objectArg_4 = get$.Optional, objectArg_4.Field("brief", string)), preset, defaultArg((objectArg_5 = get$.Optional, objectArg_5.Field("defaultMockupDurationSec", float)), ProjectModule_defaultMockupDurationSec), new RenderDefaults(RenderProfileModule_defaultMockup, RenderProfileModule_defaultBake), undefined, defaultArg((objectArg_6 = get$.Optional, objectArg_6.Field("blocks", (path_5, value_6) => list_2(uncurry2(blockDecoder), path_5, value_6))), empty()), TransitionSpecModule_defaultMockup);
}, path_6, v));

export function blockEncoder(block) {
    return object_1(toList(delay(() => append(singleton(["id", guid_1(block.Id)]), delay(() => append(singleton(["order", block.Order]), delay(() => append(singleton(["source", equals(block.Source, new BlockSource(0, [])) ? "imported" : "generated"]), delay(() => append(defaultArg(map_1((t) => singleton_1(["title", t]), block.Title), empty()), delay(() => defaultArg(map_1((p) => singleton_1(["thumbnailPath", p]), block.ThumbnailPath), empty()))))))))))));
}

export function encodeProject(project) {
    return toString(2, object_1([["schemaVersion", project.SchemaVersion], ["id", guid_1(project.Id)], ["name", project.Name], ["sequencePreset", SequencePresetModule_toSchemaValue(project.SequencePreset)], ["defaultMockupDurationSec", project.DefaultMockupDurationSec], ["renderDefaults", object_1([["mockup", object_1([["tier", "mockup"], ["width", project.RenderDefaults.Mockup.Width], ["height", project.RenderDefaults.Mockup.Height]])], ["bake", object_1([["tier", "bake"], ["width", project.RenderDefaults.Bake.Width], ["height", project.RenderDefaults.Bake.Height]])]])], ["blocks", toArray(map_2(blockEncoder, project.Blocks))]]));
}

export function decodeProject(json) {
    return fromString(uncurry2(projectDecoder), json);
}

