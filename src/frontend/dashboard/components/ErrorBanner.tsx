import React from 'react';
import type { StitchError } from '../../../errors/types';

interface ErrorBannerProps {
  error: StitchError;
  onRetry: () => void;
}

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 14px',
  borderRadius: '4px',
  backgroundColor: '#FFEBE6',
  border: '1px solid #FF5630',
  color: '#BF2600',
};

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.4',
  flex: 1,
};

const retryButtonStyle: React.CSSProperties = {
  flexShrink: 0,
  padding: '4px 12px',
  borderRadius: '4px',
  border: '1px solid #FF5630',
  backgroundColor: 'transparent',
  color: '#BF2600',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

/**
 * ErrorBanner (Dashboard)
 *
 * Renders error.message only — never httpStatus, endpoint, or stack trace.
 * Requirements: 2.7, 8.4, 8.5
 */
export function ErrorBanner({ error, onRetry }: ErrorBannerProps): React.ReactElement {
  return (
    <div style={bannerStyle} role="alert">
      <span style={messageStyle}>{error.message}</span>
      <button style={retryButtonStyle} onClick={onRetry} type="button">
        Retry
      </button>
    </div>
  );
}

export default ErrorBanner;
