---
name: trak:trek
description: Loop trak:go until all tickets are done — execute goals end-to-end without re-prompting
allowed-tools:
  - Read
  - Write
  - Bash
  - Agent
  - AskUserQuestion
---

<objective>
Run all remaining goals and tickets in sequence by invoking `trak:go` in a loop. Stops when there are no more tickets in `inprogress/` or `todo/`. Human interaction (SIGNIFICANT adjustments, critical concerns) is handled by `trak:go` — it will prompt the user inline and resume automatically.
</objective>

<process>

<step name="read_trust">
**Resolve the trust level**

```bash
cat .trak/config.json 2>/dev/null
```

Extract the `trust` field (`low`, `med`, or `high`). Carry this through the run — it controls how executor-discovered tickets are handled.
</step>

<step name="check_tickets">
**Verify there are tickets to run**

```bash
ls .trak/inprogress/ .trak/todo/ 2>/dev/null
```

If neither directory has files, tell the user: "Nothing to run. Use `/trak:propose` to add tickets or `/trak:board` to see the board."
</step>

<step name="loop">
**Execute goals in a loop**

Each iteration runs `trak:go` as an isolated subagent so the main context stays lean — state is persisted to `.trak/` files between iterations.

Repeat:
1. Snapshot the current ticket list before invoking:
   ```bash
   ls .trak/inprogress/ .trak/todo/ 2>/dev/null
   ```
2. Spawn a subagent to run one trak:go cycle:
   ```
   Agent(
     subagent_type="general-purpose",
     description="Execute trak:go",
     prompt="Invoke the trak:go skill: Skill(skill='trak:go'). Wait for it to complete and return 'done'."
   )
   ```
3. After it completes, snapshot again:
   ```bash
   ls .trak/inprogress/ .trak/todo/ 2>/dev/null
   ```
4. If both snapshots are identical (same files, nothing moved), `trak:go` exited early — all remaining tickets are blocked. Stop and tell the user which tickets remain and what's blocking them.
5. After each iteration, check for executor-discovered tickets and promote them based on trust level (see **Promote discovered tickets** below).
6. If the post-snapshot is empty (after any promotions), all tickets are done — stop.
7. Otherwise continue the loop.

**Promote discovered tickets**

After each iteration, check for executor-discovered tickets in `proposed/`:

```bash
grep -rl "source: executor" .trak/proposed/ 2>/dev/null
```

If any are found:

- **`trust: low`** — Do not auto-promote. Notify the user: "N executor-discovered ticket(s) in proposed/ — run `/trak:triage` to review before continuing." Stop the loop.
- **`trust: med`** — List each ticket's title and type. `AskUserQuestion`: "Promote these N executor-discovered tickets to todo/ and continue? [list] (yes / no)" If yes, move them. If no, stop and tell the user to run `/trak:triage`.
- **`trust: high`** — Automatically move all `source: executor` tickets from `proposed/` to `todo/` using `mv`. Note each promotion in the summary.

Display a final summary when all tickets are complete:

```
All tickets done!

Tickets completed this run: {count}
Total tickets completed: {count of files in completed/}
Auto-promoted tickets: {count, or omit if 0}
Pending triage: {count in proposed/, or omit if 0}
```
</step>

</process>

<success_criteria>
- [ ] Tickets exist in inprogress/ or todo/ before starting
- [ ] Trust level read from config.json at start
- [ ] Executor-discovered tickets handled per trust level after each iteration
- [ ] Loop continues until both inprogress/ and todo/ are empty (accounting for promoted tickets)
- [ ] Final summary shows tickets completed, auto-promoted, and pending triage counts
</success_criteria>
