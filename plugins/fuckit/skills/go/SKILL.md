---
name: fuckit:go
description: Automatically determine and execute the next action based on project state. Smart router that just does the right thing.
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

Unlike `/fuckit:progress` which shows status and suggests commands, `/fuckit:go` determines and executes the next action directly.
</objective>

<process>

<step name="verify">
**Verify planning structure exists:**

```bash
test -d .planning && echo "exists" || echo "missing"
```

If no `.planning/` directory:

```
No project found. Starting new project...
```

Then invoke: `Skill(skill: "fuckit:new-project")`

Exit after invoking.
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
Project incomplete. Starting initialization...
```

Invoke: `Skill(skill: "fuckit:new-project")`

**Missing ROADMAP.md but PROJECT.md exists:**

Between milestones. Invoke: `Skill(skill: "fuckit:new-milestone")`
</step>

<step name="determine_position">
**Parse current position from STATE.md:**

```bash
# Get current phase from STATE.md
grep -E "^Phase:" .planning/STATE.md | head -1
```

**Find current phase directory:**

```bash
# Extract phase number and find directory
PHASE_NUM=$(grep -E "^Phase:" .planning/STATE.md | grep -oE "[0-9]+" | head -1)
PHASE_DIR=$(ls -d .planning/phases/${PHASE_NUM}-* .planning/phases/0${PHASE_NUM}-* 2>/dev/null | head -1)
echo "phase_dir:$PHASE_DIR"
```

**Count plans and summaries:**

```bash
# In current phase
PLAN_COUNT=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
SUMMARY_COUNT=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
CONTEXT_EXISTS=$(test -f "$PHASE_DIR"/*-CONTEXT.md 2>/dev/null && echo "yes" || echo "no")

echo "plans:$PLAN_COUNT summaries:$SUMMARY_COUNT context:$CONTEXT_EXISTS"
```

**Check for verification gaps:**

```bash
# Check for VERIFICATION.md with gaps_found status
grep -l "status: gaps_found" "$PHASE_DIR"/*-VERIFICATION.md 2>/dev/null | wc -l | tr -d ' '
```
</step>

<step name="route_and_execute">
**Route based on state analysis:**

**DECISION TREE:**

```
1. gaps_found > 0?
   → YES: Need to plan gap closure
   → Action: Skill(skill: "fuckit:plan-phase", args: "{phase} --gaps")

2. summaries < plans?
   → YES: Unexecuted plans exist
   → Action: Skill(skill: "fuckit:execute-phase", args: "{phase}")

3. plans = 0?
   → YES: Phase not yet planned
   → Check context:
     - CONTEXT.md exists: Skill(skill: "fuckit:plan-phase", args: "{phase}")
     - No CONTEXT.md: Skill(skill: "fuckit:discuss-phase", args: "{phase}")

4. summaries = plans AND plans > 0?
   → YES: Current phase complete
   → Check if more phases in milestone:
     - More phases: Route to next phase (go to step 3 with next phase)
     - No more phases: Skill(skill: "fuckit:complete-milestone")
```

**Before invoking, confirm with user:**

```
## Next Action

**{action_description}**

Based on project state:
- Phase {N}: {status}
- Plans: {X}/{Y} complete
{additional context}

Proceeding with: `/fuckit:{command} {args}`

Press Enter to continue, or type 'skip' to see status instead.
```

Use AskUserQuestion with options:
- "Continue" (recommended) - Execute the determined action
- "Show status" - Run /fuckit:progress instead
- "Cancel" - Do nothing

**On "Continue":** Invoke the determined Skill

**On "Show status":** Invoke `Skill(skill: "fuckit:progress")`

**On "Cancel":** Exit with message "No action taken."
</step>

</process>

<edge_cases>

**Debug session active:**
```bash
ls .planning/debug/*.md 2>/dev/null | grep -v resolved | head -1
```
If active debug session exists, ask user:
- Continue debug session (`/fuckit:debug`)
- Ignore and proceed with normal flow

**Handoff file exists:**
```bash
test -f .planning/.handoff.md && echo "handoff exists"
```
If handoff exists, invoke `Skill(skill: "fuckit:resume-work")` instead.

**Multiple viable paths:**
When state is ambiguous (e.g., could verify or continue), prefer forward progress:
- Execute over verify
- Plan over discuss
- But always confirm with user

</edge_cases>

<success_criteria>
- [ ] Project state correctly analyzed
- [ ] Appropriate next action determined
- [ ] User confirmed before execution
- [ ] Correct skill invoked with proper arguments
- [ ] Graceful handling of edge cases
</success_criteria>
