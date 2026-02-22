import { renderHook, waitFor } from "@testing-library/react";
import { useJob } from "./useJob";
import { ApiError } from "@/api/client";

vi.mock("@/api/jobs", () => ({
  getJob: vi.fn(),
}));

import { getJob } from "@/api/jobs";
const mockGetJob = vi.mocked(getJob);

beforeEach(() => {
  mockGetJob.mockReset();
});

const mockJob = {
  job_id: "j1",
  agent_id: "a1",
  prompt: "Do something",
  params: {},
  status: "running" as const,
  progress: 50,
  decision_reason: null,
  created_at: "2024-01-01T00:00:00Z",
  started_at: "2024-01-01T00:01:00Z",
  updated_at: "2024-01-01T00:02:00Z",
  completed_at: null,
  duration_seconds: null,
};

describe("useJob", () => {
  it("fetches job on mount", async () => {
    mockGetJob.mockResolvedValueOnce(mockJob);

    const { result } = renderHook(() => useJob("j1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.job).toEqual(mockJob);
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it("sets error when jobId is undefined", async () => {
    const { result } = renderHook(() => useJob(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.job).toBeNull();
    expect(result.current.error).toBe("Invalid job ID.");
  });

  it("sets notFound on 404", async () => {
    mockGetJob.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const { result } = renderHook(() => useJob("missing"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBe("Job not found.");
  });

  it("supports retry", async () => {
    mockGetJob.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useJob("j1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetJob.mockResolvedValueOnce(mockJob);
    result.current.retry();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.job).toEqual(mockJob);
  });
});
