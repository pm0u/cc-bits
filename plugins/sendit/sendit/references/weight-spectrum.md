# Weight Spectrum

Sendit operates on a continuous light↔full spectrum. This reference defines what each stage looks like at each weight.

## The Spectrum

Light and full are not modes — they're ends of a spectrum. Each stage independently scales between them.

```
Light ◄──────────────────────► Full
 │                                │
 │  Quick, inline, minimal        │  Thorough, agent-based, complete
 │  Best for: known territory     │  Best for: new ground, complexity
 │  Cost: minutes                 │  Cost: 10-30 minutes
 └────────────────────────────────┘
```

## Per-Stage Behavior

### 1. Assessment

| Light | Full |
|-------|------|
| Layer 1 only (intent parse) | All 3 layers |
| < 2 seconds | < 5 seconds |
| No file reads | Reads INDEX.md + relevant specs |

### 2. Pre-flight

| Light | Full |
|-------|------|
| Inline in main context | Spawns spec-enforcer agent |
| Read relevant spec, check for obvious conflicts | Thorough constraint analysis across all related specs |
| Output: 1-2 sentence summary | Output: structured preflight report |

### 3. Spec Engagement

| Light | Full |
|-------|------|
| Skip entirely (spec is clean or N/A) | Socratic brainstorm with user |
| Or: quick spec-on-touch (reverse-spec) | Update SPEC.md sections iteratively |
| No ready gate check | Ready gate must pass (no OPEN, criteria present) |

### 4. Test Writing

| Light | Full |
|-------|------|
| Executor writes tests inline during implementation | Separate test-writer agent |
| Tests co-evolve with code | Tests written BEFORE code (from spec only) |
| No spec isolation guarantee | Test-writer never sees the plan |

### 5. Planning

| Light | Full |
|-------|------|
| 1-5 tasks enumerated inline | Planner agent produces PLAN.md |
| Tasks listed in main context | Plan-checker validates against spec |
| No plan file created | Revision loop (max 2 rounds) |
| Format: numbered list with file targets | Format: structured plan with verification criteria |

### 6. Execution

| Light | Full |
|-------|------|
| Inline in main context | Executor agent per task |
| Commit per logical change | Commit per task |
| Tests run at end | Tests run per task |
| No explicit spec tracking | Each task references spec section |

### 7. Post-flight

| Light | Full |
|-------|------|
| Run tests, confirm passing | Spec-enforcer agent validates triangle |
| Quick "done" confirmation | Drift report generated |
| INDEX.md update (if exists) | INDEX.md update (required) |
| No drift analysis | Full drift analysis with resolution |

## Mixing Weights

A single workflow can mix weights across stages. Common patterns:

**Light assessment, full execution**: User says "add feature X" clearly (light assess), but X is complex enough to need full planning and execution.

**Full assessment, light execution**: Task seems ambiguous (full assess) but turns out to be a simple change to a well-spec'd feature (light execute).

**Progressive upgrade**: Start light, discover complexity mid-flight, upgrade remaining stages to full.

## Cost/Benefit

| Weight | Agent spawns | Typical duration | Best for |
|--------|-------------|-----------------|----------|
| Full light | 0 | 1-5 min | Bug fixes, small changes, well-spec'd features |
| Mixed | 1-2 | 5-15 min | Medium features, partial spec coverage |
| Full full | 4-5 | 15-30 min | New features, complex changes, no existing spec |

The goal is to use the minimum process needed for quality. Sendit defaults to light and upgrades only when warranted.
