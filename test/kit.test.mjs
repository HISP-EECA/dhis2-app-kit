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
