package cli

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestRunVersion(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"version"})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d", exit)
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected no stderr output, got %q", stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got error %v", err)
	}
	if payload["name"] != "agnt" {
		t.Fatalf("unexpected name: %v", payload["name"])
	}
}

func TestRunConfigError(t *testing.T) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"--config", filepath.Join(t.TempDir(), "missing.yaml"),
		"version",
	})
	if exit != 4 {
		t.Fatalf("expected exit 4, got %d", exit)
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "config_error" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
}

func TestRunSearchCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/search" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("q"); got != "logo designer" {
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

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"agents":[{"agent_id":"a1","name":"Logo Pro","description":"Design logos","tags":["design"],"pricing":{"credits":5},"created_at":"2026-02-21T10:00:00Z"}],"total":1}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"search",
		"logo designer",
		"--tag", "design",
		"--limit", "5",
		"--offset", "10",
	})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d", exit)
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected no stderr output, got %q", stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got %v", err)
	}
	if payload["total"] != float64(1) {
		t.Fatalf("unexpected total: %v", payload["total"])
	}
	agents, ok := payload["agents"].([]any)
	if !ok || len(agents) != 1 {
		t.Fatalf("unexpected agents payload: %#v", payload["agents"])
	}
	first, ok := agents[0].(map[string]any)
	if !ok {
		t.Fatalf("unexpected agent entry: %#v", agents[0])
	}
	if first["agent_id"] != "a1" {
		t.Fatalf("unexpected agent id: %v", first["agent_id"])
	}
}

func TestRunInfoCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/550e8400-e29b-41d4-a716-446655440000" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"agent_id":"550e8400-e29b-41d4-a716-446655440000",
			"name":"Logo Pro",
			"description":"Creates professional logos",
			"tags":["design"],
			"pricing":{"credits":10},
			"input_schema":{"type":"object"},
			"output_schema":{"type":"object"},
			"created_at":"2026-02-21T10:00:00Z",
			"updated_at":"2026-02-21T12:00:00Z"
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"info", "550e8400-e29b-41d4-a716-446655440000"})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d; stderr: %s", exit, stderr.String())
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected no stderr output, got %q", stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got error %v", err)
	}
	if payload["agent_id"] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("unexpected agent_id: %v", payload["agent_id"])
	}
	if payload["name"] != "Logo Pro" {
		t.Fatalf("unexpected name: %v", payload["name"])
	}
}

func TestRunInfoInvalidUUID(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"info", "not-a-uuid"})
	if exit != 1 {
		t.Fatalf("expected exit 1, got %d", exit)
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	msg, _ := payload["message"].(string)
	if msg != "invalid agent id: must be a valid UUID" {
		t.Fatalf("unexpected message: %s", msg)
	}
}

func TestRunSearchInvalidLimit(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"search", "test", "--limit", "0"})
	if exit != 4 {
		t.Fatalf("expected exit 4, got %d", exit)
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "validation_error" {
		t.Fatalf("unexpected error: %v", payload["error"])
	}
}

func TestRunInfoNotFound(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	missingID := "00000000-0000-0000-0000-000000000000"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/"+missingID {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"agent_not_found","message":"Agent does not exist."}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"info", missingID})
	if exit != 3 {
		t.Fatalf("expected exit 3, got %d", exit)
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected no stdout output, got %q", stdout.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "agent_not_found" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
	if payload["message"] != "Agent does not exist." {
		t.Fatalf("unexpected error message: %v", payload["message"])
	}
}

func TestRunOrderCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	agentID := "550e8400-e29b-41d4-a716-446655440000"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/v1/jobs" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		if payload["agent_id"] != agentID {
			t.Fatalf("unexpected agent_id: %v", payload["agent_id"])
		}
		if payload["prompt"] != "Design a mascot" {
			t.Fatalf("unexpected prompt: %v", payload["prompt"])
		}
		params, ok := payload["params"].(map[string]any)
		if !ok {
			t.Fatalf("unexpected params payload: %#v", payload["params"])
		}
		if params["style"] != "modern" {
			t.Fatalf("unexpected style param: %v", params["style"])
		}
		if params["ratio"] != "1:1" {
			t.Fatalf("unexpected ratio param: %v", params["ratio"])
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"job_id":"11111111-2222-3333-4444-555555555555",
			"agent_id":"550e8400-e29b-41d4-a716-446655440000",
			"status":"pending",
			"created_at":"2026-02-21T10:30:00Z"
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"order",
		agentID,
		"--prompt", "Design a mascot",
		"--param", "style=modern",
		"--param", "ratio=1:1",
	})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d; stderr: %s", exit, stderr.String())
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected no stderr output, got %q", stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got error %v", err)
	}
	if payload["job_id"] != "11111111-2222-3333-4444-555555555555" {
		t.Fatalf("unexpected job_id: %v", payload["job_id"])
	}
	if payload["status"] != "pending" {
		t.Fatalf("unexpected status: %v", payload["status"])
	}
}

func TestRunOrderMissingPrompt(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"order",
		"550e8400-e29b-41d4-a716-446655440000",
	})
	if exit != 4 {
		t.Fatalf("expected exit 4, got %d", exit)
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "validation_error" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
	if payload["message"] != "prompt must not be empty" {
		t.Fatalf("unexpected message: %v", payload["message"])
	}
}

func TestRunOrderInvalidParam(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"order",
		"550e8400-e29b-41d4-a716-446655440000",
		"--prompt", "hello",
		"--param", "invalid-param",
	})
	if exit != 4 {
		t.Fatalf("expected exit 4, got %d", exit)
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "validation_error" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
	if payload["message"] != `invalid --param value "invalid-param": expected key=value` {
		t.Fatalf("unexpected message: %v", payload["message"])
	}
}
