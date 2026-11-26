# Design Document

## Overview

ForgeStitch is an Atlassian Forge application that stitches together Jira issue tracking, Confluence documentation, and AI-powered sprint reporting into a single developer assistant. It runs entirely within the Forge platform, using Forge AI (Rovo) for all AI capabilities with no external LLM keys required.

The application consists of two Custom UI surfaces (Issue Panel and Project Dashboard), a TypeScript Stitcher backend running in Forge resolvers, and a Demo/Sandbox Mode layer that substitutes live API calls with bundled fixture data at runtime.

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Forge Platform                         │
│                                                            │
│  ┌────────────────────┐   ┌────────────────────────────┐  │
│  │   Issue Panel       │   │   Project Dashboard Page   │  │
│  │  (Custom UI React)  │   │   (Custom UI React)        │  │
│  └────────┬───────────┘   └────────────┬───────────────┘  │
│           │  bridge.invoke              │  bridge.invoke   │
│           ▼                             ▼                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │               Forge Resolver (Node.js/TS)            │  │
│  │                                                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ IssueStitcher│  │SprintStitcher│  │ DocBuilder │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘  │  │
│  │         │                │                 │          │  │
│  │  ┌──────▼────────────────▼─────────────────▼──────┐  │  │
│  │  │               API Gateway Layer                 │  │  │
│  │  │  ┌───────────┐ ┌──────────────┐ ┌───────────┐  │  │  │
│  │  │  │ JiraClient │ │ConfluenceCli │ │ForgeAICli │  │  │  │
│  │  │  └─────┬─────┘ └──────┬───────┘ └─────┬─────┘  │  │  │
│  │  └────────┼──────────────┼───────────────┼────────┘  │  │
│  │           │              │               │            │  │
│  │  ┌────────▼──────────────▼───────────────▼────────┐  │  │
│  │  │          Demo Mode Interceptor                  │  │  │
│  │  │  (substitutes sandbox data when active)         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────┐  ┌────────────────┐                 │
│  │   Jira REST API  │  │ Confluence API  │  Forge AI       │
│  └──────────────────┘  └────────────────┘                 │
└────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

**Forge Resolvers as the backend**: All business logic runs in Forge resolver functions called via `bridge.invoke`. This keeps API credentials within the Forge platform and avoids cross-origin issues.

**Demo Mode Interceptor**: A thin adapter wraps each API client. When Demo Mode is active (passed as a flag on every resolver call), the interceptor returns fixture data instead of making network requests. This keeps the stitcher logic identical in both modes.

**Upsert via Forge Storage**: Page links are stored in Forge's key-value storage (`@forge/api` storage) keyed by issue ID. The upsert check reads this store before deciding whether to create or update a Confluence page.

**Structured errors throughout**: Every resolver returns `{ ok: boolean; data?: T; error?: StitchError }`. UI components check `ok` before rendering data.

## Components and Interfaces

### 1. Custom UI: Issue Panel (`src/frontend/issue-panel/`)

**Responsibility**: Per-ticket panel rendered inside a Jira issue view.

**Key UI states**:
- Loading (skeleton)
- Loaded with linked pages
- Loaded with no linked pages (generate prompt)
- Action in progress (spinner + disabled buttons)
- Error (message + retry button)
- Demo Mode active (badge visible)

**Key components**:
- `IssuePanelApp` — root component, owns state machine
- `IssueMetaCard` — renders summary, status, assignee, priority
- `LinkedPagesList` — renders Confluence page links
- `ActionBar` — "Generate Tech Spec" and "Generate Changelog" buttons
- `DemoModeToggle` — toggle switch + badge
- `ErrorBanner` — human-readable error display with retry

### 2. Custom UI: Project Dashboard (`src/frontend/dashboard/`)

**Responsibility**: Full-page project-level dashboard.

**Key components**:
- `DashboardApp` — root, owns state machine
- `SprintHeader` — sprint name, dates, completion percentage
- `IssueBoard` — issues grouped by status
- `SprintPulsePanel` — health rating, at-risk list, action items
- `DemoModeToggle` — same toggle component (shared)
- `ErrorBanner` — shared component

### 3. Forge Resolvers (`src/resolvers/`)

```
src/resolvers/
  index.ts              — resolver registration
  issueResolver.ts      — getIssueData, generateTechSpec, generateChangelog
  sprintResolver.ts     — getSprintData, generateSprintPulse
  demoResolver.ts       — getDemoState, setDemoState
```

Each resolver entry point:
1. Reads `demoMode` flag from the payload
2. Passes flag to the API Gateway Layer
3. Delegates to the appropriate Stitcher
4. Returns `StitchResult<T>`

### 4. IssueStitcher (`src/stitchers/issueStitcher.ts`)

Orchestrates per-issue workflows:

```typescript
interface IssueStitcher {
  getIssueData(issueKey: string, demoMode: boolean): Promise<StitchResult<IssueData>>;
  generateTechSpec(issueKey: string, demoMode: boolean): Promise<StitchResult<PublishedPage>>;
  generateChangelog(issueKey: string, demoMode: boolean): Promise<StitchResult<PublishedPage>>;
}
```

**Tech Spec generation pipeline**:
1. `JiraClient.getIssue(issueKey)` — fetch summary, description, comments, acceptance criteria
2. `ForgeAIClient.generate(prompt)` — synthesize structured spec
3. `DocBuilder.buildTechSpec(aiResponse)` — format as Confluence Storage Format
4. `ConfluenceClient.upsertPage(spaceKey, title, body, existingPageId?)` — create or update
5. `storage.set(issueKey + ':techSpec', { pageId, pageUrl, title })` — persist link
6. Return `{ ok: true, data: { title, url } }`

**Changelog generation pipeline** follows the same structure, using `JiraClient.getIssueHistory()` and `DocBuilder.buildChangelog()`.

### 5. SprintStitcher (`src/stitchers/sprintStitcher.ts`)

Orchestrates sprint-level workflows:

```typescript
interface SprintStitcher {
  getSprintData(projectKey: string, demoMode: boolean): Promise<StitchResult<SprintData>>;
  generateSprintPulse(projectKey: string, demoMode: boolean): Promise<StitchResult<SprintPulse>>;
}
```

**Sprint Pulse pipeline**:
1. `JiraClient.getActiveSprint(projectKey)` — fetch sprint + all issues
2. `StallDetector.detect(issues)` — partition into stalled/active
3. `BlockerDetector.detect(issues)` — partition into blocked/unblocked
4. `ForgeAIClient.generate(sprintPulsePrompt)` — executive summary
5. Assemble and return `SprintPulse`

### 6. DocBuilder (`src/builders/docBuilder.ts`)

Pure functions that convert structured data into Confluence Storage Format XML strings.

```typescript
function buildTechSpec(input: TechSpecInput): string;
function buildChangelog(input: ChangelogInput): string;
```

These are pure functions with no side effects, making them directly unit-testable.

**Confluence Storage Format structure for Tech Spec**:
```xml
<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="title">Summary</ac:parameter>
  <ac:rich-text-body><p>{summary}</p></ac:rich-text-body>
</ac:structured-macro>
<h2>Context</h2><p>{context}</p>
<h2>Acceptance Criteria</h2><ul>...</ul>
<h2>Implementation Notes</h2><p>{implementationNotes}</p>
```

### 7. API Gateway Layer (`src/api/`)

```
src/api/
  jiraClient.ts         — JiraClient wrapping @forge/api requestJira
  confluenceClient.ts   — ConfluenceClient wrapping @forge/api requestConfluence
  forgeAIClient.ts      — ForgeAIClient wrapping @forge/api model.invoke
  demoInterceptor.ts    — DemoModeInterceptor wrapping all three clients
```

Each client method signature mirrors the stitcher's needs:

```typescript
// jiraClient.ts
interface JiraClient {
  getIssue(issueKey: string): Promise<JiraIssue>;
  getIssueHistory(issueKey: string): Promise<IssueHistory>;
  getActiveSprint(projectKey: string): Promise<SprintWithIssues | null>;
}

// confluenceClient.ts
interface ConfluenceClient {
  getPage(pageId: string): Promise<ConfluencePage>;
  upsertPage(params: UpsertPageParams): Promise<ConfluencePage>;
}

// forgeAIClient.ts
interface ForgeAIClient {
  generate(prompt: string): Promise<string>;
}
```

### 8. StallDetector & BlockerDetector (`src/detectors/`)

Pure functions extracted for testability:

```typescript
// stallDetector.ts
function detectStalled(issues: JiraIssue[], nowMs: number, thresholdDays?: number): JiraIssue[];
// thresholdDays defaults to 2; nowMs is injected for deterministic testing

// blockerDetector.ts
function detectBlocked(issues: JiraIssue[]): JiraIssue[];
```

### 9. Demo Mode Layer (`src/demo/`)

```
src/demo/
  sandboxData.ts        — fixture data exports
  demoInterceptor.ts    — wraps API clients
```

**Interceptor pattern**:

```typescript
function createJiraClient(demoMode: boolean): JiraClient {
  if (demoMode) return new DemoJiraClient(sandboxData);
  return new LiveJiraClient();
}
```

Both `DemoJiraClient` and `LiveJiraClient` implement the same `JiraClient` interface. The stitchers never know which is active.

### 10. Error Handling (`src/errors/`)

```typescript
// errors/types.ts
interface StitchError {
  stage: 'data-retrieval' | 'ai-generation' | 'confluence-publish' | 'unknown';
  message: string;
  httpStatus?: number;
  endpoint?: string;
}

type StitchResult<T> = { ok: true; data: T } | { ok: false; error: StitchError };
```

Every resolver wraps its entire body in a try/catch that maps any thrown value to a `StitchError` with `stage: 'unknown'`.

## Data Models

### JiraIssue

```typescript
interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
  assignee: string | null;
  priority: string;
  labels: string[];
  issueLinks: IssueLink[];
  comments: Comment[];
  lastActivityMs: number;         // max(updated, last comment created)
}

interface IssueLink {
  type: string;                   // e.g. "blocks", "is blocked by"
  outwardIssueKey: string;
}

interface Comment {
  id: string;
  author: string;
  body: string;
  createdMs: number;
}
```

### SprintWithIssues

```typescript
interface SprintWithIssues {
  id: number;
  name: string;
  startDateMs: number;
  endDateMs: number;
  completionPercentage: number;   // computed: Done / total * 100
  issues: JiraIssue[];
}
```

### SprintPulse

```typescript
interface SprintPulse {
  healthRating: 'green' | 'yellow' | 'red';
  stalledIssues: JiraIssue[];
  blockedIssues: JiraIssue[];
  atRiskIssues: JiraIssue[];      // union of stalled + blocked
  aiSummary: string | null;       // null when AI call failed (degraded mode)
  aiUnavailable: boolean;
  actionItems: string[];
}
```

### PublishedPage

```typescript
interface PublishedPage {
  title: string;
  url: string;
  pageId: string;
  wasCreated: boolean;            // true = new page, false = updated
}
```

### IssueData (returned to Issue Panel)

```typescript
interface IssueData {
  issue: JiraIssue;
  linkedPages: LinkedPage[];
}

interface LinkedPage {
  type: 'tech-spec' | 'changelog';
  title: string;
  url: string;
}
```

### TechSpecInput / ChangelogInput (DocBuilder inputs)

```typescript
interface TechSpecInput {
  issueSummary: string;
  aiGeneratedContent: {
    summary: string;
    context: string;
    acceptanceCriteria: string[];
    implementationNotes: string;
  };
}

interface ChangelogInput {
  issueSummary: string;
  entries: ChangelogEntry[];
}

interface ChangelogEntry {
  dateMs: number;
  type: 'transition' | 'comment' | 'field-change';
  description: string;
}
```

### Sandbox Data Structure

```typescript
interface SandboxData {
  sprint: SprintWithIssues;       // at least 5 issues, all required statuses
  issues: Record<string, JiraIssue>;
  confluencePages: {
    techSpec: ConfluencePage;
    changelog: ConfluencePage;
  };
  aiResponses: {
    techSpec: string;
    changelog: string;
    sprintPulse: string;
  };
}
```

### Resolver Payloads

```typescript
// Issue Panel → Resolver
interface GetIssueDataPayload   { issueKey: string; demoMode: boolean; }
interface GenerateTechSpecPayload { issueKey: string; demoMode: boolean; }
interface GenerateChangelogPayload { issueKey: string; demoMode: boolean; }

// Dashboard → Resolver
interface GetSprintDataPayload   { projectKey: string; demoMode: boolean; }
interface GenerateSprintPulsePayload { projectKey: string; demoMode: boolean; }
```

### Forge Manifest Modules

```yaml
modules:
  jira:issuePanel:
    - key: forge-stitch-issue-panel
      resource: issue-panel
      resolver:
        function: main
      title: ForgeStitch
  jira:projectPage:
    - key: forge-stitch-dashboard
      resource: dashboard
      resolver:
        function: main
      title: ForgeStitch Dashboard
  function:
    - key: main
      handler: index.handler
```

### Forge Manifest Scopes

```yaml
permissions:
  scopes:
    - read:jira-work
    - write:confluence-content
    - read:confluence-content.all
    - storage:app
```

## Error Handling

**Layered error propagation**:

1. **API clients** throw typed errors (wrapping `@forge/api` HTTP errors) that include the HTTP status and endpoint.
2. **Stitchers** catch errors from clients and rethrow as `StitchError` with the correct `stage` field:
   - Errors from Jira clients → `stage: 'data-retrieval'`
   - Errors from ForgeAI → `stage: 'ai-generation'`
   - Errors from Confluence clients → `stage: 'confluence-publish'`
3. **Resolvers** catch any remaining errors (including unexpected throws) and return `{ ok: false, error: { stage: 'unknown', message: ... } }`.
4. **UI components** check `result.ok`. On `false`, they render `<ErrorBanner>` with the human-readable `error.message`. Raw `httpStatus` and `endpoint` fields are used for logging only, never displayed in the UI.

**Degraded mode** (Sprint Pulse AI failure): When the ForgeAI call fails during Sprint Pulse generation, the stitcher logs the error and returns the raw aggregated data with `aiUnavailable: true`. The dashboard renders a notice that AI summarization is unavailable but still shows stalled/blocked issues.

**Partial content guard**: The Tech Spec and Changelog generators return early with a structured error if any pipeline stage fails. They never publish to Confluence until the AI response is fully received and formatted.

## File Structure

```
src/
  frontend/
    issue-panel/
      components/
        IssuePanelApp.tsx
        IssueMetaCard.tsx
        LinkedPagesList.tsx
        ActionBar.tsx
        DemoModeToggle.tsx
        ErrorBanner.tsx
      index.tsx
    dashboard/
      components/
        DashboardApp.tsx
        SprintHeader.tsx
        IssueBoard.tsx
        SprintPulsePanel.tsx
        DemoModeToggle.tsx
        ErrorBanner.tsx
      index.tsx
  resolvers/
    index.ts
    issueResolver.ts
    sprintResolver.ts
    demoResolver.ts
  stitchers/
    issueStitcher.ts
    sprintStitcher.ts
  builders/
    docBuilder.ts
  detectors/
    stallDetector.ts
    blockerDetector.ts
  api/
    jiraClient.ts
    confluenceClient.ts
    forgeAIClient.ts
  demo/
    sandboxData.ts
    demoInterceptor.ts
  errors/
    types.ts
  tests/
    docBuilder.test.ts
    stallDetector.test.ts
    blockerDetector.test.ts
    demoMode.test.ts
manifest.yml
package.json
tsconfig.json
```

## Testing Strategy

**Dual-layer approach**: The ForgeStitch test suite uses example-based unit tests for specific scenarios and property-based tests for universal invariants in the core logic.

### Unit Tests (example-based)

Located in `src/tests/`. Run with Vitest: `vitest --run`.

| File | What it covers |
|---|---|
| `docBuilder.test.ts` | Valid input → well-formed Confluence Storage Format XML; required sections present |
| `stallDetector.test.ts` | Issues at exactly the 2-day boundary, before it, and after it; non-In-Progress issues never stalled |
| `blockerDetector.test.ts` | "blocked" label (various cases), blocking link type, neither condition, both conditions |
| `demoMode.test.ts` | Each resolver called with `demoMode: true` returns sandbox fixture; real API spy count = 0 |

### Property-Based Tests

Property tests run with `fast-check` for each of the Correctness Properties listed below. Minimum 100 iterations per property.

Tag format: `Feature: forge-stitch, Property {N}: {property_title}`

**Target modules for property tests**:
- `DocBuilder` — Properties 6, 7
- `StallDetector` — Property 9
- `BlockerDetector` — Property 10
- `IssuePanel` / `Dashboard` renderers — Properties 1, 2, 3, 4, 5, 14
- `SprintStitcher` assembler — Property 11
- `DemoModeInterceptor` — Properties 12, 13
- `StitchError` propagation — Property 15, Property 8

### Integration Tests

Integration tests run against a Forge dev environment (`forge tunnel`). These cover:
- Forge manifest module registration (Requirement 7, SMOKE)
- End-to-end Tech Spec generation with live Jira and Confluence sandboxes (Requirements 3, 4)
- Sprint Pulse generation with live Jira sprint data (Requirement 5)

Integration tests use 1–3 representative examples and are not part of the CI unit-test run.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Issue panel renders all required Jira fields

*For any* Jira issue object with a summary, status, assignee, and priority, the rendered Issue Panel output shall contain each of those four field values.

**Validates: Requirements 1.2**

### Property 2: Confluence page links render title and URL

*For any* set of linked Confluence pages associated with an issue, the rendered Issue Panel output shall contain the page title text and an href attribute pointing to the page URL for each linked page.

**Validates: Requirements 1.3**

### Property 3: Error banner derives message from error object

*For any* `StitchError` object delivered to the Issue Panel or Project Dashboard, the rendered error banner shall display a non-empty human-readable string derived from the error's `message` field, and shall not render the raw `httpStatus`, `endpoint`, or stack-trace fields in visible UI output.

**Validates: Requirements 1.8, 2.7, 8.4, 8.5**

### Property 4: Sprint dashboard renders all sprint metadata fields

*For any* `SprintWithIssues` object with a name, start date, end date, and completion percentage, the rendered Project Dashboard header shall contain all four values.

**Validates: Requirements 2.2**

### Property 5: Issue grouping is exhaustive and correctly partitioned

*For any* list of sprint issues, the grouping function shall produce status groups whose union contains exactly the same issues as the input list, with each issue appearing in exactly one group matching its status value.

**Validates: Requirements 2.3**

### Property 6: DocBuilder produces well-formed Confluence Storage Format

*For any* `TechSpecInput` or `ChangelogInput` object with valid non-empty fields, the corresponding `DocBuilder` function shall return a string that is parseable as valid XML and contains the required structural elements (`<h2>`, `<p>`, `<ul>`, or `<ac:structured-macro>` tags as appropriate).

**Validates: Requirements 3.3, 4.3**

### Property 7: Successful publish returns non-empty title and URL

*For any* successful upsert operation (create or update), the returned `PublishedPage` object shall contain a non-empty `title` string and a non-empty `url` string.

**Validates: Requirements 3.6, 4.6**

### Property 8: Pipeline short-circuits on retrieval failure

*For any* simulated Jira API retrieval error thrown during Changelog generation, the ForgeAI client shall not be invoked and the resolver shall return a `StitchResult` with `ok: false` and `stage: 'data-retrieval'`.

**Validates: Requirements 4.7**

### Property 9: Stall detection correctly partitions by threshold and status

*For any* collection of Jira issues with varying statuses and last-activity timestamps, the stall detector shall classify an issue as stalled if and only if its status is `"In Progress"` and its `lastActivityMs` is more than 2 business days before the reference time `nowMs`. All other issues shall be classified as not stalled.

**Validates: Requirements 5.2**

### Property 10: Blocker detection correctly identifies blocked issues

*For any* Jira issue, the blocker detector shall return `blocked = true` if and only if the issue carries a `"blocked"` label (case-insensitive) or has at least one `IssueLink` with type `"is blocked by"` or `"blocks"`. All other issues shall return `blocked = false`.

**Validates: Requirements 5.3**

### Property 11: Sprint Pulse result contains all required fields

*For any* combination of stall-detection output, blocker-detection output, and ForgeAI summary string, the assembled `SprintPulse` object shall contain a non-null `healthRating`, a `stalledIssues` array, a `blockedIssues` array, and an `actionItems` array.

**Validates: Requirements 5.5**

### Property 12: Demo Mode substitutes all API calls with sandbox data

*For any* resolver function invoked with `demoMode: true`, every Jira and Confluence API method call shall return data sourced exclusively from `sandboxData`, and the underlying `requestJira` and `requestConfluence` Forge API functions shall not be called (zero invocations, verifiable via spy/mock).

**Validates: Requirements 6.3, 6.4**

### Property 13: Sandbox fixture satisfies minimum completeness

The `sandboxData` fixture shall contain a sprint with at least five issues such that the set of issue statuses includes all five required values: `"To Do"`, `"In Progress"` (active), `"In Progress"` (stalled), `"Blocked"`, and `"Done"`. The fixture shall also contain at least two Confluence page objects, one of type `tech-spec` and one of type `changelog`.

**Validates: Requirements 6.7, 6.8**

### Property 14: Demo Mode badge appears in both UIs when active

*For any* UI render call with Demo Mode active (`demoMode: true`), both the Issue Panel and the Project Dashboard rendered output shall contain a visible element with the text "Demo Mode".

**Validates: Requirements 6.9**

### Property 15: Stitcher wraps all API errors as structured StitchErrors

*For any* non-2xx HTTP response from a Jira API call, Confluence API call, or Forge AI call, the stitcher shall return `{ ok: false, error: StitchError }` where `error.stage` is set to the appropriate pipeline stage and `error.httpStatus` matches the HTTP status code of the failed response. No unhandled exception shall propagate to the resolver boundary.

**Validates: Requirements 8.1, 8.2, 8.3, 8.6**
