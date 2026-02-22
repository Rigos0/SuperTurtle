import { renderHook, waitFor } from "@testing-library/react";
import { useAgent } from "./useAgent";
import { ApiError } from "@/api/client";

vi.mock("@/api/agents", () => ({
  getAgent: vi.fn(),
}));

import { getAgent } from "@/api/agents";
const mockGetAgent = vi.mocked(getAgent);

beforeEach(() => {
  mockGetAgent.mockReset();
});

const mockAgent = {
  agent_id: "a1",
  name: "Agent 1",
  description: "Desc",
  tags: [],
  pricing: {},
  input_schema: {},
  output_schema: {},
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("useAgent", () => {
  it("fetches agent on mount", async () => {
    mockGetAgent.mockResolvedValueOnce(mockAgent);

    const { result } = renderHook(() => useAgent("a1"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.agent).toEqual(mockAgent);
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it("sets error and not loading when agentId is undefined", async () => {
    const { result } = renderHook(() => useAgent(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.agent).toBeNull();
    expect(result.current.error).toBe("Invalid agent ID.");
  });

  it("sets notFound on 404", async () => {
    mockGetAgent.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const { result } = renderHook(() => useAgent("missing"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBe("Agent not found.");
  });

  it("sets error on other API errors", async () => {
    mockGetAgent.mockRejectedValueOnce(new ApiError(500, "Server error"));

    const { result } = renderHook(() => useAgent("a1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBe("Server error");
  });

  it("supports retry", async () => {
    mockGetAgent.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useAgent("a1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Fail");

    mockGetAgent.mockResolvedValueOnce(mockAgent);
    result.current.retry();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.agent).toEqual(mockAgent);
    expect(result.current.error).toBeNull();
  });
});
