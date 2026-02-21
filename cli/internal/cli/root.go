package cli

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
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
				Status: status,
				Limit:  limit,
				Offset: offset,
			})
			if err != nil {
				return toCLIError(err)
			}

			return writeJSON(cmd.OutOrStdout(), resp)
		},
	}

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
	cmd := newStubCommand("result <job-id>", "Download job result files", cobra.ExactArgs(1), "result")
	cmd.Flags().String("output", ".", "Output directory for downloaded files")
	return cmd
}

func newStubCommand(
	use string,
	short string,
	args cobra.PositionalArgs,
	commandName string,
) *cobra.Command {
	return &cobra.Command{
		Use:   use,
		Short: short,
		Args:  args,
		RunE: func(_ *cobra.Command, _ []string) error {
			return &CLIError{
				Code:     "not_implemented",
				Message:  fmt.Sprintf("%s command is not implemented yet", commandName),
				ExitCode: 1,
			}
		},
	}
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
