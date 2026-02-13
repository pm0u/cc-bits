---
name: vq:go
description: Execute the next goal — read current goal, spawn TDD executor, reconcile learnings into artifacts
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
Smart router and main execution loop for Vision Quest. If `.vq/` doesn't exist, invoke `vq:init`. Otherwise, execute the next goal: read it, assemble context, spawn the executor, reconcile results into all four artifacts, and show the user what happened. One goal per invocation.
</objective>

<process>

<step name="route">
**Check if .vq/ exists**

```bash
ls .vq/GOALS.md 2>/dev/null
```

If `.vq/` doesn't exist, invoke `vq:init`:
```
Skill(skill="vq:init")
```
Then stop — the user will run `/vq:go` again after init completes.
</step>

<step name="read_goal">
**Read and parse the current goal**

Read `.vq/GOALS.md` and extract the first goal under `## Current`:
- Goal name
- Done when description
- Criteria (checklist items)
- Constraints
- Context (file paths)

If `## Current` has no goals, tell the user: "All goals complete! Add new goals to `.vq/GOALS.md` or run `/vq:init` to start fresh."
</step>

<step name="gather_context">
**Read all context files**

1. Read `.vq/LESSONS.md` — full content
2. Read `.vq/VISION.md` — extract Key Decisions section
3. For each path in the goal's Context field, read the file/directory contents
4. Track total size — if context exceeds ~50KB, drop least relevant code files (always keep criteria, constraints, lessons)
</step>

<step name="assemble_and_spawn">
**Assemble prompt and spawn executor**

Build the executor prompt by pasting all gathered content into this XML structure:

```xml
<goal>
{Goal name and "Done when" description}
</goal>

<acceptance_criteria>
{Criteria checklist items from the goal}
</acceptance_criteria>

<constraints>
{Goal constraints + Key Decisions from VISION.md}
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
</instructions>
```

Assembly rules:
- **Read, don't reference** — paste file contents directly. The executor has no access to `@` paths or conversation context.
- **Context paths** — read every path in the goal's Context field. If a path is a directory, read key files within it.
- **Lessons always included** — even if short. HISTORY.md never included (cold storage).
- **Size management** — if total context exceeds ~50KB, prioritize: criteria > constraints > lessons > most relevant code files. Drop least relevant files.

Then spawn:

```
Task(
  subagent_type="vision-quest:executor",
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
- `commits` — commit log
</step>

<step name="sanity_check">
**Sanity check tests vs criteria**

Compare the goal's acceptance criteria against the tests listed in `<tests>`:
- Note any criteria without corresponding tests
- Note any tests that don't map to criteria

This is informational — flag discrepancies in the summary but don't block.
</step>

<step name="update_vision">
**Update VISION.md**

Read `.vq/VISION.md` and update:
- **Current State**: Increment goals completed, update status description, set last updated to today
- **Key Learnings**: Add vision-level insights from `<learned>` (not implementation details)
- **Key Decisions**: Add any architectural decisions that emerged

Write the updated file.
</step>

<step name="update_goals">
**Update GOALS.md**

Read `.vq/GOALS.md` and:
1. Move the completed goal from `## Current` to `## Completed`, checking off all criteria
2. Process adjustments:
   - **MINOR**: Auto-apply to relevant goals, note what changed
   - **SIGNIFICANT**: Present to user via `AskUserQuestion` with the adjustment details and let them approve, modify, or reject
3. Renumber remaining goals under `## Current` if needed

Write the updated file.
</step>

<step name="update_lessons">
**Update LESSONS.md**

Read `.vq/LESSONS.md` and add entries from `<learned>`:
- Patterns → `## Patterns` section
- Pitfalls → `## Pitfalls` section
- Decisions → `## Decisions` section

Check for duplicates — if a new lesson overlaps with an existing entry, merge rather than duplicate.

Write the updated file.
</step>

<step name="update_history">
**Append to HISTORY.md**

Read `.vq/HISTORY.md` and append:

```markdown
---

## Goal: {goal name}
**Completed**: {today's date}
**Commits**: {commit count}

<details>
<summary>Full executor return</summary>

{raw <result> content from executor}

</details>
```

Write the updated file.
</step>

<step name="handle_concerns">
**Handle concerns**

If `<concerns>` has content:
- Display concerns prominently
- If any concern is critical (uses language like "blocks", "prevents", "incompatible"), use `AskUserQuestion` to ask the user how to proceed
</step>

<step name="summary">
**Show summary to user**

Display:

```
Goal completed: {goal name}
Commits: {count} ({short hash list})
Tests: {test file count}
Lessons learned: {count of new entries added}
Adjustments: {applied count} applied{, N pending user review if any}
Concerns: {count, or "none"}

Next goal: {next goal name, or "All goals complete!"}
```
</step>

</process>

<success_criteria>
- [ ] Current goal correctly identified from GOALS.md
- [ ] Executor received complete context (criteria, constraints, lessons, code)
- [ ] All four artifacts updated after execution
- [ ] MINOR adjustments auto-applied
- [ ] SIGNIFICANT adjustments presented to user
- [ ] Concerns displayed if present
- [ ] User shown clear summary with next steps
</success_criteria>
