import { Record } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, string_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { cons, filter, append, map, empty, ofArray } from "./fable_modules/fable-library-js.4.27.0/List.js";
import { uncurry2, defaultOf } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { isNullOrWhiteSpace } from "./fable_modules/fable-library-js.4.27.0/String.js";

export class QuickButton extends Record {
    constructor(Label, Prompt) {
        super();
        this.Label = Label;
        this.Prompt = Prompt;
    }
}

export function QuickButton_$reflection() {
    return record_type("LMVideoStudio.Client.PromptQuickButtons.QuickButton", [], QuickButton, () => [["Label", string_type], ["Prompt", string_type]]);
}

const storageKey = "lmvs_prompt_quick_buttons";

export const builtIn = ofArray([new QuickButton("Establishing", "Wide establishing shot, cinematic lighting, shallow depth of field"), new QuickButton("Close-up", "Tight close-up on subject, soft bokeh background, detailed texture"), new QuickButton("Product hero", "Product hero shot on clean surface, studio lighting, brand colors"), new QuickButton("CTA end card", "Bold end-card frame with space for logo and call-to-action text")]);

const decodeButton = (path_2) => ((v) => Thoth_Json_Net_Decode_object((get$) => {
    let objectArg, objectArg_1;
    return new QuickButton((objectArg = get$.Required, objectArg.Field("label", Thoth_Json_Net_Decode_string)), (objectArg_1 = get$.Required, objectArg_1.Field("prompt", Thoth_Json_Net_Decode_string)));
}, path_2, v));

function encodeButton(b) {
    return Thoth_Json_Net_Encode_object(ofArray([["label", Thoth_Json_Net_Encode_string(b.Label)], ["prompt", Thoth_Json_Net_Encode_string(b.Prompt)]]));
}

export function loadCustom() {
    try {
        const matchValue = window.localStorage.getItem(storageKey);
        if (matchValue === defaultOf()) {
            return empty();
        }
        else if (isNullOrWhiteSpace(matchValue)) {
            return empty();
        }
        else {
            const matchValue_1 = Thoth_Json_Net_Decode_fromString((path, value) => Thoth_Json_Net_Decode_list(uncurry2(decodeButton), path, value), matchValue);
            return (matchValue_1.tag === 1) ? empty() : matchValue_1.fields[0];
        }
    }
    catch (matchValue_2) {
        return empty();
    }
}

export function saveCustom(buttons) {
    try {
        const json = Thoth_Json_Net_Encode_toString(0, Thoth_Json_Net_Encode_list(map(encodeButton, buttons)));
        window.localStorage.setItem(storageKey, json);
    }
    catch (matchValue) {
    }
}

export function loadAll() {
    return append(builtIn, loadCustom());
}

export function addCustom(labelInput, promptInput) {
    const label = labelInput.trim();
    const prompt = promptInput.trim();
    if (isNullOrWhiteSpace(label) ? true : isNullOrWhiteSpace(prompt)) {
        return loadCustom();
    }
    else {
        const updated = cons(new QuickButton(label, prompt), filter((b) => (b.Label.toLowerCase() !== label.toLowerCase()), loadCustom()));
        saveCustom(updated);
        return updated;
    }
}

export function removeCustom(labelInput) {
    const labelLower = labelInput.trim().toLowerCase();
    const updated = filter((b) => (b.Label.toLowerCase() !== labelLower), loadCustom());
    saveCustom(updated);
    return updated;
}

