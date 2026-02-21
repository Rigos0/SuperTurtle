# npm Distribution Module

JavaScript wrapper package that installs the compiled `agnt` Go binary and exposes `agnt` via npm `bin`.

## Run

```bash
cd npm
npm test
```

## Install behavior

`postinstall` downloads a platform-specific binary into `npm/runtime/` and `bin/agnt.js` forwards CLI args to it.

Optional environment variables:

- `AGNT_SKIP_DOWNLOAD=1` skip binary download
- `AGNT_BINARY_URL=<url>` use a full binary URL
- `AGNT_BINARY_BASE_URL=<url>` override release base URL
- `AGNT_BINARY_RELEASE_TAG=<tag>` override release tag
- `AGNT_BINARY_PATH=/path/to/agnt` copy local binary instead of downloading
