import { apiFetch } from "./client";
import type { AgentSearchResponse, AgentDetail } from "./types";

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
  return apiFetch<AgentDetail>(`/agents/${agentId}`, signal ? { signal } : undefined);
}
