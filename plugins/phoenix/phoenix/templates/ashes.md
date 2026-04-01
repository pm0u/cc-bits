# ASHES.md Section Template

Template for a single attempt section appended to the project-root `ASHES.md` file. Newest attempts go first (reverse chronological) so the most recent learnings get highest attention weight.

---

## Section Template

```markdown
## Attempt {N} ({YYYY-MM-DD})

**Baseline:** `{commit_hash}` ({short description of starting state})
**Archive:** `archive/attempt-{N}` branch
**Progress:** {X}% — reached phase {Y} of {Z}
**Verdict:** {one sentence — why did this attempt stall or fail?}

### Spec Corrections

What the spec got wrong, underspecified, or assumed incorrectly.

- **{Area}:** Spec said {X} but we discovered {Y}. Next time: {Z}.
- [Or: "Spec was accurate — execution was the issue, not requirements."]

### Structural Learnings

Phase ordering, decomposition, and architectural lessons.

- **{Learning}:** {What happened and why it matters for next attempt.}
  - Phase {N} should come before {M} because {reason}.
  - {Component} should be split into {A} and {B} because {reason}.

### Technical Learnings

Patterns, libraries, APIs, and implementation discoveries.

- **{Topic}:** {What we learned.}
  - Do: {what worked or should be done}
  - Don't: {what failed or should be avoided}
  - Why: {the reason, not just the rule}

### Constraints Discovered

Things that weren't in the original spec but turned out to be real constraints.

- **{Constraint}:** {What it is and how it affects the design.}

### What Worked

Patterns, approaches, or code from this attempt worth preserving or repeating.

- **{Thing}:** {Why it worked.}
  - Files: `{paths}` (on `archive/attempt-{N}` branch)

### What To Do Differently

High-level approach changes for the next attempt. Not a plan — just directional guidance.

- {Recommendation 1}
- {Recommendation 2}
```

---

## Guidelines

**Be specific and prescriptive.** "The auth was hard" is useless. "Auth must be implemented before the API layer because middleware depends on session context being available" is actionable.

**Include file references.** When referencing code from the attempt, point to the archive branch: "`src/auth.ts` on `archive/attempt-1`"

**Distinguish root causes from symptoms.** "Tests kept failing" is a symptom. "The test setup assumed a running database but the CI environment doesn't have one" is a root cause.

**Don't dump everything.** A 500-line ASHES section is noise. Aim for the 10-20 most impactful learnings. The full details are on the archive branch if anyone needs them.

**Accumulation across attempts:** Each attempt should reference prior learnings it validated or invalidated. "Attempt 1 said X, confirmed — this is still true" or "Attempt 1 said X, but actually Y."

## File-Level Structure

The top-level ASHES.md file has no frontmatter. It's a simple reverse-chronological document:

```markdown
# ASHES

Learnings from previous attempts. Consumed by planning workflows as high-priority context.

## Attempt 2 (2026-04-01)
...

## Attempt 1 (2026-03-25)
...
```
