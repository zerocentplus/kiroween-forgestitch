/**
 * Ambient type declarations for Forge platform APIs that are injected at
 * runtime by the Forge sandbox but absent from the installed @forge/api
 * package (v8.5.1) type declarations.
 *
 * These declarations exist solely to satisfy the TypeScript compiler in the
 * local dev environment. At runtime the Forge platform provides the real
 * implementations.
 */
declare module '@forge/api' {
  // ── Route / trusted URL ────────────────────────────────────────────────────

  export interface Route {
    readonly __type: 'Route';
    readonly value: string;
  }

  export function assumeTrustedRoute(path: string): Route;
  export function route(strings: TemplateStringsArray, ...values: unknown[]): Route;

  // ── Request init / response ────────────────────────────────────────────────

  export interface RequestInit {
    body?: string | ArrayBuffer | URLSearchParams;
    headers?: Record<string, string>;
    method?: string;
  }

  export interface ApiResponse {
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }

  export type RequestProductMethod = (url: Route, init?: RequestInit) => Promise<ApiResponse>;

  // ── Jira / Confluence request functions ────────────────────────────────────

  export const requestJira: RequestProductMethod;
  export const requestConfluence: RequestProductMethod;

  // ── asUser ──────────────────────────────────────────────────────────────────

  export interface asUserMethods {
    requestAtlassian(url: Route, init?: RequestInit): Promise<ApiResponse>;
    requestJira: RequestProductMethod;
    requestConfluence: RequestProductMethod;
  }

  export function asUser(): asUserMethods;

  // ── Forge Storage KV store ────────────────────────────────────────────────

  export const storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    query(): {
      where(condition: string, value: unknown): {
        getMany(): Promise<{ results: Array<{ key: string; value: unknown }> }>;
      };
    };
  };
}
