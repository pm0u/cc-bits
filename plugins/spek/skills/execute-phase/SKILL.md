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
      - If yes → should be resolved before implementation
      - Severity: WARNING (can proceed with caution)

   2. **Plan coverage:** Do plans cover all requirements for this phase?
      - Check that plans deliver what spec promises
      - Missing requirements → gap

   3. **File conflicts:** Do any existing files conflict with planned changes?
      - Check files_modified in plans vs current state
      - Uncommitted work → potential conflict

   4. **Tests exist:** Are tests in place from plan-phase?
      - Tests should be RED (failing, ready to turn GREEN)
      - No tests → triangle can't be enforced

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

7. **Verify phase goal**
   Check config: `WORKFLOW_VERIFIER=$(cat .planning/config.json 2>/dev/null | grep -o '"verifier"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")`

   **If `workflow.verifier` is `false`:** Skip verifier but still run postflight (step 7.5).

   **Otherwise:**
   - Spawn `spek:verifier` subagent with phase directory and goal
   - Verifier checks must_haves against actual codebase (not SUMMARY claims)
   - Creates VERIFICATION.md with detailed report
   - Route by status:
     - `passed` → continue to step 7.5 (postflight)
     - `human_needed` → present items, get approval or feedback
     - `gaps_found` → present gaps, offer `/spek:plan-phase {X} --gaps`

7.5. **Postflight Triangle Validation**

   **CRITICAL:** This validates the spec ↔ tests ↔ code triangle after implementation.

   Display stage banner:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    SPEK ► POSTFLIGHT VALIDATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ◆ Validating spec triangle: spec ↔ tests ↔ code...
   ```

   **Gather context for postflight:**

   ```bash
   # Get child spec (already found in preflight)
   if [ -n "$CHILD_SPEC" ]; then
     SPEC_CONTENT=$(cat "$CHILD_SPEC")

     # Get test files from spec
     TEST_FILES=$(sed -n '/^## Test Files/,/^## /p' "$CHILD_SPEC" | grep -v "^##" | grep -v "^$")

     # Get implementation files from spec
     IMPL_FILES=$(sed -n '/^## Files/,/^## /p' "$CHILD_SPEC" | grep -v "^##" | grep -v "^$")
   fi

   # Get files modified during execution
   MODIFIED_FILES=$(git diff --name-only HEAD~{N}..HEAD)  # where N = number of commits this phase

   # Get summaries
   SUMMARIES=$(cat "${PHASE_DIR}"/*-SUMMARY.md 2>/dev/null)
   ```

   **Spawn spek:spec-enforcer in postflight mode:**

   ```markdown
   <postflight_context>

   **Phase:** {phase_number} - {phase_name}
   **Mode:** postflight

   **Spec:**
   {spec_content}

   **Test Files (from spec):**
   {test_files}

   **Implementation Files (from spec + git):**
   {impl_files}
   {modified_files}

   **Execution Summaries:**
   {summaries}

   </postflight_context>

   <instructions>

   Validate the three edges of the spec triangle:

   **Edge 1: Spec → Tests (Coverage)**
   - Does every acceptance criterion have test coverage?
   - Check test files exist and contain tests for each criterion
   - List any gaps

   **Edge 2: Tests → Code (All Pass)**
   - Run test suite (npm test, pytest, etc.)
   - Verify all tests GREEN
   - Report any failures

   **Edge 3: Code → Spec (Exact Match)**
   - Does implementation match requirements? (no more, no less)
   - Check for scope creep (extra features not in spec)
   - Check for missing requirements (spec says X, code doesn't have it)

   **Also check:**
   - Update child SPEC.md "Files" section with implementation file paths
   - Update child SPEC.md "Test Files" section if not already updated
   - Mark requirements as complete: `- [x]` in spec

   **Output format:**
   ## POSTFLIGHT PASS
   **Triangle:** Valid ✓
   **Coverage:** {N}/{N} criteria tested
   **Tests:** GREEN ✓
   **Scope:** Exact match ✓

   **SPEC.md updates:**
   - Files section: {N} files added
   - Test Files section: {M} test files confirmed
   - Requirements: {K} marked complete

   OR

   ## POSTFLIGHT DRIFT
   **Edge:** {spec-leads | code-leads | test-gap}
   **Severity:** {CRITICAL | WARNING}
   **Details:** {description}
   **Fix:** {what needs to happen}

   </instructions>
   ```

   ```
   Task(
     prompt=postflight_prompt,
     subagent_type="spek:spec-enforcer",
     model="sonnet",
     description="Postflight validation for Phase {phase}"
   )
   ```

   **Handle postflight return:**

   **`## POSTFLIGHT PASS`:**
   - Display: `✓ Triangle validated - spec ↔ tests ↔ code consistent`
   - Show SPEC.md updates made
   - Proceed to step 8

   **`## POSTFLIGHT DRIFT`:**
   - Display drift details
   - Check severity
   - **If CRITICAL:** Create gap closure plan: `/spek:plan-phase {X} --gaps`
   - **If WARNING:** Offer: 1) Fix now (gap closure), 2) Accept drift, 3) Abort
   - Wait for user response

8. **Update roadmap and state**
   - Update ROADMAP.md, STATE.md

9. **Update requirements**
   Mark phase requirements as Complete:
   - Read ROADMAP.md, find this phase's `Requirements:` line (e.g., "AUTH-01, AUTH-02")
   - Read REQUIREMENTS.md traceability table
   - For each REQ-ID in this phase: change Status from "Pending" to "Complete"
   - Write updated REQUIREMENTS.md
   - Skip if: REQUIREMENTS.md doesn't exist, or phase has no Requirements line

10. **Commit phase completion**
    Check `COMMIT_PLANNING_DOCS` from config.json (default: true).
    If false: Skip git operations for .planning/ files.
    If true: Bundle all phase metadata updates in one commit:
    - Stage: `git add .planning/ROADMAP.md .planning/STATE.md`
    - Stage REQUIREMENTS.md if updated: `git add .planning/REQUIREMENTS.md`
    - Commit: `docs({phase}): complete {phase-name} phase`

11. **Offer next steps**
    - Route to next action (see `<offer_next>`)
</process>

<offer_next>
Output this markdown directly (not as a code block). Route based on status:

| Status | Route |
|--------|-------|
| `gaps_found` | Route C (gap closure) |
| `human_needed` | Present checklist, then re-route based on approval |
| `passed` + more phases | Route A (next phase) |
| `passed` + last phase | Route B (milestone complete) |

---

**Route A: Phase verified, more phases remain**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► PHASE {Z} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

{Y} plans executed
Goal verified ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Phase {Z+1}: {Name}** — {Goal from ROADMAP.md}

/spek:discuss-phase {Z+1} — gather context and clarify approach

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /spek:plan-phase {Z+1} — skip discussion, plan directly
- /spek:verify-work {Z} — manual acceptance testing before continuing

───────────────────────────────────────────────────────────────

---

**Route B: Phase verified, milestone complete**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► MILESTONE COMPLETE 🎉
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**v1.0**

{N} phases completed
All phase goals verified ✓

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Audit milestone** — verify requirements, cross-phase integration, E2E flows

/spek:audit-milestone

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- /spek:verify-work — manual acceptance testing
- /spek:complete-milestone — skip audit, archive directly

───────────────────────────────────────────────────────────────

---

**Route C: Gaps found — need additional planning**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► PHASE {Z} GAPS FOUND ⚠
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {Z}: {Name}**

Score: {N}/{M} must-haves verified
Report: .planning/phases/{phase_dir}/{phase}-VERIFICATION.md

### What's Missing

{Extract gap summaries from VERIFICATION.md}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Plan gap closure** — create additional plans to complete the phase

/spek:plan-phase {Z} --gaps

<sub>/clear first → fresh context window</sub>

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase_dir}/{phase}-VERIFICATION.md — see full report
- /spek:verify-work {Z} — manual testing before planning

───────────────────────────────────────────────────────────────

---

After user runs /spek:plan-phase {Z} --gaps:
1. Planner reads VERIFICATION.md gaps
2. Creates plans 04, 05, etc. to close gaps
3. User runs /spek:execute-phase {Z} again
4. Execute-phase runs incomplete plans (04, 05...)
5. Verifier runs again → loop until passed
</offer_next>

<wave_execution>
**Parallel spawning:**

Before spawning, read file contents. The `@` syntax does not work across Task() boundaries.

```bash
# Read each plan and STATE.md
PLAN_01_CONTENT=$(cat "{plan_01_path}")
PLAN_02_CONTENT=$(cat "{plan_02_path}")
PLAN_03_CONTENT=$(cat "{plan_03_path}")
STATE_CONTENT=$(cat .planning/STATE.md)
```

Spawn all plans in a wave with a single message containing multiple Task calls, with inlined content:

```
Task(prompt="Execute plan at {plan_01_path}\n\nPlan:\n{plan_01_content}\n\nProject state:\n{state_content}", subagent_type="spek:executor", model="{executor_model}")
Task(prompt="Execute plan at {plan_02_path}\n\nPlan:\n{plan_02_content}\n\nProject state:\n{state_content}", subagent_type="spek:executor", model="{executor_model}")
Task(prompt="Execute plan at {plan_03_path}\n\nPlan:\n{plan_03_content}\n\nProject state:\n{state_content}", subagent_type="spek:executor", model="{executor_model}")
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
