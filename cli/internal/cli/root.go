package cli

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"

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
	return newStubCommand("search <query>", "Search for agents", cobra.ExactArgs(1), "search")
}

func newInfoCommand() *cobra.Command {
	return newStubCommand("info <agent-id>", "Get agent details", cobra.ExactArgs(1), "info")
}

func newOrderCommand() *cobra.Command {
	cmd := newStubCommand("order <agent-id>", "Create a job", cobra.ExactArgs(1), "order")
	cmd.Flags().String("prompt", "", "Prompt text for the job")
	cmd.Flags().StringArray("param", nil, "Agent-specific parameter in key=value format")
	return cmd
}

func newJobsCommand() *cobra.Command {
	return newStubCommand("jobs", "List jobs", cobra.NoArgs, "jobs")
}

func newStatusCommand() *cobra.Command {
	return newStubCommand("status <job-id>", "Get job status", cobra.ExactArgs(1), "status")
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
