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
import { Button, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

import { Tabs } from './ui.jsx'
import LanguageSelect from './LanguageSelect.jsx'
import VersionBanner from './VersionBanner.jsx'
import { useApp } from './context.jsx'

function safeHref(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null
  } catch {
    return null
  }
}

/**
 * Contains unexpected render errors inside a screen or Capture plugin so
 * they show an actionable notice instead of blanking the DHIS2 host page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <NoticeBox error title={i18n.t('Something went wrong')}>
          <div>{String(this.state.error?.message || this.state.error)}</div>
          <div style={{ marginTop: 8 }}>
            <Button small secondary onClick={() => this.setState({ error: null })}>
              {i18n.t('Try again')}
            </Button>
          </div>
        </NoticeBox>
      )
    }
    return this.props.children
  }
}

export default function AppShell({ chrome = true, tabs, current, onTab, profileLocale, actions, children }) {
  const app = useApp()

  if (!chrome) {
    // Inside a host. No frame, no background, no width assumption.
    return (
      <div style={{ fontSize: 14, color: '#212934' }}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, fontSize: 14, color: '#212934' }}>
      <Header app={app} profileLocale={profileLocale} actions={actions} />
      <VersionBanner />
      {tabs?.length > 1 && <Tabs tabs={tabs} current={current} onChange={onTab} />}
      <ErrorBoundary>{children}</ErrorBoundary>
      <Footer app={app} />
    </div>
  )
}

function Header({ app, profileLocale, actions }) {
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
      {/* The organisation and the licence are in the footer, where
          provenance belongs. Repeating the link here was decoration: it
          took the most valuable space on the screen and told the reader
          nothing they needed while working. The header carries only what
          changes what the app does. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 'none' }}>
        {actions}
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
  const orgHref = safeHref(app.org?.url)
  const licenseHref = safeHref(app.licenseUrl)
  return (
    <footer style={{ marginTop: 40, color: '#6e7a8a', fontSize: 13 }}>
      {app.title} {app.version} · {i18n.t('Developed by')}{' '}
      {orgHref ? (
        <a href={orgHref} target="_blank" rel="noopener noreferrer" style={{ color: '#1d5288' }}>
          {app.org.name}
        </a>
      ) : (
        <span>{app.org?.name}</span>
      )}{' '}
      ·{' '}
      {licenseHref ? (
        <a href={licenseHref} target="_blank" rel="noopener noreferrer" style={{ color: '#1d5288' }}>
          {app.license}
        </a>
      ) : (
        <span>{app.license}</span>
      )}
    </footer>
  )
}
