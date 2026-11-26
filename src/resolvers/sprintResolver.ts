import Resolver from '@forge/resolver';

import {
  getSprintData,
  generateSprintPulse,
} from '../stitchers/sprintStitcher';

import type {
  GetSprintDataPayload,
  GenerateSprintPulsePayload,
} from '../types';

// ─── register ────────────────────────────────────────────────────────────────

/**
 * Registers the two sprint-dashboard resolvers on the shared Resolver instance.
 * Called by src/resolvers/index.ts.
 */
export function register(resolver: Resolver): void {
  // ── getSprintData ───────────────────────────────────────────────────────
  resolver.define<GetSprintDataPayload>('getSprintData', async ({ payload }) => {
    const { projectKey, demoMode } = payload;
    try {
      return await getSprintData(projectKey, demoMode);
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

  // ── generateSprintPulse ─────────────────────────────────────────────────
  resolver.define<GenerateSprintPulsePayload>('generateSprintPulse', async ({ payload }) => {
    const { projectKey, demoMode } = payload;
    try {
      return await generateSprintPulse(projectKey, demoMode);
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
