---
name: sendit:help
description: Quick reference for all sendit commands and concepts
allowed-tools:
  - Read
---

# Sendit — Quick Reference

## What is Sendit?

Spec-Driven Development. Specs are the source of truth — not plans, not process artifacts, not `.planning/` directories. The spec tree IS your project's infrastructure.

**Core concept**: The Spec - Tests - Code triangle. Every feature maintains this three-way contract. The spec defines WHAT, tests verify it, code implements it.

**Core principle**: The orchestrator never implements. It assesses, routes, spawns agents, and handles responses. All code is written by specialized agents.

## Commands

| Command | What it does |
|---------|-------------|
| `/sendit:go "{task}"` | Single entry point — assess, route, execute. Handles everything from one-liners to multi-day features. |
| `/sendit:spec create <name>` | Create a new spec |
| `/sendit:spec edit <name>` | Edit an existing spec |
| `/sendit:spec view <name>` | View spec with health analysis |
| `/sendit:spec split <name>` | Split a large spec into sub-specs |
| `/sendit:spec list` | List all specs with status |
| `/sendit:status` | Spec tree health dashboard |
| `/sendit:ingest <source>` | Import spec from FEATURE.md, JIRA, PRD, etc. |
| `/sendit:reverse-spec <path>` | Generate spec FROM existing code |

## How It Works

```
/sendit:go "do the thing"
        |
        v
    +----------+
    |  SCOPE   |  Is this one spec or a spec tree?
    +----+-----+
         |
    +----v-----+
    |  ASSESS  |  Parse intent -> check specs -> determine weight
    +----+-----+
         |
    +----v------+
    | PREFLIGHT |  Spec-enforcer agent checks constraints
    +----+------+
         |
    +----v-----------+
    |SPEC ENGAGEMENT |  (if needed) Questioning -> update spec -> ready gate
    +----+-----------+
         |
    +----v--------+
    | TEST WRITE  |  (if spec changed) Spec -> failing tests (agent)
    +----+--------+
         |
    +----v-------+
    | RESEARCH   |  (if unfamiliar tech) Researcher agent investigates
    +----+-------+
         |
    +----v----+
    |  PLAN   |  Planner agent + checker (full mode)
    +----+----+
         |            +----------+
    +----v-----+      | KICKBACK |  Agent flags complexity
    | EXECUTE  | <--- | -> route |  -> split spec / re-engage / research
    +----+-----+      +----------+
         |
    +----v-----------+
    |  POST-FLIGHT   |  Triangle validation -> drift report -> INDEX update
    +----------------+
```

## Light vs Full

Sendit operates on a continuous spectrum. Both use agents — the difference is which stages run and how thorough each agent's task is.

| Aspect | Light | Full |
|--------|-------|------|
| Scope check | Always | Always |
| Assessment | Parse intent + quick spec check | + scope analysis |
| Pre-flight | Spec-enforcer (quick check) | Spec-enforcer (thorough analysis) |
| Spec work | Skip (spec is clean) | Questioning + ready gate |
| Tests | Test-writer (basic coverage) | Test-writer (all acceptance criteria) |
| Research | Skip | Researcher agent (if unfamiliar tech) |
| Planning | Planner agent (1-5 tasks) | Planner agent + plan-checker (2-8 tasks) |
| Execution | Executor agent per task | Executor agent per task (fuller context) |
| Post-flight | Run tests, confirm | Triangle validation + drift report |

**Default is light.** Sendit upgrades to full only when:
- Task touches >3 files or >1 spec
- Spec has OPEN items requiring resolution
- User explicitly requests it
- Acceptance criteria are missing or incomplete
- Agent sends a KICKBACK

## Key Concepts

**Spec-on-touch**: No upfront spec work needed. Specs get created when you first work on a feature.

**Scope check**: Large tasks (multiple pages, full apps) are detected and split into a spec tree before any work begins.

**Kickback protocol**: Agents assess complexity early. If a task exceeds their scope (>8 tasks, >5 files per task, missing context), they return a KICKBACK. The orchestrator routes accordingly: split spec, re-engage on spec, or research first.

**Ready gate**: A spec is "ready" when it has no OPEN items and all acceptance criteria are present. The ready gate blocks full-mode execution until the spec passes.

**Questioning**: When creating new specs for complex features, sendit identifies fuzzy areas and runs a targeted Q&A with concrete options — not a generic interview.

**Triangle validation**: Post-flight check that Spec - Tests - Code are all consistent. Catches drift.

**Drift**: When code changes without spec updates (or vice versa). Flagged by post-flight, resolved by updating the lagging artifact.

**Spec tree**: The `specs/` directory. Grows organically. Large features split into parent + child specs.

**Global spec**: Optional `specs/GLOBAL.md` for project-wide constraints (accessibility, performance, conventions). Always checked during preflight regardless of which feature is being worked on.

**Resume**: If a session is interrupted mid-flow, `specs/<feature>/PROGRESS.md` tracks where you left off. Next `/sendit:go` detects it and offers to resume.

## Files

- Specs live in `specs/<feature>/SPEC.md`
- Global constraints in `specs/GLOBAL.md`
- Index at `specs/INDEX.md`
- Plans (when needed) live alongside specs in `specs/<feature>/PLAN.md`
- Research in `specs/<feature>/RESEARCH.md` (when researcher runs)
- Progress tracking in `specs/<feature>/PROGRESS.md` (temporary, deleted on completion)
- Drift reports in `specs/<feature>/DRIFT.md`
