/**
 * Shown only when this tab is behind the build the server holds.
 *
 * There is no "check for updates" button. The check costs one fetch of
 * the app's own index.html on mount, and when the answer is "current"
 * the right amount of interface is none — the version in the footer is
 * the whole of it.
 *
 * The diagnostic (Cache-Control, Age, service workers, which bundle is
 * running) sits behind "Why?", because it is only ever read when
 * something is already wrong.
 */

import React from 'react'
import { useConfig } from '@dhis2/app-runtime'
import { Button, ButtonStrip, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

import { useApp } from './context.jsx'
import { shellIsStale, probeShell, readCacheHeaders, forceFresh } from './logic/staleshell.js'

export default function VersionBanner() {
  const app = useApp()
  const { baseUrl } = useConfig()
  const [stale, setStale] = React.useState(false)
  const [probe, setProbe] = React.useState(null)

  React.useEffect(() => {
    let alive = true
    shellIsStale(baseUrl, app.name).then((r) => alive && setStale(!!r.stale))
    return () => {
      alive = false
    }
  }, [baseUrl, app.name])

  if (!stale) return null

  const headers = probe ? readCacheHeaders(probe) : null

  return (
    <NoticeBox warning title={i18n.t('You are running an older version of this app')}>
      {i18n.t(
        'A newer build is installed on this server, but this tab loaded a cached copy of the old build.'
      )}
      <ButtonStrip style={{ marginTop: 8 }}>
        <Button small primary onClick={() => forceFresh(app.name)}>
          {i18n.t('Load the current version')}
        </Button>
        {!probe && (
          <Button small secondary onClick={async () => setProbe(await probeShell(baseUrl, app.name))}>
            {i18n.t('Why?')}
          </Button>
        )}
      </ButtonStrip>

      {probe && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div>
            <code>{probe.cacheControl || i18n.t('no Cache-Control sent')}</code>
            {probe.age ? (
              <>
                {' · '}
                <code>Age {probe.age}</code>
              </>
            ) : null}
          </div>
          {headers && <div style={{ marginTop: 4 }}>{headers.text}</div>}
          {probe.workers.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {i18n.t('A service worker is registered for this app and can serve its own copy.')}
            </div>
          )}
          <div style={{ marginTop: 4, color: '#6e7a8a', overflowWrap: 'anywhere' }}>
            {i18n.t('running {{- running}} · served {{- serving}}', {
              running: probe.running.join(', ') || '—',
              serving: probe.serving.join(', ') || '—',
            })}
          </div>
        </div>
      )}
    </NoticeBox>
  )
}
