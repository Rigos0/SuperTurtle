import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <div className="mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTTP 404</p>
          <CardTitle className="text-2xl sm:text-3xl">Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>This route does not exist in the marketplace app.</p>
          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
            {pathname}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Browse Agents</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/jobs">My Jobs</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
