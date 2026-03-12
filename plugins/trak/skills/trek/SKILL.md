---
name: trak:trek
description: Loop trak:go until all tickets are done — execute goals end-to-end without re-prompting
allowed-tools:
  - Read
  - Bash
  - Agent
---

<objective>
Run all remaining goals and tickets in sequence by invoking `trak:go` in a loop. Stops when there are no more tickets in `inprogress/` or `todo/`. Human interaction (SIGNIFICANT adjustments, critical concerns) is handled by `trak:go` — it will prompt the user inline and resume automatically.
</objective>

<process>

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
5. If the post-snapshot is empty, all tickets are done — stop.
6. Otherwise continue the loop.

Display a final summary when all tickets are complete:

```
All tickets done!

Tickets completed this run: {count}
Total tickets completed: {count of files in completed/}
```
</step>

</process>

<success_criteria>
- [ ] Tickets exist in inprogress/ or todo/ before starting
- [ ] Loop continues until both inprogress/ and todo/ are empty
- [ ] Final summary shows tickets completed count
</success_criteria>
