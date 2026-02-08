# Spec Engagement Workflow

Collaborative spec refinement. Only triggered when specs need work (full mode, or upgrade from light).

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/gates.md

## Input

- `task`: The user's request
- `relevant_specs`: List of spec paths
- `spec_on_touch`: Whether we're creating a new spec
- `preflight_issues`: Any issues from pre-flight

## Process

### New Spec (spec-on-touch)

<step name="new-spec">

When no spec exists for the feature being worked on:

1. Ask the user:
   > "There's no spec for {feature}. Want to:"
   > a) Quick spec — I'll generate a minimal spec from what I can see in the codebase
   > b) Full spec — Let's brainstorm the requirements together
   > c) Skip — Work without a spec (light mode only)

2. **Quick spec**: Use reverse-spec approach
   - Scan existing code related to the feature
   - Generate a minimal SPEC.md with status ACTIVE
   - Pre-fill what's obvious, mark unknowns as OPEN
   - If OPEN items exist, ask user to resolve the critical ones

3. **Full spec**: Brainstorm session
   - Create `specs/{feature}/SPEC.md` from template
   - Walk through sections with user (Context → Requirements → Acceptance Criteria)
   - Use Socratic approach: propose, get feedback, refine
   - One section at a time, asking after each

4. **Skip**: Set a flag that post-flight should skip triangle validation

</step>

### Existing Spec with Issues

<step name="fix-spec">

When a spec exists but needs work (DRAFT, has OPEN, missing criteria):

1. Read the current spec
2. Summarize what needs attention:
   - OPEN items that need resolution
   - Missing acceptance criteria
   - Preflight conflicts to resolve
3. Work through each issue with the user:
   - For OPEN items: propose resolutions, ask for approval
   - For missing criteria: suggest criteria based on requirements, ask user to validate
   - For conflicts: present options, let user decide
4. Update SPEC.md with each resolution
5. When all issues resolved, remove OPEN section and set status to ACTIVE

</step>

### Ready Gate Check

<step name="ready-gate">

After spec engagement (or skipped if spec was already clean):

Check the ready gate conditions:
1. No OPEN section (or section is empty)
2. At least one acceptance criterion exists
3. Status is ACTIVE
4. At least one requirement exists

```bash
# Quick check for OPEN items
grep -c "^## OPEN" specs/{feature}/SPEC.md
# Check for acceptance criteria
grep -c "\- \[.\]" specs/{feature}/SPEC.md
```

**If gate passes**: Proceed to test writing (if spec changed) or planning.

**If gate fails**: Report which conditions failed. Ask user:
> "The ready gate failed: {reasons}. Want to:"
> a) Fix these now
> b) Proceed anyway (downgrade to light, skip triangle validation)

</step>

## Output

```markdown
**Spec engagement**: {created | updated | skipped}
**Spec path**: {path}
**Ready gate**: {pass | fail | bypassed}
**Spec changed**: {true | false}
```

Proceed to:
- If spec changed → @~/.claude/plugins/marketplaces/sendit/sendit/workflows/write-tests.md
- If spec unchanged → @~/.claude/plugins/marketplaces/sendit/sendit/workflows/plan.md
