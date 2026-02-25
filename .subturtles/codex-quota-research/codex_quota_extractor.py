#!/usr/bin/env python3
"""
Extract ChatGPT quota information from Codex CLI /status command.

Uses pexpect to spawn an interactive Codex session, runs /status,
and parses the output to extract quota metrics.
"""

import pexpect
import re
import json
import sys
from datetime import datetime
from pathlib import Path


def _strip_ansi(text):
    """
    Remove ANSI escape sequences from terminal output.

    Handles:
    - CSI sequences: ESC[...letter or ESC]...BEL/ST
    - SGR (Select Graphic Rendition): ESC[...m
    - Cursor positioning and movement
    - Other control codes
    """
    if not text:
        return text

    # Remove all ANSI escape sequences
    # This pattern handles:
    # - \x1b[?...h\x1b[?...l (mode sequences)
    # - \x1b[...m (colors/formatting)
    # - \x1b[...H (cursor positioning)
    # - \x1b[...A-Z (other cursor/navigation)
    # - \x1b]...(\x07|\x1b\\) (OSC sequences)
    text = re.sub(r'\x1b\[[^a-zA-Z]*[a-zA-Z]', '', text)  # CSI sequences
    text = re.sub(r'\x1b\].*?(?:\x07|\x1b\\)', '', text)  # OSC sequences
    text = re.sub(r'\x1b[()][0-9A-B]', '', text)  # Character set selection
    text = re.sub(r'\x07', '', text)  # BEL character
    return text


def extract_codex_quota(timeout=15, verbose=False, codex_path=None):
    """
    Extract quota from Codex /status command output.

    Args:
        timeout: Seconds to wait for Codex response (default: 15)
        verbose: Print debug output (default: False)
        codex_path: Path to Codex binary (default: /opt/homebrew/bin/codex)

    Returns:
        dict: Quota data with timestamp and parsed fields
    """
    if codex_path is None:
        codex_path = '/opt/homebrew/bin/codex'

    quota_data = {
        'timestamp': datetime.now().isoformat(),
        'status_output': '',
        'messages_remaining': None,
        'window_5h_pct': None,
        'weekly_limit_pct': None,
        'reset_times': {},
        'error': None
    }

    codex_process = None

    try:
        # Verify Codex binary exists
        if not Path(codex_path).exists():
            raise RuntimeError(f"Codex binary not found at {codex_path}")

        if verbose:
            print(f"[*] Spawning Codex process ({codex_path})...", file=sys.stderr)

        # Spawn Codex with --no-alt-screen to disable TUI alternate screen
        # This simplifies output parsing by avoiding complex terminal control sequences
        codex_process = pexpect.spawn(codex_path,
                                       args=['--no-alt-screen'],
                                       timeout=timeout,
                                       encoding='utf-8',
                                       echo=False,
                                       maxread=8192)

        # Set terminal size to avoid wrapping issues
        codex_process.setwinsize(40, 100)

        # Wait for the prompt - try different patterns
        prompt_patterns = [
            r'>',      # Standard prompt
            r'codex>',  # Verbose prompt
            r'\$',     # Shell prompt
        ]

        prompt_found = False
        for pattern in prompt_patterns:
            try:
                codex_process.expect(pattern, timeout=3)
                prompt_found = True
                if verbose:
                    print(f"[+] Found prompt pattern: {pattern}", file=sys.stderr)
                break
            except (pexpect.TIMEOUT, pexpect.EOF):
                if verbose:
                    print(f"[*] Prompt pattern not found: {pattern}", file=sys.stderr)
                continue

        if not prompt_found:
            # Try to see what output we got
            try:
                output = codex_process.read_nonblocking(timeout=1)
                if verbose:
                    print(f"[!] Unexpected output: {output[:200]}", file=sys.stderr)
            except Exception:
                pass
            raise RuntimeError("Could not find Codex prompt")

        if verbose:
            print("[+] Codex ready, sending /status command", file=sys.stderr)

        # Send status command
        codex_process.sendline('/status')

        # Capture output - wait for rendering to complete
        # The TUI renders in stages, so we need to wait and collect all output
        status_output = ''
        try:
            # Read initial response
            codex_process.expect(r'>', timeout=timeout)
            status_output = codex_process.before

            # Try to read any additional output that may still be coming
            import time
            time.sleep(0.5)  # Brief pause for TUI rendering
            try:
                additional = codex_process.read_nonblocking(timeout=0.5)
                if additional:
                    status_output += additional
            except pexpect.TIMEOUT:
                pass
            except pexpect.EOF:
                pass

        except pexpect.TIMEOUT:
            if verbose:
                print("[!] Timeout waiting for status output (may still have data)", file=sys.stderr)
            # Still capture whatever we got
            try:
                status_output = codex_process.before + codex_process.read_nonblocking()
            except Exception:
                status_output = codex_process.before
        except pexpect.EOF:
            if verbose:
                print("[*] Codex process ended", file=sys.stderr)

        # Get captured output
        quota_data['status_output'] = status_output

        if verbose:
            print(f"[+] Captured output ({len(status_output)} chars):\n{status_output[:500]}", file=sys.stderr)

        # Parse output for quota information
        _parse_status_output(status_output, quota_data)

        # Try to quit gracefully
        if codex_process.isalive():
            try:
                codex_process.sendline('/quit')
                codex_process.wait()
            except Exception:
                pass

        return quota_data

    except Exception as e:
        quota_data['error'] = str(e)
        if verbose:
            print(f"[!] Error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
        return quota_data

    finally:
        # Ensure process is terminated
        if codex_process:
            try:
                if codex_process.isalive():
                    codex_process.terminate(force=True)
            except Exception as e:
                if verbose:
                    print(f"[!] Error terminating process: {e}", file=sys.stderr)


def _parse_status_output(output, quota_data):
    """
    Parse /status output and extract quota fields.

    Looks for patterns like:
    - "X messages remaining in 5-hour window"
    - "Y% of weekly limit used" or "Z% remaining"
    - Reset times and window information
    """

    if not output:
        return

    # Strip ANSI escape sequences from TUI output
    output = _strip_ansi(output)

    # Pattern 1: Messages remaining (before "window" context)
    # Looks for: "X messages remaining" in any context
    msg_patterns = [
        r'(\d+)\s+messages?\s+remaining',
        r'remaining:\s*(\d+)',
        r'(\d+)\s+message[s]?\s+left',
    ]

    for pattern in msg_patterns:
        match = re.search(pattern, output, re.IGNORECASE)
        if match:
            quota_data['messages_remaining'] = int(match.group(1))
            break

    # Pattern 2: 5-hour window percentage
    # Looks specifically for patterns under "5-Hour Window:" section
    # Extract from context-aware sections
    window_patterns = [
        # Look within 5-hour section specifically
        r'5-?Hour\s+Window:.*?Usage:\s*(\d+)%\s+of\s+5-?hour',
        r'(?:usage|Usage):\s*(\d+)%\s+of\s+5-?hour\s+window',
        r'(\d+)%\s+of\s+5-?hour\s+window',
        r'5-?hour\s+window[^0-9]*:\s*(\d+)%',
    ]

    for pattern in window_patterns:
        match = re.search(pattern, output, re.IGNORECASE | re.DOTALL)
        if match:
            quota_data['window_5h_pct'] = int(match.group(1))
            break

    # Pattern 3: Weekly limit percentage
    # Looks for: "Usage: X% of weekly limit" or similar
    weekly_patterns = [
        r'(?:usage|Usage):\s*(\d+)%\s+of\s+weekly',
        r'(\d+)%\s+of\s+weekly\s+limit',
    ]

    for pattern in weekly_patterns:
        match = re.search(pattern, output, re.IGNORECASE)
        if match:
            quota_data['weekly_limit_pct'] = int(match.group(1))
            break

    # Pattern 4: Reset times (5-hour window reset, weekly reset)
    # Looks for timestamps or relative times
    reset_patterns = [
        (r'Window\s+Resets?:\s*([^\n]+)', 'window_reset'),
        (r'5-?hour\s+window[^0-9]*reset[^0-9]*:\s*([^\n]+)', 'window_reset'),
        (r'Weekly\s+Reset:\s*([^\n]+)', 'weekly_reset'),
    ]

    for pattern, key in reset_patterns:
        match = re.search(pattern, output, re.IGNORECASE)
        if match:
            reset_time = match.group(1).strip()
            if reset_time and reset_time not in quota_data['reset_times'].values():
                quota_data['reset_times'][key] = reset_time


def main():
    """Run quota extraction and output as JSON."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Extract ChatGPT quota from Codex /status command'
    )
    parser.add_argument('--timeout', type=int, default=15,
                        help='Timeout for Codex response (seconds)')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Print debug output')
    parser.add_argument('--output', '-o', type=str, default=None,
                        help='Save output to JSON file')
    parser.add_argument('--test', action='store_true',
                        help='Test with sample data (dry-run)')
    parser.add_argument('--codex-path', type=str, default=None,
                        help='Path to Codex binary (default: /opt/homebrew/bin/codex)')

    args = parser.parse_args()

    # Handle test mode
    if args.test:
        if args.verbose:
            print("[*] Test mode: using sample /status output", file=sys.stderr)

        sample_output = """
        ChatGPT Pro Account Status

        Account: rigospigos@gmail.com
        Plan: Pro
        Status: Active

        5-Hour Window:
          Messages remaining: 40
          Usage: 10% of 5-hour window

        Weekly Limit:
          Usage: 45% of weekly limit
          Messages: 450/1000

        Window Resets: in 2 hours 15 minutes
        Weekly Reset: in 4 days 12 hours

        Last Activity: 2 minutes ago
        """

        quota = {
            'timestamp': datetime.now().isoformat(),
            'status_output': sample_output,
            'messages_remaining': None,
            'window_5h_pct': None,
            'weekly_limit_pct': None,
            'reset_times': {},
            'error': None
        }
        _parse_status_output(sample_output, quota)
    else:
        # Extract quota from real Codex
        quota = extract_codex_quota(
            timeout=args.timeout,
            verbose=args.verbose,
            codex_path=args.codex_path
        )

    # Output as JSON
    json_output = json.dumps(quota, indent=2)
    print(json_output)

    # Optionally save to file
    if args.output:
        Path(args.output).write_text(json_output)
        if args.verbose:
            print(f"[+] Saved to {args.output}", file=sys.stderr)

    # Exit with error code if extraction failed
    if quota.get('error'):
        sys.exit(1)


if __name__ == '__main__':
    main()
