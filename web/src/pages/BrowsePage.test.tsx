import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { AgentSummary } from "@/api/types";
import { BrowsePage } from "./BrowsePage";

/* ------------------------------------------------------------------ */
/*  Mock hooks                                                         */
/* ------------------------------------------------------------------ */

const mockRetry = vi.fn();

let agentsHookReturn: {
  agents: AgentSummary[];
  total: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
};

vi.mock("@/hooks/useAgents", () => ({
  useAgents: () => agentsHookReturn,
}));

/* ------------------------------------------------------------------ */
/*  Fixtures — seeded executor agent shapes                            */
/* ------------------------------------------------------------------ */

const GEMINI: AgentSummary = {
  agent_id: "55555555-5555-5555-5555-555555555555",
  name: "gemini-assistant",
  description:
    "AI coding agent powered by Google Gemini CLI. Send a prompt and receive generated code, docs, or other files.",
  tags: ["ai", "gemini", "coding", "code-generation"],
  pricing: { currency: "USD", unit: "job", amount: 0.1 },
  created_at: "2024-01-01T00:00:00Z",
};

const CLAUDE: AgentSummary = {
  agent_id: "66666666-6666-6666-6666-666666666666",
  name: "claude-assistant",
  description:
    "AI coding agent powered by Claude Code CLI. Send a prompt and receive generated code, docs, or other files.",
  tags: ["ai", "claude", "coding", "code-generation"],
  pricing: { currency: "USD", unit: "job", amount: 0.1 },
  created_at: "2024-01-02T00:00:00Z",
};

const CODEX: AgentSummary = {
  agent_id: "77777777-7777-7777-7777-777777777777",
  name: "codex-assistant",
  description:
    "AI coding agent powered by OpenAI Codex CLI. Send a prompt and receive generated code, docs, or other files.",
  tags: ["ai", "codex", "coding", "code-generation"],
  pricing: { currency: "USD", unit: "job", amount: 0.1 },
  created_at: "2024-01-03T00:00:00Z",
};

const CODE_REVIEW: AgentSummary = {
  agent_id: "88888888-8888-8888-8888-888888888888",
  name: "code-review-specialist",
  description:
    "Specialized code-review executor. Send inline code and receive structured findings.",
  tags: ["ai", "claude", "code-review", "quality"],
  pricing: { currency: "USD", unit: "job", amount: 0.08 },
  created_at: "2024-01-04T00:00:00Z",
};

const SUMMARIZER: AgentSummary = {
  agent_id: "11111111-1111-1111-1111-111111111111",
  name: "text-summarizer-pro",
  description: "Summarize long-form text into concise bullet points and takeaways.",
  tags: ["text", "summarization", "productivity"],
  pricing: { currency: "USD", unit: "job", amount: 0.25 },
  created_at: "2024-01-05T00:00:00Z",
};

const ALL_AGENTS = [GEMINI, CLAUDE, CODEX, CODE_REVIEW, SUMMARIZER];
const EXECUTOR_AGENTS = [GEMINI, CLAUDE, CODEX, CODE_REVIEW];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={["/"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <BrowsePage />
    </MemoryRouter>,
  );
}

function setHook(overrides: Partial<typeof agentsHookReturn> = {}) {
  agentsHookReturn = {
    agents: [],
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

describe("BrowsePage", () => {
  describe("loading state", () => {
    it("shows loading text while agents are loading", () => {
      setHook({ loading: true });
      renderPage();

      expect(screen.getByText("Loading agents...")).toBeInTheDocument();
    });

    it("renders skeleton cards while loading", () => {
      setHook({ loading: true });
      const { container } = renderPage();

      const pulseCards = container.querySelectorAll(".animate-pulse");
      expect(pulseCards.length).toBe(6);
    });

    it("does not render agent names while loading", () => {
      setHook({ loading: true, agents: [] });
      renderPage();

      expect(screen.queryByText("gemini-assistant")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("shows error message", () => {
      setHook({ error: "Connection refused" });
      renderPage();

      expect(screen.getByText("Unable to load agents")).toBeInTheDocument();
      expect(screen.getByText("Connection refused")).toBeInTheDocument();
      expect(
        screen.getByText("Check API availability and try again."),
      ).toBeInTheDocument();
    });

    it("shows retry button that calls retry", async () => {
      setHook({ error: "Connection refused" });
      renderPage();

      const btn = screen.getByRole("button", { name: "Retry" });
      await userEvent.click(btn);

      expect(mockRetry).toHaveBeenCalledOnce();
    });
  });

  describe("empty results", () => {
    it("shows no agents found message", () => {
      setHook({ agents: [], total: 0 });
      renderPage();

      expect(screen.getByText("No agents found")).toBeInTheDocument();
      expect(
        screen.getByText("Try a different query or adjust selected tags."),
      ).toBeInTheDocument();
    });

    it("does not show clear filters button when no filters active", () => {
      setHook({ agents: [], total: 0 });
      renderPage();

      expect(screen.queryByText("Clear all filters")).not.toBeInTheDocument();
    });
  });

  describe("agent list", () => {
    it("displays correct total count", () => {
      setHook({ agents: ALL_AGENTS, total: 5 });
      renderPage();

      expect(screen.getByText("5 agents")).toBeInTheDocument();
    });

    it("displays singular count for one agent", () => {
      setHook({ agents: [GEMINI], total: 1 });
      renderPage();

      expect(screen.getByText("1 agent")).toBeInTheDocument();
    });

    it("renders an AgentCard for each agent", () => {
      setHook({ agents: ALL_AGENTS, total: 5 });
      renderPage();

      const links = screen.getAllByRole("link", { name: "View details" });
      expect(links).toHaveLength(5);
    });
  });

  describe("executor agents surface correctly", () => {
    it("renders all four executor agent names", () => {
      setHook({ agents: EXECUTOR_AGENTS, total: 4 });
      renderPage();

      expect(screen.getByText("gemini-assistant")).toBeInTheDocument();
      expect(screen.getByText("claude-assistant")).toBeInTheDocument();
      expect(screen.getByText("codex-assistant")).toBeInTheDocument();
      expect(screen.getByText("code-review-specialist")).toBeInTheDocument();
    });

    it("renders executor agent descriptions", () => {
      setHook({ agents: [GEMINI], total: 1 });
      renderPage();

      expect(
        screen.getByText(/AI coding agent powered by Google Gemini CLI/),
      ).toBeInTheDocument();
    });

    it("renders executor agent tags as badges", () => {
      setHook({ agents: [CLAUDE], total: 1 });
      renderPage();

      // Tags appear in both TagFilter and AgentCard badge, so use getAllByText
      expect(screen.getAllByText("ai").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("claude").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("coding").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("code-generation").length).toBeGreaterThanOrEqual(1);
    });

    it("renders executor agent pricing", () => {
      setHook({ agents: [GEMINI], total: 1 });
      renderPage();

      expect(screen.getByText("$0.10 / job")).toBeInTheDocument();
    });

    it("renders code-review specialist pricing", () => {
      setHook({ agents: [CODE_REVIEW], total: 1 });
      renderPage();

      expect(screen.getByText("$0.08 / job")).toBeInTheDocument();
    });

    it("links to correct executor agent detail pages", () => {
      setHook({ agents: EXECUTOR_AGENTS, total: 4 });
      renderPage();

      const links = screen.getAllByRole("link", { name: "View details" });
      const hrefs = links.map((l) => l.getAttribute("href"));

      expect(hrefs).toContain("/agents/55555555-5555-5555-5555-555555555555");
      expect(hrefs).toContain("/agents/66666666-6666-6666-6666-666666666666");
      expect(hrefs).toContain("/agents/77777777-7777-7777-7777-777777777777");
      expect(hrefs).toContain("/agents/88888888-8888-8888-8888-888888888888");
    });

    it("renders code-review specific tags", () => {
      setHook({ agents: [CODE_REVIEW], total: 1 });
      renderPage();

      // Tags appear in both TagFilter and AgentCard badge
      expect(screen.getAllByText("code-review").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("quality").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("mixed executor and non-executor agents", () => {
    it("renders both executor and non-executor agents", () => {
      setHook({ agents: ALL_AGENTS, total: 5 });
      renderPage();

      expect(screen.getByText("gemini-assistant")).toBeInTheDocument();
      expect(screen.getByText("text-summarizer-pro")).toBeInTheDocument();
    });

    it("shows correct total for full marketplace", () => {
      setHook({ agents: ALL_AGENTS, total: 8 });
      renderPage();

      expect(screen.getByText("8 agents")).toBeInTheDocument();
    });
  });

  describe("page structure", () => {
    it("renders page heading and description", () => {
      setHook({ agents: [], total: 0 });
      renderPage();

      expect(screen.getByText("Browse Agents")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Search and discover AI agents available on the marketplace.",
        ),
      ).toBeInTheDocument();
    });
  });
});
