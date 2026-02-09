---
name: spek:go
description: Spec-driven development workflow - create SPEC.md, validate triangle, execute with atomic commits
argument-hint: '"feature description"'
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---

# Spek: Go (Spec-Driven)

Single entry point for spec-driven development. Creates/updates SPEC.md, validates the spec ↔ tests ↔ code triangle, executes with full spek orchestration.

## References

@~/.claude/plugins/marketplaces/spek/spek/references/spec-format.md
@~/.claude/plugins/marketplaces/spek/spek/references/triangle-validation.md

## Core Principle

**The spec triangle drives everything:**

```
        SPEC.md
       /       \
      /         \
   Tests ←────→ Code
```

- SPEC.md defines behavior (acceptance criteria)
- Tests verify the spec
- Code implements to pass tests
- Triangle must stay consistent

## Process

<process>

### 1. Quick Assessment

```bash
TASK_DESC="$1"

# Check if specs directory exists
if [ ! -d "specs" ]; then
  mkdir -p specs
  echo "Created specs/ directory"
fi

# Extract feature name from description (simple heuristic)
# User can provide "auth" or "add authentication" or "auth/oauth"
FEATURE=$(echo "$TASK_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9\/]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► Spec-Driven Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Feature: $FEATURE"
echo "Task: $TASK_DESC"
echo ""

# Check if spec exists
SPEC_PATH="specs/${FEATURE}/SPEC.md"
SPEC_EXISTS=false

if [ -f "$SPEC_PATH" ]; then
  SPEC_EXISTS=true
  STATUS=$(grep "^status:" "$SPEC_PATH" | awk '{print $2}')
  echo "Spec exists: $SPEC_PATH (status: $STATUS)"
else
  echo "New spec: will create $SPEC_PATH"
fi

echo ""
```

### 2. Preflight Check

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PREFLIGHT: Checking for conflicts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

Task(
  prompt="Run preflight check for feature: $FEATURE

TASK: $TASK_DESC
SPEC_PATH: $SPEC_PATH
SPEC_EXISTS: $SPEC_EXISTS

<instructions>
Check for conflicts with existing specs or OPEN items.

If spec exists:
- Read $SPEC_PATH
- Check for OPEN items
- Check if task conflicts with existing requirements or decisions

If spec doesn't exist:
- Check for related specs in specs/ directory
- Flag potential conflicts

Return:
## PREFLIGHT CLEAR
(if no conflicts)

OR

## PREFLIGHT CONFLICT
**Issue:** {description}
**Resolution:** {what needs to happen}
</instructions>
",
  subagent_type="spek:spec-enforcer",
  model="sonnet",
  description="Preflight check for $FEATURE"
)

```bash
# Check preflight result
if grep -q "## PREFLIGHT CONFLICT" <<< "$PREFLIGHT_OUTPUT"; then
  echo "✗ Conflicts detected"
  echo ""
  echo "$PREFLIGHT_OUTPUT"
  echo ""
  echo "Resolve conflicts before continuing"
  exit 1
fi

echo "✓ Preflight clear - no conflicts"
echo ""
```

### 3. Spec Engagement

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEC: Creating/updating SPEC.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ensure feature directory exists
mkdir -p "specs/${FEATURE}"

if [ "$SPEC_EXISTS" = "false" ]; then
  # Create new spec from template
  TEMPLATE=$(cat ~/.claude/plugins/marketplaces/spek/spek/templates/spec.md)

  # Simple template substitution
  echo "$TEMPLATE" | sed "s/{Feature Name}/${FEATURE}/g" > "$SPEC_PATH"

  echo "Created $SPEC_PATH from template"
  echo ""
  echo "TODO: Fill in SPEC.md with:"
  echo "  - Requirements (must-have, should-have, won't-have)"
  echo "  - Acceptance Criteria (testable conditions)"
  echo "  - Design Decisions (constraints and choices)"
  echo ""
  echo "For MVP, adding basic structure based on task..."
  echo ""

  # Add basic requirement from task description
  cat >> "$SPEC_PATH" <<EOF

## Requirements

### Must Have
- [ ] ${TASK_DESC}

## Acceptance Criteria

- [ ] Implementation complete and tested
- [ ] No regressions in existing functionality

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| (to be filled) | (to be filled) | (to be filled) |
EOF

  echo "✓ Basic SPEC.md created"
  SPEC_CHANGED=true
else
  echo "Spec exists - keeping current version"
  echo "(Manual updates can be made before execution)"
  SPEC_CHANGED=false
fi

echo ""
```

### 4. Write Tests

```bash
if [ "$SPEC_CHANGED" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " TESTS: Deriving from acceptance criteria"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
```

Task(
  prompt="Write tests for feature: $FEATURE

SPEC: specs/${FEATURE}/SPEC.md

<instructions>
Read the spec and write failing tests for the acceptance criteria.

1. Read SPEC.md acceptance criteria
2. Determine test file location (follow project conventions)
3. Write tests that verify each criterion
4. Tests should FAIL initially (code doesn't exist yet)
5. Follow project testing framework (Jest, Vitest, pytest, etc.)

Return:
## TESTS WRITTEN
**Files:** {list of test files created}
**Tests:** {count} tests for {count} criteria
**Status:** RED (tests fail - expected before implementation)
</instructions>
",
  subagent_type="spek:test-writer",
  model="sonnet",
  description="Write tests for $FEATURE"
)

```bash
  echo "✓ Tests written"
  echo ""
else
  echo "Skipping test writing (spec unchanged)"
  echo ""
fi
```

### 5. Planning

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PLAN: Breaking down into tasks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load spec content for planner
SPEC_CONTENT=$(cat "specs/${FEATURE}/SPEC.md")
```

Task(
  prompt="Create implementation plan for feature: $FEATURE

<spec>
$SPEC_CONTENT
</spec>

<instructions>
Break down the spec into executable tasks.

1. Read SPEC.md requirements and acceptance criteria
2. Create 3-8 tasks that deliver all requirements
3. Each task should have clear actions and verification criteria
4. Consider dependencies and ordering
5. Write PLAN.md to specs/${FEATURE}/PLAN.md

Use the SPEK plan format (same as current spek/fuckit plans).

Return:
## PLANNING COMPLETE
**Plan:** specs/${FEATURE}/PLAN.md
**Tasks:** {N} tasks
</instructions>
",
  subagent_type="spek:planner",
  model="opus",
  description="Plan $FEATURE"
)

```bash
echo "✓ Plan created"
echo ""
```

### 6. Execution

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " EXECUTE: Implementing tasks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Reuse existing spek:execute-phase logic (or create simplified version)
# For MVP, just call the existing executor

echo "Delegating to spek executor..."
echo ""
echo "Note: For MVP, manually call /spek:execute-phase with the plan"
echo "      Full integration coming in next version"
echo ""

# TODO: Full integration - spawn spek:executor for each task
# For now, user can manually run /spek:execute-phase
```

### 7. Postflight

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " POSTFLIGHT: Validating triangle"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

Task(
  prompt="Validate spec triangle for feature: $FEATURE

SPEC: specs/${FEATURE}/SPEC.md
MODE: postflight

<instructions>
Validate the spec ↔ tests ↔ code triangle.

Check three edges:
1. Spec → Tests: Every acceptance criterion has test coverage
2. Tests → Code: All tests pass
3. Code → Spec: Implementation matches spec (no more, no less)

Return:
## POSTFLIGHT PASS
(if triangle is valid)

OR

## POSTFLIGHT DRIFT
**Drift type:** {spec-leads | code-leads | test-gap}
**Severity:** {CRITICAL | WARNING | INFO}
**Details:** {description}
</instructions>
",
  subagent_type="spek:spec-enforcer",
  model="sonnet",
  description="Postflight validation for $FEATURE"
)

```bash
if grep -q "## POSTFLIGHT PASS" <<< "$POSTFLIGHT_OUTPUT"; then
  echo "✓ Triangle validated - spec ↔ tests ↔ code consistent"
else
  echo "⚠ Drift detected"
  echo ""
  echo "$POSTFLIGHT_OUTPUT"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SPEK ► Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

</process>

## MVP Limitations

This is a simplified first version. Current limitations:

1. **No multi-spec trees** - Single spec only
2. **No complex assessment** - Simple feature name extraction
3. **Manual execution bridge** - Must call /spek:execute-phase manually (for now)
4. **Basic spec creation** - Template-based, no questioning session
5. **No research step** - Coming in next version

## What Works

✓ Spec triangle validation (preflight + postflight)
✓ Test derivation from acceptance criteria
✓ Planning from spec
✓ Reuses proven spek/fuckit orchestration

## Next Steps

After testing MVP:
- Integrate execution (remove manual step)
- Add questioning for spec creation
- Add multi-spec support
- Add research workflow
- Add complexity assessment
