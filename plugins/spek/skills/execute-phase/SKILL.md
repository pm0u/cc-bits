---
name: spek:execute-phase
description: Execute all plans in a phase with wave-based parallelization
argument-hint: "<phase-number> [--gaps-only] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
---

<objective>
Execute all plans in a phase using wave-based parallel execution.

Orchestrator stays lean: discover plans, analyze dependencies, group into waves, spawn subagents, collect results. Each subagent loads the full execute-plan context and handles its own plan.

Context budget: ~15% orchestrator, 100% fresh per subagent.
</objective>

<execution_context>
@~/.claude/plugins/marketplaces/spek/spek/references/ui-brand.md
@~/.claude/plugins/marketplaces/spek/spek/workflows/execute-phase.md
</execution_context>

<context>
Phase: $ARGUMENTS

**Flags:**
- `--gaps-only` — Execute only gap closure plans (plans with `gap_closure: true` in frontmatter). Use after verify-work creates fix plans.
- `--dry-run` — Preview what would be executed without running anything. Shows plans, tasks, waves, and estimated commits.
- `--skip-tests` — Skip automated test execution during verification.
- `--skip-tripped` — Skip plans that have hit the circuit breaker (3+ failures).
- `--verbose` — Show detailed execution info including context estimates, timing, and agent outputs.

@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<dry_run_mode>
When `--dry-run` flag is present, instead of executing:

**1. Validate phase and discover plans (same as normal):**
```bash
PHASE_DIR=$(ls -d .planning/phases/${PHASE_ARG}-* .planning/phases/0${PHASE_ARG}-* 2>/dev/null | head -1)
PLANS=$(ls -1 "$PHASE_DIR"/*-PLAN.md 2>/dev/null)
SUMMARIES=$(ls -1 "$PHASE_DIR"/*-SUMMARY.md 2>/dev/null)
```

**2. Analyze each plan without executing:**

For each PLAN.md, extract:
- Plan name from header
- Wave number from frontmatter
- Task count (grep for `<task`)
- Files that would be modified (from `files_modified` frontmatter)
- Checkpoint status (autonomous: true/false)
- Dependencies (depends_on)

**3. Output dry-run report:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► DRY RUN — Phase {X}: {Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Execution Preview

**Plans:** {total} ({completed} complete, {pending} pending)
**Waves:** {wave_count}
**Tasks:** {total_tasks}
**Est. commits:** {task_count + plan_count} (1 per task + 1 per plan)

## Wave Breakdown

### Wave 1 (Parallel)

| Plan | Name | Tasks | Files | Checkpoints |
|------|------|-------|-------|-------------|
| 03-01 | Auth Setup | 3 | 5 | None |
| 03-02 | JWT Service | 2 | 3 | None |

**Estimated context:** ~{X}% per agent (based on task count × ~10%)

### Wave 2 (Depends on Wave 1)

| Plan | Name | Tasks | Files | Checkpoints |
|------|------|-------|-------|-------------|
| 03-03 | Login UI | 4 | 6 | 1 (human-verify) |

**Estimated time:** ~{X} context windows

## Files to be Modified

```
src/auth/index.ts        (03-01)
src/auth/jwt.ts          (03-01, 03-02)
src/components/Login.tsx (03-03)
...
```

## Checkpoints Expected

1. **Plan 03-03, Task 4:** human-verify (UI approval)

## Potential Conflicts

{If any wave has overlapping files_modified, warn here}

───────────────────────────────────────────────────────────────

Ready to execute?

/spek:execute-phase {X}  (remove --dry-run)

───────────────────────────────────────────────────────────────
```

**No agents spawned, no code modified, no commits made.**
</dry_run_mode>

<verbose_mode>
When `--verbose` flag is present, output additional information:

**Before spawning agents:**
```
## Spawning Wave {N} Agents

**Model profile:** {profile}
**Parallelization:** {enabled/disabled}

| Plan | Model | Est. Context | Files |
|------|-------|--------------|-------|
| 03-01 | sonnet | ~40% | 5 |
| 03-02 | opus (override) | ~35% | 3 |

Spawning {N} agents...
```

**After each agent completes:**
```
## Agent Complete: {plan_id}

**Duration:** {X}s
**Tasks:** {N}/{M}
**Commits:** {count}
**Context used:** ~{X}% (estimated from response size)

**Output preview:**
{first 500 chars of agent output}
```

**Context estimation formula:**
- Base: 15% for plan loading and state
- Per task: ~8-12% depending on complexity
- Verification: ~5%
- Total estimate = base + (tasks × avg_per_task)

This helps users understand resource usage and identify heavy plans.
</verbose_mode>

<process>
0. **Resolve Model Profile**

   Read model profile for agent spawning:
   ```bash
   MODEL_PROFILE=$(cat .planning/config.json 2>/dev/null | grep -o '"model_profile"[[:space:]]*:[[:space:]]*"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "balanced")
   ```

   Default to "balanced" if not set.

   **Model lookup table:**

   | Agent | quality | balanced | budget |
   |-------|---------|----------|--------|
   | spek:executor | opus | sonnet | sonnet |
   | spek:verifier | sonnet | sonnet | haiku |

   Store resolved models for use in Task calls below.

1. **Validate phase exists**
   - Find phase directory matching argument
   - Count PLAN.md files
   - Error if no plans found

2. **Discover plans**
   - List all *-PLAN.md files in phase directory
   - Check which have *-SUMMARY.md (already complete)
   - If `--gaps-only`: filter to only plans with `gap_closure: true`
   - Build list of incomplete plans

3. **Group by wave**
   - Read `wave` from each plan's frontmatter
   - Group plans by wave number
   - Report wave structure to user

3.5. **Preflight Check (Spec Triangle Validation)**

   Display stage banner:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SPEK ► PREFLIGHT CHECK
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ◆ Validating readiness before execution...
   ```

   **Find child spec for this phase:**

   ```bash
   # Extract phase name from phase directory
   PHASE_NAME=$(basename "$PHASE_DIR" | sed "s/^${PHASE}-//")

   # Try to find matching child spec
   PARENT_SPEC=$(find specs -maxdepth 2 -name "SPEC.md" -type f | head -1)

   if [ -n "$PARENT_SPEC" ]; then
     PARENT_DIR=$(dirname "$PARENT_SPEC")
     CHILD_SPEC=$(find "$PARENT_DIR" -name "SPEC.md" -path "*/${PHASE_NAME}/*" | head -1)

     # If no exact match, use parent spec
     if [ -z "$CHILD_SPEC" ]; then
       CHILD_SPEC="$PARENT_SPEC"
     fi
   fi
   ```

   **Read context for preflight:**

   ```bash
   # Read spec content
   if [ -n "$CHILD_SPEC" ]; then
     SPEC_CONTENT=$(cat "$CHILD_SPEC")
   else
     SPEC_CONTENT="(no child spec found)"
   fi

   # Read all plans for this phase
   PLANS_CONTENT=$(cat "${PHASE_DIR}"/*-PLAN.md 2>/dev/null)

   # Check for OPEN items in spec
   OPEN_ITEMS=$(grep -A100 "^## OPEN" "$CHILD_SPEC" 2>/dev/null | grep -v "^##" | head -20)
   ```

   **Spawn spek:spec-enforcer in preflight mode:**

   ```markdown
   <preflight_context>

   **Phase:** {phase_number} - {phase_name}
   **Mode:** preflight

   **Spec:**
   {spec_content}

   **Plans to Execute:**
   {N} plans with {M} total tasks
   {plans_content_summary}

   **OPEN Items (if any):**
   {open_items}

   </preflight_context>

   <instructions>

   Check for conflicts before execution starts:

   1. **OPEN items:** Does spec have unresolved questions?
      - Check for "## OPEN" section in CHILD_SPEC
      - If yes → should be resolved before implementation
      - Severity: WARNING (can proceed with caution)

   2. **Plan coverage:** Do plans cover all requirements for this phase?
      - Check that plans deliver what spec promises
      - Missing requirements → gap
      - Severity: CRITICAL if major gaps

   3. **File conflicts:** Do any existing files conflict with planned changes?
      - Check files_modified in plans vs current state
      - Uncommitted work → potential conflict
      - Severity: WARNING (can resolve)

   4. **Tests exist:** Are tests in place from plan-phase?
      - Check for test files in project (*.test.*, *.spec.*, *_test.*)
      - Check Test Files section in CHILD_SPEC
      - Tests should be RED (failing, ready to turn GREEN)
      - **If NO tests found:**
        - Severity: CRITICAL (blocker: yes)
        - Reason: "Cannot enforce spec triangle without tests"
        - Action: Return to plan-phase to derive tests
      - **If tests found:**
        - Run tests to verify they're RED (failing)
        - If GREEN (passing): Warning "Tests already pass - was code pre-implemented?"

   **Output format:**
   ## PREFLIGHT PASS
   (all checks pass or warnings only)

   OR

   ## PREFLIGHT CONFLICT
   **Issue:** {description}
   **Blocker:** {yes/no}
   **Resolution:** {what to do}

   </instructions>
   ```

   ```
   Task(
     prompt=preflight_prompt,
     subagent_type="spek:spec-enforcer",
     model="sonnet",
     description="Preflight check for Phase {phase}"
   )
   ```

   **Handle preflight return:**

   **`## PREFLIGHT PASS`:**
   - Display: `✓ Preflight passed - ready to execute`
   - Proceed to step 4 (execute waves)

   **`## PREFLIGHT CONFLICT`:**
   - Display conflict details
   - Check if blocker
   - **If blocker=yes:** Offer: 1) Resolve conflict, 2) Abort execution
   - **If blocker=no:** Offer: 1) Proceed with caution, 2) Resolve first, 3) Abort
   - Wait for user response

4. **Execute waves**
   For each wave in order:
   - Spawn `spek:executor` for each plan in wave (parallel Task calls)
   - Wait for completion (Task blocks)
   - Verify SUMMARYs created
   - Proceed to next wave

5. **Aggregate results**
   - Collect summaries from all plans
   - Report phase completion status

6. **Commit any orchestrator corrections**
   Check for uncommitted changes before verification:
   ```bash
   git status --porcelain
   ```

   **If changes exist:** Orchestrator made corrections between executor completions. Stage and commit them individually:
   ```bash
   # Stage each modified file individually (never use git add -u, git add ., or git add -A)
   git status --porcelain | grep '^ M' | cut -c4- | while read file; do
     git add "$file"
   done
   git commit -m "fix({phase}): orchestrator corrections"
   ```

   **If clean:** Continue to verification.

7. **Mark execution complete**

   **NOTE:** Verification and triangle validation happen in separate `/spek:verify-phase` skill for better separation of concerns. This allows re-verification without re-execution.

   ```bash
   # Update STATE.md to mark execution complete
   sed -i.bak "s/^Status:.*/Status: Execution complete/" .planning/STATE.md
   rm .planning/STATE.md.bak

   echo "✓ Execution complete - ready for verification"
   echo ""
   ```

8. **Commit execution metadata**

   Check `COMMIT_PLANNING_DOCS` from config.json (default: true).

   ```bash
   COMMIT_PLANNING=$(cat .planning/config.json 2>/dev/null | grep -o '"COMMIT_PLANNING_DOCS"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")
   ```

   If false: Skip git operations for .planning/ files.

   If true: Commit STATE.md update:
   ```bash
   git add .planning/STATE.md
   git commit -m "docs(spek): phase ${PHASE} execution complete

Phase ${PHASE} execution finished - ready for verification.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

9. **Offer next steps**
   - Route to verification (see `<offer_next>`)
</process>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► PHASE {Z} EXECUTION COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

{Y} plans executed
{N} commits made
All tests passing ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

Phase ready for verification — checks goal achievement and validates spec triangle.

Continue:
  /spek:go                - Auto-route to verification
  /spek:verify-phase {Z}  - Verify phase {Z}

**Parallel spawning:**

Before spawning, read file contents. The `@` syntax does not work across Task() boundaries.

```bash
# Read each plan and STATE.md
PLAN_01_CONTENT=$(cat "{plan_01_path}")
PLAN_02_CONTENT=$(cat "{plan_02_path}")
PLAN_03_CONTENT=$(cat "{plan_03_path}")
STATE_CONTENT=$(cat .planning/STATE.md)
LESSONS_CONTENT=$(cat .planning/LESSONS.md 2>/dev/null)
```

Spawn all plans in a wave with a single message containing multiple Task calls, with inlined content:

```
Task(prompt="Execute plan at {plan_01_path}\n\nPlan:\n{plan_01_content}\n\nProject state:\n{state_content}\n\nLessons from prior phases:\n{lessons_content}", subagent_type="spek:executor", model="{executor_model}")
Task(prompt="Execute plan at {plan_02_path}\n\nPlan:\n{plan_02_content}\n\nProject state:\n{state_content}\n\nLessons from prior phases:\n{lessons_content}", subagent_type="spek:executor", model="{executor_model}")
Task(prompt="Execute plan at {plan_03_path}\n\nPlan:\n{plan_03_content}\n\nProject state:\n{state_content}\n\nLessons from prior phases:\n{lessons_content}", subagent_type="spek:executor", model="{executor_model}")
```

All three run in parallel. Task tool blocks until all complete.

**No polling.** No background agents. No TaskOutput loops.
</wave_execution>

<checkpoint_handling>
Plans with `autonomous: false` have checkpoints. The execute-phase.md workflow handles the full checkpoint flow:
- Subagent pauses at checkpoint, returns structured state
- Orchestrator presents to user, collects response
- Spawns fresh continuation agent (not resume)

See `@~/.claude/plugins/marketplaces/spek/spek/workflows/execute-phase.md` step `checkpoint_handling` for complete details.
</checkpoint_handling>

<deviation_rules>
During execution, handle discoveries automatically:

1. **Auto-fix bugs** - Fix immediately, document in Summary
2. **Auto-add critical** - Security/correctness gaps, add and document
3. **Auto-fix blockers** - Can't proceed without fix, do it and document
4. **Ask about architectural** - Major structural changes, stop and ask user

Only rule 4 requires user intervention.
</deviation_rules>

<commit_rules>
**Per-Task Commits:**

After each task completes:
1. Stage only files modified by that task
2. Commit with format: `{type}({phase}-{plan}): {task-name}`
3. Types: feat, fix, test, refactor, perf, chore
4. Record commit hash for SUMMARY.md

**Plan Metadata Commit:**

After all tasks in a plan complete:
1. Stage plan artifacts only: PLAN.md, SUMMARY.md
2. Commit with format: `docs({phase}-{plan}): complete [plan-name] plan`
3. NO code files (already committed per-task)

**Phase Completion Commit:**

After all plans in phase complete (step 7):
1. Stage: ROADMAP.md, STATE.md, REQUIREMENTS.md (if updated), VERIFICATION.md
2. Commit with format: `docs({phase}): complete {phase-name} phase`
3. Bundles all phase-level state updates in one commit

**NEVER use:**
- `git add .`
- `git add -A`
- `git add src/` or any broad directory

**Always stage files individually.**
</commit_rules>

<success_criteria>
- [ ] All incomplete plans in phase executed
- [ ] Each plan has SUMMARY.md
- [ ] Phase goal verified (must_haves checked against codebase)
- [ ] VERIFICATION.md created in phase directory
- [ ] STATE.md reflects phase completion
- [ ] ROADMAP.md updated
- [ ] REQUIREMENTS.md updated (phase requirements marked Complete)
- [ ] User informed of next steps
</success_criteria>
