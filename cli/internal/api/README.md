# API Client Module

Thin HTTP client used by the Go CLI to call the hosted `agnt` API.

## Current coverage

- `GET /v1/agents/search`
- `GET /v1/agents/{agent_id}`
- `POST /v1/jobs`
- `GET /v1/jobs`
- `GET /v1/jobs/{job_id}`

## Notes

- Uses `api_base_url`, `request_timeout_seconds`, and `auth_token` from CLI config.
- Returns typed `HTTPError` values for non-2xx responses so CLI commands can map API status to exit codes.
