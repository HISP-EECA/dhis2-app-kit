# Design basics

The conventions a HISP EECA DHIS2 app follows, and why. Written before the
template so the decisions are explicit rather than inherited by copying.

> For step-by-step usage (initializing a new app or Capture plugin from scratch,
> applying the kit to an existing app, considerations, and troubleshooting), see
> [`README.md`](../README.md).

Everything here is drawn from two apps that already work — Metadata Controller
and PI Hell Exit — and the places they disagree are marked as decisions rather
than smoothed over.

---

## 1. The shell

```
┌─────────────────────────────────────────────────────────────┐
│ ▣  App name                       HISP EECA   Language [▾]  │   AppHeader
│    One line saying what it does                             │
├─────────────────────────────────────────────────────────────┤
│  Run    Settings    Schedule    History                     │   Tabs
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   (the current tab)                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  App name 0.11.0 · Developed by HISP EECA · BSD-3-Clause    │   AppFooter
└─────────────────────────────────────────────────────────────┘
```

**The shell is a wrapper, not a base class.** `<AppShell>` renders the header,
tabs and footer around whatever it is given. A screen knows nothing about it.

That is what makes the plugin case work:

```jsx
<AppShell chrome={false}>   // capture plugin: no header, no tabs, no footer
```

A plugin renders inside Capture. It must not draw a second header, must not
set a page background, must not assume full width, and must not scroll the
host. `chrome={false}` suppresses all of it and constrains the content to the
width it is given. **This has to exist from the first commit** — adding it later
means touching every screen.

### Header

| Part | Rule |
| --- | --- |
| Icon | 48px, square, from `assets/icon.svg` |
| Title | The app's `title` from `d2.config.js`, 22px / 600 |
| Subtitle | One line, what the app does. Not a slogan |
| Right | Organisation link, then the language selector |

### Footer

```
PI Hell Exit 0.11.0 · Developed by HISP EECA · BSD-3-Clause
```

Version from `package.json` at build time. Both "HISP EECA" and the licence
are links — to the organisation, and to `LICENSE` in the app's repository.

---

## 2. Navigation: tabs or steps, never both at one level

The two existing apps chose differently, and both were right for what they do.

**Tabs** are *modes*. Independent, re-enterable in any order, no progression.
Run · Settings · Schedule · History. Text with an underline on the active tab —
not toggled buttons.

> Metadata Controller currently uses toggled `Button`s for Export / Import.
> That was a shortcut. Tabs are the correct control and the template uses them.

**Steps** are a *sequence*. Select → Required → Review → Export. Rendered as a
breadcrumb, with the current step in bold. A step is only reachable once the
one before it has produced something.

A screen inside a tab may have steps. A step never contains tabs.

---

## 3. Containers

| Container | When |
| --- | --- |
| **Card** — white, 1px `#e8edf2`, 4px radius, 20px padding | A numbered stage that is visible at the same time as its siblings: *1. Select · 2. Check · 3. Write* |
| **Section** — a heading and a rule, no box | A list or a finding. Boxes around every list make a page of frames |
| **Collapsible** | Anything over about a dozen rows, or anything secondary |

Cards carry **numbered stages**; sections carry **content**. The mistake to
avoid is boxing everything, which is where PI Hell Exit's Run tab is close to
the limit and Metadata Controller went the other way on purpose.

---

## 4. Rows and lists

One row shape, everywhere, as established in Metadata Controller:

```
[▸] [✓] chip  Label  note                                        count
        secondary line, muted
```

- The disclosure triangle is leftmost and always means the same thing.
- A checkbox appears only where the whole group can be chosen; tri-state so a
  partly-chosen group reads correctly while shut.
- A row offers a checkbox **or** an action, never both. A row with a tick and a
  button is a row where nobody knows which one commits.
- Counts are right-aligned and tabular so a column of them lines up.

### Selection lists

The pattern from PI Hell Exit, which is better than anything in Metadata
Controller and becomes the standard:

```
filter: name or code                                       [            ]
Selected 1 of 12 · select shown · clear all · ☐ only selected
```

- A filter box above the list, matching name and code.
- A count, then **text actions**, separated by `·`.
- `only selected` as a checkbox, so a long list can be read down to the choice.
- The selected row takes a light blue background, not a border.

---

## 5. Buttons and text actions

| Control | Use | Looks like |
| --- | --- | --- |
| **Primary button** | The one action that moves the screen forward. One per card | Solid, dark blue |
| **Secondary button** | An alternative at the same level | Outlined |
| **Destructive button** | Removes something | Solid red, and never the primary |
| **Text action** | Bulk operations scoped to the list it sits above — *select shown*, *clear all* | Link-styled, in the count line |
| **Disabled** | Never without saying why | Greyed, with the reason in the line below |

A disabled button with no explanation is the single most common failure in
these apps. *"Run the check first."* under a greyed button costs one line and
removes a support question.

---

## 6. Prompts, findings and verdicts

Every message answers three things: **what was found, what it means, what to
do.** Nothing else.

| Level | Meaning |
| --- | --- |
| `ok` | Nothing to decide |
| `warning` | Something to read before continuing |
| `error` | Blocked — and the text says what unblocks it |

Two rules learned the hard way:

- **`ok` has to be asked for.** A mistyped level must not fall through to a
  green tick. A 500 announced with a tick is worse than no message.
- **A verdict with an empty list renders nothing.** "Export blocked: 0
  unresolved references" is not a sentence anybody can act on.

### Register

Formal, instructional, no metaphor. Keep the instruction, cut the reasoning.

> ~~Not choices — each one is here because something you ticked needs it.
> Worth reading anyway: this is where a stale reference shows itself.~~
>
> Each of the following objects is referenced by your selection. Review for
> stale references or mis-scoped objects.

**Never put a colon inside a translatable string.** i18next reads `:` as a
namespace separator and the platform's scanner leaves `nsSeparator` at its
default, so the string is silently truncated there and the rest never reaches
the catalogue. Use a full stop or an em dash. This cost 21 broken messages in
Metadata Controller before anyone noticed.

---

## 7. Progress

One hook, one component, every long operation:

```
Reading version payloads                    step 3/9
  ✓ Version_101                                   ok
  ✓ Version_102                                   ok
  · Version_103                           119 / 756
```

Finished steps freeze with a tick; one counting line moves. A single line that
rewrites itself cannot be read — by the time you have taken in what it says it
says something else, and a counter restarting looks like the work restarting.

A dark panel is for **log output the app did not write** — server responses,
SQL, import reports. Not for progress.

---

## 8. Version and freshness

**The version number lives in the footer. There is no check button.**

On mount the app compares the scripts it is running against the scripts its own
`index.html` names. If they match, nothing is shown — the footer version is the
whole of it. If they do not:

```
⚠ You are running an older version of this app
  A newer build is installed on this server, but this tab loaded a cached copy.
  [ Load the current version ]   [ Why? ]
```

**Why?** opens the diagnostic — `Cache-Control`, `Age`, service workers, which
bundle is running versus served. That belongs behind a banner that only appears
when something is wrong, not as a permanent panel.

> **Decision taken:** this checks whether the tab is running the build *the
> server holds*. Whether the *installed app* is the newest release that exists
> is a different check, needs a release manifest, and is out of scope here.

---

## 9. Language

The app carries its own selector. DHIS2 resolves `d2-i18n` from the user's
profile locale, which is per-user and per-instance — so an app installed on
five instances will meet users whose UI locale is one the app does not ship,
and they get English with no explanation and no way to choose.

```
Language [ English ▾ ]
          English
          Русский
```

Rules:

1. **Default to the user's DHIS2 locale** when the app ships that language.
2. Otherwise fall back to the app's default, and **show which language is
   active** — that is the whole point, visible without opening a menu.
3. The dropdown lists **only languages the app actually ships**, read from the
   locales bundled at build time. Never a list of world languages.
4. A choice overrides the profile for this app only, and nothing else.

> **Open decision — where the choice is stored.** `localStorage` is simple and
> per-browser; `userDataStore` follows the user between browsers but costs a
> request on every load. Recommendation: `localStorage`, because the profile
> locale is already the cross-device answer and this is an override for the
> case where that answer is wrong.

---

## 10. Tokens

```
Text            #212934   primary
                #4a5768   supporting
                #6e7a8a   muted, counts, metadata
Rule            #e8edf2
Chip            #f3f5f7 background, #4a5768 text, 3px radius, 12px mono
Selected row    #f0f6ff
Log panel       #1e2832 background
Radius          4px
Gutter          8px between controls, 16px between blocks, 24px between sections
```

Type: 22/600 app title · 20/600 step · 15/600 section · 14 body · 13 secondary.

Colours for state come from `@dhis2/ui` (`NoticeBox`, `Button`) and are not
redefined here. The tokens above are only for what `@dhis2/ui` does not cover.

---

## 11. Code shape

Carried from Metadata Controller unchanged, because it is why the hard bugs
were found by tests rather than screenshots:

- `src/logic/` is **React-free**. Plain functions over plain objects. No hooks,
  no components, no import from the UI.
- `npm run test:logic` runs in plain node — no browser, no jsdom, no renderer.
- The cost is that UI-held caches are passed in as plain `Map`s rather than
  living in hooks. Worth it.

---

## Decisions still open

1. **Where the language choice is stored** — recommendation above, needs a yes.
2. **How fixes to shared components reach apps already built from the
   template** — copy and drift, an npm package, or copy with a named list of
   "keep in step" files. This is hard to retrofit and should be settled before
   the second app is built.
3. **Whether the template ships `concurrency.js` and `schema.js`** — both are
   needed by any app that queries many UIDs or reads metadata, and neither is
   specific to one app.
