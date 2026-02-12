---
name: shipit:add-phase
description: Add phase to end of current milestone in roadmap
argument-hint: <description>
allowed-tools:
  - Bash
---

<objective>
Add a new integer phase to the end of the current milestone in the roadmap.

This command appends sequential phases to the current milestone's phase list, automatically calculating the next phase number based on existing phases.

Purpose: Add planned work discovered during execution that belongs at the end of current milestone.
</objective>

<execution_context>
Uses CLI delegation (GSD v1.16.0 pattern) for mechanical operations.
The shipit-tools CLI handles all file parsing, directory creation, and updates.
</execution_context>

<process>

<step name="parse_arguments">
Parse the command arguments:
- All arguments become the phase description
- Example: `/shipit:add-phase Add authentication` → description = "Add authentication"
- Example: `/shipit:add-phase Fix critical performance issues` → description = "Fix critical performance issues"

If no arguments provided:

```
ERROR: Phase description required
Usage: /shipit:add-phase <description>
Example: /shipit:add-phase Add authentication system
```

Exit.
</step>

<step name="execute_cli">
Call the shipit-tools CLI to perform the operation:

```bash
RESULT=$(node ${CLAUDE_PLUGIN_ROOT}/bin/shipit-tools.js phase add "$DESCRIPTION" 2>&1)

# Check for errors
if ! echo "$RESULT" | jq -e '.success' >/dev/null 2>&1; then
  echo "ERROR: Failed to add phase"
  echo "$RESULT"
  exit 1
fi
```

The CLI handles:
- Finding current milestone and highest phase number
- Creating phase directory (.planning/phases/NN-slug/)
- Updating ROADMAP.md with new phase section
- Updating STATE.md with roadmap evolution note
- Generating slug from description
- All file I/O and validation

Parse the result:

```bash
PHASE_NUM=$(echo "$RESULT" | jq -r '.phase_number')
PHASE_NUM_STR=$(echo "$RESULT" | jq -r '.phase_number_str')
DESCRIPTION=$(echo "$RESULT" | jq -r '.description')
SLUG=$(echo "$RESULT" | jq -r '.slug')
DIRECTORY=$(echo "$RESULT" | jq -r '.directory')
PREVIOUS_PHASE=$(echo "$RESULT" | jq -r '.previous_phase')
```
</step>

<step name="completion">
Present completion summary:

```
Phase ${PHASE_NUM} added to current milestone:
- Description: ${DESCRIPTION}
- Directory: .planning/phases/${PHASE_NUM_STR}-${SLUG}/
- Status: Not planned yet

Roadmap updated: .planning/ROADMAP.md
Project state updated: .planning/STATE.md

---

## ▶ Next Up

**Phase ${PHASE_NUM}: ${DESCRIPTION}**

`/shipit:plan-phase ${PHASE_NUM}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `/shipit:add-phase <description>` — add another phase
- Review roadmap

---
```
</step>

</process>

<anti_patterns>
- Don't modify phases outside current milestone
- Don't renumber existing phases
- Don't use decimal numbering (that's /shipit:insert-phase)
- Don't create plans yet (that's /shipit:plan-phase)
- Don't commit changes (user decides when to commit)
</anti_patterns>

<success_criteria>
Phase addition is complete when:

- [ ] CLI executed successfully
- [ ] Phase directory created: `.planning/phases/{NN}-{slug}/`
- [ ] Roadmap updated with new phase entry
- [ ] STATE.md updated with roadmap evolution note
- [ ] New phase appears at end of current milestone
- [ ] User informed of next steps
</success_criteria>
