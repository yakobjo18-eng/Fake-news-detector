// Thin wrapper around the existing backend contract. Payload shapes, endpoints, and
// response field names are unchanged from the original app.js / backend/main.py.

async function callApi(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // fetch() itself rejected (offline, backend down, CORS) — the browser's native
    // message ("Failed to fetch") isn't actionable, so give a specific one instead.
    throw new Error("Could not reach the backend. Check that the server is running (python -m uvicorn backend.main:app) and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }
  return data;
}

export async function getHealth() {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error(`Health check failed (${response.status})`);
  return response.json();
}

export async function predict({ title, body }) {
  return callApi("/api/predict", { title, body });
}

export async function explain({ title, body }) {
  return callApi("/api/explain", { title, body });
}
