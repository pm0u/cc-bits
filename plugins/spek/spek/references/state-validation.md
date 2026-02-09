# State Validation

Cross-check STATE.md against actual project artifacts to detect and handle inconsistencies.

<purpose>
State can become invalid when:
- Execution crashed mid-plan
- User manually edited files
- Git operations (reset, revert) changed history
- Context window expired mid-operation

Validation ensures we don't proceed with stale or incorrect state.
</purpose>

<validation_checks>

## Check 1: STATE.md Position vs Reality

**What:** Verify current phase/plan in STATE.md matches actual artifacts.

```bash
# Extract claimed position from STATE.md
CLAIMED_PHASE=$(grep -E "^Phase:" .planning/STATE.md | grep -oE "[0-9]+" | head -1)
CLAIMED_PLAN=$(grep -E "^Plan:" .planning/STATE.md | grep -oE "[0-9]+" | head -1)
CLAIMED_STATUS=$(grep -E "^Status:" .planning/STATE.md | head -1 | sed 's/Status: //')

# Find actual completed work
PHASE_DIR=$(ls -d .planning/phases/${CLAIMED_PHASE}-* .planning/phases/0${CLAIMED_PHASE}-* 2>/dev/null | head -1)
ACTUAL_SUMMARIES=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
ACTUAL_PLANS=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')

# Last completed plan number
LAST_COMPLETED=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | tail -1 | grep -oE "[0-9]+-[0-9]+" | cut -d'-' -f2)
```

**Validation:**
- If `CLAIMED_PLAN > ACTUAL_SUMMARIES + 1`: STATE claims more progress than exists
- If `CLAIMED_STATUS = "Complete"` but `ACTUAL_SUMMARIES < ACTUAL_PLANS`: Phase not actually complete

**Resolution:**
```
STATE.md claims Plan {CLAIMED_PLAN} but only {ACTUAL_SUMMARIES} summaries exist.
Correcting position to Plan {ACTUAL_SUMMARIES + 1}.
```

## Check 2: Git History Consistency

**What:** Verify last recorded activity matches git history.

```bash
# Get last activity from STATE.md
LAST_ACTIVITY=$(grep -E "^Last activity:" .planning/STATE.md | head -1)

# Get actual last commit touching phase directory
LAST_COMMIT=$(git log -1 --format="%h %s" -- "$PHASE_DIR" 2>/dev/null)
LAST_COMMIT_DATE=$(git log -1 --format="%ci" -- "$PHASE_DIR" 2>/dev/null | cut -d' ' -f1)
```

**Validation:**
- If STATE claims activity after last commit date: Time travel detected
- If git shows reverted commits: Work may have been undone

**Resolution:**
```
Git history shows revert/reset since last recorded activity.
Reconstructing state from current git HEAD.
```

## Check 3: Uncommitted Changes

**What:** Detect partially completed work not yet committed.

```bash
# Check for uncommitted changes in phase directory
UNCOMMITTED=$(git status --porcelain -- "$PHASE_DIR" 2>/dev/null | wc -l | tr -d ' ')

# Check for staged but uncommitted
STAGED=$(git diff --cached --name-only -- "$PHASE_DIR" 2>/dev/null | wc -l | tr -d ' ')
```

**Validation:**
- If uncommitted changes exist: Previous execution may have crashed
- Check if changes look like partial task completion

**Resolution:**
```
Found {UNCOMMITTED} uncommitted changes in phase directory.
Options:
1. Commit as recovery: git add && git commit -m "fix: recover partial work"
2. Discard and restart: git checkout -- .planning/phases/
3. Review manually: git diff
```

## Check 4: ROADMAP vs Phase Directories

**What:** Verify phase directories match ROADMAP.md definitions.

```bash
# Phases defined in ROADMAP
ROADMAP_PHASES=$(grep -oE "### Phase [0-9]+" .planning/ROADMAP.md | grep -oE "[0-9]+" | sort -n)

# Phase directories that exist
EXISTING_PHASES=$(ls -d .planning/phases/[0-9]*-* 2>/dev/null | xargs -I{} basename {} | grep -oE "^[0-9]+" | sort -n)
```

**Validation:**
- Missing phase directories: Roadmap references phases that don't exist
- Extra phase directories: Orphaned directories from removed phases

**Resolution:**
- Missing: Create directory structure
- Extra: Warn user (may be intentional backup)

## Check 5: Config Integrity

**What:** Verify config.json is valid and complete.

```bash
# Check JSON validity
node -e "JSON.parse(require('fs').readFileSync('.planning/config.json'))" 2>&1 && echo "valid" || echo "invalid"

# Check required fields
node -e "
const c = JSON.parse(require('fs').readFileSync('.planning/config.json'));
const required = ['mode', 'depth', 'model_profile'];
const missing = required.filter(k => !(k in c));
console.log(missing.length ? 'missing:' + missing.join(',') : 'complete');
"
```

**Resolution:**
- Invalid JSON: Attempt repair or regenerate defaults
- Missing fields: Add with defaults

</validation_checks>

<validation_workflow>

## When to Validate

**Always validate on:**
- `/spek:execute-phase` start
- `/spek:resume-work`
- `/spek:progress`
- `/spek:go`

**Quick validation (fast path):**
1. Check STATE.md exists
2. Check position matches SUMMARY count
3. Check no uncommitted changes

If quick validation passes, proceed. If fails, run full validation.

**Full validation:**
All 5 checks above, with user prompts for resolution.

## Validation Output

```
## State Validation

✓ Position: Phase 3, Plan 2 (verified)
✓ Git: Consistent with last commit
⚠ Uncommitted: 2 files with changes
✓ Roadmap: All phases have directories
✓ Config: Valid JSON with all fields

**Action Required:**
Uncommitted changes detected. Run /spek:repair-state to resolve.
```

</validation_workflow>

<auto_repair>

## Safe Auto-Repairs

These can be fixed automatically without user input:

1. **Position drift:** Update STATE.md to match actual SUMMARY count
2. **Missing config fields:** Add with defaults
3. **Stale session info:** Update "Last activity" to current

## Require User Confirmation

These need user decision:

1. **Uncommitted changes:** Commit, discard, or review
2. **Git revert detected:** Accept reverted state or restore
3. **Missing phase directories:** Create or update ROADMAP
4. **Invalid config JSON:** Regenerate (loses custom settings)

</auto_repair>

<integration>

## Adding to Workflows

Include state validation at workflow start:

```markdown
<step name="validate_state" priority="first">
**Validate project state before proceeding:**

Run quick validation:
```bash
# Quick checks
test -f .planning/STATE.md || { echo "missing_state"; exit 1; }
CLAIMED=$(grep -E "^Plan:" .planning/STATE.md | grep -oE "[0-9]+" | head -1)
ACTUAL=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
[ "$CLAIMED" -le "$((ACTUAL + 1))" ] || echo "position_drift"
git status --porcelain -- .planning/ | wc -l | tr -d ' ' | grep -q "^0$" || echo "uncommitted"
```

**If any issues detected:**
```
⚠ State validation found issues. Run /spek:repair-state before continuing.
```

Exit and wait for repair.
</step>
```

</integration>
