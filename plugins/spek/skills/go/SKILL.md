---
name: spek:go
description: Smart router for spec-driven development - analyzes project state and executes next action automatically
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
  - Skill
  - AskUserQuestion
---

<objective>
Analyze project state and automatically invoke the appropriate next command. This is the "just continue" command - no need to remember which skill to run.

Unlike `/spek:progress` which shows status and suggests commands, `/spek:go` determines and executes the next action directly.

**State-aware routing:** Reads STATE.md and ROADMAP.md to determine current position, then routes to the correct skill (plan-phase, execute-phase, verify-phase, or progress).
</objective>

<execution_context>
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

<step name="analyze_state">
**Load and analyze project state:**

```bash
# Check what exists
test -f .planning/STATE.md && echo "state:yes" || echo "state:no"
test -f .planning/ROADMAP.md && echo "roadmap:yes" || echo "roadmap:no"
test -f .planning/PROJECT.md && echo "project:yes" || echo "project:no"
```

**Missing STATE.md or PROJECT.md:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► Corrupted State
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.planning/ directory exists but missing core files.

Try: /spek:repair-state
```

Exit.

**Extract current position from STATE.md:**

```bash
# Read current phase number
CURRENT_PHASE=$(grep "^Phase:" .planning/STATE.md | head -1 | awk '{print $2}')

# Handle "Phase: 2 of 4" format
CURRENT_PHASE=$(echo "$CURRENT_PHASE" | sed 's/ .*//')

# Read plan status
PLAN_LINE=$(grep "^Plan:" .planning/STATE.md | head -1)
STATUS_LINE=$(grep "^Status:" .planning/STATE.md | head -1)

echo "Current Phase: $CURRENT_PHASE"
echo "Plan: $PLAN_LINE"
echo "Status: $STATUS_LINE"
echo ""
```
</step>

<step name="determine_action">
**Determine next action based on state:**

```bash
# Check if phase has plans
PHASE_DIR=$(find .planning/phases -type d -name "*${CURRENT_PHASE}*" | head -1)

if [ -z "$PHASE_DIR" ]; then
  # No phase directory → need to plan
  ACTION="plan"
  echo "Action: Plan phase $CURRENT_PHASE (no phase directory)"

elif [[ "$PLAN_LINE" == *"Not started"* ]]; then
  # Phase exists but not planned
  ACTION="plan"
  echo "Action: Plan phase $CURRENT_PHASE (not started)"

elif [[ "$STATUS_LINE" == *"Ready to execute"* ]] || [[ "$PLAN_LINE" == *"Ready to execute"* ]]; then
  # Plans exist, ready to execute
  ACTION="execute"
  echo "Action: Execute phase $CURRENT_PHASE"

elif [[ "$STATUS_LINE" == *"Execution complete"* ]] || [[ "$STATUS_LINE" == *"Phase complete"* ]]; then
  # Execution done, need verification
  ACTION="verify"
  echo "Action: Verify phase $CURRENT_PHASE"

elif [[ "$STATUS_LINE" == *"verified"* ]] || [[ "$STATUS_LINE" == *"Phase verified"* ]]; then
  # Phase verified and complete - check if there are more phases
  TOTAL_PHASES=$(grep -c "^### Phase" .planning/ROADMAP.md)

  if [ "$CURRENT_PHASE" -lt "$TOTAL_PHASES" ]; then
    # More phases to go
    NEXT_PHASE=$((CURRENT_PHASE + 1))
    echo "Phase $CURRENT_PHASE complete. Moving to Phase $NEXT_PHASE..."

    # Update STATE.md to next phase
    sed -i.bak "s/^Phase: ${CURRENT_PHASE}/Phase: ${NEXT_PHASE}/" .planning/STATE.md
    sed -i.bak "s/^Plan:.*/Plan: Not started/" .planning/STATE.md
    sed -i.bak "s/^Status:.*/Status: Ready to plan/" .planning/STATE.md
    rm .planning/STATE.md.bak

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
- [ ] If phase complete → moves to next phase automatically
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
Phase N: Verified → Update STATE.md → Phase N+1
  ↓
Repeat until all phases done
  ↓
All complete → suggest milestone audit/complete
```

**Key Differences from fuckit:go:**
- Checks for both specs/ and .planning/ (dual structure)
- Adds verify-phase step (spec triangle validation)
- References spec-format and triangle-validation

**Integration Points:**
- Works with /spek:define (creates specs/)
- Works with /spek:new-milestone (creates .planning/)
- Routes to /spek:plan-phase (includes test derivation)
- Routes to /spek:execute-phase (includes preflight/postflight)
- Routes to /spek:verify-phase (validates triangle, updates specs)
</notes>
