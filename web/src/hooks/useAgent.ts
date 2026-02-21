import { useEffect, useState } from "react";
import { getAgent } from "@/api/agents";
import type { AgentDetail } from "@/api/types";

export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getAgent(agentId)
      .then((data) => {
        if (!cancelled) setAgent(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load agent");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  return { agent, loading, error };
}
