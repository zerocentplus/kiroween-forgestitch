import type { TechSpecInput, ChangelogInput, ChangelogEntry } from '../types';

/**
 * Escapes characters that are special in XML/HTML so that user-supplied
 * strings are safe to embed in Confluence Storage Format documents.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formats a millisecond timestamp as a readable ISO date string (YYYY-MM-DD).
 */
function formatDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10);
}

/**
 * Returns a human-readable label for a changelog entry type.
 */
function entryTypeLabel(type: ChangelogEntry['type']): string {
  switch (type) {
    case 'transition':
      return 'Status Transition';
    case 'comment':
      return 'Comment';
    case 'field-change':
      return 'Field Change';
    default:
      return 'Update';
  }
}

/**
 * Builds a Confluence Storage Format XML document for a technical specification.
 *
 * Output structure:
 *   <ac:structured-macro ac:name="panel">  ← Summary panel
 *   <h2>Context</h2>
 *   <h2>Acceptance Criteria</h2>  ← <ul> list
 *   <h2>Implementation Notes</h2>
 *
 * Requirements: 3.3
 */
export function buildTechSpec(input: TechSpecInput): string {
  const { issueSummary, aiGeneratedContent } = input;
  const { summary, context, acceptanceCriteria, implementationNotes } = aiGeneratedContent;

  const criteriaItems = acceptanceCriteria
    .map((criterion) => `<li><p>${escapeXml(criterion)}</p></li>`)
    .join('');

  return [
    `<!-- ForgeStitch Tech Spec: ${escapeXml(issueSummary)} -->`,
    `<ac:structured-macro ac:name="panel">`,
    `  <ac:parameter ac:name="title">Summary</ac:parameter>`,
    `  <ac:rich-text-body><p>${escapeXml(summary)}</p></ac:rich-text-body>`,
    `</ac:structured-macro>`,
    `<h2>Context</h2>`,
    `<p>${escapeXml(context)}</p>`,
    `<h2>Acceptance Criteria</h2>`,
    `<ul>${criteriaItems}</ul>`,
    `<h2>Implementation Notes</h2>`,
    `<p>${escapeXml(implementationNotes)}</p>`,
  ].join('\n');
}

/**
 * Builds a Confluence Storage Format XML document for a changelog.
 *
 * Entries are rendered as a table sorted chronologically (ascending date).
 * Columns: Date | Type | Description
 *
 * Requirements: 4.3
 */
export function buildChangelog(input: ChangelogInput): string {
  const { issueSummary, entries } = input;

  const sorted = [...entries].sort((a, b) => a.dateMs - b.dateMs);

  const rows = sorted
    .map(
      (entry) =>
        [
          `    <tr>`,
          `      <td><p>${escapeXml(formatDate(entry.dateMs))}</p></td>`,
          `      <td><p>${escapeXml(entryTypeLabel(entry.type))}</p></td>`,
          `      <td><p>${escapeXml(entry.description)}</p></td>`,
          `    </tr>`,
        ].join('\n'),
    )
    .join('\n');

  const tableBody =
    rows.length > 0
      ? rows
      : `    <tr><td colspan="3"><p>No changelog entries recorded.</p></td></tr>`;

  return [
    `<!-- ForgeStitch Changelog: ${escapeXml(issueSummary)} -->`,
    `<h1>Changelog</h1>`,
    `<p>Issue: <strong>${escapeXml(issueSummary)}</strong></p>`,
    `<table>`,
    `  <tbody>`,
    `    <tr>`,
    `      <th><p><strong>Date</strong></p></th>`,
    `      <th><p><strong>Type</strong></p></th>`,
    `      <th><p><strong>Description</strong></p></th>`,
    `    </tr>`,
    tableBody,
    `  </tbody>`,
    `</table>`,
  ].join('\n');
}
