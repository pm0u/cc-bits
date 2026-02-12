---
name: spek:status
description: Show visual state diagram of current position in the project hierarchy
allowed-tools:
  - Bash
---

<objective>
Display a clear visual representation of where you are in the project hierarchy:
- Project → Milestone → Phase → Plan → Task

Shows progress at each level with visual indicators.
</objective>

<execution_context>
Uses CLI delegation (GSD v1.16.0 pattern) for state/roadmap parsing.
</execution_context>

<process>

<step name="verify">
**Verify project exists:**

```bash
test -d .planning && echo "exists" || echo "missing"
```

If missing:
```
No SPEK project found in this directory.

Run /spek:new-project to start.
```
Exit.
</step>

<step name="gather_data">
**Collect all status data via CLI:**

```bash
# Parse state and roadmap via CLI
STATE=$(node ${CLAUDE_PLUGIN_ROOT}/bin/spek-tools.js state get 2>&1)
ROADMAP=$(node ${CLAUDE_PLUGIN_ROOT}/bin/spek-tools.js roadmap parse 2>&1)

# Extract values
CURRENT_PHASE=$(echo "$STATE" | jq -r '.phase')
TOTAL_PHASES=$(echo "$ROADMAP" | jq -r '.totalPhases')

# Get current phase details
PHASE_INFO=$(node ${CLAUDE_PLUGIN_ROOT}/bin/spek-tools.js roadmap get-phase "$CURRENT_PHASE" 2>&1)
PHASE_NAME=$(echo "$PHASE_INFO" | jq -r '.name')

# Project and milestone info
PROJECT_NAME=$(grep -m1 "^# " .planning/PROJECT.md 2>/dev/null | sed 's/^# //' || echo "Project")
MILESTONE=$(grep -oE "v[0-9]+\.[0-9]+" .planning/ROADMAP.md 2>/dev/null | head -1 || echo "v1.0")

# Find phase directory
PHASE_DIR=$(find .planning/phases -type d -name "*${CURRENT_PHASE}-*" 2>/dev/null | head -1)

# Plan info (in current phase)
if [ -n "$PHASE_DIR" ]; then
  TOTAL_PLANS=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
  COMPLETED_PLANS=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
  CURRENT_PLAN=$((COMPLETED_PLANS + 1))

  # Task info (from current plan if exists)
  if [ "$CURRENT_PLAN" -le "$TOTAL_PLANS" ]; then
    CURRENT_PLAN_FILE=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | sed -n "${CURRENT_PLAN}p")
    TOTAL_TASKS=$(grep -c "<task" "$CURRENT_PLAN_FILE" 2>/dev/null || echo "0")
    PLAN_NAME=$(grep -m1 "^# " "$CURRENT_PLAN_FILE" 2>/dev/null | sed 's/^# //' || basename "$CURRENT_PLAN_FILE" .md)
  else
    TOTAL_TASKS="0"
    PLAN_NAME="(none pending)"
  fi
else
  TOTAL_PLANS="0"
  COMPLETED_PLANS="0"
  CURRENT_PLAN="1"
  TOTAL_TASKS="0"
  PLAN_NAME="(not planned)"
fi

# Overall progress
TOTAL_PLANS_ALL=$(find .planning/phases -name "*-PLAN.md" 2>/dev/null | wc -l | tr -d ' ')
COMPLETED_PLANS_ALL=$(find .planning/phases -name "*-SUMMARY.md" 2>/dev/null | wc -l | tr -d ' ')
```
</step>

<step name="render_diagram">
**Display visual hierarchy:**

```
┌─────────────────────────────────────────────────────────────┐
│  {PROJECT_NAME}                                             │
│  {COMPLETED_PLANS_ALL}/{TOTAL_PLANS_ALL} plans complete    │
└─────────────────────────────────────────────────────────────┘
    │
    ├─ Milestone: {MILESTONE}
    │   │
    │   ├─ Phase {CURRENT_PHASE}/{TOTAL_PHASES}: {PHASE_NAME}
    │   │   {COMPLETED_PLANS}/{TOTAL_PLANS} plans complete
    │   │   │
    │   │   ├─ Plan {CURRENT_PLAN}: {PLAN_NAME}
    │   │   │   {TOTAL_TASKS} tasks
    │   │   │
    │   │   └─ Status: {STATUS from STATE}
    │   │
    │   └─ Next: Phase {CURRENT_PHASE + 1} (or "Complete")
    │
    └─ Use /spek:progress for detailed view
```

Format with proper indentation and visual tree characters.
</step>

<step name="status_indicators">
**Add visual status indicators:**

- ✓ for completed items
- ▶ for current/active items
- ○ for pending items
- ⚠ if blockers exist

Example:
```
│   ├─ ✓ Phase 1: Foundation (complete)
│   ├─ ▶ Phase 2: Core Features (3/5 plans)
│   └─ ○ Phase 3: Polish (pending)
```
</step>

</process>

<success_criteria>
- [ ] Visual hierarchy clearly shows nesting: Project → Milestone → Phase → Plan → Task
- [ ] Current position highlighted with ▶ indicator
- [ ] Progress shown at each level (X/Y complete)
- [ ] Status from STATE.md reflected
- [ ] Compact single-screen view
- [ ] Suggests /spek:progress for detailed view
</success_criteria>

<notes>
**Optimization (v2.0.0-alpha.2):**
- Replaced grep/sed/find with spek-tools CLI where possible
- State parsing: `state get` returns JSON
- Roadmap parsing: `roadmap parse` + `get-phase` returns JSON
- More reliable parsing, consistent with other skills
- Visual tree structure remains as-is (presentation logic)
</notes>
