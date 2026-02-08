# Pre-flight Workflow

Checks for conflicts between the task and existing specs before work begins.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/triangle-validation.md

## Input

- `task`: The user's request
- `weight`: light | full (from assessment)
- `relevant_specs`: List of spec paths (from assessment)

## Process

### Light Pre-flight

Runs inline in main context. Fast and minimal.

<step name="light-preflight">

1. If no relevant specs → skip pre-flight entirely, proceed to planning
2. For each relevant spec:
   a. Read the spec
   b. Quick scan for obvious conflicts:
      - Does the task contradict a "Won't Have" item?
      - Does the task conflict with a design decision?
      - Does the task break an acceptance criterion?
3. If conflicts found:
   - Report to user: "This conflicts with {spec}: {reason}"
   - Offer: resolve conflict (upgrade to full) or proceed anyway
4. If clean → proceed

**Output**: 1-2 sentences confirming no conflicts, or describing the conflict.

</step>

### Full Pre-flight

Spawns the spec-enforcer agent for thorough analysis.

<step name="full-preflight">

1. Spawn spec-enforcer agent in preflight mode:
   ```
   Task(subagent_type="spec-enforcer", prompt="
     MODE: preflight
     TASK: {task description}
     SPECS: {list of spec paths}

     Read each spec and check for conflicts with the proposed task.
     Return a structured preflight report.
   ")
   ```

2. Process the report:
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
