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

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

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
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onOffsetChange(offset + limit)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
