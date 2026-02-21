import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
}

export function SearchBar({
  value,
  onDebouncedChange,
  debounceMs = 300,
}: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const lastEmitted = useRef(value);

  useEffect(() => {
    setInputValue(value);
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    const trimmed = inputValue.trim();
    if (trimmed === lastEmitted.current) return;

    const timeout = window.setTimeout(() => {
      lastEmitted.current = trimmed;
      onDebouncedChange(trimmed);
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [debounceMs, inputValue, onDebouncedChange]);

  const clear = () => {
    setInputValue("");
    lastEmitted.current = "";
    onDebouncedChange("");
  };

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder="Search by name, capability, or tag"
        className="pl-9 pr-10"
        aria-label="Search agents"
      />
      {inputValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={clear}
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
