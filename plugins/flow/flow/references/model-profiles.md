# Model Profiles

Model profiles control which Claude model each Flow agent uses. This allows balancing quality vs token spend.

## Profile Definitions

| Agent | `quality` | `balanced` | `budget` |
|-------|-----------|------------|----------|
| flow:discusser | opus | sonnet | sonnet |
| flow:planner | opus | opus | sonnet |
| flow:researcher | opus | sonnet | haiku |
| flow:executor | opus | sonnet | sonnet |
| flow:verifier | sonnet | sonnet | haiku |

## Profile Philosophy

**quality** - Maximum reasoning power
- Opus for all decision-making agents
- Sonnet for verification
- Use when: quota available, critical architecture work, complex features

**balanced** (default) - Smart allocation
- Opus only for planning (where architecture decisions happen)
- Sonnet for execution, discussion, and research
- Sonnet for verification (needs reasoning, not just pattern matching)
- Use when: normal development, good balance of quality and cost

**budget** - Minimal Opus usage
- Sonnet for anything that writes code or designs architecture
- Haiku for research and verification
- Use when: conserving quota, high-volume work, simple changes

## Resolution Logic

Skills resolve model before spawning agents:

```bash
# 1. Read specs/.flow/config.json
CONFIG_FILE="specs/.flow/config.json"
MODEL_PROFILE="balanced"  # default

if [ -f "$CONFIG_FILE" ]; then
  MODEL_PROFILE=$(jq -r '.model_profile // "balanced"' "$CONFIG_FILE")
fi

# 2. Look up agent model from profile
case "$MODEL_PROFILE" in
  quality)
    PLANNER_MODEL="opus"
    EXECUTOR_MODEL="opus"
    RESEARCHER_MODEL="opus"
    VERIFIER_MODEL="sonnet"
    ;;
  balanced)
    PLANNER_MODEL="opus"
    EXECUTOR_MODEL="sonnet"
    RESEARCHER_MODEL="sonnet"
    VERIFIER_MODEL="sonnet"
    ;;
  budget)
    PLANNER_MODEL="sonnet"
    EXECUTOR_MODEL="sonnet"
    RESEARCHER_MODEL="haiku"
    VERIFIER_MODEL="haiku"
    ;;
esac

# 3. Use in Task call
Task(subagent_type="flow:executor", model="$EXECUTOR_MODEL", ...)
```

## Switching Profiles

Runtime: `/flow:set-profile <profile>`

Per-project config: Edit `specs/.flow/config.json`:
```json
{
  "model_profile": "balanced"
}
```

## Design Rationale

**Why Opus for flow:planner?**
Planning involves architecture decisions, task breakdown, and dependency analysis. Model quality has the highest impact here.

**Why Sonnet for flow:executor?**
Executors follow explicit PLAN.md task instructions. The plan contains the reasoning; execution is implementation.

**Why Sonnet (not Haiku) for verifier in balanced?**
Verification requires goal-backward reasoning - checking if code *delivers* what the spec promised. Sonnet handles this well; Haiku may miss subtle gaps.

**Why Haiku for researcher in budget?**
Research is primarily web search and documentation reading. Haiku can handle pattern extraction and summarization efficiently.

## Config File Location

Flow uses `specs/.flow/config.json` (not `.planning/config.json` like fuckit) to keep all spec-related data in the specs directory.

**Directory structure:**
```
specs/
  .flow/
    config.json         # Flow settings (model_profile, etc.)
  auth/
    SPEC.md
    PLAN.md
  export/
    SPEC.md
```

The `.flow/` directory is created automatically when you first run `/flow:set-profile`.
