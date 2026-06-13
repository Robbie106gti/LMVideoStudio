export function fetchJson(url) {
  return function (method) {
    return async function (body) {
      const init = { method };
      if (body !== null && body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = body;
      }
      const res = await fetch(url, init);
      const text = await res.text();
      return [res.status, text];
    };
  };
}

export function importFile(url) {
  return async function (file) {
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(url, { method: "POST", body: form });
      const text = await res.text();
      return [res.status, text];
    } catch (err) {
      return [0, err?.message ?? String(err)];
    }
  };
}

export function subscribeSse(url) {
  return function (onMessage) {
    const es = new EventSource(url);
    es.onmessage = (ev) => onMessage(ev.data);
    return es;
  };
}
