# Spec Engagement Workflow

Collaborative spec refinement. Triggered when specs need work (full mode) or when creating a new spec for a complex feature.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/spec-format.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/gates.md
@~/.claude/plugins/marketplaces/sendit/sendit/references/questioning.md

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
   > b) Full spec — Let's work through the requirements together
   > c) Skip — Work without a spec (light mode only)

2. **Quick spec**: Use reverse-spec approach
   - Scan existing code related to the feature
   - Generate a minimal SPEC.md with status ACTIVE
   - Pre-fill what's obvious, mark unknowns as OPEN
   - If OPEN items exist, ask user to resolve the critical ones

3. **Full spec**: Questioning session (see below)

4. **Skip**: Set a flag that post-flight should skip triangle validation

</step>

### Full Spec Questioning

<step name="questioning">

Triggered when user selects "Full spec" for a new spec, OR when the task is complex (multi-spec child, full weight with no existing spec).

**Follow the questioning guide**: @~/.claude/plugins/marketplaces/sendit/sendit/references/questioning.md

#### Process

1. **Parse what's known.** Extract everything concrete from the user's task description. Don't re-ask things they've already told you.

2. **Identify fuzzy areas.** What's unclear? What has implicit decisions? What scope boundaries are undefined? Generate 2-4 specific areas that need clarification — not generic categories.

3. **Present fuzzy areas to user.** Use AskUserQuestion with multiSelect to let them pick which areas to discuss:
   ```
   AskUserQuestion(
     question: "I have some questions before writing the spec. Which areas should we discuss?",
     options: [
       "{area 1}: {why it's unclear}",
       "{area 2}: {why it's unclear}",
       "{area 3}: {why it's unclear}",
       "All of them"
     ],
     multiSelect: true
   )
   ```

4. **Deep-dive each selected area.** Ask 2-4 targeted questions per area using AskUserQuestion with concrete options. Build on answers — don't follow a script.

5. **Check for scope boundaries.** Before writing the spec, confirm:
   - "What's explicitly NOT in this version?"
   - "Is there anything else I should know?"

6. **Write the spec.** Create `specs/{feature}/SPEC.md` from template, populated with everything gathered. Mark any remaining unknowns as OPEN items.

#### When to Question vs When to Skip

| Situation | Action |
|-----------|--------|
| New spec + full weight | Always question |
| New spec + multi-spec child | Always question (each child gets its own session) |
| New spec + light weight + non-trivial | Quick question (1-2 areas max) |
| New spec + light weight + trivial | Skip (quick spec or skip entirely) |
| Existing spec + OPEN items | Resolve OPEN items only (not full questioning) |

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
