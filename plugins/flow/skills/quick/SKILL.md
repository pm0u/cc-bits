---
name: flow:quick
description: Quick change with spec integrity maintained
argument-hint: "\"<description>\" [spec-path]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# Flow: Quick

Make small changes efficiently while maintaining spec integrity.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/quick.md

## Core Principle

**Test heuristic: If it needs new tests, it needs spec updates.**

Prevents spec drift while keeping quick changes lightweight.

## Usage

```bash
# Auto-detect spec
/flow:quick "Add loading spinner to submit button"

# Specify spec explicitly
/flow:quick "Fix null pointer" specs/auth/middleware/SPEC.md

# Design change
/flow:quick "Change drawer to modal for mobile UX"
```

## When to Use

**Use `/flow:quick` for:**
- ✅ Bug fixes in existing code
- ✅ Small enhancements (1-3 tests)
- ✅ Design tweaks within existing spec
- ✅ Single atomic commit

**Use full flow instead:**
- ❌ New features (no spec exists yet)
- ❌ Complex multi-part work
- ❌ Needs architectural discussion
- ❌ Affects multiple specs

## Process

<process>

### 1. Validate and Find Spec

```bash
DESCRIPTION="$1"
SPEC_PATH="$2"

# If no spec provided, try to infer
if [ -z "$SPEC_PATH" ]; then
  echo "Looking for relevant spec..."
  echo ""

  # Search for keywords in spec names
  # Check recent git history
  # List candidates

  CANDIDATES=$(find_relevant_specs "$DESCRIPTION")

  if [ -z "$CANDIDATES" ]; then
    echo "Error: No spec found"
    echo "Create spec first: /flow:discuss {feature}"
    exit 1
  elif [ $(echo "$CANDIDATES" | wc -l) -gt 1 ]; then
    # Multiple matches - ask user
    echo "Multiple specs found:"
    echo "$CANDIDATES"
    echo ""
    # AskUserQuestion: Which spec?
  else
    SPEC_PATH="$CANDIDATES"
  fi
fi

# Verify spec exists
if [ ! -f "$SPEC_PATH" ]; then
  echo "Error: Spec not found: $SPEC_PATH"
  exit 1
fi

echo "Using spec: $SPEC_PATH"
```

### 2. Analyze Change

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► ANALYZING CHANGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load spec content
SPEC_CONTENT=$(cat "$SPEC_PATH")

# Analyze what type of change this is
# Use haiku for fast analysis
ANALYSIS=$(analyze_change "$DESCRIPTION" "$SPEC_CONTENT")

# Extract analysis fields
CHANGE_TYPE=$(echo "$ANALYSIS" | grep "CHANGE_TYPE:" | cut -d: -f2 | xargs)
NEEDS_NEW_TESTS=$(echo "$ANALYSIS" | grep "NEEDS_NEW_TESTS:" | cut -d: -f2 | xargs)
SPEC_UPDATES=$(echo "$ANALYSIS" | grep "SPEC_UPDATES:" | cut -d: -f2 | xargs)
REASONING=$(echo "$ANALYSIS" | grep "REASONING:" | cut -d: -f2- | xargs)

# Infer what tests would be needed
if [ "$NEEDS_NEW_TESTS" = "yes" ]; then
  INFERRED_TESTS=$(echo "$ANALYSIS" | sed -n '/TESTS:/,/^$/p' | grep '^-')
fi
```

### 3. Present Analysis

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► QUICK CHANGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Change:** {description}
**Spec:** {spec_path}
**Type:** {change_type}

**Analysis:**
{reasoning}

{If needs_new_tests:}
**New tests required:**
{inferred_tests}

{If spec_updates:}
**Spec sections to update:**
{spec_updates}

───────────────────────────────────────────────────────
```

### 4. Decision Gate

```
## ▶ How to Proceed?

Use AskUserQuestion:
- header: "Spec update"
- question: "Should we update the spec for this change?"
- options:
  {If NEEDS_NEW_TESTS = yes:}
  - "Update spec and implement" — Add acceptance criteria (Recommended)
  - "Just implement" — Skip spec update

  {If NEEDS_NEW_TESTS = no:}
  - "Just implement" — No spec update needed (Recommended)
  - "Update spec and implement" — Add to spec anyway

  - "Cancel" — Let me reconsider
```

**Recommendation based on test heuristic:**
- New tests needed → Recommend spec update
- No new tests → Recommend just implement

### 5. Execute Based on Choice

#### Option A: Update Spec and Implement

```bash
if [ "$USER_CHOICE" = "update_spec" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► UPDATING SPEC"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Update relevant sections
  case "$SPEC_UPDATES" in
    *context*)
      echo "Updating Context (Implementation Decisions)..."
      # Update Context section
      ;;
    *requirements*)
      echo "Updating Requirements..."
      # Update Requirements section
      ;;
    *acceptance*)
      echo "Updating Acceptance Criteria..."
      # Update Acceptance Criteria section
      ;;
  esac

  # Commit spec update
  git add "$SPEC_PATH"
  git commit -m "docs(flow): update spec for quick change

Change: $DESCRIPTION
Type: $CHANGE_TYPE
Updated: $SPEC_UPDATES

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

  echo "✓ Spec updated"
fi
```

#### Option B: Just Implement

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► IMPLEMENTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

### 6. Implement Change

```bash
# Load context from spec
CONTEXT=$(sed -n '/^## Context/,/^## /p' "$SPEC_PATH")
REQUIREMENTS=$(sed -n '/^## Requirements/,/^## /p' "$SPEC_PATH")
ACCEPTANCE=$(sed -n '/^## Acceptance Criteria/,/^## /p' "$SPEC_PATH")

# Build implementation prompt
IMPL_PROMPT="<objective>
Implement quick change: $DESCRIPTION

<spec>
$SPEC_CONTENT
</spec>

<instructions>
1. Make the change (keep it focused and minimal)
2. Write tests (especially if spec was updated)
3. Run tests and verify they pass
4. List all files modified

Honor Context decisions, follow Requirements, satisfy Acceptance Criteria.
</instructions>

<output_format>
## IMPLEMENTATION COMPLETE

**Files modified:**
- {file1}
- {file2}

**Tests added/modified:**
- {test1}

**Verification:**
{test results - must be passing}
</output_format>
</objective>"

# Implement using sonnet for quality
echo "Implementing..."
# (Spawn implementation agent or execute inline)
```

### 7. Verify and Commit

```bash
echo ""
echo "Verifying..."

# Run tests
npm test || {
  echo "✗ Tests failed"
  echo ""
  # Offer: Fix | Abort
  exit 1
}

echo "✓ All tests passing"
echo ""

# Commit implementation
git add {modified_files}

COMMIT_MSG="feat(flow): $DESCRIPTION

Quick change implementation
Spec: $SPEC_PATH
Type: $CHANGE_TYPE"

if [ "$USER_CHOICE" = "update_spec" ]; then
  COMMIT_MSG="$COMMIT_MSG
Spec updated: $SPEC_UPDATES"
else
  COMMIT_MSG="$COMMIT_MSG
No spec update (bug fix)"
fi

COMMIT_MSG="$COMMIT_MSG

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git commit -m "$COMMIT_MSG"

echo "✓ Implementation committed"
```

### 8. Update Spec Metadata

```bash
echo ""
echo "Updating spec tracking..."

# Update ## Files section
# Add new files to list

# Update ## Tests section
# Add new tests to list

git add "$SPEC_PATH"
git commit -m "docs(flow): update spec metadata after quick change

Added files/tests to tracking sections

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "✓ Spec metadata updated"
```

### 9. Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► QUICK CHANGE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Change:** {description}
**Type:** {change_type}
**Spec:** {spec_path}

### What Was Done

{If spec updated:}
✓ Spec updated ({sections})

✓ Implementation complete
✓ Tests passing
✓ Spec metadata updated

**Files Modified:**
- {file1}
- {file2}

**Commits:** {2 or 3}

───────────────────────────────────────────────────────
```

</process>

## Examples

### Bug Fix (No Spec Update)

```bash
/flow:quick "Fix null pointer in auth middleware"
```

**Analysis:** Bug fix, no new tests needed
**Recommendation:** Just implement
**Result:** 2 commits (impl + metadata)

### Enhancement (Needs Spec Update)

```bash
/flow:quick "Add loading spinner to submit button"
```

**Analysis:** Enhancement, new test needed
**Recommendation:** Update spec and implement
**Result:** 3 commits (spec + impl + metadata)

### Design Change (Needs Spec Update)

```bash
/flow:quick "Change drawer to modal for mobile UX"
```

**Analysis:** Design change, modifies behavior
**Recommendation:** Update spec (Context) and implement
**Result:** 3 commits (spec + impl + metadata)

## Quality Gates

Before completing:
- [ ] Spec found and validated
- [ ] Change analyzed (type + test needs)
- [ ] User approved spec update decision
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Commits created
- [ ] Spec metadata updated

## Success Criteria

- [ ] No spec drift (spec stays source of truth)
- [ ] Lightweight (no discussion/planning ceremony)
- [ ] Smart recommendations (test heuristic)
- [ ] User has final say
- [ ] Atomic commits with clear messages
- [ ] Spec Files/Tests sections kept current
