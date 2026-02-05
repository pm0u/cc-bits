---
name: fuckit:undo
description: Rollback a completed plan by reverting git commits, removing SUMMARY.md, and updating STATE.md
argument-hint: "<plan-id> [--keep-plan]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

<objective>
Safely undo a completed plan by:
1. Identifying all commits from that plan
2. Reverting those commits (preserving history)
3. Removing the SUMMARY.md
4. Updating STATE.md position
5. Optionally keeping PLAN.md for re-execution

Use when a plan was executed incorrectly or needs to be redone.
</objective>

<arguments>
- `plan-id`: The plan identifier (e.g., "03-02" for phase 3, plan 2)
- `--keep-plan`: Keep the PLAN.md file for re-execution (default: keep)
- `--delete-plan`: Also delete the PLAN.md file
</arguments>

<process>

<step name="parse_arguments">
**Parse plan identifier:**

```bash
# Expected format: XX-YY (phase-plan)
PLAN_ID="$1"
PHASE_NUM=$(echo "$PLAN_ID" | cut -d'-' -f1)
PLAN_NUM=$(echo "$PLAN_ID" | cut -d'-' -f2)

# Validate format
if ! echo "$PLAN_ID" | grep -qE "^[0-9]+-[0-9]+$"; then
  echo "Invalid plan ID format. Expected: XX-YY (e.g., 03-02)"
  exit 1
fi
```

**Find phase directory:**

```bash
PADDED_PHASE=$(printf "%02d" $PHASE_NUM)
PHASE_DIR=$(ls -d .planning/phases/${PADDED_PHASE}-* .planning/phases/${PHASE_NUM}-* 2>/dev/null | head -1)

if [ -z "$PHASE_DIR" ]; then
  echo "Phase $PHASE_NUM not found"
  exit 1
fi
```

**Find plan files:**

```bash
PLAN_FILE=$(ls "$PHASE_DIR"/${PADDED_PHASE}-${PLAN_NUM}-PLAN.md "$PHASE_DIR"/${PHASE_NUM}-${PLAN_NUM}-PLAN.md 2>/dev/null | head -1)
SUMMARY_FILE=$(ls "$PHASE_DIR"/${PADDED_PHASE}-${PLAN_NUM}-SUMMARY.md "$PHASE_DIR"/${PHASE_NUM}-${PLAN_NUM}-SUMMARY.md 2>/dev/null | head -1)

if [ -z "$SUMMARY_FILE" ] || [ ! -f "$SUMMARY_FILE" ]; then
  echo "Plan $PLAN_ID has not been executed (no SUMMARY.md found)"
  exit 1
fi
```
</step>

<step name="identify_commits">
**Find all commits from this plan:**

Commits follow the pattern: `{type}({plan-id}): {description}`

```bash
# Get all commits for this plan
PLAN_COMMITS=$(git log --oneline --all --grep="(${PLAN_ID})" --grep="(${PADDED_PHASE}-${PLAN_NUM})" | head -20)

# Count commits
COMMIT_COUNT=$(echo "$PLAN_COMMITS" | grep -c "^" || echo "0")

# Get the commit range
FIRST_COMMIT=$(echo "$PLAN_COMMITS" | tail -1 | cut -d' ' -f1)
LAST_COMMIT=$(echo "$PLAN_COMMITS" | head -1 | cut -d' ' -f1)

# Get the commit before the plan started
BEFORE_PLAN=$(git rev-parse "${FIRST_COMMIT}^" 2>/dev/null)
```

**Display commits to be reverted:**

```
## Plan $PLAN_ID Commits

Found {COMMIT_COUNT} commits to revert:

{PLAN_COMMITS formatted as table}

Commit range: {FIRST_COMMIT}..{LAST_COMMIT}
```
</step>

<step name="check_dependencies">
**Check if later plans depend on this one:**

```bash
# Find plans executed after this one in same phase
LATER_SUMMARIES=$(ls "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | while read f; do
  FPLAN=$(basename "$f" | grep -oE "[0-9]+-[0-9]+" | cut -d'-' -f2)
  [ "$FPLAN" -gt "$PLAN_NUM" ] && echo "$f"
done)

# Check other phases that might depend
LATER_PHASES=$(ls -d .planning/phases/*/ 2>/dev/null | while read d; do
  DPHASE=$(basename "$d" | grep -oE "^[0-9]+")
  [ "$DPHASE" -gt "$PHASE_NUM" ] && ls "$d"/*-SUMMARY.md 2>/dev/null
done)
```

**If dependencies found:**

```
⚠ Warning: Later work may depend on this plan

Plans executed after {PLAN_ID}:
{list of later summaries}

Reverting this plan may break later work.
```

Use AskUserQuestion:
- "Continue anyway" - Proceed with undo (user accepts risk)
- "Cancel" - Abort undo operation
</step>

<step name="confirm_undo">
**Get user confirmation:**

```
## Confirm Undo

**Plan:** {PLAN_ID}
**Commits:** {COMMIT_COUNT}
**Files affected:** {count from git}

This will:
1. Revert {COMMIT_COUNT} commits (creates new revert commits)
2. Delete {SUMMARY_FILE}
3. Update STATE.md position to Plan {PLAN_NUM}
{if --keep-plan} 4. Keep PLAN.md for re-execution
{if --delete-plan} 4. Delete PLAN.md

**This cannot be easily undone.** (Though git reflog can recover)
```

Use AskUserQuestion:
- "Confirm undo" - Proceed with rollback
- "Cancel" - Abort
</step>

<step name="execute_rollback">
**Perform the rollback:**

**Step 1: Revert commits (newest to oldest)**

```bash
# Revert each commit, creating new revert commits
# This preserves history (safer than reset)
for commit in $(echo "$PLAN_COMMITS" | cut -d' ' -f1); do
  git revert --no-edit "$commit" || {
    echo "Revert conflict at $commit. Manual resolution needed."
    exit 1
  }
done
```

**Alternative: Soft reset (if user prefers clean history)**

Only offer if user explicitly requests:
```bash
# This rewrites history - only for local branches
git reset --soft "$BEFORE_PLAN"
git commit -m "undo(${PLAN_ID}): rollback plan execution

Rolled back commits:
$(echo "$PLAN_COMMITS" | sed 's/^/- /')
"
```

**Step 2: Remove SUMMARY.md**

```bash
rm "$SUMMARY_FILE"
git add "$SUMMARY_FILE"
git commit -m "undo(${PLAN_ID}): remove summary

Plan rolled back, SUMMARY.md removed."
```

**Step 3: Optionally remove PLAN.md**

If `--delete-plan` flag:
```bash
rm "$PLAN_FILE"
git add "$PLAN_FILE"
git commit --amend --no-edit  # Combine with summary removal
```
</step>

<step name="update_state">
**Update STATE.md:**

```bash
# Calculate new position
NEW_PLAN=$PLAN_NUM
TOTAL_PLANS=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
COMPLETED_PLANS=$((PLAN_NUM - 1))

# Update STATE.md
# Read current STATE.md and update position
```

Update the following in STATE.md:
- `Plan: {NEW_PLAN} of {TOTAL_PLANS}`
- `Status: In progress`
- `Last activity: {TODAY} - Rolled back plan {PLAN_ID}`

```bash
# Use sed or edit tool to update
sed -i '' "s/^Plan: .*/Plan: $NEW_PLAN of $TOTAL_PLANS/" .planning/STATE.md
sed -i '' "s/^Status: .*/Status: In progress/" .planning/STATE.md

TODAY=$(date +%Y-%m-%d)
sed -i '' "s/^Last activity: .*/Last activity: $TODAY - Rolled back plan $PLAN_ID/" .planning/STATE.md

git add .planning/STATE.md
git commit -m "undo(${PLAN_ID}): update state position

Position reset to Plan $NEW_PLAN."
```
</step>

<step name="update_roadmap">
**Update ROADMAP.md progress (if tracked there):**

```bash
# If ROADMAP tracks plan completion, update it
# This varies by ROADMAP format
```

Mark the plan as incomplete in ROADMAP if completion is tracked there.
</step>

<step name="record_metrics">
**Record undo in metrics (if enabled):**

```bash
if [ -f .planning/metrics.json ]; then
  # Update undo count
  node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('.planning/metrics.json'));
  m.undos = (m.undos || 0) + 1;
  m.last_undo = { plan: '$PLAN_ID', date: '$(date -Iseconds)' };
  fs.writeFileSync('.planning/metrics.json', JSON.stringify(m, null, 2));
  "
fi
```
</step>

<step name="report_completion">
**Report success:**

```
## ✓ Undo Complete

**Plan {PLAN_ID} has been rolled back.**

**Actions taken:**
- Reverted {COMMIT_COUNT} commits
- Removed SUMMARY.md
- Updated STATE.md to Plan {NEW_PLAN}
{if kept plan} - PLAN.md preserved for re-execution

**Git history:**
{show last 5 commits}

**Next steps:**
- `/fuckit:execute-phase {PHASE_NUM}` — re-run the plan
- `/fuckit:plan-phase {PHASE_NUM}` — replan if approach was wrong
- `/fuckit:progress` — check current status
```
</step>

</process>

<edge_cases>

**Merge conflicts during revert:**
If git revert fails due to conflicts:
```
Revert conflict encountered.

The changes from Plan {PLAN_ID} conflict with later changes.

Options:
1. Resolve conflicts manually, then run: git revert --continue
2. Abort the undo: git revert --abort
3. Try reset instead (rewrites history): /fuckit:undo {PLAN_ID} --hard-reset
```

**Plan not yet executed:**
```
Plan {PLAN_ID} has no SUMMARY.md - it hasn't been executed yet.
Nothing to undo.
```

**Last plan in phase:**
If undoing the only completed plan in a phase, offer to also remove CONTEXT.md and reset phase to "not started" state.

**Already pushed to remote:**
Warn user that reverting pushed commits will create divergent history:
```
⚠ These commits have been pushed to remote.

Reverting will create new commits that undo the changes.
This is safe but will show in git history.

For clean history, consider:
- git reset --hard (destructive, requires force push)
- Accept revert commits (safe, preserves history)
```

</edge_cases>

<success_criteria>
- [ ] Plan ID parsed correctly
- [ ] All plan commits identified
- [ ] Dependencies checked and user warned
- [ ] User confirmed before destructive action
- [ ] Commits reverted cleanly
- [ ] SUMMARY.md removed
- [ ] STATE.md updated to correct position
- [ ] Metrics recorded (if enabled)
- [ ] Clear report of what was done
</success_criteria>
