---
name: trak:triage
description: Review proposed/ tickets — accept to todo/, reject with reason, or skip
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Review all tickets in `proposed/`. For each ticket, the user can accept (move to `todo/` at a priority position), reject (move to `rejected/` with a reason), or skip. Handles file renumbering when inserting into the middle of `todo/`.
</objective>

<process>

<step name="list_proposed">
**List proposed tickets**

```bash
ls .trak/proposed/ 2>/dev/null
```

If no tickets in `proposed/`, tell the user: "No proposed tickets to review. Use `/trak:propose` to add ideas."

Also read `todo/` for context:
```bash
ls .trak/todo/ 2>/dev/null
```
</step>

<step name="show_context">
**Show current state**

Display the current `todo/` queue (title + type for each) so the user has context for prioritization.

```
Current todo/ queue:
1. #{id} {title} [{type}]
2. #{id} {title} [{type}]
...

Proposed tickets to review: {count}
```
</step>

<step name="review_each">
**Review each proposed ticket**

For each ticket in `proposed/`:
1. Read the ticket and display a summary (title, type, description)
2. Use `AskUserQuestion`:
   - **Accept** — move to `todo/`, ask where in the priority order (top, bottom, or after ticket #N)
   - **Reject** — move to `rejected/`, ask for a brief reason
   - **Skip** — leave in `proposed/` for later

**On Accept:**
- Determine the target position in `todo/`
- If inserting into the middle, renumber files below the insertion point:
  - Work bottom-up to avoid filename collisions
  - Rename `003-foo.md` → `004-foo.md`, `002-bar.md` → `003-bar.md`, etc.
  - Update the `id` field in frontmatter to match the new number
- Move the ticket from `proposed/` to `todo/` with the correct number prefix

**On Reject:**
- Add `rejected: {today's date}` and `reason: {user's reason}` to frontmatter
- Move from `proposed/` to `rejected/`
</step>

<step name="summary">
**Show summary**

Display:
```
Triage complete:
- Accepted: {count} tickets
- Rejected: {count} tickets
- Skipped: {count} tickets

Updated todo/ queue:
1. #{id} {title} [{type}]
2. #{id} {title} [{type}]
...
```
</step>

</process>

<success_criteria>
- [ ] All proposed tickets reviewed (accepted, rejected, or skipped)
- [ ] Accepted tickets placed at correct priority position in todo/
- [ ] Renumbering handled correctly (no collisions, frontmatter IDs updated)
- [ ] Rejected tickets have date and reason in frontmatter
- [ ] User shown updated todo/ queue
</success_criteria>
