package cli

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
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

func TestRunStatsCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	agentID := "550e8400-e29b-41d4-a716-446655440000"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/agents/"+agentID+"/stats" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"total_jobs":5,
			"completed_jobs":3,
			"failed_jobs":1,
			"avg_duration_seconds":42.5,
			"success_rate":0.6
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"stats", agentID})
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
	if payload["total_jobs"] != float64(5) {
		t.Fatalf("unexpected total_jobs: %v", payload["total_jobs"])
	}
	if payload["success_rate"] != 0.6 {
		t.Fatalf("unexpected success_rate: %v", payload["success_rate"])
	}
}

func TestRunStatsInvalidUUID(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"stats", "not-a-uuid"})
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

func TestRunJobsCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/v1/jobs" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("status"); got != "running" {
			t.Fatalf("unexpected status: %s", got)
		}
		if got := r.URL.Query().Get("limit"); got != "5" {
			t.Fatalf("unexpected limit: %s", got)
		}
		if got := r.URL.Query().Get("offset"); got != "10" {
			t.Fatalf("unexpected offset: %s", got)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"jobs":[
				{
					"job_id":"11111111-2222-3333-4444-555555555555",
					"agent_id":"550e8400-e29b-41d4-a716-446655440000",
					"prompt":"Generate logo",
					"status":"running",
					"progress":65,
					"created_at":"2026-02-21T10:00:00Z",
					"updated_at":"2026-02-21T10:02:00Z",
					"completed_at":null
				}
			],
			"total":1
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"jobs",
		"--status", "running",
		"--limit", "5",
		"--offset", "10",
	})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d; stderr: %s", exit, stderr.String())
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
	jobs, ok := payload["jobs"].([]any)
	if !ok || len(jobs) != 1 {
		t.Fatalf("unexpected jobs payload: %#v", payload["jobs"])
	}
	first, ok := jobs[0].(map[string]any)
	if !ok {
		t.Fatalf("unexpected job entry: %#v", jobs[0])
	}
	if first["job_id"] != "11111111-2222-3333-4444-555555555555" {
		t.Fatalf("unexpected job_id: %v", first["job_id"])
	}
}

func TestRunJobsInvalidStatus(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"jobs", "--status", "queued"})
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
	if payload["message"] != "status must be one of: pending, accepted, rejected, running, completed, failed" {
		t.Fatalf("unexpected message: %v", payload["message"])
	}
}

func TestRunStatusCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("unexpected method: %s", r.Method)
		}
		if r.URL.Path != "/v1/jobs/"+jobID {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"job_id":"11111111-2222-3333-4444-555555555555",
			"agent_id":"550e8400-e29b-41d4-a716-446655440000",
			"prompt":"Generate logo",
			"params":{"style":"minimal"},
			"status":"running",
			"progress":65,
			"decision_reason":null,
			"created_at":"2026-02-21T10:00:00Z",
			"started_at":"2026-02-21T10:01:00Z",
			"updated_at":"2026-02-21T10:02:00Z",
			"completed_at":null
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"status", jobID})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d; stderr: %s", exit, stderr.String())
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected no stderr output, got %q", stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got %v", err)
	}
	if payload["job_id"] != jobID {
		t.Fatalf("unexpected job_id: %v", payload["job_id"])
	}
	if payload["status"] != "running" {
		t.Fatalf("unexpected status: %v", payload["status"])
	}
	if payload["progress"] != float64(65) {
		t.Fatalf("unexpected progress: %v", payload["progress"])
	}
}

func TestRunStatusInvalidUUID(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"status", "not-a-uuid"})
	if exit != 1 {
		t.Fatalf("expected exit 1, got %d", exit)
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["message"] != "invalid job id: must be a valid UUID" {
		t.Fatalf("unexpected message: %v", payload["message"])
	}
}

func TestRunStatusNotFound(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/jobs/"+jobID {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"job_not_found","message":"Job does not exist."}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"status", jobID})
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
	if payload["error"] != "job_not_found" {
		t.Fatalf("unexpected error: %v", payload["error"])
	}
}

func TestRunResultCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/jobs/" + jobID + "/result":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{
				"job_id":"11111111-2222-3333-4444-555555555555",
				"status":"completed",
				"files":[
					{
						"path":"jobs/11111111-2222-3333-4444-555555555555/result.txt",
						"download_url":"` + server.URL + `/downloads/result.txt",
						"size_bytes":5,
						"mime_type":"text/plain"
					},
					{
						"path":"jobs/11111111-2222-3333-4444-555555555555/summary.json",
						"download_url":"` + server.URL + `/downloads/summary.json",
						"size_bytes":17,
						"mime_type":"application/json"
					}
				]
			}`))
		case "/downloads/result.txt":
			_, _ = w.Write([]byte("hello"))
		case "/downloads/summary.json":
			_, _ = w.Write([]byte(`{"status":"ok"}`))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	outputDir := filepath.Join(t.TempDir(), "downloads")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"result", jobID, "--output", outputDir})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d; stderr: %s", exit, stderr.String())
	}
	if stderr.Len() != 0 {
		t.Fatalf("expected no stderr output, got %q", stderr.String())
	}

	expectedResultPath := filepath.Join(outputDir, "jobs", jobID, "result.txt")
	expectedSummaryPath := filepath.Join(outputDir, "jobs", jobID, "summary.json")

	content, err := os.ReadFile(expectedResultPath)
	if err != nil {
		t.Fatalf("read downloaded result file: %v", err)
	}
	if string(content) != "hello" {
		t.Fatalf("unexpected file content: %s", string(content))
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got %v", err)
	}
	if payload["job_id"] != jobID {
		t.Fatalf("unexpected job_id: %v", payload["job_id"])
	}
	if payload["status"] != "completed" {
		t.Fatalf("unexpected status: %v", payload["status"])
	}
	files, ok := payload["files"].([]any)
	if !ok || len(files) != 2 {
		t.Fatalf("unexpected files payload: %#v", payload["files"])
	}
	first, ok := files[0].(map[string]any)
	if !ok {
		t.Fatalf("unexpected first file payload: %#v", files[0])
	}
	if first["path"] != expectedResultPath {
		t.Fatalf("unexpected first file path: %v", first["path"])
	}
	second, ok := files[1].(map[string]any)
	if !ok {
		t.Fatalf("unexpected second file payload: %#v", files[1])
	}
	if second["path"] != expectedSummaryPath {
		t.Fatalf("unexpected second file path: %v", second["path"])
	}
}

func TestRunResultCommandDownloadFailure(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/jobs/" + jobID + "/result":
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{
				"job_id":"11111111-2222-3333-4444-555555555555",
				"status":"completed",
				"files":[
					{
						"path":"jobs/11111111-2222-3333-4444-555555555555/result.txt",
						"download_url":"` + server.URL + `/downloads/result.txt",
						"size_bytes":5,
						"mime_type":"text/plain"
					}
				]
			}`))
		case "/downloads/result.txt":
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte("storage unavailable"))
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	outputDir := filepath.Join(t.TempDir(), "downloads")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"result", jobID, "--output", outputDir})
	if exit != 1 {
		t.Fatalf("expected exit 1, got %d", exit)
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected no stdout output, got %q", stdout.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "download_failed" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
}

func TestResultDestinationPath(t *testing.T) {
	t.Parallel()

	outputDir := "/tmp/output"
	tests := []struct {
		name      string
		path      string
		wantOK    bool
		wantPath  string
		wantError string
	}{
		{
			name:     "simple file",
			path:     "result.txt",
			wantOK:   true,
			wantPath: filepath.Join(outputDir, "result.txt"),
		},
		{
			name:     "nested path",
			path:     "jobs/123/result.txt",
			wantOK:   true,
			wantPath: filepath.Join(outputDir, "jobs/123/result.txt"),
		},
		{
			name:      "empty path",
			path:      "",
			wantError: "path must not be empty",
		},
		{
			name:      "absolute path",
			path:      "/etc/passwd",
			wantError: "path must be relative",
		},
		{
			name:      "parent traversal",
			path:      "../escape",
			wantError: "path must not escape output directory",
		},
		{
			name:      "deep parent traversal",
			path:      "foo/../../escape",
			wantError: "path must not escape output directory",
		},
		{
			name:     "innocuous parent in middle resolves inside",
			path:     "foo/../bar",
			wantOK:   true,
			wantPath: filepath.Join(outputDir, "bar"),
		},
		{
			name:      "dot-dot only",
			path:      "..",
			wantError: "path must not escape output directory",
		},
		{
			name:      "just slash",
			path:      "/",
			wantError: "path must not be empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resultDestinationPath(outputDir, tt.path)
			if tt.wantOK {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if got != tt.wantPath {
					t.Fatalf("expected %q, got %q", tt.wantPath, got)
				}
			} else {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantError)
				}
				if !strings.Contains(err.Error(), tt.wantError) {
					t.Fatalf("expected error containing %q, got %q", tt.wantError, err.Error())
				}
			}
		})
	}
}

func TestRunResultCommandEmptyFiles(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"job_id":"11111111-2222-3333-4444-555555555555",
			"status":"completed",
			"files":[]
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	outputDir := filepath.Join(t.TempDir(), "downloads")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"result", jobID, "--output", outputDir})
	if exit != 0 {
		t.Fatalf("expected exit 0, got %d; stderr: %s", exit, stderr.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stdout.Bytes(), &payload); err != nil {
		t.Fatalf("expected json output, got %v", err)
	}
	files, ok := payload["files"].([]any)
	if !ok {
		t.Fatalf("unexpected files payload: %#v", payload["files"])
	}
	if len(files) != 0 {
		t.Fatalf("expected empty files, got %d", len(files))
	}
}

func TestRunResultCommandRejectsNonCompleted(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"job_id":"11111111-2222-3333-4444-555555555555",
			"status":"running",
			"files":[]
		}`))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	outputDir := filepath.Join(t.TempDir(), "downloads")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"result", jobID, "--output", outputDir})
	if exit != 1 {
		t.Fatalf("expected exit 1, got %d", exit)
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected no stdout output, got %q", stdout.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "job_not_completed" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
}

func TestRunResultCommandRejectsUnsafeScheme(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	jobID := "11111111-2222-3333-4444-555555555555"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(fmt.Sprintf(`{
			"job_id":"%s",
			"status":"completed",
			"files":[
				{
					"path":"result.txt",
					"download_url":"file:///etc/shadow",
					"size_bytes":100,
					"mime_type":"text/plain"
				}
			]
		}`, jobID)))
	}))
	defer server.Close()
	t.Setenv("AGNT_API_BASE_URL", server.URL)

	outputDir := filepath.Join(t.TempDir(), "downloads")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"result", jobID, "--output", outputDir})
	if exit != 1 {
		t.Fatalf("expected exit 1, got %d", exit)
	}
	if stdout.Len() != 0 {
		t.Fatalf("expected no stdout output, got %q", stdout.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(stderr.Bytes(), &payload); err != nil {
		t.Fatalf("expected json error output, got %v", err)
	}
	if payload["error"] != "download_failed" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
}

func TestRunResultCommandEmptyOutput(t *testing.T) {
	t.Setenv("HOME", t.TempDir())
	t.Setenv("AGNT_API_BASE_URL", "http://localhost:9999")

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{
		"result",
		"11111111-2222-3333-4444-555555555555",
		"--output", "",
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
}
