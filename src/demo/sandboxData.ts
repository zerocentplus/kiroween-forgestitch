import type { SandboxData, JiraIssue } from '../types';

// Relative timestamps — computed once at module load so values stay consistent
// within a session but always reflect "now" when the module is first imported.
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Individual issues ───────────────────────────────────────────────────────

const issueToDo: JiraIssue = {
  id: '10001',
  key: 'FS-1',
  summary: 'Design authentication flow for the new API gateway',
  description:
    'Outline the OAuth 2.0 flow, token refresh strategy, and error handling for the API gateway service.',
  status: 'To Do',
  assignee: null,
  priority: 'Medium',
  labels: [],
  issueLinks: [],
  comments: [],
  lastActivityMs: NOW - 3 * DAY_MS,
};

const issueInProgressActive: JiraIssue = {
  id: '10002',
  key: 'FS-2',
  summary: 'Implement JWT token validation middleware',
  description:
    'Build an Express middleware that validates incoming JWTs, checks expiry, and attaches the decoded payload to the request context.',
  status: 'In Progress',
  assignee: 'alice@example.com',
  priority: 'High',
  labels: ['backend'],
  issueLinks: [],
  comments: [
    {
      id: 'c-001',
      author: 'alice@example.com',
      body: 'Started implementation — token signature validation is working. Moving on to expiry checks.',
      createdMs: NOW - 1 * DAY_MS,
    },
  ],
  lastActivityMs: NOW - 1 * DAY_MS, // active: within 2 days
};

const issueInProgressStalled: JiraIssue = {
  id: '10003',
  key: 'FS-3',
  summary: 'Migrate legacy session store to Redis',
  description:
    'Replace the in-memory session store with a Redis-backed implementation using the ioredis client. Ensure session TTL is configurable via environment variable.',
  status: 'In Progress',
  assignee: 'bob@example.com',
  priority: 'High',
  labels: ['backend', 'infra'],
  issueLinks: [],
  comments: [
    {
      id: 'c-002',
      author: 'bob@example.com',
      body: 'Investigated ioredis connection pooling. Waiting for DevOps to provision the staging Redis cluster.',
      createdMs: NOW - 4 * DAY_MS,
    },
  ],
  lastActivityMs: NOW - 4 * DAY_MS, // stalled: older than 2 days
};

const issueBlocked: JiraIssue = {
  id: '10004',
  key: 'FS-4',
  summary: 'Write integration tests for the API gateway routing layer',
  description:
    'Integration tests require the JWT middleware (FS-2) and the Redis session store (FS-3) to be in place before they can run end-to-end.',
  status: 'Blocked',
  assignee: 'carol@example.com',
  priority: 'Medium',
  labels: ['blocked', 'testing'],
  issueLinks: [
    {
      type: 'is blocked by',
      outwardIssueKey: 'FS-3',
    },
  ],
  comments: [
    {
      id: 'c-003',
      author: 'carol@example.com',
      body: 'Cannot proceed until FS-3 is complete and the staging Redis cluster is available.',
      createdMs: NOW - 2 * DAY_MS,
    },
  ],
  lastActivityMs: NOW - 2 * DAY_MS,
};

const issueDone: JiraIssue = {
  id: '10005',
  key: 'FS-5',
  summary: 'Set up CI pipeline with GitHub Actions',
  description:
    'Configure a GitHub Actions workflow that runs lint, unit tests, and build on every pull request targeting the main branch.',
  status: 'Done',
  assignee: 'alice@example.com',
  priority: 'Medium',
  labels: ['devops'],
  issueLinks: [],
  comments: [
    {
      id: 'c-004',
      author: 'alice@example.com',
      body: 'Pipeline is live. All checks pass on the sample PR.',
      createdMs: NOW - 6 * DAY_MS,
    },
  ],
  lastActivityMs: NOW - 6 * DAY_MS,
};

// ─── sandboxData ─────────────────────────────────────────────────────────────

export const sandboxData: SandboxData = {
  sprint: {
    id: 1,
    name: 'ForgeStitch Sprint 1',
    startDateMs: NOW - 7 * DAY_MS,
    endDateMs: NOW + 7 * DAY_MS,
    completionPercentage: 20, // 1 Done out of 5 issues
    issues: [
      issueToDo,
      issueInProgressActive,
      issueInProgressStalled,
      issueBlocked,
      issueDone,
    ],
  },

  issues: {
    'FS-1': issueToDo,
    'FS-2': issueInProgressActive,
    'FS-3': issueInProgressStalled,
    'FS-4': issueBlocked,
    'FS-5': issueDone,
  },

  confluencePages: {
    techSpec: {
      id: 'cp-001',
      title: 'ForgeStitch — API Gateway Tech Spec',
      spaceKey: 'ENG',
      url: 'https://your-instance.atlassian.net/wiki/spaces/ENG/pages/cp-001',
      body: `<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="title">Summary</ac:parameter>
  <ac:rich-text-body>
    <p>This document describes the technical design for the ForgeStitch API gateway layer,
    covering authentication, routing, and session management.</p>
  </ac:rich-text-body>
</ac:structured-macro>
<h2>Context</h2>
<p>The API gateway centralises request routing and security enforcement for all backend microservices.</p>
<h2>Acceptance Criteria</h2>
<ul>
  <li>JWT tokens are validated on every request.</li>
  <li>Expired or invalid tokens return HTTP 401.</li>
  <li>Sessions are persisted in Redis with a configurable TTL.</li>
</ul>
<h2>Implementation Notes</h2>
<p>Use the <code>ioredis</code> client for Redis connectivity. Token validation should be extracted into
a standalone middleware function to keep route handlers clean.</p>`,
    },

    changelog: {
      id: 'cp-002',
      title: 'ForgeStitch — Changelog',
      spaceKey: 'ENG',
      url: 'https://your-instance.atlassian.net/wiki/spaces/ENG/pages/cp-002',
      body: `<h2>Changelog</h2>
<table>
  <tbody>
    <tr><th>Date</th><th>Type</th><th>Description</th></tr>
    <tr><td>2024-06-01</td><td>transition</td><td>FS-5 moved to Done — CI pipeline deployed.</td></tr>
    <tr><td>2024-06-02</td><td>comment</td><td>FS-3 — Waiting for staging Redis cluster from DevOps.</td></tr>
    <tr><td>2024-06-03</td><td>transition</td><td>FS-4 moved to Blocked — depends on FS-3.</td></tr>
  </tbody>
</table>`,
    },
  },

  aiResponses: {
    techSpec: `The ForgeStitch API gateway provides a centralised authentication and routing layer for all backend microservices.
JWT tokens issued by the identity provider are validated on every inbound request using the ioredis-backed session store.
Invalid or expired tokens result in an HTTP 401 response with a structured error body.
Session TTL is controlled by the SESSION_TTL_SECONDS environment variable, defaulting to 3600 seconds.
Route definitions live in a declarative configuration file that maps path prefixes to upstream service URLs.
All routing decisions are logged at INFO level for audit purposes.
The middleware stack order is: rate-limit → authenticate → route → respond.`,

    changelog: `Sprint 1 Activity Summary:
- FS-5 (CI Pipeline) completed on 1 Jun — GitHub Actions workflow is live across all PRs.
- FS-2 (JWT middleware) is in active development; token signature validation is complete.
- FS-3 (Redis session store) is stalled pending infrastructure provisioning.
- FS-4 (Integration tests) is blocked on FS-3; no progress until staging Redis is available.
- FS-1 (Auth flow design) has not yet been started and is the recommended next pick-up.`,

    sprintPulse: `Sprint health is YELLOW. One issue is complete (20 % velocity) but two issues require attention.
FS-3 (Redis migration) has been inactive for 4 days and is at risk of missing the sprint deadline;
the team should escalate the infrastructure dependency with DevOps today.
FS-4 (Integration tests) is explicitly blocked on FS-3 and will remain idle until the blocker is resolved.
FS-2 is progressing well and should reach Done within the sprint window.
Recommended actions: (1) escalate Redis cluster provisioning, (2) pair FS-1 with a team member this week
to prevent another stall, (3) review sprint scope if FS-3 slips further.`,
  },
};
