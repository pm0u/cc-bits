# Gates

Gates are checkpoints that block progression until conditions are met. Sendit has four gate types.

## Scope Gate

**When**: Layer 0 of assessment, before weight determination.

**Purpose**: Prevent monolithic specs that are too large to implement well.

**Triggers** (ANY activates):

| Signal | Detection |
|--------|-----------|
| Multiple pages/views/screens | Parse task description for page/view/screen language |
| Multiple independent features | Task mentions >1 distinct feature |
| "Build an app/site/system" | Whole-application language |
| Multiple data domains | >2 unrelated entity types |
| >5 unrelated acceptance criteria | Criteria span multiple concerns |
| Reference architecture with >3 layers | auth + data + components + pages + middleware etc. |

**When it triggers**:
1. Propose a spec tree to the user
2. Get approval on the split
3. Create parent + child specs
4. Route each child through the pipeline independently

**Bypass**: User explicitly says "keep it as one spec" — but warn that this may cause kickbacks during planning.

## Ready Gate

**When**: Before execution begins (end of spec engagement, or before planning in full mode).

**Purpose**: Ensure the spec is complete enough to implement against.

**Conditions (ALL must pass)**:

| Check | Rule |
|-------|------|
| No OPEN section | The `## OPEN` section must be absent or empty |
| Acceptance criteria present | At least one `- [ ]` item under `## Acceptance Criteria` |
| Status is ACTIVE | Spec status must be `ACTIVE` (not DRAFT, IMPLEMENTED, or DEPRECATED) |
| Requirements present | At least one item under `## Requirements` |

**When it fails**:
- Tell the user which conditions failed
- Offer to resolve them now (spec engagement) or proceed anyway (downgrade to light)
- If user proceeds without ready gate, post-flight will flag incomplete triangle

**Bypass**: The ready gate only applies in full mode. Light mode skips it entirely.

## Kickback Protocol

**When**: During planning or execution, an agent determines the task is too complex for the current mode.

**Purpose**: Prevent agents from silently producing poor-quality work on tasks that exceed their scope.

### How It Works

Agents (planner, executor) perform an **early complexity check** before doing significant work. If complexity exceeds thresholds, they return a KICKBACK instead of attempting the work.

### KICKBACK Response Format

```json
{
  "status": "KICKBACK",
  "reason": "description of why this is too complex",
  "signal": "too_many_tasks | scope_creep | missing_context | needs_split | needs_research",
  "details": "specific observations",
  "recommendation": "what the orchestrator should do"
}
```

### Kickback Signals

| Signal | Who detects | Threshold | Recommendation |
|--------|------------|-----------|----------------|
| `too_many_tasks` | Planner | >8 tasks needed | Split the spec |
| `scope_creep` | Executor | Task touches >5 files or >3 unrelated concerns | Upgrade to full, possibly split |
| `missing_context` | Executor | Can't implement without decisions not in spec | Return to spec engagement |
| `needs_split` | Planner | Multiple unrelated acceptance criteria | Split the spec |
| `needs_research` | Planner/Executor | Unfamiliar library, API, or pattern | Spawn researcher first |
| `spec_incomplete` | Planner | Spec lacks requirements or criteria for the task | Return to spec engagement |

### Orchestrator Handling

When the orchestrator receives a KICKBACK:

1. **Report to user**: "The {agent} flagged this as too complex: {reason}"
2. **Route by signal**:
   - `too_many_tasks` or `needs_split` → Propose spec split, re-run assessment
   - `scope_creep` → Upgrade remaining stages to full
   - `missing_context` or `spec_incomplete` → Return to spec engagement
   - `needs_research` → Spawn researcher, then re-run planning
3. **Never ignore**: A KICKBACK always pauses the flow. The orchestrator does NOT retry the same agent with the same input.

## Post-flight Gate

**When**: After execution, before marking spec as IMPLEMENTED.

**Purpose**: Ensure the triangle is consistent.

**Conditions (in full mode)**:

| Check | Rule |
|-------|------|
| Tests pass | All tests must be green |
| Coverage | Each acceptance criterion has test coverage |
| No critical drift | No CRITICAL drift items in the drift report |
| Files updated | SPEC.md Files and Test Files sections are current |

**When it fails**:
- Report specific failures
- Offer to fix (re-run execution for failures, update spec for drift)
- If unfixable, leave spec as ACTIVE (not IMPLEMENTED) with drift notes

**In light mode**: Post-flight only checks that tests pass. Full triangle validation is skipped.

## Upgrade Triggers

Conditions that cause light→full upgrade mid-flow:

| Trigger | When detected | Action |
|---------|--------------|--------|
| Agent KICKBACK | Any agent returns KICKBACK | Route by signal (see above) |
| Spec conflict | Pre-flight finds CONFLICT | Switch to full for spec engagement |
| Missing spec | Assessment finds no spec for a non-trivial feature | Offer spec-on-touch or full spec engagement |
| User request | User says "let's think about this" or similar | Upgrade to full spec engagement |
| OPEN items | Spec has unresolved OPEN items | Require resolution before execution |

## Downgrade Triggers

Conditions that allow full→light downgrade:

| Trigger | When detected | Action |
|---------|--------------|--------|
| Clean spec | Assessment finds ACTIVE spec with no OPEN | Can skip spec engagement |
| Small scope | Planner produces ≤3 tasks | Can use lighter executor prompts |
| User override | User says "just do it" | Downgrade all remaining stages |
