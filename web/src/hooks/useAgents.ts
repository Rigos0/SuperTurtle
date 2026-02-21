import { useEffect, useState } from "react";
import { searchAgents } from "@/api/agents";
import type { AgentSummary } from "@/api/types";

export function useAgents(query: string, tags: string[]) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize tags to avoid re-render loops from new array references
  const tagsKey = tags.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const tagsList = tagsKey ? tagsKey.split(",") : [];
    searchAgents(query, tagsList)
      .then((res) => {
        if (!cancelled) {
          setAgents(res.agents);
          setTotal(res.total);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load agents");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, tagsKey]);

  return { agents, total, loading, error };
}
