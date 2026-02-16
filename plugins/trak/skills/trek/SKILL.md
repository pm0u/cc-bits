---
name: trak:trek
description: Loop trak:go until all tickets are done — execute goals end-to-end without re-prompting
allowed-tools:
  - Read
  - Skill
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

Repeat:
1. Invoke `Skill(skill="trak:go")`
2. After it completes, check if `inprogress/` or `todo/` still have tickets:
   ```bash
   ls .trak/inprogress/ .trak/todo/ 2>/dev/null
   ```
3. If either has files, continue the loop
4. If both are empty, stop

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
