import Resolver from '@forge/resolver';

import {
  getIssueData,
  generateTechSpec,
  generateChangelog,
} from '../stitchers/issueStitcher';

import type {
  GetIssueDataPayload,
  GenerateTechSpecPayload,
  GenerateChangelogPayload,
} from '../types';

// ─── register ────────────────────────────────────────────────────────────────

/**
 * Registers the three issue-panel resolvers on the shared Resolver instance.
 * Called by src/resolvers/index.ts.
 */
export function register(resolver: Resolver): void {
  // ── getIssueData ────────────────────────────────────────────────────────
  resolver.define<GetIssueDataPayload>('getIssueData', async ({ payload }) => {
    const { issueKey, demoMode } = payload;
    try {
      return await getIssueData(issueKey, demoMode);
    } catch (err) {
      return {
        ok: false as const,
        error: {
          stage: 'unknown' as const,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  });

  // ── generateTechSpec ────────────────────────────────────────────────────
  resolver.define<GenerateTechSpecPayload>('generateTechSpec', async ({ payload }) => {
    const { issueKey, demoMode } = payload;
    try {
      return await generateTechSpec(issueKey, demoMode);
    } catch (err) {
      return {
        ok: false as const,
        error: {
          stage: 'unknown' as const,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  });

  // ── generateChangelog ───────────────────────────────────────────────────
  resolver.define<GenerateChangelogPayload>('generateChangelog', async ({ payload }) => {
    const { issueKey, demoMode } = payload;
    try {
      return await generateChangelog(issueKey, demoMode);
    } catch (err) {
      return {
        ok: false as const,
        error: {
          stage: 'unknown' as const,
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  });
}
