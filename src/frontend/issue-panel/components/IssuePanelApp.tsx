import React, { useCallback, useEffect, useState } from 'react';
import { invoke, view } from '@forge/bridge';
import type { IssueData } from '../../../types';
import type { StitchError, StitchResult } from '../../../errors/types';
import { ActionBar } from './ActionBar';
import { DemoModeToggle } from './DemoModeToggle';
import { ErrorBanner } from './ErrorBanner';
import { IssueMetaCard } from './IssueMetaCard';
import { LinkedPagesList } from './LinkedPagesList';

type PanelState =
  | { phase: 'loading' }
  | { phase: 'loaded'; data: IssueData }
  | { phase: 'action'; data: IssueData }
  | { phase: 'error'; error: StitchError };

const unknownError = (err: unknown): StitchError => ({
  stage: 'unknown',
  message: err instanceof Error ? err.message : String(err),
});

export function IssuePanelApp(): React.ReactElement {
  const [state, setState] = useState<PanelState>({ phase: 'loading' });
  const [issueKey, setIssueKey] = useState<string>('');
  const [demoMode, setDemoMode] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [ctx, demoResult] = await Promise.all([
          (view.getContext() as unknown) as Promise<{ extension: { issue: { key: string } } }>,
          invoke('getDemoState', {}) as Promise<StitchResult<{ demoMode: boolean }>>,
        ]);

        if (cancelled) return;

        const key = ctx.extension.issue.key;
        const demo =
          demoResult && typeof demoResult === 'object' && 'ok' in demoResult && demoResult.ok
            ? (demoResult as { ok: true; data: { demoMode: boolean } }).data.demoMode
            : false;

        setIssueKey(key);
        setDemoMode(demo);

        await fetchIssueData(key, demo, cancelled, setState);
      } catch (err) {
        if (!cancelled) setState({ phase: 'error', error: unknownError(err) });
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async (key: string, demo: boolean) => {
    await fetchIssueData(key, demo, false, setState);
  }, []);

  const handleAction = useCallback(
    async (resolverKey: 'generateTechSpec' | 'generateChangelog') => {
      if (state.phase !== 'loaded') return;
      const prevData = state.data;
      setState({ phase: 'action', data: prevData });

      try {
        const result = (await invoke(resolverKey, { issueKey, demoMode })) as StitchResult<unknown>;
        if (!result.ok) {
          setState({ phase: 'error', error: result.error });
          return;
        }
        await refresh(issueKey, demoMode);
      } catch (err) {
        setState({ phase: 'error', error: unknownError(err) });
      }
    },
    [state, issueKey, demoMode, refresh],
  );

  const handleGenerateTechSpec = useCallback(
    () => handleAction('generateTechSpec'),
    [handleAction],
  );

  const handleGenerateChangelog = useCallback(
    () => handleAction('generateChangelog'),
    [handleAction],
  );

  const handleDemoToggle = useCallback(
    async (newValue: boolean) => {
      setDemoMode(newValue);
      if (issueKey) await refresh(issueKey, newValue);
    },
    [issueKey, refresh],
  );

  const handleRetry = useCallback(() => {
    setState({ phase: 'loading' });
    if (issueKey) refresh(issueKey, demoMode);
  }, [issueKey, demoMode, refresh]);

  if (state.phase === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={skeletonStyle} aria-busy="true" aria-label="Loading issue data">
          Loading...
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div style={containerStyle}>
        <ErrorBanner error={state.error} onRetry={handleRetry} />
      </div>
    );
  }

  const { data } = state;
  const isLoading = state.phase === 'action';

  return (
    <div style={containerStyle}>
      <DemoModeToggle demoMode={demoMode} onToggle={handleDemoToggle} />
      <IssueMetaCard issue={data.issue} />
      <LinkedPagesList pages={data.linkedPages} />
      <ActionBar
        onGenerateTechSpec={handleGenerateTechSpec}
        onGenerateChangelog={handleGenerateChangelog}
        isLoading={isLoading}
      />
    </div>
  );
}

async function fetchIssueData(
  key: string,
  demo: boolean,
  cancelled: boolean,
  setState: React.Dispatch<React.SetStateAction<PanelState>>,
): Promise<void> {
  try {
    const result = (await invoke('getIssueData', { issueKey: key, demoMode: demo })) as StitchResult<IssueData>;
    if (cancelled) return;
    if (result.ok) {
      setState({ phase: 'loaded', data: result.data });
    } else {
      setState({ phase: 'error', error: result.error });
    }
  } catch (err) {
    if (!cancelled) {
      setState({ phase: 'error', error: unknownError(err) });
    }
  }
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '16px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const skeletonStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  color: '#6B778C',
  fontSize: '14px',
};

export default IssuePanelApp;
