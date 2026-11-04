/**
 * @hisp-eeca/dhis2-app-kit
 *
 * The shell, the design system and the progress machinery every HISP EECA
 * DHIS2 application shares. Read docs/design-basics.md before changing
 * anything here: ten applications depend on these decisions, and the
 * point of the package is that they stay aligned.
 *
 * The React-free helpers are a separate entry point:
 *
 *   import { queryInBatches, SchemaService } from '@hisp-eeca/dhis2-app-kit/logic'
 */

export { AppKitProvider, useApp } from './context.jsx'
export { default as AppShell } from './AppShell.jsx'
export { default as LanguageSelect } from './LanguageSelect.jsx'
export { resolveLanguage } from './logic/language.js'
export { default as VersionBanner } from './VersionBanner.jsx'

export {
  Hint,
  Step,
  Section,
  SectionTitle,
  Steps,
  Card,
  Tabs,
  Collapsible,
  ItemRow,
  TextAction,
  SelectionBar,
  LogPanel,
  ProgressLog,
  BusyScreen,
  useProgress,
  ACTION_CELL,
} from './ui.jsx'
