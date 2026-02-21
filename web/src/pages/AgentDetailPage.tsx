import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgent } from "@/hooks/useAgent";
import { formatPricing } from "@/lib/pricing";
import type { AgentDetail } from "@/api/types";

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { agent, loading, error, retry } = useAgent(agentId);

  if (!agentId) {
    return <InvalidAgentState />;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="px-0">
        <Link to="/">Back to Browse</Link>
      </Button>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : agent ? (
        <AgentContent agent={agent} />
      ) : (
        <ErrorState error="Agent data is unavailable." onRetry={retry} />
      )}
    </div>
  );
}

function AgentContent({ agent }: { agent: AgentDetail }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
        <p className="text-muted-foreground">{agent.description}</p>
        {agent.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Agent Info</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <MetaRow label="Agent ID" value={agent.agent_id} mono />
              <MetaRow label="Created" value={formatDate(agent.created_at)} />
              <MetaRow label="Updated" value={formatDate(agent.updated_at)} />
            </CardContent>
          </Card>

          <SchemaCard
            title="Input Schema"
            description="Parameters accepted when placing an order."
            schema={agent.input_schema}
          />

          <SchemaCard
            title="Output Schema"
            description="Expected result shape for completed jobs."
            schema={agent.output_schema}
          />
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-medium">{formatPricing(agent.pricing)}</p>
              <JsonBlock value={agent.pricing} />
              <Button asChild className="w-full">
                <Link to={`/agents/${agent.agent_id}/order`}>Order Agent</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={mono ? "break-all font-mono text-xs" : "text-sm"}>{value}</p>
    </div>
  );
}

function SchemaCard({
  title,
  description,
  schema,
}: {
  title: string;
  description: string;
  schema: Record<string, unknown>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <JsonBlock value={schema} />
      </CardContent>
    </Card>
  );
}

function JsonBlock({ value }: { value: Record<string, unknown> }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="animate-pulse lg:col-span-2">
        <CardHeader className="space-y-3">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="h-5 w-full rounded bg-muted" />
          <div className="h-5 w-4/5 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-36 rounded bg-muted" />
          <div className="h-36 rounded bg-muted" />
        </CardContent>
      </Card>

      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-7 w-1/2 rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="h-28 rounded bg-muted" />
          <div className="h-10 rounded bg-muted" />
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
  const isNotFound = error === "Agent not found.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isNotFound ? "Agent not found" : "Unable to load agent"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{error}</p>
        <p>
          {isNotFound
            ? "The requested agent does not exist or is no longer available."
            : "Check API availability and try again."}
        </p>
        {!isNotFound ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link to="/">Back to Browse</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function InvalidAgentState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Invalid agent URL</CardTitle>
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

function formatDate(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
