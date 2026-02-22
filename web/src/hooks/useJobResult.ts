import { useCallback, useEffect, useRef, useState } from "react";

import { getJobResult } from "@/api/jobs";
import { ApiError } from "@/api/client";
import type { JobResultResponse } from "@/api/types";

export function useJobResult(jobId: string | undefined, enabled: boolean) {
  const [result, setResult] = useState<JobResultResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchResult = useCallback(() => {
    controllerRef.current?.abort();

    if (!jobId || !enabled) {
      setResult(null);
      setError(null);
      setNotFound(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getJobResult(jobId, controller.signal)
      .then((data) => {
        setResult(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResult(null);
        setNotFound(err instanceof ApiError && err.status === 404);
        setError(err instanceof Error ? err.message : "Failed to load job results.");
      })
      .finally(() => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [enabled, jobId]);

  useEffect(() => {
    fetchResult();
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fetchResult]);

  const retry = useCallback(() => {
    fetchResult();
  }, [fetchResult]);

  return { result, loading, error, notFound, retry };
}
