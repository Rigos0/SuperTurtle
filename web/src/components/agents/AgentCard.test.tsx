import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AgentCard } from "./AgentCard";
import type { AgentSummary } from "@/api/types";

function renderWithRouter(agent: AgentSummary) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AgentCard agent={agent} />
    </MemoryRouter>,
  );
}

const baseAgent: AgentSummary = {
  agent_id: "agent-1",
  name: "Code Reviewer",
  description: "Reviews code for quality issues",
  tags: ["code", "review"],
  pricing: { amount: 5, currency: "USD" },
  created_at: "2024-01-01T00:00:00Z",
};

describe("AgentCard", () => {
  it("renders agent name and description", () => {
    renderWithRouter(baseAgent);

    expect(screen.getByText("Code Reviewer")).toBeInTheDocument();
    expect(screen.getByText("Reviews code for quality issues")).toBeInTheDocument();
  });

  it("renders pricing", () => {
    renderWithRouter(baseAgent);

    expect(screen.getByText("$5.00")).toBeInTheDocument();
  });

  it("renders tags as badges", () => {
    renderWithRouter(baseAgent);

    expect(screen.getByText("code")).toBeInTheDocument();
    expect(screen.getByText("review")).toBeInTheDocument();
  });

  it("links to agent detail page", () => {
    renderWithRouter(baseAgent);

    const link = screen.getByRole("link", { name: "View details" });
    expect(link).toHaveAttribute("href", "/agents/agent-1");
  });

  it("handles agent with no tags", () => {
    renderWithRouter({ ...baseAgent, tags: [] });

    expect(screen.getByText("Code Reviewer")).toBeInTheDocument();
    expect(screen.queryByText("code")).not.toBeInTheDocument();
  });
});
