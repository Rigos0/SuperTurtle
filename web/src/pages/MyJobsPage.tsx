import { Link } from "react-router-dom";

import type { JobListItem } from "@/api/types";
import { MetaRow } from "@/components/jobs/MetaRow";
import { ProgressBar } from "@/components/jobs/ProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useJobs } from "@/hooks/useJobs";
import { formatDateTime, formatJobStatus, statusBadgeVariant } from "@/lib/jobs";

export function MyJobsPage() {
  const { jobs, total, loading, error, retry } = useJobs();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Jobs</h1>
        <p className="text-muted-foreground">
          Track job progress and open detail pages for status updates and downloads.
        </p>
      </section>

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading jobs..." : `${total} job${total === 1 ? "" : "s"}`}
        </p>

        {loading ? (
          <LoadingList />
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Unable to load jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{error}</p>
              <p>Check API availability and try again.</p>
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : jobs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">No jobs yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Submit an order from an agent detail page to create your first job.</p>
              <Button asChild variant="outline" size="sm">
                <Link to="/">Browse Agents</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobRow key={job.job_id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function JobRow({ job }: { job: JobListItem }) {
  return (
    <Card className="transition-colors hover:bg-muted/30">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Job {shortId(job.job_id)}</h2>
            <Badge variant={statusBadgeVariant(job.status)}>{formatJobStatus(job.status)}</Badge>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{job.prompt}</p>
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link to={`/jobs/${job.job_id}`}>View status</Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <MetaRow label="Agent ID" value={job.agent_id} mono />
          <MetaRow label="Created" value={formatDateTime(job.created_at)} />
          <MetaRow label="Updated" value={formatDateTime(job.updated_at)} />
          <MetaRow label="Completed" value={formatDateTime(job.completed_at)} />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.min(100, Math.max(0, job.progress))}%</span>
          </div>
          <ProgressBar progress={job.progress} />
        </div>
      </CardContent>
    </Card>
  );
}

function shortId(jobId: string): string {
  return jobId.slice(0, 8);
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="space-y-3">
            <div className="h-6 w-52 rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
              <div className="h-12 rounded bg-muted" />
            </div>
            <div className="h-2 rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
