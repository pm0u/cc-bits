# Triangle Validation

The Spec ↔ Tests ↔ Code triangle is spek's core verification model. Every feature maintains three artifacts that must stay consistent:

```
        SPEC.md
       /       \
      /         \
   Tests ←────→ Code
```

Each edge represents a contract:

## Edge 1: Spec → Tests

**Contract**: Every testable acceptance criterion in the spec has corresponding test coverage.

**How to check**:
1. Extract acceptance criteria from SPEC.md (lines matching `- [ ]` or `- [x]` under "Acceptance Criteria")
2. For each criterion, identify key verifiable behaviors
3. Search test files for coverage of those behaviors
4. Flag criteria with no apparent test

**Healthy**: Each acceptance criterion maps to at least one test assertion.

**Drift signal**: Acceptance criteria exist with no corresponding tests → tests are lagging behind the spec.

## Edge 2: Tests → Code

**Contract**: All tests pass against the current implementation.

**How to check**:
1. Run the test suite (scoped to relevant tests if possible)
2. All relevant tests should pass
3. No tests should be skipped without documented reason

**Healthy**: All tests green.

**Drift signal**: Tests fail → code is lagging behind the spec (since tests derive from spec).

## Edge 3: Code → Spec

**Contract**: The implementation doesn't exceed or contradict what the spec describes.

**How to check**:
1. Review changed files against spec requirements
2. Look for functionality not described in the spec
3. Check that design decisions recorded in the spec are honored
4. Verify won't-have items are truly absent

**Healthy**: Code implements exactly what the spec describes, no more, no less.

**Drift signal**: Code does things the spec doesn't mention → spec is lagging behind the code.

## Drift Categories

| Category | Meaning | Resolution |
|----------|---------|------------|
| **spec-leads** | Spec describes something code doesn't implement yet | Implement the missing code, or mark spec items as deferred |
| **code-leads** | Code does something the spec doesn't describe | Update spec to include the new behavior, or remove the code |
| **test-gap** | Acceptance criteria have no test coverage | Write tests for uncovered criteria |
| **test-orphan** | Tests exist for behavior not in the spec | Update spec or remove tests |
| **decision-violation** | Code contradicts a recorded design decision | Fix code to match decision, or update decision with rationale |

## Severity Levels

- **CRITICAL**: Acceptance criteria contradicted by implementation. Must fix before merge.
- **WARNING**: Drift detected but not harmful. Should fix, not blocking.
- **INFO**: Minor inconsistencies (e.g., Files section out of date). Fix during postflight.

## Pre-flight vs Post-flight

| Aspect | Pre-flight | Post-flight |
|--------|-----------|-------------|
| When | Before work begins | After implementation |
| Focus | Conflicts with existing spec | Consistency of triangle |
| Checks | Spec→Task compatibility | All three edges |
| Output | CLEAR / CONFLICT | PASS / DRIFT |
| Blocking | CONFLICT blocks execution | CRITICAL drift blocks merge |
