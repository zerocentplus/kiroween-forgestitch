import React from 'react';
import type { SprintWithIssues } from '../../../types';

interface SprintHeaderProps {
  sprint: SprintWithIssues;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '12px 16px',
  borderRadius: '4px',
  backgroundColor: '#F4F5F7',
  border: '1px solid #DFE1E6',
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#172B4D',
  margin: 0,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
};

const metaItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const metaLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#6B778C',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
};

const metaValueStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#172B4D',
};

const progressBarTrackStyle: React.CSSProperties = {
  height: '6px',
  borderRadius: '3px',
  backgroundColor: '#DFE1E6',
  width: '160px',
  overflow: 'hidden',
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * SprintHeader
 *
 * Renders sprint name, start date, end date, and completion percentage.
 * Requirements: 2.2
 */
export function SprintHeader({ sprint }: SprintHeaderProps): React.ReactElement {
  const pct = Math.min(100, Math.max(0, sprint.completionPercentage));

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle} data-testid="sprint-name">{sprint.name}</h1>
      <div style={metaRowStyle}>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>Start</span>
          <span style={metaValueStyle} data-testid="sprint-start">{formatDate(sprint.startDateMs)}</span>
        </div>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>End</span>
          <span style={metaValueStyle} data-testid="sprint-end">{formatDate(sprint.endDateMs)}</span>
        </div>
        <div style={metaItemStyle}>
          <span style={metaLabelStyle}>Completion</span>
          <span style={metaValueStyle} data-testid="sprint-completion">{pct.toFixed(0)}%</span>
          <div style={progressBarTrackStyle}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: '3px',
                backgroundColor: pct >= 80 ? '#36B37E' : '#0052CC',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SprintHeader;
