package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

const (
	defaultAPIBaseURL         = "http://localhost:8000"
	defaultRequestTimeoutSecs = 30
	defaultOutputFormat       = "json"
)

type Config struct {
	APIBaseURL            string `mapstructure:"api_base_url"`
	RequestTimeoutSeconds int    `mapstructure:"request_timeout_seconds"`
	AuthToken             string `mapstructure:"auth_token"`
	OutputFormat          string `mapstructure:"output_format"`
}

func DefaultPath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home directory: %w", err)
	}

	return filepath.Join(homeDir, ".agnt", "config.yaml"), nil
}

func Load(configPath string) (Config, error) {
	v := viper.New()
	v.SetConfigType("yaml")
	v.SetEnvPrefix("AGNT")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	v.SetDefault("api_base_url", defaultAPIBaseURL)
	v.SetDefault("request_timeout_seconds", defaultRequestTimeoutSecs)
	v.SetDefault("output_format", defaultOutputFormat)

	path, explicit, err := resolveConfigPath(configPath)
	if err != nil {
		return Config{}, err
	}

	v.SetConfigFile(path)
	if err := v.ReadInConfig(); err != nil {
		if explicit || !isConfigMissingError(err) {
			return Config{}, fmt.Errorf("read config file %q: %w", path, err)
		}
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return Config{}, fmt.Errorf("decode config: %w", err)
	}

	if cfg.RequestTimeoutSeconds <= 0 {
		return Config{}, errors.New("request_timeout_seconds must be greater than 0")
	}

	if strings.ToLower(cfg.OutputFormat) != defaultOutputFormat {
		return Config{}, errors.New("output_format must be json")
	}
	cfg.OutputFormat = defaultOutputFormat

	return cfg, nil
}

func resolveConfigPath(configPath string) (string, bool, error) {
	if strings.TrimSpace(configPath) != "" {
		return configPath, true, nil
	}

	defaultPath, err := DefaultPath()
	if err != nil {
		return "", false, err
	}
	return defaultPath, false, nil
}

func isConfigMissingError(err error) bool {
	var notFound viper.ConfigFileNotFoundError
	if errors.As(err, &notFound) {
		return true
	}

	var pathErr *os.PathError
	if errors.As(err, &pathErr) {
		return true
	}

	return false
}
