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

Sendit operates on a continuous light↔full spectrum. Small changes fly through in minutes. Complex features get the full treatment: spec engagement, separate test writing, planning with validation, and post-flight triangle checks.

**The flow:**
1. **Assess** — Parse your intent, check specs, determine weight
2. **Pre-flight** — Check for conflicts with existing specs
3. **Spec engagement** — (if needed) Brainstorm and refine the spec
4. **Test writing** — (if spec changed) Derive failing tests from spec
5. **Plan** — Light: inline tasks. Full: planner + checker agents
6. **Execute** — Implement, verify, commit per task
7. **Post-flight** — Validate the Spec ↔ Tests ↔ Code triangle

## Core Concepts

### The Triangle

Every feature maintains three artifacts that must stay consistent:

```
        SPEC.md
       /       \
      /         \
   Tests ←────→ Code
```

- **Spec → Tests**: Every acceptance criterion has test coverage
- **Tests → Code**: All tests pass
- **Code → Spec**: Implementation matches what the spec describes

### Spec-on-Touch

No upfront spec work required. When you first work on a feature, sendit offers to create a spec — or you can skip it entirely. The spec tree grows organically as your project evolves.

### Light vs Full

| Aspect | Light | Full |
|--------|-------|------|
| When | Known territory, small changes | New features, complexity |
| Process | Inline, no agents | Agent-based, thorough |
| Duration | 1-5 min | 15-30 min |
| Spec work | Skip or quick | Brainstorm + ready gate |
| Testing | Inline | Separate test-writer |

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
