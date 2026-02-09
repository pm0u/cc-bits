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

# Load model profile (see model-profiles.md)
CONFIG_FILE="specs/.flow/config.json"
MODEL_PROFILE="balanced"  # default

if [ -f "$CONFIG_FILE" ]; then
  MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' "$CONFIG_FILE" 2>/dev/null || echo "balanced")
fi

# Resolve models for each agent type
case "$MODEL_PROFILE" in
  quality)
    EXECUTOR_MODEL="opus"
    VERIFIER_MODEL="sonnet"
    ;;
  balanced)
    EXECUTOR_MODEL="sonnet"
    VERIFIER_MODEL="sonnet"
    ;;
  budget)
    EXECUTOR_MODEL="sonnet"
    VERIFIER_MODEL="haiku"
    ;;
  *)
    # Invalid profile, use balanced
    EXECUTOR_MODEL="sonnet"
    VERIFIER_MODEL="sonnet"
    ;;
esac
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

### 4. Parse Plan and Group by Waves

```bash
# Extract task count and wave info
TOTAL_TASKS=$(grep -c "^### Task [0-9]" "specs/${FEATURE}/PLAN.md")
TOTAL_WAVES=$(grep "^\*\*Wave:\*\*" "specs/${FEATURE}/PLAN.md" | awk '{print $2}' | sort -n | tail -1)

echo "Plan: $TOTAL_TASKS tasks across $TOTAL_WAVES waves"
echo ""

# Load shared context (used by all executors)
SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")
PLAN_CONTENT=$(cat "specs/${FEATURE}/PLAN.md")
RESEARCH_CONTENT=$(cat "specs/${FEATURE}/RESEARCH.md" 2>/dev/null || echo "")
```

### 5. Execute Tasks by Wave (Parallel Within Wave)

```bash
for WAVE_NUM in $(seq 1 $TOTAL_WAVES); do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► WAVE $WAVE_NUM/$TOTAL_WAVES"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Find all tasks in this wave
  WAVE_TASKS=$(grep -n "^### Task [0-9]" "specs/${FEATURE}/PLAN.md" | while read -r line; do
    TASK_LINE_NUM=$(echo "$line" | cut -d: -f1)
    TASK_NUM=$(echo "$line" | sed 's/.*Task \([0-9]*\):.*/\1/')

    # Check wave number for this task
    TASK_WAVE=$(sed -n "${TASK_LINE_NUM},/^---$/p" "specs/${FEATURE}/PLAN.md" | grep "^\*\*Wave:\*\*" | awk '{print $2}')

    if [ "$TASK_WAVE" = "$WAVE_NUM" ]; then
      echo "$TASK_NUM"
    fi
  done)

  WAVE_TASK_COUNT=$(echo "$WAVE_TASKS" | wc -w | xargs)

  if [ "$WAVE_TASK_COUNT" -eq 0 ]; then
    continue
  fi

  echo "Tasks in wave: $WAVE_TASK_COUNT"
  echo ""

  # Extract task content for each task in wave
  declare -A TASK_CONTENTS
  declare -A TASK_NAMES

  for TASK_NUM in $WAVE_TASKS; do
    # Extract task from PLAN.md
    TASK_START=$(grep -n "^### Task $TASK_NUM:" "specs/${FEATURE}/PLAN.md" | cut -d: -f1)
    TASK_END=$(grep -n "^### Task $((TASK_NUM + 1)):" "specs/${FEATURE}/PLAN.md" | cut -d: -f1)

    if [ -z "$TASK_END" ]; then
      # Last task - go to end of file
      TASK_CONTENT=$(sed -n "${TASK_START},\$p" "specs/${FEATURE}/PLAN.md")
    else
      TASK_CONTENT=$(sed -n "${TASK_START},$((TASK_END - 1))p" "specs/${FEATURE}/PLAN.md")
    fi

    TASK_CONTENTS[$TASK_NUM]="$TASK_CONTENT"
    TASK_NAMES[$TASK_NUM]=$(echo "$TASK_CONTENT" | grep "^### Task" | sed "s/### Task $TASK_NUM: //")

    echo "  Task $TASK_NUM: ${TASK_NAMES[$TASK_NUM]}"
  done

  echo ""
  echo "Spawning executors in parallel..."
  echo ""
```

For each task in the wave, spawn executor agent. Multiple Task() calls in single message execute in parallel:

```python
# Pseudocode showing parallel pattern:
# for task_num in wave_tasks:
#   Task(prompt=..., subagent_type="flow:executor", ...)
# All spawn simultaneously, block until all complete
```

For now, execute sequentially within wave (parallel execution requires orchestrator enhancement):

```bash
for TASK_NUM in $WAVE_TASKS; do
  echo "━━ Task $TASK_NUM: ${TASK_NAMES[$TASK_NUM]}"

  # Check if task uses TDD mode
  TASK_TDD=$(echo "${TASK_CONTENTS[$TASK_NUM]}" | grep "^\*\*TDD:\*\*" | awk '{print $2}')
  if [ "$TASK_TDD" = "true" ]; then
    echo "   Mode: TDD (RED-GREEN-REFACTOR)"
  fi

  echo ""
```

Task(
  prompt="Execute Task $TASK_NUM of $TOTAL_TASKS (Wave $WAVE_NUM) for feature: $FEATURE

<task>
${TASK_CONTENTS[$TASK_NUM]}
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
2. Check task TDD field: if \"TDD: true\", follow TDD Mode section (RED-GREEN-REFACTOR cycle)
3. If TDD mode: Write failing test first (RED), implement to pass (GREEN), optionally refactor
4. If standard mode: Implement task according to actions listed
5. Honor Implementation Decisions from SPEC.md Context section
6. Follow research recommendations (use standard stack, don't hand-roll solutions)
7. Apply deviation rules automatically (executor.md: Rules 1-3 auto-fix, Rule 4 pause)
8. Write/run tests according to verification criteria (section 3.4 of executor.md)
9. Tests MUST be green before committing (run npm test or appropriate test command)
10. Create atomic commits: TDD mode = 2-3 commits (RED, GREEN, REFACTOR), standard mode = 1 commit
11. Document any deviations in response (bug fixes, missing critical items, blockers fixed)
12. Return structured response: EXECUTION COMPLETE | EXECUTION BLOCKED | EXECUTION FAILED
</instructions>

<output_format>
## EXECUTION COMPLETE
**Task:** $TASK_NUM - {name}
**Wave:** $WAVE_NUM
**Files modified:** {list}
**Tests:** {status - passed/created}
**Verification:** All criteria satisfied
**Commit:** {hash}

**Deviations:** {N} (if any)
{If deviations occurred, list them:}
- [Rule N - Type] {description}

OR

## EXECUTION BLOCKED
**Task:** $TASK_NUM - {name}
**Wave:** $WAVE_NUM
**Issue:** {description}
**Need:** {what would unblock}
**Reason:** {Why blocking - usually Rule 4: architectural change needed}

OR

## EXECUTION FAILED
**Task:** $TASK_NUM - {name}
**Wave:** $WAVE_NUM
**Error:** {error message}
**Attempts:** {N}
</output_format>
",
  subagent_type="flow:executor",
  model="$EXECUTOR_MODEL",
  description="Execute task $TASK_NUM: ${TASK_NAMES[$TASK_NUM]}"
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

echo ""
echo "✓ Wave $WAVE_NUM complete"
echo ""
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

# Goal-backward verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► GOAL VERIFICATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Verifying spec goal achieved (not just tasks completed)..."
echo ""

# Load context for verifier
SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")
PLAN_CONTENT=$(cat "specs/${FEATURE}/PLAN.md")
RESEARCH_CONTENT=$(cat "specs/${FEATURE}/RESEARCH.md" 2>/dev/null || echo "")
```

Task(
  prompt="Verify spec goal achievement for feature: $FEATURE

<spec>
$SPEC_CONTENT
</spec>

<plan>
$PLAN_CONTENT
</plan>

<research>
$RESEARCH_CONTENT
</research>

<instructions>
1. Read your role: Follow the flow:verifier agent documentation at ~/.claude/plugins/marketplaces/flow/agents/verifier.md
2. Extract the spec goal (what should be achieved, not task list)
3. Establish must-haves: truths, artifacts, key links
4. Verify each truth: exists, substantive, wired (3-level verification)
5. Verify artifacts exist and provide claimed functionality
6. Verify key links (integrations work)
7. Check test coverage
8. Create VERIFICATION.md in specs/${FEATURE}/ directory
9. Return: VERIFICATION COMPLETE with status (VERIFIED/PARTIAL/FAILED)
</instructions>

<output_format>
Create specs/${FEATURE}/VERIFICATION.md with your findings

Return summary:
## VERIFICATION COMPLETE
**Feature:** $FEATURE
**Status:** VERIFIED | PARTIAL | FAILED
**Report:** specs/${FEATURE}/VERIFICATION.md
**Truths verified:** {N} of {M}
**Gaps:** {N} (if any)

{If PARTIAL or FAILED, list gaps with impact levels}
</output_format>
",
  subagent_type="flow:verifier",
  model="$VERIFIER_MODEL",
  description="Verify $FEATURE goal achievement"
)

```bash
# Check verifier output
if grep -q "## VERIFICATION COMPLETE" <<< "$VERIFIER_OUTPUT"; then
  STATUS=$(echo "$VERIFIER_OUTPUT" | grep "Status:" | awk '{print $2}')

  echo "Verification status: $STATUS"

  if [ "$STATUS" = "VERIFIED" ]; then
    echo "✓ All must-haves verified"
  elif [ "$STATUS" = "PARTIAL" ]; then
    echo "⚠ Core functionality exists but has gaps"
    echo ""
    echo "$VERIFIER_OUTPUT" | sed -n '/Gaps:/,/^$/p'
  elif [ "$STATUS" = "FAILED" ]; then
    echo "✗ Critical functionality missing"
    echo ""
    echo "$VERIFIER_OUTPUT"
    echo ""
    echo "Fix gaps before marking as IMPLEMENTED"
    exit 1
  fi

  echo ""
else
  echo "✗ Verification failed to complete"
  exit 1
fi
```

### 7. Update SPEC.md

```bash
# Update status
sed -i 's/^status: ACTIVE/status: IMPLEMENTED/' "specs/${FEATURE}/SPEC.md"

# Commit spec update and verification
git add "specs/${FEATURE}/SPEC.md"
git add "specs/${FEATURE}/VERIFICATION.md"
git commit -m "docs(flow): mark $FEATURE as IMPLEMENTED

All $TOTAL_TASKS tasks completed
Tests passing
Verification: $STATUS
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
