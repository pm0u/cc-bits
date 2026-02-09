---
name: spek:status
description: Show visual state diagram of current position in the project hierarchy
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

<objective>
Display a clear visual representation of where you are in the project hierarchy:
- Project → Milestone → Phase → Plan → Task

Shows progress at each level with visual indicators.
</objective>

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
**Collect all status data:**

```bash
# Project info
PROJECT_NAME=$(grep -m1 "^# " .planning/PROJECT.md 2>/dev/null | sed 's/^# //')

# Milestone info (from ROADMAP.md header or MILESTONES.md)
MILESTONE=$(grep -oE "v[0-9]+\.[0-9]+" .planning/ROADMAP.md 2>/dev/null | head -1 || echo "v1.0")

# Phase info
TOTAL_PHASES=$(grep -cE "^### Phase [0-9]+" .planning/ROADMAP.md 2>/dev/null || echo "0")
CURRENT_PHASE=$(grep -E "^Phase:" .planning/STATE.md 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "1")
PHASE_NAME=$(grep -A1 "### Phase $CURRENT_PHASE" .planning/ROADMAP.md 2>/dev/null | tail -1 | sed 's/.*- //' | cut -d'(' -f1 || echo "Unknown")

# Find phase directory
PHASE_DIR=$(ls -d .planning/phases/${CURRENT_PHASE}-* .planning/phases/0${CURRENT_PHASE}-* 2>/dev/null | head -1)

# Plan info (in current phase)
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
│  Milestone: {MILESTONE}                                     │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASES                                                     │
│  {render_phase_progress}                                    │
│                                                             │
│  ■ ■ ■ □ □ □    Phase {CURRENT_PHASE}/{TOTAL_PHASES}       │
│        ▲                                                    │
│        └── {PHASE_NAME}                                     │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  PLANS (Phase {CURRENT_PHASE})                              │
│  {render_plan_progress}                                     │
│                                                             │
│  ■ ■ □ □    Plan {CURRENT_PLAN}/{TOTAL_PLANS}              │
│      ▲                                                      │
│      └── {PLAN_NAME}                                        │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  TASKS (Plan {CURRENT_PLAN})                                │
│                                                             │
│  □ □ □    {TOTAL_TASKS} tasks                              │
│  ▲                                                          │
│  └── Ready to execute                                       │
└─────────────────────────────────────────────────────────────┘

Overall: {COMPLETED_PLANS_ALL}/{TOTAL_PLANS_ALL} plans complete ({percentage}%)
```

**Progress bar rendering:**
- Use `■` for completed items
- Use `□` for pending items
- Use `▶` for current item (if in progress)
- Maximum 10 squares, scale if needed

**Calculate percentage:**
```
percentage = (COMPLETED_PLANS_ALL / TOTAL_PLANS_ALL) * 100
```
</step>

<step name="status_indicators">
**Add status indicators based on state:**

Check for special conditions and add indicators:

```bash
# Blockers
BLOCKERS=$(grep -A5 "## Blockers" .planning/STATE.md 2>/dev/null | grep -c "^-" || echo "0")

# Verification gaps
GAPS=$(grep -l "status: gaps_found" .planning/phases/*/*-VERIFICATION.md 2>/dev/null | wc -l | tr -d ' ')

# Pending todos
TODOS=$(ls .planning/todos/pending/*.md 2>/dev/null | wc -l | tr -d ' ')

# Active debug
DEBUG=$(ls .planning/debug/*.md 2>/dev/null | grep -v resolved | wc -l | tr -d ' ')
```

**If any exist, append:**

```
─────────────────────────────────────────────────────────────

⚠️  Attention:
{if BLOCKERS > 0}  • {BLOCKERS} blocker(s) recorded
{if GAPS > 0}      • {GAPS} phase(s) with verification gaps
{if TODOS > 0}     • {TODOS} pending todo(s)
{if DEBUG > 0}     • {DEBUG} active debug session(s)
```
</step>

<step name="quick_actions">
**Show quick actions:**

```
─────────────────────────────────────────────────────────────

Quick Actions:
  /spek:go        → Auto-continue with next action
  /spek:progress  → Detailed status with routing
```
</step>

</process>

<output_example>
```
┌─────────────────────────────────────────────────────────────┐
│  TaskMaster Pro                                             │
│  Milestone: v1.0                                            │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  PHASES                                                     │
│                                                             │
│  ■ ■ ▶ □ □    Phase 3/5: Authentication                    │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  PLANS (Phase 3)                                            │
│                                                             │
│  ■ ▶ □ □    Plan 2/4: JWT Token Service                    │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  TASKS (Plan 2)                                             │
│                                                             │
│  □ □ □    3 tasks pending                                   │
└─────────────────────────────────────────────────────────────┘

Overall: 6/15 plans complete (40%)

─────────────────────────────────────────────────────────────

Quick Actions:
  /spek:go        → Auto-continue with next action
  /spek:progress  → Detailed status with routing
```
</output_example>

<success_criteria>
- [ ] Visual hierarchy clearly shows project structure
- [ ] Current position highlighted at each level
- [ ] Progress indicators accurate
- [ ] Special conditions flagged
- [ ] Quick actions provided
</success_criteria>
