# Implementation Plan: ForgeStitch

## Overview

Implement ForgeStitch as a TypeScript Atlassian Forge application with two Custom UI surfaces (Issue Panel, Project Dashboard), a Forge resolver backend, and a Demo/Sandbox Mode layer. Work proceeds in layers: shared types and error infrastructure first, then the pure-function core (DocBuilder, StallDetector, BlockerDetector), then API clients and Demo Mode, then stitchers and resolvers, then both frontend UIs, and finally the Forge manifest wiring.

## Tasks

- [x] 1. Scaffold project structure and shared type definitions
  - Create the `src/` directory tree matching the design file structure
  - Create `src/errors/types.ts` and define `StitchError`, `StitchResult<T>` discriminated union
  - Create `src/api/` interface files for `JiraClient`, `ConfluenceClient`, `ForgeAIClient` (interfaces only, no implementations)
  - Create all data-model interfaces: `JiraIssue`, `IssueLink`, `Comment`, `SprintWithIssues`, `SprintPulse`, `PublishedPage`, `IssueData`, `LinkedPage`, `TechSpecInput`, `ChangelogInput`, `ChangelogEntry`, `SandboxData` in a shared `src/types.ts`
  - Create resolver payload interfaces: `GetIssueDataPayload`, `GenerateTechSpecPayload`, `GenerateChangelogPayload`, `GetSprintDataPayload`, `GenerateSprintPulsePayload`
  - Create `package.json` with `@forge/api`, `@forge/resolver`, `@forge/bridge`, `react`, `typescript`, `vitest`, `fast-check` dependencies
  - Create `tsconfig.json` with strict TypeScript settings
  - _Requirements: 1.1, 2.1, 7.1–7.7_

- [x] 2. Implement DocBuilder (pure functions)
  - [x] 2.1 Implement `src/builders/docBuilder.ts`
    - Write `buildTechSpec(input: TechSpecInput): string` — emits Confluence Storage Format XML with panel macro, h2 headers for Context, Acceptance Criteria, and Implementation Notes
    - Write `buildChangelog(input: ChangelogInput): string` — emits chronological entries as an XML table or ordered list in Confluence Storage Format
    - Both functions must return well-formed XML parseable without errors
    - _Requirements: 3.3, 4.3_

  - [x] 2.2 Write property test for DocBuilder
    - **Property 6: DocBuilder produces well-formed Confluence Storage Format**
    - **Validates: Requirements 3.3, 4.3**
    - Use `fast-check` arbitraries for `TechSpecInput` and `ChangelogInput` with non-empty string fields; assert output is valid XML containing required structural tags

  - [ ]* 2.3 Write unit tests for DocBuilder
    - `src/tests/docBuilder.test.ts`: given valid `TechSpecInput`, assert all four sections are present in output; given valid `ChangelogInput`, assert each entry appears in output
    - _Requirements: 9.1_

- [x] 3. Implement StallDetector and BlockerDetector (pure functions)
  - [x] 3.1 Implement `src/detectors/stallDetector.ts`
    - Write `detectStalled(issues: JiraIssue[], nowMs: number, thresholdDays?: number): JiraIssue[]`
    - Default `thresholdDays` to `2`; classify as stalled if and only if `status === "In Progress"` and `lastActivityMs < nowMs - thresholdDays * 86400000`
    - `nowMs` is injected for deterministic testing
    - _Requirements: 5.2_

  - [ ]* 3.2 Write property test for StallDetector
    - **Property 9: Stall detection correctly partitions by threshold and status**
    - **Validates: Requirements 5.2**
    - Use `fast-check` arbitraries for `JiraIssue[]` with varying statuses and `lastActivityMs`; assert the returned set matches the predicate exactly

  - [ ]* 3.3 Write unit tests for StallDetector
    - `src/tests/stallDetector.test.ts`: issue at exactly the boundary (not stalled), one ms past boundary (stalled), non-In-Progress issues with old timestamps (not stalled)
    - _Requirements: 9.2_

  - [x] 3.4 Implement `src/detectors/blockerDetector.ts`
    - Write `detectBlocked(issues: JiraIssue[]): JiraIssue[]`
    - Classify as blocked if and only if the issue has a `"blocked"` label (case-insensitive) OR has an `IssueLink` with `type` equal to `"is blocked by"` or `"blocks"`
    - _Requirements: 5.3_

  - [ ]* 3.5 Write property test for BlockerDetector
    - **Property 10: Blocker detection correctly identifies blocked issues**
    - **Validates: Requirements 5.3**
    - Use `fast-check` arbitraries; assert returned set matches the case-insensitive label / link-type predicate exactly

  - [ ]* 3.6 Write unit tests for BlockerDetector
    - `src/tests/blockerDetector.test.ts`: "blocked" label (lowercase, uppercase, mixed), blocking link type, neither condition (not blocked), both conditions
    - _Requirements: 9.3_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement API Gateway Layer and Demo Mode
  - [x] 5.1 Implement live API clients
    - `src/api/jiraClient.ts`: implement `LiveJiraClient` with `getIssue`, `getIssueHistory`, `getActiveSprint` using `@forge/api` `requestJira`
    - `src/api/confluenceClient.ts`: implement `LiveConfluenceClient` with `getPage`, `upsertPage` using `@forge/api` `requestConfluence`
    - `src/api/forgeAIClient.ts`: implement `LiveForgeAIClient` with `generate` using `@forge/api` model invocation
    - All live clients must throw typed errors that include HTTP status and endpoint on non-2xx responses
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

  - [x] 5.2 Implement `src/demo/sandboxData.ts`
    - Define and export `sandboxData: SandboxData` with a sprint containing at least 5 issues covering statuses: `"To Do"`, `"In Progress"` (active, `lastActivityMs` within 2 days), `"In Progress"` (stalled, `lastActivityMs` older than 2 days), `"Blocked"` (with `"blocked"` label), and `"Done"`
    - Include at least 2 Confluence page objects: one `tech-spec`, one `changelog`
    - Include pre-generated AI response strings for `techSpec`, `changelog`, and `sprintPulse`
    - _Requirements: 6.7, 6.8_

  - [x] 5.3 Implement `src/demo/demoInterceptor.ts`
    - Implement `DemoJiraClient`, `DemoConfluenceClient`, `DemoForgeAIClient` backed by `sandboxData`
    - Implement factory functions `createJiraClient(demoMode)`, `createConfluenceClient(demoMode)`, `createForgeAIClient(demoMode)` that return the correct implementation
    - `DemoForgeAIClient.generate()` returns the pre-generated fixture strings; real `requestJira` / `requestConfluence` must not be called when `demoMode: true`
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 5.4 Write property test for Demo Mode substitution
    - **Property 12: Demo Mode substitutes all API calls with sandbox data**
    - **Validates: Requirements 6.3, 6.4**
    - Spy on `requestJira` and `requestConfluence`; for any resolver invoked with `demoMode: true` assert spy call count is 0

  - [ ]* 5.5 Write property test for Sandbox fixture completeness
    - **Property 13: Sandbox fixture satisfies minimum completeness**
    - **Validates: Requirements 6.7, 6.8**
    - Assert `sandboxData` sprint has ≥ 5 issues with the required status set; assert ≥ 2 Confluence page objects with correct types

  - [ ]* 5.6 Write unit tests for Demo Mode substitution
    - `src/tests/demoMode.test.ts`: for each of `getIssueData`, `getSprintData`, `generateTechSpec`, `generateChangelog`, `generateSprintPulse` called with `demoMode: true`, assert results match sandbox fixtures and `requestJira`/`requestConfluence` spy count is 0
    - _Requirements: 9.4_

- [x] 6. Implement IssueStitcher
  - [x] 6.1 Implement `src/stitchers/issueStitcher.ts`
    - Implement `getIssueData(issueKey, demoMode)`: call `JiraClient.getIssue`, read linked pages from Forge Storage, return `StitchResult<IssueData>`
    - Implement `generateTechSpec(issueKey, demoMode)`: execute the 5-step pipeline (Jira fetch → ForgeAI → DocBuilder → Confluence upsert → Storage write), return `StitchResult<PublishedPage>`
    - Implement `generateChangelog(issueKey, demoMode)`: execute the same pipeline with `getIssueHistory` and `buildChangelog`, short-circuit on retrieval failure without calling ForgeAI
    - Errors from Jira clients map to `stage: 'data-retrieval'`; ForgeAI errors to `stage: 'ai-generation'`; Confluence errors to `stage: 'confluence-publish'`
    - _Requirements: 3.1–3.7, 4.1–4.7, 8.1–8.3, 8.6_

  - [ ]* 6.2 Write property test for pipeline short-circuit on retrieval failure
    - **Property 8: Pipeline short-circuits on retrieval failure**
    - **Validates: Requirements 4.7**
    - Inject a mock `JiraClient` that throws a non-2xx error; assert ForgeAI spy call count is 0 and result has `ok: false` with `stage: 'data-retrieval'`

- [x] 7. Implement SprintStitcher
  - [x] 7.1 Implement `src/stitchers/sprintStitcher.ts`
    - Implement `getSprintData(projectKey, demoMode)`: call `JiraClient.getActiveSprint`; if null return `{ ok: true, data: null }` (no active sprint); else return `StitchResult<SprintWithIssues>`
    - Implement `generateSprintPulse(projectKey, demoMode)`: run the full Sprint Pulse pipeline (fetch → StallDetector → BlockerDetector → ForgeAI → assemble `SprintPulse`); on ForgeAI failure set `aiUnavailable: true` and return raw aggregated data
    - Assemble `SprintPulse` with `healthRating`, `stalledIssues`, `blockedIssues`, `atRiskIssues`, `aiSummary`, `aiUnavailable`, `actionItems`
    - _Requirements: 5.1–5.7, 8.6_

  - [ ]* 7.2 Write property test for Sprint Pulse result completeness
    - **Property 11: Sprint Pulse result contains all required fields**
    - **Validates: Requirements 5.5**
    - Use `fast-check` arbitraries for stall/blocker output and AI string; assert assembled `SprintPulse` always has non-null `healthRating`, array fields present

- [x] 8. Implement Forge Resolvers
  - [x] 8.1 Implement `src/resolvers/issueResolver.ts`, `sprintResolver.ts`, `demoResolver.ts`
    - `issueResolver.ts`: register `getIssueData`, `generateTechSpec`, `generateChangelog` resolvers; each reads `demoMode` from payload, delegates to `IssueStitcher`, wraps any unexpected throw in `{ ok: false, error: { stage: 'unknown', ... } }`
    - `sprintResolver.ts`: register `getSprintData`, `generateSprintPulse` resolvers with same pattern
    - `demoResolver.ts`: register `getDemoState` and `setDemoState` using Forge Storage to persist the toggle state per site
    - _Requirements: 1.5, 1.6, 2.5, 6.6, 8.6_

  - [x] 8.2 Implement `src/resolvers/index.ts`
    - Import and register all resolver groups; export single `handler` function
    - _Requirements: 7.6, 7.7_

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Issue Panel UI
  - [x] 10.1 Implement shared UI components
    - `src/frontend/issue-panel/components/DemoModeToggle.tsx`: toggle switch that calls `demoResolver.setDemoState` via `bridge.invoke`; displays "Demo Mode" badge when active
    - `src/frontend/issue-panel/components/ErrorBanner.tsx`: renders `error.message` in a styled banner with a retry button; never renders `httpStatus`, `endpoint`, or stack trace
    - _Requirements: 1.8, 6.2, 6.9, 8.4_

  - [x] 10.2 Implement Issue Panel data-display components
    - `src/frontend/issue-panel/components/IssueMetaCard.tsx`: renders summary, status, assignee, priority from `JiraIssue`
    - `src/frontend/issue-panel/components/LinkedPagesList.tsx`: renders page title as text and page URL as `href` for each `LinkedPage`; shows "no documentation" prompt when list is empty
    - `src/frontend/issue-panel/components/ActionBar.tsx`: "Generate Tech Spec" and "Generate Changelog" buttons; buttons are disabled with a spinner while action is in progress
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 10.3 Implement `src/frontend/issue-panel/components/IssuePanelApp.tsx` and wire entry point
    - Root component owning state machine: loading → loaded (with/without pages) → action-in-progress → error
    - On mount, call `issueResolver.getIssueData` via `bridge.invoke`; handle loading and error states
    - Connect `ActionBar`, `IssueMetaCard`, `LinkedPagesList`, `DemoModeToggle`, `ErrorBanner`
    - Create `src/frontend/issue-panel/index.tsx` entry point
    - _Requirements: 1.1, 1.7, 1.8_

  - [ ]* 10.4 Write property test for Issue Panel rendering
    - **Property 1: Issue panel renders all required Jira fields**
    - **Validates: Requirements 1.2**
    - Use `fast-check` arbitraries for `JiraIssue`; render `IssueMetaCard` and assert all four field values appear in output

    - **Property 2: Confluence page links render title and URL**
    - **Validates: Requirements 1.3**
    - Use `fast-check` arbitraries for `LinkedPage[]`; render `LinkedPagesList` and assert each title and href appears

    - **Property 3: Error banner derives message from error object (Issue Panel)**
    - **Validates: Requirements 1.8, 8.4, 8.5**
    - Use `fast-check` arbitraries for `StitchError`; render `ErrorBanner` and assert `error.message` is visible and `httpStatus`/`endpoint` are absent from rendered output

    - **Property 14: Demo Mode badge appears in both UIs when active (Issue Panel)**
    - **Validates: Requirements 6.9**
    - For any render with `demoMode: true`, assert "Demo Mode" text is present in rendered output

- [ ] 11. Implement Project Dashboard UI
  - [x] 11.1 Implement shared Dashboard components
    - `src/frontend/dashboard/components/DemoModeToggle.tsx`: same contract as Issue Panel toggle (can share implementation or reference)
    - `src/frontend/dashboard/components/ErrorBanner.tsx`: same contract as Issue Panel error banner
    - _Requirements: 2.7, 6.1, 6.9, 8.5_

  - [ ] 11.2 Implement Dashboard data-display components
    - `src/frontend/dashboard/components/SprintHeader.tsx`: renders sprint name, start date, end date, completion percentage from `SprintWithIssues`
    - `src/frontend/dashboard/components/IssueBoard.tsx`: groups issues by `status` field into named columns; each issue appears in exactly one column
    - `src/frontend/dashboard/components/SprintPulsePanel.tsx`: renders health rating badge, at-risk issues list, action items list; shows "AI unavailable" notice when `aiUnavailable: true`; shows "no active sprint" message when sprint data is null
    - _Requirements: 2.2, 2.3, 2.4, 5.6, 5.7_

  - [ ] 11.3 Implement `src/frontend/dashboard/components/DashboardApp.tsx` and wire entry point
    - Root component owning state machine; "Refresh Sprint Pulse" button calls `sprintResolver.generateSprintPulse` via `bridge.invoke`
    - On mount, call `sprintResolver.getSprintData` and `sprintResolver.generateSprintPulse`
    - Connect `SprintHeader`, `IssueBoard`, `SprintPulsePanel`, `DemoModeToggle`, `ErrorBanner`
    - Create `src/frontend/dashboard/index.tsx` entry point
    - _Requirements: 2.1, 2.5, 2.6, 2.7_

  - [ ]* 11.4 Write property test for Dashboard rendering
    - **Property 4: Sprint dashboard renders all sprint metadata fields**
    - **Validates: Requirements 2.2**
    - Use `fast-check` arbitraries for `SprintWithIssues`; render `SprintHeader` and assert name, start date, end date, and completion percentage all appear

    - **Property 5: Issue grouping is exhaustive and correctly partitioned**
    - **Validates: Requirements 2.3**
    - Use `fast-check` arbitraries for `JiraIssue[]`; call grouping function and assert union of groups equals input set with no duplicates

    - **Property 3 (Dashboard): Error banner derives message from error object**
    - **Validates: Requirements 2.7, 8.4, 8.5**
    - Same as Issue Panel property 3, applied to Dashboard `ErrorBanner`

    - **Property 14 (Dashboard): Demo Mode badge appears when active**
    - **Validates: Requirements 6.9**
    - For any render with `demoMode: true`, assert "Demo Mode" text is present

- [ ] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Create Forge manifest and finalize wiring
  - [ ] 13.1 Create `manifest.yml`
    - Declare `jira:issuePanel` module with key `forge-stitch-issue-panel`, resource `issue-panel`, resolver `main`, title `ForgeStitch`
    - Declare `jira:projectPage` module with key `forge-stitch-dashboard`, resource `dashboard`, resolver `main`, title `ForgeStitch Dashboard`
    - Declare `function` module with key `main`, handler `index.handler`
    - Declare exactly these scopes: `read:jira-work`, `write:confluence-content`, `read:confluence-content.all`, `storage:app` — no additional scopes
    - _Requirements: 7.1–7.7_

  - [ ] 13.2 Wire property test for structured error propagation
    - **Property 15: Stitcher wraps all API errors as structured StitchErrors**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.6**
    - Inject mock clients that throw non-2xx HTTP errors; for each stitcher method assert result has `ok: false`, `error.stage` is set to the correct stage, and `error.httpStatus` matches

- [ ] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each architecture layer
- Property tests use `fast-check` with minimum 100 iterations per property
- Unit tests use Vitest (`vitest --run` for single execution)
- The `nowMs` injection pattern in `StallDetector` is essential for deterministic property tests — do not use `Date.now()` directly inside the detector
- DocBuilder functions are pure with no side effects, making them ideal first targets for property testing
- Demo Mode is passed as a flag on every resolver call; the interceptor factories handle the switch transparently so stitchers never check `demoMode` directly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "3.6"] },
    { "id": 5, "tasks": ["4"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3"] },
    { "id": 8, "tasks": ["5.4", "5.5", "5.6"] },
    { "id": 9, "tasks": ["6.1"] },
    { "id": 10, "tasks": ["6.2", "7.1"] },
    { "id": 11, "tasks": ["7.2", "8.1"] },
    { "id": 12, "tasks": ["8.2"] },
    { "id": 13, "tasks": ["9"] },
    { "id": 14, "tasks": ["10.1"] },
    { "id": 15, "tasks": ["10.2"] },
    { "id": 16, "tasks": ["10.3", "11.1"] },
    { "id": 17, "tasks": ["10.4", "11.2"] },
    { "id": 18, "tasks": ["11.3"] },
    { "id": 19, "tasks": ["11.4"] },
    { "id": 20, "tasks": ["12"] },
    { "id": 21, "tasks": ["13.1"] },
    { "id": 22, "tasks": ["13.2"] },
    { "id": 23, "tasks": ["14"] }
  ]
}
```
