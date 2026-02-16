---
name: trak:board
description: Text-based kanban view — show ticket flow, active work, and upcoming queue
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Display a text-based kanban view of the `.trak/` board. Show ticket counts per column, active ticket detail, upcoming queue, and project context. Quick status check — no modifications.
</objective>

<process>

<step name="check_exists">
**Check if .trak/ exists**

```bash
ls .trak/PROJECT.md 2>/dev/null
```

If `.trak/` doesn't exist, tell the user: "No trak board found. Run `/trak:init` to get started."
</step>

<step name="read_state">
**Read board state**

Read in parallel:
1. `.trak/PROJECT.md` — for purpose line
2. Count files in each directory:
   ```bash
   ls .trak/proposed/ .trak/todo/ .trak/inprogress/ .trak/completed/ .trak/rejected/ 2>/dev/null
   ```
3. If `inprogress/` has a ticket — read it for goal detail
4. Read first 5 files from `todo/` — title and type only
5. `.trak/LESSONS.md` — count entries
</step>

<step name="display_board">
**Display the board**

```
Project: {purpose from PROJECT.md}

proposed({N}) → todo({N}) → inprogress({N}) → completed({N})  rejected({N})

{If inprogress/ has a ticket:}
In Progress:
  #{id} {title} [{type}]
  Goal {current} of {total}: {goal name}
  Criteria: {done}/{total} done

{If todo/ has tickets:}
Up Next:
  1. #{id} {title} [{type}]
  2. #{id} {title} [{type}]
  3. #{id} {title} [{type}]
  ...

{If proposed/ has tickets:}
Proposed: {count} tickets awaiting triage

Lessons: {N} entries
```

If nothing is in progress and todo/ is empty:
```
All clear! No active or queued tickets.
Use /trak:propose to add new work.
```
</step>

</process>

<success_criteria>
- [ ] All column counts accurate
- [ ] Active ticket shown with current goal and criteria progress
- [ ] Upcoming queue shown (up to 5)
- [ ] Project purpose displayed
- [ ] Concise, scannable output
</success_criteria>
