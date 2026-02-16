# Trak

Agent-driven ticketing for Claude Code. Tickets (markdown files) flow through directory-based columns (`proposed/` → `todo/` → `inprogress/` → `completed/`). The agent is the interface — discuss what to work on, refine tickets into goals, execute via TDD, and discover new work along the way.

## Quick Start

```
/trak:init     # Explore project, create initial backlog
/trak:go       # Execute the next goal
/trak:trek     # Execute all remaining goals end-to-end
```

## Commands

| Command | Description |
|---------|-------------|
| `/trak:go` | Execute the next goal (picks ticket + refines if needed) |
| `/trak:trek` | Execute all remaining goals without re-prompting |
| `/trak:init` | Initialize `.trak/` — explore project, discuss context, create backlog |
| `/trak:propose` | Capture a new ticket idea in `proposed/` |
| `/trak:triage` | Review `proposed/` tickets — accept, reject, or skip |
| `/trak:refine` | Break a `todo/` ticket into executable goals |
| `/trak:board` | Text-based kanban view |
| `/trak:help` | Command reference |

## How It Works

1. **Initialize** — `/trak:init` explores the project and creates an initial backlog of tickets
2. **Propose** — Capture ideas anytime with `/trak:propose`. Tickets land in `proposed/`
3. **Triage** — Review proposed tickets with `/trak:triage`. Accept → `todo/`, reject → `rejected/`
4. **Refine** — `/trak:refine` assesses the codebase and breaks a ticket into goals with criteria
5. **Execute** — `/trak:go` runs the next goal using TDD. Discovers new work along the way
6. **Repeat** — `/trak:go` picks up the next goal or ticket automatically

## Ticket Flow

```
proposed/ → todo/ → inprogress/ → completed/
                                 ↘ rejected/
```

## Artifacts

| File | Purpose |
|------|---------|
| `PROJECT.md` | Project context — purpose, current state, key decisions |
| `LESSONS.md` | Cross-ticket learnings — patterns, pitfalls, decisions |
| `HISTORY.md` | Append-only audit trail of executor returns |

## Ticket Types

- **Feature** — New capabilities and behavior
- **Bug** — Broken behavior with reproduction context
- **Refactor** — Code quality improvements with scope boundaries
- **Research** — Questions needing investigation, producing decisions or new tickets

## vs Vision Quest

VQ is for focused "vision + quest" workflows with a clear endpoint. Trak is for ongoing project management with a persistent backlog. Use VQ when you have a specific vision to execute. Use Trak when you have an evolving project with continuous work.
