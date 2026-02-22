import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { JobDetail, JobManifestFile, JobResultResponse } from "@/api/types";
import { JobDetailPage } from "./JobDetailPage";

/* ------------------------------------------------------------------ */
/*  Mock hooks                                                         */
/* ------------------------------------------------------------------ */

const mockRetryJob = vi.fn();
const mockRetryResult = vi.fn();

let jobHookReturn: {
  job: JobDetail | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  retry: () => void;
};

let resultHookReturn: {
  result: JobResultResponse | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  retry: () => void;
};

vi.mock("@/hooks/useJob", () => ({
  useJob: () => jobHookReturn,
}));

vi.mock("@/hooks/useJobResult", () => ({
  useJobResult: () => resultHookReturn,
}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const COMPLETED_JOB: JobDetail = {
  job_id: "abc-123-def-456",
  agent_id: "agent-code-review",
  prompt: "Review this pull request for security issues",
  params: { repo: "acme/widget", pr: 42 },
  status: "completed",
  progress: 100,
  decision_reason: "Accepted for review",
  created_at: "2024-06-01T10:00:00Z",
  started_at: "2024-06-01T10:01:00Z",
  updated_at: "2024-06-01T10:05:00Z",
  completed_at: "2024-06-01T10:05:00Z",
  duration_seconds: 240,
};

const RUNNING_JOB: JobDetail = {
  ...COMPLETED_JOB,
  status: "running",
  progress: 60,
  completed_at: null,
  duration_seconds: null,
};

const FILES: JobManifestFile[] = [
  {
    path: "results/report.md",
    download_url: "https://store.example.com/results/report.md",
    size_bytes: 2048,
    mime_type: "text/markdown",
  },
  {
    path: "results/patch.diff",
    download_url: "https://store.example.com/results/patch.diff",
    size_bytes: 512,
    mime_type: null,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderPage(jobId = "abc-123-def-456") {
  return render(
    <MemoryRouter
      initialEntries={[`/jobs/${jobId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function defaultJobHook(overrides: Partial<typeof jobHookReturn> = {}) {
  jobHookReturn = {
    job: null,
    loading: false,
    error: null,
    notFound: false,
    retry: mockRetryJob,
    ...overrides,
  };
}

function defaultResultHook(overrides: Partial<typeof resultHookReturn> = {}) {
  resultHookReturn = {
    result: null,
    loading: false,
    error: null,
    notFound: false,
    retry: mockRetryResult,
    ...overrides,
  };
}

beforeEach(() => {
  mockRetryJob.mockReset();
  mockRetryResult.mockReset();
  defaultJobHook();
  defaultResultHook();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("JobDetailPage", () => {
  describe("loading state", () => {
    it("renders loading skeleton while job is fetching", () => {
      defaultJobHook({ loading: true });
      renderPage();

      expect(screen.queryByText("Job Status")).not.toBeInTheDocument();
      expect(screen.getByText("Back to My Jobs")).toBeInTheDocument();
    });
  });

  describe("error state (non-404)", () => {
    it("shows error message", () => {
      defaultJobHook({ error: "Server error", notFound: false });
      renderPage();

      expect(screen.getByText("Unable to load job")).toBeInTheDocument();
      expect(screen.getByText("Server error")).toBeInTheDocument();
      expect(screen.getByText("Check API availability and try again.")).toBeInTheDocument();
    });

    it("has a retry button that calls retry", async () => {
      defaultJobHook({ error: "Server error", notFound: false });
      renderPage();

      const retryBtn = screen.getByRole("button", { name: "Retry" });
      await userEvent.click(retryBtn);

      expect(mockRetryJob).toHaveBeenCalledOnce();
    });
  });

  describe("not found (404)", () => {
    it("shows not found heading and back link", () => {
      defaultJobHook({ error: "Job not found.", notFound: true });
      renderPage();

      expect(screen.getByText("Job not found")).toBeInTheDocument();
      expect(screen.getByText("The requested job does not exist.")).toBeInTheDocument();
      const backLinks = screen.getAllByRole("link", { name: "Back to My Jobs" });
      expect(backLinks.length).toBeGreaterThanOrEqual(1);
      expect(backLinks.every((l) => l.getAttribute("href") === "/jobs")).toBe(true);
    });

    it("does not show retry button", () => {
      defaultJobHook({ error: "Job not found.", notFound: true });
      renderPage();

      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });
  });

  describe("job content", () => {
    beforeEach(() => {
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ result: { job_id: COMPLETED_JOB.job_id, status: "completed", files: FILES } });
    });

    it("displays job status badge and job id", () => {
      renderPage();

      expect(screen.getByText("Job Status")).toBeInTheDocument();
      // "Completed" appears in both the status badge and the metadata label
      const completedEls = screen.getAllByText("Completed");
      expect(completedEls.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("abc-123-def-456")).toBeInTheDocument();
    });

    it("shows progress section", () => {
      renderPage();

      expect(screen.getByText("Progress")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("renders job detail metadata", () => {
      renderPage();

      expect(screen.getByText("Job Details")).toBeInTheDocument();
      expect(screen.getByText("agent-code-review")).toBeInTheDocument();
      expect(screen.getByText("Accepted for review")).toBeInTheDocument();
      expect(screen.getByText("4m")).toBeInTheDocument();
    });

    it("renders prompt text", () => {
      renderPage();

      expect(screen.getByText("Prompt")).toBeInTheDocument();
      expect(
        screen.getByText("Review this pull request for security issues"),
      ).toBeInTheDocument();
    });

    it("renders params as JSON", () => {
      renderPage();

      expect(screen.getByText("Parameters")).toBeInTheDocument();
      const pre = screen.getByText(/acme\/widget/);
      expect(pre).toBeInTheDocument();
    });
  });

  describe("result downloads", () => {
    it("shows pending message when job is not completed", () => {
      defaultJobHook({ job: RUNNING_JOB });
      renderPage();

      expect(screen.getByText("Result Downloads")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Downloads will be available once this job reaches the completed status.",
        ),
      ).toBeInTheDocument();
    });

    it("shows loading skeleton when result is loading", () => {
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ loading: true });
      renderPage();

      expect(screen.getByText("Result Downloads")).toBeInTheDocument();
      expect(
        screen.queryByText(
          "Downloads will be available once this job reaches the completed status.",
        ),
      ).not.toBeInTheDocument();
    });

    it("shows result not-found state with refresh button", async () => {
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ error: "Not found", notFound: true });
      renderPage();

      expect(
        screen.getByText(
          "Result files are not available yet. This can happen briefly after completion.",
        ),
      ).toBeInTheDocument();

      const refreshBtn = screen.getByRole("button", { name: "Refresh" });
      await userEvent.click(refreshBtn);

      expect(mockRetryResult).toHaveBeenCalledOnce();
    });

    it("shows generic result error with retry button", async () => {
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ error: "Connection failed", notFound: false });
      renderPage();

      expect(screen.getByText("Connection failed")).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: "Retry" });
      await userEvent.click(retryBtn);

      expect(mockRetryResult).toHaveBeenCalledOnce();
    });

    it("shows empty file message when no files", () => {
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ result: { job_id: COMPLETED_JOB.job_id, status: "completed", files: [] } });
      renderPage();

      expect(
        screen.getByText("No result files are available for this job."),
      ).toBeInTheDocument();
    });

    it("renders file cards with name, path, size, and download link", () => {
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ result: { job_id: COMPLETED_JOB.job_id, status: "completed", files: FILES } });
      renderPage();

      expect(screen.getByText("report.md")).toBeInTheDocument();
      expect(screen.getByText("results/report.md")).toBeInTheDocument();
      expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/text\/markdown/)).toBeInTheDocument();

      expect(screen.getByText("patch.diff")).toBeInTheDocument();
      expect(screen.getByText("512 B")).toBeInTheDocument();

      const downloadLinks = screen.getAllByRole("link", { name: "Download" });
      expect(downloadLinks).toHaveLength(2);
      expect(downloadLinks[0]).toHaveAttribute(
        "href",
        "https://store.example.com/results/report.md",
      );
      expect(downloadLinks[1]).toHaveAttribute(
        "href",
        "https://store.example.com/results/patch.diff",
      );
    });

    it("sanitizes non-http download URLs to #", () => {
      const maliciousFiles: JobManifestFile[] = [
        {
          path: "exploit.js",
          download_url: "javascript:alert(1)",
          size_bytes: 100,
          mime_type: null,
        },
      ];
      defaultJobHook({ job: COMPLETED_JOB });
      defaultResultHook({ result: { job_id: COMPLETED_JOB.job_id, status: "completed", files: maliciousFiles } });
      renderPage();

      const link = screen.getByRole("link", { name: "Download" });
      expect(link).toHaveAttribute("href", "#");
    });
  });

  describe("back navigation", () => {
    it("has a back link to /jobs on the content view", () => {
      defaultJobHook({ job: RUNNING_JOB });
      renderPage();

      const backLinks = screen.getAllByRole("link", { name: "Back to My Jobs" });
      expect(backLinks[0]).toHaveAttribute("href", "/jobs");
    });
  });
});
