from __future__ import annotations

import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

from agnt_cli.install import build_binary_url, install_binary


def test_build_binary_url_normalizes_trailing_slashes() -> None:
    assert (
        build_binary_url(
            base_url="https://example.com/releases/download/",
            release_tag="v0.1.0",
            filename="agnt-linux-amd64",
        )
        == "https://example.com/releases/download/v0.1.0/agnt-linux-amd64"
    )


def test_install_binary_copies_local_binary(tmp_path: Path) -> None:
    source_path = tmp_path / "source-agnt"
    source_payload = b"#!/bin/sh\necho agnt\n"
    source_path.write_bytes(source_payload)

    destination_path = install_binary(
        root_dir=tmp_path,
        source_path=source_path,
        platform_name="linux",
        arch="x64",
    )

    assert destination_path == tmp_path / "runtime" / "agnt-linux-amd64"
    assert destination_path.read_bytes() == source_payload
    if os.name != "nt":
        assert destination_path.stat().st_mode & 0o100


def test_install_binary_downloads_from_localhost_http(tmp_path: Path) -> None:
    payload = b"agnt-binary-data"

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            if self.path != "/agnt-linux-amd64":
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, _format: str, *_args: object) -> None:
            return

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        port = server.server_address[1]
        destination_path = install_binary(
            root_dir=tmp_path,
            platform_name="linux",
            arch="x64",
            binary_url=f"http://127.0.0.1:{port}/agnt-linux-amd64",
        )
        assert destination_path.read_bytes() == payload
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def test_install_binary_rejects_non_localhost_http_url(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="https"):
        install_binary(
            root_dir=tmp_path,
            platform_name="linux",
            arch="x64",
            binary_url="http://example.com/agnt-linux-amd64",
        )
