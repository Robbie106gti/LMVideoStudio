const CONSENT_KEY = "lmvs_error_reporting_consent";
const MAX_ACTIVITY = 30;

const activityLog = [];

export function readErrorReportingConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeErrorReportingConsent(enabled) {
  try {
    window.localStorage.setItem(CONSENT_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

export function appendActivityLine(line) {
  const entry = `${new Date().toISOString()} ${line}`;
  activityLog.push(entry);
  if (activityLog.length > MAX_ACTIVITY) {
    activityLog.splice(0, activityLog.length - MAX_ACTIVITY);
  }
}

export function getActivityTail() {
  return activityLog.slice(-MAX_ACTIVITY);
}

export function installErrorHooks(onError) {
  window.addEventListener("error", (event) => {
    const message = event?.message || "Unknown window error";
    const stack = event?.error?.stack || null;
    onError({
      source: "client",
      severity: "error",
      message,
      stack,
      context: {
        filename: event?.filename || "",
        lineno: String(event?.lineno ?? ""),
        colno: String(event?.colno ?? ""),
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const message =
      typeof reason === "string"
        ? reason
        : reason?.message || "Unhandled promise rejection";
    const stack = reason?.stack || null;
    onError({
      source: "client",
      severity: "error",
      message,
      stack,
      context: { type: "unhandledrejection" },
    });
  });
}

export function detectOs() {
  try {
    return window.navigator.userAgent || "unknown";
  } catch {
    return "unknown";
  }
}
