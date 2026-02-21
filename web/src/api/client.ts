import { API_BASE, API_KEY } from "@/config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const NETWORK_ERROR_MESSAGE =
  "Unable to reach the API. Check your connection and try again.";

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "X-API-Key": API_KEY,
  };
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string>),
      },
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const message = await readApiErrorMessage(res);
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

async function readApiErrorMessage(res: Response): Promise<string> {
  const fallback =
    res.status >= 500
      ? "The API is temporarily unavailable. Please try again."
      : res.statusText || "Request failed.";
  const body = await res.text().catch(() => "");
  if (!body.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(body) as {
      detail?: unknown;
      message?: unknown;
      error?: unknown;
    };
    const detail =
      readText(parsed.detail) ?? readText(parsed.message) ?? readText(parsed.error);
    if (detail) {
      return detail;
    }
  } catch {
    // Ignore invalid JSON and continue with plain text fallback handling.
  }

  if (res.status >= 500) {
    return fallback;
  }

  return body;
}

function readText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (typeof item === "string") return item;
        // FastAPI validation errors: {loc: [...], msg: "...", type: "..."}
        if (item && typeof item === "object" && "msg" in item && typeof item.msg === "string") {
          return item.msg;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item))
      .join(", ")
      .trim();
    return joined || null;
  }

  return null;
}
