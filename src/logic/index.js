/**
 * The React-free half of the kit.
 *
 * Plain functions over plain objects: no hooks, no components, no import
 * from the UI layer, and `engine` passed in rather than imported. That is
 * what lets these be tested in plain node with no browser and no renderer.
 *
 * Tier: NEVER DIVERGE. There is one correct way to batch UIDs and split
 * on a 414, and one correct way to ask /api/schemas what is a reference.
 */

export { SchemaService, ALWAYS_STRIP, LOCAL_CONTEXT_FIELDS, USER_LOCAL_FIELDS } from './schema.js'
export { resolveLanguage, languageKey } from './language.js'
export { BATCH, LIMIT, mapLimit, chunk, isTooLong, queryInBatches } from './concurrency.js'
export {
  scriptsIn,
  shellIsStale,
  clearStaleWorkers,
  probeShell,
  readCacheHeaders,
  forceFresh,
} from './staleshell.js'
