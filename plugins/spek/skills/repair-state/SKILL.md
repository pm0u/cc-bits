---
name: spek:repair-state
description: Reconcile project state from git history when files get corrupted or out of sync
allowed-tools:
  - Write
  - Bash
  - AskUserQuestion
---

<objective>
Diagnose and repair inconsistencies in SPEK project state by:
1. Running full validation checks via CLI
2. Identifying all issues
3. Auto-fixing safe issues
4. Prompting user for decisions on risky fixes
5. Reconstructing state from git history when needed

This is the "fix my project state" command.
</objective>

<execution_context>
Uses CLI delegation (GSD v1.16.0 pattern) for state validation.
The spek-tools CLI handles all validation logic.

@~/.claude/plugins/marketplaces/spek/spek/references/state-validation.md
</execution_context>

<process>

<step name="verify_project">
**Verify this is a SPEK project:**

```bash
test -d .planning && echo "found" || echo "missing"
```

If missing:
```
No .planning directory found. This doesn't appear to be a SPEK project.

To initialize: /spek:new-project
```
Exit.
</step>

<step name="run_diagnostics">
**Run full validation via CLI:**

```bash
echo "## State Repair Diagnostics"
echo ""
echo "Running full validation..."
echo ""

VALIDATION=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state validate 2>&1)
```

The CLI performs all checks:
- Core files exist (STATE.md, ROADMAP.md, PROJECT.md, config.json)
- Position accuracy (claimed vs actual progress)
- Uncommitted changes detection
- Git consistency
- Config validity
- Phase directory integrity

Parse results:
```bash
VALID=$(echo "$VALIDATION" | jq -r '.valid')
ISSUES=$(echo "$VALIDATION" | jq -r '.issues')
```
</step>

<step name="report_findings">
**Present diagnostic report:**

```bash
if [ "$VALID" = "true" ]; then
  echo "## ✓ State Validated"
  echo ""
  echo "No issues found. Project state is consistent."
  exit 0
fi

# Format issues for display
echo "## Diagnostic Results"
echo ""
echo "$ISSUES" | jq -r '.[] | "- [\(.type)] \(.message)"'
echo ""
```

Categorize issues:
- **Auto-fixable**: Position drift, missing config fields, stale timestamps
- **Needs decision**: Uncommitted changes, missing core files, invalid JSON
- **Info only**: Warnings
</step>

<step name="user_decisions">
**Handle issues requiring user decision:**

For each issue that needs input, use AskUserQuestion:

**Uncommitted changes:**
```
Found uncommitted changes in .planning/

What would you like to do?
```
Options:
- "Commit changes" - Stage and commit as recovery
- "Discard changes" - git checkout to discard
- "Review first" - Show diff then ask again

**Missing STATE.md:**
```
STATE.md is missing.

How should I proceed?
```
Options:
- "Reconstruct from artifacts" - Analyze SUMMARYs and git to rebuild
- "Start fresh" - Create minimal STATE.md

**Invalid config.json:**
```
config.json contains invalid JSON.

How should I proceed?
```
Options:
- "Reset to defaults" - Replace with default config
- "Show contents" - Display raw file for manual fix
</step>

<step name="auto_repair">
**Apply automatic fixes:**

For position drift:
```bash
# CLI provides correct values
node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state update plan "$CORRECT_PLAN"
echo "✓ Fixed: Position updated"
```

For missing config fields:
```bash
# CLI validates and returns full config with defaults
CONFIG=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js config validate)
echo "$CONFIG" | jq -r '.config' > .planning/config.json
echo "✓ Fixed: Added missing config fields"
```

For stale timestamp:
```bash
TODAY=$(date +%Y-%m-%d)
node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state update status "Repaired on $TODAY"
echo "✓ Fixed: Updated timestamp"
```
</step>

<step name="reconstruct_state">
**If reconstructing STATE.md from artifacts:**

```bash
# Parse current project state
ROADMAP=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js roadmap parse)
TOTAL_PHASES=$(echo "$ROADMAP" | jq -r '.totalPhases')

# Find highest phase with work
LATEST_PHASE=$(ls -d .planning/phases/*/ 2>/dev/null | tail -1 | xargs basename | grep -oE "^[0-9]+")

# Get phase details
PHASE_INFO=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js roadmap get-phase "$LATEST_PHASE")
PHASE_NAME=$(echo "$PHASE_INFO" | jq -r '.name')

# Count completed in that phase
PHASE_DIR=".planning/phases/$(ls .planning/phases | grep "^$LATEST_PHASE-" | head -1)"
COMPLETED=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
TOTAL=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')

# Get project name
PROJECT_NAME=$(grep -m1 "^# " .planning/PROJECT.md | sed 's/^# //' || echo "Project")
TODAY=$(date +%Y-%m-%d)
```

Generate STATE.md:
```markdown
# {PROJECT_NAME} — Living Memory

## Current Position

Phase: {LATEST_PHASE} of {TOTAL_PHASES} ({PHASE_NAME})
Plan: {COMPLETED + 1} of {TOTAL}
Status: In progress
Last activity: {TODAY} - Reconstructed by repair-state

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
FINAL_CHECK=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state validate)
VALID=$(echo "$FINAL_CHECK" | jq -r '.valid')

if [ "$VALID" = "true" ]; then
  echo "## ✓ State Repaired"
  echo ""
  echo "All issues resolved. Project state is now consistent."
  echo ""
  echo "Ready to continue: /spek:go"
else
  echo "## ⚠ Repair Incomplete"
  echo ""
  echo "Some issues could not be automatically resolved."
  echo "$FINAL_CHECK" | jq -r '.issues[] | "- \(.message)"'
fi
```
</step>

<step name="commit_repairs">
**Commit repair changes:**

```bash
git add .planning/STATE.md .planning/config.json
git commit -m "fix: repair project state

Repaired by /spek:repair-state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "✓ Changes committed"
```
</step>

</process>

<success_criteria>
- [ ] CLI validation runs all diagnostic checks
- [ ] Issues categorized correctly
- [ ] Auto-fixes applied safely via CLI
- [ ] User decisions collected for risky fixes
- [ ] State reconstruction accurate (if needed)
- [ ] Final validation passes
- [ ] Repairs committed to git
</success_criteria>

<notes>
**Optimization (v2.0.0-alpha.3):**
- Replaced 150+ lines of inline validation with CLI `state validate`
- All checks centralized in spek-tools.js
- Consistent validation logic across all skills
- Auto-repair uses CLI update commands
- More reliable and maintainable
</notes>
