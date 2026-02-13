---
name: vq:status
description: Show current Vision Quest state — completed, current, and upcoming goals
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Display the current state of the Vision Quest workflow. Read the `.vq/` artifacts and present a clear summary of progress, current goal, and upcoming goals.
</objective>

<process>

<step name="check_exists">
**Check if .vq/ exists**

```bash
ls .vq/VISION.md .vq/GOALS.md .vq/LESSONS.md 2>/dev/null
```

If `.vq/` doesn't exist, tell the user: "No Vision Quest initialized. Run `/vq:init` to get started."
</step>

<step name="read_artifacts">
**Read the artifacts**

Read these files:
- `.vq/VISION.md` — for purpose and current state
- `.vq/GOALS.md` — for goal inventory
- `.vq/LESSONS.md` — for lessons count
</step>

<step name="display_status">
**Display status**

Parse and display:

```
Vision: {purpose from VISION.md, first line}
Status: {current state status from VISION.md}
Goals completed: {count from VISION.md}

Current goal:
  {goal name} — {done when description}
  Criteria: {N total, M remaining unchecked}

Upcoming goals:
  {numbered list of remaining goals under ## Current, after the first}

Lessons accumulated: {count of entries across all sections in LESSONS.md}

{If ## Deferred has entries:}
Deferred goals: {count}
```

If there are no goals remaining under `## Current`, display: "All goals complete! Run `/vq:init` or add new goals to `.vq/GOALS.md`."
</step>

</process>

<success_criteria>
- [ ] All artifacts read successfully
- [ ] Current goal clearly identified
- [ ] Progress shown (completed count, remaining count)
- [ ] Concise, scannable output
</success_criteria>
