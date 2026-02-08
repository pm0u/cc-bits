# Execution Workflow

Implements the plan. Light mode: inline execution. Full mode: executor agent per task.

## Input

- `weight`: light | full
- `tasks`: List of tasks (inline list or PLAN.md path)
- `spec_path`: Path to relevant SPEC.md
- `test_files`: List of test files (may be empty)

## Progress Tracking

Before executing the first task, write `specs/{feature}/PROGRESS.md` with the task list, weight, and current step. Update it after each task completes (mark task as done, record commit hash). This enables session recovery if interrupted.

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md (see PROGRESS.md section)

## Process

### Light Execution

<step name="light-execute">

Execute tasks inline in main context. No agents spawned.

For each task in the numbered list:

1. Make the changes described
2. If tests exist for this change, run them:
   ```bash
   npm test 2>&1 || true
   ```
3. If no tests and this is a testable change, write a quick test first (light TDD)
4. Commit the change:
   ```bash
   git add {specific files}
   git commit -m "{descriptive message}"
   ```
5. Update PROGRESS.md (mark task done, record commit)
6. Move to next task

If a task fails:
- Debug (max 2 attempts)
- If still failing, ask user for guidance before proceeding

</step>

### Full Execution

<step name="full-execute">

Spawn executor agent for each task or group of related tasks.

1. Read the PLAN.md
2. For each task (or task group):
   ```
   Task(subagent_type="executor", prompt="
     TASK: {task description from plan}
     SPEC: {spec_path}
     PLAN: specs/{feature}/PLAN.md
     FILES: {files to modify}
     VERIFY: {verification criteria}

     Implement this task, verify it works, and commit.
   ")
   ```

3. After each task completion:
   - Check the executor's result
   - If failed, decide:
     - Retry with modified instructions (1 retry max)
     - Skip and flag for user
     - Escalate to user
   - If succeeded, update PROGRESS.md and proceed to next task

4. After all tasks complete:
   - Run full test suite one more time
   ```bash
   npm test 2>&1 || python -m pytest 2>&1 || go test ./... 2>&1
   ```
   - If any failures, investigate and fix

</step>

## Output

```markdown
**Execution**: {complete | partial | failed}
**Tasks completed**: {N}/{total}
**Commits**: {list of commit hashes}
**Test results**: {all-pass | N failures}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/postflight.md
