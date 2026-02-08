# Sendit

Spec-Driven Development for Claude Code.

Sendit makes specs the organizing principle of your project. The spec tree IS your infrastructure — no `.planning/` directories, no state machines, no ceremony. Specs are living contracts between you, your tests, and your code.

## Quick Start

```
# Start working on something
/sendit:go "add user authentication"

# Manage specs directly
/sendit:spec create auth
/sendit:spec edit auth
/sendit:spec list

# Check project health
/sendit:status

# Import from existing docs
/sendit:ingest path/to/FEATURE.md

# Document existing code
/sendit:reverse-spec src/auth/
```

## How It Works

Sendit operates on a continuous light-full spectrum. Small changes get fewer stages but still use agents. Complex features get the full treatment: questioning, spec engagement, test writing, planning with validation, agent-based execution, and post-flight triangle checks.

**The orchestrator never implements.** The main context assesses, routes, and spawns specialized agents. This keeps the orchestrator context clean and ensures each agent gets focused, fresh context for its task.

**The flow:**
1. **Scope check** — Is this one spec or a spec tree?
2. **Assess** — Parse intent, check specs, determine weight
3. **Pre-flight** — Agent checks for conflicts with existing specs
4. **Spec engagement** — (if needed) Questioning session + spec refinement
5. **Test writing** — (if spec changed) Agent derives failing tests from spec
6. **Research** — (if needed) Agent investigates unfamiliar tech
7. **Plan** — Agent creates plan, checker validates (full mode)
8. **Execute** — Agent per task, with kickback protocol for complexity
9. **Post-flight** — Agent validates the Spec-Tests-Code triangle

## Core Concepts

### The Triangle

Every feature maintains three artifacts that must stay consistent:

```
        SPEC.md
       /       \
      /         \
   Tests <-----> Code
```

- **Spec -> Tests**: Every acceptance criterion has test coverage
- **Tests -> Code**: All tests pass
- **Code -> Spec**: Implementation matches what the spec describes

### Spec-on-Touch

No upfront spec work required. When you first work on a feature, sendit offers to create a spec — or you can skip it entirely. The spec tree grows organically as your project evolves.

### Scope Check and Spec Splitting

Large tasks (multiple pages, full applications, multiple features) are detected early and broken into a spec tree. Each child spec gets its own pipeline run. This prevents monolithic specs that produce bad plans and overwhelmed executors.

### Kickback Protocol

Agents (planner, executor) perform early complexity checks. If a task exceeds their scope, they return a KICKBACK instead of silently producing poor work. The orchestrator then routes appropriately: split the spec, return to spec engagement, or spawn a researcher.

### Questioning

When creating new specs for complex features, sendit runs a targeted questioning session — identifying fuzzy areas, presenting concrete options, and probing scope boundaries. This ensures specs have enough clarity for agents to act on without guessing.

### Light vs Full

| Aspect | Light | Full |
|--------|-------|------|
| When | Known territory, small changes | New features, complexity |
| Stages | Fewer (skip engagement, research, postflight) | All stages |
| Agents | Always (planner + executors) | Always (all agent types) |
| Spec work | Skip or quick | Questioning + ready gate |
| Testing | Basic coverage | Full acceptance criteria |

## Commands

| Command | Description |
|---------|------------|
| `/sendit:go "task"` | Single entry point for everything |
| `/sendit:spec` | Direct spec management (create/edit/view/split/list) |
| `/sendit:status` | Spec tree health dashboard |
| `/sendit:ingest` | Import specs from external docs |
| `/sendit:reverse-spec` | Generate spec from existing code |
| `/sendit:help` | Quick reference |

## Positioning

- **huckit**: Atomic skills library. Individual techniques (TDD, debugging, etc.)
- **sendit**: Spec-driven development. The spec tree is your infrastructure.
- **fuckit**: Heavyweight project management. Roadmaps, phases, milestones.

Sendit sits between huckit and fuckit. It's for when you want more structure than individual skills but less ceremony than a full project management system.

## License

MIT
