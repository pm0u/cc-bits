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

# Load model profile (see model-profiles.md)
CONFIG_FILE="specs/.flow/config.json"
MODEL_PROFILE="balanced"  # default

if [ -f "$CONFIG_FILE" ]; then
  MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' "$CONFIG_FILE" 2>/dev/null || echo "balanced")
fi

# Resolve models for each agent type
case "$MODEL_PROFILE" in
  quality)
    PLANNER_MODEL="opus"
    RESEARCHER_MODEL="opus"
    ;;
  balanced)
    PLANNER_MODEL="opus"
    RESEARCHER_MODEL="sonnet"
    ;;
  budget)
    PLANNER_MODEL="sonnet"
    RESEARCHER_MODEL="haiku"
    ;;
  *)
    # Invalid profile, use balanced
    PLANNER_MODEL="opus"
    RESEARCHER_MODEL="sonnet"
    ;;
esac
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

  # Load spec content for researcher
  SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")
  echo ""
```

Task(
  prompt="Research implementation approach for feature: $FEATURE

<spec>
$SPEC_CONTENT
</spec>

<instructions>
1. Read your role: Follow the flow:researcher agent documentation at ~/.claude/plugins/marketplaces/flow/agents/researcher.md
2. Identify standard stack for this feature type (don't reinvent the wheel)
3. Document architecture patterns and best practices
4. List 'Don't Hand-Roll' items (use existing libraries/frameworks)
5. Identify common pitfalls and gotchas
6. Provide code examples and reference sources
7. Assign confidence levels (HIGH/MEDIUM/LOW) to recommendations
8. Output: Create RESEARCH.md in specs/${FEATURE}/ directory
</instructions>

<output_format>
Create specs/${FEATURE}/RESEARCH.md with your findings

Return summary:
## RESEARCH COMPLETE
**Topics covered:** {N}
**Key recommendations:** {list top 3}
**Confidence:** {HIGH/MEDIUM/LOW}
</output_format>
",
  subagent_type="flow:researcher",
  model="$RESEARCHER_MODEL",
  description="Research $FEATURE"
)

```bash
  echo "✓ Research complete"
  echo ""
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
```

Task(
  prompt="Create implementation plan for feature: $FEATURE

<spec>
$SPEC_CONTENT
</spec>

<parent_spec>
$PARENT_CONTENT
</parent_spec>

<research>
$RESEARCH_CONTENT
</research>

<instructions>
1. Read your role: Follow the flow:planner agent documentation at ~/.claude/plugins/marketplaces/flow/agents/planner.md
2. Break spec into 3-8 tasks (if more needed, return KICKBACK: TOO_MANY_TASKS)
3. Honor all Implementation Decisions from SPEC.md Context section
4. Apply research findings (use standard stack, recommended patterns, don't hand-roll)
5. Define verification criteria for each task (these will drive testing in executor)
6. Assign waves for parallel execution where tasks are independent
7. Generate must-haves checklist for final verification
8. Create PLAN.md in specs/${FEATURE}/ directory
9. Return: PLANNING COMPLETE | RESEARCH NEEDED | KICKBACK
</instructions>

<output_format>
Create specs/${FEATURE}/PLAN.md with the plan

Return summary:
## PLANNING COMPLETE
**Plan:** specs/${FEATURE}/PLAN.md
**Tasks:** {N} tasks in {M} waves
**Must-haves:** {N} critical criteria

OR

## RESEARCH NEEDED
**Topics:** {list what needs research}

OR

## KICKBACK: {signal}
**Reason:** {explanation}
**Suggestion:** {what to do}
</output_format>
",
  subagent_type="flow:planner",
  model="$PLANNER_MODEL",
  description="Plan $FEATURE"
)

```bash

### 7. Handle Planner Response

```bash
# Check return pattern
if grep -q "## PLANNING COMPLETE" <<< "$PLANNER_OUTPUT"; then
  # Success!
  NUM_TASKS=$(echo "$PLANNER_OUTPUT" | grep "Tasks:" | grep -o '[0-9]* tasks' | grep -o '[0-9]*')
  NUM_WAVES=$(echo "$PLANNER_OUTPUT" | grep "Tasks:" | grep -o 'in [0-9]* waves' | grep -o '[0-9]*')

  echo "✓ Plan created: $NUM_TASKS tasks in $NUM_WAVES waves"
  echo ""

elif grep -q "## RESEARCH NEEDED" <<< "$PLANNER_OUTPUT"; then
  # Loop back to research
  echo "Planner requests research..."
  echo ""

  TOPICS=$(echo "$PLANNER_OUTPUT" | sed -n '/Topics:/,/^$/p' | tail -n +2)
  echo "Research needed on:"
  echo "$TOPICS"
  echo ""

  # Set flag to trigger research loop
  NEEDS_RESEARCH=true
  # Jump back to section 5 (research phase)

elif grep -q "## KICKBACK" <<< "$PLANNER_OUTPUT"; then
  # Handle kickback
  SIGNAL=$(echo "$PLANNER_OUTPUT" | grep "KICKBACK:" | cut -d: -f2 | xargs)

  echo "Planner kickback: $SIGNAL"
  echo ""
  echo "$PLANNER_OUTPUT"
  echo ""

  case "$SIGNAL" in
    TOO_MANY_TASKS)
      echo "Planner suggests splitting this spec into smaller child specs."
      ;;
    SPEC_INCOMPLETE)
      echo "Planner needs more detail in the spec. Return to /flow:discuss"
      ;;
  esac

  exit 1
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
