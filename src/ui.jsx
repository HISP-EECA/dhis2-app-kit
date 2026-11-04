/**
 * The shared layout and rows every screen is built from.
 *
 * Read docs/design-basics.md before changing anything here. The short
 * version: cards carry numbered stages, sections carry content, and there
 * is exactly ONE row shape so that the same gesture never looks like two
 * different gestures on two screens.
 *
 * Tier: KEEP IN STEP. Shared between apps; adapting it in one app is
 * legitimate, but say so in the commit.
 */

import React from 'react'
import i18n from '@dhis2/d2-i18n'

/** Muted supporting text. One size, one colour, everywhere. */
export function Hint({ children, style }) {
  if (!children) return null
  return <p style={{ margin: '0 0 8px', color: '#4a5768', ...style }}>{children}</p>
}

/**
 * A step of the flow: the heading the breadcrumb just promised.
 *
 * The title repeats the active breadcrumb word deliberately. The
 * breadcrumb says where you are in the whole; the heading says what this
 * screen is. Dropping it on one side was why Export felt smaller than
 * Import.
 */
export function Step({ title, lead, children }) {
  return (
    <section style={{ marginTop: 4 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{title}</h2>
      <Hint style={{ margin: '0 0 16px' }}>{lead}</Hint>
      {children}
    </section>
  )
}

/** A block within a step. */
export function Section({ title, lead, children, style }) {
  return (
    <section style={{ marginTop: 24, ...style }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{title}</h3>
      <Hint>{lead}</Hint>
      {children}
    </section>
  )
}

/**
 * Where you are, in the steps of whichever half you are in.
 *
 * Both halves have one, drawn the same way, so moving between Export and
 * Import does not feel like moving between two applications.
 */
export function Steps({ steps, current }) {
  return (
    <nav style={{ margin: '4px 0 20px', color: '#6e7a8a', fontSize: 14 }}>
      {steps.map(([key, label], i) => (
        <span key={key}>
          {i > 0 && <span style={{ margin: '0 6px' }}>›</span>}
          <strong style={{ color: key === current ? '#1d2c3b' : undefined, fontWeight: key === current ? 600 : 400 }}>
            {i18n.t(label)}
          </strong>
        </span>
      ))}
    </nav>
  )
}

/**
 * A panel heading on its own, where the panel manages its own spacing.
 *
 * Same size and weight as Section's, so a panel that needed its own
 * wrapper still looks like every other panel.
 */
export function SectionTitle({ children }) {
  return <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{children}</h3>
}

/**
 * The two rows this app is built from.
 *
 * There were five collapsible styles: the candidate list ("41 of 41
 * included", bold, no chip), the finding panels (chip + name + count), the
 * opt-in lists (a bold label and a grid of checkboxes), and two kinds of
 * bare `<details>`. Each was reasonable alone. Together they made the same
 * gesture — open this, choose from it — look like a different gesture on
 * every screen.
 *
 * One shape, with optional parts, covers all of them:
 *
 *     [▸] [✓] chip  Label  note                                  count
 *
 * The disclosure triangle is always leftmost and always means the same
 * thing. The checkbox appears only where the whole group can be chosen,
 * and is tri-state so a partly-chosen group reads correctly while shut.
 * The chip is the DHIS2 type. The count is right-aligned, so a column of
 * them lines up whatever the names do.
 *
 * Inside, every item is an ItemRow with the same anatomy minus the
 * disclosure: a checkbox where the item can be chosen, an action where it
 * can be acted on, never both — a row that offers a tick and a button is a
 * row where nobody knows which one commits.
 */

import { Checkbox, CircularLoader } from '@dhis2/ui'

const RULE = '1px solid #e8edf2'

/** The type chip. Monospace, because these are API names, not prose. */
function TypeTag({ children }) {
  if (!children) return null
  return (
    <code
      style={{
        background: '#f3f5f7',
        borderRadius: 3,
        padding: '1px 6px',
        fontSize: 12,
        color: '#4a5768',
        flex: 'none',
      }}
    >
      {children}
    </code>
  )
}

/**
 * A disclosure row.
 *
 * @param tag        DHIS2 type, as a chip
 * @param label      a name, where the thing has one
 * @param note       a short qualifier after the label
 * @param count      shown right-aligned; a string like "3 of 19" is fine
 * @param checked    present ⇒ the summary carries a checkbox
 * @param indeterminate  partly chosen
 * @param onCheck    called with the new state; the disclosure does not toggle
 */
export function Collapsible({
  tag,
  label,
  note,
  count,
  checked,
  indeterminate,
  onCheck,
  onToggle,
  open,
  children,
}) {
  return (
    <details open={open} onToggle={onToggle} style={{ borderBottom: RULE }}>
      <summary
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 4px',
        }}
      >
        {onCheck && (
          // Stops the click reaching the summary: ticking a group is not
          // the same gesture as opening it, and a tick that also expanded
          // ninety rows would be its own small betrayal.
          <span
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCheck(!checked)
            }}
            style={{ display: 'flex', flex: 'none' }}
          >
            <Checkbox dense checked={!!checked} indeterminate={!!indeterminate} onChange={() => {}} />
          </span>
        )}
        <TypeTag>{tag}</TypeTag>
        {label && <strong style={{ overflowWrap: 'anywhere' }}>{label}</strong>}
        {note && <span style={{ color: '#6e7a8a' }}>{note}</span>}
        <span style={{ flex: 1 }} />
        {count !== undefined && count !== null && (
          <span style={{ color: '#6e7a8a', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
            {count}
          </span>
        )}
      </summary>
      <div style={{ padding: '4px 0 12px 16px' }}>{children}</div>
    </details>
  )
}

/**
 * One item inside a disclosure, or in a flat list.
 *
 * Replaces the tables these panels used to draw. A table implies columns
 * that mean the same thing down the page; these lists have a name, some
 * explanatory text and at most one control, which is a row, not a table.
 *
 * @param checked/onCheck  a tick, where the item is a choice
 * @param action           a node, where the item has one thing to do to it
 * @param meta             why it is here, or what it costs — muted, wraps
 * @param disabled         ticked by something else, so not this row's call
 */
export function ItemRow({ tag, label, uid, meta, checked, onCheck, disabled, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '5px 4px',
        borderBottom: RULE,
      }}
    >
      {onCheck && (
        <span style={{ flex: 'none', paddingTop: 1 }}>
          <Checkbox
            dense
            checked={!!checked}
            disabled={disabled}
            onChange={({ checked: c }) => onCheck(c)}
          />
        </span>
      )}
      <TypeTag>{tag}</TypeTag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ overflowWrap: 'anywhere' }}>{label}</span>
        {uid && <code style={{ color: '#6e7a8a', marginLeft: 6 }}>{uid}</code>}
        {meta && (
          <div style={{ color: '#6e7a8a', fontSize: 13, marginTop: 1, overflowWrap: 'anywhere' }}>
            {meta}
          </div>
        )}
      </div>
      {action && <span style={{ flex: 'none', whiteSpace: 'nowrap' }}>{action}</span>}
    </div>
  )
}

/** Kept for the few tables that genuinely are tables. */
export const ACTION_CELL = { whiteSpace: 'nowrap', width: 1 }

/**
 * Progress, shared by both halves of the app.
 *
 * The export grew a live log - finished steps frozen with a tick, one
 * counting line at the bottom - because a single line that rewrites itself
 * cannot be read. The import then grew its own single rewriting line, so
 * the same wait looked like two different applications depending on which
 * direction you were going.
 *
 * One hook, one component, both halves.
 *
 *   say(stage, detail)   start a wait, clear the log
 *   step({...})          add or update a line
 *   say(null)            done
 */
export function useProgress() {
  const [stage, setStage] = React.useState(null)
  const [detail, setDetail] = React.useState(null)
  const [lines, setLines] = React.useState([])

  const say = React.useCallback((next, d = null) => {
    setStage(next)
    setDetail(next ? d : null)
    setLines([])
  }, [])

  const step = React.useCallback(({ stage: st, detail: d, step: i, steps, done, total }) => {
    setStage(st || i18n.t('Working…'))
    setDetail(steps ? i18n.t('step {{i}}/{{steps}}', { i: Math.min(i, steps), steps }) : null)
    setLines((ls) => {
      const key = `${st}|${i}`
      const last = ls[ls.length - 1]
      // Same step, new count: only the numbers move.
      if (last && last.key === key) {
        return [...ls.slice(0, -1), { ...last, detail: d, done, total }]
      }
      const settled = ls.map((l) => (l.state === 'running' ? { ...l, state: 'done' } : l))
      const head = last && last.stage === st ? [] : [{ key: `${st}|head`, stage: st, head: true }]
      const next = [...settled, ...head, { key, stage: st, detail: d, done, total, state: 'running' }]
      // A round is 32 steps plus its heading, so 120 keeps the last three
      // rounds whole in a window-height frame. Older lines go, not newer.
      return next.length > 120 ? next.slice(next.length - 120) : next
    })
  }, [])

  return { stage, detail, lines, busy: !!stage, say, step }
}

export function ProgressLog({ lines }) {
  const box = React.useRef(null)
  const last = lines?.[lines.length - 1]

  // Scrolling on lines.length alone stopped working the moment the log hit
  // its cap: the length stayed constant from then on, the effect never ran
  // again, and the log appeared to freeze part-way through while still
  // filling below the fold. The last line's key changes on every step.
  //
  // The container is scrolled directly rather than through scrollIntoView,
  // which also scrolls the page when the element is inside a scroll box.
  React.useEffect(() => {
    const el = box.current
    if (el) el.scrollTop = el.scrollHeight
  }, [last?.key, lines?.length])

  if (!lines?.length) return null

  return (
    <div
      ref={box}
      style={{
        marginTop: 16,
        maxWidth: 560,
        height: 'calc(100vh - 200px)',
        minHeight: 240,
        overflowY: 'auto',
        fontSize: 13,
        lineHeight: 1.7,
        borderLeft: '2px solid #e8edf2',
        paddingLeft: 12,
      }}
    >
      {lines.map((l) =>
        l.head ? (
          <div key={l.key} style={{ fontWeight: 600, marginTop: 10, color: '#212934' }}>
            {l.stage}
          </div>
        ) : (
          <div
            key={l.key}
            style={{ display: 'flex', gap: 8, color: l.state === 'done' ? '#6e7a8a' : '#212934' }}
          >
            <span style={{ width: 14, flex: 'none' }}>{l.state === 'done' ? '✓' : '·'}</span>
            <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{l.detail}</span>
            <span style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {l.state === 'done'
                ? i18n.t('ok')
                : l.total
                ? `${l.done.toLocaleString()} / ${l.total.toLocaleString()}`
                : l.done
                ? l.done.toLocaleString()
                : ''}
            </span>
          </div>
        )
      )}
    </div>
  )
}

/** The whole waiting screen: spinner, where we are, and the log. */
export function BusyScreen({ stage, detail, lines }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <CircularLoader small />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500 }}>{stage}</div>
          {detail ? (
            <div style={{ color: '#6e7a8a', fontSize: 13, marginTop: 4, overflowWrap: 'anywhere' }}>
              {detail}
            </div>
          ) : null}
        </div>
      </div>
      <ProgressLog lines={lines} />
    </div>
  )
}

/**
 * A numbered stage, visible at the same time as its siblings.
 *
 * A card is for "1. Select · 2. Check · 3. Write" — stages the reader sees
 * together and works down. It is NOT for lists: a box around every list
 * gives a page of frames and nothing stands out. Lists go in a Section.
 */
export function Card({ step, title, children, style }) {
  return (
    <section
      style={{
        border: `1px solid ${RULE}`,
        borderRadius: 4,
        background: '#fff',
        padding: 20,
        marginTop: 16,
        ...style,
      }}
    >
      {title && (
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>
          {step ? `${step}. ` : ''}
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

/**
 * Modes, not a sequence.
 *
 * Tabs are for screens that can be entered in any order and re-entered.
 * A sequence uses <Steps>. A screen inside a tab may have steps; a step
 * never contains tabs.
 */
export function Tabs({ tabs, current, onChange }) {
  return (
    <nav style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${RULE}`, margin: '0 0 20px' }}>
      {tabs.map(([key, label]) => {
        const on = key === current
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={{
              appearance: 'none',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${on ? '#1d5288' : 'transparent'}`,
              color: on ? '#1d5288' : '#4a5768',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: on ? 600 : 400,
              padding: '10px 2px',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

/**
 * A bulk action scoped to the list it sits above.
 *
 * Link-styled on purpose. "Select shown" and "Clear all" are not peers of
 * the primary button that commits the screen, and drawing them as buttons
 * makes a row of equals out of one decision and two conveniences.
 */
export function TextAction({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        appearance: 'none',
        background: 'none',
        border: 'none',
        padding: 0,
        font: 'inherit',
        color: disabled ? '#a0aab8' : '#1d5288',
        cursor: disabled ? 'default' : 'pointer',
        textDecoration: 'underline',
      }}
    >
      {children}
    </button>
  )
}

/**
 * The line above a selection list: how many are chosen, and the bulk
 * actions that change that.
 *
 *     Selected 1 of 12 · select shown · clear all · ☐ only selected
 */
export function SelectionBar({ selected, total, onSelectShown, onClearAll, onlySelected, onOnlySelected }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        color: '#6e7a8a',
        fontSize: 13,
        margin: '6px 0',
      }}
    >
      <span>{i18n.t('Selected {{selected}} of {{total}}', { selected, total })}</span>
      {onSelectShown && (
        <>
          <span>·</span>
          <TextAction onClick={onSelectShown}>{i18n.t('select shown')}</TextAction>
        </>
      )}
      {onClearAll && (
        <>
          <span>·</span>
          <TextAction onClick={onClearAll} disabled={!selected}>
            {i18n.t('clear all')}
          </TextAction>
        </>
      )}
      {onOnlySelected && (
        <>
          <span>·</span>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <Checkbox
              dense
              checked={!!onlySelected}
              label={i18n.t('only selected')}
              onChange={({ checked }) => onOnlySelected(checked)}
            />
          </span>
        </>
      )}
    </div>
  )
}

/** Server output the app did not write — responses, SQL, import reports. */
export function LogPanel({ lines, height = 300 }) {
  const box = React.useRef(null)
  React.useEffect(() => {
    const el = box.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines?.length])

  return (
    <pre
      ref={box}
      style={{
        background: '#1e2832',
        color: '#d6dde6',
        borderRadius: 4,
        padding: 12,
        height,
        overflowY: 'auto',
        fontSize: 12,
        lineHeight: 1.6,
        margin: 0,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}
    >
      {(lines || []).join('\n')}
    </pre>
  )
}
