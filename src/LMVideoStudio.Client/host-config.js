const configured = import.meta.env.VITE_LMVS_HOST;
const fallback = "http://127.0.0.1:17170";

window.__LMVS_HOST__ =
  typeof configured === "string" && configured.trim().length > 0
    ? configured.trim()
    : fallback;
