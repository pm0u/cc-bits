---
name: flow:plan
description: Create implementation plan with auto-research
argument-hint: "<feature> [--skip-research]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---

# Flow: Plan

Create executable implementation plan from SPEC.md with automatic research.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/plan.md
@~/.claude/plugins/marketplaces/flow/flow/references/dependencies.md

## Core Principle

**Research → Plan → Verify** (like FUCKIT)

Research happens automatically when needed, not as separate step.

## Usage

```bash
# Plan with auto-research
/flow:plan auth/session

# Skip research
/flow:plan auth/session --skip-research

# Plan parent (plans all children in dependency order)
/flow:plan auth
```

## Process

<process>

### 1. Parse Arguments and Validate

```bash
FEATURE="$1"
SKIP_RESEARCH=false

[[ "$*" == *"--skip-research"* ]] && SKIP_RESEARCH=true

# Validate SPEC.md exists
if [ ! -f "specs/${FEATURE}/SPEC.md" ]; then
  echo "Error: Spec not found. Create first: /flow:discuss $FEATURE"
  exit 1
fi

# Check status
STATUS=$(grep "^status:" "specs/${FEATURE}/SPEC.md" | awk '{print $2}')
if [ "$STATUS" = "DRAFT" ]; then
  echo "Warning: Spec is DRAFT (has OPEN items)"
  # Offer: Resolve | Proceed anyway
fi
```

### 2. Check if Parent or Child

```bash
# Determine type
TYPE=$(grep "^type:" "specs/${FEATURE}/SPEC.md" | awk '{print $2}')

if [ "$TYPE" = "parent" ]; then
  # Parent spec - plan all children in dependency order
  echo "Parent spec detected. Planning children in dependency order..."

  # Source dependency library
  source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

  # Get execution order
  ORDER=$(topological_sort "specs/${FEATURE}")

  # Plan each child
  for CHILD in $ORDER; do
    echo ""
    echo "Planning: $CHILD"
    # Recursive call
    /flow:plan "$CHILD" ${SKIP_RESEARCH:+--skip-research}
  done

  exit 0
fi
```

### 3. Check Dependencies

```bash
source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

echo "Checking dependencies..."
if ! check_dependencies_satisfied "$FEATURE" 2>&1; then
  echo ""
  # Offer options via AskUserQuestion
fi
```

### 4. Check for Research

```bash
RESEARCH_PATH="specs/${FEATURE}/RESEARCH.md"
RESEARCH_EXISTS=false

if [ -f "$RESEARCH_PATH" ]; then
  RESEARCH_EXISTS=true
  echo "Found existing research: $RESEARCH_PATH"
fi

# Check if research needed
NEEDS_RESEARCH=false

if [ "$SKIP_RESEARCH" != "true" ] && [ "$RESEARCH_EXISTS" != "true" ]; then
  # Simple heuristic: check for unfamiliar libraries
  # (Real implementation would be more sophisticated)
  NEEDS_RESEARCH=true
fi
```

### 5. Run Research (If Needed)

```bash
if [ "$NEEDS_RESEARCH" = "true" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► RESEARCHING"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Investigating best practices and libraries..."
  echo ""

  # Build researcher prompt
  SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")

  # Spawn researcher
  # Task(subagent_type="general-purpose", model="sonnet", ...)
fi
```

### 6. Spawn Planner

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► PLANNING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load all context
SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")

# Parent context (if child)
PARENT_CONTENT=""
if [[ "$FEATURE" == *"/"* ]]; then
  PARENT=$(dirname "$FEATURE")
  if [ -f "specs/${PARENT}/SPEC.md" ]; then
    PARENT_CONTENT=$(cat "specs/${PARENT}/SPEC.md")
  fi
fi

# Research context (if available)
RESEARCH_CONTENT=""
if [ -f "$RESEARCH_PATH" ]; then
  RESEARCH_CONTENT=$(cat "$RESEARCH_PATH")
fi

# Build planner prompt
PLANNER_PROMPT="..."

# Spawn planner
# Task(subagent_type="general-purpose", model="opus", ...)
```

### 7. Handle Planner Response

```bash
# Check return pattern
if grep -q "## RESEARCH NEEDED" <<< "$PLANNER_OUTPUT"; then
  # Loop back to research
  echo "Planner requests research..."
  # Extract what to research
  # Spawn researcher
  # Re-run planner
elif grep -q "## KICKBACK" <<< "$PLANNER_OUTPUT"; then
  # Handle kickback
  SIGNAL=$(echo "$PLANNER_OUTPUT" | grep "KICKBACK:" | cut -d: -f2 | xargs)

  case "$SIGNAL" in
    TOO_MANY_TASKS)
      echo "Planner suggests splitting the spec"
      # Offer to split
      ;;
    SPEC_INCOMPLETE)
      echo "Planner needs more spec details"
      # Return to discussion
      ;;
  esac
elif grep -q "## PLANNING COMPLETE" <<< "$PLANNER_OUTPUT"; then
  # Success!
  PLAN_PATH=$(echo "$PLANNER_OUTPUT" | grep "Plan created:" | cut -d: -f2- | xargs)
  NUM_TASKS=$(echo "$PLANNER_OUTPUT" | grep "Tasks:" | cut -d: -f2 | xargs)

  echo "Plan created: $PLAN_PATH ($NUM_TASKS tasks)"
fi
```

### 8. Commit

```bash
git add "specs/${FEATURE}/PLAN.md"
[ -f "$RESEARCH_PATH" ] && git add "$RESEARCH_PATH"

git commit -m "docs(flow): plan $FEATURE

Tasks: $NUM_TASKS
Research: ${RESEARCH_EXISTS}
"
```

### 9. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PLAN READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Plan:** specs/{feature}/PLAN.md
**Tasks:** {N} tasks in {M} waves
**Research:** {Completed | Used existing | Skipped}

{Task summary from planner output}

───────────────────────────────────────────────────────
```

### 10. Post-Planning Gate

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Plan is ready. How do you want to proceed?"
- options:
  - "Execute now" — Run all {N} tasks (Recommended)
  - "Review plan" — Show me the full plan
  - "Adjust approach" — Refine plan or spec
```

</process>

## Success Criteria

- [ ] SPEC.md validated
- [ ] Dependencies satisfied (or acknowledged)
- [ ] Research completed (if needed)
- [ ] PLAN.md created with tasks
- [ ] Committed to git
- [ ] Post-planning gate presented
