---
name: spek:go
description: Smart router for spec-driven development - analyzes project state and executes next action automatically
allowed-tools:
  - Bash
  - Skill
---

<objective>
Analyze project state and automatically invoke the appropriate next command. This is the "just continue" command - no need to remember which skill to run.

Unlike `/spek:progress` which shows status and suggests commands, `/spek:go` determines and executes the next action directly.

**State-aware routing:** Uses CLI to parse STATE.md and ROADMAP.md, then routes to the correct skill (plan-phase, execute-phase, verify-phase, or progress).
</objective>

<execution_context>
Uses CLI delegation (GSD v1.16.0 pattern) for state/roadmap parsing.
The spek-tools CLI handles all file parsing operations.

@~/.claude/plugins/marketplaces/spek/spek/references/spec-format.md
@~/.claude/plugins/marketplaces/spek/spek/references/triangle-validation.md
@~/.claude/plugins/marketplaces/spek/spek/references/ui-brand.md
</execution_context>

<process>

<step name="verify_structure">
**Verify planning structure exists:**

```bash
test -d .planning && echo "exists" || echo "missing"
```

If no `.planning/` directory:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► No Project Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No roadmap found. Create one with:
  /spek:define "your feature description"

Or if you have specs already:
  /spek:new-milestone
```

Exit.
</step>

<step name="parse_state">
**Parse project state using CLI:**

```bash
# Parse state and roadmap via CLI
STATE=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state get 2>&1)
ROADMAP=$(node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js roadmap parse 2>&1)

# Check for errors
if echo "$STATE" | jq -e '.error' >/dev/null 2>&1; then
  ERROR_MSG=$(echo "$STATE" | jq -r '.error')

  if [[ "$ERROR_MSG" == *"not found"* ]]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " SPEK ► Corrupted State"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo ".planning/ directory exists but missing core files."
    echo ""
    echo "Try: /spek:repair-state"
    exit 1
  fi
fi

# Extract values from parsed state
CURRENT_PHASE=$(echo "$STATE" | jq -r '.phase')
PLAN=$(echo "$STATE" | jq -r '.plan')
STATUS=$(echo "$STATE" | jq -r '.status')
TOTAL_PHASES=$(echo "$ROADMAP" | jq -r '.totalPhases')

echo "Current Phase: $CURRENT_PHASE"
echo "Plan: $PLAN"
echo "Status: $STATUS"
echo ""
```
</step>

<step name="determine_action">
**Determine next action based on state:**

```bash
# Check if phase directory exists
PHASE_DIR=$(find .planning/phases -type d -name "*${CURRENT_PHASE}*" 2>/dev/null | head -1)

if [ -z "$PHASE_DIR" ]; then
  # No phase directory → need to plan
  ACTION="plan"
  echo "Action: Plan phase $CURRENT_PHASE (no phase directory)"

elif [[ "$PLAN" == *"Not started"* ]]; then
  # Phase exists but not planned
  ACTION="plan"
  echo "Action: Plan phase $CURRENT_PHASE (not started)"

elif [[ "$STATUS" == *"Ready to execute"* ]] || [[ "$PLAN" == *"Ready to execute"* ]]; then
  # Plans exist, ready to execute
  ACTION="execute"
  echo "Action: Execute phase $CURRENT_PHASE"

elif [[ "$STATUS" == *"Execution complete"* ]] || [[ "$STATUS" == *"Phase complete"* ]]; then
  # Execution done, need verification
  ACTION="verify"
  echo "Action: Verify phase $CURRENT_PHASE"

elif [[ "$STATUS" == *"verified"* ]] || [[ "$STATUS" == *"Phase verified"* ]]; then
  # Phase verified and complete - check if there are more phases
  CURRENT_PHASE_INT=$(echo "$CURRENT_PHASE" | sed 's/\..*//')  # Handle decimals

  if [ "$CURRENT_PHASE_INT" -lt "$TOTAL_PHASES" ]; then
    # More phases to go
    NEXT_PHASE=$((CURRENT_PHASE_INT + 1))
    echo "Phase $CURRENT_PHASE complete. Moving to Phase $NEXT_PHASE..."

    # Update STATE.md to next phase via CLI
    node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state update phase "$NEXT_PHASE" >/dev/null
    node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state update plan "Not started" >/dev/null
    node ~/.claude/plugins/marketplaces/spek/bin/spek-tools.js state update status "Ready to plan" >/dev/null

    ACTION="plan"
    CURRENT_PHASE=$NEXT_PHASE
  else
    # All phases complete
    ACTION="complete"
    echo "All phases complete!"
  fi

else
  # Unknown state, show progress
  ACTION="progress"
  echo "Action: Show progress (unclear state)"
fi

echo ""
```
</step>

<step name="route_action">
**Execute the determined action:**

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► Routing to: $ACTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

**If ACTION="plan":**

```
Invoking: /spek:plan-phase ${CURRENT_PHASE}
```

Invoke:
```
Skill(skill: "spek:plan-phase", args: "${CURRENT_PHASE}")
```

**If ACTION="execute":**

```
Invoking: /spek:execute-phase ${CURRENT_PHASE}
```

Invoke:
```
Skill(skill: "spek:execute-phase", args: "${CURRENT_PHASE}")
```

**If ACTION="verify":**

```
Invoking: /spek:verify-phase ${CURRENT_PHASE}
```

Invoke:
```
Skill(skill: "spek:verify-phase", args: "${CURRENT_PHASE}")
```

**If ACTION="progress":**

```
Invoking: /spek:progress
```

Invoke:
```
Skill(skill: "spek:progress")
```

**If ACTION="complete":**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► Milestone Complete! 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All phases verified and complete.

Next steps:
  /spek:audit-milestone   - Review before archiving
  /spek:complete-milestone - Archive and close
  /spek:new-milestone     - Start next milestone
```

Exit.
</step>

</process>

<success_criteria>
- [ ] If no .planning/ → suggests /spek:define or /spek:new-milestone
- [ ] If corrupted state → suggests /spek:repair-state
- [ ] If phase needs planning → invokes /spek:plan-phase
- [ ] If phase ready to execute → invokes /spek:execute-phase
- [ ] If phase needs verification → invokes /spek:verify-phase
- [ ] If phase complete → moves to next phase automatically (via CLI state updates)
- [ ] If all phases complete → shows milestone complete message
- [ ] If unclear state → invokes /spek:progress
</success_criteria>

<notes>
**Design Philosophy:**

This is a **router, not an executor**. It reads state and delegates to specialized skills.

**State Machine:**
```
No .planning/ → suggest define/new-milestone
  ↓
Phase N: Not planned → /spek:plan-phase N
  ↓
Phase N: Ready to execute → /spek:execute-phase N
  ↓
Phase N: Execution complete → /spek:verify-phase N
  ↓
Phase N: Verified → CLI updates STATE.md → Phase N+1
  ↓
Repeat until all phases done
  ↓
All complete → suggest milestone audit/complete
```

**Optimization (v2.0.0-alpha.2):**
- Replaced inline grep/awk/sed with spek-tools CLI
- State parsing: `state get` returns JSON
- Roadmap parsing: `roadmap parse` returns JSON
- State updates: `state update` commands instead of sed
- Reduced complexity, improved reliability
</notes>
