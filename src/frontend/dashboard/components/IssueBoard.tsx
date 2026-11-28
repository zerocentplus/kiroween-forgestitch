import React from 'react';
import type { JiraIssue } from '../../../types';

interface IssueBoardProps {
  issues: JiraIssue[];
}

const boardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  overflowX: 'auto',
  alignItems: 'flex-start',
};

const columnStyle: React.CSSProperties = {
  flex: '0 0 220px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  backgroundColor: '#F4F5F7',
  borderRadius: '4px',
  padding: '10px',
};

const columnHeaderStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#42526E',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  margin: 0,
  paddingBottom: '6px',
  borderBottom: '1px solid #DFE1E6',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '4px',
  border: '1px solid #DFE1E6',
  padding: '8px 10px',
  fontSize: '13px',
  color: '#172B4D',
  lineHeight: '1.4',
};

const cardKeyStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#6B778C',
  fontWeight: 600,
  marginBottom: '2px',
};

// Status display order
const STATUS_ORDER = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Done'];

/**
 * Groups issues by their `status` field.
 * Each issue appears in exactly one column (Property 5).
 */
export function groupByStatus(issues: JiraIssue[]): Map<string, JiraIssue[]> {
  const map = new Map<string, JiraIssue[]>();
  for (const issue of issues) {
    const existing = map.get(issue.status);
    if (existing) {
      existing.push(issue);
    } else {
      map.set(issue.status, [issue]);
    }
  }
  return map;
}

/**
 * IssueBoard
 *
 * Groups sprint issues by status into named columns.
 * Each issue appears in exactly one column.
 * Requirements: 2.3
 */
export function IssueBoard({ issues }: IssueBoardProps): React.ReactElement {
  const grouped = groupByStatus(issues);

  // Build column order: known statuses first (in defined order), then any extra ones alphabetically
  const knownPresent = STATUS_ORDER.filter((s) => grouped.has(s));
  const extraStatuses = [...grouped.keys()]
    .filter((s) => !STATUS_ORDER.includes(s))
    .sort();
  const orderedStatuses = [...knownPresent, ...extraStatuses];

  if (orderedStatuses.length === 0) {
    return (
      <div style={{ color: '#6B778C', fontSize: '14px', padding: '8px 0' }}>
        No issues in this sprint.
      </div>
    );
  }

  return (
    <div style={boardStyle}>
      {orderedStatuses.map((status) => {
        const columnIssues = grouped.get(status) ?? [];
        return (
          <div key={status} style={columnStyle}>
            <p style={columnHeaderStyle}>
              {status} ({columnIssues.length})
            </p>
            {columnIssues.map((issue) => (
              <div key={issue.key} style={cardStyle}>
                <div style={cardKeyStyle}>{issue.key}</div>
                <div>{issue.summary}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default IssueBoard;
