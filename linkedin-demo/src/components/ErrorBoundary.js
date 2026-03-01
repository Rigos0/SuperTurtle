import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error boundary caught an error:", error, errorInfo);
  };

  render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div
          style={{
            width: "100%",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            boxSizing: "border-box",
            background:
              "linear-gradient(180deg, rgba(46, 125, 50, 0.08) 0%, rgba(46, 125, 50, 0.02) 100%)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              borderRadius: "14px",
              border: "1px solid #d7e5d8",
              backgroundColor: "#ffffff",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.08)",
              padding: "28px 24px",
              textAlign: "center",
              color: "#1f2933",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            }}
          >
            <div style={{ fontSize: "44px", lineHeight: 1, marginBottom: "12px" }}>
              🐢
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                margin: "12px 0 20px",
                fontSize: "0.98rem",
                lineHeight: 1.5,
                color: "#4b5563",
              }}
            >
              Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 0,
                borderRadius: "999px",
                padding: "10px 18px",
                backgroundColor: "#2e7d32",
                color: "#ffffff",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
