# Post-flight Workflow

Validates the work after execution. Light mode: quick test run. Full mode: triangle validation.

## Reference

@~/.claude/plugins/marketplaces/sendit/sendit/references/triangle-validation.md

## Input

- `weight`: light | full
- `spec_path`: Path to relevant SPEC.md (may be null for light/no-spec)
- `changed_files`: List of files modified during execution
- `test_files`: List of test files (from test-writer or executor)

## Process

### Light Post-flight

<step name="light-postflight">

1. Run the test suite:
   ```bash
   npm test 2>&1 || python -m pytest 2>&1 || go test ./... 2>&1
   ```

2. Report results:
   - All pass → "Done. All tests pass."
   - Failures → "Done, but {N} tests failing: {summary}. Want me to fix?"

3. If `specs/INDEX.md` exists, update the relevant entry's health column
4. Delete `specs/{feature}/PROGRESS.md` — flow is complete

</step>

### Full Post-flight

<step name="full-postflight">

1. Spawn spec-enforcer agent in postflight mode:
   ```
   Task(subagent_type="spec-enforcer", prompt="
     MODE: postflight
     SPEC: {spec_path}
     CHANGED_FILES: {changed_files}

     Validate the Spec ↔ Tests ↔ Code triangle.
     Generate a drift report.
     Update the spec's Files and Test Files sections.
     Update INDEX.md health.
   ")
   ```

2. Process the enforcer's result:

   **PASS (no drift)**:
   - Update spec status to IMPLEMENTED (if all criteria met)
   - Update INDEX.md
   - Report to user: "Triangle validated. Spec marked IMPLEMENTED."

   **DRIFT detected**:
   - Show drift report to user
   - For each drift item, offer:
     - Fix it now (update spec or code)
     - Accept it (acknowledge and move on)
     - Defer it (add to OPEN section for later)
   - If CRITICAL drift: must resolve before marking IMPLEMENTED
   - If WARNING/INFO drift: can defer

3. Save drift report (if drift found):
   - Write to `specs/{feature}/DRIFT.md`
   - This persists for future reference

4. Delete `specs/{feature}/PROGRESS.md` — flow is complete

</step>

## Output

```markdown
**Post-flight**: {pass | drift}
**Tests**: {all-pass | N failures}
**Spec status**: {IMPLEMENTED | ACTIVE (drift pending)}
**Drift items**: {0 | N (C critical, W warning, I info)}
```

## Summary to User

After post-flight, provide a concise summary:

```
Done.

**What**: {1-2 sentence summary of changes}
**Tests**: {passing / N failures}
**Spec**: {status} — specs/{feature}/SPEC.md
**Files changed**: {count}
{If drift: "**Drift**: {N items — see specs/{feature}/DRIFT.md}"}
```
