#!/bin/bash
# claude-md-guard configuration — single source of truth for all rules.

# Allowed top-level headings (one per line, exact match)
ALLOWED_HEADINGS="# Current task
# End goal with specs
# Roadmap (Completed)
# Roadmap (Upcoming)
# Backlog"

# Sections that must contain at least one item (lines starting with -)
SECTIONS_REQUIRING_ITEMS="# Backlog
# Roadmap (Upcoming)
# Roadmap (Completed)"

# Thresholds
MAX_LINES=500
MIN_BACKLOG_ITEMS=5
MIN_CURRENT_MARKERS=1
