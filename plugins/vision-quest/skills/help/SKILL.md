---
name: vq:help
description: Show Vision Quest command reference
---

<objective>
Display the Vision Quest command reference. Show available commands and a brief explanation of the workflow.
</objective>

<reference>
# Vision Quest

Goal-driven development: **pick goal → execute (TDD) → reconcile learnings → repeat**.

## Commands

| Command | Description |
|---------|-------------|
| `/vq:go` | Execute the next goal (or initialize if no `.vq/` exists) |
| `/vq:init` | Interactive vision setup — define purpose and initial goals |
| `/vq:status` | Show current state — completed, current, and upcoming goals |
| `/vq:help` | This command reference |

## How It Works

1. **`/vq:init`** — Discuss your vision, define 3-7 goals with acceptance criteria. Creates `.vq/` directory.
2. **`/vq:go`** — Executes the next goal using TDD (write failing tests → implement → commit). Reconciles learnings into all artifacts.
3. **Repeat** — Run `/vq:go` again for the next goal. Learnings from previous goals inform future execution.

## Artifacts (in `.vq/`)

| File | Purpose | Loaded by executor? |
|------|---------|---------------------|
| `VISION.md` | Living vision doc — purpose, current state, decisions, learnings | Decisions only |
| `GOALS.md` | Priority queue of goals with acceptance criteria | Current goal only |
| `LESSONS.md` | Accumulated patterns, pitfalls, decisions across goals | Always |
| `HISTORY.md` | Append-only log of full executor returns | Never |

## Key Concepts

- **Goals, not tasks** — Each goal has acceptance criteria that become tests. The executor decides HOW.
- **TDD execution** — Failing tests first (RED), implement (GREEN), optional refactor.
- **Bidirectional reconciliation** — Learnings flow up into artifacts, goals get adjusted based on discoveries.
- **One goal per `/vq:go`** — Stay in the loop. Say "keep going" to continue.
</reference>
