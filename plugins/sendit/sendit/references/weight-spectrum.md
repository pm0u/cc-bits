# Weight Spectrum

Sendit operates on a continuous light↔full spectrum. This reference defines what each stage looks like at each weight.

## Core Principle: Orchestrator Never Implements

The main context is ALWAYS the orchestrator. It assesses, routes, spawns agents, handles kickbacks, and reports to the user. It NEVER writes code, creates files, or makes implementation decisions directly.

Both light and full modes use agents. The difference is which stages are included and how thorough each agent's task is — not whether agents are used.

```
Light ◄──────────────────────► Full
 │                                │
 │  Fewer stages, focused agents  │  All stages, thorough agents
 │  Best for: known territory     │  Best for: new ground, complexity
 │  Cost: 2-10 minutes            │  Cost: 10-30 minutes
 └────────────────────────────────┘
```

## Per-Stage Behavior

### 0. Scope Check (always inline — fast)

| Light | Full |
|-------|------|
| Same | Same |
| Always runs before weight determination | Always runs before weight determination |

### 1. Assessment (always inline — fast)

| Light | Full |
|-------|------|
| Layer 1 only (intent parse) | All 4 layers |
| < 2 seconds | < 10 seconds |
| No file reads | Reads INDEX.md + relevant specs |

### 2. Pre-flight

| Light | Full |
|-------|------|
| Spawns spec-enforcer with quick check prompt | Spawns spec-enforcer with thorough analysis prompt |
| Output: 1-2 sentence summary | Output: structured preflight report |

### 3. Spec Engagement

| Light | Full |
|-------|------|
| Skip entirely (spec is clean or N/A) | Questioning session with user (see questioning.md) |
| Or: quick spec-on-touch (reverse-spec) | Update SPEC.md sections iteratively |
| No ready gate check | Ready gate must pass (no OPEN, criteria present) |

### 4. Test Writing

| Light | Full |
|-------|------|
| Spawns test-writer with minimal prompt (basic coverage) | Spawns test-writer with full prompt (all acceptance criteria) |
| Tests co-evolve with code | Tests written BEFORE code (from spec only) |
| Test-writer sees the plan | Test-writer never sees the plan |

### 5. Research

| Light | Full |
|-------|------|
| Skip entirely | Spawns researcher agent for unfamiliar tech |
| N/A | Produces RESEARCH.md consumed by planner |

### 6. Planning

| Light | Full |
|-------|------|
| Spawns planner agent with lightweight prompt | Spawns planner agent with full prompt |
| Planner targets 1-5 tasks | Planner targets 2-8 tasks |
| No plan-checker | Plan-checker validates against spec |
| Plan presented to user for confirmation | Revision loop (max 2 rounds), then user approval |

### 7. Execution

| Light | Full |
|-------|------|
| Spawns executor agent per task | Spawns executor agent per task |
| Executor gets minimal context (task + files) | Executor gets full context (task + spec + plan) |
| Tests run at end | Tests run per task |

### 8. Post-flight

| Light | Full |
|-------|------|
| Run tests, confirm passing | Spawns spec-enforcer for triangle validation |
| Quick summary to user | Drift report generated |
| INDEX.md update (if exists) | INDEX.md update (required) |
| No drift analysis | Full drift analysis with resolution |

## Mixing Weights

A single workflow can mix weights across stages. Common patterns:

**Light assessment, full execution**: User says "add feature X" clearly (light assess), but X is complex enough to need full planning and execution.

**Full assessment, light execution**: Task seems ambiguous (full assess) but turns out to be a simple change to a well-spec'd feature.

**Progressive upgrade**: Start light, agent sends KICKBACK mid-flight, upgrade remaining stages to full.

## Cost/Benefit

| Weight | Agent spawns | Typical duration | Best for |
|--------|-------------|-----------------|----------|
| Full light | 2-3 (planner, executor(s)) | 2-10 min | Bug fixes, small changes, well-spec'd features |
| Mixed | 3-5 | 5-15 min | Medium features, partial spec coverage |
| Full full | 5-8 | 15-30 min | New features, complex changes, no existing spec |

The goal is to use the minimum process needed for quality. Sendit defaults to light and upgrades only when warranted — but always delegates to agents.
