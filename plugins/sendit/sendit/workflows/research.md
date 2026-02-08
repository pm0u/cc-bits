# Research Workflow

Investigates unfamiliar technology and patterns before planning. Full mode only, and only when needed.

## Input

- `spec_path`: Path to the SPEC.md
- `task`: The user's original request

## Trigger Conditions

Research runs in full mode when ANY of these apply:

| Signal | Example |
|--------|---------|
| Spec references external libraries not in the project | "Integrate Stripe payments" but no Stripe SDK installed |
| Spec involves unfamiliar APIs or protocols | "Add WebSocket support" with no existing WS code |
| Spec requires patterns not present in the codebase | "Add OAuth" with no auth middleware |
| Design decisions section has unresolved technology choices | "Choose between Redis and Memcached" |
| User explicitly asks for research | "Look into the best approach for this" |

Research does NOT run when:
- The spec involves only existing patterns and libraries
- The task is a modification to existing well-understood code
- Light mode (research is always skipped in light mode)

## Process

<step name="trigger-check">

### 1. Check if Research is Needed

Quick heuristic (run in main context, not an agent):

1. Read the spec's requirements and design decisions
2. Check if referenced technologies exist in the project:
   ```bash
   # Check package.json / pyproject.toml for dependencies
   cat package.json 2>/dev/null | grep -i "{keyword}" || true
   ```
3. Search codebase for similar patterns:
   ```bash
   grep -rl "{pattern}" src/ lib/ app/ 2>/dev/null | head -5
   ```

If everything is familiar → skip research, proceed to planning.
If unfamiliar territory detected → spawn researcher.

</step>

<step name="run-research">

### 2. Spawn Researcher

```
Task(subagent_type="researcher", prompt="
  SPEC: {spec_path}
  RESEARCH FOCUS: {what specifically needs investigation}

  Investigate how to implement this spec well.
  Write findings to specs/{feature}/RESEARCH.md.
  Focus on: {specific topics needing research}
")
```

</step>

<step name="feed-planner">

### 3. Feed Results to Planner

The research output (`specs/{feature}/RESEARCH.md`) is passed to the planner as additional context:

```
Task(subagent_type="planner", prompt="
  SPEC: {spec_path}
  RESEARCH: specs/{feature}/RESEARCH.md
  TEST_FILES: {test_files}
  TASK: {task}

  Create an implementation plan informed by the research findings.
  Write to specs/{feature}/PLAN.md.
")
```

The planner reads RESEARCH.md and uses findings to:
- Choose the right approach (based on recommendations)
- Avoid documented pitfalls
- Reference the correct APIs and patterns
- Note open questions that need validation during execution

</step>

## Output

```markdown
**Research**: {needed | skipped}
**Findings**: specs/{feature}/RESEARCH.md (if needed)
**Confidence**: {high | mixed | low}
**Open questions**: {count}
```

Proceed to: @~/.claude/plugins/marketplaces/sendit/sendit/workflows/plan.md
