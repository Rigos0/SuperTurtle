import { renderHook, waitFor } from "@testing-library/react";
import { useAgents } from "./useAgents";

vi.mock("@/api/agents", () => ({
  searchAgents: vi.fn(),
}));

import { searchAgents } from "@/api/agents";
const mockSearchAgents = vi.mocked(searchAgents);

beforeEach(() => {
  mockSearchAgents.mockReset();
});

describe("useAgents", () => {
  it("fetches agents on mount", async () => {
    mockSearchAgents.mockResolvedValueOnce({
      agents: [
        {
          agent_id: "a1",
          name: "Agent 1",
          description: "Desc",
          tags: [],
          pricing: {},
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useAgents("", []));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.agents).toHaveLength(1);
    expect(result.current.agents[0].agent_id).toBe("a1");
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("passes query and tags to searchAgents", async () => {
    mockSearchAgents.mockResolvedValueOnce({ agents: [], total: 0 });

    const { result } = renderHook(() => useAgents("test", ["ai"]));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockSearchAgents).toHaveBeenCalledWith(
      "test",
      ["ai"],
      expect.any(AbortSignal),
    );
  });

  it("sets error on failure", async () => {
    mockSearchAgents.mockRejectedValueOnce(new Error("Network fail"));

    const { result } = renderHook(() => useAgents("", []));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Network fail");
    expect(result.current.agents).toEqual([]);
  });

  it("supports retry", async () => {
    mockSearchAgents.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useAgents("", []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Fail");

    mockSearchAgents.mockResolvedValueOnce({ agents: [], total: 0 });
    result.current.retry();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
  });
});
