// Tauri + GitHub latest.json fallback for update checks from Fable client.
export async function checkForUpdatesFallback(currentVersion) {
  const endpoint =
    "https://github.com/LMVideoStudio/LMVideoStudio/releases/latest/download/latest.json";

  try {
    const resp = await fetch(endpoint, { cache: "no-store" });
    if (!resp.ok) {
      return `Update check failed (${resp.status}) — configure releases endpoint`;
    }
    const data = await resp.json();
    const latest = data.version || "unknown";
    if (currentVersion && latest !== currentVersion) {
      return `Update available: ${latest} (you have ${currentVersion})`;
    }
    return `You are on the latest version (${latest})`;
  } catch (err) {
    return `Update check unavailable: ${err.message || err}`;
  }
}

export async function writeErrorReportTauri(json) {
  if (typeof window.__TAURI__ === "undefined") {
    throw new Error("Tauri runtime unavailable");
  }
  const { invoke } = window.__TAURI__.core;
  return invoke("write_error_report", { json });
}

export async function checkForUpdatesTauri() {
  if (typeof window.__TAURI__ === "undefined") {
    return null;
  }
  const { invoke } = window.__TAURI__.core;
  return invoke("check_for_updates");
}
