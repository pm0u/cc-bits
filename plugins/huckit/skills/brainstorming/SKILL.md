---
name: huckit:brainstorming
description: Use when starting creative work - creating features, building components, adding functionality, or modifying behavior - before any implementation begins
---

# Brainstorming Ideas Into Specs

## Overview

Help turn ideas into fully formed specs through natural collaborative dialogue, producing a living SPEC.md that serves as the source of truth throughout implementation.

## Entry Points

This skill supports two starting points that converge on the same outcome:

### A: Existing Doc Provided

User says something like: "I started a doc in REQUIREMENTS/setup-selection/SPEC.md"

1. Read the provided SPEC.md
2. Summarize your understanding of what's described
3. Identify gaps, ambiguities, or missing acceptance criteria
4. Proceed to **Refinement** below

### B: Starting From Scratch

User says something like: "I want to start a spec for setup-selection"

1. Create the feature folder: `REQUIREMENTS/<feature-name>/`
2. Start collaborative discussion to understand the idea (see **Understanding the Idea** below)
3. Once you have enough to write an initial draft, create `REQUIREMENTS/<feature-name>/SPEC.md`
4. Proceed to **Refinement** below

## Understanding the Idea (Entry Point B)

- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible
- Only one question per message
- Focus on: purpose, constraints, success criteria, acceptance criteria

## Refinement (Both Entry Points)

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Lead with your recommended option and explain why

**Iterating on the spec:**
- Work through the spec section by section (200-300 words per section)
- Ask after each section whether it looks right
- Cover: requirements, architecture, components, data flow, error handling, testing approach
- Update SPEC.md as decisions are made — the doc is living, not a final deliverable

**Ensuring completeness:**
- Every requirement should have acceptance criteria
- Flag any open questions explicitly in the doc (use `<!-- OPEN: question -->` markers)
- YAGNI ruthlessly — remove unnecessary features

## Ready Gate

Before moving to planning, verify the spec is ready:

- [ ] All requirements have acceptance criteria
- [ ] No `<!-- OPEN: -->` markers remain (all questions resolved)
- [ ] Scope is bounded (clear what's in and out)
- [ ] Architecture approach is decided

If any fail, continue refinement. Don't proceed to planning with an incomplete spec.

## After Refinement

**Update parent index:**
- If `REQUIREMENTS/SPEC.md` exists, add/update the feature entry
- If it doesn't exist, create it as an index referencing this feature

**Record decisions (optional):**
- If significant discussion occurred, save key decisions to `REQUIREMENTS/<feature-name>/DISCUSSION.md`
- This preserves context for why choices were made

**Implementation (if continuing):**
- Ask: "Spec is ready. Want to set up for implementation?"
- Use huckit:using-git-worktrees to create isolated workspace
- Use huckit:writing-plans to create detailed implementation plan from this SPEC.md

## Folder Structure

```
REQUIREMENTS/
  SPEC.md                          # Index — lists features, status, cross-cutting concerns
  <feature-name>/
    SPEC.md                        # Living feature spec (source of truth)
    PLAN.md                        # Task decomposition (created by writing-plans)
    DISCUSSION.md                  # Decision log (optional)
    RESEARCH.md                    # Research notes (optional)
```

## Key Principles

- **One question at a time** — don't overwhelm with multiple questions
- **Multiple choice preferred** — easier to answer than open-ended
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **Explore alternatives** — always propose 2-3 approaches before settling
- **Update the doc as you go** — SPEC.md is living, not write-once
- **Acceptance criteria are mandatory** — every requirement needs them
