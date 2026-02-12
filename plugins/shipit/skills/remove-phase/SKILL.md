---
name: shipit:remove-phase
description: Remove a future phase from roadmap and renumber subsequent phases
argument-hint: <phase-number>
allowed-tools:
  - Bash
  - Read
---

<objective>
Remove an unstarted future phase from the roadmap and renumber all subsequent phases to maintain a clean, linear sequence.

Purpose: Clean removal of work you've decided not to do, without polluting context with cancelled/deferred markers.
Output: Phase deleted, all subsequent phases renumbered, git commit as historical record.
</objective>

<execution_context>
Uses CLI delegation (GSD v1.16.0 pattern) for mechanical operations.
The shipit-tools CLI handles all file parsing, directory renaming, and updates.
</execution_context>

<process>

<step name="parse_arguments">
Parse the command arguments:
- Argument is the phase number to remove (integer or decimal)
- Example: `/shipit:remove-phase 17` → phase = 17
- Example: `/shipit:remove-phase 16.1` → phase = 16.1

If no argument provided:

```
ERROR: Phase number required
Usage: /shipit:remove-phase <phase-number>
Example: /shipit:remove-phase 17
```

Exit.
</step>

<step name="execute_cli">
Call the shipit-tools CLI to perform the operation:

```bash
# Resolve CLI path
_TOOLS="$(find ~/.claude/plugins -path '*/shipit/bin/shipit-tools.js' -print -quit 2>/dev/null)"

RESULT=$(node "$_TOOLS" phase remove "$PHASE_NUM" 2>&1)

# Check for errors
if ! echo "$RESULT" | jq -e '.success' >/dev/null 2>&1; then
  echo "ERROR: Failed to remove phase"
  echo "$RESULT"
  exit 1
fi
```

The CLI handles:
- Validating phase exists and is a future phase (not started)
- Checking for completed work (SUMMARY.md files)
- Deleting phase directory
- Renumbering all subsequent phase directories
- Renaming plan files inside directories (NN-01-PLAN.md → MM-01-PLAN.md)
- Updating ROADMAP.md (remove section, renumber all references)
- Updating STATE.md (phase count, progress percentage)
- Handling both integer and decimal phase removal
- All file I/O and validation

Parse the result:

```bash
REMOVED_PHASE=$(echo "$RESULT" | jq -r '.removed_phase')
REMOVED_NAME=$(echo "$RESULT" | jq -r '.removed_phase_name')
REMOVED_DIR=$(echo "$RESULT" | jq -r '.removed_directory')
RENUMBERED_COUNT=$(echo "$RESULT" | jq -r '.renumbered_count')
RENUMBERED=$(echo "$RESULT" | jq -r '.renumbered')
```
</step>

<step name="confirm_commit">
Ask user if they want to commit the changes:

```
Phase ${REMOVED_PHASE} (${REMOVED_NAME}) removed.

Changes:
- Deleted: ${REMOVED_DIR}
- Renumbered: ${RENUMBERED_COUNT} phases
${RENUMBERED_DETAILS}
- Updated: ROADMAP.md, STATE.md

Commit these changes? (y/n)
```

Where RENUMBERED_DETAILS is formatted from the renumbered array.
</step>

<step name="commit_if_approved">
If user approves, commit the changes:

```bash
# Resolve CLI path
_TOOLS="$(find ~/.claude/plugins -path '*/shipit/bin/shipit-tools.js' -print -quit 2>/dev/null)"

# Check planning config
INIT=$(node "$_TOOLS" init execute-phase 1 --include=config)
COMMIT_PLANNING_DOCS=$(echo "$INIT" | jq -r '.config.commit_docs')

if [ "$COMMIT_PLANNING_DOCS" = "true" ] && ! git check-ignore -q .planning 2>/dev/null; then
  git add .planning/
  git commit -m "chore: remove phase ${REMOVED_PHASE} (${REMOVED_NAME})"
  echo "Committed: chore: remove phase ${REMOVED_PHASE} (${REMOVED_NAME})"
else
  echo "Skipped commit (commit_docs=false or .planning ignored)"
fi
```

The commit message preserves the historical record of what was removed.
</step>

<step name="completion">
Present completion summary:

```
Phase ${REMOVED_PHASE} (${REMOVED_NAME}) removed.

Changes:
- Deleted: ${REMOVED_DIR}
- Renumbered: ${RENUMBERED_COUNT} phases
- Updated: ROADMAP.md, STATE.md
- Committed: chore: remove phase ${REMOVED_PHASE} (${REMOVED_NAME})

---

## What's Next

Would you like to:
- `/shipit:progress` — see updated roadmap status
- Continue with current phase
- Review roadmap

---
```
</step>

</process>

<anti_patterns>
- Don't remove completed phases (have SUMMARY.md files)
- Don't remove current or past phases
- Don't leave gaps in numbering - CLI handles renumbering
- Don't add "removed phase" notes to STATE.md - git commit is the record
- Don't modify completed phase directories
</anti_patterns>

<edge_cases>

**Removing a decimal phase (e.g., 17.1):**
- Only affects other decimals in same series (17.2 → 17.1, 17.3 → 17.2)
- Integer phases unchanged
- Simpler operation

**No subsequent phases to renumber:**
- Removing the last phase (e.g., Phase 20 when that's the end)
- Just delete and update ROADMAP.md, no renumbering needed

**Phase directory doesn't exist:**
- Phase may be in ROADMAP.md but directory not created yet
- CLI handles this gracefully

**Decimal phases under removed integer:**
- Removing Phase 17 when 17.1, 17.2 exist
- 17.1 → 16.1, 17.2 → 16.2
- They maintain their position in execution order

</edge_cases>

<success_criteria>
Phase removal is complete when:

- [ ] CLI executed successfully
- [ ] Target phase validated as future/unstarted
- [ ] Phase directory deleted (if existed)
- [ ] All subsequent phase directories renumbered
- [ ] Files inside directories renamed
- [ ] ROADMAP.md updated (section removed, all references renumbered)
- [ ] STATE.md updated (phase count, progress percentage)
- [ ] Dependency references updated in subsequent phases
- [ ] Changes committed with descriptive message
- [ ] No gaps in phase numbering
- [ ] User informed of changes
</success_criteria>
