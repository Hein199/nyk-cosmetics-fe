import { API_BASE_URL } from './constants';

interface FetchOptions {
    method?: string;
    body?: unknown;
    token?: string | null;
    params?: Record<string, string>;
    signal?: AbortSignal;
}

export async function apiFetch<T = unknown>(
    path: string,
    options: FetchOptions = {},
): Promise<T> {
    const { method = 'GET', body, token, params, signal } = options;

    let url = `${API_BASE_URL}/_api${path}`;
    if (params) {
        const search = new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
        );
        if (search.toString()) {
            url += `?${search.toString()}`;
        }
    }

    const headers: Record<string, string> = {};
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
    });

    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const errBody = await response.json();
            if (errBody.message) {
                message = Array.isArray(errBody.message)
                    ? errBody.message.join(', ')
                    : errBody.message;
            }
        } catch {
            const text = await response.text();
            if (text) message = text;
        }
        throw new Error(message);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
}
