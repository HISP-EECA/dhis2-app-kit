# @hisp-eeca/dhis2-app-kit

The shell, the design system and the DHIS2 helpers shared by HISP EECA
applications. One dependency, so that aligning the apps is `npm update` and a
changelog rather than a copy into each of them.

```bash
npm install @hisp-eeca/dhis2-app-kit
```

Peers, provided by the app: `react`, `@dhis2/ui`, `@dhis2/app-runtime`,
`@dhis2/d2-i18n`.

## Use

```jsx
import { AppKitProvider, AppShell } from '@hisp-eeca/dhis2-app-kit'

<AppKitProvider app={APP}>
  <AppShell tabs={TABS} current={tab} onTab={setTab} profileLocale={locale}>
    {screen}
  </AppShell>
</AppKitProvider>
```

`APP` is the descriptor: `name`, `title`, `subtitle`, `version`, `icon`, `org`,
`license`, `licenseUrl`, `locales`. **`name` must equal `name` in
`d2.config.js`** — it is what DHIS2 serves the app under, and the version check
fetches `/api/apps/<name>/index.html`. A mismatch 404s and reports "current"
forever, with no error.

Take `name` and `version` from the platform rather than writing them out:

```js
name: process.env.REACT_APP_DHIS2_APP_NAME,
version: process.env.REACT_APP_DHIS2_APP_VERSION,
```

## Capture plugins

```jsx
<AppShell chrome={false}>
```

No header, no tabs, no footer, no page background, no width assumption. A
plugin renders inside Capture and must not fight the host.

## What is in it

| | |
| --- | --- |
| **Shell** | `AppShell`, `AppKitProvider`, `LanguageSelect`, `VersionBanner` |
| **Layout** | `Card`, `Section`, `SectionTitle`, `Step`, `Steps`, `Tabs`, `Hint` |
| **Rows** | `Collapsible`, `ItemRow`, `SelectionBar`, `TextAction` |
| **Progress** | `useProgress`, `BusyScreen`, `ProgressLog`, `LogPanel` |
| **`/logic`** | `SchemaService`, `queryInBatches`, `mapLimit`, `chunk`, `shellIsStale`, `probeShell`, `forceFresh`, `resolveLanguage` |

`/logic` is React-free — plain functions over plain objects, `engine` passed in
rather than imported — which is why `npm test` runs in plain node with no
browser, no jsdom and no renderer.

## Read before changing anything

[`docs/design-basics.md`](docs/design-basics.md). Ten applications depend on
these decisions; keeping them aligned is the point of the package. If an app
needs a component the kit does not have, the kit probably needs it.

Two rules that cost real time to learn:

- **No colon inside a translatable string.** i18next reads `:` as a namespace
  separator and the platform's scanner leaves `nsSeparator` at its default, so
  the string is silently truncated there and the remainder never reaches the
  catalogue.
- **`ok` has to be asked for.** A mistyped notice level must not fall through
  to a green tick. A 500 announced with a tick is worse than no message.

## Releasing

Ten apps consume this, so a bad release reaches all of them.

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
