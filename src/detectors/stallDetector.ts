import type { JiraIssue } from '../types';

/**
 * Returns issues that are stalled — currently "In Progress" and with no
 * activity for longer than `thresholdDays`.
 *
 * @param issues        List of Jira issues to evaluate.
 * @param nowMs         Current time as a Unix timestamp in milliseconds.
 *                      Injected for deterministic testing; never use Date.now() here.
 * @param thresholdDays Number of days of inactivity before an in-progress issue
 *                      is considered stalled. Defaults to 2.
 */
export function detectStalled(
  issues: JiraIssue[],
  nowMs: number,
  thresholdDays: number = 2,
): JiraIssue[] {
  const thresholdMs = thresholdDays * 86_400_000;
  return issues.filter(
    (issue) =>
      issue.status === 'In Progress' &&
      issue.lastActivityMs < nowMs - thresholdMs,
  );
}
