# pip Distribution Module

Python wrapper package that lazily installs the compiled `agnt` Go binary on first run and exposes it as a `pip` console script.

## Run

```bash
cd pip
python -m pytest
```

## Install behavior

`agnt` resolves the current platform and checks `pip/agnt_cli/runtime/`. If no binary is present, it downloads (or copies) one before executing it.

Optional environment variables:

- `AGNT_SKIP_DOWNLOAD=1` skip binary download
- `AGNT_BINARY_URL=<url>` use a full binary URL
- `AGNT_BINARY_BASE_URL=<url>` override release base URL
- `AGNT_BINARY_RELEASE_TAG=<tag>` override release tag
- `AGNT_BINARY_PATH=/path/to/agnt` copy local binary instead of downloading
