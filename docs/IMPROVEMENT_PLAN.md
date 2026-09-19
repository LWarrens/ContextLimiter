# Context Limiter improvement plan

Date: 2026-09-19. Scope: design, UX, and appearance of the browser extension and its internal library. Planning only; implementation is not included.

This plan combines three independent subagent reviews: library architecture, user experience, and appearance/accessibility. The recommended order is to make counting and saving trustworthy, simplify the user flows, then apply a consistent visual system.

## Evidence and baseline

- `src/lib/types.ts:45` enables the extension with an `ignore` default and no rules. Ordinary URLs consequently contribute no tabs, despite the enabled state.
- `src/lib/components/Settings.svelte:377` suggests domain patterns, but `static/service-worker.js:298` anchors patterns against the entire URL. A displayed example such as `example.com` does not match `https://example.com/page`.
- `static/service-worker.js:548` checks global limits before candidate exclusions. An already-over-limit state can therefore reject an ignored candidate; the intended contract must be defined and tested.
- Configuration defaults are duplicated between TypeScript and the worker. Exclusions are persisted as both arrays and boolean flags (`src/lib/types.ts:18`), with differing normalization directions in the two contexts.
- Worker configuration loading is asynchronous; handlers can use defaults before it finishes. Saving does not propagate storage errors reliably, while settings reports success immediately (`src/lib/stores.ts:124`, `static/service-worker.js:165`, `:704`, `:781`).
- Appearance mixes Tailwind, Skeleton-style class names, inline styles, and scoped CSS without corresponding shared component styles. Global dimensions are fixed at 400 by 600 pixels (`src/app.css:5`). The font URL uses `/static/` (`src/theme.css:31`); verify and correct it in the built extension.
- Exclusion controls and rule removal lack adequate accessible names; some controls remove focus outlines. Over-limit indicators animate indefinitely without a reduced-motion override.

`npm run check` passed with zero errors and zero warnings. The existing test is a placeholder arithmetic test. Vite started, but browser automation reported no available browser, so appearance, interaction, and enforcement were not verified at runtime. Findings about rendering require a built-extension visual pass. Existing changes in `Status.svelte` and `static/service-worker.js` must be preserved and incorporated deliberately.

## 1. Establish the behavior contract — P0

**Outcome:** the UI and worker agree on what counts and why a new tab is allowed or closed.

Extract a browser-independent policy module with `evaluateCandidate(snapshot, config, candidate)`. Return a structured decision containing the outcome, applicable limit, matching rule, and reason. Keep browser reads and tab removal in the worker adapter. Register event listeners synchronously and await a shared configuration-readiness promise inside handlers before making authoritative decisions.

Specify and characterize these cases before changing behavior: exactly at versus over each limit; ignored URLs; windows excluded from tab counting versus window counting; newly created tabs with delayed URLs; simultaneous creation; disabled mode; and existing tabs when limits are lowered. The recommended policy applies only relevant limits to each candidate and avoids retroactive closures when saving lower limits.

Keep first-enabled-match rule precedence initially. Preserve legacy full-URL glob behavior during migration; correct examples to valid full-URL patterns. A friendlier domain rule can be added as an explicit rule type later without silently reinterpreting saved patterns.

**Done when:** boundary and race tests cover these cases, rule preview and enforcement use the same evaluator, and each rejection has a stable reason code. Confirm any intentional behavior changes in release notes.

## 2. Consolidate configuration and extension communication — P0/P1

**Outcome:** saved settings survive worker restarts and all open views reflect the same state.

- Create one versioned schema, default configuration, validator, and migration function. Persist exclusion arrays; derive checkbox booleans. Preserve rule order and existing saved preferences.
- Bundle a TypeScript worker so it imports shared policy and configuration code instead of copying them into a static JavaScript file.
- Add typed request, response, and event contracts with request identifiers and explicit error results. Extend count snapshots to represent their actual payload.
- Separate an extension client from Svelte stores. Give connections cleanup, bounded retry/backoff, and timeout handling. Use a guarded browser API adapter plus an explicit demo adapter for development.
- Distinguish loading, ready, disconnected, and error; distinguish draft, saving, saved, and failed. Only publish saved state after storage succeeds. Preserve the last saved configuration and let users retry a failed draft.

**Done when:** delayed startup cannot enforce defaults, failed writes cannot produce a success message, migrated exclusions remain equivalent, two open views converge on saved state, and reconnect does not leak listeners or timers.

This lifecycle work follows Chrome's guidance that workers can terminate and durable state must not depend on global variables: [extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

## 3. Make setup and rules understandable — P1

**Outcome:** a new user can configure a useful limit and explain why a URL counts.

- On an unconfigured install, show “Choose which tabs to count” with two explicit choices: count all sites, or count selected sites. Retain existing users' defaults. When no rules apply, show “No sites are being counted” with a setup action rather than presenting zero as an unexplained healthy state.
- Organize settings into Limits, Sites and rules, and Advanced window exclusions. Put Reset in a separate low-emphasis area with a confirmation describing what will reset.
- Use a settings draft with a clear Save changes action, unsaved-state indication, and persistent inline errors. Keep the global enabled switch immediate, but acknowledge its saved result and revert or expose retry on failure.
- Label rule controls “Count” and “Ignore,” explain that the first matching enabled rule wins, and provide keyboard-operable move up/down controls and inline editing.
- Add a URL tester showing Counted/Ignored, the winning rule or default, and the applicable limits. Validate input with the same matcher as the worker and supply working examples.
- Explain enforcement in plain language, including what happens to newly opened tabs. Surface the latest enforcement reason in the popup; keep any retained event record minimal and local.

**Done when:** a fresh install can reach a useful configuration without guessing, demonstrated rule examples match, rule precedence is controllable, saves are truthful, and the popup explains zero counts, paused mode, disconnection, and enforcement.

## 4. Establish a cohesive visual system — P1

**Direction:** a compact, calm charcoal utility with blue actions and selection, readable neutral text, and restrained amber/red state indicators. Retain the existing dark identity while improving consistency.

Use semantic tokens for page/card surfaces, primary/secondary text, borders, focus, action, warning, and danger. Adopt a small 4/8/12/16/24 spacing scale, consistent field/button heights, and shared radii. Use 14px body text, larger metric values with tabular numerals, and a correctly loaded local font with a system fallback. Verify contrast before locking colors.

Build a small set of reusable Svelte primitives: Button, Field, Switch, SegmentedControl, Card, UsageMeter, InlineMessage, and RuleRow. Prefer native form semantics. Consolidate the current Tailwind styling and remove unused Skeleton dependencies only after verifying no runtime usage; a framework migration is unnecessary for this scope.

Proposed popup order:

1. Product name and an explicit active/paused switch.
2. A compact summary: counted tabs, counted windows, and remaining capacity.
3. Flat usage meters with text such as “At limit” or “3 over limit.”
4. Per-window details, with a clear identity and accessible full titles.
5. Latest enforcement explanation when relevant, followed by a Settings action.

Move lengthy rule editing to a functional full-page settings route, with a compact popup path to it. Scope popup dimensions to the popup shell instead of fixing every page's body. Use flexible widths, a bounded scroll area, and sensible long-title wrapping.

**Done when:** all controls share visible hover/focus/disabled/invalid states; there are no undefined visual tokens or font failures; the popup fits 400 by 600 pixels; a 320px stress case, 200% zoom, long titles, and many windows remain usable; and the full settings page uses available width. Replace indefinite jitter and toolbar blinking with stable, clearly labeled alerts by default.

## 5. Validate accessibility and release readiness — P1

Use labeled inputs and fieldsets, named icon buttons, semantic selected states, visible keyboard focus, and appropriate status announcements. Meters need accessible names and values, plus textual limit states. Ensure status does not rely on color. Honor reduced-motion preferences and avoid distracting animation.

Target WCAG 2.2 AA for the interface, including contrast, keyboard operation, focus visibility, and status messages. Check motion separately as a product requirement: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Replace the arithmetic test with meaningful policy, migration, persistence-failure, and connection tests. Add a small deterministic UI fixture set: fresh install, empty selection, normal usage, near/at/over limit, paused, disconnected, save failure, long title, and many rules/windows. Run keyboard and visual checks on those states, then smoke-test the built unpacked extension in an isolated test profile with disposable tabs.

Release gates: check and build pass; behavior tests pass; restart/reconnect and multi-view tests pass; visual and accessibility checks pass; no existing configuration changes silently. Update the README with purpose, setup, working rule examples, counting semantics, known limitations, and development/validation commands. Audit formatter/linter scripts and choose one package-manager lockfile policy without mixing dependency upgrades into the redesign.

## 6. Optimize only after behavior is stable — P2

Instrument tab/window queries and broadcasts during event bursts. Build one snapshot using maps/sets, compile rules when configuration changes, coalesce status refreshes, and reject stale snapshot updates. Keep enforcement ordering separate from UI refresh debouncing. Avoid a persistent browser-state cache until measurements justify it.

**Done when:** measured redundant queries/broadcasts decrease while decisions, freshness, and race tests stay correct.

## Suggested implementation batches

| Batch | Deliverable | Dependency | Relative size |
| --- | --- | --- | --- |
| 1 | Behavior contract, shared matcher, characterization tests | None | Medium |
| 2 | Schema migration, bundled worker, readiness and reliable saves | Batch 1 | Large |
| 3 | Typed client, draft settings, setup and rule tester | Batch 2 | Large |
| 4 | Tokens, shared controls, popup and full settings layouts | Contracts from batches 2–3 | Medium |
| 5 | Built-extension accessibility/visual checks, documentation | Batches 3–4 | Medium |
| 6 | Measured event/query optimization | Stable behavior tests | Medium |

Visual tokens and static layout prototypes can progress alongside batches 2–3 once their state contracts are agreed. Keep extraction into a separately published library, a new UI framework, cloud sync, analytics, and a broad dependency upgrade outside this plan.
