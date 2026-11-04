/**
 * The frame every screen sits inside.
 *
 * A wrapper, deliberately — not a base class, and not something each
 * screen draws for itself. A screen knows nothing about the header, the
 * tabs or the footer, which is the only reason `chrome={false}` can work.
 *
 * CAPTURE PLUGINS
 *
 * A plugin renders inside the Capture app. It must not draw a second
 * header, must not set a page background, must not assume full width and
 * must not scroll the host. `chrome={false}` suppresses all of that and
 * leaves only the content, at whatever width it is given.
 *
 * This has to exist from the first commit. Adding it later means touching
 * every screen in the app.
 *
 * Tier: KEEP IN STEP.
 */

import React from 'react'
import i18n from '@dhis2/d2-i18n'

import { Tabs } from './ui.jsx'
import LanguageSelect from './LanguageSelect.jsx'
import VersionBanner from './VersionBanner.jsx'
import { useApp } from './context.jsx'

export default function AppShell({ chrome = true, tabs, current, onTab, profileLocale, children }) {
  const app = useApp()

  if (!chrome) {
    // Inside a host. No frame, no background, no width assumption.
    return <div style={{ fontSize: 14, color: '#212934' }}>{children}</div>
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, fontSize: 14, color: '#212934' }}>
      <Header app={app} profileLocale={profileLocale} />
      <VersionBanner />
      {tabs?.length > 1 && <Tabs tabs={tabs} current={current} onChange={onTab} />}
      {children}
      <Footer app={app} />
    </div>
  )
}

function Header({ app, profileLocale }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}
    >
      <img src={app.icon} alt="" width={48} height={48} style={{ flex: 'none', borderRadius: 4 }} />
      <div style={{ flex: 1, minWidth: 220 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{app.title}</h1>
        <p style={{ margin: '2px 0 0', color: '#4a5768' }}>{i18n.t(app.subtitle)}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 'none' }}>
        <a href={app.org.url} target="_blank" rel="noreferrer" style={{ color: '#1d5288' }}>
          {app.org.name}
        </a>
        <LanguageSelect profileLocale={profileLocale} />
      </div>
    </header>
  )
}

/**
 * Name, version, who built it, licence. Four facts and two links.
 *
 * The version is here and nowhere else. There is no "check for updates"
 * button: the app checks on mount and VersionBanner appears only when the
 * answer is no. See docs/design-basics.md section 8.
 */
function Footer({ app }) {
  return (
    <footer style={{ marginTop: 40, color: '#6e7a8a', fontSize: 13 }}>
      {app.title} {app.version} ·{' '}
      {i18n.t('Developed by')}{' '}
      <a href={app.org.url} target="_blank" rel="noreferrer" style={{ color: '#1d5288' }}>
        {app.org.name}
      </a>{' '}
      ·{' '}
      <a href={app.licenseUrl} target="_blank" rel="noreferrer" style={{ color: '#1d5288' }}>
        {app.license}
      </a>
    </footer>
  )
}
