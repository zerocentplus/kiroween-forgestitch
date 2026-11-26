import React, { useCallback, useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import type { SprintPulse, SprintWithIssues } from '../../types';
import type { StitchError, StitchResult } from '../../errors/types';
import { DemoModeToggle } from './components/DemoModeToggle';
import { ErrorBanner } from './components/ErrorBanner';
import { SprintHeader } from './components/SprintHeader';
import { IssueBoard } from './components/IssueBoard';
import { SprintPulsePanel } from './components/SprintPulsePanel';

const unknownError = (err: unknown): StitchError => ({
  stage: 'unknown',
  message: err instanceof Error ? err.message : String(err),
});

export function DashboardApp(): React.ReactElement {
  const [projectKey, setProjectKey] = useState<string>('FS');
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [sprint, setSprint] = useState<SprintWithIssues | null>(null);
  const [pulse, setPulse] = useState<SprintPulse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pulseLoading, setPulseLoading] = useState<boolean>(false);
  const [error, setError] = useState<StitchError | null>(null);

  const loadSprintData = useCallback(async (projKey: string, isDemo: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = (await invoke('getSprintData', {
        projectKey: projKey,
        demoMode: isDemo,
      })) as StitchResult<SprintWithIssues>;

      if (res && res.ok) {
        setSprint(res.data);
      } else {
        setError(
          res && 'error' in res
            ? res.error
            : { stage: 'unknown', message: 'Failed to load sprint data.' },
        );
      }
    } catch (err) {
      setError(unknownError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [ctx, demoResult] = await Promise.all([
          (view.getContext() as unknown) as Promise<{ extension?: { project?: { key?: string } } }>,
          invoke('getDemoState', {}) as Promise<StitchResult<{ demoMode: boolean }>>,
        ]);

        if (cancelled) return;

        const key = ctx?.extension?.project?.key || 'FS';
        const demo =
          demoResult && typeof demoResult === 'object' && 'ok' in demoResult && demoResult.ok
            ? (demoResult as { ok: true; data: { demoMode: boolean } }).data.demoMode
            : true;

        setProjectKey(key);
        setDemoMode(demo);

        await loadSprintData(key, demo);
      } catch {
        if (!cancelled) {
          await loadSprintData('FS', true);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadSprintData]);

  const handleToggleDemo = useCallback(
    async (nextDemo: boolean) => {
      setDemoMode(nextDemo);
      setPulse(null);
      await loadSprintData(projectKey, nextDemo);
    },
    [projectKey, loadSprintData],
  );

  const handleGeneratePulse = useCallback(async () => {
    setPulseLoading(true);
    setError(null);
    try {
      const res = (await invoke('generateSprintPulse', {
        projectKey,
        demoMode,
      })) as StitchResult<SprintPulse>;

      if (res && res.ok) {
        setPulse(res.data);
      } else {
        setError(
          res && 'error' in res
            ? res.error
            : { stage: 'unknown', message: 'Failed to generate sprint pulse.' },
        );
      }
    } catch (err) {
      setError(unknownError(err));
    } finally {
      setPulseLoading(false);
    }
  }, [projectKey, demoMode]);

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D', margin: 0 }}>
            ForgeStitch &mdash; Project Sprint Dashboard
          </h1>
          <span style={{ fontSize: '12px', color: '#6B778C' }}>Project: {projectKey}</span>
        </div>
        <DemoModeToggle demoMode={demoMode} onToggle={handleToggleDemo} />
      </div>

      {error && <ErrorBanner error={error} onRetry={() => loadSprintData(projectKey, demoMode)} />}

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#6B778C', fontSize: '14px' }}>
          Loading sprint data...
        </div>
      ) : (
        sprint && (
          <>
            <SprintHeader sprint={sprint} />
            <SprintPulsePanel pulse={pulse} loading={pulseLoading} onGenerate={handleGeneratePulse} />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#172B4D', margin: '0 0 8px 0' }}>
                Sprint Issue Board ({sprint.issues.length})
              </h2>
              <IssueBoard issues={sprint.issues} />
            </div>
          </>
        )
      )}
    </div>
  );
}

export default DashboardApp;
