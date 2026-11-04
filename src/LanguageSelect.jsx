/**
 * The language this app is showing, and the ones it could show.
 *
 * DHIS2 resolves d2-i18n from the user's profile locale, which is per
 * user and per instance. An app installed on several instances will meet
 * users whose locale it does not ship: they get the fallback with no
 * explanation and no way to choose. Hence a selector in the app, and
 * hence it shows the ACTIVE language even when nobody has touched it -
 * "why am I seeing English" is then answerable at a glance.
 *
 * Resolution order:
 *   1. a choice made here before, in this browser
 *   2. the user's DHIS2 locale, if this app ships that language
 *   3. the app's first declared locale
 *
 * Stored in localStorage rather than the userDataStore: the profile
 * locale is already the cross-device answer, and this is an override for
 * when that answer is wrong.
 */

import React from 'react'
import i18n from '@dhis2/d2-i18n'

import { useApp } from './context.jsx'
import { resolveLanguage, languageKey } from './logic/language.js'


export default function LanguageSelect({ profileLocale }) {
  const app = useApp()
  const shipped = app.locales || []

  const [lang, setLang] = React.useState(() => {
    let stored = null
    try {
      stored = window.localStorage.getItem(languageKey(app.name))
    } catch {
      /* private window, or storage blocked */
    }
    return resolveLanguage({ stored, profile: profileLocale, shipped })
  })

  React.useEffect(() => {
    i18n.changeLanguage(lang)
  }, [lang])

  function pick(next) {
    setLang(next)
    try {
      window.localStorage.setItem(languageKey(app.name), next)
    } catch {
      /* the choice still applies for this session */
    }
  }

  // One language is not a choice.
  if (shipped.length < 2) return null

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
      <span style={{ color: '#4a5768' }}>{i18n.t('Language')}</span>
      <select
        value={lang}
        onChange={(e) => pick(e.target.value)}
        style={{
          font: 'inherit',
          padding: '4px 6px',
          border: '1px solid #a0aab8',
          borderRadius: 3,
          background: '#fff',
        }}
      >
        {shipped.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
