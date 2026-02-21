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
