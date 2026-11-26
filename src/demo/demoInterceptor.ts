import type { JiraClient, IssueHistory } from '../api/jiraClient';
import type { ConfluenceClient, ConfluencePage, UpsertPageParams } from '../api/confluenceClient';
import type { ForgeAIClient } from '../api/forgeAIClient';
import type { JiraIssue, SprintWithIssues } from '../types';
import { LiveJiraClient } from '../api/jiraClient';
import { LiveConfluenceClient } from '../api/confluenceClient';
import { LiveForgeAIClient } from '../api/forgeAIClient';
import { sandboxData } from './sandboxData';

// ─── DemoJiraClient ───────────────────────────────────────────────────────────

class DemoJiraClient implements JiraClient {
  getIssue(issueKey: string): Promise<JiraIssue> {
    const issue =
      sandboxData.issues[issueKey] ?? sandboxData.sprint.issues[0];
    return Promise.resolve(issue);
  }

  getIssueHistory(issueKey: string): Promise<IssueHistory> {
    const issue =
      sandboxData.issues[issueKey] ?? sandboxData.sprint.issues[0];

    // Synthesize a fake status transition: "To Do" → current status
    const fakeTransition =
      issue.status !== 'To Do'
        ? [
            {
              dateMs: issue.lastActivityMs - 24 * 60 * 60 * 1000,
              from: 'To Do',
              to: issue.status,
            },
          ]
        : [];

    const history: IssueHistory = {
      transitions: fakeTransition,
      comments: issue.comments.map((c) => ({
        id: c.id,
        author: c.author,
        body: c.body,
        createdMs: c.createdMs,
      })),
      fieldChanges: [],
    };

    return Promise.resolve(history);
  }

  getActiveSprint(_projectKey: string): Promise<SprintWithIssues | null> {
    return Promise.resolve(sandboxData.sprint);
  }
}

// ─── DemoConfluenceClient ─────────────────────────────────────────────────────

class DemoConfluenceClient implements ConfluenceClient {
  getPage(pageId: string): Promise<ConfluencePage> {
    const page =
      pageId === sandboxData.confluencePages.techSpec.id
        ? sandboxData.confluencePages.techSpec
        : sandboxData.confluencePages.changelog;
    return Promise.resolve(page);
  }

  upsertPage(params: UpsertPageParams): Promise<ConfluencePage> {
    const page: ConfluencePage = {
      id: params.existingPageId ?? `demo-page-${Date.now()}`,
      title: params.title,
      spaceKey: params.spaceKey,
      url: `https://demo.atlassian.net/wiki/spaces/${params.spaceKey}/pages/${params.existingPageId ?? 'new'}`,
      body: params.body,
    };
    return Promise.resolve(page);
  }
}

// ─── DemoForgeAIClient ────────────────────────────────────────────────────────

class DemoForgeAIClient implements ForgeAIClient {
  generate(prompt: string): Promise<string> {
    const lower = prompt.toLowerCase();
    let response: string;

    if (lower.includes('changelog')) {
      response = sandboxData.aiResponses.changelog;
    } else if (lower.includes('sprint')) {
      response = sandboxData.aiResponses.sprintPulse;
    } else {
      response = sandboxData.aiResponses.techSpec;
    }

    return Promise.resolve(response);
  }
}

// ─── Factory functions ────────────────────────────────────────────────────────

export function createJiraClient(demoMode: boolean): JiraClient {
  if (demoMode) return new DemoJiraClient();
  return new LiveJiraClient();
}

export function createConfluenceClient(demoMode: boolean): ConfluenceClient {
  if (demoMode) return new DemoConfluenceClient();
  return new LiveConfluenceClient();
}

export function createForgeAIClient(demoMode: boolean): ForgeAIClient {
  if (demoMode) return new DemoForgeAIClient();
  return new LiveForgeAIClient();
}
