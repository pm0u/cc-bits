---
name: vq:trek
description: Execute all remaining goals end-to-end without re-prompting — loops vq:go until done
allowed-tools:
  - Read
  - Skill
---

<objective>
Run all remaining goals in sequence by invoking `vq:go` in a loop. Stops when there are no more goals under `## Current` in `.vq/GOALS.md`. Human interaction (SIGNIFICANT adjustments, critical concerns) is handled by `vq:go` — it will prompt the user inline and resume automatically.
</objective>

<process>

<step name="check_goals">
**Verify there are goals to run**

Read `.vq/GOALS.md`. If `## Current` has no goals, tell the user: "No goals to run. Add goals to `.vq/GOALS.md` or run `/vq:init`."
</step>

<step name="loop">
**Execute goals in a loop**

Repeat:
1. Invoke `Skill(skill="vq:go")`
2. After it completes, read `.vq/GOALS.md`
3. If `## Current` still has goals, continue the loop
4. If `## Current` is empty, stop

Display a final summary when all goals are complete:

```
All goals complete!

Goals executed this run: {count}
Total goals completed: {count from ## Completed}
```
</step>

</process>
