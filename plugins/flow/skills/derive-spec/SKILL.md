---
name: flow:derive-spec
description: Create spec from existing code collaboratively
argument-hint: "<code-path> [spec-path]"
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

# Flow: Derive Spec

Create SPEC.md from existing code through collaborative analysis.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/derive-spec.md

## Core Principle

**Code shows "what", user + git history shows "why".**

Brings existing code into Flow workflow by documenting it.

## Usage

```bash
# Analyze single file
/flow:derive-spec src/auth/session.ts

# Analyze directory
/flow:derive-spec src/components/Button

# Specify where spec should go
/flow:derive-spec src/auth/session.ts specs/auth/session/SPEC.md
```

## When to Use

**Use `/flow:derive-spec` for:**
- ✅ Legacy code without documentation
- ✅ Quick implementations that need formalization
- ✅ Code built before Flow adoption
- ✅ Third-party code being integrated

**Use `/flow:discuss` instead:**
- ❌ No code exists yet (planning new feature)
- ❌ Starting from scratch

## What Gets Analyzed

1. **Code structure** - Functions, exports, patterns
2. **Tests** - Acceptance criteria from test cases
3. **Git history** - Commit messages for context/decisions
4. **Libraries** - Dependencies and patterns used

Then asks clarifying questions to fill gaps.

## Process

<process>

### 1. Validate and Analyze

```bash
CODE_PATH="$1"
SPEC_PATH="$2"  # Optional

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► ANALYZING CODE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify path exists
if [ ! -e "$CODE_PATH" ]; then
  echo "Error: Path not found: $CODE_PATH"
  exit 1
fi

# Infer spec path if not provided
if [ -z "$SPEC_PATH" ]; then
  # src/auth/session.ts → specs/auth/session/SPEC.md
  FEATURE=$(echo "$CODE_PATH" | sed 's/^src\///' | sed 's/\.[^.]*$//')
  SPEC_PATH="specs/${FEATURE}/SPEC.md"
fi

echo "Code: $CODE_PATH"
echo "Spec will be created at: $SPEC_PATH"
echo ""

# Check if spec exists
if [ -f "$SPEC_PATH" ]; then
  echo "⚠ Spec already exists"
  # AskUserQuestion: Overwrite | Merge | Cancel
fi
```

### 2. Analyze Code

```bash
echo "Reading code..."

# Read files
if [ -f "$CODE_PATH" ]; then
  CODE_FILES=("$CODE_PATH")
else
  CODE_FILES=$(find "$CODE_PATH" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | grep -v node_modules | grep -v ".test." | grep -v ".spec.")
fi

# Analyze structure using Task agent
ANALYSIS=$(Task(
  subagent_type="general-purpose",
  model="haiku",
  prompt="Analyze this code and extract:
  1. Purpose (what it does)
  2. Key functions/exports
  3. Libraries used
  4. Patterns (architecture)
  5. Data flow

  Code files: ${CODE_FILES[@]}"
))

echo "✓ Code analyzed"
```

### 3. Find and Analyze Tests

```bash
echo "Looking for tests..."

# Find test files
if [ -f "$CODE_PATH" ]; then
  BASE=$(basename "$CODE_PATH" | sed 's/\.[^.]*$//')
  DIR=$(dirname "$CODE_PATH")
  TEST_FILES=$(find "$DIR" -name "${BASE}.test.*" -o -name "${BASE}.spec.*")
else
  TEST_FILES=$(find "$CODE_PATH" -name "*.test.*" -o -name "*.spec.*")
fi

if [ -n "$TEST_FILES" ]; then
  echo "Found tests: $(echo "$TEST_FILES" | wc -l) files"

  # Extract acceptance criteria from tests
  TEST_ANALYSIS=$(analyze_tests "$TEST_FILES")
  echo "✓ Tests analyzed"
else
  echo "⚠ No tests found"
  TEST_ANALYSIS=""
fi
```

### 4. Analyze Git History

```bash
echo "Checking git history..."

# Get commit history for files
GIT_HISTORY=$(git log --follow --pretty=format:"%h - %s%n%b" "$CODE_PATH" 2>/dev/null | head -50)

if [ -n "$GIT_HISTORY" ]; then
  echo "Found $(echo "$GIT_HISTORY" | grep "^[a-f0-9]" | wc -l) commits"

  # Extract architectural context from commits
  HISTORY_ANALYSIS=$(Task(
    subagent_type="general-purpose",
    model="haiku",
    prompt="Extract architectural decisions and reasoning from git commits:

    $GIT_HISTORY

    Look for: why decisions were made, problems solved, alternatives tried, refactoring reasons"
  ))

  echo "✓ History analyzed"
else
  echo "⚠ No git history"
  HISTORY_ANALYSIS=""
fi

echo ""
```

### 5. Present Findings

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► ANALYSIS COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Code:** {code_path}
**Files:** {N} analyzed

### What I Found

**Purpose:**
{extracted purpose}

**Key Functions:**
- {function1}
- {function2}

**Libraries:**
- {library1} - {usage}
- {library2} - {usage}

{If tests found:}
**From Tests ({N} test files):**
- {criterion1}
- {criterion2}

{If no tests:}
⚠ No tests found - will need manual acceptance criteria

{If git history:}
**From Git History ({N} commits):**
Sample commits:
- {commit1}
- {commit2}

Extracted decisions:
- {decision1}
- {decision2}

{If no git history:}
⚠ No git history - will need to discuss decisions

───────────────────────────────────────────────────────
```

### 6. Identify Gray Areas

```bash
# Determine what needs clarification
GRAY_AREAS=()

# Always need these from user
GRAY_AREAS+=("requirements")  # Can't infer business requirements from code

if [ -z "$HISTORY_ANALYSIS" ]; then
  GRAY_AREAS+=("decisions")  # No git history = need to ask why
fi

if [ -z "$TEST_ANALYSIS" ]; then
  GRAY_AREAS+=("acceptance")  # No tests = need criteria
fi

# Optional
GRAY_AREAS+=("discretion")  # Can't infer what's flexible
GRAY_AREAS+=("deferred")    # Can't know what was cut

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► CLARIFICATION NEEDED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "I found the code details, but need your help with:"
echo ""

for area in "${GRAY_AREAS[@]}"; do
  case "$area" in
    requirements) echo "  - Business requirements (why this exists)" ;;
    decisions) echo "  - Architectural decisions (why this approach)" ;;
    acceptance) echo "  - Acceptance criteria (what success looks like)" ;;
    discretion) echo "  - Implementation discretion (what's flexible)" ;;
    deferred) echo "  - Deferred scope (what was intentionally skipped)" ;;
  esac
done
echo ""
```

### 7. Clarification Gate

```
## ▶ What Should We Clarify?

Use AskUserQuestion:
- header: "Clarification"
- question: "Which areas should we discuss to complete the spec?"
- multiSelect: true
- options:
  - "Business requirements" — Why this code exists (Recommended)
  {If no git history:}
  - "Architectural decisions" — Why these approaches were chosen (Recommended)
  {If no tests:}
  - "Acceptance criteria" — What success looks like (Recommended)
  - "Implementation discretion" — What's flexible vs locked
  - "Deferred scope" — What was intentionally not built
  - "Skip clarification" — Use what was found, I'll edit spec later
```

### 8. Adaptive Questioning

For each selected area, use discusser-style questioning:

```bash
# Spawn questioning for each area
for AREA in "${SELECTED_AREAS[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► DISCUSSING: $(format_area "$AREA")"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # 4 questions per area, then check
  AREA_ANSWERS=$(ask_area_questions "$AREA" "$CODE_ANALYSIS" "$HISTORY_ANALYSIS")

  ALL_ANSWERS["$AREA"]="$AREA_ANSWERS"
done
```

**Example questions:**

**Business Requirements:**
1. What business problem does this code solve?
2. Who are the users/consumers?
3. What are the must-haves vs nice-to-haves?
4. Any compliance or business rules to document?

**Architectural Decisions:**
1. Why was {library} chosen over alternatives?
2. What security/performance considerations drove design?
3. What constraints influenced the approach?
4. What assumptions or trade-offs were made?

**Acceptance Criteria:**
1. What are the key behaviors this must exhibit?
2. What error cases must be handled?
3. What edge cases are important?
4. How do you verify it's working correctly?

### 9. Build SPEC.md

```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► CREATING SPEC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Merge analysis with user answers
CONTEXT_DECISIONS=$(merge_findings "$HISTORY_ANALYSIS" "${ALL_ANSWERS[decisions]}")
DISCRETION=$(extract_discretion "${ALL_ANSWERS[discretion]}")
DEFERRED=$(extract_deferred "${ALL_ANSWERS[deferred]}")

REQUIREMENTS=$(build_requirements "$CODE_ANALYSIS" "${ALL_ANSWERS[requirements]}")

if [ -n "$TEST_ANALYSIS" ]; then
  ACCEPTANCE=$(format_as_criteria "$TEST_ANALYSIS" "checked")
else
  ACCEPTANCE=$(format_as_criteria "${ALL_ANSWERS[acceptance]}" "checked")
fi

# List files
FILES=$(list_analyzed_files "$CODE_PATH")
TESTS=$(list_test_files "$TEST_FILES")

# Create spec
mkdir -p "$(dirname "$SPEC_PATH")"

cat > "$SPEC_PATH" <<EOF
---
name: ${FEATURE_NAME}
status: IMPLEMENTED
type: single
depends_on: []
---

## Context

### Implementation Decisions (Locked)

${CONTEXT_DECISIONS}

### Claude's Discretion

${DISCRETION}

### Deferred Ideas

${DEFERRED}

## Requirements

${REQUIREMENTS}

## Acceptance Criteria

${ACCEPTANCE}

## Files

${FILES}

## Tests

${TESTS}

EOF

echo "✓ Spec created: $SPEC_PATH"
```

### 10. Commit

```bash
git add "$SPEC_PATH"

git commit -m "docs(flow): derive spec from existing code

Code: $CODE_PATH
Spec: $SPEC_PATH
Status: IMPLEMENTED

Derived from:
- Code analysis (${NUM_FILES} files)
- Test coverage (${NUM_TESTS} tests)
- Git history (${NUM_COMMITS} commits)
- User clarification

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "✓ Spec committed"
```

### 11. Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPEC DERIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Code:** {code_path}
**Spec:** {spec_path}
**Status:** IMPLEMENTED ✓

### What Was Captured

**Context:**
- {N} implementation decisions
- {N} discretionary areas
{If deferred:}
- {N} deferred ideas

**Requirements:** {N} business requirements

**Acceptance Criteria:** {N} criteria
{If from tests:}
✓ Derived from {N} test files
{If from user:}
⚠ Provided by user - recommend adding tests

**Files:** {N} tracked
**Tests:** {N} tracked

### This Code is Now in Flow!

You can now:
- Make changes: /flow:quick "description"
- Add features: /flow:discuss {feature}/{new-child}
- Add tests: /flow:quick "Add tests for {feature}"

{If no tests:}
⚠ Recommend adding tests next

───────────────────────────────────────────────────────
```

### 12. Post-Derive Gate

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Spec created! What would you like to do?"
- options:
  {If no tests:}
  - "Add tests" — Let's add test coverage (Recommended)
  - "Review spec" — Show me what was created
  - "Done" — All set
  - "Refine spec" — Discuss more details
```

</process>

## Examples

### Single File with Tests

```bash
/flow:derive-spec src/auth/session.ts
```

**Result:**
- Analyzes session.ts
- Finds session.test.ts
- Extracts criteria from tests ✓
- Reads git history for decisions
- Asks about requirements
- Creates specs/auth/session/SPEC.md
- Status: IMPLEMENTED

### Directory without Tests

```bash
/flow:derive-spec src/components/Button
```

**Result:**
- Analyzes Button files
- No tests found ⚠
- Asks about acceptance criteria
- Asks about requirements
- Asks about decisions (more questions)
- Creates spec
- Recommends: "Add tests next"

### Legacy Code, No Git History

```bash
/flow:derive-spec legacy/old-module.js
```

**Result:**
- Analyzes old-module.js
- No git history ⚠
- More extensive questioning about:
  - Why this approach?
  - What alternatives?
  - What constraints?
- Creates spec with user-provided context

## Quality Gates

Before completing:
- [ ] Code analyzed
- [ ] Tests analyzed (if exist)
- [ ] Git history examined (if available)
- [ ] User questions asked and answered
- [ ] SPEC.md created with all sections
- [ ] Status: IMPLEMENTED
- [ ] Files/Tests sections populated
- [ ] Committed to git

## Success Criteria

- [ ] Existing code now has spec
- [ ] Spec captures both "what" and "why"
- [ ] Ready for Flow workflow integration
- [ ] Can use /flow:quick or /flow:plan going forward
- [ ] No loss of tribal knowledge
