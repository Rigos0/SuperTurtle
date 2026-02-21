package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestSearchAgents(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/v1/agents/search" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("q"); got != "logo" {
			t.Fatalf("unexpected q: %s", got)
		}
		if got := r.URL.Query().Get("tag"); got != "design" {
			t.Fatalf("unexpected tag: %s", got)
		}
		if got := r.URL.Query().Get("limit"); got != "5" {
			t.Fatalf("unexpected limit: %s", got)
		}
		if got := r.URL.Query().Get("offset"); got != "10" {
			t.Fatalf("unexpected offset: %s", got)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer token-123" {
			t.Fatalf("unexpected authorization header: %s", got)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"agents":[{"agent_id":"abc","name":"A","description":"d","tags":["design"],"pricing":{"credits":1},"created_at":"2026-02-21T10:00:00Z"}],"total":1}`))
	}))
	defer server.Close()

	client, err := NewClient(server.URL, 2*time.Second, "token-123")
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}

	resp, err := client.SearchAgents(context.Background(), "logo", SearchAgentsOptions{
		Tag:    "design",
		Limit:  5,
		Offset: 10,
	})
	if err != nil {
		t.Fatalf("SearchAgents() error = %v", err)
	}

	if resp.Total != 1 {
		t.Fatalf("unexpected total: %d", resp.Total)
	}
	if len(resp.Agents) != 1 {
		t.Fatalf("unexpected agent count: %d", len(resp.Agents))
	}
	if resp.Agents[0].AgentID != "abc" {
		t.Fatalf("unexpected agent id: %s", resp.Agents[0].AgentID)
	}
}

func TestGetAgent(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/v1/agents/550e8400-e29b-41d4-a716-446655440000" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"agent_id":"550e8400-e29b-41d4-a716-446655440000",
			"name":"Logo Pro",
			"description":"Creates professional logos",
			"tags":["design","branding"],
			"pricing":{"credits":10},
			"input_schema":{"type":"object","properties":{"style":{"type":"string"}}},
			"output_schema":{"type":"object","properties":{"url":{"type":"string"}}},
			"created_at":"2026-02-21T10:00:00Z",
			"updated_at":"2026-02-21T12:00:00Z"
		}`))
	}))
	defer server.Close()

	client, err := NewClient(server.URL, 2*time.Second, "")
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}

	resp, err := client.GetAgent(context.Background(), "550e8400-e29b-41d4-a716-446655440000")
	if err != nil {
		t.Fatalf("GetAgent() error = %v", err)
	}

	if resp.AgentID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("unexpected agent id: %s", resp.AgentID)
	}
	if resp.Name != "Logo Pro" {
		t.Fatalf("unexpected name: %s", resp.Name)
	}
	if len(resp.Tags) != 2 {
		t.Fatalf("unexpected tags count: %d", len(resp.Tags))
	}
	if resp.InputSchema["type"] != "object" {
		t.Fatalf("unexpected input_schema: %v", resp.InputSchema)
	}
	if resp.OutputSchema["type"] != "object" {
		t.Fatalf("unexpected output_schema: %v", resp.OutputSchema)
	}
	if resp.UpdatedAt.IsZero() {
		t.Fatalf("expected non-zero updated_at")
	}
}

func TestGetAgentInvalidUUID(t *testing.T) {
	t.Parallel()

	client, err := NewClient("http://localhost:9999", 2*time.Second, "")
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}

	_, err = client.GetAgent(context.Background(), "not-a-uuid")
	if err == nil {
		t.Fatalf("expected error for invalid UUID")
	}
	if err.Error() != "invalid agent id: must be a valid UUID" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDecodeHTTPErrorWithDetail(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"detail":[{"loc":["query","q"],"msg":"field required","type":"missing"}]}`))
	}))
	defer server.Close()

	client, err := NewClient(server.URL, 2*time.Second, "")
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}

	_, err = client.SearchAgents(context.Background(), "", SearchAgentsOptions{})
	if err == nil {
		t.Fatalf("expected error")
	}

	var httpErr *HTTPError
	if !errors.As(err, &httpErr) {
		t.Fatalf("expected HTTPError, got %T", err)
	}
	if httpErr.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("unexpected status code: %d", httpErr.StatusCode)
	}
	// Message should contain the detail array since no "message" field exists
	if httpErr.Message == "" || httpErr.Message == "request failed with status 422" {
		t.Fatalf("expected detail-derived message, got: %s", httpErr.Message)
	}
}

func TestGetAgentError(t *testing.T) {
	t.Parallel()

	missingID := "00000000-0000-0000-0000-000000000000"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/"+missingID {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"agent_not_found","message":"Agent does not exist."}`))
	}))
	defer server.Close()

	client, err := NewClient(server.URL, 2*time.Second, "")
	if err != nil {
		t.Fatalf("NewClient() error = %v", err)
	}

	_, err = client.GetAgent(context.Background(), missingID)
	if err == nil {
		t.Fatalf("expected error")
	}

	var httpErr *HTTPError
	if !errors.As(err, &httpErr) {
		t.Fatalf("expected HTTPError, got %T", err)
	}
	if httpErr.StatusCode != http.StatusNotFound {
		t.Fatalf("unexpected status code: %d", httpErr.StatusCode)
	}
	if httpErr.Code != "agent_not_found" {
		t.Fatalf("unexpected code: %s", httpErr.Code)
	}
	if httpErr.Message != "Agent does not exist." {
		t.Fatalf("unexpected message: %s", httpErr.Message)
	}
}
