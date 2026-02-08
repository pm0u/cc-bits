# Execution Workflow

Implements the plan. Always uses executor agents — the orchestrator never writes code itself.

## Input

- `weight`: light | full
- `tasks`: List of tasks from PLAN.md
- `spec_path`: Path to relevant SPEC.md
- `test_files`: List of test files (may be empty)

## Core Principle

The orchestrator spawns executor agents, monitors their results, and handles failures. It does NOT implement tasks directly, regardless of weight.

## Progress Tracking

Before executing the first task, write `specs/{feature}/PROGRESS.md` with the task list, weight, and current step. Update it after each task completes (mark task as done, record commit hash). This enables session recovery if interrupted.

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md (see PROGRESS.md section)

## Process

<step name="execute">

### Read the Plan

Read PLAN.md and extract the task list. For each task, note:
- Task description
- Files to modify
- Verification criteria
- Spec reference

### Execute Tasks

For each task in the plan, spawn an executor agent:

```
Task(subagent_type="executor", prompt="
  TASK: {task description from plan}
  SPEC: {spec_path}
  PLAN: specs/{feature}/PLAN.md
  FILES: {files to modify}
  VERIFY: {verification criteria}
  WEIGHT: {light | full}

  Implement this task, verify it works, and commit.
")
```

**Light mode**: Executor gets minimal context (task + files). Verification is lighter.

**Full mode**: Executor gets full context (task + spec + plan + test files). Each task is verified against tests.

### Handle Executor Response

After each executor completes:

**If `status: done`**:
- **Verify the commit exists.** The executor MUST have returned a commit hash. Validate it:
  ```bash
  git log --oneline -1 {commit_hash}
  ```
  If the hash is missing or invalid, treat as `status: failed` and retry once with explicit instruction: "You must commit your changes and return the commit hash."
- Update PROGRESS.md (mark task done, record commit hash)
- Proceed to next task

**If `status: failed`**:
- Decide:
  - Retry with modified instructions (1 retry max)
  - Skip and flag for user
  - Escalate to user immediately
- If retry, spawn a new executor with the failure context included

**If `status: KICKBACK`**:
- Stop execution immediately
- Report to user: "Executor flagged complexity issue on task {N}: {reason}"
- Route by kickback signal (see gates.md):
  - `scope_creep` → Upgrade remaining stages to full, possibly split spec
  - `missing_context` → Return to spec engagement to fill gaps
  - `needs_research` → Spawn researcher, then re-plan remaining tasks
- Do NOT continue executing subsequent tasks — the plan may need revision

**If `status: blocked`**:
- Report the blocker to user
- Ask how to proceed

### Parallelization

Tasks are executed sequentially by default (they often depend on prior tasks). The orchestrator MAY run independent tasks in parallel if:
- The plan explicitly marks tasks as independent
- Tasks modify completely different files
- Both conditions are true

When parallelizing, spawn multiple executor agents in a single message:
```
Task(subagent_type="executor", prompt="TASK: {task A}...")
Task(subagent_type="executor", prompt="TASK: {task B}...")
```

### Final Verification

After all tasks complete, run the full test suite:
```bash
npm test 2>&1 || python -m pytest 2>&1 || go test ./... 2>&1
```

If any failures, investigate and fix (spawn executor for the fix, max 3 fix rounds).

</step>

## Output

```markdown
**Execution**: {complete | partial | failed}
**Tasks completed**: {N}/{total}
**Commits**: {list of commit hashes}
**Test results**: {all-pass | N failures}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/postflight.md
