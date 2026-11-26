export interface StitchError {
  stage: 'data-retrieval' | 'ai-generation' | 'confluence-publish' | 'unknown';
  message: string;
  httpStatus?: number;
  endpoint?: string;
}

export type StitchResult<T> = { ok: true; data: T } | { ok: false; error: StitchError };
