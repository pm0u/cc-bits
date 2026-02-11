---
name: shipit:help
description: Show available SHIPIT commands and usage guide
---

<objective>
Display the complete SHIPIT command reference.

Output ONLY the reference content below. Do NOT add:

- Project-specific analysis
- Git status or file context
- Next-step suggestions
- Any commentary beyond the reference
  </objective>

<reference>
# SHIPIT Command Reference

**SHIPIT** (Get Shit Done) creates hierarchical project plans optimized for solo agentic development with Claude Code.

## Quick Start

1. `/shipit:new-project` - Initialize project (includes research, requirements, roadmap)
2. `/shipit:plan-phase 1` - Create detailed plan for first phase
3. `/shipit:execute-phase 1` - Execute the phase

## Staying Updated

SHIPIT evolves fast. Update periodically:

```bash
npx shipit-cc@latest
```

## Core Workflow

```
/shipit:new-project → /shipit:plan-phase → /shipit:execute-phase → repeat
```

### Project Initialization

**`/shipit:new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/shipit:new-project`

**`/shipit:map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/shipit:new-project` on existing codebases

Usage: `/shipit:map-codebase`

### Phase Planning

**`/shipit:discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel

Usage: `/shipit:discuss-phase 2`

**`/shipit:research-phase <number>`**
Comprehensive ecosystem research for niche/complex domains.

- Discovers standard stack, architecture patterns, pitfalls
- Creates RESEARCH.md with "how experts build this" knowledge
- Use for 3D, games, audio, shaders, ML, and other specialized domains
- Goes beyond "which library" to ecosystem knowledge

Usage: `/shipit:research-phase 3`

**`/shipit:list-phase-assumptions <number>`**
See what Claude is planning to do before it starts.

- Shows Claude's intended approach for a phase
- Lets you course-correct if Claude misunderstood your vision
- No files created - conversational output only

Usage: `/shipit:list-phase-assumptions 3`

**`/shipit:plan-phase <number>`**
Create detailed execution plan for a specific phase.

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/shipit:plan-phase 1`
Result: Creates `.planning/phases/01-foundation/01-01-PLAN.md`

### Execution

**`/shipit:execute-phase <phase-number>`**
Execute all plans in a phase.

- Groups plans by wave (from frontmatter), executes waves sequentially
- Plans within each wave run in parallel via Task tool
- Verifies phase goal after all plans complete
- Updates REQUIREMENTS.md, ROADMAP.md, STATE.md

Usage: `/shipit:execute-phase 5`

### Quick Mode

**`/shipit:quick`**
Execute small, ad-hoc tasks with SHIPIT guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns planner + executor (skips researcher, checker, verifier)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md tracking (not ROADMAP.md)

Use when you know exactly what to do and the task is small enough to not need research or verification.

Usage: `/shipit:quick`
Result: Creates `.planning/quick/NNN-slug/PLAN.md`, `.planning/quick/NNN-slug/SUMMARY.md`

### Roadmap Management

**`/shipit:add-phase <description>`**
Add new phase to end of current milestone.

- Appends to ROADMAP.md
- Uses next sequential number
- Updates phase directory structure

Usage: `/shipit:add-phase "Add admin dashboard"`

**`/shipit:insert-phase <after> <description>`**
Insert urgent work as decimal phase between existing phases.

- Creates intermediate phase (e.g., 7.1 between 7 and 8)
- Useful for discovered work that must happen mid-milestone
- Maintains phase ordering

Usage: `/shipit:insert-phase 7 "Fix critical auth bug"`
Result: Creates Phase 7.1

**`/shipit:remove-phase <number>`**
Remove a future phase and renumber subsequent phases.

- Deletes phase directory and all references
- Renumbers all subsequent phases to close the gap
- Only works on future (unstarted) phases
- Git commit preserves historical record

Usage: `/shipit:remove-phase 17`
Result: Phase 17 deleted, phases 18-20 become 17-19

### Milestone Management

**`/shipit:new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown

Mirrors `/shipit:new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/shipit:new-milestone "v2.0 Features"`

**`/shipit:complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/shipit:complete-milestone 1.0.0`

### Progress Tracking

**`/shipit:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/shipit:progress`

### Session Management

**`/shipit:resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/shipit:resume-work`

**`/shipit:pause-work`**
Create context handoff when pausing work mid-phase.

- Creates .continue-here file with current state
- Updates STATE.md session continuity section
- Captures in-progress work context

Usage: `/shipit:pause-work`

### Debugging

**`/shipit:debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.planning/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/shipit:debug` with no args to resume
- Archives resolved issues to `.planning/debug/resolved/`

Usage: `/shipit:debug "login button doesn't work"`
Usage: `/shipit:debug` (resume active session)

### Todo Management

**`/shipit:add-todo [description]`**
Capture idea or task as todo from current conversation.

- Extracts context from conversation (or uses provided description)
- Creates structured todo file in `.planning/todos/pending/`
- Infers area from file paths for grouping
- Checks for duplicates before creating
- Updates STATE.md todo count

Usage: `/shipit:add-todo` (infers from conversation)
Usage: `/shipit:add-todo Add auth token refresh`

**`/shipit:check-todos [area]`**
List pending todos and select one to work on.

- Lists all pending todos with title, area, age
- Optional area filter (e.g., `/shipit:check-todos api`)
- Loads full context for selected todo
- Routes to appropriate action (work now, add to phase, brainstorm)
- Moves todo to done/ when work begins

Usage: `/shipit:check-todos`
Usage: `/shipit:check-todos api`

### User Acceptance Testing

**`/shipit:verify-work [phase]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from SUMMARY.md files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix plans
- Ready for re-execution if issues found

Usage: `/shipit:verify-work 3`

### Milestone Auditing

**`/shipit:audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/shipit:audit-milestone`

**`/shipit:plan-milestone-gaps`**
Create phases to close gaps identified by audit.

- Reads MILESTONE-AUDIT.md and groups gaps into phases
- Prioritizes by requirement priority (must/should/nice)
- Adds gap closure phases to ROADMAP.md
- Ready for `/shipit:plan-phase` on new phases

Usage: `/shipit:plan-milestone-gaps`

### Configuration

**`/shipit:settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget)
- Updates `.planning/config.json`

Usage: `/shipit:settings`

**`/shipit:set-profile <profile>`**
Quick switch model profile for SHIPIT agents.

- `quality` — Opus everywhere except verification
- `balanced` — Opus for planning, Sonnet for execution (default)
- `budget` — Sonnet for writing, Haiku for research/verification

Usage: `/shipit:set-profile budget`

### Utility Commands

**`/shipit:help`**
Show this command reference.

**`/shipit:update`**
Update SHIPIT to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx shipit-cc`

Usage: `/shipit:update`

**`/shipit:join-discord`**
Join the SHIPIT Discord community.

- Get help, share what you're building, stay updated
- Connect with other SHIPIT users

Usage: `/shipit:join-discord`

## Files & Structure

```
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/shipit:new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/shipit:new-project        # Unified flow: questioning → research → requirements → roadmap
/clear
/shipit:plan-phase 1       # Create plans for first phase
/clear
/shipit:execute-phase 1    # Execute all plans in phase
```

**Resuming work after a break:**

```
/shipit:progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/shipit:insert-phase 5 "Critical security fix"
/shipit:plan-phase 5.1
/shipit:execute-phase 5.1
```

**Completing a milestone:**

```
/shipit:complete-milestone 1.0.0
/clear
/shipit:new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/shipit:add-todo                    # Capture from conversation context
/shipit:add-todo Fix modal z-index  # Capture with explicit description
/shipit:check-todos                 # Review and work on todos
/shipit:check-todos api             # Filter by area
```

**Debugging an issue:**

```
/shipit:debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/shipit:debug                                    # Resume from where you left off
```

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/shipit:progress` to check where you're up to
  </reference>
