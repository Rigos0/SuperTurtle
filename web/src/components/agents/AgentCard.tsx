import { Link } from "react-router-dom";

import type { AgentSummary } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPricing } from "@/lib/pricing";

interface AgentCardProps {
  agent: AgentSummary;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{agent.name}</CardTitle>
        <CardDescription className="line-clamp-3">{agent.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pricing</p>
          <p className="text-sm font-medium">{formatPricing(agent.pricing)}</p>
        </div>

        {agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agent.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto">
        <Button asChild className="w-full">
          <Link to={`/agents/${agent.agent_id}`}>View details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
