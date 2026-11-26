import React from 'react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActionBarProps {
  onGenerateTechSpec: () => void;
  onGenerateChangelog: () => void;
  isLoading: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const buttonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: '#0052CC',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#B3D4FF',
  cursor: 'not-allowed',
};

const spinnerStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '14px',
  color: '#FFFFFF',
  lineHeight: 1,
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ActionBar
 *
 * Renders "Generate Tech Spec" and "Generate Changelog" buttons.
 * Both buttons are disabled while `isLoading` is true, and a loading
 * indicator ("…") is shown next to each label during that state.
 *
 * Requirements: 1.5, 1.6, 1.7
 */
export function ActionBar({
  onGenerateTechSpec,
  onGenerateChangelog,
  isLoading,
}: ActionBarProps): React.ReactElement {
  const style = isLoading ? buttonDisabledStyle : buttonStyle;

  return (
    <div style={containerStyle}>
      <button
        style={style}
        onClick={onGenerateTechSpec}
        disabled={isLoading}
        type="button"
      >
        Generate Tech Spec
        {isLoading && <span style={spinnerStyle} aria-hidden="true">…</span>}
      </button>

      <button
        style={style}
        onClick={onGenerateChangelog}
        disabled={isLoading}
        type="button"
      >
        Generate Changelog
        {isLoading && <span style={spinnerStyle} aria-hidden="true">…</span>}
      </button>
    </div>
  );
}

export default ActionBar;
