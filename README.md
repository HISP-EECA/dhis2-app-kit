# @hisp-eeca/dhis2-app-kit

The shell, the design system and the DHIS2 helpers shared by HISP EECA
applications. One dependency, so that aligning the apps is `npm update` and a
changelog rather than a copy into each of them.

```bash
npm install @hisp-eeca/dhis2-app-kit
```

Peers, provided by the app: `react` (`>=17`), `@dhis2/ui` (`>=9`),
`@dhis2/app-runtime` (`>=3.9`), `@dhis2/d2-i18n` (`>=1.1`).

---

## What is in it

The package exposes two entry points:

- **`@hisp-eeca/dhis2-app-kit`** — React shell, layout components, row/selection controls, and progress machinery.
- **`@hisp-eeca/dhis2-app-kit/logic`** — React-free functions and classes (`engine` passed in rather than imported), testable in plain Node with no browser, no jsdom, and no renderer.

| Category | Exports | Purpose |
| --- | --- | --- |
| **Shell** | `AppKitProvider`, `useApp`, `AppShell`, `LanguageSelect`, `VersionBanner` | Standard header, language switcher, stale-build detector, navigation tabs, and provenance footer. |
| **Layout** | `Card`, `Section`, `SectionTitle`, `Step`, `Steps`, `Tabs`, `Hint` | Page structure: mode tabs, sequential step breadcrumbs, numbered stage cards, and unboxed content sections. |
| **Rows & Lists** | `Collapsible`, `ItemRow`, `SelectionBar`, `TextAction`, `ACTION_CELL` | Unified disclosure groups, metadata item rows (checkbox or action, never both), and bulk selection controls. |
| **Progress** | `useProgress`, `BusyScreen`, `ProgressLog`, `LogPanel` | Multi-step progress log where completed steps freeze with `✓` and the active step counts live, plus dark panel for server logs. |
| **`/logic`** | `SchemaService`, `ALWAYS_STRIP`, `LOCAL_CONTEXT_FIELDS`, `USER_LOCAL_FIELDS`, `queryInBatches`, `mapLimit`, `chunk`, `isTooLong`, `BATCH`, `LIMIT`, `shellIsStale`, `probeShell`, `readCacheHeaders`, `forceFresh`, `scriptsIn`, `clearStaleWorkers`, `resolveLanguage`, `languageKey` | Live `/api/schemas` inspection (with synthetic fallbacks for 2.40–2.42), concurrent UID batching with automatic HTTP 414 splitting, cache/service-worker probing, and locale resolution. |

---

## 1. Starting from Scratch (New DHIS2 App or Capture Plugin)

### Step 1.1: Initialize a Standard DHIS2 Application

Scaffold a new application using the DHIS2 App Platform CLI:

```bash
npx @dhis2/cli-app-scripts init my-dhis2-app
cd my-dhis2-app
```

Configure `d2.config.js` at the root of your new project. Make sure `name` and `title` are set explicitly:

```js
// d2.config.js
const config = {
  type: 'app',
  name: 'my-dhis2-app',
  title: 'My DHIS2 App',
  description: 'One line describing what this app does',
  entryPoints: {
    app: './src/App.jsx',
    // If the app also ships a Capture plugin:
    // plugin: './src/Plugin.jsx',
  },
}

module.exports = config
```

### Step 1.2: Install `@hisp-eeca/dhis2-app-kit`

Install the kit alongside your app's peer dependencies:

```bash
npm install @hisp-eeca/dhis2-app-kit @dhis2/ui
```

*(If testing local changes from a checkout of `dhis2-app-kit`, run `npm run build` in the kit repo first, then `npm install /path/to/dhis2-app-kit` in your app.)*

### Step 1.3: Wire `AppKitProvider` and `AppShell`

Wrap your root component in `<AppKitProvider app={APP}>` and `<AppShell>`.

`APP` is the descriptor object:
- `name` (**must equal `name` in `d2.config.js`** — DHIS2 serves the app under `/api/apps/<name>/index.html`, which the stale-version check fetches)
- `version` (from `package.json` via the platform environment variable)
- `title`, `subtitle`, `icon`
- `org` (`{ name, url }`, defaults to HISP EECA)
- `license`, `licenseUrl` (defaults to `'BSD-3-Clause'`)
- `locales` (`[{ code, label }]` — list **only** the languages your app actually ships)

Take `name` and `version` directly from the DHIS2 App Platform environment variables so they never drift:

```jsx
// src/App.jsx
import React, { useState } from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { AppKitProvider, AppShell } from '@hisp-eeca/dhis2-app-kit'
import icon from './assets/icon.svg'
import RunScreen from './screens/RunScreen.jsx'
import SettingsScreen from './screens/SettingsScreen.jsx'

const APP = {
  name: process.env.REACT_APP_DHIS2_APP_NAME,
  version: process.env.REACT_APP_DHIS2_APP_VERSION,
  title: 'My DHIS2 App',
  subtitle: 'Audits and repairs indicator references across programmes',
  icon,
  license: 'BSD-3-Clause',
  licenseUrl: 'https://github.com/hisp-eeca/my-dhis2-app/blob/main/LICENSE',
  locales: [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
  ],
}

const ME_QUERY = {
  me: {
    resource: 'me',
    params: { fields: 'settings[keyUiLocale]' },
  },
}

export default function App() {
  const [tab, setTab] = useState('run')
  const { loading, data } = useDataQuery(ME_QUERY)

  if (loading) return null

  const profileLocale = data?.me?.settings?.keyUiLocale
  const tabs = [
    ['run', i18n.t('Run')],
    ['settings', i18n.t('Settings')],
  ]

  return (
    <AppKitProvider app={APP}>
      <AppShell
        tabs={tabs}
        current={tab}
        onTab={setTab}
        profileLocale={profileLocale}
      >
        {tab === 'run' ? <RunScreen /> : <SettingsScreen />}
      </AppShell>
    </AppKitProvider>
  )
}
```

### Step 1.4: Build Screens with Kit UI Components

Build screens out of `Card` (numbered stages), `Section` (unboxed lists/findings), `SelectionBar`, `Collapsible`, `ItemRow`, and `useProgress` / `BusyScreen`:

```jsx
// src/screens/RunScreen.jsx
import React, { useState } from 'react'
import { useDataEngine } from '@dhis2/app-runtime'
import { Button } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import {
  Card,
  Section,
  SelectionBar,
  Collapsible,
  ItemRow,
  Hint,
  BusyScreen,
  useProgress,
} from '@hisp-eeca/dhis2-app-kit'
import { runAudit } from '../logic/audit.js'

export default function RunScreen({ candidates = [] }) {
  const engine = useDataEngine()
  const progress = useProgress()
  const [selected, setSelected] = useState(new Set())
  const [onlySelected, setOnlySelected] = useState(false)

  if (progress.busy) {
    return <BusyScreen {...progress} />
  }

  const visible = onlySelected
    ? candidates.filter((c) => selected.has(c.id))
    : candidates

  const toggleOne = (id, checked) => {
    const next = new Set(selected)
    checked ? next.add(id) : next.delete(id)
    setSelected(next)
  }

  const handleRun = async () => {
    progress.say(i18n.t('Starting audit…'))
    try {
      await runAudit(engine, [...selected], progress.step)
    } finally {
      progress.say(null)
    }
  }

  return (
    <>
      <Card step={1} title={i18n.t('Select indicators')}>
        <SelectionBar
          selected={selected.size}
          total={candidates.length}
          onSelectShown={() => setSelected(new Set(visible.map((c) => c.id)))}
          onClearAll={() => setSelected(new Set())}
          onlySelected={onlySelected}
          onOnlySelected={setOnlySelected}
        />

        <Section title={i18n.t('Indicators')}>
          <Collapsible
            tag="indicators"
            label={i18n.t('All indicators')}
            count={`${selected.size} / ${candidates.length}`}
            checked={selected.size > 0 && selected.size === candidates.length}
            indeterminate={selected.size > 0 && selected.size < candidates.length}
            onCheck={(checkAll) =>
              setSelected(checkAll ? new Set(candidates.map((c) => c.id)) : new Set())
            }
            open
          >
            {visible.map((item) => (
              <ItemRow
                key={item.id}
                tag="indicators"
                label={item.name}
                uid={item.id}
                meta={item.code}
                checked={selected.has(item.id)}
                onCheck={(c) => toggleOne(item.id, c)}
              />
            ))}
          </Collapsible>
        </Section>
      </Card>

      <Card step={2} title={i18n.t('Run check')}>
        <Button primary disabled={selected.size === 0} onClick={handleRun}>
          {i18n.t('Run audit')}
        </Button>
        {selected.size === 0 && (
          <Hint style={{ marginTop: 8 }}>
            {i18n.t('Select at least one indicator above first.')}
          </Hint>
        )}
      </Card>
    </>
  )
}
```

### Step 1.5: Write React-Free Business Logic with `/logic`

Keep your domain logic in `src/logic/` with no React imports, using `@hisp-eeca/dhis2-app-kit/logic`:

```js
// src/logic/audit.js
import { SchemaService, queryInBatches } from '@hisp-eeca/dhis2-app-kit/logic'

export async function runAudit(engine, uids, onStep) {
  onStep?.({ stage: 'Reading schemas', detail: 'schemas', step: 1, steps: 2 })
  const schemas = await SchemaService.load(engine)

  // Verify what target type a nested path points to
  const target = schemas.targetTypeForPath('maps', 'mapViews.dataDimensionItems.indicator')
  // -> 'indicators'

  // Fetch UIDs in batches of 250 with 8 concurrent requests; auto-splits on HTTP 414
  const records = await queryInBatches(engine, {
    resource: 'indicators',
    fields: 'id,name,numerator,denominator',
    uids,
    filterFor: (batch) => `id:in:[${batch.join(',')}]`,
    onProgress: ({ done, total }) =>
      onStep?.({
        stage: 'Fetching indicators',
        detail: 'indicators',
        step: 2,
        steps: 2,
        done,
        total,
      }),
  })

  return records
}
```

### Step 1.6: Capture Plugins (`chrome={false}`)

When building a plugin that renders inside the DHIS2 Capture app, pass `chrome={false}` to `<AppShell>`:

```jsx
// src/Plugin.jsx
import React from 'react'
import { AppKitProvider, AppShell } from '@hisp-eeca/dhis2-app-kit'
import PluginContent from './screens/PluginContent.jsx'

const APP = {
  name: process.env.REACT_APP_DHIS2_APP_NAME,
  version: process.env.REACT_APP_DHIS2_APP_VERSION,
  title: 'My Capture Plugin',
}

export default function Plugin(props) {
  return (
    <AppKitProvider app={APP}>
      <AppShell chrome={false}>
        <PluginContent {...props} />
      </AppShell>
    </AppKitProvider>
  )
}
```

`chrome={false}` strips the header, tabs, footer, page padding, and `1100px` width limit so the plugin embeds cleanly inside the Capture host without adding a second frame or scroll container.

---

## 2. Applying to an Existing App

### Is It Convenient to Apply to an Existing Development?

Installing `@hisp-eeca/dhis2-app-kit` **will not break an existing app**: it ships no global CSS, has `"sideEffects": false`, and keeps React and `@dhis2/*` as external peer dependencies.

However, whether you should adopt the **full kit** or **only parts of it** depends on the existing app's architecture:

| Existing App Type | Recommended Adoption | Why |
| --- | --- | --- |
| **New app / early prototype** | **Full kit (`AppShell` + UI + `/logic`)** | Zero rework; Capture plugin compatibility (`chrome={false}`) and layout rules are in place from commit 1. |
| **Actively maintained HISP EECA utility app** (wizards, metadata tools, checkers, importers) | **Phased adoption** (`/logic` + `AppShell` first, then screens incrementally) | Gives immediate visual alignment (header, language selector, stale-version banner, footer) and safe API batching without rewriting working screens upfront. |
| **Legacy / feature-complete app or wide-viewport dashboard** (large multi-column spreadsheets, full-screen maps) | **Adopt `/logic` only** (skip `AppShell` and `ItemRow`) | `<AppShell>` constrains width to `1100px` and `ItemRow` is designed for single-column disclosure lists rather than wide multi-column data grids. |

### Phased Migration Guide for Existing Apps

1. **Phase 1 — Adopt `/logic` (Zero UI impact):**
   Replace custom `id:in:[...]` loops, concurrency limiters, or hardcoded schema checks with `@hisp-eeca/dhis2-app-kit/logic` (`queryInBatches`, `SchemaService`, `mapLimit`, `chunk`).
2. **Phase 2 — Wrap Root in `AppKitProvider` + `AppShell`:**
   In `src/App.jsx`, replace your custom header, top-level mode buttons, and footer with `<AppKitProvider app={APP}><AppShell ...>`. Remove any outer wrapper padding or duplicate `i18n.changeLanguage` effects in `App.jsx` so `<AppShell>` and `<LanguageSelect>` manage them cleanly.
3. **Phase 3 — Migrate Screens Incrementally:**
   Keep existing screen internals untouched initially. As you touch individual screens for features or bugfixes, replace custom accordions with `Collapsible` + `ItemRow`, selection counters with `SelectionBar`, and ad-hoc loading spinners with `useProgress` + `BusyScreen`.

---

## 3. Considerations & Design Rules

Read [`docs/design-basics.md`](docs/design-basics.md) before modifying components or designing new screens. Applications depend on these rules to stay aligned:

1. **No colon (`:`) inside a translatable string:**
   `i18next` treats `:` as a namespace separator and the DHIS2 platform's scanner leaves `nsSeparator` at its default. A string like `i18n.t('Export blocked: 3 errors')` is silently truncated at the colon and never reaches the translation catalogue. Use a full stop (`.`) or an em dash (`—`) instead.
   > **Note for existing apps:** Changing English source strings to remove `:` will invalidate matching keys in existing `i18n/*.po` files until you update those keys in the `.po` files as well.
2. **`ok` notice level has to be asked for explicitly:**
   Never default an unknown or mistyped notice status to a green tick (`ok`). A 500 error announced with a green tick is worse than no message.
3. **Navigation: `Tabs` or `Steps`, never both at one level:**
   - `Tabs` are independent modes that can be entered in any order (*Run · Settings · History*).
   - `Steps` are a strict sequence (*Select › Required › Review › Export*).
   - A screen inside a tab may contain `Steps`; a `Step` never contains `Tabs`.
4. **Containers: `Card` vs. `Section`:**
   - Use `Card` only for **numbered stages** visible at the same time on a page (*1. Select · 2. Check · 3. Write*).
   - Use `Section` (heading + rule, no box) for lists and findings so pages do not turn into boxes inside boxes.
5. **One row shape (`Collapsible` + `ItemRow`):**
   An `ItemRow` offers a checkbox **or** an action button, never both on the same row.
6. **Disabled buttons require an explanation:**
   Never render a disabled primary button without a `<Hint>` line below it explaining what unblocks it (e.g., *"Run the check first."*).
7. **Layout width & Capture plugins:**
   `<AppShell>` sets `maxWidth: 1100` and `padding: 24`. Individual screens must not set their own page background, `100vw` width, or full-page scroll containers—otherwise `<AppShell chrome={false}>` cannot embed cleanly inside Capture.
8. **Keep `src/logic/` React-free:**
   Pass `engine` and plain `Map`/object caches into functions in `src/logic/` rather than storing them in React hooks, so `node test/...` runs directly in Node without a browser.

---

## 4. Troubleshooting

### `VersionBanner` never warns even when a newer version is uploaded
- **Cause:** `APP.name` passed to `<AppKitProvider app={APP}>` does not match the `name` field in `d2.config.js` (or the app is running in development mode with unhashed script filenames).
- **Fix:** Set `name: process.env.REACT_APP_DHIS2_APP_NAME` in `APP` and ensure `d2.config.js` has `name` set to the exact slug DHIS2 serves under `/api/apps/<name>/index.html`. When `APP.name` mismatches, `/api/apps/<name>/index.html` returns 404 and `shellIsStale` safely reports `{ stale: false }`.

### `LanguageSelect` dropdown does not appear in the header
- **Cause:** `APP.locales` has fewer than 2 entries (or was omitted, defaulting to `[{ code: 'en', label: 'English' }]`).
- **Fix:** Pass all shipped locales in `APP.locales`, e.g. `locales: [{ code: 'en', label: 'English' }, { code: 'ru', label: 'Русский' }]`. A single language is not a choice, so `LanguageSelect` intentionally renders `null`.

### Selecting a language in `LanguageSelect` does not update some strings on screen
- **Cause:** Translated strings (`i18n.t(...)`) were evaluated once at module load time (outside React components), or the component tree did not re-render after `i18n.changeLanguage(lang)`.
- **Fix:** Always call `i18n.t(...)` inside your component render functions, not in top-level module constants.

### `Invalid hook call` or bundler syntax error when developing locally with `npm link` / `file:`
- **Cause:** Importing uncompiled `.jsx` source or resolving a second copy of `react` from `dhis2-app-kit/node_modules`.
- **Fix:**
  1. Run `npm run build` inside `dhis2-app-kit` so `dist/` is up to date (consuming apps import `dist/`, which is pre-compiled ESM with externalized peers).
  2. If using `npm link`, deduplicate React in the consuming app (`npm dedupe`) or pack the tarball (`npm pack` in `dhis2-app-kit`, then `npm install ./hisp-eeca-dhis2-app-kit-0.1.0.tgz` in the app).

### `414 Request-URI Too Large` when querying many metadata UIDs
- **Cause:** Building a manual `filter=id:in:[...]` query with hundreds of UIDs exceeds Tomcat's default 8 KB HTTP header/URI limit.
- **Fix:** Use `queryInBatches` from `@hisp-eeca/dhis2-app-kit/logic`. It batches 250 UIDs at a time with 8 concurrent requests and automatically splits a batch in half and retries whenever the server returns HTTP `413`, `414`, or `431`.

### Missing `mapViews` dependencies or false-positive broken references on DHIS2 2.40–2.42
- **Cause:** DHIS2 2.40 through 2.42 do not publish a schema for `mapView` in `/api/schemas`, and embedded objects like `programStageDataElements` or `dashboardItems` carry `id` fields that are not external metadata references.
- **Fix:** Always load schemas via `await SchemaService.load(engine)` and check `schemas.isReference(plural, field)` and `schemas.targetTypeForPath(plural, path)` instead of guessing references from object shapes. `SchemaService` injects the synthetic `mapView` schema when the server omits it.

---

## Releasing

Apps consume this, so a bad release reaches all of them.

```bash
npm test && npm run build
npm version minor && git push --follow-tags
```

`prepublishOnly` runs the build and the tests. Semver is a promise: a changed
prop name or a removed export is **major**, however small it looks.

## Why compiled

`dist/` is compiled ESM, not source. A consuming app's bundler does not
transpile `node_modules`, so shipping `.jsx` would make every app add an
exception — and the first one to forget gets an error with no obvious cause.
Peers stay external: bundling a second React is the classic route to "invalid
hook call".
