/**
 * Detecting a stale app shell.
 *
 * THE PROBLEM
 *
 * DHIS2 serves an app from /api/apps/<name>/index.html — one stable URL —
 * while the App Platform build gives every bundle a content hash
 * (index-a91f3c.js). The hashes mean a bundle can be cached forever and
 * never go stale. index.html cannot: it is the thing that says which
 * bundle to load, and it lives at the same address for every version.
 *
 * So if anything between the browser and DHIS2 caches that one file — the
 * browser itself, a reverse proxy, a CDN — a new install changes nothing
 * the user can see. They get yesterday's HTML, which names yesterday's
 * bundle, which is still sitting on disk from the previous install and
 * loads perfectly. Nothing errors. The app simply is the old version.
 *
 * That is also why deleting the old app before installing fixes it:
 * removing the app clears the directory, so the stale HTML's bundle is
 * gone and the browser is forced to go and ask again.
 *
 * WHAT AN APP CAN AND CANNOT DO
 *
 * It cannot set its own Cache-Control headers — DHIS2 and whatever sits
 * in front of it serve the files. The real fix is a header on the server:
 * `Cache-Control: no-cache` for index.html and manifest.webapp, which
 * still allows caching but forces revalidation.
 *
 * What it can do is NOTICE. Fetch its own index.html with cache: 'no-store'
 * and compare the scripts that document names against the scripts actually
 * running. Different hashes mean the running shell is older than what the
 * server holds, which is exactly the failure above, and the user can be
 * told rather than left to wonder why a fix they watched being installed
 * is not there.
 *
 * No version bookkeeping: nothing has to be bumped, and the check cannot
 * drift out of step with the build because it compares the build to
 * itself.
 */

/** Script URLs the running document loaded, as bare filenames. */
function runningScripts(doc = document) {
  return new Set(
    [...doc.querySelectorAll('script[src]')]
      .map((el) => el.getAttribute('src') || '')
      .map(fileOf)
      .filter(Boolean)
  )
}

function fileOf(src) {
  const path = String(src).split('?')[0].split('#')[0]
  return path.split('/').pop() || ''
}

/** Script filenames a freshly fetched index.html names. */
export function scriptsIn(html) {
  const out = new Set()
  // Parsed with a regex rather than DOMParser: DOMParser on a full
  // document can start fetching things, and all that is wanted here is
  // the list of names.
  for (const m of String(html).matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    const f = fileOf(m[1])
    if (f) out.add(f)
  }
  return out
}

/**
 * Is the shell running in this tab older than the one the server holds?
 *
 * @returns {{stale: boolean, serving?: string[], running?: string[]}}
 *          stale is false whenever the question cannot be answered —
 *          a failed fetch, an index.html with no hashed scripts — because
 *          a banner shown on a guess is worse than no banner.
 */
export async function shellIsStale(baseUrl, appName, doc = document) {
  const url = `${String(baseUrl).replace(/\/$/, '')}/api/apps/${appName}/index.html`
  let html
  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
    if (!res.ok) return { stale: false }
    html = await res.text()
  } catch {
    return { stale: false }
  }

  const serving = scriptsIn(html)
  if (!serving.size) return { stale: false }

  const running = runningScripts(doc)
  if (!running.size) return { stale: false }

  // Hashed bundles only. An unhashed script — a polyfill, a worker with a
  // fixed name — is the same in every build and says nothing.
  //
  // The pattern is a hyphen then six or more base64url characters, which
  // is what Vite emits: `main-eITxblpH.js`. An earlier version of this
  // looked for lowercase hex and matched none of them, so the check
  // silently never fired — the exact failure it exists to catch, in the
  // catcher.
  const hashed = (f) => /-[A-Za-z0-9_-]{6,}\.(m?js)$/.test(f)
  const servingHashed = [...serving].filter(hashed)
  if (!servingHashed.length) return { stale: false }

  const missing = servingHashed.filter((f) => !running.has(f))
  if (!missing.length) return { stale: false }

  return { stale: true, serving: servingHashed, running: [...running].filter(hashed) }
}

/**
 * Service workers left behind by an earlier build.
 *
 * This app declares no PWA, but a version that did would have registered
 * a worker that outlives it and goes on serving its own cached shell.
 * Unregistering anything scoped to this app costs nothing when there is
 * nothing there, and removes a cause that is invisible from the outside.
 *
 * @returns the number of registrations removed
 */
export async function clearStaleWorkers(appName) {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.getRegistrations) return 0
  let removed = 0
  try {
    for (const reg of await navigator.serviceWorker.getRegistrations()) {
      if (!String(reg.scope || '').includes(`/api/apps/${appName}`)) continue
      if (await reg.unregister()) removed++
    }
    if (removed && typeof caches !== 'undefined') {
      for (const key of await caches.keys()) {
        if (key.includes(appName)) await caches.delete(key)
      }
    }
  } catch {
    /* a browser that refuses is a browser with nothing to clear */
  }
  return removed
}

/**
 * The whole picture, for the person who has to fix it.
 *
 * The banner answers "is this tab stale". This answers "and whose fault
 * is it", which is the question an implementer actually has to settle
 * before they can do anything: a browser cache they can clear themselves,
 * a proxy header someone else has to change, or a service worker nobody
 * knew was there. Reading it off the response beats describing a curl
 * command to somebody over chat.
 */
export async function probeShell(baseUrl, appName, doc = document) {
  const url = `${String(baseUrl).replace(/\/$/, '')}/api/apps/${appName}/index.html`
  const out = {
    url,
    running: [...runningScripts(doc)],
    serving: [],
    stale: false,
    cacheControl: null,
    age: null,
    date: null,
    workers: [],
    error: null,
  }

  try {
    const res = await fetch(url, { cache: 'no-store', credentials: 'include' })
    out.cacheControl = res.headers.get('cache-control')
    out.age = res.headers.get('age')
    out.date = res.headers.get('date')
    if (!res.ok) {
      out.error = `${res.status} ${res.statusText}`
    } else {
      out.serving = [...scriptsIn(await res.text())]
      const hashed = (f) => /-[A-Za-z0-9_-]{6,}\.(m?js)$/.test(f)
      const want = out.serving.filter(hashed)
      const have = new Set(out.running)
      out.stale = want.length > 0 && want.some((f) => !have.has(f))
    }
  } catch (e) {
    out.error = String(e?.message || e)
  }

  try {
    if (navigator.serviceWorker?.getRegistrations) {
      out.workers = (await navigator.serviceWorker.getRegistrations())
        .map((r) => String(r.scope || ''))
        .filter((s) => s.includes(`/api/apps/${appName}`))
    }
  } catch {
    /* a browser that will not say has nothing to say */
  }

  return out
}

/**
 * What the headers mean, in one sentence, for whoever is reading.
 *
 * A long max-age on index.html is the whole bug; an Age above zero proves
 * a shared cache answered rather than the server. Saying so turns a
 * header dump into a finding somebody can take to an administrator.
 */
export function readCacheHeaders({ cacheControl, age }) {
  const cc = String(cacheControl || '').toLowerCase()
  const seconds = Number((cc.match(/max-age=(\d+)/) || [])[1])
  const revalidates = /no-cache|no-store|must-revalidate|max-age=0/.test(cc)
  const aged = Number(age) > 0

  if (!cacheControl) {
    return {
      level: 'warn',
      text:
        'No Cache-Control header. Browsers and proxies may cache index.html for as long as they ' +
        'like, which is what lets an old version come back. Ask for Cache-Control: no-cache on ' +
        'this path.',
    }
  }
  if (Number.isFinite(seconds) && seconds > 0 && !revalidates) {
    return {
      level: 'bad',
      text: `index.html is cacheable for ${seconds} seconds with no revalidation. This is the cause. For up to that period after an install, the previous build is served.`,
    }
  }
  if (aged) {
    return {
      level: 'warn',
      text: `A shared cache answered this request rather than the server (Age: ${age}). The headers look acceptable, so something in front of DHIS2 is ignoring them.`,
    }
  }
  return { level: 'ok', text: 'index.html is revalidated on every request. An install takes effect immediately.' }
}

/**
 * Get out of a stale shell without asking the user to learn a shortcut.
 *
 * location.reload(true) has not forced anything for years. Unregistering
 * the workers, emptying the caches and navigating to a URL the cache has
 * never seen does.
 */
export async function forceFresh(appName) {
  await clearStaleWorkers(appName)
  try {
    if (typeof caches !== 'undefined') {
      for (const key of await caches.keys()) await caches.delete(key)
    }
  } catch {
    /* nothing cached, or not allowed to look */
  }
  const u = new URL(window.location.href)
  u.searchParams.set('fresh', String(Date.now()))
  window.location.replace(u.toString())
}
