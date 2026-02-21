import { useCallback, useEffect, useRef, useState } from "react";

import { listJobs } from "@/api/jobs";
import type { JobListItem } from "@/api/types";

export function useJobs() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchJobs = useCallback(() => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    listJobs({ limit: 100, signal: controller.signal })
      .then((res) => {
        setJobs(res.jobs);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load jobs.");
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchJobs();
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fetchJobs]);

  const retry = useCallback(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, total, loading, error, retry };
}
