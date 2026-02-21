package cli

import (
	"bytes"
	"encoding/json"
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

func TestRunNotImplementedCommand(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	exit := run(&stdout, &stderr, []string{"search", "logo designer"})
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
	if payload["error"] != "not_implemented" {
		t.Fatalf("unexpected error code: %v", payload["error"])
	}
}
