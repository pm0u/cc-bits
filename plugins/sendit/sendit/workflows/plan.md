# Planning Workflow

Creates the implementation plan. Light mode: inline tasks. Full mode: planner agent + plan-checker.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/templates/plan.md

## Input

- `task`: The user's request
- `weight`: light | full
- `spec_path`: Path to relevant SPEC.md (may be null)
- `research_path`: Path to RESEARCH.md (may be null — only present if researcher ran)
- `test_files`: List of test files from test-writer (may be empty)

## Process

### Light Planning

<step name="light-plan">

Inline in main context. No agents spawned. No plan file created.

1. If spec exists, read it for requirements and criteria
2. Enumerate 1-5 tasks as a numbered list:
   ```
   1. {File}: {change} — {why}
   2. {File}: {change} — {why}
   ...
   ```
3. Each task should be one commit-sized change
4. Present to user for quick confirmation: "I'll make these changes:"
5. On approval → proceed to execution

No plan file is written. Tasks live in the conversation context.

</step>

### Full Planning

<step name="full-plan">

1. Spawn planner agent:
   ```
   Task(subagent_type="planner", prompt="
     SPEC: {spec_path}
     RESEARCH: {research_path (if available)}
     TEST_FILES: {test_files}
     TASK: {task description}

     Create an implementation plan.
     Read RESEARCH.md if provided for technical context.
     Write it to specs/{feature}/PLAN.md.
     Return the plan path and task count.
   ")
   ```

2. Spawn plan-checker agent:
   ```
   Task(subagent_type="plan-checker", prompt="
     PLAN: specs/{feature}/PLAN.md
     SPEC: {spec_path}
     TEST_FILES: {test_files}

     Validate the plan covers all spec requirements and tests.
     Return your verdict and any issues.
   ")
   ```

3. Process checker verdict:
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

4. Show final plan summary to user for approval

</step>

## Output

```markdown
**Plan**: {inline | specs/{feature}/PLAN.md}
**Tasks**: {N}
**Checker verdict**: {pass | revise | N/A (light mode)}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/execute.md
