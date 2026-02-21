import { useCallback, useEffect, useRef, useState } from "react";
import { searchAgents } from "@/api/agents";
import type { AgentSummary } from "@/api/types";

export function useAgents(query: string, tags: string[]) {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const tagsKey = JSON.stringify(tags);

  const fetchAgents = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
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
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (!controller.signal.aborted) setLoading(false);
      });
  }, [query, tagsKey]);

  useEffect(() => {
    fetchAgents();
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fetchAgents]);

  const retry = useCallback(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, total, loading, error, retry };
}
