# Planning Workflow

Creates the implementation plan. Always uses the planner agent — the orchestrator never creates plans itself.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/templates/plan.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/gates.md

## Input

- `task`: The user's request
- `weight`: light | full
- `spec_path`: Path to relevant SPEC.md (may be null)
- `research_path`: Path to RESEARCH.md (may be null — only present if researcher ran)
- `test_files`: List of test files from test-writer (may be empty)

## Process

### Planning (all weights)

<step name="plan">

The orchestrator MUST spawn the planner agent. Do NOT create plans inline.

**Light mode**: Spawn planner with lightweight prompt (fewer context files, target 1-5 tasks):
```
Task(subagent_type="planner", prompt="
  SPEC: {spec_path}
  TASK: {task description}
  WEIGHT: light

  Create a focused implementation plan.
  Target 1-5 tasks. Keep it concise.
  Write to specs/{feature}/PLAN.md.
  Return the plan path and task count.
")
```

**Full mode**: Spawn planner with full context:
```
Task(subagent_type="planner", prompt="
  SPEC: {spec_path}
  RESEARCH: {research_path (if available)}
  TEST_FILES: {test_files}
  TASK: {task description}
  WEIGHT: full

  Create a thorough implementation plan.
  Read RESEARCH.md if provided for technical context.
  Target 2-8 tasks. Every acceptance criterion must be covered.
  Write to specs/{feature}/PLAN.md.
  Return the plan path and task count.
")
```

### Handle Planner Response

**If planner returns `status: done`**:
- In full mode: spawn plan-checker (see below)
- In light mode: present plan summary to user for confirmation

**If planner returns `status: KICKBACK`**:
- Report to user: "The planner flagged this spec as too complex: {reason}"
- Route by signal (see gates.md kickback protocol)
- Do NOT retry the planner with the same input

### Plan Checking (full mode only)

```
Task(subagent_type="plan-checker", prompt="
  PLAN: specs/{feature}/PLAN.md
  SPEC: {spec_path}
  TEST_FILES: {test_files}

  Validate the plan covers all spec requirements and tests.
  Return your verdict and any issues.
")
```

Process checker verdict:
- **PASS**: Show plan summary to user, proceed to execution
- **REVISE**: Send issues back to planner for revision (max 1 revision)
  ```
  Task(subagent_type="planner", prompt="
    SPEC: {spec_path}
    EXISTING_PLAN: specs/{feature}/PLAN.md
    CHECKER_FEEDBACK: {issues}

    Revise the plan to address these issues.
    Update specs/{feature}/PLAN.md.
  ")
  ```
- After revision, re-check with plan-checker (max 2 total rounds)
- If still REVISE after 2 rounds, show issues to user and ask for guidance

### User Approval

Present final plan summary to user before executing. Include:
- Task count
- Files that will be created/modified
- Any notes from the planner

</step>

## Output

```markdown
**Plan**: specs/{feature}/PLAN.md
**Tasks**: {N}
**Checker verdict**: {pass | revise | N/A (light mode)}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/execute.md
