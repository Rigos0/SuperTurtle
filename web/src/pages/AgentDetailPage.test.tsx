import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { AgentDetail, AgentStats } from "@/api/types";
import { AgentDetailPage } from "./AgentDetailPage";

/* ------------------------------------------------------------------ */
/*  Mock hooks                                                         */
/* ------------------------------------------------------------------ */

const mockRetryAgent = vi.fn();
const mockRetryStats = vi.fn();

let agentHookReturn: {
  agent: AgentDetail | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  retry: () => void;
};

let statsHookReturn: {
  stats: AgentStats | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

vi.mock("@/hooks/useAgent", () => ({
  useAgent: () => agentHookReturn,
}));

vi.mock("@/hooks/useAgentStats", () => ({
  useAgentStats: () => statsHookReturn,
}));

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const AGENT: AgentDetail = {
  agent_id: "agent-code-review",
  name: "Code Review Agent",
  description: "Automated code review with security focus",
  tags: ["security", "code-review"],
  pricing: { amount: 5, currency: "USD", unit: "job" },
  input_schema: { type: "object", properties: { repo: { type: "string" } } },
  output_schema: { type: "object", properties: { report: { type: "string" } } },
  created_at: "2024-01-15T09:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
};

const STATS: AgentStats = {
  total_jobs: 150,
  completed_jobs: 140,
  failed_jobs: 10,
  avg_duration_seconds: 180,
  success_rate: 0.933,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderPage(agentId = "agent-code-review") {
  return render(
    <MemoryRouter
      initialEntries={[`/agents/${agentId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function setAgentHook(overrides: Partial<typeof agentHookReturn> = {}) {
  agentHookReturn = {
    agent: null,
    loading: false,
    error: null,
    notFound: false,
    retry: mockRetryAgent,
    ...overrides,
  };
}

function setStatsHook(overrides: Partial<typeof statsHookReturn> = {}) {
  statsHookReturn = {
    stats: null,
    loading: false,
    error: null,
    retry: mockRetryStats,
    ...overrides,
  };
}

beforeEach(() => {
  mockRetryAgent.mockReset();
  mockRetryStats.mockReset();
  setAgentHook();
  setStatsHook();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("AgentDetailPage", () => {
  describe("loading state", () => {
    it("renders loading skeleton and back link", () => {
      setAgentHook({ loading: true });
      renderPage();

      expect(screen.queryByText("Code Review Agent")).not.toBeInTheDocument();
      expect(screen.getByText("Back to Browse")).toBeInTheDocument();
    });
  });

  describe("error state (non-404)", () => {
    it("shows error message with retry button", () => {
      setAgentHook({ error: "Server error", notFound: false });
      renderPage();

      expect(screen.getByText("Unable to load agent")).toBeInTheDocument();
      expect(screen.getByText("Server error")).toBeInTheDocument();
      expect(screen.getByText("Check API availability and try again.")).toBeInTheDocument();
    });

    it("calls retry on button click", async () => {
      setAgentHook({ error: "Server error", notFound: false });
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mockRetryAgent).toHaveBeenCalledOnce();
    });
  });

  describe("not found (404)", () => {
    it("shows not found heading and back link", () => {
      setAgentHook({ error: "Agent not found.", notFound: true });
      renderPage();

      expect(screen.getByText("Agent not found")).toBeInTheDocument();
      expect(
        screen.getByText("The requested agent does not exist or is no longer available."),
      ).toBeInTheDocument();
      const backLinks = screen.getAllByRole("link", { name: "Back to Browse" });
      expect(backLinks.length).toBeGreaterThanOrEqual(1);
    });

    it("does not show retry button", () => {
      setAgentHook({ error: "Agent not found.", notFound: true });
      renderPage();

      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });
  });

  describe("agent content", () => {
    beforeEach(() => {
      setAgentHook({ agent: AGENT });
      setStatsHook({ stats: STATS });
    });

    it("displays agent name and description", () => {
      renderPage();

      expect(screen.getByText("Code Review Agent")).toBeInTheDocument();
      expect(
        screen.getByText("Automated code review with security focus"),
      ).toBeInTheDocument();
    });

    it("renders tags", () => {
      renderPage();

      expect(screen.getByText("security")).toBeInTheDocument();
      expect(screen.getByText("code-review")).toBeInTheDocument();
    });

    it("shows agent info metadata", () => {
      renderPage();

      expect(screen.getByText("Agent Info")).toBeInTheDocument();
      expect(screen.getByText("agent-code-review")).toBeInTheDocument();
    });

    it("shows pricing card with order link", () => {
      renderPage();

      expect(screen.getByText("Pricing")).toBeInTheDocument();
      expect(screen.getByText("$5.00 / job")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Order Agent" })).toHaveAttribute(
        "href",
        "/agents/agent-code-review/order",
      );
    });

    it("renders input and output schema cards", () => {
      renderPage();

      expect(screen.getByText("Input Schema")).toBeInTheDocument();
      expect(
        screen.getByText("Parameters accepted when placing an order."),
      ).toBeInTheDocument();
      expect(screen.getByText("Output Schema")).toBeInTheDocument();
      expect(
        screen.getByText("Expected result shape for completed jobs."),
      ).toBeInTheDocument();
    });
  });

  describe("stats grid", () => {
    it("shows stat values when loaded", () => {
      setAgentHook({ agent: AGENT });
      setStatsHook({ stats: STATS });
      renderPage();

      expect(screen.getByText("Total Jobs")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("Success Rate")).toBeInTheDocument();
      expect(screen.getByText("93.3%")).toBeInTheDocument();
      expect(screen.getByText("Failed Jobs")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("Avg Duration")).toBeInTheDocument();
      expect(screen.getByText("3m")).toBeInTheDocument();
    });

    it("shows placeholders while stats are loading", () => {
      setAgentHook({ agent: AGENT });
      setStatsHook({ loading: true });
      renderPage();

      const dots = screen.getAllByText("...");
      expect(dots.length).toBe(4);
    });

    it("shows dash placeholders when stats are null", () => {
      setAgentHook({ agent: AGENT });
      setStatsHook({ stats: null });
      renderPage();

      // 4 stat cards show "-" plus metadata dashes; check at least 4
      const dashes = screen.getAllByText("-");
      expect(dashes.length).toBeGreaterThanOrEqual(4);
    });

    it("shows stats error with retry button", async () => {
      setAgentHook({ agent: AGENT });
      setStatsHook({ error: "Stats unavailable" });
      renderPage();

      expect(screen.getByText("Stats unavailable")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Retry stats" }));
      expect(mockRetryStats).toHaveBeenCalledOnce();
    });
  });

  describe("back navigation", () => {
    it("has back link to browse page", () => {
      setAgentHook({ agent: AGENT });
      setStatsHook({ stats: STATS });
      renderPage();

      expect(screen.getByText("Back to Browse")).toBeInTheDocument();
    });
  });
});
