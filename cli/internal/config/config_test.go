package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDefaultsWhenConfigMissing(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	cfg, err := Load("")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.APIBaseURL != "http://localhost:8000" {
		t.Fatalf("unexpected api base url: %s", cfg.APIBaseURL)
	}
	if cfg.RequestTimeoutSeconds != 30 {
		t.Fatalf("unexpected timeout: %d", cfg.RequestTimeoutSeconds)
	}
	if cfg.OutputFormat != "json" {
		t.Fatalf("unexpected output format: %s", cfg.OutputFormat)
	}
}

func TestLoadFromExplicitConfigFile(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "agnt.yaml")
	if err := os.WriteFile(
		configPath,
		[]byte("api_base_url: http://localhost:9999\nrequest_timeout_seconds: 5\nauth_token: test-token\n"),
		0o644,
	); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.APIBaseURL != "http://localhost:9999" {
		t.Fatalf("unexpected api base url: %s", cfg.APIBaseURL)
	}
	if cfg.RequestTimeoutSeconds != 5 {
		t.Fatalf("unexpected timeout: %d", cfg.RequestTimeoutSeconds)
	}
	if cfg.AuthToken != "test-token" {
		t.Fatalf("unexpected auth token: %s", cfg.AuthToken)
	}
}

func TestEnvironmentOverridesFileConfig(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "agnt.yaml")
	if err := os.WriteFile(
		configPath,
		[]byte("api_base_url: http://localhost:9999\nrequest_timeout_seconds: 5\n"),
		0o644,
	); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	t.Setenv("AGNT_API_BASE_URL", "http://localhost:8000")
	t.Setenv("AGNT_REQUEST_TIMEOUT_SECONDS", "42")

	cfg, err := Load(configPath)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.APIBaseURL != "http://localhost:8000" {
		t.Fatalf("expected env override, got %s", cfg.APIBaseURL)
	}
	if cfg.RequestTimeoutSeconds != 42 {
		t.Fatalf("expected env override, got %d", cfg.RequestTimeoutSeconds)
	}
}

func TestLoadErrorsOnMissingExplicitConfig(t *testing.T) {
	_, err := Load(filepath.Join(t.TempDir(), "missing.yaml"))
	if err == nil {
		t.Fatalf("expected error for missing explicit config")
	}
}

func TestLoadErrorsOnNonJSONOutputFormat(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "agnt.yaml")
	if err := os.WriteFile(
		configPath,
		[]byte("output_format: yaml\n"),
		0o644,
	); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	_, err := Load(configPath)
	if err == nil {
		t.Fatalf("expected error for non-json output_format")
	}
}
