---
name: huckit:writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans from a feature's SPEC.md. The plan assumes the implementing engineer has zero context — document everything: which files to touch, code, testing, how to verify. DRY. YAGNI. TDD. Frequent commits.

Assume a skilled developer who knows almost nothing about the toolset or problem domain and doesn't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

## Locate the Spec

1. Look for the feature's SPEC.md in the `REQUIREMENTS/` folder
2. If the user provided a path, use that
3. If ambiguous, ask: "Which feature spec should I plan from?"

**Read the full SPEC.md before writing anything.**

## Ready Gate Check

Before writing the plan, verify the spec is ready for implementation:

- [ ] All requirements have acceptance criteria
- [ ] No `<!-- OPEN: -->` markers remain
- [ ] Scope is bounded
- [ ] Architecture approach is decided

If any fail, **stop and tell the user** — go back to `huckit:brainstorming` to resolve.

## Save Plan To

Save the plan in the same feature folder as the spec:
`REQUIREMENTS/<feature-name>/PLAN.md`

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use huckit:executing-plans to implement this plan task-by-task.

**Spec:** `REQUIREMENTS/<feature-name>/SPEC.md`

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

```markdown
### Task N: [Component Name]

**Spec Reference:** [Which requirement(s) from SPEC.md this implements]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\`\`\`python
def function(input):
    return expected
\`\`\`

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

\`\`\`bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
\`\`\`
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant skills with @ syntax
- Each task links back to specific SPEC.md requirements via **Spec Reference**
- DRY, YAGNI, TDD, frequent commits

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `REQUIREMENTS/<feature-name>/PLAN.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use huckit:subagent-driven-development
- Stay in this session
- Fresh subagent per task + code review

**If Parallel Session chosen:**
- Guide them to open new session in worktree
- **REQUIRED SUB-SKILL:** New session uses huckit:executing-plans

## Integration

**Reads from:** Feature's `REQUIREMENTS/<feature-name>/SPEC.md`
**Writes to:** `REQUIREMENTS/<feature-name>/PLAN.md`
**Called by:** `huckit:brainstorming` after spec is ready
**Calls:** `huckit:subagent-driven-development` or `huckit:executing-plans`
