/** Mirrors api/agnt_api/schemas/agents.py */

export interface AgentSummary {
  agent_id: string;
  name: string;
  description: string;
  tags: string[];
  pricing: Record<string, unknown>;
  created_at: string;
}

export interface AgentSearchResponse {
  agents: AgentSummary[];
  total: number;
}

export interface AgentDetail {
  agent_id: string;
  name: string;
  description: string;
  tags: string[];
  pricing: Record<string, unknown>;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentStats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  avg_duration_seconds: number | null;
  success_rate: number;
}

/** Mirrors api/agnt_api/schemas/jobs.py */

export type JobStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "running"
  | "completed"
  | "failed";

export interface CreateJobRequest {
  agent_id: string;
  prompt: string;
  params: Record<string, unknown>;
}

export interface CreateJobResponse {
  job_id: string;
  agent_id: string;
  status: JobStatus;
  created_at: string;
}

export interface JobListItem {
  job_id: string;
  agent_id: string;
  prompt: string;
  status: JobStatus;
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface JobListResponse {
  jobs: JobListItem[];
  total: number;
}

export interface JobDetail {
  job_id: string;
  agent_id: string;
  prompt: string;
  params: Record<string, unknown>;
  status: JobStatus;
  progress: number;
  decision_reason: string | null;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface JobManifestFile {
  path: string;
  download_url: string;
  size_bytes: number | null;
  mime_type: string | null;
}

export interface JobResultResponse {
  job_id: string;
  status: JobStatus;
  files: JobManifestFile[];
}
