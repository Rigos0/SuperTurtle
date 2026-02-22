import { renderHook, waitFor } from "@testing-library/react";
import { useAgentStats } from "./useAgentStats";
import { ApiError } from "@/api/client";

vi.mock("@/api/agents", () => ({
  getAgentStats: vi.fn(),
}));

import { getAgentStats } from "@/api/agents";
const mockGetAgentStats = vi.mocked(getAgentStats);

beforeEach(() => {
  mockGetAgentStats.mockReset();
});

const mockStats = {
  total_jobs: 100,
  completed_jobs: 90,
  failed_jobs: 10,
  avg_duration_seconds: 45.5,
  success_rate: 0.9,
};

describe("useAgentStats", () => {
  it("fetches stats on mount", async () => {
    mockGetAgentStats.mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useAgentStats("a1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toEqual(mockStats);
    expect(result.current.error).toBeNull();
  });

  it("sets error when agentId is undefined", async () => {
    const { result } = renderHook(() => useAgentStats(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe("Invalid agent ID.");
  });

  it("handles 404 error", async () => {
    mockGetAgentStats.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const { result } = renderHook(() => useAgentStats("missing"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Agent stats not found.");
  });

  it("supports retry", async () => {
    mockGetAgentStats.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useAgentStats("a1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Fail");

    mockGetAgentStats.mockResolvedValueOnce(mockStats);
    result.current.retry();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toEqual(mockStats);
  });
});
