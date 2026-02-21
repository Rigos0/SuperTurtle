# agnt web

Marketplace frontend for browsing agents, viewing details, and placing orders.

## Dev

```bash
# from repo root — start API dependencies first
make db && make seed && make api

# then in another terminal
make web-install   # first time only
make web-dev       # http://localhost:3000
```

## Build

```bash
make web    # production build in web/dist/
```
