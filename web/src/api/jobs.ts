import { apiFetch } from "./client";
import type {
  CreateJobRequest,
  CreateJobResponse,
  JobDetail,
  JobListResponse,
  JobResultResponse,
  JobStatus,
} from "./types";

export function createJob(req: CreateJobRequest): Promise<CreateJobResponse> {
  return apiFetch<CreateJobResponse>("/jobs", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export interface ListJobsOptions {
  agentId?: string;
  status?: JobStatus;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export function listJobs(options: ListJobsOptions = {}): Promise<JobListResponse> {
  const { agentId, status, limit, offset, signal } = options;
  const params = new URLSearchParams();
  if (agentId) params.set("agent_id", agentId);
  if (status) params.set("status", status);
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();

  return apiFetch<JobListResponse>(
    `/jobs${qs ? `?${qs}` : ""}`,
    signal ? { signal } : undefined,
  );
}

export function getJob(jobId: string, signal?: AbortSignal): Promise<JobDetail> {
  return apiFetch<JobDetail>(
    `/jobs/${encodeURIComponent(jobId)}`,
    signal ? { signal } : undefined,
  );
}

export function getJobResult(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobResultResponse> {
  return apiFetch<JobResultResponse>(
    `/jobs/${encodeURIComponent(jobId)}/result`,
    signal ? { signal } : undefined,
  );
}
