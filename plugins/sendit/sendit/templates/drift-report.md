# Drift Report: {spec-name}

> Generated: {date}

## Summary

**Spec**: `specs/{spec-name}/SPEC.md`
**Verdict**: {PASS | DRIFT}
**Overall Health**: {ok | N issues}

## Triangle Status

| Edge | Status | Details |
|------|--------|---------|
| Spec → Tests | {ok \| N gaps} | {summary} |
| Tests → Code | {ok \| N failures} | {summary} |
| Code → Spec | {ok \| N drift items} | {summary} |

## Issues

### Critical
<!-- Must fix before merge -->

### Warnings
<!-- Should fix, not blocking -->

### Info
<!-- Minor inconsistencies, fix during cleanup -->

## Drift Items

| Type | Description | Location | Resolution |
|------|-------------|----------|------------|
| {category} | {what drifted} | {file:line} | {suggested fix} |

## Files Reviewed

- {file path} — {role in spec}

## Acceptance Criteria Coverage

| Criterion | Test Coverage | Status |
|-----------|-------------|--------|
| {criterion text} | {test file:line or "none"} | {covered \| gap} |
