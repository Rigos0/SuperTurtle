import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Change this value to reset the boundary (e.g. pass location.pathname). */
  resetKey?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
  retryCount: number;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
    retryCount: 0,
  };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    if (error instanceof Error && error.message.trim()) {
      return { hasError: true, message: error.message };
    }

    return { hasError: true, message: "An unexpected UI error occurred." };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState((s) => ({
        hasError: false,
        message: "",
        retryCount: s.retryCount + 1,
      }));
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState((s) => ({
      hasError: false,
      message: "",
      retryCount: s.retryCount + 1,
    }));
  };

  render() {
    if (!this.state.hasError) {
      return (
        <ChildrenWrapper key={this.state.retryCount}>
          {this.props.children}
        </ChildrenWrapper>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page crashed while rendering. You can try again or reload the
            page.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
            {this.state.message}
          </pre>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/** Keyed wrapper that forces children to fully remount when key changes. */
function ChildrenWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
