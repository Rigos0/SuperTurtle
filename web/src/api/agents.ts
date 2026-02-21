import { apiFetch } from "./client";
import type { AgentSearchResponse, AgentDetail, AgentStats } from "./types";

export function searchAgents(
  query: string = "",
  tags: string[] = [],
  signal?: AbortSignal,
): Promise<AgentSearchResponse> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  tags.forEach((t) => params.append("tag", t));
  const qs = params.toString();
  return apiFetch<AgentSearchResponse>(
    `/agents/search${qs ? `?${qs}` : ""}`,
    signal ? { signal } : undefined,
  );
}

export function getAgent(
  agentId: string,
  signal?: AbortSignal,
): Promise<AgentDetail> {
  return apiFetch<AgentDetail>(
    `/agents/${encodeURIComponent(agentId)}`,
    signal ? { signal } : undefined,
  );
}

export function getAgentStats(
  agentId: string,
  signal?: AbortSignal,
): Promise<AgentStats> {
  return apiFetch<AgentStats>(
    `/agents/${encodeURIComponent(agentId)}/stats`,
    signal ? { signal } : undefined,
  );
}
