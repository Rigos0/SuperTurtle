import { Link } from "react-router-dom";

export function Nav() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          agnt
        </Link>
        <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          marketplace
        </span>
      </div>
    </header>
  );
}
