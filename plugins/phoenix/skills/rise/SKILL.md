---
name: phoenix:rise
description: Distill learnings from a stalled/failed attempt into ASHES.md, archive the attempt, and reset to a clean baseline for another try
argument-hint: "[baseline-commit] [--keep-spec]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - AskUserQuestion
---

<objective>
Analyze the current stalled or failed development attempt, distill learnings into ASHES.md, archive the attempt state, and reset the codebase to a clean baseline so spek/shipit can start fresh with accumulated knowledge.
</objective>

<context>
Arguments: $ARGUMENTS

Flags:
- `[baseline-commit]` — explicit commit hash to reset to. If omitted, auto-detected or asked.
- `--keep-spec` — preserve SPEC.md and specs/ directory through the reset (spec was sound, execution wasn't).
</context>

<process>

## Step 1: Assess Current State

Confirm there's something to distill.

```bash
# Check if .planning exists
ls .planning/ 2>/dev/null

# Check for any executed phases
ls .planning/phases/*/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' '

# Check for existing ASHES.md (prior attempts)
cat ASHES.md 2>/dev/null | head -5

# Check for user-authored root artifacts
ls PLAN.md PROJECT.md SPEC.md 2>/dev/null
```

**If no .planning/ or no summaries:** Nothing to distill. Inform user and exit.

**Determine attempt number:**

```bash
if [ -f ASHES.md ]; then
  # Count existing attempt sections
  LAST_ATTEMPT=$(grep -c "^## Attempt" ASHES.md)
  ATTEMPT_NUM=$((LAST_ATTEMPT + 1))
else
  ATTEMPT_NUM=1
fi
```

## Step 2: Determine Baseline Commit

The baseline is the commit to reset source code back to.

**If provided as argument:** Use it directly.

```bash
BASELINE="$1"
git log --oneline -1 "$BASELINE" 2>/dev/null
```

**If not provided, try auto-detection:**

```bash
# Check if config.json has a recorded baseline
BASELINE=$(node -e "
  const fs = require('fs');
  try {
    const c = JSON.parse(fs.readFileSync('.planning/config.json'));
    console.log(c.baseline_commit || '');
  } catch { console.log(''); }
" 2>/dev/null)

# If no config baseline, find the commit before first execution
if [ -z "$BASELINE" ]; then
  # Look for the first spek/shipit execution commit
  FIRST_EXEC=$(git log --oneline --reverse --all | grep -E "feat\(|fix\(|test\(" | head -1 | cut -d' ' -f1)
  if [ -n "$FIRST_EXEC" ]; then
    BASELINE=$(git rev-parse "${FIRST_EXEC}^" 2>/dev/null)
  fi
fi
```

**If still no baseline:** Ask the user.

```
AskUserQuestion(
  "I couldn't auto-detect the baseline commit (the state before spek/shipit started building).

  To find it, run: `git log --oneline | tail -20`

  Which commit hash should I reset to? This should be the last commit before any AI-generated code."
)
```

**Confirm with user regardless:**

Show the baseline commit and what will be reset:

```bash
echo "Baseline: $(git log --oneline -1 $BASELINE)"
echo ""
echo "Changes since baseline:"
git diff --stat "$BASELINE"..HEAD | tail -5
echo ""
echo "Commits since baseline:"
git log --oneline "$BASELINE"..HEAD | wc -l | tr -d ' '
```

```
AskUserQuestion(
  "Baseline commit: `{hash}` — {message}

  This will:
  1. Distill learnings from {N} commits into ASHES.md
  2. Archive current .planning/ to `archive/attempt-{N}` branch
  3. Reset source code to this commit
  4. Preserve: PLAN.md, PROJECT.md, ASHES.md {+ SPEC.md if --keep-spec}

  Proceed? (yes / different hash / cancel)"
)
```

## Step 3: Distill Learnings

Spawn the distiller agent to analyze the attempt and write ASHES.md.

```bash
# Gather context for distiller
PLANNING_TREE=$(find .planning -name "*.md" -type f 2>/dev/null | sort)
PHASE_PROGRESS=""
for dir in .planning/phases/*/; do
  plans=$(ls "$dir"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
  summaries=$(ls "$dir"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
  PHASE_PROGRESS="$PHASE_PROGRESS\n$(basename $dir): $plans plans, $summaries executed"
done
TOTAL_PHASES=$(ls -d .planning/phases/*/ 2>/dev/null | wc -l | tr -d ' ')
EXECUTED_PHASES=$(ls .planning/phases/*/*-SUMMARY.md 2>/dev/null | xargs -I{} dirname {} | sort -u | wc -l | tr -d ' ')
```

```
Task(
  prompt="Distill learnings from attempt {attempt_num}.

Baseline commit: {baseline}
Current HEAD: {head_hash}
Progress: {executed_phases} of {total_phases} phases have summaries

Phase progress:
{phase_progress}

Planning artifacts:
{planning_tree}

Analyze the attempt and write/update ASHES.md at the project root.
This is attempt {attempt_num}.",
  subagent_type="phoenix:distiller",
  model="sonnet"
)
```

**Verify ASHES.md was created/updated:**

```bash
test -f ASHES.md && echo "ASHES.md exists" || echo "ERROR: ASHES.md not created"
grep -c "^## Attempt" ASHES.md
```

## Step 4: Preserve Root Artifacts

Before archiving, copy user-authored artifacts that should survive the reset.

```bash
# Create temp dir for preserved files
PRESERVE_DIR=$(mktemp -d)

# Always preserve
cp ASHES.md "$PRESERVE_DIR/" 2>/dev/null
cp PLAN.md "$PRESERVE_DIR/" 2>/dev/null
cp PROJECT.md "$PRESERVE_DIR/" 2>/dev/null

# Conditionally preserve spec
if [ "$KEEP_SPEC" = "true" ]; then
  cp SPEC.md "$PRESERVE_DIR/" 2>/dev/null
  if [ -d specs ]; then
    cp -r specs "$PRESERVE_DIR/" 2>/dev/null
  fi
fi
```

## Step 5: Archive the Attempt

Create an archive branch that preserves the full state of this attempt.

```bash
# Ensure everything is committed before archiving
DIRTY=$(git status --porcelain)
if [ -n "$DIRTY" ]; then
  git add -A
  git commit -m "chore: capture uncommitted state before phoenix archive"
fi

# Create archive branch from current state
ARCHIVE_BRANCH="archive/attempt-${ATTEMPT_NUM}"
git branch "$ARCHIVE_BRANCH"

echo "Archived to branch: $ARCHIVE_BRANCH"
```

## Step 6: Reset to Baseline

Reset the codebase to the baseline commit, then restore preserved files.

```bash
# Reset to baseline
git reset --hard "$BASELINE"

# Restore preserved files
cp "$PRESERVE_DIR/ASHES.md" . 2>/dev/null
cp "$PRESERVE_DIR/PLAN.md" . 2>/dev/null
cp "$PRESERVE_DIR/PROJECT.md" . 2>/dev/null

if [ "$KEEP_SPEC" = "true" ]; then
  cp "$PRESERVE_DIR/SPEC.md" . 2>/dev/null
  if [ -d "$PRESERVE_DIR/specs" ]; then
    cp -r "$PRESERVE_DIR/specs" . 2>/dev/null
  fi
fi

# Clean up temp dir
rm -rf "$PRESERVE_DIR"
```

## Step 7: Commit the Phoenix State

```bash
# Stage preserved + new files
git add ASHES.md
git add PLAN.md 2>/dev/null
git add PROJECT.md 2>/dev/null

if [ "$KEEP_SPEC" = "true" ]; then
  git add SPEC.md 2>/dev/null
  git add specs/ 2>/dev/null
fi

git commit -m "phoenix: rise from attempt ${ATTEMPT_NUM}

Distilled learnings into ASHES.md. Source code reset to ${BASELINE}.
Full attempt state preserved on branch: ${ARCHIVE_BRANCH}

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Step 8: Report and Route

Output completion summary and next steps.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHOENIX ► RISEN FROM ATTEMPT {N}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Baseline:** `{hash}` — {message}
**Archive:** `{archive_branch}` (full attempt preserved)
**ASHES.md:** {N} learnings captured across {total_attempts} attempt(s)

**Preserved:**
- ASHES.md (learnings from all attempts)
- PLAN.md {if exists}
- PROJECT.md {if exists}
{- SPEC.md + specs/ (--keep-spec) | if applicable}

**Reset:**
- Source code → baseline
- .planning/ → removed (archived on branch)

───────────────────────────────────────────────────────────────

## What's Next

{If --keep-spec was used:}
Spec preserved — ready for a new milestone with better planning:

  /spek:new-milestone    — new roadmap informed by ASHES.md
  /shipit:new-milestone  — same, with shipit

{If spec was NOT kept:}
Clean slate — redefine the spec with accumulated knowledge:

  /spek:define           — new spec informed by ASHES.md
  /shipit:new-project    — full restart with shipit

{Always:}
Review learnings:

  cat ASHES.md           — see what was learned
  git log archive/attempt-{N} --oneline  — browse old attempt

───────────────────────────────────────────────────────────────
```

</process>

<error_handling>

**Dirty working tree at start:**
Warn user that uncommitted changes will be included in the archive. Ask to commit or stash first.

**Baseline commit not found:**
Ask user to provide a valid commit hash. Show recent history to help.

**Distiller fails:**
Report failure but still offer to archive and reset without ASHES.md. Learnings can be manually added later — don't block the reset on distillation.

**Archive branch already exists:**
Append timestamp: `archive/attempt-1-20260401`. Don't overwrite.

**ASHES.md write conflict:**
If ASHES.md exists but is malformed, back it up and create fresh. Existing content is on the archive branch.
</error_handling>
