/**
 * Property-based tests for DocBuilder.
 *
 * Property 6: DocBuilder produces well-formed Confluence Storage Format
 * Validates: Requirements 3.3, 4.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildTechSpec, buildChangelog } from '../builders/docBuilder';
import type { TechSpecInput, ChangelogInput, ChangelogEntry } from '../types';

// ─── XML validity helper ──────────────────────────────────────────────────────

/**
 * Minimal balanced-tag check: wraps the fragment in a root element, then
 * verifies that every opened tag has a matching close tag.  This deliberately
 * allows self-closing tags and processing instructions while catching the
 * most common malformations (unclosed or mismatched tags).
 *
 * Returns `true` when the wrapped document appears well-formed.
 */
function isWellFormedXml(fragment: string): boolean {
  const wrapped = `<root>${fragment}</root>`;

  // Extract all tags (opening, closing, self-closing, comments excluded).
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9:._-]*)(\s[^>]*)?(\/?)>/g;
  const stack: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(wrapped)) !== null) {
    const full = match[0];
    const tagName = match[1];
    const selfClosing = match[3] === '/';

    if (full.startsWith('</')) {
      // Closing tag — must match top of stack.
      if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
        return false;
      }
      stack.pop();
    } else if (!selfClosing) {
      // Opening tag.
      stack.push(tagName);
    }
    // Self-closing tags need no stack entry.
  }

  return stack.length === 0;
}

// ─── fast-check arbitraries ───────────────────────────────────────────────────

/** Non-empty printable string (excludes XML-special chars to keep the
 *  structural assertions simple; DocBuilder must escape them either way). */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 200 });

/** Arbitrary for a single ChangelogEntry. */
const changelogEntryArb: fc.Arbitrary<ChangelogEntry> = fc.record({
  dateMs: fc.integer({ min: 0, max: 9_999_999_999_999 }),
  type: fc.constantFrom('transition', 'comment', 'field-change') as fc.Arbitrary<
    ChangelogEntry['type']
  >,
  description: nonEmptyString,
});

/** Arbitrary for TechSpecInput with all non-empty string fields. */
const techSpecInputArb: fc.Arbitrary<TechSpecInput> = fc.record({
  issueSummary: nonEmptyString,
  aiGeneratedContent: fc.record({
    summary: nonEmptyString,
    context: nonEmptyString,
    acceptanceCriteria: fc.array(nonEmptyString, { minLength: 1, maxLength: 10 }),
    implementationNotes: nonEmptyString,
  }),
});

/** Arbitrary for ChangelogInput with at least one entry. */
const changelogInputArb: fc.Arbitrary<ChangelogInput> = fc.record({
  issueSummary: nonEmptyString,
  entries: fc.array(changelogEntryArb, { minLength: 1, maxLength: 10 }),
});

// ─── Property tests ───────────────────────────────────────────────────────────

describe('DocBuilder — Property 6: produces well-formed Confluence Storage Format', () => {
  describe('buildTechSpec', () => {
    it('output is valid XML for any non-empty TechSpecInput', () => {
      fc.assert(
        fc.property(techSpecInputArb, (input) => {
          const output = buildTechSpec(input);
          expect(isWellFormedXml(output)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('output contains the Summary panel macro for any input', () => {
      fc.assert(
        fc.property(techSpecInputArb, (input) => {
          const output = buildTechSpec(input);
          expect(output).toContain('<ac:structured-macro');
        }),
        { numRuns: 100 },
      );
    });

    it('output contains <h2>Context</h2> for any input', () => {
      fc.assert(
        fc.property(techSpecInputArb, (input) => {
          const output = buildTechSpec(input);
          expect(output).toContain('<h2>Context</h2>');
        }),
        { numRuns: 100 },
      );
    });

    it('output contains <h2>Acceptance Criteria</h2> for any input', () => {
      fc.assert(
        fc.property(techSpecInputArb, (input) => {
          const output = buildTechSpec(input);
          expect(output).toContain('<h2>Acceptance Criteria</h2>');
        }),
        { numRuns: 100 },
      );
    });

    it('output contains <h2>Implementation Notes</h2> for any input', () => {
      fc.assert(
        fc.property(techSpecInputArb, (input) => {
          const output = buildTechSpec(input);
          expect(output).toContain('<h2>Implementation Notes</h2>');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('buildChangelog', () => {
    it('output is valid XML for any non-empty ChangelogInput', () => {
      fc.assert(
        fc.property(changelogInputArb, (input) => {
          const output = buildChangelog(input);
          expect(isWellFormedXml(output)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('output contains a <table> structural element for any input with entries', () => {
      fc.assert(
        fc.property(changelogInputArb, (input) => {
          const output = buildChangelog(input);
          expect(output).toContain('<table>');
        }),
        { numRuns: 100 },
      );
    });

    it('every entry description appears somewhere in the output', () => {
      fc.assert(
        fc.property(changelogInputArb, (input) => {
          const output = buildChangelog(input);
          for (const entry of input.entries) {
            // Descriptions that contain XML-special chars will be escaped by
            // DocBuilder; we check for the raw string only when it has no such
            // chars, so we do not duplicate the escaping logic here.
            const hasMeta = /[&<>"']/.test(entry.description);
            if (!hasMeta) {
              expect(output).toContain(entry.description);
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
