import { renderHook, waitFor } from "@testing-library/react";
import { useJobResult } from "./useJobResult";
import { ApiError } from "@/api/client";

vi.mock("@/api/jobs", () => ({
  getJobResult: vi.fn(),
}));

import { getJobResult } from "@/api/jobs";
const mockGetJobResult = vi.mocked(getJobResult);

beforeEach(() => {
  mockGetJobResult.mockReset();
});

const mockResult = {
  job_id: "j1",
  status: "completed" as const,
  files: [
    {
      path: "output/report.md",
      download_url: "https://example.com/report.md",
      size_bytes: 1024,
      mime_type: "text/markdown",
    },
  ],
};

describe("useJobResult", () => {
  it("fetches result when enabled", async () => {
    mockGetJobResult.mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useJobResult("j1", true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.result).toEqual(mockResult);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when disabled", async () => {
    const { result } = renderHook(() => useJobResult("j1", false));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetJobResult).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it("does not fetch when jobId is undefined", async () => {
    const { result } = renderHook(() => useJobResult(undefined, true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetJobResult).not.toHaveBeenCalled();
    expect(result.current.result).toBeNull();
  });

  it("sets notFound on 404", async () => {
    mockGetJobResult.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const { result } = renderHook(() => useJobResult("j1", true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBe("Not found");
  });

  it("supports retry", async () => {
    mockGetJobResult.mockRejectedValueOnce(new Error("Fail"));

    const { result } = renderHook(() => useJobResult("j1", true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetJobResult.mockResolvedValueOnce(mockResult);
    result.current.retry();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.result).toEqual(mockResult);
  });
});
