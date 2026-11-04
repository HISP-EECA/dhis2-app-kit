function runningScripts(doc = document) {
  return new Set(
    [...doc.querySelectorAll("script[src]")].map((el) => el.getAttribute("src") || "").map(fileOf).filter(Boolean)
  );
}
function fileOf(src) {
  const path = String(src).split("?")[0].split("#")[0];
  return path.split("/").pop() || "";
}
function scriptsIn(html) {
  const out = /* @__PURE__ */ new Set();
  for (const m of String(html).matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const f = fileOf(m[1]);
    if (f) out.add(f);
  }
  return out;
}
async function shellIsStale(baseUrl, appName, doc = document) {
  const url = `${String(baseUrl).replace(/\/$/, "")}/api/apps/${appName}/index.html`;
  let html;
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    if (!res.ok) return { stale: false };
    html = await res.text();
  } catch {
    return { stale: false };
  }
  const serving = scriptsIn(html);
  if (!serving.size) return { stale: false };
  const running = runningScripts(doc);
  if (!running.size) return { stale: false };
  const hashed = (f) => /-[A-Za-z0-9_-]{6,}\.(m?js)$/.test(f);
  const servingHashed = [...serving].filter(hashed);
  if (!servingHashed.length) return { stale: false };
  const missing = servingHashed.filter((f) => !running.has(f));
  if (!missing.length) return { stale: false };
  return { stale: true, serving: servingHashed, running: [...running].filter(hashed) };
}
async function clearStaleWorkers(appName) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker?.getRegistrations) return 0;
  let removed = 0;
  try {
    for (const reg of await navigator.serviceWorker.getRegistrations()) {
      if (!String(reg.scope || "").includes(`/api/apps/${appName}`)) continue;
      if (await reg.unregister()) removed++;
    }
    if (removed && typeof caches !== "undefined") {
      for (const key of await caches.keys()) {
        if (key.includes(appName)) await caches.delete(key);
      }
    }
  } catch {
  }
  return removed;
}
async function probeShell(baseUrl, appName, doc = document) {
  const url = `${String(baseUrl).replace(/\/$/, "")}/api/apps/${appName}/index.html`;
  const out = {
    url,
    running: [...runningScripts(doc)],
    serving: [],
    stale: false,
    cacheControl: null,
    age: null,
    date: null,
    workers: [],
    error: null
  };
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "include" });
    out.cacheControl = res.headers.get("cache-control");
    out.age = res.headers.get("age");
    out.date = res.headers.get("date");
    if (!res.ok) {
      out.error = `${res.status} ${res.statusText}`;
    } else {
      out.serving = [...scriptsIn(await res.text())];
      const hashed = (f) => /-[A-Za-z0-9_-]{6,}\.(m?js)$/.test(f);
      const want = out.serving.filter(hashed);
      const have = new Set(out.running);
      out.stale = want.length > 0 && want.some((f) => !have.has(f));
    }
  } catch (e) {
    out.error = String(e?.message || e);
  }
  try {
    if (navigator.serviceWorker?.getRegistrations) {
      out.workers = (await navigator.serviceWorker.getRegistrations()).map((r) => String(r.scope || "")).filter((s) => s.includes(`/api/apps/${appName}`));
    }
  } catch {
  }
  return out;
}
function readCacheHeaders({ cacheControl, age }) {
  const cc = String(cacheControl || "").toLowerCase();
  const seconds = Number((cc.match(/max-age=(\d+)/) || [])[1]);
  const revalidates = /no-cache|no-store|must-revalidate|max-age=0/.test(cc);
  const aged = Number(age) > 0;
  if (!cacheControl) {
    return {
      level: "warn",
      text: "No Cache-Control header. Browsers and proxies may cache index.html for as long as they like, which is what lets an old version come back. Ask for Cache-Control: no-cache on this path."
    };
  }
  if (Number.isFinite(seconds) && seconds > 0 && !revalidates) {
    return {
      level: "bad",
      text: `index.html is cacheable for ${seconds} seconds with no revalidation. This is the cause. For up to that period after an install, the previous build is served.`
    };
  }
  if (aged) {
    return {
      level: "warn",
      text: `A shared cache answered this request rather than the server (Age: ${age}). The headers look acceptable, so something in front of DHIS2 is ignoring them.`
    };
  }
  return { level: "ok", text: "index.html is revalidated on every request. An install takes effect immediately." };
}
async function forceFresh(appName) {
  await clearStaleWorkers(appName);
  try {
    if (typeof caches !== "undefined") {
      for (const key of await caches.keys()) await caches.delete(key);
    }
  } catch {
  }
  const u = new URL(window.location.href);
  u.searchParams.set("fresh", String(Date.now()));
  window.location.replace(u.toString());
}
export {
  clearStaleWorkers,
  forceFresh,
  probeShell,
  readCacheHeaders,
  scriptsIn,
  shellIsStale
};
