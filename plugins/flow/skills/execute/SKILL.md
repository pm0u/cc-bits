---
name: flow:execute
description: Execute implementation plan with atomic commits
argument-hint: "<feature>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---

# Flow: Execute

Execute PLAN.md tasks with atomic commits and verification.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/execute.md
@~/.claude/plugins/marketplaces/flow/flow/references/dependencies.md

## Core Principle

**Task → Implement → Test → Verify → Commit** (repeat for each task)

One atomic commit per task, all verification criteria must pass.

## Usage

```bash
# Execute single spec
/flow:execute auth/session

# Execute parent (all children in dependency order)
/flow:execute auth
```

## Process

<process>

### 1. Validate Prerequisites

```bash
FEATURE="$1"

# Check PLAN.md exists
if [ ! -f "specs/${FEATURE}/PLAN.md" ]; then
  echo "Error: No plan found"
  echo "Create plan first: /flow:plan $FEATURE"
  exit 1
fi

# Check SPEC status
STATUS=$(grep "^status:" "specs/${FEATURE}/SPEC.md" | awk '{print $2}')

if [ "$STATUS" = "IMPLEMENTED" ]; then
  echo "Warning: Spec already marked as IMPLEMENTED"
  # Offer: Re-implement | View what exists | Skip
fi

# Check working directory clean
if ! git diff-index --quiet HEAD --; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► ERROR"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Working directory has uncommitted changes."
  echo "Commit or stash changes before execution."
  echo ""
  git status --short
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
```

### 2. Check if Parent or Child

```bash
TYPE=$(grep "^type:" "specs/${FEATURE}/SPEC.md" | awk '{print $2}')

if [ "$TYPE" = "parent" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► EXECUTING PARENT: $FEATURE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Executing children in dependency order..."
  echo ""

  # Load dependency library
  source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

  # Get execution order (waves)
  WAVES=$(compute_waves "specs/${FEATURE}")

  # Execute wave by wave
  WAVE_NUM=1
  while read -r wave_line; do
    WAVE_SPECS=$(echo "$wave_line" | cut -d: -f2)

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " WAVE $WAVE_NUM"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    for SPEC in $WAVE_SPECS; do
      echo "Executing: $SPEC"
      /flow:execute "$SPEC" || {
        echo "Error executing $SPEC"
        exit 1
      }
      echo ""
    done

    ((WAVE_NUM++))
  done <<< "$WAVES"

  # All children complete
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► PARENT COMPLETE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "All children of $FEATURE implemented."
  echo ""

  # Update parent status
  sed -i 's/^status: ACTIVE/status: IMPLEMENTED/' "specs/${FEATURE}/SPEC.md"
  git add "specs/${FEATURE}/SPEC.md"
  git commit -m "docs(flow): mark $FEATURE (parent) as IMPLEMENTED"

  exit 0
fi
```

### 3. Check Dependencies

```bash
source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

echo "Checking dependencies..."
echo ""

if ! check_dependencies_satisfied "$FEATURE" 2>&1; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► DEPENDENCIES NOT SATISFIED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Complete dependencies first, or execute parent to handle automatically."
  echo ""

  DEPS=$(get_spec_dependencies "$FEATURE")
  for DEP in $DEPS; do
    DEP_STATUS=$(get_spec_status "$DEP")
    if [ "$DEP_STATUS" != "IMPLEMENTED" ]; then
      echo "  /flow:execute $DEP"
    fi
  done

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi

echo "✓ All dependencies satisfied"
echo ""
```

### 4. Parse Plan

```bash
# Extract task count
TOTAL_TASKS=$(grep -c "^### Task [0-9]" "specs/${FEATURE}/PLAN.md")

echo "Plan: $TOTAL_TASKS tasks"
echo ""
```

### 5. Execute Each Task

```bash
for TASK_NUM in $(seq 1 $TOTAL_TASKS); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► TASK $TASK_NUM/$TOTAL_TASKS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Extract task from PLAN.md
  TASK_START=$(grep -n "^### Task $TASK_NUM:" "specs/${FEATURE}/PLAN.md" | cut -d: -f1)
  TASK_END=$(grep -n "^### Task $((TASK_NUM + 1)):" "specs/${FEATURE}/PLAN.md" | cut -d: -f1)

  if [ -z "$TASK_END" ]; then
    # Last task - go to end of file
    TASK_CONTENT=$(sed -n "${TASK_START},\$p" "specs/${FEATURE}/PLAN.md")
  else
    TASK_CONTENT=$(sed -n "${TASK_START},$((TASK_END - 1))p" "specs/${FEATURE}/PLAN.md")
  fi

  # Display task summary
  TASK_NAME=$(echo "$TASK_CONTENT" | grep "^### Task" | sed "s/### Task $TASK_NUM: //")
  echo "Task: $TASK_NAME"
  echo ""

  # Load context
  SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")
  PLAN_CONTENT=$(cat "specs/${FEATURE}/PLAN.md")
  RESEARCH_CONTENT=$(cat "specs/${FEATURE}/RESEARCH.md" 2>/dev/null || echo "")

  # Spawn executor agent with inlined context
  echo "Spawning executor agent..."
  echo ""
```

Task(
  prompt="Execute Task $TASK_NUM of $TOTAL_TASKS for feature: $FEATURE

<task>
$TASK_CONTENT
</task>

<spec_context>
$SPEC_CONTENT
</spec_context>

<plan_context>
$PLAN_CONTENT
</plan_context>

<research_context>
$RESEARCH_CONTENT
</research_context>

<instructions>
1. Read your role: Follow the flow:executor agent documentation at ~/.claude/plugins/marketplaces/flow/agents/executor.md
2. Implement the task according to actions listed in the task section
3. Honor Implementation Decisions from SPEC.md Context section
4. Follow research recommendations (use standard stack, don't hand-roll solutions)
5. Write tests according to verification criteria (section 3.4 of executor.md)
6. Run tests and verify all criteria pass (section 3.5 of executor.md)
7. Tests MUST be green before committing (run npm test or appropriate test command)
8. Create atomic commit for this task only
9. Return structured response: EXECUTION COMPLETE | EXECUTION BLOCKED | EXECUTION FAILED
</instructions>

<output_format>
## EXECUTION COMPLETE
**Task:** $TASK_NUM - {name}
**Files modified:** {list}
**Tests:** {status - passed/created}
**Verification:** All criteria satisfied
**Commit:** {hash}

OR

## EXECUTION BLOCKED
**Task:** $TASK_NUM - {name}
**Issue:** {description}
**Need:** {what would unblock}

OR

## EXECUTION FAILED
**Task:** $TASK_NUM - {name}
**Error:** {error message}
**Attempts:** {N}
</output_format>
",
  subagent_type="flow:executor",
  model="sonnet",
  description="Execute task $TASK_NUM: $TASK_NAME"
)

```bash
  # Check executor output and handle response
  if grep -q "## EXECUTION COMPLETE" <<< "$EXECUTOR_OUTPUT"; then
    echo "✓ Task $TASK_NUM complete"

    # Extract commit hash
    COMMIT_HASH=$(echo "$EXECUTOR_OUTPUT" | grep "Commit:" | awk '{print $2}')
    echo "  Commit: $COMMIT_HASH"
    echo ""

  elif grep -q "## EXECUTION BLOCKED" <<< "$EXECUTOR_OUTPUT"; then
    echo "✗ Task $TASK_NUM blocked"
    echo ""
    echo "$EXECUTOR_OUTPUT"
    echo ""
    echo "Execution paused. Resolve blockers and restart."
    exit 1

  elif grep -q "## EXECUTION FAILED" <<< "$EXECUTOR_OUTPUT"; then
    echo "✗ Task $TASK_NUM failed"
    echo ""
    echo "$EXECUTOR_OUTPUT"
    echo ""
    echo "Execution failed. Review errors and restart."
    exit 1
  fi
done
```

### 6. Final Verification

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► VERIFYING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run tests
echo "Running tests..."
npm test 2>&1 | tail -20

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "✓ All tests passing"
else
  echo "✗ Tests failed"
  # Offer: Fix | Continue anyway
fi

echo ""
```

### 7. Update SPEC.md

```bash
# Update status
sed -i 's/^status: ACTIVE/status: IMPLEMENTED/' "specs/${FEATURE}/SPEC.md"

# Commit
git add "specs/${FEATURE}/SPEC.md"
git commit -m "docs(flow): mark $FEATURE as IMPLEMENTED

All $TOTAL_TASKS tasks completed
Tests passing
Status: ACTIVE → IMPLEMENTED
"
```

### 8. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► EXECUTION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Feature:** {feature}
**Tasks completed:** {N}/{N}
**Commits:** {N + 1}
**Tests:** Passing ✓

**Status:** IMPLEMENTED

───────────────────────────────────────────────────────
```

### 9. Post-Execution Gate

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Execution complete! What do you want to do?"
- options:
  - "Verify" — Run full verification (Recommended)
  - "Review changes" — Show me what was built
  - "Done" — All complete, move on
```

</process>

## Success Criteria

- [ ] Prerequisites validated
- [ ] Dependencies satisfied
- [ ] All tasks executed
- [ ] Atomic commits created
- [ ] Tests passing
- [ ] SPEC.md updated
- [ ] Status set to IMPLEMENTED
- [ ] Post-execution gate presented
