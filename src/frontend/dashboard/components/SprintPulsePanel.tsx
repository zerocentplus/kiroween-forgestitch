import React from 'react';
import type { SprintPulse } from '../../../types';

interface SprintPulsePanelProps {
  pulse: SprintPulse | null;
  loading: boolean;
  onGenerate: () => void;
}

const badgeColors: Record<SprintPulse['healthRating'], { bg: string; text: string; label: string }> = {
  green: { bg: '#E3FCEF', text: '#006644', label: 'HEALTHY (GREEN)' },
  yellow: { bg: '#FFFAE6', text: '#FF8B00', label: 'AT RISK (YELLOW)' },
  red: { bg: '#FFEBE6', text: '#BF2600', label: 'CRITICAL (RED)' },
};

export function SprintPulsePanel({ pulse, loading, onGenerate }: SprintPulsePanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: '6px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #DFE1E6',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
          AI Sprint Pulse &amp; Blocker Stitcher
        </h2>
        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: loading ? '#B3D4FF' : '#0052CC',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Analyzing Sprint...' : pulse ? 'Refresh Sprint Pulse' : 'Generate Sprint Pulse'}
        </button>
      </div>

      {!pulse && !loading && (
        <p style={{ fontSize: '13px', color: '#6B778C', margin: 0 }}>
          Click &ldquo;Generate Sprint Pulse&rdquo; to detect stalled/blocked tickets and stitch an AI executive report.
        </p>
      )}

      {pulse && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: badgeColors[pulse.healthRating].bg,
                color: badgeColors[pulse.healthRating].text,
              }}
            >
              {badgeColors[pulse.healthRating].label}
            </span>
            <span style={{ fontSize: '12px', color: '#42526E' }}>
              Blocked: <strong>{pulse.blockedIssues.length}</strong> &bull; Stalled:{' '}
              <strong>{pulse.stalledIssues.length}</strong> &bull; At Risk:{' '}
              <strong>{pulse.atRiskIssues.length}</strong>
            </span>
          </div>

          {pulse.aiUnavailable ? (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '4px',
                backgroundColor: '#FFFAE6',
                border: '1px solid #FFE380',
                fontSize: '13px',
                color: '#172B4D',
              }}
            >
              AI narrative unavailable — showing deterministic blocker and stall diagnostics below.
            </div>
          ) : (
            pulse.aiSummary && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '4px',
                  backgroundColor: '#F4F5F7',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: '#172B4D',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {pulse.aiSummary}
              </div>
            )
          )}

          {pulse.atRiskIssues.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#42526E', marginBottom: '6px' }}>
                AT-RISK TICKETS ({pulse.atRiskIssues.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {pulse.atRiskIssues.map((issue) => (
                  <div
                    key={issue.key}
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      backgroundColor: '#FFEBE6',
                      color: '#172B4D',
                    }}
                  >
                    <strong>{issue.key}</strong>: {issue.summary} ({issue.status})
                  </div>
                ))}
              </div>
            </div>
          )}

          {pulse.actionItems.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#42526E', marginBottom: '6px' }}>
                RECOMMENDED ACTION ITEMS
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#172B4D' }}>
                {pulse.actionItems.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SprintPulsePanel;
