import { requestJira, assumeTrustedRoute } from '@forge/api';
import type { JiraIssue, IssueLink, Comment, SprintWithIssues } from '../types';

// ─── Interface definitions ────────────────────────────────────────────────────

export interface IssueHistory {
  transitions: Array<{ dateMs: number; from: string; to: string }>;
  comments: Array<{ id: string; author: string; body: string; createdMs: number }>;
  fieldChanges: Array<{ dateMs: number; field: string; from: string | null; to: string | null }>;
}

export interface JiraClient {
  getIssue(issueKey: string): Promise<JiraIssue>;
  getIssueHistory(issueKey: string): Promise<IssueHistory>;
  getActiveSprint(projectKey: string): Promise<SprintWithIssues | null>;
}

// ─── Typed error ──────────────────────────────────────────────────────────────

export class JiraApiError extends Error {
  httpStatus: number;
  endpoint: string;

  constructor(message: string, httpStatus: number, endpoint: string) {
    super(message);
    this.name = 'JiraApiError';
    this.httpStatus = httpStatus;
    this.endpoint = endpoint;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkResponse(
  response: { status: number; json(): Promise<unknown> },
  endpoint: string,
): Promise<unknown> {
  if (response.status < 200 || response.status >= 300) {
    throw new JiraApiError(
      `Jira API request failed with status ${response.status}: ${endpoint}`,
      response.status,
      endpoint,
    );
  }
  return response.json();
}

function mapIssue(raw: Record<string, unknown>): JiraIssue {
  const fields = raw['fields'] as Record<string, unknown>;

  const comments = (
    (fields['comment'] as Record<string, unknown> | undefined)?.['comments'] as Array<Record<string, unknown>> ?? []
  ).map((c) => ({
    id: String(c['id']),
    author: ((c['author'] as Record<string, unknown> | null)?.['displayName'] as string) ?? '',
    body: (c['body'] as string) ?? '',
    createdMs: new Date(c['created'] as string).getTime(),
  })) as Comment[];

  const issueLinks = (
    (fields['issuelinks'] as Array<Record<string, unknown>>) ?? []
  ).map((link) => {
    const typeName = ((link['type'] as Record<string, unknown>)?.['name'] as string) ?? '';
    const outwardIssue = link['outwardIssue'] as Record<string, unknown> | undefined;
    const inwardIssue = link['inwardIssue'] as Record<string, unknown> | undefined;
    const outwardIssueKey = ((outwardIssue ?? inwardIssue)?.['key'] as string) ?? '';
    return { type: typeName, outwardIssueKey } as IssueLink;
  });

  const updatedMs = fields['updated']
    ? new Date(fields['updated'] as string).getTime()
    : 0;
  const latestCommentMs = comments.length > 0
    ? Math.max(...comments.map((c) => c.createdMs))
    : 0;
  const lastActivityMs = Math.max(updatedMs, latestCommentMs);

  return {
    id: String(raw['id']),
    key: String(raw['key']),
    summary: (fields['summary'] as string) ?? '',
    description: (fields['description'] as string | null) ?? null,
    status: ((fields['status'] as Record<string, unknown> | null)?.['name'] as string) ?? '',
    assignee: ((fields['assignee'] as Record<string, unknown> | null)?.['displayName'] as string) ?? null,
    priority: ((fields['priority'] as Record<string, unknown> | null)?.['name'] as string) ?? '',
    labels: (fields['labels'] as string[]) ?? [],
    issueLinks,
    comments,
    lastActivityMs,
  };
}

// ─── LiveJiraClient ───────────────────────────────────────────────────────────

export class LiveJiraClient implements JiraClient {
  async getIssue(issueKey: string): Promise<JiraIssue> {
    const path = `/rest/api/3/issue/${issueKey}?fields=summary,description,status,assignee,priority,labels,issuelinks,comment`;
    const response = await requestJira(assumeTrustedRoute(path), { method: 'GET' });
    const data = await checkResponse(response, path) as Record<string, unknown>;
    return mapIssue(data);
  }

  async getIssueHistory(issueKey: string): Promise<IssueHistory> {
    const path = `/rest/api/3/issue/${issueKey}?expand=changelog`;
    const response = await requestJira(assumeTrustedRoute(path), { method: 'GET' });
    const data = await checkResponse(response, path) as Record<string, unknown>;

    const fields = data['fields'] as Record<string, unknown>;

    const transitions: IssueHistory['transitions'] = [];
    const fieldChanges: IssueHistory['fieldChanges'] = [];

    const changelog = data['changelog'] as Record<string, unknown> | undefined;
    const histories = (changelog?.['histories'] as Array<Record<string, unknown>>) ?? [];

    for (const entry of histories) {
      const dateMs = new Date(entry['created'] as string).getTime();
      const items = (entry['items'] as Array<Record<string, unknown>>) ?? [];

      for (const item of items) {
        const field = (item['field'] as string) ?? '';
        if (field === 'status') {
          transitions.push({
            dateMs,
            from: (item['fromString'] as string) ?? '',
            to: (item['toString'] as string) ?? '',
          });
        } else {
          fieldChanges.push({
            dateMs,
            field,
            from: (item['fromString'] as string | null) ?? null,
            to: (item['toString'] as string | null) ?? null,
          });
        }
      }
    }

    const comments = (
      (fields['comment'] as Record<string, unknown> | undefined)?.['comments'] as Array<Record<string, unknown>> ?? []
    ).map((c) => ({
      id: String(c['id']),
      author: ((c['author'] as Record<string, unknown> | null)?.['displayName'] as string) ?? '',
      body: (c['body'] as string) ?? '',
      createdMs: new Date(c['created'] as string).getTime(),
    }));

    return { transitions, comments, fieldChanges };
  }

  async getActiveSprint(projectKey: string): Promise<SprintWithIssues | null> {
    // Step 1: find the board for this project
    const boardPath = `/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;
    const boardResponse = await requestJira(assumeTrustedRoute(boardPath), { method: 'GET' });
    const boardData = await checkResponse(boardResponse, boardPath) as Record<string, unknown>;

    const boards = (boardData['values'] as Array<Record<string, unknown>>) ?? [];
    if (boards.length === 0) return null;

    const boardId = boards[0]['id'] as number;

    // Step 2: find the active sprint on this board
    const sprintPath = `/rest/agile/1.0/board/${boardId}/sprint?state=active`;
    const sprintResponse = await requestJira(assumeTrustedRoute(sprintPath), { method: 'GET' });
    const sprintData = await checkResponse(sprintResponse, sprintPath) as Record<string, unknown>;

    const sprints = (sprintData['values'] as Array<Record<string, unknown>>) ?? [];
    if (sprints.length === 0) return null;

    const sprint = sprints[0];
    const sprintId = sprint['id'] as number;

    // Step 3: fetch issues in this sprint
    const issuesPath = `/rest/agile/1.0/sprint/${sprintId}/issue?fields=summary,description,status,assignee,priority,labels,issuelinks,comment,updated`;
    const issuesResponse = await requestJira(assumeTrustedRoute(issuesPath), { method: 'GET' });
    const issuesData = await checkResponse(issuesResponse, issuesPath) as Record<string, unknown>;

    const rawIssues = (issuesData['issues'] as Array<Record<string, unknown>>) ?? [];
    const issues = rawIssues.map(mapIssue);

    const doneCount = issues.filter((i) => i.status.toLowerCase() === 'done').length;
    const completionPercentage = issues.length > 0 ? (doneCount / issues.length) * 100 : 0;

    return {
      id: sprintId,
      name: (sprint['name'] as string) ?? '',
      startDateMs: new Date(sprint['startDate'] as string).getTime(),
      endDateMs: new Date(sprint['endDate'] as string).getTime(),
      completionPercentage,
      issues,
    };
  }
}
