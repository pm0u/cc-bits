# Model Profiles

Model profiles control which Claude model each SPEK agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| spek:planner | opus | opus | sonnet |
| spek:roadmapper | opus | sonnet | sonnet |
| spek:executor | opus | sonnet | sonnet |
| spek:phase-researcher | opus | sonnet | haiku |
| spek:project-researcher | opus | sonnet | haiku |
| spek:research-synthesizer | sonnet | sonnet | haiku |
| spek:debugger | opus | sonnet | sonnet |
| spek:codebase-mapper | sonnet | haiku | haiku |
| spek:verifier | sonnet | sonnet | haiku |
| spek:plan-checker | sonnet | sonnet | haiku |
| spek:integration-checker | sonnet | sonnet | haiku |

## Profile Philosophy

**quality** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for read-only verification
- Use when: quota available, critical architecture work

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution and research (follows explicit instructions)
- Sonnet for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal Opus usage
- Sonnet for anything that writes code
- Haiku for research and verification
- Use when: conserving quota, high-volume work, less critical phases

## Resolution Logic

Orchestrators resolve model before spawning:

```
1. Read .planning/config.json
2. Get model_profile (default: "balanced")
3. Look up agent in table above
4. Pass model parameter to Task call
```

## Switching Profiles

Runtime: `/spek:set-profile <profile>`

Per-project default: Set in `.planning/config.json`:
```json
{
  "model_profile": "balanced"
}
```

## Per-Plan Model Override

Individual plans can override the project-wide profile for specific execution needs.

### In PLAN.md Frontmatter

```yaml
---
phase: 03
plan: 02
wave: 1
model: opus  # Override for this plan only
---
```

### When to Use

- **Complex architectural decisions** in a single plan → `model: opus`
- **Simple, repetitive tasks** → `model: haiku` (faster, cheaper)
- **Critical security implementation** → `model: opus`
- **Bulk file generation** → `model: sonnet` or `haiku`

### Resolution Priority

1. **Plan frontmatter `model:`** — Highest priority, overrides all
2. **Project `model_profile`** — From config.json, applies to all plans
3. **Default: `balanced`** — If nothing specified

### Orchestrator Logic

```bash
# In execute-phase, for each plan:
PLAN_MODEL=$(grep "^model:" "$PLAN_FILE" | cut -d: -f2 | tr -d ' "')

if [ -n "$PLAN_MODEL" ]; then
  # Use plan-specific model
  EXECUTOR_MODEL="$PLAN_MODEL"
else
  # Fall back to profile lookup
  EXECUTOR_MODEL=$(lookup_profile_model "spek:executor" "$MODEL_PROFILE")
fi
```

### Validation

Valid values: `opus`, `sonnet`, `haiku`

Invalid model names are ignored (falls back to profile).

## Design Rationale

**Why Opus for spek:planner?**
Planning involves architecture decisions, goal decomposition, and task design. This is where model quality has the highest impact.

**Why Sonnet for spek:executor?**
Executors follow explicit PLAN.md instructions. The plan already contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for verifiers in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the phase promised, not just pattern matching. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for spek:codebase-mapper?**
Read-only exploration and pattern extraction. No reasoning required, just structured output from file contents.
