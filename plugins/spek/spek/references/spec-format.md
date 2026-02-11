# Spec Format Standard

Everything in spek revolves around specs. This document defines the canonical formats for SPEC.md files and INDEX.md files.

## Spec Tree Structure

```
specs/
├── INDEX.md                    # Root index — lists all specs, health summary
├── GLOBAL.md                   # (optional) Project-wide constraints and standards
├── auth/
│   ├── SPEC.md                 # Auth feature spec
│   ├── PLAN.md                 # (created during full planning)
│   ├── PROGRESS.md             # (created during execution, tracks flow state)
│   └── INDEX.md                # (optional) Sub-index if auth has children
├── auth/oauth/
│   └── SPEC.md                 # OAuth sub-spec (split from auth)
├── api/
│   ├── SPEC.md
│   └── endpoints/
│       ├── SPEC.md             # Endpoints sub-spec
│       └── INDEX.md
└── ui/
    └── SPEC.md
```

**Key rules:**
- Specs live in `specs/` at project root (created on first use)
- Each feature gets a directory with a `SPEC.md`
- Specs can nest arbitrarily deep
- INDEX.md files are optional per-directory but required at root
- The spec tree grows organically — no upfront planning required

## GLOBAL.md

An optional file at `specs/GLOBAL.md` for project-wide constraints that apply to ALL features. Same format as SPEC.md but scoped differently:

- No Status field (always active)
- No OPEN section (constraints are always enforced)
- Requirements are project-wide standards (accessibility, performance, conventions)
- Acceptance criteria are universal invariants

```markdown
# Project Standards

> Project-wide constraints that apply to all features.

## Context

{Why these standards exist. Link to style guides, compliance requirements, etc.}

## Requirements

### Must Have
- [ ] All endpoints return JSON with consistent error format
- [ ] WCAG AA compliance on all UI components
- [ ] TypeScript strict mode — no `any` types

### Won't Have
- jQuery or other legacy DOM libraries

## Acceptance Criteria

- [ ] No accessibility violations reported by automated tooling
- [ ] All API responses under 500ms at p95
- [ ] Zero TypeScript errors with strict: true

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CSS approach | Tailwind | Team familiarity, consistency |
```

**Usage in the flow:**
- The spec-enforcer ALWAYS checks GLOBAL.md during preflight (in addition to feature specs)
- Postflight validates global constraints weren't violated
- Assessment includes GLOBAL.md in `relevant_specs` when it exists

## PROGRESS.md

A lightweight state file at `specs/{feature}/PROGRESS.md` that tracks flow position for session recovery. Created at the start of execution, deleted on completion.

```markdown
# Progress: {Feature Name}

**Started**: {timestamp}
**Weight**: {light | full}
**Current step**: {assess | preflight | spec-engagement | write-tests | plan | execute | postflight}

## Assessment

- Weight: {light | full}
- Reason: {one-line}
- Relevant specs: {paths}
- Spec-on-touch: {true | false}

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | {description} | {pending \| done \| failed} | {hash or —} |
| 2 | {description} | {pending \| done \| failed} | {hash or —} |
```

**Lifecycle:**
- Created when execution begins (after planning)
- Updated after each task completes
- Deleted on successful postflight completion
- If present at session start → resume from recorded state

**On resume:**
1. `/spek:go` detects `specs/{feature}/PROGRESS.md`
2. Reads current step and task status
3. Skips completed steps, resumes from current step
4. For execution: skips completed tasks, resumes from first pending task

## SPEC.md Format

```markdown
# {Feature Name}

> One-line summary of what this feature does.

## Status

{DRAFT | ACTIVE | IMPLEMENTED | DEPRECATED}

## Context

Why this feature exists. What problem it solves. Links to external docs, PRDs, or discussions if relevant.

## Requirements

### Must Have
- [ ] Requirement 1
- [ ] Requirement 2

### Should Have
- [ ] Requirement 3

### Won't Have (this iteration)
- Explicitly out of scope item

## Acceptance Criteria

Concrete, testable conditions that prove the feature works:

- [ ] Given X, when Y, then Z
- [ ] Given A, when B, then C

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| {what}   | {pick} | {why}     |

## OPEN

<!-- Items that need resolution before this spec is "ready" -->
<!-- Remove this section entirely when all items are resolved -->

- [ ] {Unresolved question or decision}
- [ ] {Another open item}

## Dependencies

- `specs/other-feature` — {why this depends on it}

## Files

<!-- Key files that implement this spec. Updated by postflight. -->

- `src/path/to/file.ts` — {what it does for this spec}

## Test Files

<!-- Test files that verify this spec. Updated by postflight. -->

- `tests/path/to/test.ts` — {what it tests}
```

### Section Rules

| Section | Required | Notes |
|---------|----------|-------|
| Feature Name (h1) | Yes | Must match directory name (kebab-to-title) |
| Summary (blockquote) | Yes | One line, no period |
| Status | Yes | One of: DRAFT, ACTIVE, IMPLEMENTED, DEPRECATED |
| Context | Yes | Can be brief for small features |
| Requirements | Yes | MoSCoW: Must/Should/Won't Have |
| Acceptance Criteria | Yes | Given/When/Then or equivalent testable format |
| Design Decisions | No | Add when non-obvious choices are made |
| OPEN | No | Present only when unresolved items exist. **Ready gate blocks on OPEN.** |
| Dependencies | No | Add when spec depends on other specs |
| Files | No | Populated/updated by postflight automation |
| Test Files | No | Populated/updated by postflight automation |

### OPEN Section

The OPEN section is critical for the ready gate:

- **Present + non-empty** = spec is NOT ready for implementation
- **Absent or empty** = spec IS ready (passes ready gate)
- Items should be actionable questions or decisions, not vague concerns
- When an OPEN item is resolved, update the relevant spec section and remove the OPEN item
- When all OPEN items are resolved, delete the entire OPEN section

### Status Transitions

```
DRAFT → ACTIVE → IMPLEMENTED → DEPRECATED
  ↑        |
  └────────┘  (revisions send back to DRAFT)
```

- **DRAFT**: Being written or revised. Has OPEN items or incomplete acceptance criteria.
- **ACTIVE**: Ready for implementation. No OPEN items. All acceptance criteria present.
- **IMPLEMENTED**: All acceptance criteria pass. Files and Test Files populated.
- **DEPRECATED**: No longer relevant. Keep for historical context.

## INDEX.md Format

```markdown
# Spec Index

> Last updated: {date}

## Overview

| Spec | Status | Health | Summary |
|------|--------|--------|---------|
| [auth](auth/SPEC.md) | ACTIVE | ok | User authentication and session management |
| [api](api/SPEC.md) | DRAFT | 2 OPEN | REST API design and endpoints |
| [ui](ui/SPEC.md) | IMPLEMENTED | ok | Core UI components |

## Tree

specs/
├── auth/ (ACTIVE)
│   └── oauth/ (DRAFT)
├── api/ (DRAFT)
│   └── endpoints/ (ACTIVE)
└── ui/ (IMPLEMENTED)
```

### Health Values

- **ok** — No OPEN items, acceptance criteria present
- **N OPEN** — Has N unresolved OPEN items
- **no-criteria** — Missing acceptance criteria
- **drift** — Code has diverged from spec (detected by postflight)

## Spec-on-Touch Adoption

For existing codebases without specs:

1. User works on feature X → `/spek:go "modify feature X"`
2. Spek checks `specs/X/SPEC.md` — doesn't exist
3. Options:
   a. **Quick spec**: Generate minimal spec from existing code via reverse-spec, then proceed
   b. **Full spec**: Brainstorm session to write proper spec first
   c. **Skip**: Work without spec (light mode only, no triangle validation)
4. The spec tree grows one feature at a time — no big-bang adoption

## Splitting Specs

When a spec grows too large (>200 lines of requirements or >10 acceptance criteria):

1. Identify natural boundaries (usually around sub-features or layers)
2. Create subdirectory with new SPEC.md
3. Move relevant sections from parent to child
4. Parent SPEC.md adds dependency reference to child
5. Update INDEX.md to reflect new structure

The `/spek:spec split` command automates this.
