# Dependency Resolution

System for resolving spec dependencies, computing execution order, and detecting issues.

## Concepts

### Dependency Graph
Directed acyclic graph (DAG) where:
- **Nodes** = specs
- **Edges** = depends_on relationships

```
session (no deps)
    ↓
   api (depends on session)
    ↓
   ui (depends on api)
```

### Execution Order
Topologically sorted list of specs that respects dependencies:
```
[session, api, ui]
```

### Waves (Execution Levels)
Groups of specs that can execute in parallel:
```
Wave 1: [session, database]  # No dependencies, parallel
Wave 2: [api, middleware]     # Both depend on wave 1, parallel
Wave 3: [ui]                  # Depends on wave 2
```

## Dependency Specification

Dependencies are declared in SPEC.md frontmatter:

```yaml
---
name: Login UI
depends_on:
  - auth/session
  - auth/api
---
```

### Path Resolution

Dependencies are **relative to specs/ directory**:

```
specs/
  auth/
    session/SPEC.md          (depends_on: [])
    api/SPEC.md              (depends_on: [auth/session])
    ui/SPEC.md               (depends_on: [auth/api])
```

In `auth/ui/SPEC.md`:
```yaml
depends_on:
  - auth/session  # Full path from specs/
  - auth/api
```

**Not relative paths** like `../session` (explicit full paths are clearer).

## Algorithms

### 1. Topological Sort (Execution Order)

**Purpose:** Compute linear execution order that respects all dependencies.

**Algorithm:** Kahn's algorithm
```
1. Find all nodes with no dependencies (in-degree = 0)
2. Add them to result list
3. Remove these nodes from graph
4. Repeat until all nodes processed or cycle detected
```

**Implementation (Bash):**
```bash
#!/bin/bash

# Input: specs directory
# Output: ordered list of spec paths

topological_sort() {
  local specs_dir="$1"
  local result=()
  local processed=()
  local in_degree=()

  # Build dependency graph
  for spec in $(find "$specs_dir" -name "SPEC.md" | sort); do
    local spec_path=$(echo "$spec" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||')

    # Count dependencies (in-degree)
    local deps=$(grep "^  - " "$spec" | wc -l | tr -d ' ')
    in_degree["$spec_path"]=$deps
  done

  # Process nodes with no dependencies
  while true; do
    # Find specs with in-degree 0 (not yet processed)
    local ready=()
    for spec_path in "${!in_degree[@]}"; do
      if [[ ${in_degree["$spec_path"]} -eq 0 ]] && ! [[ " ${processed[@]} " =~ " ${spec_path} " ]]; then
        ready+=("$spec_path")
      fi
    done

    # No more ready nodes?
    if [ ${#ready[@]} -eq 0 ]; then
      break
    fi

    # Add ready nodes to result
    result+=("${ready[@]}")
    processed+=("${ready[@]}")

    # Decrement in-degree for dependents
    for spec_path in "${ready[@]}"; do
      # Find specs that depend on this one
      for dependent in $(grep -r "^  - $spec_path$" "$specs_dir" --include="SPEC.md" -l); do
        local dep_path=$(echo "$dependent" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||')
        ((in_degree["$dep_path"]--))
      done
    done
  done

  # Check if all specs processed (no cycles)
  if [ ${#result[@]} -ne ${#in_degree[@]} ]; then
    echo "Error: Circular dependency detected"
    return 1
  fi

  echo "${result[@]}"
}
```

### 2. Wave Computation (Parallel Groups)

**Purpose:** Group specs into waves for parallel execution.

**Algorithm:**
```
Wave N = All specs whose dependencies are satisfied by waves 1..N-1
```

**Implementation (Bash):**
```bash
compute_waves() {
  local specs_dir="$1"
  local wave_num=1
  local processed=()

  while true; do
    local wave=()

    # Find specs whose dependencies are all processed
    for spec in $(find "$specs_dir" -name "SPEC.md" | sort); do
      local spec_path=$(echo "$spec" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||')

      # Skip if already processed
      [[ " ${processed[@]} " =~ " ${spec_path} " ]] && continue

      # Get dependencies
      local deps=$(sed -n '/^depends_on:/,/^[a-z]/p' "$spec" | grep "^  - " | sed 's/^  - //')

      # Check if all dependencies are processed
      local all_satisfied=true
      for dep in $deps; do
        if ! [[ " ${processed[@]} " =~ " ${dep} " ]]; then
          all_satisfied=false
          break
        fi
      done

      if [ "$all_satisfied" = true ]; then
        wave+=("$spec_path")
      fi
    done

    # No more specs to process?
    if [ ${#wave[@]} -eq 0 ]; then
      break
    fi

    echo "Wave $wave_num: ${wave[*]}"
    processed+=("${wave[@]}")
    ((wave_num++))
  done
}
```

### 3. Circular Dependency Detection

**Purpose:** Detect cycles that would prevent execution.

**Algorithm:** Depth-first search with recursion stack
```
For each node:
  If node in recursion stack → cycle detected
  If node already visited → skip
  Mark node as in recursion stack
  Visit all dependencies recursively
  Remove node from recursion stack
  Mark node as visited
```

**Implementation (Bash):**
```bash
detect_cycles() {
  local specs_dir="$1"
  local visited=()
  local rec_stack=()

  check_cycle() {
    local spec_path="$1"
    local spec_file="$specs_dir/$spec_path/SPEC.md"

    # If in recursion stack, cycle found
    if [[ " ${rec_stack[@]} " =~ " ${spec_path} " ]]; then
      echo "Error: Circular dependency detected involving: $spec_path"
      echo "Cycle: ${rec_stack[*]} -> $spec_path"
      return 1
    fi

    # If already visited, skip
    [[ " ${visited[@]} " =~ " ${spec_path} " ]] && return 0

    # Add to recursion stack
    rec_stack+=("$spec_path")

    # Check all dependencies
    local deps=$(sed -n '/^depends_on:/,/^[a-z]/p' "$spec_file" | grep "^  - " | sed 's/^  - //')
    for dep in $deps; do
      check_cycle "$dep" || return 1
    done

    # Remove from recursion stack, add to visited
    rec_stack=("${rec_stack[@]/$spec_path}")
    visited+=("$spec_path")

    return 0
  }

  # Check each spec
  for spec in $(find "$specs_dir" -name "SPEC.md" | sort); do
    local spec_path=$(echo "$spec" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||')
    check_cycle "$spec_path" || return 1
  done

  echo "No circular dependencies detected"
  return 0
}
```

### 4. Dependency Validation

**Purpose:** Ensure all dependencies are valid.

**Checks:**
- Dependency specs exist
- No self-dependencies
- No circular dependencies
- Parent/child relationships are valid

**Implementation (Bash):**
```bash
validate_dependencies() {
  local specs_dir="$1"
  local errors=0

  for spec in $(find "$specs_dir" -name "SPEC.md" | sort); do
    local spec_path=$(echo "$spec" | sed "s|^$specs_dir/||" | sed 's|/SPEC.md||')

    # Get dependencies
    local deps=$(sed -n '/^depends_on:/,/^[a-z]/p' "$spec" | grep "^  - " | sed 's/^  - //')

    for dep in $deps; do
      # Check if dependency exists
      if [ ! -f "$specs_dir/$dep/SPEC.md" ]; then
        echo "Error: $spec_path depends on non-existent spec: $dep"
        ((errors++))
      fi

      # Check for self-dependency
      if [ "$dep" = "$spec_path" ]; then
        echo "Error: $spec_path has self-dependency"
        ((errors++))
      fi

      # Check parent/child relationships
      # Child can't depend on its parent (parent context is implicit)
      local parent=$(dirname "$spec_path")
      if [ "$dep" = "$parent" ] && [ "$parent" != "." ]; then
        echo "Warning: $spec_path depends on parent $dep (parent context is inherited)"
      fi
    done
  done

  return $errors
}
```

## Usage Patterns

### Planning Phase

When planning a parent spec:
```bash
# Get all children
CHILDREN=$(find specs/auth -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)

# Compute execution order
ORDER=$(topological_sort specs/auth)

# Plan in order
for CHILD in $ORDER; do
  /flow:plan auth/$CHILD
done
```

### Execution Phase

When executing a parent spec:
```bash
# Compute waves for parallel execution
compute_waves specs/auth

# Execute wave by wave
for WAVE in $(seq 1 $MAX_WAVE); do
  # Get specs in this wave
  SPECS=$(get_wave_specs $WAVE)

  # Execute in parallel
  for SPEC in $SPECS; do
    /flow:execute $SPEC &
  done

  # Wait for wave to complete
  wait
done
```

### Status Display

When showing status:
```bash
# Show by waves with dependencies
for WAVE in $(seq 1 $MAX_WAVE); do
  echo "Wave $WAVE:"
  for SPEC in $(get_wave_specs $WAVE); do
    STATUS=$(get_spec_status $SPEC)
    DEPS=$(get_spec_deps $SPEC)
    echo "  $SPEC [$STATUS] (depends on: $DEPS)"
  done
done
```

## Error Messages

### Circular Dependency
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► DEPENDENCY ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Circular dependency detected:

auth/session → auth/api → auth/middleware → auth/session

This creates a cycle that prevents execution.

Fix: Remove one of these dependencies to break the cycle.

Suggestion: auth/middleware should not depend on auth/session
            (auth/api already provides session access)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Missing Dependency
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► DEPENDENCY ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Spec 'auth/ui' depends on non-existent spec:

  - auth/components  ❌ Not found

Available specs in auth/:
  - auth/session
  - auth/api

Fix:
  1. Create the missing spec: /flow:discuss auth/components
  2. Or remove the dependency from auth/ui/SPEC.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Blocked Execution
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► BLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cannot execute 'auth/ui' - dependencies not satisfied:

  ✓ auth/session - IMPLEMENTED
  ✗ auth/api - NOT IMPLEMENTED

Complete 'auth/api' first:
  /flow:execute auth/api

Or execute parent to handle dependencies automatically:
  /flow:execute auth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Configuration

Dependency behavior can be configured:

```json
{
  "dependencies": {
    "strict_validation": true,      // Fail on any validation error
    "allow_parent_deps": false,     // Allow child → parent dependencies
    "parallel_execution": true,     // Execute waves in parallel
    "max_parallel": 4               // Max specs to run in parallel
  }
}
```

## Best Practices

### 1. Keep Dependencies Shallow
```
✅ Good:
session → api → ui
(3 levels, linear)

❌ Bad:
session → tokens → validation → api → endpoints → ui
(6 levels, too deep)
```

### 2. Avoid Parent Dependencies
```
✅ Good:
auth/ui depends on auth/api
(sibling dependency)

⚠️ Warning:
auth/ui depends on auth
(child → parent, parent context is implicit)
```

### 3. Group Related Specs
```
✅ Good:
auth/frontend/ui depends on auth/backend/api
(clear domains, cross-domain dependency)

❌ Bad:
ui depends on api
(flat structure, unclear domains)
```

### 4. Document Integration Points
In parent SPEC.md:
```markdown
## Integration Points
- `api` provides REST endpoints
- `ui` consumes API endpoints
- Both depend on `session` for authentication
```

## Dependency Graph Visualization

ASCII tree showing dependencies:

```bash
display_dependency_graph() {
  echo "auth"
  echo "├── session (wave 1)"
  echo "├── database (wave 1)"
  echo "├── api (wave 2, depends on: session)"
  echo "│   └─> session"
  echo "├── middleware (wave 2, depends on: session)"
  echo "│   └─> session"
  echo "└── ui (wave 3, depends on: api)"
      └─> api └─> session
}
```

Output:
```
Execution plan for 'auth':

Wave 1 (parallel):
  ◉ session
  ◉ database

Wave 2 (parallel, after wave 1):
  ◉ api          → session
  ◉ middleware   → session

Wave 3 (after wave 2):
  ◉ ui           → api → session
```

## Integration with Planning

Planner uses dependency info to:
- Determine planning order
- Pass dependency context to plans
- Validate dependencies before planning

## Integration with Execution

Executor uses dependency info to:
- Determine execution order
- Execute waves in parallel
- Block execution if dependencies not satisfied
- Show progress with dependency awareness
