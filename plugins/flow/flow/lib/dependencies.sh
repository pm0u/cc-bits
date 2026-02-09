#!/bin/bash
# Dependency resolution utilities for Flow

set -euo pipefail

# Get all specs in a directory (recursively)
get_all_specs() {
  local specs_dir="${1:-specs}"
  find "$specs_dir" -name "SPEC.md" 2>/dev/null | while read -r spec_file; do
    echo "$spec_file" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||'
  done
}

# Get dependencies for a spec
get_spec_dependencies() {
  local spec_path="$1"
  local spec_file="specs/${spec_path}/SPEC.md"

  if [ ! -f "$spec_file" ]; then
    echo "Error: Spec not found: $spec_file" >&2
    return 1
  fi

  # Extract depends_on list from frontmatter
  sed -n '/^depends_on:/,/^[a-z_-]*:/p' "$spec_file" \
    | grep "^  - " \
    | sed 's/^  - //' \
    || true
}

# Check if spec exists
spec_exists() {
  local spec_path="$1"
  [ -f "specs/${spec_path}/SPEC.md" ]
}

# Validate dependencies for a spec
validate_spec_dependencies() {
  local spec_path="$1"
  local errors=0

  # Get dependencies
  local deps
  deps=$(get_spec_dependencies "$spec_path")

  # Check each dependency
  for dep in $deps; do
    # Check if dependency exists
    if ! spec_exists "$dep"; then
      echo "Error: $spec_path depends on non-existent spec: $dep" >&2
      ((errors++))
    fi

    # Check for self-dependency
    if [ "$dep" = "$spec_path" ]; then
      echo "Error: $spec_path has self-dependency" >&2
      ((errors++))
    fi
  done

  return $errors
}

# Validate all dependencies in a directory
validate_all_dependencies() {
  local specs_dir="${1:-specs}"
  local errors=0

  while read -r spec_path; do
    validate_spec_dependencies "$spec_path" || ((errors+=$?))
  done < <(get_all_specs "$specs_dir")

  if [ $errors -eq 0 ]; then
    echo "✓ All dependencies valid" >&2
  else
    echo "✗ Found $errors dependency error(s)" >&2
  fi

  return $((errors > 0 ? 1 : 0))
}

# Detect circular dependencies using DFS
detect_circular_dependencies() {
  local specs_dir="${1:-specs}"
  local -A visited
  local -A rec_stack
  local cycle_found=0

  check_cycle() {
    local spec_path="$1"

    # If in recursion stack, cycle found
    if [ "${rec_stack[$spec_path]:-0}" = "1" ]; then
      echo "Error: Circular dependency involving: $spec_path" >&2
      return 1
    fi

    # If already visited, skip
    [ "${visited[$spec_path]:-0}" = "1" ] && return 0

    # Add to recursion stack
    rec_stack[$spec_path]=1

    # Check all dependencies
    local deps
    deps=$(get_spec_dependencies "$spec_path")
    for dep in $deps; do
      if ! check_cycle "$dep"; then
        echo "  ← $spec_path" >&2
        return 1
      fi
    done

    # Remove from recursion stack, mark as visited
    unset rec_stack[$spec_path]
    visited[$spec_path]=1

    return 0
  }

  # Check each spec
  while read -r spec_path; do
    if ! check_cycle "$spec_path"; then
      cycle_found=1
      break
    fi
  done < <(get_all_specs "$specs_dir")

  if [ $cycle_found -eq 0 ]; then
    echo "✓ No circular dependencies" >&2
  fi

  return $cycle_found
}

# Topological sort - returns ordered list of specs
topological_sort() {
  local specs_dir="${1:-specs}"
  local -A in_degree
  local -a result
  local -A processed

  # Count in-degrees
  while read -r spec_path; do
    local deps
    deps=$(get_spec_dependencies "$spec_path" | wc -l | tr -d ' ')
    in_degree[$spec_path]=$deps
  done < <(get_all_specs "$specs_dir")

  # Process specs with no dependencies
  while true; do
    local -a ready=()

    # Find specs with in-degree 0 (not yet processed)
    for spec_path in "${!in_degree[@]}"; do
      if [ "${in_degree[$spec_path]}" -eq 0 ] && [ -z "${processed[$spec_path]:-}" ]; then
        ready+=("$spec_path")
      fi
    done

    # No more ready nodes?
    [ ${#ready[@]} -eq 0 ] && break

    # Add ready nodes to result
    result+=("${ready[@]}")
    for spec_path in "${ready[@]}"; do
      processed[$spec_path]=1

      # Decrement in-degree for dependents
      while read -r dependent_file; do
        local dependent_path
        dependent_path=$(echo "$dependent_file" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||')
        ((in_degree[$dependent_path]--))
      done < <(grep -r "^  - $spec_path\$" "$specs_dir" --include="SPEC.md" -l 2>/dev/null || true)
    done
  done

  # Check if all specs processed (no cycles)
  if [ ${#result[@]} -ne ${#in_degree[@]} ]; then
    echo "Error: Circular dependency detected (topological sort failed)" >&2
    return 1
  fi

  # Output sorted specs
  printf '%s\n' "${result[@]}"
}

# Compute execution waves for parallel execution
compute_waves() {
  local specs_dir="${1:-specs}"
  local wave_num=1
  local -A processed

  while true; do
    local -a wave=()

    # Find specs whose dependencies are all processed
    while read -r spec_path; do
      # Skip if already processed
      [ -n "${processed[$spec_path]:-}" ] && continue

      # Get dependencies
      local deps
      deps=$(get_spec_dependencies "$spec_path")

      # Check if all dependencies are processed
      local all_satisfied=true
      for dep in $deps; do
        if [ -z "${processed[$dep]:-}" ]; then
          all_satisfied=false
          break
        fi
      done

      if [ "$all_satisfied" = "true" ]; then
        wave+=("$spec_path")
      fi
    done < <(get_all_specs "$specs_dir")

    # No more specs to process?
    [ ${#wave[@]} -eq 0 ] && break

    # Output wave
    echo "wave_${wave_num}:${wave[*]}"

    # Mark as processed
    for spec_path in "${wave[@]}"; do
      processed[$spec_path]=1
    done

    ((wave_num++))
  done
}

# Get specs in a specific wave
get_wave_specs() {
  local wave_num="$1"
  local specs_dir="${2:-specs}"

  compute_waves "$specs_dir" | grep "^wave_${wave_num}:" | cut -d: -f2 | tr ' ' '\n'
}

# Count total waves
count_waves() {
  local specs_dir="${1:-specs}"
  compute_waves "$specs_dir" | wc -l | tr -d ' '
}

# Check if dependencies are satisfied for execution
check_dependencies_satisfied() {
  local spec_path="$1"
  local errors=0

  local deps
  deps=$(get_spec_dependencies "$spec_path")

  for dep in $deps; do
    local dep_status
    dep_status=$(get_spec_status "$dep")

    if [ "$dep_status" != "IMPLEMENTED" ]; then
      echo "✗ $dep - $dep_status (not implemented)" >&2
      ((errors++))
    else
      echo "✓ $dep - IMPLEMENTED" >&2
    fi
  done

  return $errors
}

# Get spec status from SPEC.md
get_spec_status() {
  local spec_path="$1"
  local spec_file="specs/${spec_path}/SPEC.md"

  if [ ! -f "$spec_file" ]; then
    echo "NOT_FOUND"
    return
  fi

  grep "^status:" "$spec_file" | awk '{print $2}' || echo "UNKNOWN"
}

# Display dependency graph as tree
display_dependency_tree() {
  local spec_path="$1"
  local prefix="${2:-}"
  local -A visited

  # Prevent infinite loops
  [ -n "${visited[$spec_path]:-}" ] && return
  visited[$spec_path]=1

  # Display this spec
  echo "${prefix}${spec_path}"

  # Get and display dependencies
  local deps
  deps=$(get_spec_dependencies "$spec_path")
  local dep_count
  dep_count=$(echo "$deps" | grep -c . || echo "0")

  local i=0
  for dep in $deps; do
    ((i++))
    if [ $i -eq $dep_count ]; then
      # Last dependency
      display_dependency_tree "$dep" "${prefix}└─> "
    else
      # Not last dependency
      display_dependency_tree "$dep" "${prefix}├─> "
    fi
  done
}

# Display execution plan with waves
display_execution_plan() {
  local specs_dir="${1:-specs}"

  echo "Execution plan:"
  echo ""

  local wave_num=1
  while read -r wave_line; do
    local wave_specs
    wave_specs=$(echo "$wave_line" | cut -d: -f2)

    echo "Wave $wave_num (parallel):"
    for spec_path in $wave_specs; do
      local deps
      deps=$(get_spec_dependencies "$spec_path")
      if [ -n "$deps" ]; then
        echo "  ◉ $spec_path → $(echo $deps | tr '\n' ' ')"
      else
        echo "  ◉ $spec_path (no dependencies)"
      fi
    done
    echo ""

    ((wave_num++))
  done < <(compute_waves "$specs_dir")
}

# Export functions for use in other scripts
export -f get_all_specs
export -f get_spec_dependencies
export -f spec_exists
export -f validate_spec_dependencies
export -f validate_all_dependencies
export -f detect_circular_dependencies
export -f topological_sort
export -f compute_waves
export -f get_wave_specs
export -f count_waves
export -f check_dependencies_satisfied
export -f get_spec_status
export -f display_dependency_tree
export -f display_execution_plan
