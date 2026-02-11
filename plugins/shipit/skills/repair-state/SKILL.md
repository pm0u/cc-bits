---
name: shipit:repair-state
description: Reconcile project state from git history when files get corrupted or out of sync
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
Diagnose and repair inconsistencies in SHIPIT project state by:
1. Running full validation checks
2. Identifying all issues
3. Auto-fixing safe issues
4. Prompting user for decisions on risky fixes
5. Reconstructing state from git history when needed

This is the "fix my project state" command.
</objective>

<execution_context>
@~/.claude/plugins/marketplaces/shipit/shipit/references/state-validation.md
</execution_context>

<process>

<step name="verify_project">
**Verify this is a SHIPIT project:**

```bash
test -d .planning && echo "found" || echo "missing"
```

If missing:
```
No .planning directory found. This doesn't appear to be a SHIPIT project.

To initialize: /shipit:new-project
```
Exit.
</step>

<step name="run_diagnostics">
**Run full diagnostic checks:**

Display header:
```
## State Repair Diagnostics

Running full validation...
```

**Check 1: Core files exist**
```bash
echo "=== Core Files ==="
test -f .planning/STATE.md && echo "✓ STATE.md" || echo "✗ STATE.md MISSING"
test -f .planning/ROADMAP.md && echo "✓ ROADMAP.md" || echo "✗ ROADMAP.md MISSING"
test -f .planning/PROJECT.md && echo "✓ PROJECT.md" || echo "✗ PROJECT.md MISSING"
test -f .planning/config.json && echo "✓ config.json" || echo "✗ config.json MISSING"
```

**Check 2: Position accuracy**
```bash
echo "=== Position Check ==="
CLAIMED_PHASE=$(grep -E "^Phase:" .planning/STATE.md 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "?")
CLAIMED_PLAN=$(grep -E "^Plan:" .planning/STATE.md 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "?")

PHASE_DIR=$(ls -d .planning/phases/${CLAIMED_PHASE}-* .planning/phases/0${CLAIMED_PHASE}-* 2>/dev/null | head -1)
ACTUAL_PLANS=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_SUMMARIES=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')

echo "Claimed: Phase $CLAIMED_PHASE, Plan $CLAIMED_PLAN"
echo "Actual: $ACTUAL_SUMMARIES/$ACTUAL_PLANS plans complete in phase"

if [ "$CLAIMED_PLAN" -gt "$((ACTUAL_SUMMARIES + 1))" ]; then
  echo "⚠ DRIFT: STATE claims more progress than exists"
else
  echo "✓ Position matches artifacts"
fi
```

**Check 3: Uncommitted changes**
```bash
echo "=== Uncommitted Changes ==="
UNCOMMITTED=$(git status --porcelain -- .planning/ 2>/dev/null)
if [ -n "$UNCOMMITTED" ]; then
  echo "⚠ Found uncommitted changes:"
  echo "$UNCOMMITTED"
else
  echo "✓ No uncommitted changes"
fi
```

**Check 4: Git consistency**
```bash
echo "=== Git Consistency ==="
LAST_COMMIT=$(git log -1 --format="%h %s" -- .planning/ 2>/dev/null)
echo "Last commit: $LAST_COMMIT"

# Check for resets/reverts in recent history
REVERTS=$(git log --oneline -20 -- .planning/ | grep -iE "revert|reset|undo" | head -3)
if [ -n "$REVERTS" ]; then
  echo "⚠ Recent reverts/resets detected:"
  echo "$REVERTS"
else
  echo "✓ No recent reverts detected"
fi
```

**Check 5: Config validity**
```bash
echo "=== Config Validation ==="
if [ -f .planning/config.json ]; then
  # Try to parse JSON
  if node -e "JSON.parse(require('fs').readFileSync('.planning/config.json'))" 2>/dev/null; then
    echo "✓ Valid JSON"
  else
    echo "✗ Invalid JSON - config.json is corrupted"
  fi
else
  echo "⚠ config.json missing"
fi
```

**Check 6: Phase directory integrity**
```bash
echo "=== Phase Directories ==="
for dir in .planning/phases/*/; do
  PHASE_NUM=$(basename "$dir" | grep -oE "^[0-9]+")
  PLANS=$(ls -1 "$dir"*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
  SUMMARIES=$(ls -1 "$dir"*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
  echo "Phase $PHASE_NUM: $SUMMARIES/$PLANS complete"
done
```
</step>

<step name="collect_issues">
**Categorize issues found:**

Build lists:
- `auto_fixable`: Issues that can be safely auto-repaired
- `needs_decision`: Issues requiring user input
- `info_only`: Warnings that don't need action

**Auto-fixable:**
- Position drift (STATE shows wrong plan number)
- Missing config fields (add defaults)
- Stale "Last activity" timestamp

**Needs decision:**
- Uncommitted changes
- Missing core files (STATE.md, ROADMAP.md)
- Invalid config JSON
- Detected reverts in git history
</step>

<step name="report_findings">
**Present diagnostic report:**

```
## Diagnostic Results

### Issues Found

**Auto-fixable ({count}):**
{list of auto-fixable issues with descriptions}

**Requires Decision ({count}):**
{list of issues needing user input}

**Warnings ({count}):**
{informational warnings}

---
```

If no issues:
```
## ✓ State Validated

No issues found. Project state is consistent.
```
Exit.
</step>

<step name="auto_repair">
**Apply automatic fixes:**

For each auto-fixable issue:

**Position drift:**
```bash
# Calculate correct position
CORRECT_PLAN=$((ACTUAL_SUMMARIES + 1))

# Update STATE.md
sed -i '' "s/^Plan: .*/Plan: $CORRECT_PLAN of $ACTUAL_PLANS/" .planning/STATE.md
```

**Missing config fields:**
```bash
# Read current config, add missing fields with defaults
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('.planning/config.json'));
const defaults = {
  mode: 'interactive',
  depth: 'standard',
  model_profile: 'balanced',
  workflow: { research: true, plan_check: true, verifier: true },
  parallelization: { enabled: true, max_concurrent_agents: 3 }
};
const merged = { ...defaults, ...config };
fs.writeFileSync('.planning/config.json', JSON.stringify(merged, null, 2));
"
```

**Stale timestamp:**
```bash
TODAY=$(date +%Y-%m-%d)
sed -i '' "s/^Last activity: .*/Last activity: $TODAY - State repaired/" .planning/STATE.md
```

Report each fix:
```
✓ Fixed: Position updated to Plan 3 (was 5)
✓ Fixed: Added missing config fields
✓ Fixed: Updated last activity timestamp
```
</step>

<step name="user_decisions">
**Handle issues requiring user decision:**

Use AskUserQuestion for each:

**Uncommitted changes:**
```
Found uncommitted changes in .planning/:
{list of files}

What would you like to do?
```
Options:
- "Commit changes" - Stage and commit as recovery
- "Discard changes" - git checkout to discard
- "Review first" - Show diff then ask again

**Missing STATE.md:**
```
STATE.md is missing. This tracks project position and decisions.

How should I proceed?
```
Options:
- "Reconstruct from artifacts" - Analyze SUMMARYs and git to rebuild
- "Start fresh" - Create minimal STATE.md

**Invalid config.json:**
```
config.json contains invalid JSON and cannot be parsed.

How should I proceed?
```
Options:
- "Reset to defaults" - Replace with default config
- "Show contents" - Display raw file for manual fix

**Git revert detected:**
```
Git history shows recent revert/reset operations.
The project state may not match what STATE.md claims.

How should I proceed?
```
Options:
- "Trust git HEAD" - Reconstruct state from current files
- "Investigate" - Show git log for manual review
</step>

<step name="reconstruct_state">
**If reconstructing STATE.md from artifacts:**

```bash
# Find highest phase with work
LATEST_PHASE=$(ls -d .planning/phases/*/ 2>/dev/null | tail -1 | xargs basename | grep -oE "^[0-9]+")

# Count completed in that phase
PHASE_DIR=".planning/phases/$(ls .planning/phases | grep "^$LATEST_PHASE-" | head -1)"
COMPLETED=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')

# Get project name from PROJECT.md
PROJECT_NAME=$(grep -m1 "^# " .planning/PROJECT.md | sed 's/^# //')

# Get phase name from directory
PHASE_NAME=$(basename "$PHASE_DIR" | sed 's/^[0-9]*-//')
```

Generate STATE.md:
```markdown
# {PROJECT_NAME} — Living Memory

## Current Position

Phase: {LATEST_PHASE} of {TOTAL_PHASES} ({PHASE_NAME})
Plan: {COMPLETED + 1} of {TOTAL}
Status: In progress
Last activity: {TODAY} - Reconstructed by repair-state

Progress: {calculate progress bar}

## Accumulated Decisions

(Reconstructed - review SUMMARY.md files for historical decisions)

## Session Continuity

Last session: {TODAY}
Stopped at: State reconstructed from artifacts
Resume file: None
```
</step>

<step name="final_validation">
**Re-run validation after repairs:**

```bash
# Quick validation
test -f .planning/STATE.md || exit 1
CLAIMED=$(grep -E "^Plan:" .planning/STATE.md | grep -oE "[0-9]+" | head -1)
ACTUAL=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
[ "$CLAIMED" -le "$((ACTUAL + 1))" ] || exit 1
```

**If passes:**
```
## ✓ State Repaired

All issues resolved. Project state is now consistent.

**Summary of repairs:**
{list of fixes applied}

Ready to continue: /shipit:go
```

**If fails:**
```
## ⚠ Repair Incomplete

Some issues could not be automatically resolved.
Manual intervention required.

Remaining issues:
{list of unresolved issues}
```
</step>

<step name="commit_repairs">
**Commit repair changes:**

```bash
git add .planning/STATE.md .planning/config.json
git commit -m "fix: repair project state

Repaired by /shipit:repair-state:
{list of fixes}

Co-Authored-By: Claude <noreply@anthropic.com>"
```
</step>

</process>

<success_criteria>
- [ ] All diagnostic checks run
- [ ] Issues categorized correctly
- [ ] Auto-fixes applied safely
- [ ] User decisions collected for risky fixes
- [ ] State reconstruction accurate (if needed)
- [ ] Final validation passes
- [ ] Repairs committed to git
</success_criteria>
