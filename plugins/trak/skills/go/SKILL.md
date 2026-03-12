---
name: trak:go
description: Execute the next goal — pick ticket, refine if needed, spawn TDD executor, reconcile results
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
  - Skill
---

<objective>
Smart router and main execution loop for Trak. If `.trak/` doesn't exist, invoke `trak:init`. Otherwise, execute the next goal: find the active ticket (or pick one from `todo/`), read the next unchecked goal, assemble context, spawn the executor, reconcile results into all artifacts, create discovered tickets, and show the user what happened. One goal per invocation.
</objective>

<process>

<step name="route">
**Check if .trak/ exists**

```bash
ls .trak/PROJECT.md 2>/dev/null
```

If `.trak/` doesn't exist, invoke `trak:init`:
```
Skill(skill="trak:init")
```
Then stop — the user will run `/trak:go` again after init completes.
</step>

<step name="find_active_ticket">
**Find the active ticket**

```bash
ls .trak/inprogress/ 2>/dev/null
```

**If `inprogress/` has a ticket:**
- Read the ticket file
- Find the next unchecked goal (first goal heading whose criteria contain `[ ]`)
- If all goals are checked off → ticket is complete (handle in reconciliation)

**If `inprogress/` is empty:**
```bash
ls .trak/todo/ 2>/dev/null
```
- If `todo/` has tickets, find the first **unblocked** one:
  1. Collect all open ticket IDs: scan filenames in `proposed/`, `todo/`, `inprogress/` and parse their numeric ID
  2. For each ticket in `todo/` (by filename sort order):
     - Read its frontmatter `blocked-by:` field
     - If `blocked-by` is empty or all listed IDs are in `completed/` or `rejected/` → this ticket is unblocked, pick it
     - If any listed ID is still open (in proposed/, todo/, inprogress/) → skip it, note it as blocked
  3. If no unblocked ticket is found, tell the user which tickets are blocked and by what, then stop
- Invoke refinement on the chosen ticket: `Skill(skill="trak:refine")`
- After refinement completes, read the now-refined ticket from `inprogress/`
- Find the first goal

**If both are empty:**
- Tell the user: "All tickets done! Run `/trak:propose` to add new work or `/trak:board` to see the board."
</step>

<step name="read_trust">
**Resolve the trust level**

1. Read `.trak/config.json` — get project default trust
2. Read the active ticket's `trust:` frontmatter field
3. If ticket `trust:` is set, use it. Otherwise use the config default.

Carry this value through the rest of execution — it controls how SIGNIFICANT adjustments and concerns are handled.
</step>

<step name="gather_context">
**Read all context files**

1. Read `.trak/LESSONS.md` — full content
2. Read `.trak/PROJECT.md` — extract Key Decisions section
3. For each path in the goal's Context field, read the file/directory contents
4. Track total size — if context exceeds ~50KB, drop least relevant code files (always keep criteria, constraints, lessons)
</step>

<step name="assemble_and_spawn">
**Assemble prompt and spawn executor**

Build the executor prompt with all gathered content:

```xml
<ticket>
Ticket #{id}: {title} [{type}]
</ticket>

<goal>
{Goal name and "Done when" description}
</goal>

<acceptance_criteria>
{Criteria checklist items from the goal}
</acceptance_criteria>

<constraints>
{Goal constraints + Key Decisions from PROJECT.md}
</constraints>

<current_code_context>
{Pasted file contents from the goal's Context field.
 Wrap each file in <file path="...">...</file> tags.
 If a file is >500 lines, include only relevant sections.}
</current_code_context>

<lessons>
{Full LESSONS.md content}
</lessons>

<instructions>
Execute this goal using TDD. Write failing tests from the acceptance criteria first,
then implement until all tests pass. Commit atomically. Return your results in the
structured XML format defined in your agent instructions.

Route discoveries outside this goal's scope into <tickets> — bugs, features, refactors,
or research questions you encounter but should NOT fix now.
</instructions>
```

Assembly rules:
- **Read, don't reference** — paste file contents directly. The executor has no access to `@` paths or conversation context.
- **Context paths** — read every path in the goal's Context field. If a path is a directory, read key files within it.
- **Lessons always included** — even if short. HISTORY.md never included (cold storage).
- **Size management** — if total context exceeds ~50KB, prioritize: criteria > constraints > lessons > most relevant code files.

Then spawn:

```
Task(
  subagent_type="trak:executor",
  description="Execute goal: {goal name}",
  prompt="{assembled XML prompt}"
)
```

Wait for the executor to complete and return its `<result>`.
</step>

<step name="parse_return">
**Parse the executor's return**

Extract from the `<result>` XML:
- `accomplished` — what was done
- `tests` — test inventory
- `learned` — new knowledge
- `adjustments` — suggested goal changes (MINOR vs SIGNIFICANT)
- `concerns` — risks or issues
- `tickets` — discovered work items
- `verification` — how the goal was verified
- `commits` — commit log
</step>

<step name="update_ticket">
**Update the ticket**

Read the ticket in `inprogress/` and:
1. Check off completed goal criteria (change `[ ]` to `[x]`)
2. Process adjustments:
   - **MINOR**: Auto-apply to relevant goals in the ticket, note what changed
   - **SIGNIFICANT**: Handle based on trust level:
     - `low` — `AskUserQuestion` with full context: what the executor found, what it suggests, what the implications are. Full discussion.
     - `med` — Synthesize the situation into a single proposed action with one-line rationale. `AskUserQuestion`: "Proposed: [action] because [reason]. Apply / adjust / reject?" One-touch.
     - `high` — Spawn `trak:planner` agent with the adjustment details + full context. Apply its decision. Append decision + rationale to HISTORY.md under the current goal entry.
3. Append verification info to the `## Verification` section:
   ```markdown
   ### Goal {N}: {goal name}
   {verification content from executor}
   ```

Write the updated ticket file.
</step>

<step name="create_discovered_tickets">
**Create discovered tickets**

If `<tickets>` has content, create new ticket files in `proposed/`:

1. Scan all `.trak/` directories for the max existing ticket ID
2. For each discovered ticket:
   - Assign next sequential ID
   - Generate slug from title
   - Use appropriate template (BUG → ticket-bug, FEATURE → ticket-feature, etc.)
   - Set frontmatter: id, created (today), type, `source: executor`
   - If the executor specified `[blocked-by: current]`, set `blocked-by: [{current ticket id}]` in frontmatter
   - If the executor specified `[blocked-by: #N]`, set `blocked-by: [N]` in frontmatter
   - Fill in title and context description
   - Leave `## Goals` empty
</step>

<step name="update_lessons">
**Update LESSONS.md**

Read `.trak/LESSONS.md` and add entries from `<learned>`:
- Patterns → `## Patterns` section
- Pitfalls → `## Pitfalls` section
- Decisions → `## Decisions` section

Check for duplicates — if a new lesson overlaps with an existing entry, merge rather than duplicate.

Write the updated file.
</step>

<step name="update_history">
**Append to HISTORY.md**

Read `.trak/HISTORY.md` and append:

```markdown
---

## Ticket #{id}: {title} — Goal {N}: {goal name}
**Completed**: {today's date}
**Commits**: {commit count}

<details>
<summary>Full executor return</summary>

{raw <result> content from executor}

</details>
```

Write the updated file.
</step>

<step name="update_project">
**Update PROJECT.md**

Read `.trak/PROJECT.md` and update:
- **Current State**: Update status description, set last updated to today
- **Key Decisions**: Add any architectural decisions that emerged from `<learned>`

Write the updated file.
</step>

<step name="check_ticket_completion">
**Check if ticket is complete**

Read the ticket and check if ALL goals have all criteria checked off (`[x]`).

If complete:
1. Add `completed: {today's date}` to frontmatter
2. Move file from `inprogress/` to `completed/`:
   ```bash
   mv .trak/inprogress/{filename} .trak/completed/{filename}
   ```
3. Update PROJECT.md tickets completed count
</step>

<step name="handle_concerns">
**Handle concerns**

If `<concerns>` has content, first classify each concern:

- **Blocking** — fundamental: broken build, missing infrastructure, constraint violation, ambiguous acceptance criteria. These always interrupt regardless of trust level.
- **Advisory** — scope, approach, tech debt, assumptions. These are handled based on trust level.

For **blocking** concerns: always `AskUserQuestion` with full context. Do not proceed until resolved.

For **advisory** concerns:
- `low` — `AskUserQuestion` with full context (current behavior)
- `med` — Synthesize into a proposed resolution. `AskUserQuestion`: "Concern: [X]. Proposed: [action]. Proceed / adjust / reject?"
- `high` — Spawn `trak:planner` with the concern + context. Log decision to HISTORY.md. Continue.
</step>

<step name="summary">
**Show summary to user**

Display:

```
Goal completed: {goal name} (Ticket #{id}: {title})
Trust: {low|med|high}
Commits: {count}
Tests: {test file count}
Lessons: {count added}
Proposed tickets: {count, or "none"}
Autonomous decisions: {count, or "none"}  ← only shown if trust: med or high
Ticket progress: {M} of {T} goals complete {or "Ticket complete!"}

Next: {next goal in ticket | next ticket in todo/ | "All tickets done!"}
```
</step>

</process>

<success_criteria>
- [ ] Active ticket correctly identified (or picked from todo/ and refined)
- [ ] Next unchecked goal correctly identified
- [ ] Executor received complete context (criteria, constraints, lessons, code)
- [ ] Ticket updated with checked-off criteria and verification
- [ ] Discovered tickets created in proposed/
- [ ] LESSONS.md, HISTORY.md, PROJECT.md updated
- [ ] MINOR adjustments auto-applied
- [ ] SIGNIFICANT adjustments presented to user
- [ ] Concerns displayed if present
- [ ] User shown clear summary with next steps
</success_criteria>
