#!/usr/bin/env bash

if [[ -n "${SUBTURTLE_LIB_ENV_SH_LOADED:-}" ]]; then
  return 0
fi
SUBTURTLE_LIB_ENV_SH_LOADED=1

remove_dir_if_empty() {
  local path="$1"
  rmdir "$path" 2>/dev/null || true
}

migrate_legacy_runtime_layout() {
  local project_dir="$1"
  if [[ "${BUN_TEST:-}" != "" || "${NODE_ENV:-}" == "test" ]]; then
    return 0
  fi
  local data_dir="${project_dir}/.superturtle"
  local subturtles_dir="${data_dir}/subturtles"
  local legacy_subturtles_dir="${project_dir}/.subturtles"
  local teleport_dir="${data_dir}/teleport"
  local legacy_teleport_dir="${project_dir}/-s/.superturtle/teleport"

  mkdir -p "$data_dir"

  if [[ -d "$legacy_subturtles_dir" ]]; then
    if [[ -e "$subturtles_dir" ]]; then
      echo "ERROR: cannot migrate legacy SubTurtle workspaces because both ${legacy_subturtles_dir} and ${subturtles_dir} exist." >&2
      exit 1
    fi
    mkdir -p "$(dirname "$subturtles_dir")"
    mv "$legacy_subturtles_dir" "$subturtles_dir"
  fi

  if [[ -d "$legacy_teleport_dir" ]]; then
    if [[ -e "$teleport_dir" ]]; then
      echo "ERROR: cannot migrate legacy teleport runtime files because both ${legacy_teleport_dir} and ${teleport_dir} exist." >&2
      exit 1
    fi
    mkdir -p "$(dirname "$teleport_dir")"
    mv "$legacy_teleport_dir" "$teleport_dir"
    remove_dir_if_empty "${project_dir}/-s/.superturtle"
    remove_dir_if_empty "${project_dir}/-s"
  fi
}
