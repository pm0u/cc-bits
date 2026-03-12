---
name: vq:trek
description: Execute all remaining goals end-to-end without re-prompting — loops vq:go until done
allowed-tools:
  - Read
  - Bash
  - Agent
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

Each iteration runs `vq:go` as an isolated subagent so the main context stays lean — state is persisted to `.vq/` files between iterations.

Repeat:
1. Spawn a subagent to run one vq:go cycle:
   ```
   Agent(
     subagent_type="general-purpose",
     description="Execute vq:go",
     prompt="Invoke the vq:go skill: Skill(skill='vq:go'). Wait for it to complete and return 'done'."
   )
   ```
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
