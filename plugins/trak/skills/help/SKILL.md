---
name: trak:help
description: Show Trak command reference
---

<objective>
Display the Trak command reference. Show available commands, artifact descriptions, workflow explanation, and key concepts.
</objective>

<reference>
# Trak

Agent-driven ticketing: **propose → triage → refine → execute (TDD) → discover new work → repeat**.

## Commands

| Command | Description |
|---------|-------------|
| `/trak:go` | Execute the next goal (picks ticket + refines if needed) |
| `/trak:trek` | Execute all remaining goals end-to-end without re-prompting |
| `/trak:init` | Initialize `.trak/` — explore project, discuss context, create backlog |
| `/trak:propose` | Capture a new ticket idea in `proposed/` |
| `/trak:triage` | Review `proposed/` tickets — accept, reject, or skip |
| `/trak:refine` | Break a `todo/` ticket into executable goals |
| `/trak:board` | Text-based kanban view of the board |
| `/trak:help` | This command reference |

## How It Works

1. **`/trak:init`** — Explore the project, discuss what needs doing, create initial tickets in `todo/`.
2. **`/trak:propose`** — Capture new ideas anytime. Tickets land in `proposed/`.
3. **`/trak:triage`** — Review proposed tickets. Accept → `todo/`, reject → `rejected/`.
4. **`/trak:refine`** — Pick a ticket from `todo/`, assess the codebase, break into goals with criteria.
5. **`/trak:go`** — Execute the next goal using TDD. Reconcile learnings. Discover new work.
6. **Repeat** — `/trak:go` picks up the next goal or ticket automatically.

## Ticket Flow

```
proposed/ → todo/ → inprogress/ → completed/
                                 ↘ rejected/
```

## Artifacts (in `.trak/`)

| File | Purpose | Loaded by executor? |
|------|---------|---------------------|
| `PROJECT.md` | Project context — purpose, current state, key decisions | Key Decisions only |
| `LESSONS.md` | Cross-ticket learnings — patterns, pitfalls, decisions | Always |
| `HISTORY.md` | Append-only audit trail of executor returns | Never |

## Ticket Types

| Type | For | Key Sections |
|------|-----|-------------|
| **feature** | New capabilities | Description, Goals, Verification |
| **bug** | Broken behavior | Observed, Expected, Reproduction, Goals |
| **refactor** | Code quality | Current State, Desired State, Scope, Goals |
| **research** | Investigation | Question, Context, Deliverable, Findings |

## Key Concepts

- **Tickets, not tasks** — Tickets describe what needs to happen. Goals (added during refinement) break them into executor-sized chunks.
- **TDD execution** — Each goal is executed with failing tests first (RED), implement (GREEN), optional refactor.
- **Discovery** — The executor captures bugs, features, refactors, and research questions it encounters. These become new proposed tickets.
- **Bidirectional reconciliation** — Learnings flow into LESSONS.md and PROJECT.md. Goals get adjusted based on discoveries.
- **One goal per `/trak:go`** — Stay in the loop. Use `/trak:trek` to execute all remaining goals automatically.
</reference>
