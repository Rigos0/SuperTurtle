from agnt_cli.platform import Target, binary_filename, resolve_target


def test_resolve_target_maps_supported_os_arch() -> None:
    assert resolve_target("darwin", "arm64") == Target(os="darwin", arch="arm64")
    assert resolve_target("linux", "x64") == Target(os="linux", arch="amd64")
    assert resolve_target("win32", "x86_64") == Target(os="windows", arch="amd64")


def test_resolve_target_rejects_unsupported_platform_and_architecture() -> None:
    try:
        resolve_target("freebsd", "x64")
        raise AssertionError("expected ValueError for unsupported platform")
    except ValueError as error:
        assert 'unsupported platform "freebsd"' in str(error)

    try:
        resolve_target("linux", "ia32")
        raise AssertionError("expected ValueError for unsupported architecture")
    except ValueError as error:
        assert 'unsupported architecture "ia32"' in str(error)


def test_binary_filename_adds_exe_for_windows() -> None:
    assert binary_filename(Target(os="windows", arch="amd64")) == "agnt-windows-amd64.exe"
    assert binary_filename(Target(os="linux", arch="arm64")) == "agnt-linux-arm64"
