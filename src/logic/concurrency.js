/**
 * Running many small queries without waiting for each one.
 *
 * The scan's cost was never computation - matching 11,011 indexed indicators
 * takes 6ms. It was round trips: a round over a 4,819-object frontier issued
 * about 2,350 requests, each one awaited before the next was sent. The
 * instance was idle most of that time and so was the browser.
 *
 * Two changes, neither of which alters what is asked, only how:
 *
 *   - batches of 250 UIDs instead of 60. A UID costs 12 bytes in the URL, so
 *     250 is about 3KB - well inside the 8KB header limit a default Tomcat
 *     accepts. That is four times fewer requests.
 *   - eight requests in flight at once instead of one.
 *
 * The 414 that forced the original batch of 60 is handled rather than
 * avoided: a batch that comes back too long is split in half and retried,
 * down to a single UID. So a stricter server costs a few extra requests
 * instead of silently returning nothing, which is what it used to do.
 */

/** How many UIDs go in one `id:in:[...]`. */
export const BATCH = 250

/** How many requests are allowed in flight at once. */
export const LIMIT = 8

/**
 * Map over items with bounded concurrency, preserving order.
 *
 * Workers pull from a shared cursor rather than being handed fixed slices, so
 * one slow batch does not hold up the others.
 */
export async function mapLimit(items, limit, fn) {
  const list = [...items]
  const out = new Array(list.length)
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= list.length) return
      out[i] = await fn(list[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker))
  return out
}

export function chunk(list, size = BATCH) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

/**
 * A request rejected for being too long, by whichever shape the server and
 * the data engine express it in.
 */
export function isTooLong(e) {
  const code = e?.details?.httpStatusCode ?? e?.httpStatusCode ?? e?.status
  if (code === 414 || code === 413 || code === 431) return true
  return /\b41[34]\b|\b431\b|request-?uri|too large|too long|header too/i.test(String(e?.message || e))
}

/**
 * `filter=<path>:in:[...]` over a set of UIDs, batched and concurrent.
 *
 * @param filterFor  builds the filter string for one batch
 * @param onProgress called as batches complete, with UIDs asked about so far
 * @param onProblem  called once per batch that failed for a reason other than
 *                   length - a failure must be reported, because an empty
 *                   result and a result that could not be fetched mean
 *                   opposite things
 * @returns the matched objects, de-duplicated by id
 */
export async function queryInBatches(
  engine,
  { resource, fields, filterFor, uids, params = {}, size = BATCH, limit = LIMIT, onProgress, onProblem }
) {
  const list = [...uids].filter(Boolean)
  if (!list.length) return []
  const batches = chunk(list, size)
  let asked = 0

  const run = async (batch) => {
    try {
      const res = await engine.query({
        r: { resource, params: { paging: false, fields, ...params, filter: filterFor(batch) } },
      })
      return res.r?.[resource] || []
    } catch (e) {
      if (batch.length > 1 && isTooLong(e)) {
        const half = Math.ceil(batch.length / 2)
        const [a, b] = await Promise.all([run(batch.slice(0, half)), run(batch.slice(half))])
        return [...a, ...b]
      }
      onProblem?.(e)
      return []
    }
  }

  const results = await mapLimit(batches, limit, async (batch) => {
    const rows = await run(batch)
    asked += batch.length
    onProgress?.({ done: Math.min(asked, list.length), total: list.length })
    return rows
  })

  const hits = new Map()
  for (const rows of results) for (const o of rows || []) if (o?.id) hits.set(o.id, o)
  return [...hits.values()]
}
