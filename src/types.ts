import type { ConfluencePage } from './api/confluenceClient';

// ─── Core Jira models ────────────────────────────────────────────────────────

export interface IssueLink {
  type: string; // e.g. "blocks", "is blocked by"
  outwardIssueKey: string;
}

export interface Comment {
  id: string;
  author: string;
  body: string;
  createdMs: number;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: string;
  assignee: string | null;
  priority: string;
  labels: string[];
  issueLinks: IssueLink[];
  comments: Comment[];
  lastActivityMs: number; // max(updated, last comment created)
}

// ─── Sprint models ───────────────────────────────────────────────────────────

export interface SprintWithIssues {
  id: number;
  name: string;
  startDateMs: number;
  endDateMs: number;
  completionPercentage: number; // computed: Done / total * 100
  issues: JiraIssue[];
}

export interface SprintPulse {
  healthRating: 'green' | 'yellow' | 'red';
  stalledIssues: JiraIssue[];
  blockedIssues: JiraIssue[];
  atRiskIssues: JiraIssue[]; // union of stalled + blocked
  aiSummary: string | null;  // null when AI call failed (degraded mode)
  aiUnavailable: boolean;
  actionItems: string[];
}

// ─── Confluence / publishing models ─────────────────────────────────────────

export interface PublishedPage {
  title: string;
  url: string;
  pageId: string;
  wasCreated: boolean; // true = new page, false = updated
}

// ─── Issue Panel data models ─────────────────────────────────────────────────

export interface LinkedPage {
  type: 'tech-spec' | 'changelog';
  title: string;
  url: string;
}

export interface IssueData {
  issue: JiraIssue;
  linkedPages: LinkedPage[];
}

// ─── DocBuilder input models ─────────────────────────────────────────────────

export interface TechSpecInput {
  issueSummary: string;
  aiGeneratedContent: {
    summary: string;
    context: string;
    acceptanceCriteria: string[];
    implementationNotes: string;
  };
}

export interface ChangelogEntry {
  dateMs: number;
  type: 'transition' | 'comment' | 'field-change';
  description: string;
}

export interface ChangelogInput {
  issueSummary: string;
  entries: ChangelogEntry[];
}

// ─── Sandbox / Demo Mode models ──────────────────────────────────────────────

export interface SandboxData {
  sprint: SprintWithIssues;
  issues: Record<string, JiraIssue>;
  confluencePages: {
    techSpec: ConfluencePage;
    changelog: ConfluencePage;
  };
  aiResponses: {
    techSpec: string;
    changelog: string;
    sprintPulse: string;
  };
}

// ─── Resolver payload interfaces ─────────────────────────────────────────────

export interface GetIssueDataPayload {
  issueKey: string;
  demoMode: boolean;
}

export interface GenerateTechSpecPayload {
  issueKey: string;
  demoMode: boolean;
}

export interface GenerateChangelogPayload {
  issueKey: string;
  demoMode: boolean;
}

export interface GetSprintDataPayload {
  projectKey: string;
  demoMode: boolean;
}

export interface GenerateSprintPulsePayload {
  projectKey: string;
  demoMode: boolean;
}
