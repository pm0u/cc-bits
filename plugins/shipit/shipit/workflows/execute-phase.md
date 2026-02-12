<purpose>
Execute all plans in a phase using wave-based parallel execution. Orchestrator stays lean by delegating plan execution to subagents.
</purpose>

<core_principle>
The orchestrator's job is coordination, not execution. Each subagent loads the full execute-plan context itself. Orchestrator discovers plans, analyzes dependencies, groups into waves, spawns agents, handles checkpoints, collects results.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
Read config.json for planning behavior settings.
Validate state consistency before proceeding.
</required_reading>

<references>
@${CLAUDE_PLUGIN_ROOT}/shipit/references/state-validation.md
@${CLAUDE_PLUGIN_ROOT}/shipit/references/config-parsing.md
</references>

<process>

<step name="initialize" priority="first">
Load all context in one call (v1.15.0 optimization - read files once, not twice):

```bash
# Resolve CLI path (handles marketplace sub-plugin installations)
_TOOLS="${CLAUDE_PLUGIN_ROOT}/bin/shipit-tools.js"; [ ! -f "$_TOOLS" ] && _TOOLS="$(find ~/.claude/plugins -path '*/shipit/bin/shipit-tools.js' -print -quit 2>/dev/null)"

INIT=$(node "$_TOOLS" init execute-phase "${PHASE_ARG}" --include=state,config,roadmap)
```

Parse JSON for context values:

```bash
# Models (resolved from profile)
EXECUTOR_MODEL=$(echo "$INIT" | jq -r '.models.executor')
VERIFIER_MODEL=$(echo "$INIT" | jq -r '.models.verifier')

# Config flags
MODEL_PROFILE=$(echo "$INIT" | jq -r '.config.model_profile')
COMMIT_PLANNING_DOCS=$(echo "$INIT" | jq -r '.config.commit_docs')
PARALLELIZATION=$(echo "$INIT" | jq -r '.config.parallelization')
BRANCHING_STRATEGY=$(echo "$INIT" | jq -r '.config.branching_strategy')
PHASE_BRANCH_TEMPLATE=$(echo "$INIT" | jq -r '.config.phase_branch_template')
MILESTONE_BRANCH_TEMPLATE=$(echo "$INIT" | jq -r '.config.milestone_branch_template')
VERIFIER_ENABLED=$(echo "$INIT" | jq -r '.config.verifier')

# Phase info
PHASE_FOUND=$(echo "$INIT" | jq -r '.phase.found')
PHASE_DIR=$(echo "$INIT" | jq -r '.phase.dir')
PHASE_NUMBER=$(echo "$INIT" | jq -r '.phase.number')

# File existence
STATE_EXISTS=$(echo "$INIT" | jq -r '.files.state_exists')
ROADMAP_EXISTS=$(echo "$INIT" | jq -r '.files.roadmap_exists')

# File contents (already read via --include)
STATE_CONTENT=$(echo "$INIT" | jq -r '.state_content // empty')
CONFIG_CONTENT=$(echo "$INIT" | jq -r '.config_content // empty')
ROADMAP_CONTENT=$(echo "$INIT" | jq -r '.roadmap_content // empty')
```

**Auto-detect gitignored (overrides config):**
```bash
git check-ignore -q .planning 2>/dev/null && COMMIT_PLANNING_DOCS=false
```

**Error handling:**
- If `PHASE_FOUND` is `false`: Error — phase directory not found
- If `STATE_EXISTS` is `false` but `.planning/` exists: Offer to reconstruct or continue
- If `.planning/` doesn't exist: Error — project not initialized

**Per-plan model override:**

When spawning executors, check each plan for model override:

```bash
# For each plan, check for per-plan model override
PLAN_MODEL=$(grep "^model:" "$PLAN_FILE" | cut -d: -f2 | tr -d ' "')

if [ -n "$PLAN_MODEL" ] && echo "$PLAN_MODEL" | grep -qE "^(opus|sonnet|haiku)$"; then
  # Valid per-plan override
  EXECUTOR_MODEL_FOR_PLAN="$PLAN_MODEL"
  echo "Plan $PLAN_ID uses model override: $PLAN_MODEL"
else
  # Fall back to profile default
  EXECUTOR_MODEL_FOR_PLAN="$EXECUTOR_MODEL"
fi
```

Store resolved model per-plan for use in Task calls.
</step>

<step name="validate_state">
**Quick state validation before proceeding:**

```bash
# Parse position from STATE_CONTENT (already loaded via --include)
CLAIMED_PLAN=$(echo "$STATE_CONTENT" | grep -E "^Plan:" | grep -oE "[0-9]+" | head -1 || echo "1")
ACTUAL_SUMMARIES=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')

# Check for uncommitted changes
UNCOMMITTED=$(git status --porcelain -- .planning/ 2>/dev/null | wc -l | tr -d ' ')
```

**Position drift check:**
If `CLAIMED_PLAN > ACTUAL_SUMMARIES + 1`:
```
⚠ State Inconsistency Detected

STATE.md claims Plan {CLAIMED_PLAN} but only {ACTUAL_SUMMARIES} plans are complete.

Run /shipit:repair-state to fix, or continue anyway?
```

Use AskUserQuestion:
- "Repair first" - Exit and suggest repair command
- "Continue anyway" - Proceed with actual state (may miss context)

**Uncommitted changes check:**
If `UNCOMMITTED > 0`:
```
⚠ Uncommitted Changes Detected

Found {UNCOMMITTED} uncommitted changes in .planning/.
This may indicate interrupted previous execution.

Options:
```

Use AskUserQuestion:
- "Commit and continue" - Commit changes as recovery, then proceed
- "Discard and continue" - Reset changes, proceed fresh
- "Abort" - Exit to investigate manually

**If validation passes:** Continue silently to next step.

**Check circuit breaker status:**

```bash
# Check for plans that have hit circuit breaker (3+ failures)
# Use STATE_CONTENT (already loaded)
TRIPPED_PLANS=$(echo "$STATE_CONTENT" | grep -A10 "### Recent Failures" | grep -E "^\| [0-9]" | awk '$3 >= 3 {print $1}')
```

If any plans in current phase have tripped the circuit breaker:
```
⚠ Circuit Breaker Active

The following plans have failed 3+ times and are paused:
{list of tripped plans with last errors}

Options:
- Reset failures: /shipit:repair-state (clears failure counts)
- Skip these plans: Continue with --skip-tripped flag
- Investigate: Review errors before proceeding
```

Use AskUserQuestion to determine how to proceed.
</step>

<step name="handle_branching">
Create or switch to appropriate branch based on branching strategy.

**Skip if strategy is "none":**

```bash
if [ "$BRANCHING_STRATEGY" = "none" ]; then
  # No branching, continue on current branch
  exit 0
fi
```

**For "phase" strategy — create phase branch:**

```bash
if [ "$BRANCHING_STRATEGY" = "phase" ]; then
  # Get phase name from directory (e.g., "03-authentication" → "authentication")
  PHASE_NAME=$(basename "$PHASE_DIR" | sed 's/^[0-9]*-//')

  # Create slug from phase name
  PHASE_SLUG=$(echo "$PHASE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

  # Apply template
  BRANCH_NAME=$(echo "$PHASE_BRANCH_TEMPLATE" | sed "s/{phase}/$PADDED_PHASE/g" | sed "s/{slug}/$PHASE_SLUG/g")

  # Create or switch to branch
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

  echo "Branch: $BRANCH_NAME (phase branching)"
fi
```

**For "milestone" strategy — create/switch to milestone branch:**

```bash
if [ "$BRANCHING_STRATEGY" = "milestone" ]; then
  # Get current milestone info from ROADMAP_CONTENT (already loaded)
  MILESTONE_VERSION=$(echo "$ROADMAP_CONTENT" | grep -oE 'v[0-9]+\.[0-9]+' | head -1 || echo "v1.0")
  MILESTONE_NAME=$(echo "$ROADMAP_CONTENT" | grep -A1 "## .*$MILESTONE_VERSION" | tail -1 | sed 's/.*- //' | cut -d'(' -f1 | tr -d ' ' || echo "milestone")

  # Create slug
  MILESTONE_SLUG=$(echo "$MILESTONE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

  # Apply template
  BRANCH_NAME=$(echo "$MILESTONE_BRANCH_TEMPLATE" | sed "s/{milestone}/$MILESTONE_VERSION/g" | sed "s/{slug}/$MILESTONE_SLUG/g")

  # Create or switch to branch (same branch for all phases in milestone)
  git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

  echo "Branch: $BRANCH_NAME (milestone branching)"
fi
```

**Report branch status:**

```
Branching: {strategy} → {branch_name}
```

**Note:** All subsequent plan commits go to this branch. User handles merging based on their workflow.
</step>

<step name="validate_phase">
Confirm phase exists and has plans:

```bash
# Match both zero-padded (05-*) and unpadded (5-*) folders
PADDED_PHASE=$(printf "%02d" ${PHASE_ARG} 2>/dev/null || echo "${PHASE_ARG}")
PHASE_DIR=$(ls -d .planning/phases/${PADDED_PHASE}-* .planning/phases/${PHASE_ARG}-* 2>/dev/null | head -1)
if [ -z "$PHASE_DIR" ]; then
  echo "ERROR: No phase directory matching '${PHASE_ARG}'"
  exit 1
fi

PLAN_COUNT=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$PLAN_COUNT" -eq 0 ]; then
  echo "ERROR: No plans found in $PHASE_DIR"
  exit 1
fi
```

Report: "Found {N} plans in {phase_dir}"
</step>

<step name="discover_plans">
List all plans and extract metadata:

```bash
# Get all plans
ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null | sort

# Get completed plans (have SUMMARY.md)
ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null | sort
```

For each plan, read frontmatter to extract:
- `wave: N` - Execution wave (pre-computed)
- `autonomous: true/false` - Whether plan has checkpoints
- `gap_closure: true/false` - Whether plan closes gaps from verification/UAT

Build plan inventory:
- Plan path
- Plan ID (e.g., "03-01")
- Wave number
- Autonomous flag
- Gap closure flag
- Completion status (SUMMARY exists = complete)

**Filtering:**
- Skip completed plans (have SUMMARY.md)
- If `--gaps-only` flag: also skip plans where `gap_closure` is not `true`

If all plans filtered out, report "No matching incomplete plans" and exit.
</step>

<step name="group_by_wave">
Read `wave` from each plan's frontmatter and group by wave number:

```bash
# For each plan, extract wave from frontmatter
for plan in $PHASE_DIR/*-PLAN.md; do
  wave=$(grep "^wave:" "$plan" | cut -d: -f2 | tr -d ' ')
  autonomous=$(grep "^autonomous:" "$plan" | cut -d: -f2 | tr -d ' ')
  echo "$plan:$wave:$autonomous"
done
```

**Group plans:**
```
waves = {
  1: [plan-01, plan-02],
  2: [plan-03, plan-04],
  3: [plan-05]
}
```

**No dependency analysis needed.** Wave numbers are pre-computed during `/shipit:plan-phase`.

Report wave structure with context:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} plans across {wave_count} waves

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives} |
| 2 | 01-03 | {from plan objectives} |
| 3 | 01-04 [checkpoint] | {from plan objectives} |

```

The "What it builds" column comes from skimming plan names/objectives. Keep it brief (3-8 words).
</step>

<step name="execute_waves">
Execute each wave in sequence. Autonomous plans within a wave run in parallel **only if `PARALLELIZATION=true`**.

**If `PARALLELIZATION=false`:** Execute plans within each wave sequentially (one at a time). This prevents side effects from concurrent operations like tests, linting, and code generation.

**For each wave:**

1. **Describe what's being built (BEFORE spawning):**

   Read each plan's `<objective>` section. Extract what's being built and why it matters.

   **Output:**
   ```
   ---

   ## Wave {N}

   **{Plan ID}: {Plan Name}**
   {2-3 sentences: what this builds, key technical approach, why it matters in context}

   **{Plan ID}: {Plan Name}** (if parallel)
   {same format}

   Spawning {count} agent(s)...

   ---
   ```

   **Examples:**
   - Bad: "Executing terrain generation plan"
   - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

2. **Read files and spawn agents:**

   Before spawning, read file contents. The `@` syntax does not work across Task() boundaries - content must be inlined.

   ```bash
   # Read only the specific plan file
   # STATE_CONTENT and CONFIG_CONTENT already loaded via --include
   PLAN_CONTENT=$(cat "{plan_path}")
   ```

   **If `PARALLELIZATION=true` (default):** Use Task tool with multiple parallel calls.
   
   **If `PARALLELIZATION=false`:** Spawn agents one at a time, waiting for each to complete before starting the next. This ensures no concurrent file modifications or build operations.

   Each agent gets prompt with inlined content:

   ```
   <objective>
   Execute plan {plan_number} of phase {phase_number}-{phase_name}.

   Commit each task atomically. Create SUMMARY.md. Update STATE.md.
   </objective>

   <execution_context>
   @~/.claude/shipit/workflows/execute-plan.md
   @~/.claude/shipit/templates/summary.md
   @~/.claude/shipit/references/checkpoints.md
   @~/.claude/shipit/references/tdd.md
   </execution_context>

   <context>
   Plan:
   {plan_content}

   Project state:
   {state_content}

   Config (if exists):
   {config_content}
   </context>

   <success_criteria>
   - [ ] All tasks executed
   - [ ] Each task committed individually
   - [ ] SUMMARY.md created in plan directory
   - [ ] STATE.md updated with position and decisions
   </success_criteria>
   ```

2. **Wait for all agents in wave to complete:**

   Task tool blocks until each agent finishes. All parallel agents return together.

3. **Report completion and what was built:**

   For each completed agent:
   - Verify SUMMARY.md exists at expected path
   - Read SUMMARY.md to extract what was built
   - Note any issues or deviations

   **Output:**
   ```
   ---

   ## Wave {N} Complete

   **{Plan ID}: {Plan Name}**
   {What was built — from SUMMARY.md deliverables}
   {Notable deviations or discoveries, if any}

   **{Plan ID}: {Plan Name}** (if parallel)
   {same format}

   {If more waves: brief note on what this enables for next wave}

   ---
   ```

   **Examples:**
   - Bad: "Wave 2 complete. Proceeding to Wave 3."
   - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (Wave 3) can now reference ground surfaces."

4. **Handle failures with circuit breaker:**

   If any agent in wave fails:

   **Record failure in STATE.md:**
   ```bash
   # Check current failure count for this plan
   FAIL_COUNT=$(grep -A5 "### Recent Failures" .planning/STATE.md | grep "$PLAN_ID" | awk '{print $3}' || echo "0")
   NEW_COUNT=$((FAIL_COUNT + 1))

   # Extract error message (first line of failure output)
   ERROR_MSG=$(echo "$AGENT_OUTPUT" | grep -i "error\|failed\|exception" | head -1 | cut -c1-50)

   # Update or add failure entry
   TODAY=$(date +%Y-%m-%d)
   ```

   Update STATE.md Recent Failures table with plan ID, count, error, and date.

   **Circuit breaker check (3 strikes):**

   If `NEW_COUNT >= 3`:
   ```
   ⚠ Circuit Breaker Triggered

   Plan {PLAN_ID} has failed {NEW_COUNT} consecutive times.

   Recent errors:
   - {error 1}
   - {error 2}
   - {error 3}

   Automatic retry disabled. Options:
   ```

   Use AskUserQuestion:
   - "Investigate" - Show detailed failure info, pause execution
   - "Skip this plan" - Mark as skipped, continue with remaining
   - "Reset and retry" - Clear failure count, try one more time
   - "Abort phase" - Stop execution entirely

   **If `NEW_COUNT < 3`:**
   - Report which plan failed and why
   - Ask user: "Retry this plan?", "Continue with remaining waves?", or "Stop execution?"
   - If retry: spawn fresh agent for same plan
   - If continue: proceed to next wave (dependent plans may also fail)
   - If stop: exit with partial completion report

   **Clear failures on success:**
   When a plan succeeds, remove its entry from Recent Failures table.

5. **Execute checkpoint plans between waves:**

   See `<checkpoint_handling>` for details.

6. **Proceed to next wave**

</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Detection:** Check `autonomous` field in frontmatter.

**Execution flow for checkpoint plans:**

1. **Spawn agent for checkpoint plan:**
   ```
   Task(prompt="{subagent-task-prompt}", subagent_type="shipit:executor", model="{executor_model}")
   ```

2. **Agent runs until checkpoint:**
   - Executes auto tasks normally
   - Reaches checkpoint task (e.g., `type="checkpoint:human-verify"`) or auth gate
   - Agent returns with structured checkpoint (see checkpoint-return.md template)

3. **Agent return includes (structured format):**
   - Completed Tasks table with commit hashes and files
   - Current task name and blocker
   - Checkpoint type and details for user
   - What's awaited from user

4. **Orchestrator presents checkpoint to user:**

   Extract and display the "Checkpoint Details" and "Awaiting" sections from agent return:
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details section from agent return]

   [Awaiting section from agent return]
   ```

5. **User responds:**
   - "approved" / "done" → spawn continuation agent
   - Description of issues → spawn continuation agent with feedback
   - Decision selection → spawn continuation agent with choice

6. **Spawn continuation agent (NOT resume):**

   Use the continuation-prompt.md template:
   ```
   Task(
     prompt=filled_continuation_template,
     subagent_type="shipit:executor",
     model="{executor_model}"
   )
   ```

   Fill template with:
   - `{completed_tasks_table}`: From agent's checkpoint return
   - `{resume_task_number}`: Current task from checkpoint
   - `{resume_task_name}`: Current task name from checkpoint
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type (see continuation-prompt.md)

7. **Continuation agent executes:**
   - Verifies previous commits exist
   - Continues from resume point
   - May hit another checkpoint (repeat from step 4)
   - Or completes plan

8. **Repeat until plan completes or user stops**

**Why fresh agent instead of resume:**
Resume relies on Claude Code's internal serialization which breaks with parallel tool calls.
Fresh agents with explicit state are more reliable and maintain full context.

**Checkpoint in parallel context:**
If a plan in a parallel wave has a checkpoint:
- Spawn as normal
- Agent pauses at checkpoint and returns with structured state
- Other parallel agents may complete while waiting
- Present checkpoint to user
- Spawn continuation agent with user response
- Wait for all agents to finish before next wave
</step>

<step name="aggregate_results">
After all waves complete, aggregate results:

```markdown
## Phase {X}: {Name} Execution Complete

**Waves executed:** {N}
**Plans completed:** {M} of {total}

### Wave Summary

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |
| 3 | plan-05 | ✓ Complete |

### Plan Details

1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]
...

### Issues Encountered
[Aggregate from all SUMMARYs, or "None"]
```
</step>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed its TASKS.

**Spawn verifier:**

```
Task(
  prompt="Verify phase {phase_number} goal achievement.

Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}

Check must_haves against actual codebase. Create VERIFICATION.md.
Verify what actually exists in the code.",
  subagent_type="shipit:verifier",
  model="{verifier_model}"
)
```

**Read verification status:**

```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

**Route by status:**

| Status | Action |
|--------|--------|
| `passed` | Continue to update_roadmap |
| `human_needed` | Present items to user, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/shipit:plan-phase {phase} --gaps` |

**If passed:**

Phase goal verified. Proceed to update_roadmap.

**If human_needed:**

```markdown
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

### Human Verification Checklist

{Extract from VERIFICATION.md human_verification section}

---

**After testing:**
- "approved" → continue to update_roadmap
- Report issues → will route to gap closure planning
```

If user approves → continue to update_roadmap.
If user reports issues → treat as gaps_found.

**If gaps_found:**

Present gaps and offer next command:

```markdown
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase}-VERIFICATION.md

### What's Missing

{Extract gap summaries from VERIFICATION.md gaps section}

---

## ▶ Next Up

**Plan gap closure** — create additional plans to complete the phase

`/shipit:plan-phase {X} --gaps`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `cat {phase_dir}/{phase}-VERIFICATION.md` — see full report
- `/shipit:verify-work {X}` — manual testing before planning
```

User runs `/shipit:plan-phase {X} --gaps` which:
1. Reads VERIFICATION.md gaps
2. Creates additional plans (04, 05, etc.) with `gap_closure: true` to close gaps
3. User then runs `/shipit:execute-phase {X} --gaps-only`
4. Execute-phase runs only gap closure plans (04-05)
5. Verifier runs again after new plans complete

User stays in control at each decision point.
</step>

<step name="update_roadmap">
Update ROADMAP.md to reflect phase completion:

```bash
# Mark phase complete
# Update completion date
# Update status
```

**Check planning config:**

If `COMMIT_PLANNING_DOCS=false` (set in load_project_state):
- Skip all git operations for .planning/ files
- Planning docs exist locally but are gitignored
- Log: "Skipping planning docs commit (commit_docs: false)"
- Proceed to offer_next step

If `COMMIT_PLANNING_DOCS=true` (default):
- Continue with git operations below

Commit phase completion (roadmap, state, verification):
```bash
git add .planning/ROADMAP.md .planning/STATE.md .planning/phases/{phase_dir}/*-VERIFICATION.md
git add .planning/REQUIREMENTS.md  # if updated
git commit -m "docs(phase-{X}): complete phase execution"
```
</step>

<step name="offer_next">
Present next steps based on milestone status:

**If more phases remain:**
```
## Next Up

**Phase {X+1}: {Name}** — {Goal}

`/shipit:plan-phase {X+1}`

<sub>`/clear` first for fresh context</sub>
```

**If milestone complete:**
```
MILESTONE COMPLETE!

All {N} phases executed.

`/shipit:complete-milestone`
```
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context (frontmatter, spawning, results).
Subagents: Fresh 200k each (full workflow + execution).
No polling (Task blocks). No context bleed.
</context_efficiency>

<failure_handling>
**Subagent fails mid-plan:**
- SUMMARY.md won't exist
- Orchestrator detects missing SUMMARY
- Reports failure, asks user how to proceed

**Dependency chain breaks:**
- Wave 1 plan fails
- Wave 2 plans depending on it will likely fail
- Orchestrator can still attempt them (user choice)
- Or skip dependent plans entirely

**All agents in wave fail:**
- Something systemic (git issues, permissions, etc.)
- Stop execution
- Report for manual investigation

**Checkpoint fails to resolve:**
- User can't approve or provides repeated issues
- Ask: "Skip this plan?" or "Abort phase execution?"
- Record partial progress in STATE.md
</failure_handling>

<resumption>
**Resuming interrupted execution:**

If phase execution was interrupted (context limit, user exit, error):

1. Run `/shipit:execute-phase {phase}` again
2. discover_plans finds completed SUMMARYs
3. Skips completed plans
4. Resumes from first incomplete plan
5. Continues wave-based execution

**STATE.md tracks:**
- Last completed plan
- Current wave
- Any pending checkpoints
</resumption>
