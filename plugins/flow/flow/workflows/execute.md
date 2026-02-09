# Execution Workflow

Orchestrates execution of PLAN.md tasks with progress tracking and verification.

## Inputs

- `feature` - Feature path (e.g., "auth/session")
- `task_num` - Specific task to execute (optional, executes all if not specified)

## Outputs

- Code implemented
- Tests written and passing
- Atomic commits per task
- SPEC.md updated
- Post-execution gate presented

## Process

### 1. Validate Prerequisites

```bash
FEATURE="$1"
TASK_NUM="${2:-all}"

# Check PLAN.md exists
if [ ! -f "specs/${FEATURE}/PLAN.md" ]; then
  echo "Error: No plan found. Run /flow:plan first"
  exit 1
fi

# Check SPEC.md status
STATUS=$(grep "^status:" "specs/${FEATURE}/SPEC.md" | awk '{print $2}')
if [ "$STATUS" = "IMPLEMENTED" ]; then
  echo "Warning: Spec already marked as IMPLEMENTED"
  # Offer: Re-implement | Skip
fi

# Check dependencies satisfied
source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

echo "Checking dependencies..."
if ! check_dependencies_satisfied "$FEATURE" 2>&1; then
  echo ""
  echo "Dependencies not satisfied. Implement them first."
  exit 1
fi

# Check working directory clean
if ! git diff-index --quiet HEAD --; then
  echo "Error: Working directory has uncommitted changes"
  echo "Commit or stash changes before execution"
  exit 1
fi
```

### 2. Parse PLAN.md

```bash
# Extract task count
TOTAL_TASKS=$(grep "^### Task [0-9]" "specs/${FEATURE}/PLAN.md" | wc -l | tr -d ' ')

echo "Plan has $TOTAL_TASKS tasks"

# Extract wave count
TOTAL_WAVES=$(grep "^\*\*Wave:\*\*" "specs/${FEATURE}/PLAN.md" | sort -u | wc -l | tr -d ' ')

echo "Organized in $TOTAL_WAVES waves"
```

### 3. Create Progress Tracker

```bash
PROGRESS_FILE="specs/${FEATURE}/PROGRESS.md"

cat > "$PROGRESS_FILE" <<EOF
# Execution Progress: $FEATURE

**Started:** $(date)
**Total tasks:** $TOTAL_TASKS
**Current:** Task 0/$TOTAL_TASKS

## Status
⏳ In progress

## Tasks
EOF

# Add each task
for i in $(seq 1 $TOTAL_TASKS); do
  TASK_NAME=$(sed -n "/^### Task $i:/p" "specs/${FEATURE}/PLAN.md" | sed "s/### Task $i: //")
  echo "- [ ] Task $i: $TASK_NAME" >> "$PROGRESS_FILE"
done
```

### 4. Execute Tasks

```bash
for TASK_NUM in $(seq 1 $TOTAL_TASKS); do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► TASK $TASK_NUM/$TOTAL_TASKS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Extract task details from PLAN.md
  TASK_CONTENT=$(sed -n "/^### Task $TASK_NUM:/,/^### Task $((TASK_NUM + 1)):/p" "specs/${FEATURE}/PLAN.md")

  # Display task summary
  TASK_NAME=$(echo "$TASK_CONTENT" | grep "^### Task" | sed "s/### Task $TASK_NUM: //")
  TASK_OBJECTIVE=$(echo "$TASK_CONTENT" | sed -n '/^\*\*Objective:\*\*/,/^\*\*[A-Z]/p' | sed '1d;$d')

  echo "Task: $TASK_NAME"
  echo "Objective: $TASK_OBJECTIVE"
  echo ""

  # Load context for executor
  SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")
  RESEARCH_CONTENT=$(cat "specs/${FEATURE}/RESEARCH.md" 2>/dev/null || echo "")

  # Build executor prompt
  EXECUTOR_PROMPT="..."

  # Spawn executor agent
  # Task(subagent_type="general-purpose", model="sonnet", ...)

  # Check executor response
  if grep -q "## EXECUTION COMPLETE" <<< "$EXECUTOR_OUTPUT"; then
    # Task successful
    echo "✓ Task $TASK_NUM complete"

    # Update progress
    sed -i "s/- \[ \] Task $TASK_NUM:/- [x] Task $TASK_NUM:/" "$PROGRESS_FILE"

  elif grep -q "## EXECUTION BLOCKED" <<< "$EXECUTOR_OUTPUT"; then
    # Task blocked
    echo "✗ Task $TASK_NUM blocked"

    # Extract blocker info
    BLOCKER=$(echo "$EXECUTOR_OUTPUT" | sed -n '/## EXECUTION BLOCKED/,/^##/p')

    # Present to user
    echo "$BLOCKER"

    # Offer options
    # AskUserQuestion: Fix | Skip | Abort
    break

  elif grep -q "## EXECUTION FAILED" <<< "$EXECUTOR_OUTPUT"; then
    # Task failed
    echo "✗ Task $TASK_NUM failed"

    # Offer retry or abort
    break
  fi
done
```

### 5. Mid-Execution Gate (Optional)

Configured per user preference:

```bash
MID_EXEC_GATE=$(cat .flow/config.json 2>/dev/null | grep '"mid_execution_gate"' | grep -o 'true\|false' || echo "false")

if [ "$MID_EXEC_GATE" = "true" ]; then
  # Present gate after each task
  # AskUserQuestion: Continue | Review changes | Pause
fi
```

### 6. Final Verification

After all tasks complete:

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► VERIFYING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run tests
echo "Running tests..."
npm test || {
  echo "✗ Tests failed"
  # Offer: Fix tests | Continue anyway
}

# Check must-haves from PLAN.md
echo "Verifying must-haves..."

# Extract and check each must-have
# (Would parse PLAN.md and verify programmatically)

echo "✓ All must-haves verified"
```

### 7. Update SPEC.md

```bash
# Update Files section
FILES_CREATED=$(git diff --name-only $(git rev-list --max-parents=0 HEAD)..)

# Update SPEC.md
# (Would programmatically update Files and Tests sections)

# Update status
sed -i 's/^status: ACTIVE/status: IMPLEMENTED/' "specs/${FEATURE}/SPEC.md"

# Commit spec update
git add "specs/${FEATURE}/SPEC.md"
git commit -m "docs(flow): mark $FEATURE as IMPLEMENTED

All tasks completed and verified
Status: ACTIVE → IMPLEMENTED
"
```

### 8. Cleanup Progress File

```bash
rm "$PROGRESS_FILE"
```

### 9. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► EXECUTION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Feature:** {feature}
**Tasks completed:** {N}/{N}
**Commits:** {N}
**Tests:** {Passed}/{Total} passing

### What Was Built
{Summary from executor}

### Files Created/Modified
- {file1}
- {file2}

**Status:** IMPLEMENTED ✓

───────────────────────────────────────────────────────
```

### 10. Post-Execution Gate

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Execution complete! What do you want to do?"
- options:
  - "Verify" — Run verification to ensure spec fully satisfied (Recommended)
  - "Review changes" — Show me what was built
  - "Done" — Mark complete and move on
```

## Parallel Execution (Parent Spec)

When executing parent spec:

```bash
# Get execution waves
source ~/.claude/plugins/marketplaces/flow/flow/lib/dependencies.sh

WAVES=$(compute_waves "specs/${FEATURE}")

# Execute wave by wave
WAVE_NUM=1
while read -r wave_line; do
  WAVE_SPECS=$(echo "$wave_line" | cut -d: -f2)

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► WAVE $WAVE_NUM"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Executing: $WAVE_SPECS"
  echo ""

  # Execute each spec in wave (sequentially for now, could be parallel)
  for SPEC in $WAVE_SPECS; do
    /flow:execute "$SPEC"
  done

  ((WAVE_NUM++))
done <<< "$WAVES"
```

## Error Handling

### Task Blocked
```
Pause execution, present blocker to user
Options: Provide context | Skip task | Abort
```

### Task Failed
```
Show error, offer:
- Retry (max 3 times)
- Skip task (mark as incomplete)
- Abort execution (rollback or leave as-is)
```

### Tests Failed
```
Show test output, offer:
- Fix tests
- Continue without tests (not recommended)
- Abort execution
```

### Unmet Must-Have
```
Show which must-have failed, offer:
- Fix implementation
- Adjust spec (may need re-planning)
- Mark as incomplete (status stays ACTIVE)
```

## Success Criteria

- [ ] All tasks executed in order
- [ ] Each task verified before proceeding
- [ ] Atomic commits created
- [ ] Tests written and passing
- [ ] Must-haves verified
- [ ] SPEC.md updated (files, tests, status)
- [ ] Progress file cleaned up
- [ ] Post-execution gate presented
