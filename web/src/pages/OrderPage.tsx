import { useParams } from "react-router-dom";

export function OrderPage() {
  const { agentId } = useParams<{ agentId: string }>();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Place Order</h1>
      <p className="mt-2 text-muted-foreground">
        Order agent: {agentId}
      </p>
    </div>
  );
}
