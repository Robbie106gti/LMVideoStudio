import { FSharpRef, Union } from "./fable_modules/fable-library-js.4.27.0/Types.js";
import { union_type, option_type, class_type } from "./fable_modules/fable-library-js.4.27.0/Reflection.js";
import { trimStart, split, trim } from "./fable_modules/fable-library-js.4.27.0/String.js";
import { equalsWith, item } from "./fable_modules/fable-library-js.4.27.0/Array.js";
import { tryParse } from "./fable_modules/fable-library-js.4.27.0/Guid.js";
import { defaultOf } from "./fable_modules/fable-library-js.4.27.0/Util.js";
import { Cmd_ofEffect } from "./fable_modules/Fable.Elmish.5.0.2/cmd.fs.js";
import { defaultArg } from "./fable_modules/fable-library-js.4.27.0/Option.js";

export class AppRoute extends Union {
    constructor(tag, fields) {
        super();
        this.tag = tag;
        this.fields = fields;
    }
    cases() {
        return ["RouteHub", "RouteSettings", "RouteProject"];
    }
}

export function AppRoute_$reflection() {
    return union_type("LMVideoStudio.Client.AppNavigation.AppRoute", [], AppRoute, () => [[], [], [["Item1", class_type("System.Guid")], ["Item2", option_type(class_type("System.Guid"))]]]);
}

function readHash() {
    try {
        return window.location.hash;
    }
    catch (matchValue) {
        return "";
    }
}

export function parseHash(hash) {
    const path = trim(item(0, split(trimStart(hash.trim(), "#"), ["?", "&"])), "/");
    switch (path) {
        case "":
            return new AppRoute(0, []);
        case "settings":
            return new AppRoute(1, []);
        default:
            if (path.startsWith("project/")) {
                let segments;
                const array = split(path, ["/"], undefined, 0);
                segments = array.filter((s) => (s !== ""));
                let matchResult;
                if (!equalsWith((x, y) => (x === y), segments, defaultOf()) && (segments.length === 2)) {
                    if (item(0, segments) === "project") {
                        matchResult = 0;
                    }
                    else {
                        matchResult = 2;
                    }
                }
                else if (!equalsWith((x_1, y_1) => (x_1 === y_1), segments, defaultOf()) && (segments.length === 4)) {
                    if (item(0, segments) === "project") {
                        if (item(2, segments) === "block") {
                            matchResult = 1;
                        }
                        else {
                            matchResult = 2;
                        }
                    }
                    else {
                        matchResult = 2;
                    }
                }
                else {
                    matchResult = 2;
                }
                switch (matchResult) {
                    case 0: {
                        let matchValue;
                        let outArg = "00000000-0000-0000-0000-000000000000";
                        matchValue = [tryParse(item(1, segments), new FSharpRef(() => outArg, (v) => {
                            outArg = v;
                        })), outArg];
                        if (matchValue[0]) {
                            return new AppRoute(2, [matchValue[1], undefined]);
                        }
                        else {
                            return undefined;
                        }
                    }
                    case 1: {
                        const projectId_1 = item(1, segments);
                        const blockId = item(3, segments);
                        let matchValue_1;
                        let outArg_1 = "00000000-0000-0000-0000-000000000000";
                        matchValue_1 = [tryParse(projectId_1, new FSharpRef(() => outArg_1, (v_1) => {
                            outArg_1 = v_1;
                        })), outArg_1];
                        let matchValue_2;
                        let outArg_2 = "00000000-0000-0000-0000-000000000000";
                        matchValue_2 = [tryParse(blockId, new FSharpRef(() => outArg_2, (v_2) => {
                            outArg_2 = v_2;
                        })), outArg_2];
                        let matchResult_1;
                        if (matchValue_1[0]) {
                            if (matchValue_2[0]) {
                                matchResult_1 = 0;
                            }
                            else {
                                matchResult_1 = 1;
                            }
                        }
                        else {
                            matchResult_1 = 1;
                        }
                        switch (matchResult_1) {
                            case 0:
                                return new AppRoute(2, [matchValue_1[1], matchValue_2[1]]);
                            default:
                                return undefined;
                        }
                    }
                    default:
                        return undefined;
                }
            }
            else {
                return undefined;
            }
    }
}

export function parseCurrent() {
    return parseHash(readHash());
}

export function toHash(route) {
    switch (route.tag) {
        case 1:
            return "#/settings";
        case 2:
            if (route.fields[1] != null) {
                const bid = route.fields[1];
                return `#/project/${route.fields[0]}/block/${bid}`;
            }
            else {
                return `#/project/${route.fields[0]}`;
            }
        default:
            return "#/";
    }
}

function setHash(route, replace_1) {
    const hash = toHash(route);
    if (readHash() !== hash) {
        if (replace_1) {
            window.history.replaceState(defaultOf(), "", hash);
        }
        else {
            window.history.pushState(defaultOf(), "", hash);
        }
    }
}

export function push(route) {
    setHash(route, false);
}

export function replace(route) {
    setHash(route, true);
}

export function syncRoute(route) {
    return Cmd_ofEffect((_arg) => {
        push(route);
    });
}

export function subscribe(onRouteChanged) {
    const onChange = (_arg) => {
        onRouteChanged(defaultArg(parseCurrent(), new AppRoute(0, [])));
    };
    window.addEventListener("popstate", onChange);
    window.addEventListener("hashchange", onChange);
    return {
        Dispose() {
            window.removeEventListener("popstate", onChange);
            window.removeEventListener("hashchange", onChange);
        },
    };
}

export function ensureInitialHash() {
    if (readHash() === "") {
        replace(new AppRoute(0, []));
    }
}

