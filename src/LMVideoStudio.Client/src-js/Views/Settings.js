import { Record, Union } from "../fable_modules/fable-library-js.4.27.0/Types.js";
import { record_type, bool_type, option_type, union_type, string_type } from "../fable_modules/fable-library-js.4.27.0/Reflection.js";
import { ConnectedAccountsDto_$reflection, ModelStatusDto_$reflection, SystemStatusDto_$reflection } from "../Api.js";
import { createObj, equals } from "../fable_modules/fable-library-js.4.27.0/Util.js";
import { readConsent } from "../ErrorReporting.js";
import { createElement } from "react";
import { empty, singleton, append, delay, toList } from "../fable_modules/fable-library-js.4.27.0/Seq.js";
import { tryFind, map as map_1, ofArray } from "../fable_modules/fable-library-js.4.27.0/List.js";
import { Interop_reactApi } from "../fable_modules/Feliz.2.6.0/Interop.fs.js";
import { orElse, bind, map, defaultArg } from "../fable_modules/fable-library-js.4.27.0/Option.js";
import { defaultOf } from "../fable_modules/fable-library-js.4.27.0/Util.js";

export class SettingsMsg extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["CheckUpdates", "RunBootstrap", "ScanConflicts", "RepairSetup", "RefreshModelStatus", "SyncModelsCheck", "SyncModelsPull", "DismissFirstRun", "CloseProject", "ToggleErrorReportingConsent", "FlushErrorReports", "SendPendingErrorReport", "RefreshConnectedAccounts", "ConnectOAuth", "DisconnectOAuth"];
    }
}

export function SettingsMsg_$reflection() {
    return union_type("LMVideoStudio.Client.Views.Settings.SettingsMsg", [], SettingsMsg, () => [[], [], [], [], [], [], [], [], [], [], [], [], [], [["Item", string_type]], [["Item", string_type]]]);
}

export class SettingsModel extends Record {
    constructor(Status, ModelStatus, Message, CheckingUpdates, SyncingModels, ShowFirstRunBanner, ErrorReportingConsent, ErrorReportingBusy, ConnectedAccounts, OAuthBusy) {
        super();
        this.Status = Status;
        this.ModelStatus = ModelStatus;
        this.Message = Message;
        this.CheckingUpdates = CheckingUpdates;
        this.SyncingModels = SyncingModels;
        this.ShowFirstRunBanner = ShowFirstRunBanner;
        this.ErrorReportingConsent = ErrorReportingConsent;
        this.ErrorReportingBusy = ErrorReportingBusy;
        this.ConnectedAccounts = ConnectedAccounts;
        this.OAuthBusy = OAuthBusy;
    }
}

export function SettingsModel_$reflection() {
    return record_type("LMVideoStudio.Client.Views.Settings.SettingsModel", [], SettingsModel, () => [["Status", option_type(SystemStatusDto_$reflection())], ["ModelStatus", option_type(ModelStatusDto_$reflection())], ["Message", option_type(string_type)], ["CheckingUpdates", bool_type], ["SyncingModels", bool_type], ["ShowFirstRunBanner", bool_type], ["ErrorReportingConsent", bool_type], ["ErrorReportingBusy", bool_type], ["ConnectedAccounts", option_type(ConnectedAccountsDto_$reflection())], ["OAuthBusy", option_type(string_type)]]);
}

const Settings_bootstrapDoneKey = "lmvs_bootstrap_done";

function Settings_allSystemsOk(s) {
    if ((s.Host === "ok") && s.Ollama) {
        return s.Worker;
    }
    else {
        return false;
    }
}

function Settings_warmupLabel(s) {
    if (s.WarmupComplete) {
        return "GPU warmup: complete";
    }
    else {
        return "GPU warmup: not run yet (optional)";
    }
}

function Settings_readBootstrapDone() {
    try {
        return window.localStorage.getItem(Settings_bootstrapDoneKey) === "1";
    }
    catch (matchValue) {
        return false;
    }
}

function Settings_isMicrosoftStoreBuild() {
    try {
        return equals(window.__LMVS_BUILD_FLAVOR__, "microsoft-store");
    }
    catch (matchValue) {
        return false;
    }
}

export function Settings_init() {
    return new SettingsModel(undefined, undefined, undefined, false, false, !Settings_readBootstrapDone(), readConsent(), false, undefined, undefined);
}

export function Settings_markBootstrapStarted() {
    try {
        window.localStorage.setItem(Settings_bootstrapDoneKey, "1");
    }
    catch (matchValue) {
    }
}

export function Settings_view(model, dispatch) {
    let elems_15;
    return createElement("div", createObj(ofArray([["className", "max-w-xl mx-auto p-8 space-y-6"], (elems_15 = toList(delay(() => append(singleton(createElement("h1", {
        className: "text-2xl font-bold",
        children: "Settings",
    })), delay(() => {
        let value_8;
        return append(singleton(createElement("p", createObj(ofArray([["className", "text-sm text-slate-400"], (value_8 = "Mockup export uses CPU (FFmpeg libx264). AI thumbnails and upscale use GPU (Python worker / ROCm). Check Task Manager GPU tab during Generate, not during mockup refresh.", ["children", value_8])])))), delay(() => {
            let elems_1, elems;
            return append(model.ShowFirstRunBanner ? singleton(createElement("div", createObj(ofArray([["className", "rounded-lg border border-accent/40 bg-accent/10 p-4 space-y-3"], (elems_1 = [createElement("p", {
                className: "text-sm",
                children: "First run — bootstrap checks Ollama, Python worker, model catalog, FFmpeg, and sidecar health.",
            }), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems = [createElement("button", {
                className: "px-4 py-2 rounded-md bg-accent hover:bg-accent-muted text-sm font-medium",
                children: "Run first-run bootstrap",
                onClick: (_arg) => {
                    dispatch(new SettingsMsg(1, []));
                },
            }), createElement("button", {
                className: "px-3 py-2 rounded-md border border-surface-border text-sm",
                children: "Dismiss",
                onClick: (_arg_1) => {
                    dispatch(new SettingsMsg(7, []));
                },
            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_1))])])))) : empty(), delay(() => append(singleton(defaultArg(map((s) => {
                let elems_3;
                return createElement("div", createObj(ofArray([["className", "space-y-3"], (elems_3 = toList(delay(() => append(Settings_allSystemsOk(s) ? singleton(createElement("div", {
                    className: "rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300",
                    children: "All systems OK — Host, Ollama, and Worker are reachable.",
                })) : empty(), delay(() => {
                    let elems_2;
                    return singleton(createElement("div", createObj(ofArray([["className", "rounded-lg border border-surface-border p-4 space-y-2 text-sm"], (elems_2 = [createElement("div", {
                        children: `Host: ${s.Host}`,
                    }), createElement("div", {
                        children: s.Ollama ? "Ollama: reachable" : "Ollama: offline",
                    }), createElement("div", {
                        children: s.Worker ? "Worker: reachable" : "Worker: offline",
                    }), defaultArg(map((d) => {
                        let rocm;
                        const matchValue = d.Rocm;
                        rocm = ((matchValue == null) ? "GPU status unknown" : (matchValue ? "ROCm/CUDA active" : "CPU only (no GPU)"));
                        const vram = defaultArg(map((gb) => (`%P(F1) GB VRAM`), d.VramGb), "VRAM unknown");
                        return createElement("div", {
                            children: `Worker GPU: ${defaultArg(d.DeviceName, "GPU device unknown")} — ${rocm}, ${vram}`,
                        });
                    }, s.WorkerDevice), defaultOf()), createElement("div", {
                        children: Settings_warmupLabel(s),
                    }), defaultArg(map((ok) => createElement("div", {
                        children: ok ? "FFmpeg: available" : "FFmpeg: not found",
                    }), s.Ffmpeg), defaultOf())], ["children", Interop_reactApi.Children.toArray(Array.from(elems_2))])]))));
                })))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_3))])])));
            }, model.Status), defaultOf())), delay(() => {
                let elems_6, elems_5;
                return append(singleton(createElement("div", createObj(ofArray([["className", "rounded-lg border border-surface-border p-4 space-y-3"], (elems_6 = [createElement("h2", {
                    className: "text-sm font-semibold",
                    children: "Model catalog",
                }), defaultArg(map((m) => {
                    let elems_4;
                    return createElement("div", createObj(ofArray([["className", "text-sm space-y-1 text-slate-400"], (elems_4 = [createElement("div", {
                        children: m.ManifestExists ? "Manifest: present" : "Manifest: missing",
                    }), createElement("div", {
                        children: m.OllamaReachable ? "Ollama registry: reachable" : "Ollama registry: offline",
                    }), createElement("div", {
                        className: "truncate",
                        title: m.ManifestPath,
                        children: m.ManifestPath,
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_4))])])));
                }, model.ModelStatus), createElement("p", {
                    className: "text-sm text-slate-500",
                    children: "Loading model status…",
                })), createElement("div", createObj(ofArray([["className", "flex flex-wrap gap-2"], (elems_5 = [createElement("button", {
                    className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50",
                    disabled: model.SyncingModels,
                    children: "Refresh status",
                    onClick: (_arg_2) => {
                        dispatch(new SettingsMsg(4, []));
                    },
                }), createElement("button", {
                    className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50",
                    disabled: model.SyncingModels,
                    children: "Check models",
                    onClick: (_arg_3) => {
                        dispatch(new SettingsMsg(5, []));
                    },
                }), createElement("button", {
                    className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50",
                    disabled: model.SyncingModels,
                    children: "Sync / pull models",
                    onClick: (_arg_4) => {
                        dispatch(new SettingsMsg(6, []));
                    },
                })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_5))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_6))])])))), delay(() => {
                    let elems_9, value_114, elems_7, elems_8;
                    return append(singleton(createElement("div", createObj(ofArray([["className", "rounded-lg border border-surface-border p-4 space-y-3"], (elems_9 = [createElement("h2", {
                        className: "text-sm font-semibold",
                        children: "Error reporting",
                    }), createElement("p", createObj(ofArray([["className", "text-sm text-slate-400"], (value_114 = "Crash and API errors are saved locally under %LOCALAPPDATA%\\LMVideoStudio\\reports. With consent, reports are sent to the developer webhook configured in config/error-reporting.json.", ["children", value_114])]))), createElement("label", createObj(ofArray([["className", "flex items-center gap-2 text-sm"], (elems_7 = [createElement("input", {
                        type: "checkbox",
                        checked: model.ErrorReportingConsent,
                        onChange: (ev) => {
                            const v = ev.target.checked;
                            dispatch(new SettingsMsg(9, []));
                        },
                    }), createElement("span", {
                        children: "Send error reports automatically (default off)",
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_7))])]))), createElement("div", createObj(ofArray([["className", "flex flex-wrap gap-2"], (elems_8 = [createElement("button", {
                        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50",
                        disabled: model.ErrorReportingBusy,
                        children: "Send queued reports",
                        onClick: (_arg_5) => {
                            dispatch(new SettingsMsg(10, []));
                        },
                    }), createElement("button", {
                        className: "px-3 py-2 rounded-md border border-surface-border text-sm hover:border-accent disabled:opacity-50",
                        disabled: model.ErrorReportingBusy,
                        children: "Send last captured error",
                        onClick: (_arg_6) => {
                            dispatch(new SettingsMsg(11, []));
                        },
                    })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_8))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_9))])])))), delay(() => {
                        let elems_13, value_151, elems_12;
                        return append(singleton(createElement("div", createObj(ofArray([["className", "rounded-lg border border-surface-border p-4 space-y-3"], (elems_13 = [createElement("h2", {
                            className: "text-sm font-semibold text-slate-300",
                            children: "Social upload (OAuth)",
                        }), createElement("p", createObj(ofArray([["className", "text-xs text-slate-500"], (value_151 = "Optional direct upload to YouTube and Meta (Facebook Page). Copy-to-clipboard and open-upload assist work without OAuth. Configure config/social-oauth.json from the example file.", ["children", value_151])]))), defaultArg(map((dto) => {
                            let value_155;
                            if (!dto.Configured) {
                                return createElement("p", createObj(ofArray([["className", "text-xs text-amber-400/90"], (value_155 = "OAuth apps not configured — copy config/social-oauth.json.example to config/social-oauth.json and add your client IDs.", ["children", value_155])])));
                            }
                            else {
                                return defaultOf();
                            }
                        }, model.ConnectedAccounts), createElement("p", {
                            className: "text-xs text-slate-500",
                            children: "Loading connection status…",
                        })), createElement("div", createObj(ofArray([["className", "grid gap-2 sm:grid-cols-2"], (elems_12 = toList(delay(() => map_1((tupledArg) => {
                            let elems_11, elems_10;
                            const provider = tupledArg[0];
                            const account = bind((dto_1) => tryFind((a) => (a.Provider === provider), dto_1.Accounts), model.ConnectedAccounts);
                            const connected = defaultArg(map((a_1) => a_1.Connected, account), false);
                            const name_80 = defaultArg(bind((a_2) => orElse(a_2.AccountName, a_2.PageName), account), "Not connected");
                            const busy = equals(model.OAuthBusy, provider);
                            return createElement("div", createObj(ofArray([["className", "rounded-md border border-surface-border p-3 space-y-2"], (elems_11 = [createElement("div", {
                                className: "text-sm font-medium text-slate-200",
                                children: tupledArg[1],
                            }), createElement("p", {
                                className: "text-xs text-slate-500 truncate",
                                children: connected ? (`Connected: ${name_80}`) : "Not connected",
                            }), createElement("div", createObj(ofArray([["className", "flex gap-2"], (elems_10 = toList(delay(() => {
                                let value_185;
                                return append(connected ? singleton(createElement("button", {
                                    className: "px-3 py-1.5 rounded-md border border-surface-border text-xs hover:border-accent disabled:opacity-50",
                                    disabled: busy,
                                    children: busy ? "Working…" : "Disconnect",
                                    onClick: (_arg_7) => {
                                        dispatch(new SettingsMsg(14, [provider]));
                                    },
                                })) : singleton(createElement("button", createObj(ofArray([(value_185 = "px-3 py-1.5 rounded-md border border-accent text-accent text-xs hover:bg-accent/10 disabled:opacity-50", ["className", value_185]), ["disabled", busy], ["children", busy ? "Opening…" : "Connect"], ["onClick", (_arg_8) => {
                                    dispatch(new SettingsMsg(13, [provider]));
                                }]])))), delay(() => singleton(createElement("button", {
                                    className: "px-3 py-1.5 rounded-md border border-surface-border text-xs hover:border-accent",
                                    children: "Refresh",
                                    onClick: (_arg_9) => {
                                        dispatch(new SettingsMsg(12, []));
                                    },
                                }))));
                            })), ["children", Interop_reactApi.Children.toArray(Array.from(elems_10))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_11))])])));
                        }, ofArray([["youtube", "YouTube"], ["meta", "Meta (Facebook Page)"]])))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_12))])])))], ["children", Interop_reactApi.Children.toArray(Array.from(elems_13))])])))), delay(() => {
                            let elems_14, btn;
                            return append(singleton(createElement("div", createObj(ofArray([["className", "flex flex-col gap-2"], (elems_14 = [createElement("button", {
                                className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
                                children: "Close project",
                                onClick: (_arg_10) => {
                                    dispatch(new SettingsMsg(8, []));
                                },
                            }), (btn = createElement("button", {
                                className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
                                children: "Check for updates",
                                disabled: model.CheckingUpdates,
                                onClick: (_arg_11) => {
                                    dispatch(new SettingsMsg(0, []));
                                },
                            }), Settings_isMicrosoftStoreBuild() ? defaultOf() : btn), createElement("button", {
                                className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
                                children: "Run bootstrap",
                                onClick: (_arg_12) => {
                                    dispatch(new SettingsMsg(1, []));
                                },
                            }), createElement("button", {
                                className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
                                children: "Repair setup",
                                onClick: (_arg_13) => {
                                    dispatch(new SettingsMsg(3, []));
                                },
                            }), createElement("button", {
                                className: "px-4 py-2 rounded-md border border-surface-border text-left hover:border-accent",
                                children: "Scan GPU conflicts",
                                onClick: (_arg_14) => {
                                    dispatch(new SettingsMsg(2, []));
                                },
                            })], ["children", Interop_reactApi.Children.toArray(Array.from(elems_14))])])))), delay(() => singleton(defaultArg(map((m_1) => createElement("p", {
                                className: "text-sm text-slate-400",
                                children: m_1,
                            }), model.Message), defaultOf()))));
                        }));
                    }));
                }));
            }))));
        }));
    })))), ["children", Interop_reactApi.Children.toArray(Array.from(elems_15))])])));
}

