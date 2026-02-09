# Derive Spec Workflow

Create SPEC.md from existing code through collaborative analysis.

## Purpose

Document existing code that was built outside the Flow workflow:
- Legacy code without documentation
- Quick implementations that need formalization
- Third-party code being integrated
- Code built before Flow was adopted

**Key principle:** Code shows "what", user + git history shows "why".

## When to Use

**Use `/flow:derive-spec`:**
- Code exists, no spec
- Want to bring existing code into Flow workflow
- Need to document what's already built
- Creating parent spec for existing children

**Use `/flow:discuss` instead:**
- No code exists yet
- Planning new feature
- Clean slate implementation

## Inputs

- `path` - File path or directory to analyze (e.g., `src/auth/session.ts`)
- Optional: `spec_path` - Where to create SPEC.md (auto-inferred if not provided)

## Outputs

- SPEC.md created with `status: IMPLEMENTED`
- Context section filled (from git history + user input)
- Requirements section filled (from code behavior)
- Acceptance Criteria (from tests)
- Files/Tests sections populated
- Ready for Flow workflow integration

## Process

### 1. Validate Input Path

```bash
CODE_PATH="$1"
SPEC_PATH="$2"  # Optional

# Verify path exists
if [ ! -e "$CODE_PATH" ]; then
  echo "Error: Path not found: $CODE_PATH"
  exit 1
fi

# Determine if file or directory
if [ -f "$CODE_PATH" ]; then
  CODE_TYPE="file"
  echo "Analyzing file: $CODE_PATH"
elif [ -d "$CODE_PATH" ]; then
  CODE_TYPE="directory"
  echo "Analyzing directory: $CODE_PATH"
  # Find relevant files (exclude node_modules, tests initially)
  FILES=$(find "$CODE_PATH" -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v ".test." | grep -v ".spec.")
fi
```

### 2. Infer Spec Path

```bash
# If no spec path provided, infer from code path
if [ -z "$SPEC_PATH" ]; then
  # Extract feature name from path
  # src/auth/session.ts → specs/auth/session/SPEC.md
  # src/components/Button.tsx → specs/components/button/SPEC.md

  FEATURE=$(echo "$CODE_PATH" | sed 's/^src\///' | sed 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]')
  SPEC_PATH="specs/${FEATURE}/SPEC.md"

  echo "Spec will be created at: $SPEC_PATH"
  echo ""
fi

# Check if spec already exists
if [ -f "$SPEC_PATH" ]; then
  echo "Warning: Spec already exists at $SPEC_PATH"
  # AskUserQuestion: Overwrite | Merge | Cancel
fi
```

### 3. Analyze Code Structure

```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► ANALYZING CODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Read code files
if [ "$CODE_TYPE" = "file" ]; then
  CODE_CONTENT=$(cat "$CODE_PATH")
else
  # Concatenate relevant files
  CODE_CONTENT=$(cat $FILES)
fi

# Analyze structure
ANALYSIS_PROMPT="
Analyze this code and extract key information:

Code:
$CODE_CONTENT

Extract:
1. Purpose: What does this code do?
2. Key functions/exports: Main API surface
3. Libraries used: External dependencies
4. Patterns: Architecture patterns (e.g., hooks, classes, functional)
5. Data flow: How data moves through the code

Return structured analysis.
"

CODE_ANALYSIS=$(echo "$ANALYSIS_PROMPT" | analyze_with_llm)
```

### 4. Find and Analyze Tests

```bash
echo "Looking for tests..."

# Find test files
if [ "$CODE_TYPE" = "file" ]; then
  # Look for test file matching source file
  BASE=$(basename "$CODE_PATH" | sed 's/\.[^.]*$//')
  DIR=$(dirname "$CODE_PATH")

  TEST_FILES=$(find "$DIR" -name "${BASE}.test.*" -o -name "${BASE}.spec.*")
else
  # Find all tests in directory
  TEST_FILES=$(find "$CODE_PATH" -name "*.test.*" -o -name "*.spec.*")
fi

if [ -n "$TEST_FILES" ]; then
  echo "Found tests: $TEST_FILES"
  echo ""

  # Read test content
  TEST_CONTENT=$(cat $TEST_FILES)

  # Extract test cases
  TEST_ANALYSIS_PROMPT="
Extract acceptance criteria from these tests:

Tests:
$TEST_CONTENT

For each test case, identify:
- What behavior is being tested
- What the acceptance criterion should be
- Any edge cases covered

Return list of acceptance criteria.
"

  TEST_ANALYSIS=$(echo "$TEST_ANALYSIS_PROMPT" | analyze_with_llm)
else
  echo "No tests found"
  TEST_ANALYSIS=""
fi
```

### 5. Analyze Git History

```bash
echo ""
echo "Analyzing git history..."
echo ""

# Get git log for file(s)
if [ "$CODE_TYPE" = "file" ]; then
  GIT_HISTORY=$(git log --follow --pretty=format:"%h|%an|%ar|%s%n%b" "$CODE_PATH" | head -50)
else
  GIT_HISTORY=$(git log --pretty=format:"%h|%an|%ar|%s%n%b" -- "$CODE_PATH" | head -50)
fi

if [ -n "$GIT_HISTORY" ]; then
  # Extract insights from commit messages
  HISTORY_PROMPT="
Analyze these git commits and extract architectural context:

Commits:
$GIT_HISTORY

Look for:
1. Why decisions were made (architectural reasons)
2. Problems that were solved
3. Alternatives that were tried/rejected
4. Refactorings and their reasons
5. Security or performance considerations

Extract implementation decisions and reasoning.
"

  HISTORY_ANALYSIS=$(echo "$HISTORY_PROMPT" | analyze_with_llm)

  # Show sample commits
  echo "Recent commits:"
  echo "$GIT_HISTORY" | head -10 | while IFS='|' read hash author date message; do
    echo "  $hash - $message"
  done
  echo ""
else
  echo "No git history found (file not in git)"
  HISTORY_ANALYSIS=""
fi
```

### 6. Present Findings

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► CODE ANALYSIS COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Code analyzed:** {path}
**Spec location:** {spec_path}

### What I Found

**Purpose:**
{extracted purpose from code}

**Key Functions:**
- {function1}
- {function2}

**Libraries Used:**
- {library1}
- {library2}

**From Tests ({N} test files):**
{If tests found:}
- {acceptance criterion 1}
- {acceptance criterion 2}

{If no tests:}
⚠ No tests found - will need to define acceptance criteria manually

**From Git History ({N} commits analyzed):**
{If history found:}
- {decision 1 from commits}
- {decision 2 from commits}

{If no history:}
⚠ No git history - will need to discuss decisions

───────────────────────────────────────────────────────
```

### 7. Identify Gray Areas

Based on analysis, identify what's unclear:

```bash
GRAY_AREAS=()

# Check what's missing
if [ -z "$TEST_ANALYSIS" ]; then
  GRAY_AREAS+=("acceptance-criteria")
fi

if [ -z "$HISTORY_ANALYSIS" ]; then
  GRAY_AREAS+=("architectural-decisions")
fi

# Always ask about these
GRAY_AREAS+=("requirements")  # Can infer behavior but not business requirements
GRAY_AREAS+=("discretion")    # Can't infer what was flexible vs locked
GRAY_AREAS+=("deferred")      # Can't know what was intentionally deferred

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► CLARIFICATION NEEDED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "I found the implementation details, but I need your help with:"
echo ""

for area in "${GRAY_AREAS[@]}"; do
  echo "  - $(format_gray_area "$area")"
done
echo ""
```

### 8. Adaptive Questioning

Similar to discusser agent, but focused on filling gaps:

```
## ▶ What Should We Clarify?

Use AskUserQuestion:
- header: "Gray areas"
- question: "Which areas should we discuss?"
- multiSelect: true
- options:
  - "Business requirements" — Why this code exists, what problem it solves
  - "Architectural decisions" — Why these approaches were chosen (Recommended if no git history)
  - "Acceptance criteria" — What success looks like (Recommended if no tests)
  - "Implementation discretion" — What's flexible vs locked
  - "Deferred scope" — What was intentionally not built
  - "Skip clarification" — Use what we found, I'll edit later
```

For each selected area, ask 4 questions before checking:

**Example: Business Requirements**
```
1. What business problem does this code solve?
2. Who are the users/consumers of this functionality?
3. What are the must-have requirements vs nice-to-haves?
4. Are there any compliance or business rules to document?

[Check] Ready to move on? | Ask more about requirements
```

**Example: Architectural Decisions**
```
1. Why was {library} chosen over alternatives?
2. What security/performance considerations drove the design?
3. Were there any constraints that influenced the approach?
4. What assumptions or trade-offs were made?

[Check] Ready to move on? | Ask more about decisions
```

### 9. Build Context Section

```bash
# Combine findings with user input
CONTEXT_DECISIONS=$(merge_analysis_and_answers "$HISTORY_ANALYSIS" "$USER_ANSWERS")

# Separate locked vs discretion
# - Things from git history/user = locked decisions
# - Things without clear justification = discretion
# - Things user said were flexible = discretion

LOCKED_DECISIONS=$(extract_locked "$CONTEXT_DECISIONS")
DISCRETION=$(extract_discretion "$CONTEXT_DECISIONS")
DEFERRED=$(extract_from_answers "$USER_ANSWERS" "deferred")
```

### 10. Build Requirements Section

```bash
# Infer requirements from:
# - Code behavior (what it does)
# - User answers (why it exists)
# - Test coverage (what it must do)

REQUIREMENTS=$(build_requirements "$CODE_ANALYSIS" "$TEST_ANALYSIS" "$USER_ANSWERS")
```

### 11. Build Acceptance Criteria

```bash
# Primary source: Tests
# Secondary: User input if no tests

if [ -n "$TEST_ANALYSIS" ]; then
  ACCEPTANCE=$(extract_from_tests "$TEST_ANALYSIS")
else
  ACCEPTANCE=$(extract_from_answers "$USER_ANSWERS" "acceptance")
fi

# Format as checkboxes (all checked since implemented)
ACCEPTANCE=$(echo "$ACCEPTANCE" | sed 's/^/- [x] /')
```

### 12. Create SPEC.md

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► CREATING SPEC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Determine spec type
SPEC_TYPE="single"
# Check if this should be parent/child based on path

# List files
if [ "$CODE_TYPE" = "file" ]; then
  FILE_LIST=$(basename "$CODE_PATH")
else
  FILE_LIST=$(echo "$FILES" | sed "s|^|  - |")
fi

# List test files
if [ -n "$TEST_FILES" ]; then
  TEST_LIST=$(echo "$TEST_FILES" | sed "s|^|  - |")
else
  TEST_LIST="  (No tests found)"
fi

# Build SPEC.md
cat > "$SPEC_PATH" <<EOF
---
name: ${FEATURE_NAME}
status: IMPLEMENTED
type: ${SPEC_TYPE}
depends_on: []
---

## Context

### Implementation Decisions (Locked)

${LOCKED_DECISIONS}

### Claude's Discretion

${DISCRETION}

### Deferred Ideas

${DEFERRED}

## Requirements

${REQUIREMENTS}

## Acceptance Criteria

${ACCEPTANCE}

## Files

${FILE_LIST}

## Tests

${TEST_LIST}

EOF

echo "Spec created: $SPEC_PATH"
```

### 13. Commit Spec

```bash
# Create spec directory if needed
mkdir -p "$(dirname "$SPEC_PATH")"

# Move spec to location
mv temp_spec.md "$SPEC_PATH"

# Commit
git add "$SPEC_PATH"

git commit -m "docs(flow): derive spec from existing code

Code: $CODE_PATH
Spec: $SPEC_PATH
Status: IMPLEMENTED

Derived from:
- Code analysis
- Test coverage
- Git history
- User clarification

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 14. Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPEC DERIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Code:** {path}
**Spec:** {spec_path}
**Status:** IMPLEMENTED

### What Was Captured

**Context:**
- {N} implementation decisions (from git history + user)
- {N} discretionary areas
- {N} deferred ideas

**Requirements:** {N} captured from code behavior

**Acceptance Criteria:** {N}
{If from tests:}
(Derived from {N} test files)
{If from user:}
(Provided by user - recommend adding tests)

**Files:** {N} tracked
**Tests:** {N} tracked

### Next Steps

This code is now documented in Flow workflow!

{If no tests:}
⚠ Recommend adding tests:
  /flow:quick "Add tests for {feature}"

{If child of potential parent:}
Consider creating parent spec:
  /flow:discuss {parent}

───────────────────────────────────────────────────────
```

### 15. Post-Derive Gate

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Spec created from existing code. What now?"
- options:
  - "Review spec" — Show me what was created
  - "Add tests" — Code lacks tests, let's add them
  - "Done" — All set, move on
  - "Refine spec" — Let's discuss more
```

## Special Cases

### No Git History

```
⚠ No git history found

This means I can't infer why decisions were made from commits.
I'll need to ask more questions to understand:
- Why this approach was chosen
- What alternatives were considered
- What constraints influenced the design
```

More extensive questioning needed.

### No Tests

```
⚠ No tests found

Without tests, I can't confidently infer acceptance criteria.
Recommend:
1. Define acceptance criteria manually (I'll ask questions)
2. Then add tests: /flow:quick "Add tests for {feature}"
```

### Multiple Files/Complex Directory

```
Analyzing {N} files in directory

This looks like a complex feature. Consider:
- Creating parent spec for the directory
- Creating child specs for major components
- Using /flow:derive-spec on each component separately
```

Offer to create hierarchical structure.

### Existing Spec Found

```
Spec already exists: {spec_path}

Options:
- Overwrite (replaces with derived version)
- Merge (combines existing + derived)
- Cancel (keep existing)
```

## Quality Gates

Before SPEC DERIVED:
- [ ] Code analyzed (purpose, functions, patterns)
- [ ] Tests found and analyzed (if exist)
- [ ] Git history examined (if available)
- [ ] Gray areas identified
- [ ] User questions asked and answered
- [ ] SPEC.md created with all sections
- [ ] Status set to IMPLEMENTED
- [ ] Files and Tests sections populated
- [ ] Committed to git

## Success Criteria

- [ ] Existing code now has SPEC.md
- [ ] Spec reflects actual implementation
- [ ] Context captures why (not just what)
- [ ] Requirements describe purpose
- [ ] Acceptance criteria defined (from tests or user)
- [ ] Ready for Flow workflow integration
- [ ] User can use /flow:plan or /flow:quick going forward
