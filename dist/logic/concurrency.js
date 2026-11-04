const BATCH = 250;
const LIMIT = 8;
async function mapLimit(items, limit, fn) {
  const list = [...items];
  const out = new Array(list.length);
  let next = 0;
  const worker = async () => {
    for (; ; ) {
      const i = next++;
      if (i >= list.length) return;
      out[i] = await fn(list[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
  return out;
}
function chunk(list, size = BATCH) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
function isTooLong(e) {
  const code = e?.details?.httpStatusCode ?? e?.httpStatusCode ?? e?.status;
  if (code === 414 || code === 413 || code === 431) return true;
  return /\b41[34]\b|\b431\b|request-?uri|too large|too long|header too/i.test(String(e?.message || e));
}
async function queryInBatches(engine, { resource, fields, filterFor, uids, params = {}, size = BATCH, limit = LIMIT, onProgress, onProblem }) {
  const list = [...uids].filter(Boolean);
  if (!list.length) return [];
  const batches = chunk(list, size);
  let asked = 0;
  const run = async (batch) => {
    try {
      const res = await engine.query({
        r: { resource, params: { paging: false, fields, ...params, filter: filterFor(batch) } }
      });
      return res.r?.[resource] || [];
    } catch (e) {
      if (batch.length > 1 && isTooLong(e)) {
        const half = Math.ceil(batch.length / 2);
        const [a, b] = await Promise.all([run(batch.slice(0, half)), run(batch.slice(half))]);
        return [...a, ...b];
      }
      onProblem?.(e);
      return [];
    }
  };
  const results = await mapLimit(batches, limit, async (batch) => {
    const rows = await run(batch);
    asked += batch.length;
    onProgress?.({ done: Math.min(asked, list.length), total: list.length });
    return rows;
  });
  const hits = /* @__PURE__ */ new Map();
  for (const rows of results) for (const o of rows || []) if (o?.id) hits.set(o.id, o);
  return [...hits.values()];
}
export {
  BATCH,
  LIMIT,
  chunk,
  isTooLong,
  mapLimit,
  queryInBatches
};
