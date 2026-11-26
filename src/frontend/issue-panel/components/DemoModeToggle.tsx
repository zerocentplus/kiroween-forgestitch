import React from 'react';
import { invoke } from '@forge/bridge';
import type { StitchResult } from '../../../errors/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface DemoModeToggleProps {
  demoMode: boolean;
  onToggle: (newValue: boolean) => void;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DemoModeToggle
 *
 * Shows a toggle switch labelled "Demo Mode". When toggled, calls
 * `setDemoState` via @forge/bridge and notifies the parent via `onToggle`.
 * On invoke error the original value is restored (reverted) via `onToggle`.
 *
 * When `demoMode` is `true`, a visible "Demo Mode" badge is shown.
 *
 * Requirements: 1.8, 6.2, 6.9
 */
export function DemoModeToggle({ demoMode, onToggle }: DemoModeToggleProps): React.ReactElement {
  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;

    // Optimistically notify parent of the new value.
    onToggle(newValue);

    try {
      const result = (await invoke('setDemoState', { demoMode: newValue })) as StitchResult<{
        demoMode: boolean;
      }>;

      if (!result.ok) {
        // Invoke succeeded but resolver returned an error — revert.
        onToggle(demoMode);
      }
    } catch {
      // Invoke itself threw — revert to original value.
      onToggle(demoMode);
    }
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle} htmlFor="demo-mode-toggle">
        Demo Mode
      </label>
      <input
        id="demo-mode-toggle"
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
