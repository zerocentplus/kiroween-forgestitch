import { asApp, assumeTrustedRoute } from '@forge/api';

// ─── Interface definition ─────────────────────────────────────────────────────

export interface ForgeAIClient {
  generate(prompt: string): Promise<string>;
}

// ─── Typed error ──────────────────────────────────────────────────────────────

export class ForgeAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForgeAIError';
  }
}

// ─── LiveForgeAIClient ────────────────────────────────────────────────────────

/**
 * Calls the Atlassian AI REST gateway via requestAtlassian (as app).
 * Endpoint: POST /gateway/api/ai/chat/completions (Atlassian Assist / Rovo LLM)
 *
 * When the Forge platform exposes `model.invoke()` from `@forge/api`, this
 * implementation can be simplified to: `return await model.invoke(prompt)`.
 */
export class LiveForgeAIClient implements ForgeAIClient {
  async generate(prompt: string): Promise<string> {
    const path = '/gateway/api/assistance/chat/v1/completions';

    let response: { status: number; json(): Promise<unknown> };

    try {
      response = await asApp().requestAtlassian(assumeTrustedRoute(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ForgeAIError(`Forge AI request failed: ${message}`);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new ForgeAIError(
        `Forge AI request failed with status ${response.status}: ${path}`,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await response.json() as Record<string, unknown>;
    } catch (err) {
      throw new ForgeAIError('Forge AI returned a non-JSON response');
    }

    // Extract the assistant message from a standard chat completion response
    const choices = body['choices'] as Array<Record<string, unknown>> | undefined;
    const content = choices?.[0]?.['message'] as Record<string, unknown> | undefined;
    const text = content?.['content'] as string | undefined;

    // Fallback: some endpoints return { text: "..." } directly
    const directText = body['text'] as string | undefined;

    const result = text ?? directText ?? '';

    if (result.trim() === '') {
      throw new ForgeAIError('Forge AI returned an empty response');
    }

    return result;
  }
}
