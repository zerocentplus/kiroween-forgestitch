import { storage } from '@forge/api';

import { createJiraClient, createConfluenceClient, createForgeAIClient } from '../demo/demoInterceptor';
import { buildTechSpec, buildChangelog } from '../builders/docBuilder';
import { JiraApiError } from '../api/jiraClient';
import { ConfluenceApiError } from '../api/confluenceClient';
import { ForgeAIError } from '../api/forgeAIClient';

import type { StitchResult, StitchError } from '../errors/types';
import type { IssueData, LinkedPage, PublishedPage, TechSpecInput, ChangelogInput, ChangelogEntry } from '../types';

// ─── Storage key helpers ──────────────────────────────────────────────────────

function techSpecKey(issueKey: string): string {
  return `${issueKey}:techSpec`;
}

function changelogKey(issueKey: string): string {
  return `${issueKey}:changelog`;
}

// ─── Stored page link shape ───────────────────────────────────────────────────

interface StoredPageLink {
  pageId: string;
  pageUrl: string;
  title: string;
}

// ─── Error mapping helpers ────────────────────────────────────────────────────

function toDataRetrievalError(err: unknown): StitchError {
  if (err instanceof JiraApiError) {
    return {
      stage: 'data-retrieval',
      message: err.message,
      httpStatus: err.httpStatus,
      endpoint: err.endpoint,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { stage: 'data-retrieval', message };
}

function toAiGenerationError(err: unknown): StitchError {
  if (err instanceof ForgeAIError) {
    return { stage: 'ai-generation', message: err.message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { stage: 'ai-generation', message };
}

function toConfluencePublishError(err: unknown): StitchError {
  if (err instanceof ConfluenceApiError) {
    return {
      stage: 'confluence-publish',
      message: err.message,
      httpStatus: err.httpStatus,
      endpoint: err.endpoint,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { stage: 'confluence-publish', message };
}

// ─── Forge Storage helpers ────────────────────────────────────────────────────

async function readStoredLink(storageKey: string): Promise<StoredPageLink | null> {
  try {
    const value = await storage.get(storageKey);
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as StoredPageLink).pageId === 'string' &&
      typeof (value as StoredPageLink).pageUrl === 'string' &&
      typeof (value as StoredPageLink).title === 'string'
    ) {
      return value as StoredPageLink;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── CONF page title helpers ──────────────────────────────────────────────────

function techSpecTitle(issueSummary: string, issueKey: string): string {
  return `${issueKey} — Tech Spec: ${issueSummary}`;
}

function changelogTitle(issueSummary: string, issueKey: string): string {
  return `${issueKey} — Changelog: ${issueSummary}`;
}

// ─── Confluence space key ─────────────────────────────────────────────────────

/**
 * Derive a Confluence space key from the issue key (e.g. "FS-1" → "FS").
 * Falls back to "ENG" if the key doesn't contain a hyphen.
 */
function spaceKeyFromIssueKey(issueKey: string): string {
  const idx = issueKey.indexOf('-');
  return idx > 0 ? issueKey.slice(0, idx) : 'ENG';
}

// ─── getIssueData ─────────────────────────────────────────────────────────────

/**
 * Fetches a Jira issue and reads any linked Confluence pages from Forge Storage.
 *
 * Requirements: 1.2, 1.3, 1.4
 */
export async function getIssueData(
  issueKey: string,
  demoMode: boolean,
): Promise<StitchResult<IssueData>> {
  const jira = createJiraClient(demoMode);

  let issue;
  try {
    issue = await jira.getIssue(issueKey);
  } catch (err) {
    return { ok: false, error: toDataRetrievalError(err) };
  }

  // Read linked pages from Forge Storage — failures are non-fatal (return empty list)
  const [techSpecLink, changelogLink] = await Promise.all([
    readStoredLink(techSpecKey(issueKey)),
    readStoredLink(changelogKey(issueKey)),
  ]);

  const linkedPages: LinkedPage[] = [];

  if (techSpecLink) {
    linkedPages.push({
      type: 'tech-spec',
      title: techSpecLink.title,
      url: techSpecLink.pageUrl,
    });
  }

  if (changelogLink) {
    linkedPages.push({
      type: 'changelog',
      title: changelogLink.title,
      url: changelogLink.pageUrl,
    });
  }

  return { ok: true, data: { issue, linkedPages } };
}

// ─── generateTechSpec ─────────────────────────────────────────────────────────

/**
 * Runs the 5-step Tech Spec pipeline:
 *   1. Fetch Jira issue
 *   2. Call Forge AI to synthesize structured spec
 *   3. Format with DocBuilder
 *   4. Upsert to Confluence
 *   5. Persist page link in Forge Storage
 *
 * Requirements: 3.1–3.7, 8.1–8.3, 8.6
 */
export async function generateTechSpec(
  issueKey: string,
  demoMode: boolean,
): Promise<StitchResult<PublishedPage>> {
  const jira = createJiraClient(demoMode);
  const ai = createForgeAIClient(demoMode);
  const confluence = createConfluenceClient(demoMode);

  // ── Stage 1: Retrieve Jira issue ──────────────────────────────────────────
  let issue;
  try {
    issue = await jira.getIssue(issueKey);
  } catch (err) {
    return { ok: false, error: toDataRetrievalError(err) };
  }

  // ── Stage 2: Forge AI synthesis ───────────────────────────────────────────
  const aiPrompt = buildTechSpecPrompt(issue);

  let aiResponse: string;
  try {
    aiResponse = await ai.generate(aiPrompt);
  } catch (err) {
    return { ok: false, error: toAiGenerationError(err) };
  }

  // ── Stage 3: Format with DocBuilder ──────────────────────────────────────
  const techSpecInput: TechSpecInput = {
    issueSummary: issue.summary,
    aiGeneratedContent: parseTechSpecAIResponse(aiResponse),
  };
  const pageBody = buildTechSpec(techSpecInput);

  // ── Stage 4: Upsert Confluence page ───────────────────────────────────────
  const existingLink = await readStoredLink(techSpecKey(issueKey));
  const title = techSpecTitle(issue.summary, issueKey);
  const spaceKey = spaceKeyFromIssueKey(issueKey);

  let confluencePage;
  try {
    confluencePage = await confluence.upsertPage({
      spaceKey,
      title,
      body: pageBody,
      existingPageId: existingLink?.pageId,
    });
  } catch (err) {
    return { ok: false, error: toConfluencePublishError(err) };
  }

  // ── Stage 5: Persist link in Forge Storage ────────────────────────────────
  const storedLink: StoredPageLink = {
    pageId: confluencePage.id,
    pageUrl: confluencePage.url,
    title: confluencePage.title,
  };
  try {
    await storage.set(techSpecKey(issueKey), storedLink);
  } catch {
    // Storage write failure is non-fatal — the page was already published.
    // The link simply won't appear until the next successful write.
  }

  const publishedPage: PublishedPage = {
    title: confluencePage.title,
    url: confluencePage.url,
    pageId: confluencePage.id,
    wasCreated: !existingLink,
  };

  return { ok: true, data: publishedPage };
}

// ─── generateChangelog ────────────────────────────────────────────────────────

/**
 * Runs the 5-step Changelog pipeline:
 *   1. Fetch Jira issue history (short-circuits here on failure — no AI called)
 *   2. Call Forge AI to synthesize changelog prose
 *   3. Format with DocBuilder
 *   4. Upsert to Confluence
 *   5. Persist page link in Forge Storage
 *
 * Requirements: 4.1–4.7, 8.1–8.3, 8.6
 */
export async function generateChangelog(
  issueKey: string,
  demoMode: boolean,
): Promise<StitchResult<PublishedPage>> {
  const jira = createJiraClient(demoMode);
  const ai = createForgeAIClient(demoMode);
  const confluence = createConfluenceClient(demoMode);

  // ── Stage 1: Retrieve Jira issue history (short-circuit on failure) ───────
  let history;
  try {
    history = await jira.getIssueHistory(issueKey);
  } catch (err) {
    // Per requirement 4.7: return structured error without calling AI or Confluence
    return { ok: false, error: toDataRetrievalError(err) };
  }

  // Also fetch the issue summary so we can build a readable title
  let issueSummary: string;
  try {
    const issue = await jira.getIssue(issueKey);
    issueSummary = issue.summary;
  } catch (err) {
    return { ok: false, error: toDataRetrievalError(err) };
  }

  // ── Stage 2: Forge AI synthesis ───────────────────────────────────────────
  const aiPrompt = buildChangelogPrompt(issueKey, history);

  let aiResponse: string;
  try {
    aiResponse = await ai.generate(aiPrompt);
  } catch (err) {
    return { ok: false, error: toAiGenerationError(err) };
  }

  // ── Stage 3: Format with DocBuilder ──────────────────────────────────────
  const entries: ChangelogEntry[] = historyToChangelogEntries(history);

  // Append AI prose as a final "summary" entry if it isn't already represented
  if (aiResponse.trim()) {
    entries.push({
      dateMs: Date.now(),
      type: 'comment',
      description: aiResponse.trim(),
    });
  }

  const changelogInput: ChangelogInput = {
    issueSummary,
    entries,
  };
  const pageBody = buildChangelog(changelogInput);

  // ── Stage 4: Upsert Confluence page ───────────────────────────────────────
  const existingLink = await readStoredLink(changelogKey(issueKey));
  const title = changelogTitle(issueSummary, issueKey);
  const spaceKey = spaceKeyFromIssueKey(issueKey);

  let confluencePage;
  try {
    confluencePage = await confluence.upsertPage({
      spaceKey,
      title,
      body: pageBody,
      existingPageId: existingLink?.pageId,
    });
  } catch (err) {
    return { ok: false, error: toConfluencePublishError(err) };
  }

  // ── Stage 5: Persist link in Forge Storage ────────────────────────────────
  const storedLink: StoredPageLink = {
    pageId: confluencePage.id,
    pageUrl: confluencePage.url,
    title: confluencePage.title,
  };
  try {
    await storage.set(changelogKey(issueKey), storedLink);
  } catch {
    // Non-fatal — page was published; link write failure will be retried next time.
  }

  const publishedPage: PublishedPage = {
    title: confluencePage.title,
    url: confluencePage.url,
    pageId: confluencePage.id,
    wasCreated: !existingLink,
  };

  return { ok: true, data: publishedPage };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildTechSpecPrompt(issue: Awaited<ReturnType<ReturnType<typeof createJiraClient>['getIssue']>>): string {
  const commentBlock =
    issue.comments.length > 0
      ? issue.comments
          .map((c) => `  [${c.author}]: ${c.body}`)
          .join('\n')
      : '  (no comments)';

  return [
    `You are a technical writer. Generate a structured technical specification for the following Jira issue.`,
    ``,
    `Issue key: ${issue.key}`,
    `Summary: ${issue.summary}`,
    `Description: ${issue.description ?? '(none)'}`,
    `Status: ${issue.status}`,
    `Priority: ${issue.priority}`,
    `Assignee: ${issue.assignee ?? 'Unassigned'}`,
    `Labels: ${issue.labels.join(', ') || '(none)'}`,
    ``,
    `Comments:`,
    commentBlock,
    ``,
    `Respond with a JSON object (no markdown fences) with exactly these keys:`,
    `  "summary": one-sentence overview`,
    `  "context": 2–3 sentences of background and motivation`,
    `  "acceptanceCriteria": array of strings, one criterion per item`,
    `  "implementationNotes": free-form implementation guidance`,
  ].join('\n');
}

type IssueHistoryArg = Awaited<ReturnType<ReturnType<typeof createJiraClient>['getIssueHistory']>>;

function buildChangelogPrompt(issueKey: string, history: IssueHistoryArg): string {
  const transitions = history.transitions
    .map((t) => `  ${new Date(t.dateMs).toISOString().slice(0, 10)}: ${t.from} → ${t.to}`)
    .join('\n') || '  (none)';

  const comments = history.comments
    .map((c) => `  [${new Date(c.createdMs).toISOString().slice(0, 10)}] ${c.author}: ${c.body}`)
    .join('\n') || '  (none)';

  const fieldChanges = history.fieldChanges
    .map((f) => `  ${new Date(f.dateMs).toISOString().slice(0, 10)}: ${f.field} changed from "${f.from ?? 'null'}" to "${f.to ?? 'null'}"`)
    .join('\n') || '  (none)';

  return [
    `You are a technical writer. Generate a concise, human-readable changelog for Jira issue ${issueKey}.`,
    ``,
    `Status transitions:`,
    transitions,
    ``,
    `Comments:`,
    comments,
    ``,
    `Field changes:`,
    fieldChanges,
    ``,
    `Write the changelog as chronological prose, grouping related changes by date.`,
    `Be concise. Each entry should be a single sentence.`,
  ].join('\n');
}

// ─── AI response parsing ──────────────────────────────────────────────────────

/**
 * Parses the AI-generated tech spec JSON.
 * Falls back to sensible defaults if the response is not valid JSON or is missing fields.
 */
function parseTechSpecAIResponse(aiResponse: string): TechSpecInput['aiGeneratedContent'] {
  const defaults = {
    summary: 'AI-generated technical specification.',
    context: aiResponse,
    acceptanceCriteria: ['See implementation notes for details.'],
    implementationNotes: '',
  };

  try {
    const parsed = JSON.parse(aiResponse) as Record<string, unknown>;

    return {
      summary: typeof parsed['summary'] === 'string' && parsed['summary'].trim()
        ? parsed['summary']
        : defaults.summary,
      context: typeof parsed['context'] === 'string' && parsed['context'].trim()
        ? parsed['context']
        : defaults.context,
      acceptanceCriteria: Array.isArray(parsed['acceptanceCriteria']) &&
        parsed['acceptanceCriteria'].every((s) => typeof s === 'string') &&
        (parsed['acceptanceCriteria'] as string[]).length > 0
        ? parsed['acceptanceCriteria'] as string[]
        : defaults.acceptanceCriteria,
      implementationNotes: typeof parsed['implementationNotes'] === 'string'
        ? parsed['implementationNotes']
        : defaults.implementationNotes,
    };
  } catch {
    // AI returned prose instead of JSON — use the raw text as context
    return {
      ...defaults,
      context: aiResponse,
    };
  }
}

// ─── History → ChangelogEntry conversion ─────────────────────────────────────

function historyToChangelogEntries(history: IssueHistoryArg): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];

  for (const transition of history.transitions) {
    entries.push({
      dateMs: transition.dateMs,
      type: 'transition',
      description: `Status changed from "${transition.from}" to "${transition.to}"`,
    });
  }

  for (const comment of history.comments) {
    entries.push({
      dateMs: comment.createdMs,
      type: 'comment',
      description: `${comment.author}: ${comment.body}`,
    });
  }

  for (const change of history.fieldChanges) {
    entries.push({
      dateMs: change.dateMs,
      type: 'field-change',
      description: `Field "${change.field}" changed from "${change.from ?? 'null'}" to "${change.to ?? 'null'}"`,
    });
  }

  return entries;
}
