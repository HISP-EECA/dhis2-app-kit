/**
 * What the kit needs to know about the app around it.
 *
 * Passed in rather than imported, because the kit cannot import from the
 * app that depends on it. One provider at the root, read by the shell,
 * the footer, the language selector and the version check.
 */

import React from 'react'

const Ctx = React.createContext(null)

/**
 * @param app.name        the `name` from d2.config.js — what DHIS2 serves
 *                        the app under, which the version check needs
 * @param app.title       display name
 * @param app.subtitle    one line, what the app does
 * @param app.version     from package.json, baked at build time
 * @param app.icon        URL or imported asset
 * @param app.org         {name, url}
 * @param app.license     e.g. 'BSD-3-Clause'
 * @param app.licenseUrl  where the licence text lives
 * @param app.locales     [{code, label}] — ONLY what the app ships
 */
export function AppKitProvider({ app, children }) {
  const value = React.useMemo(
    () => ({
      license: 'BSD-3-Clause',
      org: { name: 'HISP EECA', url: 'https://hispeeca.org/' },
      locales: [{ code: 'en', label: 'English' }],
      ...app,
    }),
    [app]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = React.useContext(Ctx)
  if (!v) {
    throw new Error('Wrap the app in <AppKitProvider app={…}> — see @hisp-eeca/dhis2-app-kit')
  }
  return v
}
