import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/">Back to Browse</Link>
      </Button>
    </div>
  );
}
