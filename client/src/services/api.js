import { API_URL } from "../constants/app.js";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });

    const result = await response.json().catch(() => ({ success: false, message: "Unexpected server response." }));
    return { ...result, status: response.status };
}
