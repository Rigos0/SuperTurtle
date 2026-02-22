import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { JobListItem } from "@/api/types";
import { MyJobsPage } from "./MyJobsPage";

/* ------------------------------------------------------------------ */
/*  Mock useJobs hook                                                  */
/* ------------------------------------------------------------------ */

const mockRetry = vi.fn();

let hookReturn: {
  jobs: JobListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

vi.mock("@/hooks/useJobs", () => ({
  useJobs: () => hookReturn,
}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function makeJob(overrides: Partial<JobListItem> = {}): JobListItem {
  return {
    job_id: "job-aaaa-1111",
    agent_id: "agent-code-review",
    prompt: "Review this PR",
    status: "running",
    progress: 50,
    created_at: "2024-06-01T10:00:00Z",
    updated_at: "2024-06-01T10:02:00Z",
    completed_at: null,
    duration_seconds: null,
    ...overrides,
  };
}

const JOBS_PAGE: JobListItem[] = [
  makeJob({ job_id: "job-aaaa-1111", status: "running", progress: 50 }),
  makeJob({
    job_id: "job-bbbb-2222",
    status: "completed",
    progress: 100,
    completed_at: "2024-06-01T10:05:00Z",
    duration_seconds: 300,
  }),
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/jobs"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <MyJobsPage />
    </MemoryRouter>,
  );
}

function setHook(overrides: Partial<typeof hookReturn> = {}) {
  hookReturn = {
    jobs: [],
    total: 0,
    loading: false,
    error: null,
    retry: mockRetry,
    ...overrides,
  };
}

beforeEach(() => {
  mockRetry.mockReset();
  setHook();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("MyJobsPage", () => {
  it("renders page heading and description", () => {
    setHook();
    renderPage();

    expect(screen.getByText("My Jobs")).toBeInTheDocument();
    expect(
      screen.getByText("Track job progress and open detail pages for status updates and downloads."),
    ).toBeInTheDocument();
  });

  describe("loading state", () => {
    it("shows loading text and skeleton cards", () => {
      setHook({ loading: true });
      renderPage();

      expect(screen.getByText("Loading jobs...")).toBeInTheDocument();
      expect(screen.queryByText("No jobs yet")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message with retry button", () => {
      setHook({ error: "API unreachable" });
      renderPage();

      expect(screen.getByText("Unable to load jobs")).toBeInTheDocument();
      expect(screen.getByText("API unreachable")).toBeInTheDocument();
      expect(screen.getByText("Check API availability and try again.")).toBeInTheDocument();
    });

    it("calls retry on button click", async () => {
      setHook({ error: "API unreachable" });
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mockRetry).toHaveBeenCalledOnce();
    });
  });

  describe("empty state (no filters)", () => {
    it("shows no jobs message and browse agents link", () => {
      setHook({ jobs: [], total: 0 });
      renderPage();

      expect(screen.getByText("No jobs yet")).toBeInTheDocument();
      expect(
        screen.getByText("Submit an order from an agent detail page to create your first job."),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Browse Agents" })).toHaveAttribute("href", "/");
    });
  });

  describe("job list", () => {
    beforeEach(() => {
      setHook({ jobs: JOBS_PAGE, total: 2 });
    });

    it("displays total count", () => {
      renderPage();

      expect(screen.getByText("2 jobs")).toBeInTheDocument();
    });

    it("shows singular form for 1 job", () => {
      setHook({ jobs: [JOBS_PAGE[0]], total: 1 });
      renderPage();

      expect(screen.getByText("1 job")).toBeInTheDocument();
    });

    it("renders job rows with short IDs", () => {
      renderPage();

      expect(screen.getByText("Job job-aaaa")).toBeInTheDocument();
      expect(screen.getByText("Job job-bbbb")).toBeInTheDocument();
    });

    it("renders status badges", () => {
      renderPage();

      // Status text appears in both the StatusFilter buttons and job row badges
      const runningEls = screen.getAllByText("Running");
      expect(runningEls.length).toBeGreaterThanOrEqual(2); // filter + badge
      const completedEls = screen.getAllByText("Completed");
      expect(completedEls.length).toBeGreaterThanOrEqual(2); // filter + badge (+ metadata label)
    });

    it("renders prompt text for each job", () => {
      renderPage();

      const prompts = screen.getAllByText("Review this PR");
      expect(prompts).toHaveLength(2);
    });

    it("renders view status links", () => {
      renderPage();

      const links = screen.getAllByRole("link", { name: "View status" });
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute("href", "/jobs/job-aaaa-1111");
      expect(links[1]).toHaveAttribute("href", "/jobs/job-bbbb-2222");
    });

    it("shows agent ID and progress", () => {
      renderPage();

      const agentIds = screen.getAllByText("agent-code-review");
      expect(agentIds).toHaveLength(2);

      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("shows duration for completed jobs", () => {
      renderPage();

      expect(screen.getByText("5m")).toBeInTheDocument();
    });
  });

  describe("status filter", () => {
    it("renders all status filter buttons", () => {
      setHook({ jobs: [], total: 0 });
      renderPage();

      for (const status of ["Pending", "Accepted", "Rejected", "Running", "Completed", "Failed"]) {
        expect(screen.getByRole("button", { name: status })).toBeInTheDocument();
      }
    });
  });

  describe("pagination", () => {
    it("does not render pagination when total <= page size", () => {
      setHook({ jobs: JOBS_PAGE, total: 2 });
      renderPage();

      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });

    it("renders pagination when total > page size", () => {
      setHook({ jobs: JOBS_PAGE, total: 25 });
      renderPage();

      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    });
  });
});
