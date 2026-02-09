# Flow

Guided development workflow that combines:
- **Deep discussion** (FUCKIT's adaptive questioning)
- **Spec-driven approach** (SENDIT's clarity)
- **Hierarchical specs** (parent/child with dependencies)
- **Explicit gates** (user control at each stage)
- **Emergent structure** (start simple, add complexity when needed)

## Philosophy

**Start simple, add structure when needed.**

- Single feature? One spec, done.
- Complex feature? Hierarchical specs with dependencies.
- No upfront ceremony, structure emerges naturally.

## Core Workflow

```
/flow:discuss → /flow:plan → /flow:execute → /flow:verify
```

## Key Features

### 1. Deep Discussion Phase
- Domain-aware questioning (like FUCKIT)
- 4 questions per area before checking
- Scope guardrails (deferred ideas captured, not acted on)
- Creates SPEC.md with Context section

### 2. Hierarchical Specs
```
specs/
  auth/
    SPEC.md              # Parent spec
    session/SPEC.md      # Child spec
    api/SPEC.md          # Child spec
    ui/SPEC.md           # Child spec
```

### 3. Dependency-Driven Execution
```yaml
# specs/auth/ui/SPEC.md
depends_on:
  - auth/session
  - auth/api
```
System auto-computes execution order, parallelizes where safe.

### 4. Cascade Updates
Update parent spec → system offers to propagate changes to children.

### 5. Explicit Gates
- Post-discussion: Continue | Discuss more | Plan without research
- Post-planning: Execute | Review | Adjust

### 6. Context Clarity
Each spec has:
- **Decisions** (locked - planner must honor)
- **Claude's Discretion** (implementation freedom)
- **Deferred Ideas** (future work, not lost)

## Commands

### Core Workflow
- `/flow:discuss <feature>` - Deep discussion, creates SPEC.md
- `/flow:plan <feature>` - Planning with auto-research
- `/flow:execute <feature>` - Dependency-driven execution
- `/flow:verify <feature>` - Goal-backward verification

### Quick Mode
- `/flow:quick "description"` - Small changes without full ceremony
  - Maintains spec integrity (prevents drift)
  - Uses test heuristic for recommendations
  - Lightweight (no discussion/planning phases)

### Support Commands
- `/flow:status <feature>` - Show progress and dependencies
- `/flow:cascade <parent>` - Propagate parent changes to children
- `/flow:spec <action>` - Direct spec manipulation
- `/flow:help` - Show help

## Examples

### Simple Feature
```bash
/flow:discuss logout-button
→ Single spec, one discussion session
→ /flow:plan logout-button
→ /flow:execute logout-button
```

### Complex Feature (Emergent Structure)
```bash
/flow:discuss auth
→ "This needs multiple sub-specs"
→ Creates specs/auth/ with children
→ Each child gets discussed
→ /flow:plan auth  # Plans all in dependency order
→ /flow:execute auth  # Executes with parallelism
```

## Comparison

| Feature | FUCKIT | SENDIT | Flow |
|---------|--------|--------|------|
| Deep discussion | ✅ Mandatory | ⚠️ Optional | ✅ Mandatory |
| Spec-driven | ❌ Scattered docs | ✅ SPEC.md | ✅ SPEC.md |
| Structure | ⚠️ Heavy (phases) | ✅ Light | ✅ Emergent |
| Gates | ✅ Yes | ❌ No | ✅ Yes |
| Dependencies | ⚠️ Linear phases | ⚠️ Manual | ✅ Auto-resolved |
| Decision clarity | ✅ Yes | ❌ No | ✅ Yes |
| Research | ✅ Auto in planning | ⚠️ Heuristic | ✅ Auto in planning |

## Architecture

- **Skills** - User-facing commands (`/flow:discuss`, etc.)
- **Agents** - Specialized workers (discusser, planner, executor)
- **Workflows** - Orchestration logic (gates, dependency resolution)
- **References** - Shared documentation (spec format, gates)
- **Templates** - SPEC.md templates

## Status

🚧 **In Development** - Version 0.1.0

Building the foundation with core workflows and dependency system.
