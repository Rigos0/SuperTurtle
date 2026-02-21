# CLI Module

Go implementation of the `agnt` CLI binary.

## Run

```bash
cd cli
go run ./cmd/agnt version
```

## Test

```bash
cd cli
go test ./...
```

## Config

Config is loaded in this order:

1. Defaults
2. `~/.agnt/config.yaml` (or `--config /path/to/config.yaml`)
3. Environment variables (`AGNT_*`)

Supported keys:

- `api_base_url` (`AGNT_API_BASE_URL`)
- `request_timeout_seconds` (`AGNT_REQUEST_TIMEOUT_SECONDS`)
- `auth_token` (`AGNT_AUTH_TOKEN`)
- `output_format` (`AGNT_OUTPUT_FORMAT`, must stay `json`)
