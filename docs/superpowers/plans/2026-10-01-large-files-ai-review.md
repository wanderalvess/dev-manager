# Large Files for AI Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-blocking changed-file size report and decompose the APM page into focused modules without changing its behavior.

**Architecture:** A dependency-free Node/TypeScript CLI compares only changed source files against a local or CI base revision and emits warnings without failing on size. `ApmPage` becomes a small composition root backed by focused hooks and APM components, while existing shared types, API bridge, dashboard, and pure utility contracts remain authoritative.

**Tech Stack:** TypeScript, React, Node.js, Vitest, npm scripts, GitHub Actions.

---

## File map

| Path | Responsibility |
|---|---|
| `scripts/check-changed-file-sizes.ts` | List changed/untracked source files, compare current/base line counts, and print non-blocking warnings. |
| `scripts/check-changed-file-sizes.test.ts` | Exercise the checker with temporary Git repositories. |
| `package.json` | Add `check:file-size` without replacing existing scripts. |
| `.github/workflows/ci.yml` | Fetch the comparison base and report changed-file sizes in CI. |
| `src/renderer/src/hooks/apm/useApmTraceController.ts` | Own trace/overview fetching, polling, live updates, selection, and trace actions. |
| `src/renderer/src/hooks/apm/useApmReceiverSettings.ts` | Own APM receiver/service settings load and save operations. |
| `src/renderer/src/components/apm/ApmHeader.tsx` | Render the APM command ribbon and dashboard/explorer switch. |
| `src/renderer/src/components/apm/ApmTraceFilters.tsx` | Render search, presets, slow-picker, latency spectrum, and service filter. |
| `src/renderer/src/components/apm/ApmSlowPicker.tsx` | Render slow-trace summary and endpoint/query shortcuts. |
| `src/renderer/src/components/apm/ApmLatencySpectrum.tsx` | Render latency histogram and selectable latency chips. |
| `src/renderer/src/components/apm/ApmTraceList.tsx` | Render empty states and the trace table. |
| `src/renderer/src/components/apm/ApmTraceDetails.tsx` | Compose the selected trace drawer, summary, tabs, and detail panels. |
| `src/renderer/src/components/apm/ApmTimeBudgetPanel.tsx` | Render the semantic HTTP/Java/JDBC time budget and bottleneck actions. |
| `src/renderer/src/components/apm/ApmTraceWaterfall.tsx` | Render waterfall controls and the trace tree. |
| `src/renderer/src/components/apm/ApmWaterfallNode.tsx` | Render one recursive waterfall node. |
| `src/renderer/src/components/apm/ApmSpanAttributes.tsx` | Render attributes for the selected span. |
| `src/renderer/src/components/apm/ApmSqlSpans.tsx` | Render SQL spans and copy/open-in-DB-Studio actions. |
| `src/renderer/src/components/apm/ApmErrorSpans.tsx` | Render exception and stacktrace spans. |
| `src/renderer/src/components/apm/ApmSetupModal.tsx` | Render connection snippets and receiver/service/instrumentation settings. |
| `src/renderer/src/pages/ApmPage.tsx` | Compose hooks and APM components; keep below 300 lines. |
| `src/renderer/src/utils/apmUiUtils.ts` | Reuse existing pure APM calculations, filtering, formatting, and navigation. |
| `src/renderer/src/utils/apmUiUtils.test.ts` | Preserve and extend pure-logic coverage only when logic is moved here. |

Every new or edited source file in this work should stay at or below 300 lines.
If a proposed component crosses that limit, split it along its own UI
responsibility rather than raising the limit.

## Task 1: Implement the changed-file size checker

**Files:**
- Create: `scripts/check-changed-file-sizes.ts`
- Create: `scripts/check-changed-file-sizes.test.ts`

- [ ] **Step 1: Write checker tests using a temporary Git repository**

Build fixtures with `node:fs`, `node:os`, `node:path`, and `node:child_process`.
Initialize a temporary repository, commit `src/kept.ts` at 299 lines,
`src/legacy.ts` at 320 lines, `src/unchanged.ts` at 301 lines, and
`src/removed.ts`; then modify `legacy.ts` to 318 lines, remove `removed.ts`,
and create `src/new.ts` at 301 lines. Exercise these cases:

```ts
expect(countSourceLines('one\r\ntwo\r\n')).toBe(2);
expect(countSourceLines('')).toBe(0);
expect(await auditChangedFiles(repo, base)).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ path: 'src/new.ts', currentLines: 301, baseLines: null }),
    expect.objectContaining({ path: 'src/legacy.ts', currentLines: 318, baseLines: 320 })
  ])
);
```

Also assert that `src/unchanged.ts` and the removed file are absent from the
results, `formatWarnings()` names both oversized changed files, and invoking
the checker CLI in the temporary repository returns status `0` despite those
warnings. Resolve the local `tsx` CLI from the test module and launch it with
`spawnSync`; ensure the test leaves no temporary directory behind (use
`afterEach` with `rm` on the resolved temp directory).

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- scripts/check-changed-file-sizes.test.ts`

Expected: FAIL because the checker module and exported functions do not exist.

- [ ] **Step 3: Implement changed-path collection and line counting**

Export `MAX_SOURCE_LINES = 300` and `countSourceLines(source: string)`.
Count physical lines with CRLF, LF, or CR separators, excluding the empty
segment after a trailing newline:

```ts
export function countSourceLines(source: string): number {
  if (source.length === 0) return 0;
  const lines = source.split(/\r\n|\n|\r/);
  return lines.length - (lines.at(-1) === '' ? 1 : 0);
}
```

Collect paths with `git diff --name-only --diff-filter=ACMRTUXB <base>` and
`git ls-files --others --exclude-standard`, deduplicate them, and retain only
`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, and `.css` files. Use
`execFileSync` argument arrays with `cwd`; do not interpolate a revision or
path into a shell command. Resolve `base` in this order: `--base <revision>`,
`FILE_SIZE_BASE`, then `HEAD`. For local runs, include untracked files. For CI,
compare the checked-out `HEAD` to the supplied base revision.

- [ ] **Step 4: Implement the report without a threshold failure**

Export `auditChangedFiles(root, base)` and `formatWarnings(results)`. Return
current and base line counts for each changed source file; represent a file
missing from the base as `baseLines: null` and skip paths deleted in the
worktree. Print only entries above 300 lines, identifying new files separately
from existing oversized files and showing the base/current counts so
reductions are visible. If no changed file exceeds the threshold, print a
short success message. Threshold warnings must not set a failing exit code;
Git/read errors must remain visible and fail explicitly.

- [ ] **Step 5: Run the checker tests**

Run: `npm test -- scripts/check-changed-file-sizes.test.ts`

Expected: PASS, including changed/untracked, unchanged, deleted, new-file,
legacy-file, and non-blocking warning cases.

## Task 2: Expose the report locally and in CI

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the local npm command**

Add `"check:file-size": "tsx scripts/check-changed-file-sizes.ts"` to
`package.json` scripts; retain every existing command. Verify the checker can
use `HEAD` by default and `--base <revision>` when an explicit comparison is
needed.

- [ ] **Step 2: Add an informational CI step**

Configure checkout with `fetch-depth: 0`. Add a step before lint that sets
`FILE_SIZE_BASE` to
`${{ github.event.pull_request.base.sha || github.event.before }}` and runs
`npm run check:file-size` immediately after `npm ci`. Keep the checker
non-blocking only for the size threshold; do not set `continue-on-error`, so a
broken Git invocation is not silenced. Leave lint, typecheck, test, and build
gates unchanged.

- [ ] **Step 3: Verify both invocation modes**

Run `npm run check:file-size` locally and then
`npm run check:file-size -- --base HEAD`. Expected: an informational report,
exit code 0 for size warnings, and identical changed-file scope for both runs.

## Task 3: Extract APM data and settings lifecycle

**Files:**
- Create: `src/renderer/src/hooks/apm/useApmTraceController.ts`
- Create: `src/renderer/src/hooks/apm/useApmReceiverSettings.ts`
- Modify: `src/renderer/src/pages/ApmPage.tsx`

- [ ] **Step 1: Move trace/overview state and actions into the trace hook**

Move the existing overview/traces state, selected trace/span state, recording
state, refresh callback, 3-second polling, WebSocket/IPC subscription and its
400ms batching, stale-response guard, trace loading/open/close, demo
generation, and buffer clear behavior into
`useApmTraceController({ isActive, filters })`. `filters` carries the
controlled `limit`, service, search text, preset, and sort order used by the
backend request. Return typed state and callbacks needed by the page and child
components. Preserve current API guards, warning/toast messages, `limit = 250`,
effect dependencies, and cleanup behavior exactly.

- [ ] **Step 2: Move settings persistence into the settings hook**

Move loading `apmServiceName` and `apmInstrumentationEnabled`, applying those
settings, and changing the receiver port into
`useApmReceiverSettings({ isActive, onRefresh })`. Keep draft text and selected
snippet tab in the setup modal, because they are modal presentation state.
Preserve `isValidApmReceiverPort`, success/failure toasts, saving flags, and
the existing behavior when an optional `api` method is unavailable.

- [ ] **Step 3: Connect the page to the hooks**

Replace duplicated state/effects/handlers in `ApmPage.tsx` with hook results.
Keep filter/view-mode state in the page until the filter and toolbar
components are extracted. Run `npm run typecheck`.

Expected: typecheck passes, and `ApmPage.tsx` no longer owns polling or settings
persistence effects.

## Task 4: Extract the APM header and trace filters

**Files:**
- Create: `src/renderer/src/components/apm/ApmHeader.tsx`
- Create: `src/renderer/src/components/apm/ApmTraceFilters.tsx`
- Create: `src/renderer/src/components/apm/ApmSlowPicker.tsx`
- Create: `src/renderer/src/components/apm/ApmLatencySpectrum.tsx`
- Modify: `src/renderer/src/pages/ApmPage.tsx`

- [ ] **Step 1: Extract the command ribbon**

Move the header markup into `ApmHeader`. Its props carry receiver status/port,
overview metrics, trace count, `viewMode`, `isRecording`, and callbacks for
view switching, recording, demo, clearing, and setup. Keep all existing
labels, `title` text, icon use, classes, and keyboard hints.

- [ ] **Step 2: Extract filters and latency controls**

Move search, quick presets, and service selection into `ApmTraceFilters`.
Compose `ApmSlowPicker` and `ApmLatencySpectrum` for their respective popover
and histogram/chip UI. Pass controlled values and callbacks; provide
`slowSummary` and `latencySpectrum` as props, and keep `filterTraces`,
`computeLatencySpectrum`, and `detectSlowSummary` in the existing
`apmUiUtils.ts`/hook caller rather than duplicating the calculations.

- [ ] **Step 3: Verify the extracted controls compile**

Run: `npm run typecheck`

Expected: PASS with the page passing only the state and callbacks required by
the two components.

## Task 5: Extract trace list and selected-trace detail panels

**Files:**
- Create: `src/renderer/src/components/apm/ApmTraceList.tsx`
- Create: `src/renderer/src/components/apm/ApmTraceDetails.tsx`
- Create: `src/renderer/src/components/apm/ApmTimeBudgetPanel.tsx`
- Create: `src/renderer/src/components/apm/ApmTraceWaterfall.tsx`
- Create: `src/renderer/src/components/apm/ApmWaterfallControls.tsx`
- Create: `src/renderer/src/components/apm/ApmWaterfallNode.tsx`
- Create: `src/renderer/src/components/apm/ApmSpanAttributes.tsx`
- Create: `src/renderer/src/components/apm/ApmSqlSpans.tsx`
- Create: `src/renderer/src/components/apm/ApmErrorSpans.tsx`
- Modify: `src/renderer/src/pages/ApmPage.tsx`

- [ ] **Step 1: Extract the empty state and trace table**

Move the current empty states and trace table to `ApmTraceList`. Pass filtered
traces, raw count, selected ID, maximum visible duration, setup URL, and
selection/demo/setup/reset-filter callbacks. Preserve the current sort order,
formatting, row actions, and responsive classes.

- [ ] **Step 2: Extract the budget panel and waterfall tree**

Move the time-budget summary and bottleneck actions to `ApmTimeBudgetPanel`.
Move tree composition to `ApmTraceWaterfall`; put the layer controls and time
ruler in `ApmWaterfallControls`; move the recursive row/bar renderer to
`ApmWaterfallNode`. Keep `computeTimeBudget` and `categorizeSpan` as calls into
`apmUiUtils.ts`.

- [ ] **Step 3: Extract detail-tab content**

Move the attributes, SQL, and error tab bodies into `ApmSpanAttributes`,
`ApmSqlSpans`, and `ApmErrorSpans`, respectively. Each component receives
typed span data and explicit copy/navigation callbacks. `ApmTraceDetails`
composes the drawer header, quick metadata, tab controls, and the three
content components. Keep the SQL-copy/open action and error-copy formatting
unchanged.

- [ ] **Step 4: Replace inline markup in `ApmPage`**

Render `ApmTraceList` and `ApmTraceDetails` from the page, passing controlled
selection, tab, expansion, tier-filter, and keyboard-search state. Preserve
`visibleDetailTab` fallback to `waterfall` when the selected trace has no SQL
or error tab.

- [ ] **Step 5: Check file sizes and types**

Run `npm run check:file-size` and `npm run typecheck`.

Expected: no newly extracted component exceeds 300 lines; any remaining
warning identifies only an existing legacy file still pending extraction.

## Task 6: Extract receiver setup modal and finish page composition

**Files:**
- Create: `src/renderer/src/components/apm/ApmSetupModal.tsx`
- Modify: `src/renderer/src/pages/ApmPage.tsx`

- [ ] **Step 1: Move setup UI to its own modal**

Move the full "Como Conectar" modal, including instrumentation toggle,
receiver/service fields, Karaf/cURL/Node tabs, snippets, copy feedback, and
footer into `ApmSetupModal`. Receive settings and operations through typed
props; do not call `apiBridge` from the view component.

- [ ] **Step 2: Make `ApmPage` an orchestrator**

Compose `ApmHeader`, the existing `ApmDashboardView`, `ApmTraceFilters`,
`ApmTraceList`, `ApmTraceDetails`, and `ApmSetupModal`. Keep only view/filter
state, keyboard navigation wiring, derived values needed by multiple children,
and callback composition. Do not duplicate `ApmDashboardView` or change
`App.tsx` routing.

- [ ] **Step 3: Confirm the hard file-size target**

Run `npm run check:file-size` and inspect the counts for every new/modified
APM source file. Continue splitting a component if any newly extracted file
exceeds 300 lines; do not suppress it as legacy.

Expected: `ApmPage.tsx` and each new APM hook/component are at or below 300
lines.

## Task 7: Validate behavior and repository integration

**Files:**
- Test: `scripts/check-changed-file-sizes.test.ts`
- Test: `src/renderer/src/utils/apmUiUtils.test.ts`
- Validate: `src/renderer/src/pages/ApmPage.tsx`
- Validate: `src/renderer/src/components/apm/`
- Validate: `.github/workflows/ci.yml`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npm test -- scripts/check-changed-file-sizes.test.ts src/renderer/src/utils/apmUiUtils.test.ts
```

Expected: both the checker integration tests and the existing APM pure-utility
tests pass. Add tests to `apmUiUtils.test.ts` only if a pure calculation or
formatter moved or changed; do not add a UI testing dependency for a
behavior-preserving extraction.

- [ ] **Step 2: Run typecheck and production build**

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: TypeScript and Vite production build pass.

- [ ] **Step 3: Review changed-file scope and warning behavior**

Run `git status --short` and inspect `git diff --stat` plus
`npm run check:file-size`. Confirm existing user edits remain untouched and
unstaged/uncommitted unless they were staged before the work; confirm the CI
checker reports threshold warnings without weakening any existing CI gate.

- [ ] **Step 4: Commit only implementation files for this plan**

Stage only files listed in this plan and commit with a Conventional Commit
message in Portuguese, including the required Copilot co-author trailer.
Never stage or revert unrelated user changes.
