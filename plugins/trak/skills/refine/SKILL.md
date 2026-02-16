---
name: trak:refine
description: Refine a ticket into goals — assess codebase, break into goals with criteria, move to inprogress/
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Take a ticket from `todo/` (first by sort order, or by ID argument), assess the codebase to understand what's involved, break the ticket into 1-N goals with criteria/constraints/context, present to the user for review, and move to `inprogress/`. This is where rough ideas become executable work.
</objective>

<process>

<step name="check_inprogress">
**Check if inprogress/ is occupied**

```bash
ls .trak/inprogress/ 2>/dev/null
```

If there's already a ticket in `inprogress/`:
- Warn the user: "Ticket #{id} ({title}) is already in progress."
- Use `AskUserQuestion`: Continue refining anyway (moves current in-progress back to todo/)? Or cancel?
- If continuing, move the current in-progress ticket back to `todo/` first
</step>

<step name="pick_ticket">
**Pick ticket to refine**

If an ID argument was provided, find that ticket in `todo/`. Otherwise, pick the first file by sort order.

```bash
ls .trak/todo/ 2>/dev/null
```

Read the selected ticket file. Parse frontmatter and body content.

If `todo/` is empty, tell the user: "No tickets in todo/. Run `/trak:propose` to add work or `/trak:triage` to review proposed tickets."
</step>

<step name="assess_codebase">
**Assess the codebase**

Based on the ticket's description, explore the relevant code:
- Read files mentioned in the ticket
- Search for related code, patterns, and dependencies
- Identify what exists, what needs to change, and what's missing
- Check for blockers or complications the ticket didn't anticipate

This is critical — goals should be grounded in what the code actually looks like, not just what the ticket says.
</step>

<step name="define_goals">
**Break ticket into goals**

Based on the ticket and codebase assessment, define 1-N goals. Each goal needs:

```markdown
### {N}. {Goal name}
- Done when: {concrete completion description}
- Criteria:
  - [ ] {Testable criterion 1}
  - [ ] {Testable criterion 2}
- Constraints: {what to follow/avoid}
- Context: {file paths the executor should read}
```

Guidelines:
- Goals should be ordered by dependency (earlier goals enable later ones)
- Each goal should be completable in a single executor run
- Criteria must be testable where possible
- Context paths should point to specific files, not whole directories
- Constraints should include relevant patterns from the codebase assessment

If the assessment reveals the ticket should be deprioritized or split:
- Recommend reprioritization: "Ticket X should come first given what I see"
- Recommend splitting: "This is really two separate tickets"
- Use `AskUserQuestion` for the user to decide
</step>

<step name="present_goals">
**Present goals to user for review**

Show the complete goal breakdown and ask the user to review. Use `AskUserQuestion`:
- Approve as-is
- Adjust (then discuss changes)
- Cancel refinement

Iterate if the user wants changes.
</step>

<step name="move_to_inprogress">
**Move ticket to inprogress/**

1. Update the ticket file:
   - Add `refined: {today's date}` to frontmatter
   - Populate the `## Goals` section with the defined goals
2. Move the file:
   ```bash
   mv .trak/todo/{filename} .trak/inprogress/{filename}
   ```

Display:
```
Ticket #{id} refined and moved to in-progress.
Goals: {count}

1. {goal 1 name}
2. {goal 2 name}
...

Run /trak:go to execute the first goal.
```
</step>

</process>

<success_criteria>
- [ ] Codebase assessed before defining goals (not just formatting the ticket)
- [ ] 1-N goals defined with testable criteria, constraints, and context paths
- [ ] Goals presented to user for review before finalizing
- [ ] Ticket moved to inprogress/ with refined date in frontmatter
- [ ] User shown goal summary and next steps
</success_criteria>
