import { Link, NavLink } from "react-router-dom";

export function Nav() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          agnt
        </Link>

        <div className="flex items-center gap-1">
          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            marketplace
          </span>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded px-3 py-1.5 text-sm ${isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            Browse
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              `rounded px-3 py-1.5 text-sm ${isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            My Jobs
          </NavLink>
        </div>
      </div>
    </header>
  );
}
