# Pre-flight Workflow

Checks for conflicts between the task and existing specs before work begins. Always spawns the spec-enforcer agent — the orchestrator does not do preflight inline.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/triangle-validation.md

## Input

- `task`: The user's request
- `weight`: light | full (from assessment)
- `relevant_specs`: List of spec paths (from assessment)

## Process

<step name="preflight">

### Pre-flight Check

If no relevant specs → skip pre-flight entirely, proceed to spec engagement or planning.

Otherwise, spawn the spec-enforcer agent:

**Light mode**: Quick check prompt:
```
Task(subagent_type="spec-enforcer", prompt="
  MODE: preflight-light
  TASK: {task description}
  SPECS: {list of spec paths}
  Quick check for obvious conflicts with existing specs. Return 1-2 sentences.
")
```

**Full mode**: Thorough analysis:
```
Task(subagent_type="spec-enforcer", prompt="
  MODE: preflight
  TASK: {task description}
  SPECS: {list of spec paths}
  Read each spec and check for conflicts with the proposed task.
  Check for: contradictions with Won't Have items, design decision conflicts,
  acceptance criteria violations, OPEN items, missing criteria.
  Return a structured preflight report.
")
```

### Process the Response

- **CLEAR**: No conflicts. Proceed to spec engagement or planning.
- **CONFLICT**: Hard conflict found.
  - Show the conflict to the user
  - Must resolve before proceeding (spec engagement required)
  - Upgrade to full if not already
- **NEEDS-SPEC-UPDATE**: Spec is outdated or incomplete.
  - Flag for spec engagement stage
  - Can proceed with caveat

</step>

## Output

```markdown
**Preflight**: {clear | conflict | needs-update}
**Details**: {summary}
**Action**: {proceed | resolve | update-spec}
```

Proceed to:
- If spec engagement needed → @~/.claude/plugins/marketplaces/sendit/sendit/workflows/spec-engagement.md
- If clean, full mode → @~/.claude/plugins/marketplaces/sendit/sendit/workflows/write-tests.md (if spec changed) or @~/.claude/plugins/marketplaces/sendit/sendit/workflows/plan.md
- If clean, light mode → @~/.claude/plugins/marketplaces/sendit/sendit/workflows/plan.md
