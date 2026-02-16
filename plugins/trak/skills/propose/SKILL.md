---
name: trak:propose
description: Create a new ticket in proposed/ — lightweight capture of an idea
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

<objective>
Capture a new work item as a ticket in `proposed/`. This is lightweight — just enough to record the idea. Refinement happens later via `/trak:refine`. Auto-assign the next available ID.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-feature.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-bug.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-refactor.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-research.md
</execution_context>

<process>

<step name="find_next_id">
**Find the next available ticket ID**

Scan all `.trak/` directories for existing tickets to find the max ID:

```bash
ls .trak/proposed/ .trak/todo/ .trak/inprogress/ .trak/completed/ .trak/rejected/ 2>/dev/null
```

Parse filenames to find the highest ID number. Next ID = max + 1. If no tickets exist, start at 1.
</step>

<step name="get_type">
**Ask for ticket type**

Use `AskUserQuestion` to ask which type of ticket:
- Feature — a new capability or behavior
- Bug — something broken that needs fixing
- Refactor — code quality improvement with a clear scope
- Research — a question that needs investigation
</step>

<step name="capture_idea">
**Capture the idea**

Have a brief exchange (1-3 messages) to understand what the user wants to capture. Don't over-refine — this is capture, not planning.

For bugs: get observed/expected/reproduction steps
For features: get a rough description of what and why
For refactors: get current state and desired state
For research: get the question and why it matters

Use `AskUserQuestion` if clarification is needed, but keep it lightweight.
</step>

<step name="write_ticket">
**Write the ticket file**

Create the ticket in `proposed/`:
- Filename: `{NNN}-{slug}.md` (zero-padded 3 digits, kebab-case slug from title)
- Use the appropriate type template
- Fill in frontmatter: id, created (today), type, `source: user`
- Fill in title and description sections
- Leave `## Goals` empty

Write the file to `.trak/proposed/`.
</step>

<step name="summary">
**Show summary**

Display:
```
Ticket #{id} proposed: {title} [{type}]
Location: .trak/proposed/{filename}

Run /trak:triage to review and accept proposed tickets.
```
</step>

</process>

<success_criteria>
- [ ] Next ID correctly assigned (no collisions)
- [ ] Ticket type selected
- [ ] Idea captured with appropriate detail for the type
- [ ] Ticket file written to proposed/ with correct template
- [ ] User shown summary and next step
</success_criteria>
