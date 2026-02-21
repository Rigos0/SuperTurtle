import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { createJob } from "@/api/jobs";
import { ApiError } from "@/api/client";
import type { CreateJobResponse } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SchemaForm } from "@/components/order/SchemaForm";
import { useAgent } from "@/hooks/useAgent";
import { formatPricing } from "@/lib/pricing";

export function OrderPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { agent, loading, error, retry } = useAgent(agentId);

  if (!agentId) {
    return <InvalidState />;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0">
        <Link to={`/agents/${agentId}`}>Back to Agent</Link>
      </Button>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : agent ? (
        <OrderForm
          agentId={agent.agent_id}
          agentName={agent.name}
          pricing={agent.pricing}
          inputSchema={agent.input_schema}
        />
      ) : (
        <ErrorState error="Agent data is unavailable." onRetry={retry} />
      )}
    </div>
  );
}

function OrderForm({
  agentId,
  agentName,
  pricing,
  inputSchema,
}: {
  agentId: string;
  agentName: string;
  pricing: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
}) {
  const [prompt, setPrompt] = useState("");
  const paramsRef = useRef<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateJobResponse | null>(null);

  const handleParamsChange = useCallback((params: Record<string, unknown>) => {
    paramsRef.current = params;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = prompt.trim();
      if (!trimmed) return;

      setSubmitting(true);
      setSubmitError(null);

      createJob({
        agent_id: agentId,
        prompt: trimmed,
        params: paramsRef.current,
      })
        .then((res) => {
          setResult(res);
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError) {
            setSubmitError(err.message || "Failed to create job.");
          } else if (err instanceof Error) {
            setSubmitError(err.message);
          } else {
            setSubmitError("Failed to create job.");
          }
        })
        .finally(() => {
          setSubmitting(false);
        });
    },
    [agentId, prompt],
  );

  if (result) {
    return <SuccessState result={result} agentName={agentName} />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Place Order</h1>
        <p className="mt-1 text-muted-foreground">
          {agentName} · {formatPricing(pricing)}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="prompt">
              Describe what you want the agent to do{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              required
              rows={4}
              placeholder="Enter your instructions…"
              onChange={(e) => setPrompt(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <SchemaForm schema={inputSchema} onChange={handleParamsChange} />
          </CardContent>
        </Card>

        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}

        <Button type="submit" size="lg" disabled={submitting || !prompt.trim()}>
          {submitting ? "Submitting…" : "Submit Order"}
        </Button>
      </form>
    </div>
  );
}

function SuccessState({
  result,
  agentName,
}: {
  result: CreateJobResponse;
  agentName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Order Submitted</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your job for <span className="font-medium text-foreground">{agentName}</span>{" "}
          has been created and is now <span className="font-medium text-foreground">{result.status}</span>.
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground">Job ID:</span>
            <span className="break-all font-mono text-xs">{result.job_id}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Status:</span>
            <span>{result.status}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Created:</span>
            <span>{new Date(result.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/agents/${result.agent_id}`}>Back to Agent</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/">Browse Agents</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-7 w-48 rounded bg-muted" />
          <div className="h-5 w-64 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-24 rounded bg-muted" />
          <div className="h-10 w-32 rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Unable to load agent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function InvalidState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Invalid order URL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Missing agent identifier in route.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Back to Browse</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
