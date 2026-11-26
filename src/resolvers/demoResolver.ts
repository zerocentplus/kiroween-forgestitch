import Resolver from '@forge/resolver';
import { storage } from '@forge/api';

// ─── Payload types ────────────────────────────────────────────────────────────

interface SetDemoStatePayload {
  demoMode: boolean;
}

// ─── register ────────────────────────────────────────────────────────────────

/**
 * Registers the two demo-mode resolvers on the shared Resolver instance.
 * Called by src/resolvers/index.ts.
 *
 * Requirements: 6.6
 */
export function register(resolver: Resolver): void {
  // ── getDemoState ────────────────────────────────────────────────────────
  resolver.define('getDemoState', async () => {
    try {
      const value = await storage.get('demoMode');
      const demoMode = typeof value === 'boolean' ? value : false;
      return { ok: true as const, data: { demoMode } };
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

  // ── setDemoState ────────────────────────────────────────────────────────
  resolver.define<SetDemoStatePayload>('setDemoState', async ({ payload }) => {
    const { demoMode } = payload;
    try {
      await storage.set('demoMode', demoMode);
      return { ok: true as const, data: { demoMode } };
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
