import { apiFetch, ApiError } from "./client";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  it("sends GET with API key header", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiFetch("/test");

    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/test");
    expect(init.headers["X-API-Key"]).toBe("buyer-dev-key");
  });

  it("sends Content-Type for POST with body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1" }));

    await apiFetch("/items", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("returns undefined for 204", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiFetch("/empty");

    expect(result).toBeUndefined();
  });

  it("throws ApiError for 4xx with detail", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Not found" }), {
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(apiFetch("/missing")).rejects.toThrow(ApiError);

    try {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Bad request" }), {
          status: 400,
          statusText: "Bad Request",
        }),
      );
      await apiFetch("/bad");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toBe("Bad request");
    }
  });

  it("throws ApiError for 5xx with fallback message", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("", { status: 500, statusText: "Internal Server Error" }),
    );

    try {
      await apiFetch("/error");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe(
        "The API is temporarily unavailable. Please try again.",
      );
    }
  });

  it("throws network error when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiFetch("/offline")).rejects.toThrow(
      "Unable to reach the API",
    );
  });

  it("re-throws AbortError as-is", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    mockFetch.mockRejectedValueOnce(abort);

    try {
      await apiFetch("/aborted");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBe(abort);
    }
  });

  it("parses array detail from validation errors", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: [
            { loc: ["body", "name"], msg: "field required", type: "value_error" },
          ],
        }),
        { status: 422, statusText: "Unprocessable Entity" },
      ),
    );

    try {
      await apiFetch("/validate");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe("field required");
    }
  });
});
