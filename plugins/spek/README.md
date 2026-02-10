# Spek - Spec-Driven Development with Triangle Enforcement

**Version:** 3.0.0

Spec-driven development workflow that enforces the spec triangle: **SPEC ↔ tests ↔ code**. Combines comprehensive spec creation with proven FUCKIT orchestration and automatic triangle validation.

```
        SPEC.md
       /       \
      /         \
   Tests ←────→ Code
```

## What Spek Does

Spek ensures your implementation matches your specification through **active enforcement**, not just documentation:

1. **Interactive Spec Creation** - Deep discussion to create comprehensive SPEC.md files
2. **Test Derivation** - Automatically writes tests from acceptance criteria BEFORE implementation
3. **Preflight Validation** - Checks for conflicts before execution starts
4. **Implementation** - Proven FUCKIT workflow (research → plan → execute → verify)
5. **Postflight Validation** - Verifies the triangle is consistent after implementation
6. **Spec Synchronization** - Updates SPEC.md Files sections as code evolves

## The Spec Triangle

**Edge 1: Spec → Tests (Coverage)**
- Every acceptance criterion must have test coverage
- Tests derived during planning phase
- Gaps detected in postflight validation

**Edge 2: Tests → Code (All Pass)**
- Tests must be GREEN before commits
- No skipping tests - enforced in executor
- Failures block commits until fixed

**Edge 3: Code → Spec (Exact Match)**
- Implementation matches requirements (no more, no less)
- Scope creep detected in postflight
- Missing requirements flagged

## Workflow

### 1. Define Your Spec

```bash
/spek:define "migrate trail pages to Astro"
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
   - **Derive tests from acceptance criteria** ✨

2. **Execute** (`/spek:execute-phase`)
   - **Preflight check** - validates readiness ✨
   - Execute tasks with atomic commits
   - **Tests must pass before commits** ✨

3. **Verify** (`/spek:verify-phase`)
   - Goal-backward verification (code delivers what spec promised)
   - **Postflight triangle validation** - validates spec ↔ tests ↔ code ✨
   - **Updates SPEC.md Files sections** ✨
   - Marks requirements complete
   - Creates gap closure plans if needed

### 4. Repeat

`/spek:go` automatically advances to next phase. Just keep running it.

## Key Features

### Hierarchical Specs

Complex features split into parent + children:

```
specs/offroad-trail-pages/
├── SPEC.md (parent)
├── architecture/SPEC.md
├── landing-page/SPEC.md
├── region-state-pages/SPEC.md
└── trail-detail-pages/SPEC.md
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

## Commands

### Primary Workflow

- `/spek:define` - Create comprehensive SPEC.md through discussion
- `/spek:new-milestone` - Generate roadmap from SPEC.md
- `/spek:go` - Smart router (just keep running this)

### Phase Management

- `/spek:plan-phase N` - Plan phase N (includes test derivation)
- `/spek:execute-phase N` - Execute phase N (includes pre/postflight)
- `/spek:verify-phase N` - Verify phase N (includes SPEC updates)

### Utilities

- `/spek:status` - Visual state diagram
- `/spek:progress` - Show progress and suggest next action
- `/spek:discuss-phase N` - Interactive discussion before planning
- `/spek:add-phase` - Add phase to roadmap
- `/spek:complete-milestone` - Archive and close milestone

## Example Session

```bash
# 1. Create spec
/spek:define "Add dark mode support"
  → Interactive discussion
  → Creates specs/dark-mode/SPEC.md

# 2. Generate roadmap
/spek:new-milestone
  → Creates .planning/ROADMAP.md (3 phases)

# 3. Execute workflow
/spek:go
  → Plans Phase 1 (design tokens)
  → Derives tests from acceptance criteria
  → Ready to execute

/spek:go
  → Preflight check passes
  → Executes Phase 1
  → Tests pass
  → Postflight validates triangle
  → Phase 1 complete

/spek:go
  → Auto-advances to Phase 2
  → Plans Phase 2 (component updates)
  → ...repeat
```

## What Makes Spek Different

**vs FUCKIT:**
- Adds human-readable specs/ directory (shareable, version-controlled)
- Enforces spec triangle (tests, validation, synchronization)
- Better for long-term projects with documented requirements

**vs SENDIT:**
- Reuses proven FUCKIT orchestration (research, plan, execute, verify)
- Phase-based execution (better for complex features)
- Hierarchical specs (parent/child organization)

**vs Flow:**
- Automatic triangle enforcement (no manual validation)
- Test derivation integrated into planning
- SPEC.md stays in sync automatically

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

See `spek/references/model-profiles.md` for detailed agent assignments.

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

These checks **always run** to ensure spec triangle integrity:

✅ **Test derivation** (plan-phase step 9.5)
- Tests written from acceptance criteria before implementation
- Cannot be skipped in v3.0 - triangle enforcement requires tests

✅ **Preflight validation** (execute-phase step 3.5)
- Checks for conflicts before execution starts
- Validates tests exist and are ready

✅ **Test enforcement** (executor agent)
- Tests must pass before commits
- Hard exit code check prevents commits with failing tests

✅ **Postflight triangle validation** (verify-phase step 5)
- Validates spec ↔ tests ↔ code consistency
- Checks all three edges with severity levels
- Cannot be disabled - core triangle guarantee

## File Structure

```
your-project/
├── specs/                          # Human-readable specifications
│   └── {feature}/
│       ├── SPEC.md                # Requirements, acceptance criteria, decisions
│       └── {child}/SPEC.md        # Child specs (if hierarchical)
│
└── .planning/                      # Execution state (machine-oriented)
    ├── PROJECT.md                 # Current milestone, requirements
    ├── ROADMAP.md                 # Phase breakdown
    ├── STATE.md                   # Current position, decisions, history
    └── phases/
        └── {NN}-{name}/
            ├── {NN}-RESEARCH.md   # How to implement
            ├── {NN}-01-PLAN.md    # Task breakdown
            ├── {NN}-01-SUMMARY.md # What was done
            └── {NN}-VERIFICATION.md # Goal achievement
```

## When to Use Spek

**Good fit:**
- ✅ Complex features requiring documentation
- ✅ Team projects (specs are shareable)
- ✅ Long-term projects (specs don't go stale)
- ✅ Compliance/audit needs (documented requirements)
- ✅ Multiple implementation approaches (specs lock decisions)

**Not ideal:**
- ❌ Quick prototypes or experiments
- ❌ One-off bug fixes
- ❌ Solo projects where specs feel like overhead

For lightweight tasks, use `/spek:quick` or stick with FUCKIT.

## Version History

**3.0.0** (Current)
- Enforced spec triangle validation
- Test derivation during planning
- Preflight/postflight checks
- SPEC.md synchronization
- Mandatory test enforcement

**2.x**
- Hierarchical spec support
- Interactive spec creation
- Bridge to FUCKIT workflow

**1.x**
- Initial spec-driven concepts
- Basic FUCKIT integration

## Learn More

- **References:** `plugins/spek/spek/references/spec-format.md`, `triangle-validation.md`
- **Workflows:** `plugins/spek/spek/workflows/*.md`
- **Agents:** `plugins/spek/agents/*.md`

---

**Made with ❤️ for spec-driven development**
