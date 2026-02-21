import { useCallback, useEffect, useRef, useState } from "react";
import { getAgent } from "@/api/agents";
import { ApiError } from "@/api/client";
import type { AgentDetail } from "@/api/types";

export function useAgent(agentId: string | undefined) {
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(agentId));
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchAgent = useCallback(() => {
    controllerRef.current?.abort();

    if (!agentId) {
      setAgent(null);
      setError("Invalid agent ID.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    getAgent(agentId, controller.signal)
      .then((data) => {
        setAgent(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAgent(null);
        setError(normalizeAgentError(err));
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [agentId]);

  useEffect(() => {
    fetchAgent();
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fetchAgent]);

  const retry = useCallback(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, retry };
}

function normalizeAgentError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "Agent not found.";
    return err.message || "Failed to load agent.";
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Failed to load agent.";
}
