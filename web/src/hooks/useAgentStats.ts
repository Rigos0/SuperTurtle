import { useCallback, useEffect, useRef, useState } from "react";

import { getAgentStats } from "@/api/agents";
import { ApiError } from "@/api/client";
import type { AgentStats } from "@/api/types";

export function useAgentStats(agentId: string | undefined) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(Boolean(agentId));
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(() => {
    controllerRef.current?.abort();

    if (!agentId) {
      setStats(null);
      setError("Invalid agent ID.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    getAgentStats(agentId, controller.signal)
      .then((data) => {
        setStats(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStats(null);
        setError(normalizeAgentStatsError(err));
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [agentId]);

  useEffect(() => {
    fetchStats();
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fetchStats]);

  const retry = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, retry };
}

function normalizeAgentStatsError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "Agent stats not found.";
    return err.message || "Failed to load agent stats.";
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Failed to load agent stats.";
}
