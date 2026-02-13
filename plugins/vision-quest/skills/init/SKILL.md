---
name: vq:init
description: Interactive vision setup — discuss purpose, define initial goals with acceptance criteria, create .vq/ artifacts
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Guide the user through defining their project vision and initial goals. This is an interactive discussion (3-5 exchanges), not a form to fill out. The output is a `.vq/` directory with four initialized artifacts. If `.vq/` already exists, warn the user and ask if they want to reinitialize.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/vq/templates/vision.md
@${CLAUDE_PLUGIN_ROOT}/vq/templates/goals.md
@${CLAUDE_PLUGIN_ROOT}/vq/templates/lessons.md
@${CLAUDE_PLUGIN_ROOT}/vq/templates/history.md
</execution_context>

<process>

<step name="check_existing">
**Check for existing .vq/**

```bash
ls -d .vq 2>/dev/null
```

If `.vq/` exists, warn the user: "A Vision Quest is already initialized. Reinitializing will overwrite existing artifacts." Use `AskUserQuestion` to confirm before proceeding.
</step>

<step name="explore_project">
**Explore the project**

Quickly scan the project to understand what exists:
```bash
ls -la
```

Read `package.json`, `README.md`, or other top-level files to understand the project context. This helps you have an informed discussion about goals.
</step>

<step name="discuss_vision">
**Discuss the vision with the user**

Have a focused conversation (3-5 exchanges) to understand:

1. **Purpose** — What are we building? Why does it matter?
2. **Scope** — What's in and out of scope for now?
3. **Key decisions** — Any tech choices, constraints, or principles already decided?
4. **Goals** — What are the concrete things to build? Help the user break their vision into 3-7 goals.

For each goal, help the user define:
- **Name** — Short, descriptive
- **Done when** — Concrete completion description
- **Criteria** — 2-5 testable acceptance criteria (these become tests)
- **Constraints** — What to follow or avoid
- **Context** — File paths the executor should read

Use `AskUserQuestion` to guide the discussion. Push back gently if goals are too vague ("make it fast") or too granular ("rename this variable").
</step>

<step name="create_artifacts">
**Create the .vq/ directory and artifacts**

```bash
mkdir -p .vq
```

Create four files based on the templates and the discussion:

**`.vq/VISION.md`** — Fill in the template with:
- Purpose from the discussion
- Current State: Just started, 0 goals completed, today's date
- Key Decisions from the discussion (if any)
- Key Learnings: empty for now

**`.vq/GOALS.md`** — List all goals under `## Current` in priority order:
```markdown
# Goals

## Current

1. **Goal name**
   - Done when: concrete description
   - Criteria:
     - [ ] Testable criterion 1
     - [ ] Testable criterion 2
   - Constraints: what to follow/avoid
   - Context: path/to/relevant/files, path/to/other

2. **Next goal name**
   ...

## Completed

## Deferred
```

**`.vq/LESSONS.md`** — Use the template as-is (empty sections).

**`.vq/HISTORY.md`** — Use the template as-is (empty).
</step>

<step name="commit">
**Commit the initialized artifacts**

```bash
git add .vq/VISION.md .vq/GOALS.md .vq/LESSONS.md .vq/HISTORY.md
git commit -m "feat: initialize Vision Quest

- Define project vision and purpose
- Set up initial goal queue with acceptance criteria
- Create lessons and history artifacts

Co-Authored-By: Claude <noreply@anthropic.com>"
```
</step>

<step name="summary">
**Show the user what was created**

Display a summary:
```
Vision Quest initialized!

Vision: {purpose, one line}
Goals defined: {count}

Goal queue:
1. {goal 1 name}
2. {goal 2 name}
...

Run /vq:go to execute the first goal.
```
</step>

</process>

<success_criteria>
- [ ] User's vision understood through interactive discussion
- [ ] 3-7 goals defined with testable acceptance criteria
- [ ] .vq/ directory created with all four artifacts
- [ ] Artifacts committed to git
- [ ] User shown clear summary and next step
</success_criteria>
