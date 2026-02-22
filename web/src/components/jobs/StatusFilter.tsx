import type { JobStatus } from "@/api/types";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/jobs";

const ALL_STATUSES: JobStatus[] = [
  "pending",
  "accepted",
  "rejected",
  "running",
  "completed",
  "failed",
];

interface StatusFilterProps {
  selected: JobStatus | undefined;
  onSelect: (status: JobStatus | undefined) => void;
}

export function StatusFilter({ selected, onSelect }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ALL_STATUSES.map((status) => {
        const active = selected === status;
        return (
          <button
            key={status}
            type="button"
            onClick={() => onSelect(active ? undefined : status)}
            className={cn(
              badgeVariants({
                variant: active ? statusBadgeVariant(status) : "secondary",
              }),
              "cursor-pointer border-transparent",
            )}
            aria-pressed={active}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        );
      })}

      {selected ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSelect(undefined)}
          className="h-7"
        >
          Clear
        </Button>
      ) : null}
    </div>
  );
}
