import React from 'react';
import type { JiraIssue } from '../../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface IssueMetaCardProps {
  issue: JiraIssue;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '4px',
  border: '1px solid #DFE1E6',
  backgroundColor: '#FFFFFF',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const summaryStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#172B4D',
  lineHeight: '1.4',
  margin: 0,
};

const fieldRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#6B778C',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  minWidth: '80px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#172B4D',
};

const statusBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '12px',
  backgroundColor: '#0052CC',
  color: '#FFFFFF',
  fontSize: '12px',
  fontWeight: 500,
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * IssueMetaCard
 *
 * Renders summary, status, assignee, and priority from a `JiraIssue`.
 * When assignee is null, displays "Unassigned".
 *
 * Requirements: 1.2
 */
export function IssueMetaCard({ issue }: IssueMetaCardProps): React.ReactElement {
  return (
    <div style={cardStyle}>
      <p style={summaryStyle} data-testid="issue-summary">
        {issue.summary}
      </p>

      <div style={fieldRowStyle}>
        <span style={labelStyle}>Status</span>
        <span style={statusBadgeStyle} data-testid="issue-status">
          {issue.status}
        </span>
      </div>

      <div style={fieldRowStyle}>
        <span style={labelStyle}>Assignee</span>
        <span style={valueStyle} data-testid="issue-assignee">
          {issue.assignee ?? 'Unassigned'}
        </span>
      </div>

      <div style={fieldRowStyle}>
        <span style={labelStyle}>Priority</span>
        <span style={valueStyle} data-testid="issue-priority">
          {issue.priority}
        </span>
      </div>
    </div>
  );
}

export default IssueMetaCard;
