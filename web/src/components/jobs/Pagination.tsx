import { Button } from "@/components/ui/button";

interface PaginationProps {
  total: number;
  limit: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
}

export function Pagination({
  total,
  limit,
  offset,
  onOffsetChange,
}: PaginationProps) {
  if (total <= limit) {
    return null;
  }

  const totalPages = Math.ceil(total / limit);
  const maxOffset = Math.max(0, (totalPages - 1) * limit);
  const normalizedOffset = Math.min(Math.max(0, offset), maxOffset);
  const currentPage = Math.floor(normalizedOffset / limit) + 1;
  const hasPrev = normalizedOffset > 0;
  const hasNext = normalizedOffset + limit < total;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onOffsetChange(Math.max(0, normalizedOffset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onOffsetChange(normalizedOffset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
