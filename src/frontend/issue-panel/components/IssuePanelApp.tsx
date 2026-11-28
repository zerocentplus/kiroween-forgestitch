import React, { useState } from 'react';

export const IssuePanelApp: React.FC = () => {
  const [docType, setDocType] = useState<'spec' | 'changelog' | null>(null);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '12px', color: '#172B4D', backgroundColor: '#FFFFFF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ backgroundColor: '#0052CC', color: '#FFF', fontWeight: 700, fontSize: '11px', padding: '3px 7px', borderRadius: '4px' }}>FORGESTITCH AI • TD-1</span>
        <span style={{ fontSize: '11px', color: '#006644', backgroundColor: '#E3FCEF', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>? Demo Mode Ready</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setDocType('spec')}
          style={{ flex: 1, backgroundColor: '#0052CC', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '9px 12px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
        >
          Generate Tech Spec
        </button>
        <button
          type="button"
          onClick={() => setDocType('changelog')}
          style={{ flex: 1, backgroundColor: '#0747A6', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '9px 12px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
        >
          Generate Changelog
        </button>
      </div>

      {docType === null && (
        <div style={{ backgroundColor: '#F4F5F7', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Investigate payment gateway timeout</div>
          <div style={{ color: '#42526E' }}>Status: <strong>To Do</strong> • Priority: <strong>Critical</strong> • Assignee: <strong>David Kirvalidze</strong></div>
        </div>
      )}

      {docType === 'spec' && (
        <div style={{ border: '1px solid #B3D4FF', backgroundColor: '#F4F8FF', borderRadius: '6px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <strong style={{ color: '#0747A6', fontSize: '13px' }}>Technical Specification — TD-1</strong>
            <span style={{ fontSize: '11px', backgroundColor: '#E3FCEF', color: '#006644', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>? Published to Confluence</span>
          </div>
          <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Root Cause:</strong> Mobile checkout HTTP 502 timeouts due to connection pool exhaustion.</p>
          <p style={{ fontSize: '12px', margin: '4px 0 8px' }}><strong>Fix:</strong> HTTP keep-alive pooling (maxSockets: 50) + 3x exponential backoff retry.</p>
          <a href="https://atlassian.net" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#0052CC', fontWeight: 600 }}>Open Confluence Page ?</a>
        </div>
      )}

      {docType === 'changelog' && (
        <div style={{ border: '1px solid #ABF5D1', backgroundColor: '#F3FCF7', borderRadius: '6px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <strong style={{ color: '#006644', fontSize: '13px' }}>Release Changelog — TD-1</strong>
            <span style={{ fontSize: '11px', backgroundColor: '#E3FCEF', color: '#006644', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>? Synced to Confluence</span>
          </div>
          <p style={{ fontSize: '12px', margin: '4px 0' }}><strong>Fixed:</strong> Resolved intermittent 502 gateway timeouts on mobile checkout.</p>
          <p style={{ fontSize: '12px', margin: '4px 0 8px' }}><strong>Impact:</strong> Eliminates peak-traffic payment drops and stabilizes latency under 400ms.</p>
          <a href="https://atlassian.net" target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#006644', fontWeight: 600 }}>Open Release Notes in Confluence ?</a>
        </div>
      )}
    </div>
  );
};

export default IssuePanelApp;
