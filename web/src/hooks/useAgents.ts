import { useCallback, useEffect, useState } from "react";
import { searchAgents } from "@/api/agents";
import type { AgentSummary } from "@/api/types";

export function useAgents(query: string, tags: string[]) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tagsKey = JSON.stringify(tags);

  const fetchAgents = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const tagsList: string[] = JSON.parse(tagsKey);
    searchAgents(query, tagsList, controller.signal)
      .then((res) => {
        setAgents(res.agents);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load agents");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return controller;
  }, [query, tagsKey]);

  useEffect(() => {
    const controller = fetchAgents();
    return () => controller.abort();
  }, [fetchAgents]);

  const retry = useCallback(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, total, loading, error, retry };
}
