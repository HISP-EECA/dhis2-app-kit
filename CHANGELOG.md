# Changelog

A record of notable changes to `@hisp-eeca/dhis2-app-kit` and what each change means in practice for DHIS2 applications and their users.

## Unreleased

### Safety and Reliability

- **Isolated cache clearing when refreshing an outdated app:** Clicking "Load the current version" in the update banner now clears only cached files belonging to the current app, rather than clearing cached data across the entire DHIS2 site. Offline data and cached files belonging to other DHIS2 apps (such as Capture or Data Entry) remain untouched.
- **Exact app matching for background workers and update checks:** Update checks and background worker cleanup now validate and encode the app name and match the exact app path. This prevents one app from accidentally interfering with another app whose name starts with the same word, and avoids unnecessary failed requests if an app name is missing.
- **Safer footer links:** Organization and license links in the app footer now allow only standard web addresses (`http` and `https`) and open safely in a new tab. If a license link is not provided, the license name is displayed as plain text instead of a broken link.
- **Automatic screen error protection (`ErrorBoundary`):** Every screen rendered inside `AppShell` (including Capture plugins) is now wrapped in an error boundary. If an unexpected problem occurs on one screen, users see a clear error message with a "Try again" button instead of a blank white page.
- **Safer automated publishing and testing:** GitHub Actions workflows now restrict permissions to read-only by default, pass release tag names through environment variables instead of direct script interpolation, and verify that the compiled `/logic` package loads cleanly on every build.

### Bug Fixes

- **Restored card and tab borders:** Fixed a formatting bug that caused browsers to hide the outer border on numbered `Card` stages and the bottom divider line under `Tabs`.
- **Automatic language sync when user profiles load asynchronously:** The language selector now updates automatically once the user's DHIS2 profile language finishes loading, rather than staying stuck on the default language when the app renders immediately.
- **Clean builds before publishing:** Running `npm run build` now clears old files in `dist/` first so renamed or removed files are never accidentally included in a release.

### New Capabilities and Documentation

- **Built-in `Verdict` notice component:** Added a `Verdict` component that enforces two core safety rules automatically: green "ok" messages must be requested explicitly (unknown or mistyped statuses show as errors), and a notice with an empty item list stays hidden.
- **Cancellable background data requests:** `queryInBatches` and `mapLimit` now accept an optional `AbortSignal`, allowing apps to stop remaining server requests immediately when a user cancels a long scan or navigates away.
- **Expanded setup, migration, and troubleshooting guide:** Updated `README.md` (and linked it from `docs/design-basics.md`) with step-by-step instructions for starting a new DHIS2 app or Capture plugin from scratch, deciding how to adopt the kit in an existing app, design considerations, and troubleshooting common issues.
