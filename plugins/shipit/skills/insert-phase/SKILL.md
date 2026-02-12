---
name: shipit:insert-phase
description: Insert urgent work as decimal phase (e.g., 72.1) between existing phases
argument-hint: <after> <description>
allowed-tools:
  - Bash
---

<objective>
Insert a decimal phase for urgent work discovered mid-milestone that must be completed between existing integer phases.

Uses decimal numbering (72.1, 72.2, etc.) to preserve the logical sequence of planned phases while accommodating urgent insertions.

Purpose: Handle urgent work discovered during execution without renumbering entire roadmap.
</objective>

<execution_context>
Uses CLI delegation (GSD v1.16.0 pattern) for mechanical operations.
The shipit-tools CLI handles all file parsing, directory creation, and updates.
</execution_context>

<process>

<step name="parse_arguments">
Parse the command arguments:
- First argument: integer phase number to insert after
- Remaining arguments: phase description

Example: `/shipit:insert-phase 72 Fix critical auth bug`
→ after = 72
→ description = "Fix critical auth bug"

Validation:

```bash
if [ $# -lt 2 ]; then
  echo "ERROR: Both phase number and description required"
  echo "Usage: /shipit:insert-phase <after> <description>"
  echo "Example: /shipit:insert-phase 72 Fix critical auth bug"
  exit 1
fi

AFTER_PHASE="$1"
shift
DESCRIPTION="$*"

# Validate after_phase is an integer
if ! [[ "$AFTER_PHASE" =~ ^[0-9]+$ ]]; then
  echo "ERROR: Phase number must be an integer"
  exit 1
fi
```
</step>

<step name="execute_cli">
Call the shipit-tools CLI to perform the operation:

```bash
# Resolve CLI path
_TOOLS="$(find ~/.claude/plugins -path '*/shipit/bin/shipit-tools.js' -print -quit 2>/dev/null)"

RESULT=$(node "$_TOOLS" phase insert "$AFTER_PHASE" "$DESCRIPTION" 2>&1)

# Check for errors
if ! echo "$RESULT" | jq -e '.success' >/dev/null 2>&1; then
  echo "ERROR: Failed to insert phase"
  echo "$RESULT"
  exit 1
fi
```

The CLI handles:
- Finding existing decimal phases after target
- Calculating next decimal number (72.1, 72.2, etc.)
- Creating phase directory (.planning/phases/NN.M-slug/)
- Inserting phase section in ROADMAP.md after target
- Updating STATE.md with insertion note
- Generating slug from description
- All validation and file I/O

Parse the result:

```bash
PHASE_NUM=$(echo "$RESULT" | jq -r '.phase_number')
DESCRIPTION=$(echo "$RESULT" | jq -r '.description')
SLUG=$(echo "$RESULT" | jq -r '.slug')
DIRECTORY=$(echo "$RESULT" | jq -r '.directory')
AFTER_PHASE=$(echo "$RESULT" | jq -r '.after_phase')
DECIMAL_NUM=$(echo "$RESULT" | jq -r '.decimal_number')
```
</step>

<step name="completion">
Present completion summary:

```
Phase ${PHASE_NUM} inserted after Phase ${AFTER_PHASE}:
- Description: ${DESCRIPTION}
- Directory: ${DIRECTORY}
- Status: Not planned yet
- Marker: (INSERTED) - indicates urgent work

Roadmap updated: .planning/ROADMAP.md
Project state updated: .planning/STATE.md

---

## ▶ Next Up

**Phase ${PHASE_NUM}: ${DESCRIPTION}** — urgent insertion

`/shipit:plan-phase ${PHASE_NUM}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- Review insertion impact: Check if Phase ${NEXT_INTEGER} dependencies still make sense
- Review roadmap

---
```

Where NEXT_INTEGER = AFTER_PHASE + 1
</step>

</process>

<anti_patterns>
- Don't use this for planned work at end of milestone (use /shipit:add-phase)
- Don't insert before Phase 1 (decimal 0.1 makes no sense)
- Don't renumber existing phases
- Don't modify the target phase content
- Don't create plans yet (that's /shipit:plan-phase)
- Don't commit changes (user decides when to commit)
</anti_patterns>

<success_criteria>
Phase insertion is complete when:

- [ ] CLI executed successfully
- [ ] Phase directory created: `.planning/phases/{N.M}-{slug}/`
- [ ] Roadmap updated with new phase entry (includes "(INSERTED)" marker)
- [ ] Phase inserted in correct position (after target phase, before next integer phase)
- [ ] STATE.md updated with roadmap evolution note
- [ ] Decimal number calculated correctly (based on existing decimals)
- [ ] User informed of next steps and dependency implications
</success_criteria>
