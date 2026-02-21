import { apiFetch } from "./client";
import type { CreateJobRequest, CreateJobResponse } from "./types";

export function createJob(req: CreateJobRequest): Promise<CreateJobResponse> {
  return apiFetch<CreateJobResponse>("/jobs", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
