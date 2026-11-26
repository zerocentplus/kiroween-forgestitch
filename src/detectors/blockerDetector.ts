import type { JiraIssue } from '../types';

const BLOCKED_LABEL = 'blocked';
const BLOCKING_LINK_TYPES = new Set(['is blocked by', 'blocks']);

/**
 * Returns the subset of issues that are classified as blocked.
 *
 * An issue is blocked if AT LEAST ONE of the following is true:
 *  1. It carries a label equal to "blocked" (case-insensitive).
 *  2. It has at least one IssueLink whose type is "is blocked by" or "blocks".
 */
export function detectBlocked(issues: JiraIssue[]): JiraIssue[] {
  return issues.filter(issue => {
    const hasBlockedLabel = issue.labels.some(
      label => label.toLowerCase() === BLOCKED_LABEL
    );
    if (hasBlockedLabel) return true;

    const hasBlockingLink = issue.issueLinks.some(link =>
      BLOCKING_LINK_TYPES.has(link.type)
    );
    return hasBlockingLink;
  });
}
