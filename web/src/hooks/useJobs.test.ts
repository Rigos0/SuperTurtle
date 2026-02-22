import { act, renderHook, waitFor } from "@testing-library/react";
import { useJobs } from "./useJobs";

vi.mock("@/api/jobs", () => ({
  listJobs: vi.fn(),
}));

import { listJobs } from "@/api/jobs";
const mockListJobs = vi.mocked(listJobs);

beforeEach(() => {
  mockListJobs.mockReset();
});

const mockJobItem = {
  job_id: "j1",
  agent_id: "a1",
  prompt: "Test prompt",
  status: "running" as const,
  progress: 50,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:01:00Z",
  completed_at: null,
  duration_seconds: null,
};

describe("useJobs", () => {
  it("fetches jobs on mount with defaults", async () => {
    mockListJobs.mockResolvedValueOnce({ jobs: [mockJobItem], total: 1 });

    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
    expect(mockListJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: undefined,
        limit: 20,
        offset: 0,
      }),
    );
  });

  it("passes options to listJobs", async () => {
    mockListJobs.mockResolvedValueOnce({ jobs: [], total: 0 });

    const { result } = renderHook(() =>
      useJobs({ status: "completed", limit: 10, offset: 20 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListJobs).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        limit: 10,
        offset: 20,
      }),
    );
  });

  it("sets error on failure", async () => {
    mockListJobs.mockRejectedValueOnce(new Error("API down"));

    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("API down");
    expect(result.current.jobs).toEqual([]);
  });

  it("supports retry", async () => {
    mockListJobs.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useJobs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockListJobs.mockResolvedValueOnce({ jobs: [mockJobItem], total: 1 });
    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });
});
