import React from 'react';
import type { LinkedPage } from '../../../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LinkedPagesListProps {
  pages: LinkedPage[];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const emptyPromptStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B778C',
  fontStyle: 'italic',
  margin: 0,
  padding: '8px 0',
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const typeBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  borderRadius: '3px',
  backgroundColor: '#EBECF0',
  color: '#42526E',
  fontSize: '11px',
  fontWeight: 500,
  flexShrink: 0,
};

const linkStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#0052CC',
  textDecoration: 'none',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * LinkedPagesList
 *
 * Renders a list of linked Confluence pages. Each page shows its title as
 * visible text with an `href` pointing to its URL.
 *
 * When the list is empty, renders a prompt to generate documentation.
 *
 * Requirements: 1.3, 1.4
 */
export function LinkedPagesList({ pages }: LinkedPagesListProps): React.ReactElement {
  if (pages.length === 0) {
    return (
      <div style={containerStyle}>
        <p style={emptyPromptStyle}>
          No documentation yet — generate a Tech Spec or Changelog below.
        </p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <ul style={listStyle}>
        {pages.map((page, index) => (
          <li key={`${page.type}-${index}`} style={listItemStyle}>
            <span style={typeBadgeStyle}>{page.type}</span>
            <a href={page.url} style={linkStyle} target="_blank" rel="noopener noreferrer">
              {page.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LinkedPagesList;
