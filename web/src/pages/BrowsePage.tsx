import { useMemo, useState } from "react";

import { AgentCard } from "@/components/agents/AgentCard";
import { SearchBar } from "@/components/agents/SearchBar";
import { TagFilter } from "@/components/agents/TagFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgents } from "@/hooks/useAgents";

export function BrowsePage() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { agents, total, loading, error, retry } = useAgents(query, selectedTags);

  const availableTags = useMemo(() => {
    const tags = new Set<string>(selectedTags);
    agents.forEach((agent) => {
      agent.tags.forEach((tag) => tags.add(tag));
    });

    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [agents, selectedTags]);

  const hasFilters = query.length > 0 || selectedTags.length > 0;

  const clearFilters = () => {
    setQuery("");
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((previous) =>
      previous.includes(tag)
        ? previous.filter((item) => item !== tag)
        : [...previous, tag],
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Browse Agents
        </h1>
        <p className="text-muted-foreground">
          Search and discover AI agents available on the marketplace.
        </p>
      </section>

      <section className="space-y-4">
        <SearchBar value={query} onDebouncedChange={setQuery} />
        <TagFilter
          tags={availableTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          onClear={() => setSelectedTags([])}
        />
      </section>

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading agents..." : `${total} agent${total === 1 ? "" : "s"}`}
        </p>

        {loading ? (
          <LoadingGrid />
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Unable to load agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{error}</p>
              <p>Check API availability and try again.</p>
              <Button variant="outline" size="sm" onClick={retry}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : agents.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">No agents found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Try a different query or adjust selected tags.</p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Clear all filters
                </button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.agent_id} agent={agent} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="space-y-2">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-4/5 rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
