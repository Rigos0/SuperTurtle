import { Link, useParams } from "react-router-dom";

import type { JobDetail, JobManifestFile } from "@/api/types";
import { MetaRow } from "@/components/jobs/MetaRow";
import { ProgressBar } from "@/components/jobs/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJob } from "@/hooks/useJob";
import { useJobResult } from "@/hooks/useJobResult";
import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatJobStatus,
  statusBadgeVariant,
} from "@/lib/jobs";

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { job, loading, error, notFound, retry } = useJob(jobId);
  const isCompleted = job?.status === "completed";
  const {
    result,
    loading: resultLoading,
    error: resultError,
    notFound: resultNotFound,
    retry: retryResult,
  } = useJobResult(jobId, isCompleted);

  if (!jobId) {
    return <InvalidState />;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0">
        <Link to="/jobs">Back to My Jobs</Link>
      </Button>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} notFound={notFound} onRetry={retry} />
      ) : job ? (
        <JobContent
          job={job}
          resultLoading={resultLoading}
          resultError={resultError}
          resultNotFound={resultNotFound}
          onRetryResult={retryResult}
          files={result?.files ?? []}
        />
      ) : (
        <ErrorState error="Job data is unavailable." notFound={false} onRetry={retry} />
      )}
    </div>
  );
}

function JobContent({
  job,
  resultLoading,
  resultError,
  resultNotFound,
  onRetryResult,
  files,
}: {
  job: JobDetail;
  resultLoading: boolean;
  resultError: string | null;
  resultNotFound: boolean;
  onRetryResult: () => void;
  files: JobManifestFile[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Job Status</h1>
          <Badge variant={statusBadgeVariant(job.status)}>{formatJobStatus(job.status)}</Badge>
        </div>
        <p className="break-all font-mono text-xs text-muted-foreground">{job.job_id}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current progress</span>
            <span>{Math.min(100, Math.max(0, job.progress))}%</span>
          </div>
          <ProgressBar progress={job.progress} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <MetaRow label="Agent ID" value={job.agent_id} mono />
          <MetaRow label="Created" value={formatDateTime(job.created_at)} />
          <MetaRow label="Started" value={formatDateTime(job.started_at)} />
          <MetaRow label="Updated" value={formatDateTime(job.updated_at)} />
          <MetaRow label="Completed" value={formatDateTime(job.completed_at)} />
          <MetaRow label="Duration" value={formatDuration(job.duration_seconds)} />
          <MetaRow label="Decision Reason" value={job.decision_reason ?? "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{job.prompt}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed sm:text-xs">
            {JSON.stringify(job.params, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <ResultCard
        status={job.status}
        loading={resultLoading}
        error={resultError}
        notFound={resultNotFound}
        onRetry={onRetryResult}
        files={files}
      />
    </div>
  );
}

function ResultCard({
  status,
  loading,
  error,
  notFound,
  onRetry,
  files,
}: {
  status: JobDetail["status"];
  loading: boolean;
  error: string | null;
  notFound: boolean;
  onRetry: () => void;
  files: JobManifestFile[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Result Downloads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {status !== "completed" ? (
          <p className="text-muted-foreground">
            Downloads will be available once this job reaches the completed status.
          </p>
        ) : loading ? (
          <LoadingFiles />
        ) : error && notFound ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Result files are not available yet. This can happen briefly after completion.
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Refresh
            </Button>
          </div>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : files.length === 0 ? (
          <p className="text-muted-foreground">No result files are available for this job.</p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.path}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium">{basename(file.path)}</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {file.path}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size_bytes)}
                    {file.mime_type ? ` · ${file.mime_type}` : ""}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                  <a href={safeDownloadHref(file.download_url)} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingFiles() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="animate-pulse space-y-2 rounded-lg border p-3">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  error,
  notFound,
  onRetry,
}: {
  error: string;
  notFound: boolean;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{notFound ? "Job not found" : "Unable to load job"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{error}</p>
        <p>
          {notFound
            ? "The requested job does not exist."
            : "Check API availability and try again."}
        </p>
        {!notFound ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/jobs">Back to My Jobs</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="space-y-3">
        <div className="h-8 w-1/3 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-20 rounded bg-muted" />
        <div className="h-40 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function InvalidState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Invalid job URL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Missing job identifier in route.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/jobs">Back to My Jobs</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function safeDownloadHref(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch {
    // malformed URL
  }
  return "#";
}

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
