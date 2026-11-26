import { createJiraClient, createForgeAIClient } from '../demo/demoInterceptor';
import { detectStalled } from '../detectors/stallDetector';
import { detectBlocked } from '../detectors/blockerDetector';
import { JiraApiError } from '../api/jiraClient';

import type { StitchResult, StitchError } from '../errors/types';
import type { SprintWithIssues, SprintPulse, JiraIssue } from '../types';

// ─── Error mapping ────────────────────────────────────────────────────────────

function toDataRetrievalError(err: unknown): StitchError {
  if (err instanceof JiraApiError) {
    return {
      stage: 'data-retrieval',
      message: err.message,
      httpStatus: err.httpStatus,
      endpoint: err.endpoint,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { stage: 'data-retrieval', message };
}

// ─── Health rating heuristic ──────────────────────────────────────────────────

/**
 * Maps stalled + blocked counts to a health rating.
 *
 *   0 total                  → "green"
 *   1–2 total                → "yellow"
 *   more than 2 total        → "red"
 */
function computeHealthRating(
  stalledCount: number,
  blockedCount: number,
): SprintPulse['healthRating'] {
  const total = stalledCount + blockedCount;
  if (total === 0) return 'green';
  if (total <= 2) return 'yellow';
  return 'red';
}

// ─── atRiskIssues deduplication ───────────────────────────────────────────────

/**
 * Returns the union of `stalled` and `blocked`, deduplicated by issue key.
 */
function mergeAtRisk(stalled: JiraIssue[], blocked: JiraIssue[]): JiraIssue[] {
  const seen = new Set<string>();
  const result: JiraIssue[] = [];

  for (const issue of [...stalled, ...blocked]) {
    if (!seen.has(issue.key)) {
      seen.add(issue.key);
      result.push(issue);
    }
  }

  return result;
}

// ─── AI response → action items ───────────────────────────────────────────────

/**
 * Extracts action items from the AI-generated prose.
 *
 * Strategy:
 *  1. Look for lines that start with a bullet marker (-, *, •, or a digit followed
 *     by a period/paren) — these are almost certainly action items.
 *  2. If no bullets are found, split on sentence boundaries and return up to three
 *     sentences as action items.
 *  3. Fall back to an empty array if the response is blank.
 */
function extractActionItems(aiResponse: string): string[] {
  const trimmed = aiResponse.trim();
  if (!trimmed) return [];

  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

  const bulletPattern = /^(?:[-*•]|\d+[.)]) +(.+)$/;
  const bullets = lines
    .map((line) => {
      const match = bulletPattern.exec(line);
      return match ? match[1].trim() : null;
    })
    .filter((item): item is string => item !== null);

  if (bullets.length > 0) return bullets;

  // No bullets — split prose into sentences and return up to three
  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  return sentences;
}

// ─── Sprint pulse prompt builder ──────────────────────────────────────────────

function buildSprintPulsePrompt(
  sprint: SprintWithIssues,
  stalledIssues: JiraIssue[],
  blockedIssues: JiraIssue[],
): string {
  const stalledList =
    stalledIssues.length > 0
      ? stalledIssues.map((i) => `  - ${i.key}: ${i.summary}`).join('\n')
      : '  (none)';

  const blockedList =
    blockedIssues.length > 0
      ? blockedIssues.map((i) => `  - ${i.key}: ${i.summary}`).join('\n')
      : '  (none)';

  return [
    `You are a scrum master assistant. Provide a brief executive summary of the sprint's health and list concrete action items.`,
    ``,
    `Sprint: ${sprint.name}`,
    `Completion: ${sprint.completionPercentage.toFixed(0)}% of issues marked Done`,
    `Total issues: ${sprint.issues.length}`,
    ``,
    `Stalled issues (In Progress with no activity for 2+ days):`,
    stalledList,
    ``,
    `Blocked issues:`,
    blockedList,
    ``,
    `Provide:`,
    `1. A 2–3 sentence summary of sprint health.`,
    `2. A bulleted list of action items (prefix each with "- ").`,
  ].join('\n');
}

// ─── getSprintData ────────────────────────────────────────────────────────────

/**
 * Fetches the active sprint for a project and returns it as-is.
 * Returns `{ ok: true, data: null }` if no active sprint exists.
 *
 * Requirements: 5.1, 5.7
 */
export async function getSprintData(
  projectKey: string,
  demoMode: boolean,
): Promise<StitchResult<SprintWithIssues | null>> {
  const jira = createJiraClient(demoMode);

  let sprint: SprintWithIssues | null;
  try {
    sprint = await jira.getActiveSprint(projectKey);
  } catch (err) {
    return { ok: false, error: toDataRetrievalError(err) };
  }

  return { ok: true, data: sprint };
}

// ─── generateSprintPulse ──────────────────────────────────────────────────────

/**
 * Runs the Sprint Pulse pipeline:
 *   1. Fetch active sprint via JiraClient — returns error result on failure
 *   2. Run StallDetector over sprint issues
 *   3. Run BlockerDetector over sprint issues
 *   4. Call ForgeAI for a prose summary — on ANY failure, sets aiUnavailable and continues
 *   5. Assemble and return SprintPulse
 *
 * When no active sprint exists the function returns a valid SprintPulse with
 * empty arrays and healthRating "green" so the caller can render a "no active
 * sprint" notice without crashing.
 *
 * Requirements: 5.1–5.7, 8.6
 */
export async function generateSprintPulse(
  projectKey: string,
  demoMode: boolean,
): Promise<StitchResult<SprintPulse>> {
  const jira = createJiraClient(demoMode);
  const ai = createForgeAIClient(demoMode);

  // ── Stage 1: Fetch active sprint ──────────────────────────────────────────
  let sprint: SprintWithIssues | null;
  try {
    sprint = await jira.getActiveSprint(projectKey);
  } catch (err) {
    return { ok: false, error: toDataRetrievalError(err) };
  }

  // No active sprint — return a minimal valid SprintPulse
  if (sprint === null) {
    const emptyPulse: SprintPulse = {
      healthRating: 'green',
      stalledIssues: [],
      blockedIssues: [],
      atRiskIssues: [],
      aiSummary: null,
      aiUnavailable: false,
      actionItems: [],
    };
    return { ok: true, data: emptyPulse };
  }

  // ── Stage 2: Detect stalled issues ───────────────────────────────────────
  const stalledIssues = detectStalled(sprint.issues, Date.now());

  // ── Stage 3: Detect blocked issues ───────────────────────────────────────
  const blockedIssues = detectBlocked(sprint.issues);

  // ── Stage 4: ForgeAI summary (degraded-mode on failure) ──────────────────
  let aiSummary: string | null = null;
  let aiUnavailable = false;
  let actionItems: string[] = [];

  try {
    const prompt = buildSprintPulsePrompt(sprint, stalledIssues, blockedIssues);
    const aiResponse = await ai.generate(prompt);
    aiSummary = aiResponse.trim() || null;
    if (aiSummary) {
      actionItems = extractActionItems(aiSummary);
    }
  } catch {
    // Any ForgeAI error is non-fatal — degrade gracefully (Requirement 5.6)
    aiUnavailable = true;
    aiSummary = null;
    actionItems = [];
  }

  // ── Stage 5: Assemble SprintPulse ─────────────────────────────────────────
  const atRiskIssues = mergeAtRisk(stalledIssues, blockedIssues);
  const healthRating = computeHealthRating(stalledIssues.length, blockedIssues.length);

  const pulse: SprintPulse = {
    healthRating,
    stalledIssues,
    blockedIssues,
    atRiskIssues,
    aiSummary,
    aiUnavailable,
    actionItems,
  };

  return { ok: true, data: pulse };
}
