---
name: sendit:go
description: Single entry point for spec-driven development — assess, route, and execute any task through the spec-driven workflow
argument-hint: '"task description"'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---

# Sendit: Go

Single entry point. Assess the task, route through the appropriate weight, execute.

## References

@~/.claude/plugins/marketplaces/sendit/sendit/references/assessment-tiers.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/weight-spectrum.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/gates.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md

## Process

<process>

<step name="resume-check" priority="first">

### 0. Resume Check

Before anything else, check for in-progress work:

```bash
find specs -name "PROGRESS.md" 2>/dev/null
```

If a PROGRESS.md exists:
- Read it to get the feature name, current step, and task status
- Tell the user: "Found in-progress work on **{feature}** (step: {current step}, {N}/{total} tasks done). Resume or start fresh?"
- If resume → skip to the recorded current step, pick up from first pending task
- If start fresh → delete the PROGRESS.md and proceed normally

</step>

<step name="assess">

### 1. Assessment

Run the assessment workflow inline (no agent — this must be fast).

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/assess.md

**Layer 1**: Parse the user's task for weight signals.

```bash
# Check if specs directory exists
ls specs/INDEX.md 2>/dev/null
# Check for global constraints
ls specs/GLOBAL.md 2>/dev/null
```

**Layer 2** (if needed): Check specs for relevant coverage.

**Layer 3** (if still ambiguous): Scope check.

Produce:
- `weight`: light | full
- `relevant_specs`: list of spec paths (always include `specs/GLOBAL.md` if it exists)
- `spec_on_touch`: true | false

**Branch check**: If on `main`/`master`, ask the user if they want to create a feature branch first. Don't block — just surface it.

**Announce the assessment** to the user:
> "**{light|full}**: {one-line reason}. {Relevant spec info}."

Example: "**Light**: Bug fix in well-spec'd area. Spec `specs/auth/SPEC.md` is ACTIVE."
Example: "**Full**: New feature with no existing spec. Will create spec first."

</step>

<step name="preflight">

### 2. Pre-flight

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/preflight.md

**Light**: Quick inline check against relevant specs. 1-2 sentences.

**Full**: Spawn spec-enforcer agent in preflight mode:
```
Task(subagent_type="spec-enforcer", prompt="
  MODE: preflight
  TASK: {user's task}
  SPECS: {relevant_specs}
  Read each spec and check for conflicts.
")
```

Route based on result:
- CLEAR → continue
- CONFLICT → must resolve (spec engagement)
- NEEDS-SPEC-UPDATE → flag for spec engagement

</step>

<step name="spec-engagement">

### 3. Spec Engagement (conditional)

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/spec-engagement.md

**Skip when**: Light mode AND spec is clean (or no spec and task is trivial).

**Run when**:
- Full mode (always at least check ready gate)
- Spec-on-touch needed (new spec creation)
- Preflight found CONFLICT or NEEDS-SPEC-UPDATE
- Spec has OPEN items or is DRAFT

**Spec-on-touch**: If no spec exists for a non-trivial feature:
- Ask user: quick spec, full spec, or skip?
- Quick spec: generate from existing code
- Full spec: brainstorm collaboratively
- Skip: light mode only, no triangle validation

**Ready gate** (full mode): Verify spec passes before continuing.

Track: `spec_changed` = true | false (determines if test-writer runs)

</step>

<step name="write-tests">

### 4. Test Writing (conditional)

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/write-tests.md

**Run when**: Full mode AND spec was changed (created or updated).

**Skip when**: Light mode, or spec was unchanged.

Spawn test-writer agent (never sees the plan):
```
Task(subagent_type="test-writer", prompt="
  SPEC: {spec_path}
  Read the spec and write failing tests for all acceptance criteria.
  Follow the project's existing testing conventions.
")
```

Track: `test_files` = list of created test files

</step>

<step name="research">

### 5. Research (conditional)

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/research.md

**Skip when**: Light mode, or spec involves only familiar patterns/libraries already in the codebase.

**Run when**: Full mode AND the spec references unfamiliar technology, external APIs, or patterns not present in the codebase. Also runs when the user explicitly asks to research first, or when a light→full upgrade was triggered by unexpected complexity.

Quick check (inline, no agent):
- Does the spec reference libraries not in package.json/pyproject.toml?
- Are there patterns in the spec not found in the codebase?

If research needed:
```
Task(subagent_type="researcher", prompt="
  SPEC: {spec_path}
  RESEARCH FOCUS: {what specifically needs investigation}
  Investigate and write findings to specs/{feature}/RESEARCH.md.
")
```

Track: `research_path` = `specs/{feature}/RESEARCH.md` or null

</step>

<step name="plan">

### 6. Planning

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/plan.md

**Light**: Enumerate 1-5 tasks inline. Present to user for confirmation.

**Full**: Spawn planner agent (with research if available), then plan-checker:
```
Task(subagent_type="planner", prompt="
  SPEC: {spec_path}
  RESEARCH: {research_path (if research ran)}
  TEST_FILES: {test_files}
  TASK: {user's task}
  Create an implementation plan. Write to specs/{feature}/PLAN.md.
")
```

Then validate:
```
Task(subagent_type="plan-checker", prompt="
  PLAN: specs/{feature}/PLAN.md
  SPEC: {spec_path}
  TEST_FILES: {test_files}
  Validate coverage. Return verdict.
")
```

If REVISE: send feedback to planner for one revision round. Max 2 total rounds.

Present final plan summary to user for approval before executing.

</step>

<step name="execute">

### 7. Execution

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/execute.md

**Before starting**: Write `specs/{feature}/PROGRESS.md` with the task list and current step. Update it after each task completes. This enables session recovery if interrupted.

**Light**: Execute tasks inline. Commit per logical change.

**Full**: Spawn executor agent per task (or task group):
```
Task(subagent_type="executor", prompt="
  TASK: {task from plan}
  SPEC: {spec_path}
  PLAN: specs/{feature}/PLAN.md
  Implement, verify, commit.
")
```

After all tasks: run full test suite.

</step>

<step name="postflight">

### 8. Post-flight

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/postflight.md

**Light**: Run tests, confirm passing. Quick summary to user.

**Full**: Spawn spec-enforcer in postflight mode:
```
Task(subagent_type="spec-enforcer", prompt="
  MODE: postflight
  SPEC: {spec_path}
  CHANGED_FILES: {list of all changed files}
  Validate the triangle. Generate drift report. Update spec.
")
```

Update INDEX.md with current health.

**Cleanup**: Delete `specs/{feature}/PROGRESS.md` on successful completion.

**Report to user**: Summary of what was done, test results, any drift items.

</step>

</process>

## Upgrade / Downgrade Mid-flow

At any step, the weight can shift:

**Upgrade (light → full)**:
- Spec conflict discovered → need spec engagement
- More files than expected → need planner agent
- User asks to think more → spec engagement

**Downgrade (full → light)**:
- Spec is clean → skip engagement
- Plan is simple (≤3 tasks) → inline execution
- User says "just do it" → downgrade remaining stages

Announce weight changes: "Upgrading to full: {reason}" or "Downgrading to light: {reason}."

## Error Handling

- If any agent fails, report the error and ask user for guidance
- If execution partially completes, summarize what's done and what's left
- Never leave the codebase in a broken state — if tests fail post-execution, attempt to fix or revert
- Max 3 fix attempts before escalating to user
