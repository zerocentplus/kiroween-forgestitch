import React from 'react';
import { invoke } from '@forge/bridge';
import type { StitchResult } from '../../../errors/types';

interface DemoModeToggleProps {
  demoMode: boolean;
  onToggle: (newValue: boolean) => void;
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#42526E',
  userSelect: 'none',
  cursor: 'pointer',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '12px',
  backgroundColor: '#FF8B00',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.3px',
};

/**
 * DemoModeToggle (Dashboard)
 *
 * Same contract as the Issue Panel toggle.
 * Requirements: 2.7, 6.1, 6.9
 */
export function DemoModeToggle({ demoMode, onToggle }: DemoModeToggleProps): React.ReactElement {
  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    onToggle(newValue);
    try {
      const result = (await invoke('setDemoState', { demoMode: newValue })) as StitchResult<{
        demoMode: boolean;
      }>;
      if (!result.ok) onToggle(demoMode);
    } catch {
      onToggle(demoMode);
    }
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle} htmlFor="dash-demo-mode-toggle">
        Demo Mode
      </label>
      <input
        id="dash-demo-mode-toggle"
        type="checkbox"
        checked={demoMode}
        onChange={handleChange}
        aria-label="Toggle Demo Mode"
      />
      {demoMode && <span style={badgeStyle}>Demo Mode</span>}
    </div>
  );
}

export default DemoModeToggle;
