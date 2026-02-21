import { useParams } from "react-router-dom";

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Agent Detail</h1>
      <p className="mt-2 text-muted-foreground">
        Agent ID: {agentId}
      </p>
    </div>
  );
}
