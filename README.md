# @hisp-eeca/dhis2-app-kit

The shell, the design system and the DHIS2 helpers shared by HISP EECA
applications. One dependency, so that aligning the apps is `npm update` and a
changelog rather than a copy into each of them.

```bash
npm install github:HISP-EECA/dhis2-app-kit#v0.1.0
```

Not on npm yet, so apps depend on the Git tag. The repository is **public**
and ships its compiled `dist/`, so this needs no credential and no build step
in the consuming app — see *Depending on this kit* below before adding it to
one.

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

[`docs/design-basics.md`](docs/design-basics.md). Applications depend on
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

Apps consume this, so a bad release reaches all of them.

```bash
npm test && npm run build
npm version minor && git push --follow-tags
```

`prepublishOnly` runs the build and the tests. Semver is a promise: a changed
prop name or a removed export is **major**, however small it looks.

**`--follow-tags` is the whole point of that second line.** A plain `git push`
sends commits and no tags, and a tag that exists only in your clone is
invisible to everyone: `npm install …#v0.1.0` then fails with

```
npm error The git reference could not be found
npm error command git --no-replace-objects checkout v0.1.0
```

which reads like an npm or a network fault and is neither. Confirm with
`git ls-remote --tags origin` — if the tag is not listed there, nothing else
you try will work.

`dist/` is committed, so whatever the tag points at is what consumers get.
Tag a commit whose `dist/` is current: `npm run build` and check
`git status dist` is clean before tagging.

## Depending on this kit

```jsonc
// package.json
"dependencies": {
  "@hisp-eeca/dhis2-app-kit": "github:HISP-EECA/dhis2-app-kit#v0.1.0"
}
```

Three things that are easy to get wrong, each of which cost an afternoon:

- **The tag must be pushed.** See above. This is the single most likely cause
  of a failing install.
- **`package-lock.json` will say `git+ssh://git@github.com/…`** even though
  you wrote `github:`. That is npm normalising the shorthand, not a problem:
  for a public repository `npm ci` fetches over HTTPS regardless. Verified by
  running `npm ci` with `GIT_SSH_COMMAND=/bin/false` and no credentials.
- **Nothing needs a token.** While the repository was private, CI needed a PAT
  and a `url.…insteadOf` rewrite in every workflow — a credential per app, all
  expiring on the same day. Keeping the kit public is what removes that, and
  it is why it is public.

Local development against an unreleased kit is `npm install ../dhis2-app-kit`,
which writes a `file:` dependency and links the folder. Useful, and **never
commit it**: `file:../dhis2-app-kit` resolves on your machine and nowhere
else. `npm ci` accepts it anywhere, because it creates the symlink without
checking the target exists, so the build is what fails — with a bundler error
naming an unresolved import rather than a missing dependency.

## Why compiled

`dist/` is compiled ESM, not source. A consuming app's bundler does not
transpile `node_modules`, so shipping `.jsx` would make every app add an
exception — and the first one to forget gets an error with no obvious cause.
Peers stay external: bundling a second React is the classic route to "invalid
hook call".
