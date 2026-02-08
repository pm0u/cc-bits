---
name: sendit:status
description: Show spec tree health dashboard — status, OPEN items, drift, coverage
allowed-tools:
  - Read
  - Bash
  - Grep
  - Glob
---

# Spec Status Dashboard

Shows the health of the entire spec tree at a glance.

<process>
<step name="gather-status">

### 1. Find All Specs

```bash
find specs -name "SPEC.md" 2>/dev/null | sort
```

If no specs directory exists:
> "No specs yet. Use `/sendit:spec create <name>` to start, or `/sendit:go` to begin working — specs get created as you go."

### 2. Analyze Each Spec

For each SPEC.md found:

1. Read the file
2. Extract:
   - **Status**: DRAFT | ACTIVE | IMPLEMENTED | DEPRECATED
   - **OPEN count**: Number of items in `## OPEN` section (0 if section absent)
   - **Criteria count**: Number of `- [ ]` or `- [x]` items under `## Acceptance Criteria`
   - **Checked criteria**: Number of `- [x]` items (completed)
   - **Has tests**: Whether `## Test Files` section is populated
   - **Has files**: Whether `## Files` section is populated

3. Determine health:
   - `ok` — ACTIVE or IMPLEMENTED, no OPEN, criteria present
   - `N OPEN` — Has unresolved OPEN items
   - `no-criteria` — Missing acceptance criteria
   - `drift` — DRIFT.md exists in the spec directory
   - `stale` — Status is IMPLEMENTED but DRIFT.md has unresolved items

### 3. Display Dashboard

```markdown
## Spec Tree Status

| Spec | Status | Health | Criteria | Notes |
|------|--------|--------|----------|-------|
| auth | ACTIVE | ok | 5/5 | Ready for implementation |
| api | DRAFT | 2 OPEN | 0/3 | Needs spec work |
| ui | IMPLEMENTED | ok | 8/8 | Complete |

### Summary
- **Total specs**: {N}
- **Ready (ACTIVE, healthy)**: {N}
- **Need work**: {N}
- **Implemented**: {N}
- **Drift detected**: {N}
```

### 4. Update INDEX.md

If `specs/INDEX.md` exists, update it with current data.
If it doesn't exist but specs do, offer to create it.

</step>
</process>
