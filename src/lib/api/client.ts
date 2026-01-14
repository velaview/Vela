// ─────────────────────────────────────────────────────────────
// API Client Configuration
// ─────────────────────────────────────────────────────────────
// Centralized API path management

/**
 * Base API path
 */
export const API_BASE = '/api';

/**
 * Build an API URL
 */
export function apiUrl(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE}/${cleanPath}`;
}

/**
 * API endpoint builders for type safety
 */
export const API = {
    // Catalog endpoints
    catalog: (type: string, id: string, query?: string) =>
        `${API_BASE}/catalog/${type}/${id}${query ? `?${query}` : ''}`,
    catalogs: () => `${API_BASE}/catalogs`,

    // Content endpoints
    meta: (type: string, id: string) => `${API_BASE}/meta/${type}/${id}`,
    content: (id: string) => `${API_BASE}/content/${id}`,

    // Feed endpoints
    feed: (type = 'all', cursor = 0) => `${API_BASE}/feed?type=${type}&cursor=${cursor}`,
    feedRefresh: () => `${API_BASE}/feed/refresh`,

    // Stream endpoints
    streams: (type: string, id: string, season?: number, episode?: number) => {
        let url = `${API_BASE}/streams/${type}/${id}`;
        if (season !== undefined && episode !== undefined) {
            url += `?season=${season}&episode=${episode}`;
        }
        return url;
    },
    stream: (id: string) => `${API_BASE}/stream/${id}`,

    // Search
    search: (query: string, filters?: Record<string, string>) => {
        const params = new URLSearchParams({ q: query, ...filters });
        return `${API_BASE}/search?${params}`;
    },

    // User data endpoints
    history: (query?: string) => `${API_BASE}/history${query ? `?${query}` : ''}`,
    historyContinue: () => `${API_BASE}/history/continue`,
    library: (id?: string) => id ? `${API_BASE}/library/${id}` : `${API_BASE}/library`,
    preferences: () => `${API_BASE}/preferences`,

    // Sessions
    sessions: (id?: string) => id ? `${API_BASE}/sessions/${id}` : `${API_BASE}/sessions`,

    // Subtitles
    subtitles: (type: string, id: string) => `${API_BASE}/subtitles/${type}/${id}`,
} as const;

/**
 * Type-safe fetch wrapper
 */
export async function apiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
