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

Single entry point. Assess scope and weight, route through the appropriate stages, delegate to agents.

## References

@~/.claude/plugins/marketplaces/sendit/sendit/references/assessment-tiers.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/weight-spectrum.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/gates.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/questioning.md

## Core Principle

**The orchestrator (this context) NEVER writes code, creates implementation files, or makes implementation decisions.**

The orchestrator:
- Assesses scope and weight
- Proposes spec trees
- Spawns agents (planner, executor, spec-enforcer, test-writer, researcher)
- Handles agent responses (including KICKBACK)
- Reports to user and gets approvals
- Tracks progress

If you find yourself about to write code or create a source file, STOP. Spawn an agent instead.

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

<step name="scope-and-assess">

### 1. Scope and Assessment

Run the assessment workflow inline (no agent — this must be fast).

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/assess.md

#### Layer 0: Scope Check

Parse the user's task for multi-spec signals (see assessment-tiers.md Layer 0).

**If multi-spec detected:**

1. Identify natural spec boundaries
2. Propose the spec tree to the user:
   ```
   This looks like it needs multiple specs. I'd break it into:
   - specs/{parent}/SPEC.md — shared concerns (config, auth, layout)
   - specs/{parent}/{child-1}/SPEC.md — {description}
   - specs/{parent}/{child-2}/SPEC.md — {description}
   ...
   ```
3. Use AskUserQuestion to confirm:
   - "Does this breakdown make sense?"
   - Options: "Yes, create these specs", "Adjust the split", "Keep as one spec"
4. If "Keep as one spec" → warn about potential kickbacks, continue as single spec
5. If approved → create the parent spec structure, then run each child through this flow sequentially
6. For each child spec: run steps 1-8 below (each child gets its own assessment, spec engagement, planning, and execution)

**If single-spec:** Continue to weight assessment.

#### Weight Assessment

Run Layers 1-3 as needed to determine weight.

**Branch check**: If on `main`/`master`, ask if they want a feature branch first.

**Announce the assessment** to the user:
> "**{Scope}: {light|full}**: {one-line reason}. {Relevant spec info}."

Example: "**Single: Light**: Bug fix in well-spec'd area. Spec `specs/auth/SPEC.md` is ACTIVE."
Example: "**Multi: Full**: New application with 3 page types. Proposing spec tree."

</step>

<step name="preflight">

### 2. Pre-flight

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/preflight.md

Spawn spec-enforcer agent for preflight check. The orchestrator does NOT do preflight inline.

**Light mode**: Quick check prompt:
```
Task(subagent_type="spec-enforcer", prompt="
  MODE: preflight-light
  TASK: {user's task}
  SPECS: {relevant_specs}
  Quick check for obvious conflicts. 1-2 sentences.
")
```

**Full mode**: Thorough analysis:
```
Task(subagent_type="spec-enforcer", prompt="
  MODE: preflight
  TASK: {user's task}
  SPECS: {relevant_specs}
  Read each spec and check for conflicts, OPEN items, missing criteria.
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

**Skip when**: Light mode AND spec is clean (no OPEN, has criteria).

**Run when**:
- Full mode (always at least check ready gate)
- Spec-on-touch needed (new spec creation)
- Preflight found CONFLICT or NEEDS-SPEC-UPDATE
- Spec has OPEN items or is DRAFT

**New spec + full weight or multi-spec child**: Run questioning session (see spec-engagement.md and questioning.md). This is NOT optional for complex new specs.

**Spec-on-touch (light weight)**: Offer quick spec, full spec, or skip.

**Ready gate** (full mode): Verify spec passes before continuing.

Track: `spec_changed` = true | false (determines if test-writer runs)

</step>

<step name="write-tests">

### 4. Test Writing (conditional)

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/write-tests.md

**Run when**: Spec was changed (created or updated) — in any weight.

**Skip when**: Spec was unchanged.

Spawn test-writer agent (never sees the plan):

**Light mode**:
```
Task(subagent_type="test-writer", prompt="
  SPEC: {spec_path}
  WEIGHT: light
  Read the spec and write basic tests for the key acceptance criteria.
  Follow the project's existing testing conventions.
")
```

**Full mode**:
```
Task(subagent_type="test-writer", prompt="
  SPEC: {spec_path}
  WEIGHT: full
  Read the spec and write failing tests for ALL acceptance criteria.
  Follow the project's existing testing conventions.
")
```

Track: `test_files` = list of created test files

</step>

<step name="research">

### 5. Research (conditional)

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/research.md

**Skip when**: Light mode, or spec involves only familiar patterns/libraries already in the codebase.

**Run when**: Full mode AND the spec references unfamiliar technology, external APIs, or patterns not present in the codebase. Also runs when a KICKBACK with `needs_research` is received.

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

**The orchestrator MUST spawn the planner agent. Do NOT plan inline.**

Spawn planner agent with appropriate prompt for weight. See plan.md for exact prompts.

**Handle planner response:**

- `status: done` → In full mode, spawn plan-checker. In light mode, present to user.
- `status: KICKBACK` → Handle by signal:
  - `too_many_tasks` or `needs_split`:
    1. Report to user: "The planner says this spec needs splitting: {reason}"
    2. Present the planner's `suggested_split`
    3. If user approves: split the spec, re-run each child through this flow
    4. If user declines: warn and proceed (may get executor kickbacks)
  - `spec_incomplete`: Return to step 3 (spec engagement)
  - `needs_research`: Go to step 5 (research), then re-run step 6

**Present final plan summary to user for approval before executing.**

</step>

<step name="execute">

### 7. Execution

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/execute.md

**The orchestrator MUST spawn executor agents. Do NOT implement inline.**

**Before starting**: Write `specs/{feature}/PROGRESS.md` with the task list and current step.

For each task in the plan, spawn an executor agent. See execute.md for exact prompts.

**Handle executor responses:**

- `status: done` → Update PROGRESS.md, proceed to next task
- `status: failed` → Retry once with failure context, then escalate to user
- `status: KICKBACK` → **Stop execution immediately.** Handle by signal:
  - `scope_creep`: Upgrade remaining stages to full. If spec needs splitting, propose split.
  - `missing_context`: Return to spec engagement (step 3) to fill gaps, then re-plan remaining tasks.
  - `needs_research`: Spawn researcher (step 5), then re-plan remaining tasks.
  - After handling, do NOT re-execute already-completed tasks.
- `status: blocked` → Report to user, ask how to proceed

After all tasks: run full test suite to verify.

</step>

<step name="postflight">

### 8. Post-flight

@~/.claude/plugins/marketplaces/sendit/sendit/workflows/postflight.md

**Light mode**: Run tests, confirm passing. Quick summary to user.

**Full mode**: Spawn spec-enforcer in postflight mode:
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
- Agent KICKBACK received → route by signal
- Spec conflict discovered → need spec engagement
- User asks to think more → spec engagement

**Downgrade (full → light)**:
- Spec is clean → skip engagement
- Plan is simple (≤3 tasks) → use lighter executor prompts
- User says "just do it" → downgrade remaining stages

Announce weight changes: "Upgrading to full: {reason}" or "Downgrading to light: {reason}."

## Multi-Spec Orchestration

When scope is `multi`, the orchestrator manages multiple child specs:

1. Create the parent spec with shared concerns
2. For each child spec, run the full flow (steps 1-8)
3. Children are processed sequentially by default (they may depend on prior children)
4. After all children complete, run a final integration check:
   ```
   Task(subagent_type="spec-enforcer", prompt="
     MODE: integration
     SPECS: {all child spec paths}
     Check for cross-spec consistency and integration issues.
   ")
   ```
5. Report overall completion to user

## Error Handling

- If any agent fails, report the error and ask user for guidance
- If a KICKBACK is received, always pause and route — never ignore
- If execution partially completes, summarize what's done and what's left
- Never leave the codebase in a broken state — if tests fail post-execution, attempt to fix or revert
- Max 3 fix attempts before escalating to user
