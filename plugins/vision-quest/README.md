# Vision Quest

Goal-driven development for Claude Code: **pick goal → execute (TDD) → reconcile learnings → repeat**.

## Philosophy

**Current state → goal, not 0 → goal.** Every unit of work starts from where the codebase actually is, aims at a concrete goal with testable criteria, and reports learnings back. The orchestrator maintains a living picture of intent and adjusts the plan based on reality.

Traditional agentic workflows (like multi-phase pipelines) distill intent into *procedural steps* — do X, then Y, then Z. That's the most lossy format possible. It strips out the WHY and assumes the planner can predict every HOW in advance. When reality diverges, the executor has no compass.

**What should travel with each work unit instead:**

- **The goal** — what done looks like, not how to get there
- **Acceptance criteria** — concrete, testable conditions
- **Constraints** — patterns to follow, things to avoid, architectural boundaries
- **Relevant code context** — the specific files and patterns that matter for this piece

Then let the executor figure out the HOW. That's what it's good at — it can read code and solve problems. What it's bad at is intuiting your *intent* from a task checklist.

**Three roles, two actors:**
- **Orchestrator** (you + Claude in conversation) — holds vision, picks goals, reconciles
- **Executor** (sub-agent) — reads code, writes tests, implements, reports back
- The TDD triangle lives inside execution, not bolted on after

## Architecture

```
┌─────────────────────────────────────────────────┐
│  ORCHESTRATOR (persistent context)              │
│                                                 │
│  Holds: vision doc + goals + lessons            │
│  Does:  pick goal → spawn executor → reconcile  │
│  Never: writes code                             │
└────────────┬───────────────────────▲────────────┘
             │ goal + criteria +     │ result + learnings +
             │ constraints + context │ adjustments
             ▼                       │
┌─────────────────────────────────────────────────┐
│  EXECUTOR (fresh context per goal)              │
│                                                 │
│  Receives: goal, acceptance criteria,           │
│            constraints, relevant code context   │
│  Does:     read code → write tests → implement  │
│  Returns:  what was built + what was learned     │
└─────────────────────────────────────────────────┘
```

## Commands

| Command | Description |
|---------|-------------|
| `/vq:go` | Execute the next goal (or initialize if no `.vq/` exists) |
| `/vq:trek` | Execute all remaining goals end-to-end without re-prompting |
| `/vq:init` | Interactive vision setup — define purpose and initial goals |
| `/vq:status` | Show current state — completed, current, and upcoming goals |
| `/vq:help` | Command reference |

## Workflow

### Step 1: Define Vision

`/vq:init` — Interactive discussion to understand your vision. Produces a `.vq/` directory with four artifacts. Goals can be rough at this stage — they get refined as you learn.

### Step 2: Pick Next Goal

`/vq:go` reads the current goal from `GOALS.md`. Before spawning the executor, it:
- Reads relevant files mentioned in the goal's context hints
- Pastes actual content (not file paths) into the executor prompt
- Includes accumulated lessons from previous goals

### Step 3: Execute Goal (TDD)

The executor sub-agent receives everything it needs in a single prompt:

```xml
<goal>
Data fetching for dashboard widgets. Done when dashboard shows
live data from 3 API endpoints with loading states and error handling.
</goal>

<acceptance_criteria>
- [ ] Widget A fetches /api/metrics and renders chart
- [ ] Widget B fetches /api/activity and renders list
- [ ] Widget C fetches /api/summary and renders cards
- [ ] Loading skeleton shown while fetching
- [ ] Error state shown on failure with retry button
</acceptance_criteria>

<constraints>
- Use existing useFetch hook pattern
- Follow Widget pattern from ExampleWidget
</constraints>

<current_code_context>
[PASTED content of useFetch.ts, ExampleWidget.tsx, relevant API routes]
</current_code_context>

<lessons>
[Accumulated patterns, pitfalls, and decisions from previous goals]
</lessons>
```

The executor works autonomously: explore → write failing tests (RED) → implement (GREEN) → optional refactor → commit atomically → return structured results.

### Step 4: Reconcile

The critical step. The orchestrator processes the executor's return:

1. **Verify** — Do the tests actually cover the acceptance criteria?
2. **Update VISION.md** — Current state, new learnings, new decisions
3. **Update GOALS.md** — Mark complete, evaluate suggested adjustments, reorder if needed
4. **Update LESSONS.md** — Add patterns, pitfalls, decisions discovered
5. **Append HISTORY.md** — Full executor return for cold storage
6. **Check with user** — If adjustments are significant, ask before applying

### Step 5: Repeat from Step 2

## Artifacts

All artifacts live in `.vq/` in the project root.

### VISION.md — Living Vision Doc

The orchestrator's compressed memory. Always current, never stale.

```markdown
# Vision

## Purpose
What we're building and why.

## Current State
- Auth system: complete, JWT-based, src/auth/
- Dashboard: basic layout, no data fetching yet
- API: 3 endpoints live, 5 remaining

## Key Decisions
- React + TypeScript
- Supabase for auth

## Key Learnings
- Supabase client must be initialized before any route loads
- The existing Table component expects column defs, not raw data
```

### GOALS.md — Priority Queue

Ordered, living, adjusted after every goal. Not a roadmap — a priority queue.

```markdown
## Completed
- [x] Auth flow (PR #12) — learned: session refresh needs explicit handling
- [x] Dashboard layout (PR #13) — learned: grid system is 12-col

## Current
3. **Data fetching for dashboard widgets**
   - Done when: Dashboard shows live data from 3 API endpoints
   - Criteria:
     - [ ] Widget A fetches /api/metrics and renders chart
     - [ ] Loading skeleton shown while fetching
     - [ ] Error state shown on failure with retry button
   - Constraints: Use existing useFetch hook, follow Widget pattern
   - Context: src/hooks/useFetch.ts, src/components/widgets/

## Deferred
- Dark mode (revisit after core features)
```

### LESSONS.md — Cross-Goal Learning

Read by every executor, written by orchestrator from executor reports. Only keeps what's actionable.

```markdown
## Patterns
- All API routes follow src/api/example.ts pattern
- Components use cn() utility for conditional classes

## Pitfalls
- useFetch hook doesn't retry on failure
- Table component throws if data is undefined (not null)

## Decisions
- Chose react-query over SWR after goal 3
```

### HISTORY.md — Cold Storage

Append-only log of full executor returns. Never loaded by default — exists for auditing and review.

## How the TDD Triangle Works

The triangle is embedded in execution, not a separate verification step:

```
Acceptance Criteria (spec)
        ↕ derived from
Failing Tests (written first)
        ↕ satisfied by
Implementation (code)
```

All three happen in the same executor context. No drift between what the spec says, what the tests check, and what the code does — because one agent holds all three.

The orchestrator does a lightweight verification in reconciliation: do the tests actually test the criteria? This replaces separate verifier/spec-enforcer agents with a quick sanity check by the entity that holds the full intent.

## Context Management

The orchestrator's context grows with each goal. To keep it sustainable:

- **VISION.md is compressed memory** — always updated to reflect current state, so old results don't need to be retained
- **Goals list shrinks** — completed goals become one-liners
- **Lessons stay pruned** — only actionable items
- **For very long builds (20+ goals)**: orchestrator can be "restarted" from `VISION.md` + `GOALS.md` + `LESSONS.md`. These three files ARE the complete state.

## Design Decisions

- **No CLI tools** — all state management via markdown parsing. Pure prompts.
- **Context pasting, not file references** — `vq:go` reads files and pastes content into the executor prompt. Sub-agents don't have access to the `@` reference system.
- **Reconciliation in the skill, not the agent** — the executor returns structured XML, `vq:go` does reconciliation in the main conversation context so the user has visibility.
- **One goal per `/vq:go`** — user stays in the loop. Use `/vq:trek` to execute all remaining goals automatically.
