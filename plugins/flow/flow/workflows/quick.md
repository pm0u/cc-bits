# Quick Change Workflow

Lightweight workflow for small changes that maintains spec integrity without full ceremony.

## Purpose

Handle small changes efficiently while preventing spec drift:
- Bug fixes that match existing spec
- Small enhancements to existing features
- Design tweaks within existing specs

**Key principle:** If it needs new tests, it needs spec updates.

## When to Use

**Use `/flow:quick`:**
- Small change to existing spec
- Single atomic commit
- Clear what needs to be done
- 1-3 test cases max

**Use full flow instead:**
- New feature (no spec exists)
- Complex multi-part work
- Needs deep discussion
- Affects multiple specs

## Inputs

- `description` - What to change (e.g., "Add loading spinner to submit button")
- Optional: `spec` - Which spec to update (auto-detected if not provided)

## Outputs

- SPEC.md updated (if needed)
- Code implemented
- Tests written
- Atomic commit
- Files/Tests sections updated

## Process

### 1. Find Relevant Spec

```bash
DESCRIPTION="$1"
SPEC_PATH="$2"  # Optional

# If no spec provided, try to infer
if [ -z "$SPEC_PATH" ]; then
  # Look for keywords in description
  # Check recent git history
  # List available specs

  # If ambiguous, ask user
  if [ ${#CANDIDATES[@]} -gt 1 ]; then
    # AskUserQuestion: Which spec?
  fi
fi

# Verify spec exists
if [ ! -f "$SPEC_PATH" ]; then
  echo "Error: Spec not found: $SPEC_PATH"
  echo "Create spec first: /flow:discuss {feature}"
  exit 1
fi
```

**Can't create new specs with quick mode** - must use `/flow:discuss` for that.

### 2. Analyze Change Type

Read existing SPEC.md and analyze the requested change:

```bash
SPEC_CONTENT=$(cat "$SPEC_PATH")

# Extract key sections
REQUIREMENTS=$(sed -n '/^## Requirements/,/^## /p' "$SPEC_PATH")
ACCEPTANCE=$(sed -n '/^## Acceptance Criteria/,/^## /p' "$SPEC_PATH")
CONTEXT=$(sed -n '/^## Context/,/^## /p' "$SPEC_PATH")

# Analyze change
ANALYSIS_PROMPT="
Analyze this change request:
\"$DESCRIPTION\"

Against existing spec:
$SPEC_CONTENT

Determine:
1. What type of change is this?
   - Bug fix (code doesn't match spec)
   - Enhancement (new behavior)
   - Design change (modifying decisions)

2. Will this require new tests?
   - YES: New observable behavior, new acceptance criteria
   - NO: Fixing existing behavior to match spec

3. What spec sections need updates?
   - Context (if changing decisions)
   - Requirements (if adding new requirements)
   - Acceptance Criteria (if new observable behavior)
   - None (if pure bug fix)

Return format:
CHANGE_TYPE: {bug_fix|enhancement|design_change}
NEEDS_NEW_TESTS: {yes|no}
SPEC_UPDATES: {context|requirements|acceptance|none}
REASONING: {brief explanation}
"

# Get analysis (using small fast model)
ANALYSIS=$(echo "$ANALYSIS_PROMPT" | analyze_with_llm)

CHANGE_TYPE=$(echo "$ANALYSIS" | grep "CHANGE_TYPE:" | cut -d: -f2 | xargs)
NEEDS_NEW_TESTS=$(echo "$ANALYSIS" | grep "NEEDS_NEW_TESTS:" | cut -d: -f2 | xargs)
SPEC_UPDATES=$(echo "$ANALYSIS" | grep "SPEC_UPDATES:" | cut -d: -f2 | xargs)
REASONING=$(echo "$ANALYSIS" | grep "REASONING:" | cut -d: -f2- | xargs)
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

{If NEEDS_NEW_TESTS = yes:}
**New tests required:**
- {inferred test 1}
- {inferred test 2}

{If SPEC_UPDATES != none:}
**Spec sections to update:**
- {sections}
```

### 4. Decision Gate

Based on heuristic, recommend action:

```
## ▶ How to Proceed?

Use AskUserQuestion:
- header: "Spec update"
- question: "Should we update the spec for this change?"
- options:
  {If NEEDS_NEW_TESTS = yes:}
  - "Update spec and implement" — Add acceptance criteria and implement (Recommended)
  - "Just implement" — Skip spec update (use for bug fixes only)

  {If NEEDS_NEW_TESTS = no:}
  - "Just implement" — No spec update needed (Recommended)
  - "Update spec and implement" — Add to spec anyway

  - "Cancel" — Let me reconsider this change
```

**Recommendation logic:**
- New tests needed → Recommend "Update spec and implement"
- No new tests → Recommend "Just implement"

### 5. Update Spec (If Chosen)

```bash
if [ "$USER_CHOICE" = "update_spec" ]; then
  echo ""
  echo "Updating spec..."
  echo ""

  # Build update prompt
  UPDATE_PROMPT="
Update this SPEC.md to incorporate the change:

Change: $DESCRIPTION
Type: $CHANGE_TYPE
Sections to update: $SPEC_UPDATES

Current spec:
$SPEC_CONTENT

Instructions:
1. Add new requirements if needed
2. Add new acceptance criteria (tests)
3. Update Context if changing decisions
4. Keep existing structure
5. Don't remove anything

Return the updated SPEC.md sections that changed.
"

  # Get updates
  UPDATES=$(echo "$UPDATE_PROMPT" | generate_with_llm)

  # Apply updates to SPEC.md
  # (Use Edit tool to update specific sections)

  # Commit spec update
  git add "$SPEC_PATH"
  git commit -m "docs(flow): update spec for quick change

Change: $DESCRIPTION
Type: $CHANGE_TYPE
Updated: $SPEC_UPDATES

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
fi
```

### 6. Implement Change

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► IMPLEMENTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Build implementation prompt
IMPL_PROMPT="
Implement this change:

Description: $DESCRIPTION
Spec: $SPEC_PATH

Context from spec:
$(cat "$SPEC_PATH")

Instructions:
1. Implement the change
2. Write tests (especially if spec was updated)
3. Verify tests pass
4. List files modified

Keep it minimal - single focused change.

Return format:
## IMPLEMENTATION COMPLETE

**Files modified:**
- {file1}
- {file2}

**Tests added:**
- {test1}
- {test2}

**Verification:**
{test results}
"

# Implement (using sonnet for code quality)
IMPL_RESULT=$(echo "$IMPL_PROMPT" | implement_with_llm)
```

### 7. Verify and Commit

```bash
# Extract modified files
FILES=$(echo "$IMPL_RESULT" | sed -n '/\*\*Files modified:\*\*/,/\*\*/p' | grep '^-' | sed 's/^- //')

# Run tests
echo "Running tests..."
npm test || {
  echo "✗ Tests failed"
  # Offer: Fix | Abort
  exit 1
}

echo "✓ Tests passing"

# Commit implementation
git add $FILES

git commit -m "feat(flow): $DESCRIPTION

Quick change implementation
Spec: $SPEC_PATH
Type: $CHANGE_TYPE
$([ "$USER_CHOICE" = "update_spec" ] && echo "Spec updated: $SPEC_UPDATES" || echo "No spec update (bug fix)")

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 8. Update Spec Metadata

```bash
# Update Files and Tests sections in SPEC.md
echo ""
echo "Updating spec metadata..."

# Extract current files and tests
IMPL_FILES=$(echo "$IMPL_RESULT" | sed -n '/\*\*Files modified:\*\*/,/\*\*/p' | grep '^-' | sed 's/^- //')
IMPL_TESTS=$(echo "$IMPL_RESULT" | sed -n '/\*\*Tests added:\*\*/,/\*\*/p' | grep '^-' | sed 's/^- //')

# Update SPEC.md sections
# (Use Edit tool to add to ## Files and ## Tests sections)

# Commit metadata update
git add "$SPEC_PATH"
git commit -m "docs(flow): update spec metadata after quick change

Added files and tests to spec tracking

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
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
**Spec Updated:**
- Added to {sections}

**Implementation:**
- {summary}

**Files Modified:**
- {file1}
- {file2}

**Tests:** {N} added, all passing ✓

**Commits:** {2 or 3} (spec update + implementation + metadata)

───────────────────────────────────────────────────────
```

## Decision Tree

```
User: /flow:quick "description"
  ↓
Find relevant spec
  ↓
Analyze change
  ↓
Does it need new tests?
  ↓
├─ YES (new behavior)
│   ↓
│   Recommend: Update spec
│   Present gate → User chooses
│   ↓
│   Update spec (if chosen)
│   Implement + tests
│   Update metadata
│   ✓ Done
│
└─ NO (bug fix)
    ↓
    Recommend: Just implement
    Present gate → User chooses
    ↓
    (Optionally update spec)
    Implement
    Update metadata
    ✓ Done
```

## Examples

### Example 1: Enhancement (Needs Spec Update)

```bash
/flow:quick "Add loading spinner to submit button"
```

**Analysis:**
- Type: Enhancement
- New tests: YES ("Button shows spinner while submitting")
- Spec updates: Acceptance Criteria

**Recommendation:** Update spec and implement

**Result:**
1. Spec updated with new acceptance criterion
2. Loading spinner implemented
3. Test added
4. 3 commits (spec + impl + metadata)

### Example 2: Bug Fix (No Spec Update)

```bash
/flow:quick "Fix null pointer in auth middleware"
```

**Analysis:**
- Type: Bug fix
- New tests: NO (spec already covers this)
- Spec updates: None

**Recommendation:** Just implement

**Result:**
1. Bug fixed
2. Existing test now passes
3. 2 commits (impl + metadata)

### Example 3: Design Change (Needs Spec Update)

```bash
/flow:quick "Change drawer to modal for better mobile UX"
```

**Analysis:**
- Type: Design change
- New tests: YES (modal behavior differs from drawer)
- Spec updates: Context (Implementation Decision), Acceptance Criteria

**Recommendation:** Update spec and implement

**Result:**
1. Spec Context updated (decision changed)
2. New acceptance criteria for modal
3. Modal implemented
4. Tests updated/added
5. 3 commits (spec + impl + metadata)

## Edge Cases

### No Spec Found

```
Error: No spec found for this area
Create spec first: /flow:discuss {feature}
```

Quick mode requires existing spec - can't create new ones.

### Ambiguous Spec

```
Multiple specs might be relevant:
- specs/auth/ui/SPEC.md
- specs/profile/ui/SPEC.md

Which spec should be updated?
[present options]
```

### Change Too Complex

If analysis detects:
- Affects multiple specs
- Requires architectural decisions
- More than 3 test cases

```
⚠ This change seems complex for quick mode

Recommendation: Use full flow
  /flow:discuss {feature}

Or continue with quick mode anyway? (not recommended)
```

## Quality Gates

Before QUICK CHANGE COMPLETE:
- [ ] Spec exists and was loaded
- [ ] Change analyzed (type determined)
- [ ] User approved spec update decision
- [ ] Implementation complete
- [ ] Tests written (if new behavior)
- [ ] Tests passing
- [ ] Spec metadata updated (Files/Tests)
- [ ] Atomic commits created

## Success Criteria

- [ ] Maintains spec as source of truth
- [ ] Prevents spec drift
- [ ] Lightweight (no deep discussion/planning)
- [ ] Uses test heuristic for smart recommendations
- [ ] User has final say on spec updates
- [ ] Atomic commits with proper messages
- [ ] Updates spec metadata (Files/Tests)
