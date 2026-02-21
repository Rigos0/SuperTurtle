import { apiFetch } from "./client";
import type { AgentSearchResponse, AgentDetail } from "./types";

export function searchAgents(
  query: string = "",
  tags: string[] = [],
): Promise<AgentSearchResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  tags.forEach((t) => params.append("tag", t));
  const qs = params.toString();
  return apiFetch<AgentSearchResponse>(
    `/agents/search${qs ? `?${qs}` : ""}`,
  );
}

export function getAgent(agentId: string): Promise<AgentDetail> {
  return apiFetch<AgentDetail>(`/agents/${agentId}`);
}
