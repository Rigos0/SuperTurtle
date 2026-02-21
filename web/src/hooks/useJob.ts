import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/api/client";
import { getJob } from "@/api/jobs";
import type { JobDetail } from "@/api/types";

export function useJob(jobId: string | undefined) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchJob = useCallback(() => {
    controllerRef.current?.abort();

    if (!jobId) {
      setJob(null);
      setError("Invalid job ID.");
      setNotFound(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getJob(jobId, controller.signal)
      .then((data) => {
        setJob(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setJob(null);
        const is404 = err instanceof ApiError && err.status === 404;
        setNotFound(is404);
        setError(normalizeJobError(err));
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fetchJob]);

  const retry = useCallback(() => {
    fetchJob();
  }, [fetchJob]);

  return { job, loading, error, notFound, retry };
}

function normalizeJobError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "Job not found.";
    return err.message || "Failed to load job.";
  }

  if (err instanceof Error) {
    return err.message;
  }

  return "Failed to load job.";
}
