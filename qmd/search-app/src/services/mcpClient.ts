// The MCP connection is now managed server-side inside vite.config.ts (qmdBridgePlugin).
// The browser just calls plain REST GET endpoints – no MCP SDK needed here.

async function apiFetch(path: string, params: Record<string, string | undefined>) {
    const url = new URL(path, window.location.origin);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`QMD API error (${res.status}): ${text}`);
    }
    return res.json();
}

export async function searchQmd(query: string, collection?: string) {
    return apiFetch('/api/search', { q: query, collection });
}

export async function semanticSearchQmd(query: string, collection?: string) {
    return apiFetch('/api/vector-search', { q: query, collection });
}

export async function deepSearchQmd(query: string, collection?: string) {
    return apiFetch('/api/deep-search', { q: query, collection });
}

export async function getDocumentContent(file: string) {
    return apiFetch('/api/get', { file });
}
