import { Union, Record } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { union_type, record_type, option_type, list_type, string_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ConnectedAccountsDto_$reflection } from "../Api.js";
import { bind, map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { map as map_1, ofArray, tryFind } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { FSharpResult$2 } from "../fable_modules/fable-library-js.4.27.0/Result.js";
import { createElement } from "react";
import { equals, createObj } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { singleton, append, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";
import { isNullOrWhiteSpace } from "../fable_modules/fable-library-js.4.27.0/String.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";

export class SharePackModel extends Record {
    constructor(OutputDir, Files, CaptionPath, CaptionText, ReadmePath, MediaBase, Uploading, UploadMessage, ConnectedAccounts) {
        super();
        this.OutputDir = OutputDir;
        this.Files = Files;
        this.CaptionPath = CaptionPath;
        this.CaptionText = CaptionText;
        this.ReadmePath = ReadmePath;
        this.MediaBase = MediaBase;
        this.Uploading = Uploading;
        this.UploadMessage = UploadMessage;
        this.ConnectedAccounts = ConnectedAccounts;
    }
}

export function SharePackModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.SharePackPanel.SharePackModel", [], SharePackModel, () => [["OutputDir", string_type], ["Files", list_type(string_type)], ["CaptionPath", string_type], ["CaptionText", string_type], ["ReadmePath", string_type], ["MediaBase", string_type], ["Uploading", option_type(string_type)], ["UploadMessage", option_type(string_type)], ["ConnectedAccounts", option_type(ConnectedAccountsDto_$reflection())]]);
}

export class SharePackMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["CopyCaption", "OpenYouTubeUpload", "OpenMetaUpload", "UploadToYouTube", "UploadToMeta", "Dismiss"];
    }
}

export function SharePackMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.SharePackPanel.SharePackMsg", [], SharePackMsg, () => [[], [], [], [], [], []]);
}

export function SharePackPanel_fromExport(dto, accounts) {
    return new SharePackModel(dto.OutputDir, dto.Files, dto.CaptionPath, dto.CaptionText, dto.ReadmePath, dto.MediaBase, undefined, undefined, accounts);
}

function SharePackPanel_isConnected(accounts, provider) {
    return defaultArg(map((a_1) => {
        if (a_1.Connected) {
            return a_1.Configured;
        }
        else {
            return false;
        }
    }, bind((a) => tryFind((x) => (x.Provider === provider), a.Accounts), accounts)), false);
}

function SharePackPanel_isConfigured(accounts) {
    return defaultArg(map((a) => a.Configured, accounts), false);
}

function SharePackPanel_copyToClipboard(text) {
    try {
        window.navigator.clipboard.writeText(text);
        return new FSharpResult$2(0, ["Caption copied to clipboard"]);
    }
    catch (ex) {
        return new FSharpResult$2(1, [ex.message]);
    }
}

function SharePackPanel_openUrl(url) {
    window.open(url, "_blank");
}

export function SharePackPanel_view(model, dispatch) {
    let elems_3;
    const youtubeConnected = SharePackPanel_isConnected(model.ConnectedAccounts, "youtube");
    const metaConnected = SharePackPanel_isConnected(model.ConnectedAccounts, "meta");
    const oauthConfigured = SharePackPanel_isConfigured(model.ConnectedAccounts);
    return createElement("div", createObj(ofArray([["className", "mx-6 mb-4 rounded-lg border border-accent/40 bg-surface-raised p-4 space-y-3"], (elems_3 = toList(delay(() => {
        let elems, children;
        return append(singleton(createElement("div", createObj(ofArray([["className", "flex items-start justify-between gap-4"], (elems = [(children = ofArray([createElement("h2", {
            className: "text-sm font-semibold text-slate-200",
            children: "Share Pack ready",
        }), createElement("p", {
            className: "text-xs text-slate-500 mt-1",
            children: `Exported to ${model.OutputDir} — YouTube 16:9 and Reels 9:16 presets.`,
        })]), createElement("div", {
            children: Interop_reactApi.Children.toArray(Array.from(children)),
        })), createElement("button", {
            className: "text-xs text-slate-500 hover:text-slate-300",
            children: "Dismiss",
            onClick: (_arg) => {
                dispatch(new SharePackMsg(5, []));
            },
        })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])))), delay(() => {
            let elems_1;
            return append(singleton(createElement("div", createObj(ofArray([["className", "flex flex-wrap gap-2 text-xs text-slate-400"], (elems_1 = map_1((f) => createElement("span", {
                className: "px-2 py-1 rounded border border-surface-border",
                children: f,
            }), model.Files), ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])))), delay(() => {
                let value_25;
                return append(singleton(createElement("div", createObj(ofArray([(value_25 = "rounded-md bg-surface border border-surface-border p-3 text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto", ["className", value_25]), ["children", isNullOrWhiteSpace(model.CaptionText) ? "(No caption — edit caption.txt in the export folder)" : model.CaptionText]])))), delay(() => {
                    let elems_2, value_46, value_55;
                    return append(singleton(createElement("div", createObj(ofArray([["className", "flex flex-wrap gap-2"], (elems_2 = [createElement("button", {
                        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent",
                        children: "Copy caption",
                        onClick: (_arg_1) => {
                            dispatch(new SharePackMsg(0, []));
                        },
                    }), createElement("button", {
                        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent",
                        children: "Open YouTube upload",
                        onClick: (_arg_2) => {
                            dispatch(new SharePackMsg(1, []));
                        },
                    }), createElement("button", {
                        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent",
                        children: "Open Meta Business Suite",
                        onClick: (_arg_3) => {
                            dispatch(new SharePackMsg(2, []));
                        },
                    }), createElement("button", createObj(ofArray([(value_46 = "px-3 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm disabled:opacity-50", ["className", value_46]), ["disabled", !youtubeConnected ? true : (model.Uploading != null)], ["title", !oauthConfigured ? "Configure OAuth in config/social-oauth.json and connect in Settings" : (!youtubeConnected ? "Connect YouTube in Settings" : "Upload youtube_16x9.mp4 via YouTube Data API")], ["children", equals(model.Uploading, "youtube") ? "Uploading to YouTube…" : "Upload to YouTube"], ["onClick", (_arg_4) => {
                        dispatch(new SharePackMsg(3, []));
                    }]]))), createElement("button", createObj(ofArray([(value_55 = "px-3 py-2 rounded-md border border-accent text-accent hover:bg-accent/10 text-sm disabled:opacity-50", ["className", value_55]), ["disabled", !metaConnected ? true : (model.Uploading != null)], ["title", !oauthConfigured ? "Configure OAuth in config/social-oauth.json and connect in Settings" : (!metaConnected ? "Connect Meta in Settings" : "Upload reels_9x16.mp4 to connected Facebook Page")], ["children", equals(model.Uploading, "meta") ? "Uploading to Meta…" : "Upload to Meta"], ["onClick", (_arg_5) => {
                        dispatch(new SharePackMsg(4, []));
                    }]])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])])))), delay(() => {
                        let value_67, value_71;
                        return append(!oauthConfigured ? singleton(createElement("p", createObj(ofArray([["className", "text-xs text-amber-400/90"], (value_67 = "OAuth direct upload is optional. Copy caption and use Open upload, or configure config/social-oauth.json and connect accounts in Settings.", ["children", value_67])])))) : ((!youtubeConnected && !metaConnected) ? singleton(createElement("p", createObj(ofArray([["className", "text-xs text-amber-400/90"], (value_71 = "OAuth is configured but no accounts connected — use Settings → Social upload to connect YouTube or Meta.", ["children", value_71])])))) : singleton(defaultOf())), delay(() => singleton(defaultArg(map((msg) => createElement("p", {
                            className: "text-xs text-slate-400",
                            children: msg,
                        }), model.UploadMessage), defaultOf()))));
                    }));
                }));
            }));
        }));
    })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])));
}

export function SharePackPanel_handleCopyCaption(model) {
    return SharePackPanel_copyToClipboard(model.CaptionText);
}

export function SharePackPanel_handleOpenYouTube() {
    SharePackPanel_openUrl("https://studio.youtube.com/channel/UC/videos/upload?d=ud");
}

export function SharePackPanel_handleOpenMeta() {
    SharePackPanel_openUrl("https://business.facebook.com/latest/composer");
}

