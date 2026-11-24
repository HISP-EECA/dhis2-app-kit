// The React-free half, tested in plain node: no browser, no jsdom, no
// renderer. Run with `npm test`.
import assert from 'node:assert/strict'

// --- language resolution ----------------------------------------------
{
  const { resolveLanguage } = await import('../src/logic/language.js')
  const shipped = [{ code: 'en' }, { code: 'ru' }]

  // A stored choice wins: it is an explicit override of the profile.
  assert.equal(resolveLanguage({ stored: 'ru', profile: 'en', shipped }), 'ru')
  // No choice: follow the user's DHIS2 locale when the app ships it.
  assert.equal(resolveLanguage({ stored: null, profile: 'ru', shipped }), 'ru')
  // A locale the app does not ship falls back rather than showing nothing.
  assert.equal(resolveLanguage({ stored: null, profile: 'es', shipped }), 'en')
  // pt_BR should find pt when that is what ships, rather than falling to en.
  assert.equal(
    resolveLanguage({ stored: null, profile: 'pt_BR', shipped: [{ code: 'en' }, { code: 'pt' }] }),
    'pt'
  )
  // A stored choice for a language later dropped from the build is ignored.
  assert.equal(resolveLanguage({ stored: 'fr', profile: 'ru', shipped }), 'ru')
  console.log('  kit: language resolves stored → profile → app default')
}

// --- the stale shell check --------------------------------------------
{
  const { scriptsIn } = await import('../src/logic/staleshell.js')
  const hashed = /-[A-Za-z0-9_-]{6,}\.(m?js)$/

  // Vite emits base64url, not hex. An earlier pattern looked for
  // lowercase hex and matched no DHIS2 bundle ever built, so the check
  // silently never fired — the exact failure it exists to catch.
  assert.ok(hashed.test('main-eITxblpH.js'), 'no digits at all, still a hash')
  assert.ok(hashed.test('App-cWMNUEXw.js'))
  assert.ok(!hashed.test('polyfill.js'), 'an unhashed name says nothing')
  assert.equal(scriptsIn('<script src="a.js"></script><script src="b-AbC123xy.js">').size, 2)
  console.log('  kit: the hash pattern matches what Vite actually emits')
}

// --- batching ---------------------------------------------------------
{
  const { chunk, isTooLong, BATCH } = await import('../src/logic/concurrency.js')
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]])
  assert.equal(chunk([], 2).length, 0)
  assert.ok(BATCH > 1 && BATCH <= 500)
  // Tomcat caps the request line at 8KB, so a long id:in:[…] comes back
  // as 414 and the batch has to be split rather than lost.
  assert.equal(isTooLong({ message: 'Request URI too long', details: { httpStatusCode: 414 } }), true)
  assert.equal(isTooLong({ message: 'Conflict', details: { httpStatusCode: 409 } }), false)
  console.log('  kit: batches split on 414 rather than failing')
}

// --- schema -----------------------------------------------------------
{
  const { SchemaService } = await import('../src/logic/schema.js')
  const s = new SchemaService([
    {
      plural: 'dataElements',
      klass: 'org.hisp.dhis.dataelement.DataElement',
      metadata: true,
      properties: [
        { name: 'optionSet', propertyType: 'REFERENCE', klass: 'org.hisp.dhis.option.OptionSet', owner: true, persisted: true },
        { name: 'translations', collection: true, itemPropertyType: 'COMPLEX', embeddedObject: true, owner: true, persisted: true },
      ],
    },
    { plural: 'optionSets', klass: 'org.hisp.dhis.option.OptionSet', metadata: true, properties: [] },
  ])
  // A reference is what the schema says is a reference - never a guess
  // from the shape of a nested id.
  assert.equal(s.isReference('dataElements', 'optionSet'), true)
  assert.equal(s.isReference('dataElements', 'translations'), false, 'embedded, not a reference')
  assert.equal(s.targetType('dataElements', 'optionSet'), 'optionSets')
  assert.equal(s.isMetadataType('dataElements'), true)
  console.log('  kit: references are read from the schema, not guessed')
}

console.log('\nall kit tests passed')

/* ---- a running shell is compared against its OWN document, not a guess ---- */
{
  const { shellIsStale } = await import('../src/logic/staleshell.js')

  const docWith = (srcs) => ({
    baseURI: 'https://x.org/eye-care-ke/apps/metadata-controller/index.html?fresh=1#/export',
    querySelectorAll: () => srcs.map((s) => ({ getAttribute: () => s })),
  })

  const serve = (srcs) => {
    globalThis.fetch = async (url) => {
      // The URL asked for must be this document's own, with query and hash
      // stripped - not a constructed /api/apps/<name>/index.html.
      assert.equal(url, 'https://x.org/eye-care-ke/apps/metadata-controller/index.html')
      return { ok: true, text: async () => srcs.map((s) => `<script src="${s}"></script>`).join('') }
    }
  }

  // Genuinely behind: what runs is a subset of what is served.
  serve(['./main-NEWNEWNE.js', './vendor-AAAAAAAA.js'])
  let r = await shellIsStale('https://x.org/eye-care-ke', 'metadata-controller', docWith(['./vendor-AAAAAAAA.js']))
  assert.equal(r.stale, true, 'a tab missing a served bundle is behind')

  // Current: the same bundles both sides.
  serve(['./main-NEWNEWNE.js'])
  r = await shellIsStale('https://x.org/eye-care-ke', 'metadata-controller', docWith(['./main-NEWNEWNE.js']))
  assert.equal(r.stale, false, 'identical bundles are not stale')

  // Ambiguous: this tab runs something the fetched document does not name.
  // Which is newer cannot be known, so nothing is claimed. This is the case
  // that reported "stale" forever on an instance serving the app from a
  // different path than the one the check used to construct.
  serve(['./main-DBaOIGQO.js'])
  r = await shellIsStale('https://x.org/eye-care-ke', 'metadata-controller', docWith(['./main-CxCgeQ74.js']))
  assert.equal(r.stale, false, 'a difference in both directions is not evidence of being behind')
  assert.equal(r.ambiguous, true, 'and is reported as ambiguous rather than silently ignored')

  delete globalThis.fetch
  console.log('  kit: staleness is measured against the document’s own URL, and refuses to guess')
}
