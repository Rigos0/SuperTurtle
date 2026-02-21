from __future__ import annotations

import http.client
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urljoin, urlparse

from .platform import Target, binary_filename, resolve_target

DEFAULT_BASE_URL = "https://github.com/richardmladek/agentic/releases/download"
REDIRECT_CODES = {301, 302, 303, 307, 308}


def binary_path(root_dir: str | Path, target: Target) -> Path:
    return Path(root_dir) / "runtime" / binary_filename(target)


def build_binary_url(*, base_url: str = DEFAULT_BASE_URL, release_tag: str, filename: str) -> str:
    normalized_base_url = str(base_url).rstrip("/")
    return f"{normalized_base_url}/{release_tag}/{filename}"


def is_localhost(hostname: str | None) -> bool:
    return hostname in {"localhost", "127.0.0.1", "::1"}


def _validate_download_url(url_string: str) -> None:
    parsed = urlparse(url_string)
    if parsed.scheme == "https":
        return
    if parsed.scheme == "http" and is_localhost(parsed.hostname):
        return
    raise ValueError('binary URL must use "https" (or "http" for localhost only)')


def _request(url_string: str) -> tuple[http.client.HTTPConnection, http.client.HTTPResponse]:
    parsed = urlparse(url_string)
    _validate_download_url(url_string)

    connection_class: type[http.client.HTTPConnection]
    if parsed.scheme == "https":
        connection_class = http.client.HTTPSConnection
    else:
        connection_class = http.client.HTTPConnection

    connection = connection_class(parsed.hostname, parsed.port, timeout=30)
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"
    connection.request("GET", path)
    response = connection.getresponse()
    return connection, response


def download_to_file(url_string: str, destination_path: str | Path, redirects_left: int = 5) -> None:
    if redirects_left < 0:
        raise RuntimeError("too many redirects while downloading agnt binary")

    destination = Path(destination_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_file: Path | None = None

    try:
        connection, response = _request(url_string)
        try:
            if response.status in REDIRECT_CODES:
                redirected_url = response.getheader("Location")
                if not redirected_url:
                    raise RuntimeError("redirect response missing location header")
                download_to_file(urljoin(url_string, redirected_url), destination, redirects_left - 1)
                return

            if response.status != 200:
                raise RuntimeError(f"failed to download agnt binary: HTTP {response.status}")

            with NamedTemporaryFile(mode="wb", delete=False, dir=destination.parent) as handle:
                temp_file = Path(handle.name)
                shutil.copyfileobj(response, handle)
        finally:
            response.close()
            connection.close()
    except Exception:
        if temp_file is not None:
            temp_file.unlink(missing_ok=True)
        destination.unlink(missing_ok=True)
        raise

    if temp_file is None:
        raise RuntimeError("failed to download agnt binary")
    temp_file.replace(destination)


def install_binary(
    *,
    root_dir: str | Path,
    version: str | None = None,
    base_url: str = DEFAULT_BASE_URL,
    release_tag: str | None = None,
    binary_url: str | None = None,
    source_path: str | Path | None = None,
    platform_name: str | None = None,
    arch: str | None = None,
) -> Path:
    target = resolve_target(platform_name, arch)
    destination = binary_path(root_dir, target)
    destination.parent.mkdir(parents=True, exist_ok=True)

    if source_path:
        shutil.copyfile(source_path, destination)
    else:
        tag = release_tag or (f"v{version}" if version else None)
        if not binary_url and not tag:
            raise ValueError("release_tag, version, or binary_url is required")

        url = binary_url or build_binary_url(
            base_url=base_url,
            release_tag=tag,
            filename=binary_filename(target),
        )
        download_to_file(url, destination)

    if target.os != "windows":
        destination.chmod(0o755)

    return destination
