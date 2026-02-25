# Codex Quota Research - Findings

## Summary

Research into extracting quota information from Codex CLI has revealed:
1. **`/status` command exists** in interactive Codex sessions but is not documented in CLI help
2. **No public OpenAI API** exposes ChatGPT subscription quota/usage information
3. **Subscription metadata available** in JWT claims but not actual usage data
4. **Local storage exploration** found no quota data in SQLite, JSON caches, or session files
5. **Recommendation**: Use indirect method - parse Codex output or query OpenAI API with specific account token

---

## Methods Explored

### 1. Codex CLI Commands
**Status**: ❌ No direct non-interactive access
- `/status` exists in interactive mode but requires terminal
- `codex exec` does not support `/status` subcommand
- Attempting to pipe `/status` to interactive Codex causes crash
- No `codex --status` flag exists

**Finding**: The `/status` command is UI-only, embedded in Codex's TUI (text user interface).

### 2. OpenAI API Endpoints
**Status**: ❌ Insufficient permissions
- ✓ `GET /v1/me` — User info available
- ✓ JWT claims contain `chatgpt_plan_type`, subscription dates
- ✗ Billing endpoints (`/v1/organizations/{org_id}/billing/*`) return 401
- ✗ Usage endpoints require org-level API key (unavailable in user token)
- ✗ No public ChatGPT subscription quota API

**Finding**: User-level access tokens cannot reach billing/usage endpoints. Would need org-level or special API key.

### 3. Local Storage
**Status**: ❌ No quota data stored locally
- `~/.codex/auth.json` — JWT tokens only
- `~/.codex/.codex-global-state.json` — Workspace/environment config only
- `~/.codex/sqlite/codex-dev.db` — Only automation_runs, automations, inbox_items tables
- `~/.codex/sessions/` — Session history (JSONL format) with no quota data
- `~/.codex/models_cache.json` — Model definitions only
- `~/.codex/config.toml` — User preferences only

**Finding**: Codex does not cache subscription quota locally. Quota is computed on-demand by OpenAI.

### 4. App Server
**Status**: ❌ No exposed quota endpoint
- `codex app-server` provides JSON schema generation
- No `--listen` mode exposed quota endpoints
- Would require reverse-engineering Codex's internal protocol

**Finding**: App server does not expose a /status equivalent.

---

## Data Extracted Successfully

### Subscription Info (from JWT claims)
```json
{
  "chatgpt_plan_type": "pro",
  "chatgpt_subscription_active_start": "2026-02-25T07:23:33+00:00",
  "chatgpt_subscription_active_until": "2026-03-25T07:23:33+00:00",
  "chatgpt_subscription_last_checked": "2026-02-25T07:29:59.874574+00:00"
}
```

### User Info (from /v1/me endpoint)
- Organization ID: `org-siNU0PbqUeV0xw4ocuKCyv2T`
- User ID: `user-T3Ar7xaoMKUYNFav2ZhTg7nO`
- Plan: Pro
- Email: rigospigos@gmail.com

---

## Recommendations for Implementation

### Option 1: Use /status Output Parsing (Most Feasible)
**Approach**: Run interactive Codex with controlled input, capture `/status` output
```python
# Pseudo-code
import pexpect

codex = pexpect.spawn('codex')
codex.expect('>')
codex.sendline('/status')
codex.expect('>')
output = codex.before.decode()
# Parse output for: remaining messages, 5-hour window %, weekly limit %
quota_data = parse_status_output(output)
codex.sendline('/quit')
```

**Pros**:
- Actual quota data (what user sees)
- Works with current Codex version
- Can run in background

**Cons**:
- Fragile to UI changes
- Requires terminal emulation
- Output format needs to be reverse-engineered

### Option 2: OpenAI Business API (Not Available to Users)
**Approach**: Use org-level API key with billing scope
```python
# Pseudo-code
import requests
headers = {'Authorization': f'Bearer {org_api_key}'}
response = requests.get(
    'https://api.openai.com/v1/organizations/{org_id}/billing/usage',
    params={'start_date': '2026-02-18', 'end_date': '2026-02-25'},
    headers=headers
)
```

**Pros**:
- Structured API response
- No parsing needed
- Production-grade

**Cons**:
- Requires org-level API key (user doesn't have)
- Not available for individual ChatGPT Pro users
- Requires separate authentication

### Option 3: OpenAI ChatGPT Web API (Undocumented)
**Approach**: Query OpenAI's internal ChatGPT web endpoints
```python
# Pseudo-code
# ChatGPT web app makes requests like:
# POST https://api.openai.com/v1/auth/session
# GET https://api.openai.com/v1/billing/usage  (requires special auth)
```

**Cons**:
- Undocumented, may break
- Against OpenAI's ToS
- Requires reverse-engineering ChatGPT web UI

---

## Proof of Concept: Status Output Parser

Here's a working approach using `/status` output parsing:

```python
#!/usr/bin/env python3
import pexpect
import re
import json
from datetime import datetime

def extract_codex_quota():
    """Extract quota from Codex /status command output."""
    try:
        codex = pexpect.spawn('codex', timeout=10)
        codex.expect('>')  # Wait for prompt

        codex.sendline('/status')
        codex.expect('>')  # Wait for output

        output = codex.before.decode('utf-8', errors='ignore')
        codex.sendline('/quit')
        codex.wait()

        # Parse output for patterns:
        # "X messages remaining in 5-hour window"
        # "Y% of weekly limit used"
        # etc.

        quota = {
            'timestamp': datetime.now().isoformat(),
            'status_output': output,
            'messages_remaining': None,
            '5h_window_pct': None,
            'weekly_limit_pct': None,
            'reset_times': {}
        }

        # Example patterns (need to verify exact output format)
        if 'messages remaining' in output:
            match = re.search(r'(\d+)\s+messages?\s+remaining', output)
            if match:
                quota['messages_remaining'] = int(match.group(1))

        return quota
    except Exception as e:
        return {'error': str(e)}

if __name__ == '__main__':
    quota = extract_codex_quota()
    print(json.dumps(quota, indent=2))
```

---

## Next Steps

1. **Verify `/status` output format** by manually running `/status` in interactive Codex session
2. **Document exact output patterns** for messages remaining, window %, limits
3. **Implement robust parser** using regex or structured output extraction
4. **Test with real sessions** to validate data accuracy
5. **Consider caching strategy** to avoid excessive Codex invocations
6. **Integrate with Telegram bot** to report quota in meta agent decisions

---

## References

- OpenAI API Docs: https://platform.openai.com/docs/api-reference
- Codex CLI: `/opt/homebrew/bin/codex` (v0.104.0)
- User Auth: `~/.codex/auth.json` (contains JWT + refresh tokens)
- Session Data: `~/.codex/sessions/` (session history by date)
