---
name: sendit:help
description: Quick reference for all sendit commands and concepts
allowed-tools:
  - Read
---

# Sendit — Quick Reference

## What is Sendit?

Spec-Driven Development. Specs are the source of truth — not plans, not process artifacts, not `.planning/` directories. The spec tree IS your project's infrastructure.

**Core concept**: The Spec ↔ Tests ↔ Code triangle. Every feature maintains this three-way contract. The spec defines WHAT, tests verify it, code implements it.

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
        │
        ▼
    ┌─────────┐
    │ ASSESS  │  Parse intent → check specs → determine weight
    └────┬────┘
         │
    ┌────▼─────┐
    │PREFLIGHT │  Spec enforcer checks constraints before work begins
    └────┬─────┘
         │
    ┌────▼──────────┐
    │SPEC ENGAGEMENT│  (if needed) Brainstorm → update spec → ready gate
    └────┬──────────┘
         │
    ┌────▼───────┐
    │ TEST WRITE │  (if spec changed) Spec → failing tests
    └────┬───────┘
         │
    ┌────▼────┐
    │  PLAN   │  Light: inline tasks. Full: planner agent + checker
    └────┬────┘
         │
    ┌────▼─────┐
    │ EXECUTE  │  Implement tasks, make tests pass, commit per task
    └────┬─────┘
         │
    ┌────▼──────────┐
    │  POST-FLIGHT  │  Triangle validation → drift report → INDEX update
    └───────────────┘
```

## Light vs Full

Sendit operates on a continuous spectrum, not discrete modes.

| Aspect | Light | Full |
|--------|-------|------|
| Assessment | Parse intent + quick spec check | + scope analysis |
| Pre-flight | Inline constraint check | Spec-enforcer agent |
| Spec work | Skip (spec is clean) | Brainstorm → ready gate |
| Tests | Executor handles | Separate test-writer agent |
| Planning | 1-5 tasks inline | Planner agent + plan-checker |
| Execution | Inline, commit per task | Executor agent per task |
| Post-flight | Run tests, confirm | Triangle validation + drift report |

**Default is light.** Sendit upgrades to full only when:
- Task touches >3 files or >1 spec
- Spec has OPEN items requiring resolution
- User explicitly requests it
- Acceptance criteria are missing or incomplete

## Key Concepts

**Spec-on-touch**: No upfront spec work needed. Specs get created when you first work on a feature.

**Ready gate**: A spec is "ready" when it has no OPEN items and all acceptance criteria are present. The ready gate blocks full-mode execution until the spec passes.

**Triangle validation**: Post-flight check that Spec ↔ Tests ↔ Code are all consistent. Catches drift.

**Drift**: When code changes without spec updates (or vice versa). Flagged by post-flight, resolved by updating the lagging artifact.

**Spec tree**: The `specs/` directory. Grows organically. No upfront planning — features get spec'd as they're worked on.

## Files

- Specs live in `specs/<feature>/SPEC.md`
- Index at `specs/INDEX.md`
- Plans (when needed) live alongside specs in `specs/<feature>/PLAN.md`
- Drift reports in `specs/<feature>/DRIFT.md`
