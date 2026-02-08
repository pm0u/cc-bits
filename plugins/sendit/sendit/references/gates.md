# Gates

Gates are checkpoints that block progression until conditions are met. Sendit has two primary gates.

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

## Upgrade Triggers

Not a gate per se, but conditions that cause light→full upgrade mid-flow:

| Trigger | When detected | Action |
|---------|--------------|--------|
| Spec conflict | Pre-flight finds CONFLICT | Switch to full for spec engagement |
| Missing spec | Assessment finds no spec for a non-trivial feature | Offer spec-on-touch or full spec engagement |
| Scope expansion | Execution discovers >3 files need changes | Upgrade remaining stages to full |
| User request | User says "let's think about this" or similar | Upgrade to full spec engagement |
| OPEN items | Spec has unresolved OPEN items | Require resolution before execution |

## Downgrade Triggers

Conditions that allow full→light downgrade:

| Trigger | When detected | Action |
|---------|--------------|--------|
| Clean spec | Assessment finds ACTIVE spec with no OPEN | Can skip spec engagement |
| Small scope | Planner produces ≤3 tasks | Can inline execution instead of agent |
| User override | User says "just do it" | Downgrade all remaining stages |
| Simple change | All changes in single file | Downgrade to inline execution |

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
