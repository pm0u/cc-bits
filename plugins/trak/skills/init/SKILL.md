---
name: trak:init
description: Initialize .trak/ directory — explore project, discuss context, create initial tickets
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Initialize a `.trak/` directory for the current project. Explore the codebase, have an interactive discussion (3-5 exchanges) to understand the project and capture initial work items, then create the directory structure with PROJECT.md, LESSONS.md, HISTORY.md, and initial tickets in `todo/`. If `.trak/` already exists, warn and confirm before reinitializing.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/trak/templates/project.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/lessons.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/history.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-feature.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-bug.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-refactor.md
@${CLAUDE_PLUGIN_ROOT}/trak/templates/ticket-research.md
</execution_context>

<process>

<step name="check_existing">
**Check for existing .trak/**

```bash
ls -d .trak 2>/dev/null
```

If `.trak/` exists, warn the user: "A trak board already exists. Reinitializing will overwrite existing artifacts." Use `AskUserQuestion` to confirm before proceeding.
</step>

<step name="explore_project">
**Explore the project**

Quickly scan the project to understand what exists:
```bash
ls -la
```

Read `package.json`, `README.md`, or other top-level files to understand the project context. This helps you have an informed discussion.
</step>

<step name="discuss_project">
**Discuss the project with the user**

Have a focused conversation (3-5 exchanges) to understand:

1. **What is this project?** — Purpose, users, tech stack
2. **Current state** — What works, what's in progress, what's broken?
3. **Key decisions** — Architecture choices, constraints, principles
4. **Work items** — What's on your mind? Bugs, features, refactors, questions? Aim for 3-7 rough tickets.

For each work item, capture:
- **Title** — Short, descriptive
- **Type** — feature, bug, refactor, or research
- **Description** — Rough description (this is capture, not refinement)

Use `AskUserQuestion` to guide the discussion. Don't over-refine — tickets get refined later via `/trak:refine`.
</step>

<step name="create_directory">
**Create the .trak/ directory structure**

```bash
mkdir -p .trak/{proposed,todo,inprogress,completed,rejected}
```

Create three core files based on the templates and discussion:

**`.trak/PROJECT.md`** — Fill in:
- Purpose from the discussion
- Current State: Just initialized, 0 tickets completed, today's date
- Key Decisions from the discussion (if any)

**`.trak/LESSONS.md`** — Use template as-is (empty sections).

**`.trak/HISTORY.md`** — Use template as-is (empty).
</step>

<step name="create_tickets">
**Write initial tickets to todo/**

For each work item from the discussion, create a ticket file in `todo/`:
- File naming: `{NNN}-{slug}.md` (e.g., `001-dark-mode-support.md`)
- Use the appropriate ticket type template (feature, bug, refactor, research)
- Fill in frontmatter: id, created (today), type, source: user
- Fill in title and rough description
- Leave `## Goals` empty — that's for refinement

Number tickets sequentially starting at 001, in priority order from the discussion.
</step>

<step name="commit">
**Commit the initialized artifacts**

```bash
git add .trak/PROJECT.md .trak/LESSONS.md .trak/HISTORY.md .trak/todo/
git commit -m "feat: initialize trak board

- Create project context and backlog structure
- Add initial tickets to todo/

Co-Authored-By: Claude <noreply@anthropic.com>"
```
</step>

<step name="summary">
**Show the user what was created**

Display:
```
Trak board initialized!

Project: {purpose, one line}
Tickets created: {count}

Backlog:
1. #{id} {title} [{type}]
2. #{id} {title} [{type}]
...

Run /trak:refine to refine the top ticket, or /trak:go to start executing.
```
</step>

</process>

<success_criteria>
- [ ] Project understood through interactive discussion
- [ ] .trak/ directory created with all subdirectories
- [ ] PROJECT.md, LESSONS.md, HISTORY.md created
- [ ] 3-7 initial tickets written to todo/
- [ ] Artifacts committed to git
- [ ] User shown clear summary and next steps
</success_criteria>
