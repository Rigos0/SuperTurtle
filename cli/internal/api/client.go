package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

const (
	agentsSearchPath = "/v1/agents/search"
	agentsInfoPath   = "/v1/agents"
)

type HTTPDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

type Client struct {
	baseURL    *url.URL
	authToken  string
	httpClient HTTPDoer
}

type SearchAgentsOptions struct {
	Tag    string
	Limit  int
	Offset int
}

type SearchAgentsResponse struct {
	Agents []AgentSummary `json:"agents"`
	Total  int            `json:"total"`
}

type AgentSummary struct {
	AgentID     string         `json:"agent_id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Tags        []string       `json:"tags"`
	Pricing     map[string]any `json:"pricing"`
	CreatedAt   time.Time      `json:"created_at"`
}

type AgentDetailResponse struct {
	AgentID     string         `json:"agent_id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Tags        []string       `json:"tags"`
	Pricing     map[string]any `json:"pricing"`
	InputSchema  map[string]any `json:"input_schema"`
	OutputSchema map[string]any `json:"output_schema"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

type HTTPError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *HTTPError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	if e.Code != "" {
		return e.Code
	}
	return fmt.Sprintf("http status %d", e.StatusCode)
}

type errorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
	Detail  any    `json:"detail"`
}

func NewClient(baseURL string, timeout time.Duration, authToken string) (*Client, error) {
	return NewClientWithHTTPClient(baseURL, timeout, authToken, &http.Client{Timeout: timeout})
}

func NewClientWithHTTPClient(baseURL string, timeout time.Duration, authToken string, httpClient HTTPDoer) (*Client, error) {
	if strings.TrimSpace(baseURL) == "" {
		return nil, fmt.Errorf("api base url must not be empty")
	}
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return nil, fmt.Errorf("parse api base url: %w", err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return nil, fmt.Errorf("api base url must include scheme and host")
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: timeout}
	}

	return &Client{
		baseURL:    parsed,
		authToken:  authToken,
		httpClient: httpClient,
	}, nil
}

func (c *Client) SearchAgents(ctx context.Context, query string, opts SearchAgentsOptions) (SearchAgentsResponse, error) {
	params := url.Values{}
	params.Set("q", query)
	if opts.Tag != "" {
		params.Set("tag", opts.Tag)
	}
	if opts.Limit > 0 {
		params.Set("limit", strconv.Itoa(opts.Limit))
	}
	if opts.Offset > 0 {
		params.Set("offset", strconv.Itoa(opts.Offset))
	}

	var resp SearchAgentsResponse
	if err := c.getJSON(ctx, agentsSearchPath, params, &resp); err != nil {
		return SearchAgentsResponse{}, err
	}

	return resp, nil
}

func (c *Client) GetAgent(ctx context.Context, agentID string) (AgentDetailResponse, error) {
	if !uuidPattern.MatchString(agentID) {
		return AgentDetailResponse{}, fmt.Errorf("invalid agent id: must be a valid UUID")
	}

	var resp AgentDetailResponse
	if err := c.getJSON(ctx, agentsInfoPath+"/"+agentID, nil, &resp); err != nil {
		return AgentDetailResponse{}, err
	}

	return resp, nil
}

func (c *Client) getJSON(ctx context.Context, endpointPath string, query url.Values, dst any) error {
	endpoint := *c.baseURL
	endpoint.Path = strings.TrimRight(c.baseURL.Path, "/") + "/" + strings.TrimLeft(endpointPath, "/")
	if query != nil {
		endpoint.RawQuery = query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return fmt.Errorf("build request: %w", err)
	}
	if c.authToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.authToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return decodeHTTPError(resp)
	}

	if err := json.NewDecoder(resp.Body).Decode(dst); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	return nil
}

const maxErrorBodyBytes = 1 << 20 // 1 MiB

func decodeHTTPError(resp *http.Response) error {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, maxErrorBodyBytes))

	apiErr := errorResponse{}
	if len(body) > 0 {
		_ = json.Unmarshal(body, &apiErr)
	}

	message := strings.TrimSpace(apiErr.Message)
	if message == "" && apiErr.Detail != nil {
		if detailBytes, err := json.Marshal(apiErr.Detail); err == nil {
			message = string(detailBytes)
		}
	}
	if message == "" {
		message = fmt.Sprintf("request failed with status %d", resp.StatusCode)
	}

	return &HTTPError{
		StatusCode: resp.StatusCode,
		Code:       strings.TrimSpace(apiErr.Error),
		Message:    message,
	}
}
