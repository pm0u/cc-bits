# Spek - Spec-Driven Development with Triangle Enforcement

**Version:** 3.2.0

Spec-driven development workflow that enforces the spec triangle: **SPEC <-> tests <-> code**. Combines comprehensive spec creation with proven SHIPIT orchestration and automatic triangle validation.

```
        SPEC.md
       /       \
      /         \
   Tests <----> Code
```

## What Spek Does

Spek ensures your implementation matches your specification through **active enforcement**, not just documentation:

1. **Interactive Spec Creation** - Deep discussion to create comprehensive SPEC.md files
2. **Test Derivation** - Automatically writes tests from acceptance criteria BEFORE implementation
3. **Preflight Validation** - Checks for conflicts before execution starts
4. **Implementation** - Proven SHIPIT workflow (research -> plan -> execute -> verify)
5. **Postflight Validation** - Verifies the triangle is consistent after implementation
6. **Spec Synchronization** - Updates SPEC.md Files sections as code evolves
7. **Cross-Phase Learning** - Accumulates lessons from failures/deviations across phases

## The Spec Triangle

**Edge 1: Spec -> Tests (Coverage)**
- Every acceptance criterion must have test coverage
- Tests derived during planning phase
- Gaps detected in postflight validation

**Edge 2: Tests -> Code (All Pass)**
- Tests must be GREEN before commits
- No skipping tests - enforced in executor
- Failures block commits until fixed

**Edge 3: Code -> Spec (Exact Match)**
- Implementation matches requirements (no more, no less)
- Scope creep detected in postflight
- Missing requirements flagged

## Workflow

### 1. Define Your Spec

```bash
/spek:define "add user dashboard with analytics"
```

Interactive discussion to create comprehensive SPEC.md:
- Identifies domain-specific gray areas
- Captures Implementation Decisions (locked) vs Claude's Discretion
- Supports hierarchical specs (parent + children)
- Creates acceptance criteria (testable conditions)

**Output:** `specs/{feature}/SPEC.md` (and children if complex)

### 2. Create Roadmap

```bash
/spek:new-milestone
```

Bridges from specs to execution:
- Reads SPEC.md requirements
- Generates `.planning/ROADMAP.md` with phases
- For hierarchical specs: each child becomes a phase
- For single specs: breaks requirements into 3-5 phases

**Output:** `.planning/ROADMAP.md`, `STATE.md`, `PROJECT.md`

### 3. Execute Workflow

```bash
/spek:go
```

Smart router that reads state and does the right thing:

**For each phase:**
1. **Plan** (`/spek:plan-phase`)
   - Research how to implement
   - Create detailed task breakdown
   - Derive tests from acceptance criteria

2. **Execute** (`/spek:execute-phase`)
   - Preflight check - validates readiness
   - Execute tasks with atomic commits
   - Tests must pass before commits
   - Lessons from prior phases inform execution

3. **Verify** (`/spek:verify-phase`)
   - Goal-backward verification (code delivers what spec promised)
   - Postflight triangle validation - validates spec <-> tests <-> code
   - Updates SPEC.md Files sections
   - Extracts lessons from any gaps found
   - Marks requirements complete
   - Creates gap closure plans if needed

### 4. Repeat

`/spek:go` automatically advances to next phase. Just keep running it.

## Key Features

### Hierarchical Specs

Complex features split into parent + children:

```
specs/user-dashboard/
+-- SPEC.md (parent)
+-- architecture/SPEC.md
+-- analytics-widgets/SPEC.md
+-- data-pipeline/SPEC.md
+-- settings-page/SPEC.md
```

Each child becomes a phase in the roadmap.

### Decision Tracking

SPEC.md captures:
- **Implementation Decisions (Locked)** - User choices that must be honored
- **Claude's Discretion** - Implementation details Claude decides
- **Deferred Ideas** - Future features (out of scope for this iteration)

STATE.md tracks:
- Decisions made during execution
- Context and rationale
- When decisions were made

### Test-Driven Development

Tests written **before implementation**:
1. Plan phase: test-writer derives tests from acceptance criteria
2. Tests start in RED state (failing)
3. Execute phase: implementation makes tests GREEN
4. No commits allowed with failing tests

### Triangle Validation

**Preflight (before execution):**
- Checks for OPEN items in spec
- Validates plan covers all requirements
- Detects file conflicts
- Confirms tests exist

**Postflight (after execution):**
- Validates all three triangle edges
- Checks test coverage matches acceptance criteria
- Runs test suite, must be GREEN
- Verifies implementation matches spec (no scope creep)
- Updates SPEC.md Files sections
- Creates gap closure plans if drift detected

### Cross-Phase Learning

`.planning/LESSONS.md` accumulates project-specific lessons across phases:

**Writers:**
- **Verifier** - Extracts why gaps happened when verification finds issues
- **Executor** - Records patterns from deviations encountered during execution
- **Spec Enforcer** - Logs drift patterns detected in postflight validation

**Readers:**
- **Planner** - Avoids repeating mistakes in task specifications
- **Phase Researcher** - Focuses research on known problem areas
- **Executor** - Anticipates known issues before they recur

### CLI Delegation

`spek-tools.js` handles mechanical operations (state parsing, config validation, roadmap queries) so skills and agents can focus on orchestration. Single-read architecture eliminates redundant file access.

## Commands

### Primary Workflow

- `/spek:define` - Create comprehensive SPEC.md through discussion
- `/spek:new-project` - Initialize project with deep context gathering
- `/spek:new-milestone` - Generate roadmap from SPEC.md
- `/spek:go` - Smart router (just keep running this)

### Phase Management

- `/spek:plan-phase N` - Plan phase N (includes test derivation)
- `/spek:execute-phase N` - Execute phase N (includes pre/postflight)
- `/spek:verify-phase N` - Verify phase N (includes SPEC updates)
- `/spek:discuss-phase N` - Interactive discussion before planning
- `/spek:research-phase N` - Standalone research before planning
- `/spek:add-phase` - Add phase to end of roadmap
- `/spek:insert-phase` - Insert urgent work as decimal phase (e.g., 72.1)
- `/spek:remove-phase` - Remove a future phase and renumber

### Progress and Session

- `/spek:status` - Visual state diagram
- `/spek:progress` - Show progress and suggest next action
- `/spek:pause-work` - Create context handoff when pausing mid-phase
- `/spek:resume-work` - Resume from previous session with full context

### Verification and Testing

- `/spek:verify-work` - Conversational UAT for built features
- `/spek:audit-milestone` - Audit milestone completion before archiving
- `/spek:plan-milestone-gaps` - Create phases to close audit gaps

### Utilities

- `/spek:quick` - Quick task with atomic commits, skip optional agents
- `/spek:debug` - Systematic debugging with persistent state
- `/spek:map-codebase` - Analyze codebase with parallel mapper agents
- `/spek:repair-state` - Reconcile state from git history
- `/spek:undo` - Rollback a completed plan
- `/spek:add-todo` / `/spek:check-todos` - Todo management
- `/spek:complete-milestone` - Archive and close milestone

### Configuration

- `/spek:settings` - Configure workflow toggles and model profile
- `/spek:set-profile` - Switch model profile (quality/balanced/budget)
- `/spek:update` - Update to latest version
- `/spek:help` - Show available commands

## Configuration

Create `.planning/config.json` to customize:

```json
{
  "model_profile": "balanced",
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```

### Model Profiles

**model_profile** (default: "balanced")
- `quality` - Opus for planning/execution (highest quality, slower, more expensive)
- `balanced` - Sonnet for most operations (good quality, fast, recommended)
- `budget` - Haiku for checks/validation (fastest, cheapest, less thorough)

### Workflow Toggles

**workflow.research** (default: true)
- When `false`: Skips research phase before planning
- Use when: Already know how to implement, want faster iteration

**workflow.plan_check** (default: true)
- When `false`: Skips plan-checker agent after planning
- Plans go directly to execution without verification
- Preflight check still runs before execution
- Use when: Confident in plans, want faster iteration

**workflow.verifier** (default: true)
- When `false`: Skips goal-backward verification in verify-phase
- Triangle validation still runs (cannot be disabled)
- SPEC.md updates still happen
- Use when: Quick iterations, trust implementation without deep checks

### What Cannot Be Disabled

These checks always run to ensure spec triangle integrity:

- **Test derivation** (plan-phase) - Tests written from acceptance criteria before implementation
- **Preflight validation** (execute-phase) - Checks for conflicts before execution starts
- **Test enforcement** (executor) - Tests must pass before commits
- **Postflight triangle validation** (verify-phase) - Validates spec <-> tests <-> code consistency

## File Structure

```
your-project/
+-- specs/                          # Human-readable specifications
|   +-- {feature}/
|       +-- SPEC.md                # Requirements, acceptance criteria, decisions
|       +-- {child}/SPEC.md        # Child specs (if hierarchical)
|
+-- .planning/                      # Execution state (machine-oriented)
    +-- PROJECT.md                 # Current milestone, requirements
    +-- ROADMAP.md                 # Phase breakdown
    +-- STATE.md                   # Current position, decisions, history
    +-- LESSONS.md                 # Accumulated lessons across phases
    +-- config.json                # Workflow toggles, model profile
    +-- phases/
        +-- {NN}-{name}/
            +-- {NN}-RESEARCH.md   # How to implement
            +-- {NN}-01-PLAN.md    # Task breakdown
            +-- {NN}-01-SUMMARY.md # What was done
            +-- {NN}-VERIFICATION.md # Goal achievement
```

## When to Use Spek

**Good fit:**
- Complex features requiring documentation
- Team projects (specs are shareable)
- Long-term projects (specs don't go stale)
- Compliance/audit needs (documented requirements)
- Multiple implementation approaches (specs lock decisions)

**Not ideal:**
- Quick prototypes or experiments
- One-off bug fixes
- Solo projects where specs feel like overhead

For lightweight tasks, use `/spek:quick` or stick with SHIPIT.

## Version History

**3.2.0** (Current)
- Tightened test enforcement — tests required when acceptance criteria exist
- Spec-enforcer no longer writes "no test files" when acceptance criteria exist (self-reinforcing loop fix)
- Test-writer bootstraps test framework when none exists
- Preflight rejects "no tests" declarations when acceptance criteria are present
- Executor exception now acceptance-criteria-aware

**3.1.0**
- Cross-phase learning (LESSONS.md)
- README and documentation updates

**3.0.0**
- Enforced spec triangle validation (SPEC <-> tests <-> code)
- Test derivation during planning
- Preflight/postflight checks
- SPEC.md synchronization
- Mandatory test enforcement
- Separate verify-phase skill
- CLI delegation via spek-tools.js

**2.x**
- Hierarchical spec support
- Interactive spec creation
- Bridge to SHIPIT workflow

**1.x**
- Initial spec-driven concepts
- Basic SHIPIT integration
