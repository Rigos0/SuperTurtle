import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export function TagFilter({
  tags,
  selectedTags,
  onToggleTag,
  onClear,
}: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => {
        const selected = selectedTags.includes(tag);

        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={cn(
              badgeVariants({ variant: selected ? "default" : "secondary" }),
              "cursor-pointer border-transparent",
            )}
            aria-pressed={selected}
          >
            {tag}
          </button>
        );
      })}

      {selectedTags.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7"
        >
          Clear tags
        </Button>
      ) : null}
    </div>
  );
}
