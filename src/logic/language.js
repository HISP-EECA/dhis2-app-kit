/**
 * Which language the app shows, and why.
 *
 * Pure, so it can be tested without a browser — and because the rule is
 * the part worth getting right, not the <select> around it.
 *
 *   1. a choice made in this app before, in this browser
 *   2. the user's DHIS2 locale, if this app ships that language
 *   3. the base of that locale (pt_BR → pt), if that ships
 *   4. the app's first declared locale
 *
 * Step 3 matters more than it looks: DHIS2 profile locales are regional
 * far more often than app translations are.
 */
export function resolveLanguage({ stored, profile, shipped }) {
  const has = (c) => (shipped || []).some((l) => l.code === c)
  if (stored && has(stored)) return stored
  if (profile && has(profile)) return profile
  const base = String(profile || '').split(/[-_]/)[0]
  if (base && has(base)) return base
  return shipped?.[0]?.code || 'en'
}

/** Where a choice is kept: this browser, for this app only. */
export const languageKey = (appName) => `${appName}.lang`
