package cli

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/richardmladek/agentic/cli/internal/api"
	"github.com/richardmladek/agentic/cli/internal/config"
	"github.com/spf13/cobra"
)

type contextKey string

const configContextKey contextKey = "agnt_config"

var Version = "dev"

type CLIError struct {
	Code     string
	Message  string
	ExitCode int
}

func (e *CLIError) Error() string {
	return e.Message
}

func Run() int {
	return run(os.Stdout, os.Stderr, os.Args[1:])
}

func run(stdout io.Writer, stderr io.Writer, args []string) int {
	rootCmd := NewRootCommand(stdout, stderr)
	rootCmd.SetArgs(args)

	if err := rootCmd.Execute(); err != nil {
		writeErrorJSON(stderr, err)
		return exitCode(err)
	}

	return 0
}

func NewRootCommand(stdout io.Writer, stderr io.Writer) *cobra.Command {
	r := &runner{}

	rootCmd := &cobra.Command{
		Use:           "agnt",
		Short:         "agnt marketplace CLI",
		SilenceErrors: true,
		SilenceUsage:  true,
		PersistentPreRunE: func(cmd *cobra.Command, _ []string) error {
			cfg, err := config.Load(r.configPath)
			if err != nil {
				return &CLIError{
					Code:     "config_error",
					Message:  err.Error(),
					ExitCode: 4,
				}
			}

			cmd.SetContext(context.WithValue(cmd.Context(), configContextKey, cfg))
			return nil
		},
		RunE: func(cmd *cobra.Command, _ []string) error {
			return writeJSON(cmd.OutOrStdout(), map[string]any{
				"name":    "agnt",
				"message": "CLI scaffold initialized",
			})
		},
	}

	rootCmd.SetOut(stdout)
	rootCmd.SetErr(stderr)
	rootCmd.PersistentFlags().StringVar(
		&r.configPath,
		"config",
		"",
		"Path to config file (default: $HOME/.agnt/config.yaml)",
	)

	rootCmd.AddCommand(newVersionCommand())
	rootCmd.AddCommand(newSearchCommand())
	rootCmd.AddCommand(newInfoCommand())
	rootCmd.AddCommand(newStatsCommand())
	rootCmd.AddCommand(newOrderCommand())
	rootCmd.AddCommand(newJobsCommand())
	rootCmd.AddCommand(newStatusCommand())
	rootCmd.AddCommand(newResultCommand())

	return rootCmd
}

func ConfigFromContext(ctx context.Context) (config.Config, error) {
	raw := ctx.Value(configContextKey)
	cfg, ok := raw.(config.Config)
	if !ok {
		return config.Config{}, errors.New("config not found in command context")
	}
	return cfg, nil
}

type runner struct {
	configPath string
}

func newVersionCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print CLI version",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return writeJSON(cmd.OutOrStdout(), map[string]any{
				"name":    "agnt",
				"version": Version,
			})
		},
	}
}

func newSearchCommand() *cobra.Command {
	var tag string
	var limit int
	var offset int

	cmd := &cobra.Command{
		Use:   "search <query>",
		Short: "Search for agents",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if limit < 1 || limit > 100 {
				return &CLIError{
					Code:     "validation_error",
					Message:  "limit must be between 1 and 100",
					ExitCode: 4,
				}
			}
			if offset < 0 {
				return &CLIError{
					Code:     "validation_error",
					Message:  "offset must be non-negative",
					ExitCode: 4,
				}
			}

			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.SearchAgents(cmd.Context(), args[0], api.SearchAgentsOptions{
				Tag:    tag,
				Limit:  limit,
				Offset: offset,
			})
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}

	cmd.Flags().StringVar(&tag, "tag", "", "Filter by exact tag")
	cmd.Flags().IntVar(&limit, "limit", 20, "Results per page (1-100)")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")

	return cmd
}

func newInfoCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "info <agent-id>",
		Short: "Get agent details",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.GetAgent(cmd.Context(), args[0])
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}
}

func newStatsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "stats <agent-id>",
		Short: "Get agent statistics",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.GetAgentStats(cmd.Context(), args[0])
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}
}

func newOrderCommand() *cobra.Command {
	var prompt string
	var rawParams []string

	cmd := &cobra.Command{
		Use:   "order <agent-id>",
		Short: "Create a job",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if strings.TrimSpace(prompt) == "" {
				return &CLIError{
					Code:     "validation_error",
					Message:  "prompt must not be empty",
					ExitCode: 4,
				}
			}

			params, err := parseParamFlags(rawParams)
			if err != nil {
				return &CLIError{
					Code:     "validation_error",
					Message:  err.Error(),
					ExitCode: 4,
				}
			}

			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.CreateJob(cmd.Context(), args[0], prompt, params)
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}
	cmd.Flags().StringVar(&prompt, "prompt", "", "Prompt text for the job")
	cmd.Flags().StringArrayVar(&rawParams, "param", nil, "Agent-specific parameter in key=value format")
	return cmd
}

func parseParamFlags(rawParams []string) (map[string]any, error) {
	params := make(map[string]any, len(rawParams))
	for _, raw := range rawParams {
		key, value, ok := strings.Cut(raw, "=")
		if !ok || strings.TrimSpace(key) == "" {
			return nil, fmt.Errorf("invalid --param value %q: expected key=value", raw)
		}
		params[key] = value
	}
	return params, nil
}

func isValidJobStatus(status string) bool {
	switch status {
	case "pending", "accepted", "rejected", "running", "completed", "failed":
		return true
	default:
		return false
	}
}

func newJobsCommand() *cobra.Command {
	var agentID string
	var status string
	var limit int
	var offset int

	cmd := &cobra.Command{
		Use:   "jobs",
		Short: "List jobs",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			if status != "" && !isValidJobStatus(status) {
				return &CLIError{
					Code:     "validation_error",
					Message:  "status must be one of: pending, accepted, rejected, running, completed, failed",
					ExitCode: 4,
				}
			}
			if limit < 1 || limit > 100 {
				return &CLIError{
					Code:     "validation_error",
					Message:  "limit must be between 1 and 100",
					ExitCode: 4,
				}
			}
			if offset < 0 {
				return &CLIError{
					Code:     "validation_error",
					Message:  "offset must be non-negative",
					ExitCode: 4,
				}
			}

			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.ListJobs(cmd.Context(), api.ListJobsOptions{
				AgentID: agentID,
				Status:  status,
				Limit:   limit,
				Offset:  offset,
			})
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}

	cmd.Flags().StringVar(&agentID, "agent-id", "", "Filter by agent ID")
	cmd.Flags().StringVar(&status, "status", "", "Filter by status")
	cmd.Flags().IntVar(&limit, "limit", 20, "Results per page (1-100)")
	cmd.Flags().IntVar(&offset, "offset", 0, "Pagination offset")

	return cmd
}

func newStatusCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "status <job-id>",
		Short: "Get job status",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.GetJob(cmd.Context(), args[0])
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}
}

func newResultCommand() *cobra.Command {
	var outputDir string

	cmd := &cobra.Command{
		Use:   "result <job-id>",
		Short: "Download job result files",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if strings.TrimSpace(outputDir) == "" {
				return &CLIError{
					Code:     "validation_error",
					Message:  "output must not be empty",
					ExitCode: 4,
				}
			}

			client, err := apiClientFromContext(cmd.Context())
			if err != nil {
				return err
			}

			resp, err := client.GetJobResult(cmd.Context(), args[0])
			if err != nil {
				return toCLIError(err)
			}

			if resp.Status != "completed" {
				return &CLIError{
					Code:     "job_not_completed",
					Message:  fmt.Sprintf("job status is %q, must be completed to download results", resp.Status),
					ExitCode: 1,
				}
			}

			downloadClient := &http.Client{
				Timeout: 10 * time.Minute,
			}

			files := make([]resultOutputFile, 0, len(resp.Files))
			for _, file := range resp.Files {
				destination, err := resultDestinationPath(outputDir, file.Path)
				if err != nil {
					return &CLIError{
						Code:     "invalid_job_result_manifest",
						Message:  fmt.Sprintf("invalid result file path %q: %v", file.Path, err),
						ExitCode: 1,
					}
				}
				if err := downloadFile(cmd.Context(), downloadClient, file.DownloadURL, destination); err != nil {
					return &CLIError{
						Code:     "download_failed",
						Message:  fmt.Sprintf("download %q failed: %v", file.Path, err),
						ExitCode: 1,
					}
				}
				files = append(files, resultOutputFile{
					Path:      destination,
					SizeBytes: file.SizeBytes,
					MimeType:  file.MimeType,
				})
			}

			return writeJSON(cmd.OutOrStdout(), resultOutput{
				JobID:  resp.JobID,
				Status: resp.Status,
				Files:  files,
			})
		},
	}

	cmd.Flags().StringVar(&outputDir, "output", ".", "Output directory for downloaded files")
	return cmd
}

type resultOutput struct {
	JobID  string             `json:"job_id"`
	Status string             `json:"status"`
	Files  []resultOutputFile `json:"files"`
}

type resultOutputFile struct {
	Path      string  `json:"path"`
	SizeBytes *int    `json:"size_bytes"`
	MimeType  *string `json:"mime_type"`
}

func resultDestinationPath(outputDir string, resultPath string) (string, error) {
	cleanResultPath := filepath.Clean(resultPath)
	if cleanResultPath == "." || cleanResultPath == string(filepath.Separator) {
		return "", errors.New("path must not be empty")
	}
	if filepath.IsAbs(cleanResultPath) {
		return "", errors.New("path must be relative")
	}

	absOutput, err := filepath.Abs(outputDir)
	if err != nil {
		return "", fmt.Errorf("resolve output directory: %w", err)
	}
	joined := filepath.Join(absOutput, cleanResultPath)
	if !strings.HasPrefix(joined, absOutput+string(filepath.Separator)) {
		return "", errors.New("path must not escape output directory")
	}

	return filepath.Join(outputDir, cleanResultPath), nil
}

const maxDownloadBytes = 1 << 30 // 1 GiB

func downloadFile(ctx context.Context, httpClient *http.Client, downloadURL string, destination string) error {
	if strings.TrimSpace(downloadURL) == "" {
		return errors.New("download_url must not be empty")
	}

	parsed, err := url.Parse(downloadURL)
	if err != nil {
		return fmt.Errorf("parse download url: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("unsupported download url scheme %q", parsed.Scheme)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return fmt.Errorf("create destination directory: %w", err)
	}

	file, err := os.Create(destination)
	if err != nil {
		return fmt.Errorf("create destination file: %w", err)
	}

	if _, err := io.Copy(file, io.LimitReader(resp.Body, maxDownloadBytes)); err != nil {
		_ = file.Close()
		return fmt.Errorf("write destination file: %w", err)
	}
	if err := file.Close(); err != nil {
		return fmt.Errorf("close destination file: %w", err)
	}

	return nil
}

func exitCode(err error) int {
	var cliErr *CLIError
	if errors.As(err, &cliErr) {
		return cliErr.ExitCode
	}
	return 1
}

func writeErrorJSON(w io.Writer, err error) {
	code := "internal_error"
	message := err.Error()

	var cliErr *CLIError
	if errors.As(err, &cliErr) {
		code = cliErr.Code
		message = cliErr.Message
	}

	_ = writeJSON(w, map[string]string{
		"error":   code,
		"message": message,
	})
}

func writeJSON(w io.Writer, payload any) error {
	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)
	return encoder.Encode(payload)
}

func apiClientFromContext(ctx context.Context) (*api.Client, error) {
	cfg, err := ConfigFromContext(ctx)
	if err != nil {
		return nil, &CLIError{
			Code:     "internal_error",
			Message:  err.Error(),
			ExitCode: 1,
		}
	}

	client, err := api.NewClient(
		cfg.APIBaseURL,
		time.Duration(cfg.RequestTimeoutSeconds)*time.Second,
		cfg.AuthToken,
	)
	if err != nil {
		return nil, &CLIError{
			Code:     "config_error",
			Message:  err.Error(),
			ExitCode: 4,
		}
	}

	return client, nil
}

func toCLIError(err error) error {
	var httpErr *api.HTTPError
	if errors.As(err, &httpErr) {
		exit := 1
		switch httpErr.StatusCode {
		case 400, 422:
			exit = 4
		case 401, 403:
			exit = 2
		case 404:
			exit = 3
		}

		code := httpErr.Code
		if code == "" {
			code = "api_error"
		}

		return &CLIError{
			Code:     code,
			Message:  httpErr.Message,
			ExitCode: exit,
		}
	}

	return &CLIError{
		Code:     "api_error",
		Message:  err.Error(),
		ExitCode: 1,
	}
}
