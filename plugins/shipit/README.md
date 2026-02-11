# SHIPIT - Agentic Development for Claude Code

**Version:** 1.3.0

A meta-prompting, context engineering and spec-driven development system for Claude Code. Creates hierarchical project plans optimized for solo agentic development with persistent state, parallel execution, and goal-backward verification.

## What SHIPIT Does

SHIPIT orchestrates complex development through a hierarchy of agents that spawn fresh context windows, plan work, execute with atomic commits, and verify results:

1. **Project Discovery** - Deep context gathering, domain research, codebase mapping
2. **Roadmap Generation** - Phase breakdown with requirement mapping and coverage validation
3. **Phase Planning** - Research -> plan -> verify loop with wave-based task organization
4. **Parallel Execution** - Plans within waves run concurrently, each in a fresh context window
5. **Goal-Backward Verification** - Verifies code delivers what was promised, not just that tasks completed
6. **Cross-Phase Learning** - Accumulates lessons from failures/deviations to prevent repeated mistakes

## Workflow

### 1. Initialize Project

```bash
/shipit:new-project
```

Deep context gathering with parallel researchers:
- Spawns domain research agents
- Synthesizes findings into PROJECT.md
- Optionally maps existing codebase (`/shipit:map-codebase`)

**Output:** `.planning/PROJECT.md`, `REQUIREMENTS.md`

### 2. Create Roadmap

```bash
/shipit:new-milestone
```

Generates phased roadmap from requirements:
- Maps requirements to phases (100% coverage validation)
- Derives success criteria per phase
- Creates dependency graph

**Output:** `.planning/ROADMAP.md`, `STATE.md`

### 3. Execute Workflow

```bash
/shipit:go
```

Smart router that reads state and does the right thing:

**For each phase:**
1. **Plan** (`/shipit:plan-phase`)
   - Optional research step
   - Detailed task breakdown with wave assignments
   - Plan-checker verification loop
   - Reads lessons from prior phases

2. **Execute** (`/shipit:execute-phase`)
   - Wave-based parallel execution
   - Atomic commits per task
   - Deviation handling (auto-fix bugs, ask about architectural changes)
   - Records lessons from deviations

3. **Verify** (`/shipit:verify-phase` or `/shipit:verify-work`)
   - Goal-backward verification against must-haves
   - Gap closure plan generation if needed
   - Extracts lessons from any gaps found

### 4. Repeat

`/shipit:go` automatically advances to next phase. Just keep running it.

## Key Concepts

### Meta-Prompting

Plans are prompts, not documents that become prompts. Each agent receives exactly the context it needs, spawned with a fresh 200k token window. Orchestrators stay lean and delegate heavy work.

### Wave-Based Execution

Plans declare a `wave` number in frontmatter. Plans in the same wave run in parallel. Waves execute sequentially. Dependencies between waves are explicit.

### Deviation Handling

During execution, discoveries are handled by rule:
1. **Auto-fix bugs** - Fix immediately, document in Summary
2. **Auto-add critical** - Security/correctness gaps, add and document
3. **Auto-fix blockers** - Can't proceed without fix, do it and document
4. **Ask about architectural** - Major structural changes, stop and ask user

### Cross-Phase Learning

`.planning/LESSONS.md` accumulates project-specific lessons across phases:

**Writers:**
- **Verifier** - Extracts why gaps happened when verification finds issues
- **Executor** - Records patterns from deviations encountered during execution

**Readers:**
- **Planner** - Avoids repeating mistakes in task specifications
- **Phase Researcher** - Focuses research on known problem areas
- **Executor** - Anticipates known issues before they recur

### CLI Delegation

`shipit-tools.js` handles mechanical operations (state parsing, config validation, phase indexing) so skills and agents can focus on orchestration. Single-read architecture eliminates redundant file access.

## Commands

### Primary Workflow

- `/shipit:new-project` - Initialize project with deep context gathering
- `/shipit:new-milestone` - Generate roadmap from requirements
- `/shipit:go` - Smart router (just keep running this)

### Phase Management

- `/shipit:plan-phase N` - Plan phase N with research and verification
- `/shipit:execute-phase N` - Execute phase N with wave-based parallelization
- `/shipit:discuss-phase N` - Interactive discussion before planning
- `/shipit:research-phase N` - Standalone research before planning
- `/shipit:list-phase-assumptions N` - Surface assumptions before planning
- `/shipit:add-phase` - Add phase to end of roadmap
- `/shipit:insert-phase` - Insert urgent work as decimal phase (e.g., 72.1)
- `/shipit:remove-phase` - Remove a future phase and renumber

### Progress and Session

- `/shipit:status` - Visual state diagram
- `/shipit:progress` - Show progress and suggest next action
- `/shipit:pause-work` - Create context handoff when pausing mid-phase
- `/shipit:resume-work` - Resume from previous session with full context

### Verification and Testing

- `/shipit:verify-work` - Conversational UAT for built features
- `/shipit:audit-milestone` - Audit milestone completion before archiving
- `/shipit:plan-milestone-gaps` - Create phases to close audit gaps

### Utilities

- `/shipit:quick` - Quick task with atomic commits, skip optional agents
- `/shipit:debug` - Systematic debugging with persistent state
- `/shipit:map-codebase` - Analyze codebase with parallel mapper agents
- `/shipit:repair-state` - Reconcile state from git history
- `/shipit:undo` - Rollback a completed plan
- `/shipit:add-todo` / `/shipit:check-todos` - Todo management
- `/shipit:complete-milestone` - Archive and close milestone

### Configuration

- `/shipit:settings` - Configure workflow toggles and model profile
- `/shipit:set-profile` - Switch model profile (quality/balanced/budget)
- `/shipit:update` - Update to latest version
- `/shipit:help` - Show available commands

## Configuration

Create `.planning/config.json` to customize:

```json
{
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_checker": true,
    "verifier": true
  }
}
```

### Model Profiles

**model_profile** (default: "balanced")
- `quality` - Opus for all decision-making, Sonnet for read-only verification
- `balanced` - Opus for planning, Sonnet for execution/research/verification
- `budget` - Sonnet for code writing, Haiku for research/verification

### Workflow Toggles

**workflow.research** (default: true)
- When `false`: Skips research phase before planning
- Use when: Already know how to implement, want faster iteration

**workflow.plan_checker** (default: true)
- When `false`: Skips plan-checker agent after planning
- Use when: Confident in plans, want faster iteration

**workflow.verifier** (default: true)
- When `false`: Skips goal-backward verification after execution
- Use when: Quick iterations, trust implementation without deep checks

### Git Integration

```json
{
  "commit_docs": true,
  "branching_strategy": "none",
  "phase_branch_template": "shipit/phase-{phase}-{slug}",
  "milestone_branch_template": "shipit/{milestone}-{slug}"
}
```

## Agents

SHIPIT uses 11 specialized agents, each spawned with fresh context:

| Agent | Role |
|-------|------|
| **planner** | Creates executable phase plans with task breakdown |
| **executor** | Executes plans with atomic commits and deviation handling |
| **phase-researcher** | Researches how to implement a phase before planning |
| **verifier** | Goal-backward verification of phase achievement |
| **plan-checker** | Validates plans will achieve phase goal before execution |
| **integration-checker** | Verifies cross-phase integration and E2E flows |
| **debugger** | Systematic debugging with persistent state |
| **codebase-mapper** | Analyzes codebase structure, conventions, and patterns |
| **project-researcher** | Researches domain ecosystem before roadmap creation |
| **research-synthesizer** | Synthesizes parallel research outputs |
| **roadmapper** | Creates roadmaps with phase breakdown and coverage validation |

## File Structure

```
.planning/
+-- PROJECT.md             # Project vision and scope
+-- ROADMAP.md             # Phase breakdown with requirements mapping
+-- STATE.md               # Current position, decisions, history
+-- REQUIREMENTS.md        # Scoped requirements with REQ-IDs
+-- LESSONS.md             # Accumulated lessons across phases
+-- config.json            # Workflow toggles, model profile
+-- todos/                 # Captured ideas and tasks
+-- debug/                 # Active debug sessions
+-- codebase/              # Codebase map (brownfield projects)
|   +-- STACK.md
|   +-- ARCHITECTURE.md
|   +-- STRUCTURE.md
|   +-- CONVENTIONS.md
|   +-- TESTING.md
|   +-- INTEGRATIONS.md
|   +-- CONCERNS.md
+-- research/              # Domain research
+-- phases/
    +-- 01-foundation/
    |   +-- CONTEXT.md         # User decisions from discuss-phase
    |   +-- RESEARCH.md        # How to implement
    |   +-- 01-01-PLAN.md      # Task breakdown
    |   +-- 01-01-SUMMARY.md   # What was done
    |   +-- VERIFICATION.md    # Goal achievement
    +-- 02-core-features/
        +-- ...
```

## When to Use SHIPIT

**Good fit:**
- Complex multi-phase projects
- Greenfield or brownfield development
- Solo agentic development with Claude Code
- Projects that need persistent state across sessions
- Work requiring parallel execution and verification

**Not ideal:**
- Projects requiring formal specs (use Spek instead)
- Team environments needing shareable documentation (use Spek)
- Simple single-file changes

For spec-driven development with triangle enforcement, use Spek.

## Version History

**1.2.0** (Current)
- Cross-phase learning (LESSONS.md)
- README and documentation

**1.1.x**
- CLI delegation via shipit-tools.js
- Token optimization (single-read architecture)
- Wave-based parallel execution
- 31 skills, 11 agents

**1.0.x**
- Core workflow (research -> plan -> execute -> verify)
- Goal-backward verification
- Deviation handling
- Session pause/resume
- Codebase mapping
- Debug system
