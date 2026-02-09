---
name: flow:status
description: Show spec status, dependencies, and execution plan
argument-hint: "[feature]"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Flow: Status

Display status, dependencies, and execution plan for specs.

## Usage

```bash
# Show all specs
/flow:status

# Show specific feature
/flow:status auth

# Show specific child
/flow:status auth/session
```

## Process

<process>

### 1. Parse Arguments

```bash
FEATURE="${1:-}"

if [ -z "$FEATURE" ]; then
  # Show all specs
  MODE="all"
  SPECS_DIR="specs"
else
  # Show specific feature
  MODE="feature"
  SPECS_DIR="specs/${FEATURE}"

  if [ ! -d "$SPECS_DIR" ]; then
    echo "Error: Feature not found: $FEATURE"
    exit 1
  fi
fi
```

### 2. Source Dependencies Library

```bash
source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh
```

### 3. Validate Dependencies

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► DEPENDENCY CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Validate all dependencies
if validate_all_dependencies "$SPECS_DIR" 2>&1; then
  echo ""
else
  echo ""
  echo "Fix dependency errors before proceeding."
  echo ""
fi

# Check for circular dependencies
if detect_circular_dependencies "$SPECS_DIR" 2>&1; then
  echo ""
else
  echo ""
  echo "Fix circular dependencies before proceeding."
  echo ""
  exit 1
fi
```

### 4. Display Specs by Status

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► SPECS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Group by status
declare -A by_status

while read -r spec_path; do
  status=$(get_spec_status "$spec_path")
  by_status[$status]+="$spec_path "
done < <(get_all_specs "$SPECS_DIR")

# Display each status group
for status in DRAFT ACTIVE IMPLEMENTED DEPRECATED; do
  specs="${by_status[$status]:-}"
  [ -z "$specs" ] && continue

  echo "$status:"
  for spec_path in $specs; do
    # Get dependencies
    deps=$(get_spec_dependencies "$spec_path" | tr '\n' ' ')
    if [ -n "$deps" ]; then
      echo "  • $spec_path → $deps"
    else
      echo "  • $spec_path"
    fi
  done
  echo ""
done
```

### 5. Display Execution Plan (If Applicable)

```bash
# Only show execution plan if there are ACTIVE specs
if [ -n "${by_status[ACTIVE]:-}" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► EXECUTION PLAN"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  display_execution_plan "$SPECS_DIR"
fi
```

### 6. Display Phase Grouping (If Parent Spec Defines Phases)

```bash
if [ "$MODE" = "feature" ] && [ -f "$SPECS_DIR/SPEC.md" ]; then
  # Check if parent defines phases
  if grep -q "^phases:" "$SPECS_DIR/SPEC.md"; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " FLOW ► PHASES"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Extract phases from parent SPEC.md
    sed -n '/^phases:/,/^[a-z]/p' "$SPECS_DIR/SPEC.md" | grep ":" | while read -r line; do
      if [[ "$line" =~ ^[[:space:]]*([a-z_-]+):.*\[(.*)\] ]]; then
        phase_name="${BASH_REMATCH[1]}"
        phase_specs="${BASH_REMATCH[2]}"

        echo "📦 $phase_name"
        for spec_name in $(echo "$phase_specs" | tr ',' '\n'); do
          spec_name=$(echo "$spec_name" | tr -d ' ')
          status=$(get_spec_status "$FEATURE/$spec_name")
          case "$status" in
            IMPLEMENTED) icon="✓" ;;
            ACTIVE) icon="→" ;;
            DRAFT) icon="⏳" ;;
            *) icon="•" ;;
          esac
          echo "  $icon $spec_name ($status)"
        done
        echo ""
      fi
    done
  fi
fi
```

### 7. Display Next Steps

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine what to do next
has_draft=false
has_active=false
has_unplanned=false

for spec_path in ${by_status[DRAFT]:-}; do
  has_draft=true
done

for spec_path in ${by_status[ACTIVE]:-}; do
  has_active=true
  # Check if PLAN.md exists
  if [ ! -f "specs/${spec_path}/PLAN.md" ]; then
    has_unplanned=true
  fi
done

if [ "$has_draft" = true ]; then
  echo "Resolve DRAFT specs:"
  for spec_path in ${by_status[DRAFT]:-}; do
    echo "  /flow:discuss $spec_path --force"
  done
  echo ""
fi

if [ "$has_unplanned" = true ]; then
  echo "Plan ACTIVE specs:"
  for spec_path in ${by_status[ACTIVE]:-}; do
    if [ ! -f "specs/${spec_path}/PLAN.md" ]; then
      echo "  /flow:plan $spec_path"
    fi
  done
  echo ""
fi

if [ "$has_active" = true ] && [ "$has_unplanned" = false ]; then
  echo "Execute specs:"
  if [ "$MODE" = "feature" ]; then
    echo "  /flow:execute $FEATURE"
  else
    # Show next spec to execute based on dependencies
    sorted=$(topological_sort "$SPECS_DIR")
    for spec_path in $sorted; do
      status=$(get_spec_status "$spec_path")
      if [ "$status" = "ACTIVE" ] && [ -f "specs/${spec_path}/PLAN.md" ]; then
        echo "  /flow:execute $spec_path"
        break
      fi
    done
  fi
  echo ""
fi

if [ -z "${by_status[DRAFT]:-}" ] && [ -z "${by_status[ACTIVE]:-}" ]; then
  echo "All specs implemented! ✓"
  echo ""
fi

echo "───────────────────────────────────────────────────────"
```

</process>

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► DEPENDENCY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ All dependencies valid
✓ No circular dependencies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPECS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTIVE:
  • auth/session
  • auth/api → auth/session
  • auth/ui → auth/api

IMPLEMENTED:
  • auth/database

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► EXECUTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wave 1 (parallel):
  ◉ auth/session (no dependencies)

Wave 2 (parallel, after wave 1):
  ◉ auth/api → auth/session

Wave 3 (after wave 2):
  ◉ auth/ui → auth/api

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PHASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 foundation
  ✓ database (IMPLEMENTED)
  → session (ACTIVE)

📦 backend
  → api (ACTIVE)

📦 frontend
  → ui (ACTIVE)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execute specs:
  /flow:execute auth

───────────────────────────────────────────────────────
```

## Success Criteria

- [ ] All specs displayed with status
- [ ] Dependencies shown for each spec
- [ ] Dependency errors highlighted
- [ ] Execution plan shown (waves)
- [ ] Phase grouping shown (if defined)
- [ ] Clear next steps provided
