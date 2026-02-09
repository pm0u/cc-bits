---
name: flow:discuss
description: Deep discussion phase to create SPEC.md through adaptive questioning
argument-hint: "<feature> [--force]"
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

# Flow: Discuss

Create or update a SPEC.md through deep, adaptive discussion. Combines FUCKIT's thorough questioning with SENDIT's spec-driven clarity.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/discuss.md
@~/.claude/plugins/marketplaces/flow/flow/references/spec-format.md
@~/.claude/plugins/marketplaces/flow/flow/references/gates.md

## Core Principle

**Start simple, add structure when needed.**

Single feature? One spec, one discussion.
Complex feature? Hierarchical structure emerges naturally through split detection.

## Usage

```bash
# Create new spec
/flow:discuss auth

# Create child spec (parent must exist)
/flow:discuss auth/session

# Re-discuss existing spec
/flow:discuss auth --force

# Provide detailed description
/flow:discuss "user authentication with JWT tokens and refresh flow"
```

## Process

<process>

### 0. Parse Arguments

```bash
ARGUMENTS="$1"
FORCE=false

# Check for --force flag
if [[ "$ARGUMENTS" == *"--force"* ]]; then
  FORCE=true
  ARGUMENTS=$(echo "$ARGUMENTS" | sed 's/--force//g' | xargs)
fi

# Extract feature path and description
if [[ "$ARGUMENTS" =~ ^[a-z0-9/-]+$ ]]; then
  # Simple feature name
  FEATURE="$ARGUMENTS"
  DESCRIPTION=""
else
  # First word is feature, rest is description
  FEATURE=$(echo "$ARGUMENTS" | awk '{print $1}')
  DESCRIPTION=$(echo "$ARGUMENTS" | cut -d' ' -f2-)
fi

# Validate feature name (lowercase, alphanumeric, hyphens, slashes)
if [[ ! "$FEATURE" =~ ^[a-z0-9/-]+$ ]]; then
  echo "Error: Feature name must be lowercase alphanumeric with hyphens/slashes"
  echo "Example: auth, user-profile, app/auth/session"
  exit 1
fi
```

### 1. Determine Spec Type

```bash
# Check if this is a child spec (contains slash)
if [[ "$FEATURE" == *"/"* ]]; then
  PARENT=$(dirname "$FEATURE")
  CHILD=$(basename "$FEATURE")
  TYPE="child"
  SPEC_PATH="specs/${FEATURE}/SPEC.md"

  # Verify parent exists
  if [ ! -f "specs/${PARENT}/SPEC.md" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " FLOW ► ERROR"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Parent spec not found: specs/${PARENT}/SPEC.md"
    echo ""
    echo "Create parent first:"
    echo "  /flow:discuss $PARENT"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
else
  PARENT=""
  CHILD=""
  TYPE="single"  # May become "parent" if split occurs
  SPEC_PATH="specs/${FEATURE}/SPEC.md"
fi
```

### 2. Check Existing Spec

```bash
if [ -f "$SPEC_PATH" ] && [ "$FORCE" != "true" ]; then
  # Spec exists, ask what to do
  STATUS=$(grep "^status:" "$SPEC_PATH" | awk '{print $2}')
  echo "Spec already exists: $SPEC_PATH"
  echo "Status: $STATUS"
  echo ""
fi
```

Use AskUserQuestion:
- header: "Existing spec"
- question: "Spec exists with status: $STATUS. What do you want to do?"
- options:
  - "Update it" — Re-discuss and update the spec
  - "View it" — Show me what's there first
  - "Skip" — Use existing spec as-is

Routing:
- "Update" → Continue to step 3
- "View" → Display SPEC.md with Read tool, then re-present question
- "Skip" → Jump to step 7 (post-discussion gate)

### 3. Load Parent Context (For Child Specs)

```bash
if [ "$TYPE" = "child" ]; then
  # Read parent SPEC.md
  PARENT_SPEC="specs/${PARENT}/SPEC.md"

  # Extract architecture decisions
  PARENT_ARCH=$(sed -n '/^## Architecture Decisions/,/^## /p' "$PARENT_SPEC" | head -n -1)

  # Extract phases if defined
  PARENT_PHASES=$(sed -n '/^## Phases/,/^## /p' "$PARENT_SPEC" | head -n -1)

  # Extract integration points
  PARENT_INTEGRATION=$(sed -n '/^## Integration Points/,/^## /p' "$PARENT_SPEC" | head -n -1)

  echo "Loaded parent context from: $PARENT_SPEC"
fi
```

### 4. Assess Complexity (For Split Detection)

```bash
# Simple heuristics for discusser agent
COMPLEXITY="simple"

# If description is long
if [ -n "$DESCRIPTION" ]; then
  WORD_COUNT=$(echo "$DESCRIPTION" | wc -w | tr -d ' ')
  if [ "$WORD_COUNT" -gt 50 ]; then
    COMPLEXITY="complex"
  fi
fi

# If description has multi-domain keywords
if echo "$DESCRIPTION" | grep -qE "\band\b|\balso\b|\bplus\b|\badditionally\b"; then
  COMPLEXITY="complex"
fi

# Check existing specs count (if many specs exist, user might want hierarchy)
EXISTING_SPECS=$(find specs -name "SPEC.md" | wc -l | tr -d ' ')
if [ "$EXISTING_SPECS" -gt 5 ]; then
  echo "Note: Project has $EXISTING_SPECS existing specs. Consider hierarchical organization."
fi
```

### 5. Create Spec Directory

```bash
# Ensure spec directory exists
mkdir -p "$(dirname "$SPEC_PATH")"
```

### 6. Spawn Discusser Agent

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► DISCUSSING: {FEATURE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{If child: Inheriting context from: specs/{PARENT}/SPEC.md}

Starting adaptive discussion...
```

Build discusser prompt:

```markdown
<objective>
Conduct adaptive discussion to create SPEC.md for: {FEATURE}

{If DESCRIPTION provided:}
User description: "{DESCRIPTION}"

Type: {single | child}
Complexity hint: {simple | complex}
Existing spec: {true | false}
</objective>

<context>
**Working directory:** {pwd}
**Spec path:** {SPEC_PATH}

{If child:}
**Parent spec:** specs/{PARENT}/SPEC.md

**Parent Architecture Decisions:**
{PARENT_ARCH}

**Parent Integration Points:**
{PARENT_INTEGRATION}

**Parent Phases:**
{PARENT_PHASES}

You are creating a CHILD spec. It must:
- Inherit parent's Architecture Decisions
- Add child-specific Implementation Decisions
- Set depends_on to reflect dependencies
- Set phase label if parent defines phases
{End if child}

**Existing specs in project:**
{List of specs/* directories}
</context>

<quality_gate>
Before returning DISCUSSION COMPLETE:
- [ ] SPEC.md written to {SPEC_PATH}
- [ ] Frontmatter complete (name, status, type, parent?, depends_on?)
- [ ] Context section with Decisions, Discretion, Deferred
- [ ] Requirements section with at least one item
- [ ] Acceptance Criteria section with at least one criterion
- [ ] Status is DRAFT (if OPEN exists) or ACTIVE (if no OPEN)
- [ ] {If child: parent and depends_on set correctly}
</quality_gate>

<split_detection>
Watch for signals that spec should be split:
- Multiple distinct domains (auth + content, backend + frontend)
- More than 8 acceptance criteria
- Natural sub-groupings emerging
- User describing sequential phases

If detected, offer split using AskUserQuestion:
- "Split into sub-specs" (recommended)
- "Continue as one spec"

If user selects split:
1. Create parent SPEC.md at specs/{FEATURE}/SPEC.md
2. Create child stubs at specs/{FEATURE}/{child1}/SPEC.md, etc.
3. Return DISCUSSION COMPLETE with type: parent and list of children
4. Orchestrator will recursively discuss each child
</split_detection>

<return_format>
## DISCUSSION COMPLETE

**Spec created:** {SPEC_PATH}
**Status:** {DRAFT | ACTIVE}
**Type:** {single | parent | child}
{If parent: **Children:** {list of child names}}
{If child: **Parent:** {parent path}}
**Deferred ideas:** {N}

### Decisions Captured
- {decision 1}
- {decision 2}

### Discretion Granted
- {discretion 1}
- {discretion 2}

{If OPEN items exist:}
### Needs Resolution
- {open item 1}
- {open item 2}

{If split occurred:}
### Children Created
- {child1} - {brief description}
- {child2} - {brief description}
</return_format>
```

Spawn agent:
```
Task(
  prompt="First, read ~/.claude/agents/discusser.md for your full role and process.\n\n" + discusser_prompt,
  subagent_type="general-purpose",
  model="sonnet",
  description="Discuss {FEATURE}"
)
```

### 7. Handle Agent Return

Parse the discusser's response:

**Check for DISCUSSION COMPLETE marker:**
```bash
if ! grep -q "^## DISCUSSION COMPLETE" <<< "$AGENT_OUTPUT"; then
  # Discussion incomplete or error
  echo "Discussion incomplete. Agent output:"
  echo "$AGENT_OUTPUT"
  exit 1
fi
```

**Extract information:**
```bash
SPEC_CREATED=$(echo "$AGENT_OUTPUT" | grep "^\*\*Spec created:" | cut -d: -f2- | xargs)
SPEC_STATUS=$(echo "$AGENT_OUTPUT" | grep "^\*\*Status:" | cut -d: -f2 | xargs)
SPEC_TYPE=$(echo "$AGENT_OUTPUT" | grep "^\*\*Type:" | cut -d: -f2 | xargs)
```

**If type is "parent" (split occurred):**
```bash
if [ "$SPEC_TYPE" = "parent" ]; then
  # Extract children list
  CHILDREN=$(echo "$AGENT_OUTPUT" | sed -n '/^### Children Created/,/^$/p' | grep "^- " | sed 's/^- \([^ ]*\).*/\1/')

  echo ""
  echo "Parent spec created. Now discussing each child..."
  echo ""

  for CHILD_NAME in $CHILDREN; do
    # Recursively call /flow:discuss for each child
    # Pass child description if available
    CHILD_DESC=$(echo "$AGENT_OUTPUT" | grep "^- ${CHILD_NAME}" | sed "s/^- ${CHILD_NAME} - //")

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " FLOW ► DISCUSSING: ${FEATURE}/${CHILD_NAME}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Description: $CHILD_DESC"
    echo ""

    # Spawn discusser for child
    # (This would recursively call this same skill)
    # For now, indicate this happens
    echo "TODO: Recursively discuss ${FEATURE}/${CHILD_NAME}"
  done
fi
```

### 8. Commit Spec

```bash
# Check config for auto-commit
COMMIT_SPECS=$(cat .flow/config.json 2>/dev/null | grep -o '"commit_specs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

if [ "$COMMIT_SPECS" = "true" ]; then
  git add "$SPEC_PATH"

  COMMIT_MSG="docs(flow): discuss ${FEATURE}"
  if [ "$SPEC_TYPE" = "parent" ]; then
    COMMIT_MSG="${COMMIT_MSG} (parent spec)"
  elif [ "$SPEC_TYPE" = "child" ]; then
    COMMIT_MSG="${COMMIT_MSG} (child spec)"
  fi

  git commit -m "$COMMIT_MSG

Status: $SPEC_STATUS
Type: $SPEC_TYPE
"
fi
```

### 9. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPEC READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** {SPEC_PATH}
**Status:** {SPEC_STATUS}
**Type:** {SPEC_TYPE}
{If parent: **Children:** {N} sub-specs}
{If child: **Parent:** specs/{PARENT}/SPEC.md}
**Ready gate:** {✓ PASSED if ACTIVE | ⚠ HAS OPEN ITEMS if DRAFT}

{Extract and display from agent output:}
### Decisions Captured
{decisions list}

### Discretion Granted
{discretion list}

**Deferred Ideas:** {N} captured for future

{If OPEN items:}
### ⚠ Needs Resolution
{open items list}

───────────────────────────────────────────────────────
```

### 10. Post-Discussion Gate

**If SPEC_STATUS == "DRAFT" (has OPEN items):**

```
## ▶ Spec Has Open Items

Use AskUserQuestion:
- header: "Open items"
- question: "Spec has unresolved questions. How do you want to proceed?"
- options:
  - "Resolve now" — Let's answer the open items
  - "Resolve later" — I'll update the spec manually
  - "Proceed anyway" — Continue to planning (not recommended)
```

Routing:
- "Resolve now" → Re-spawn discusser focused on OPEN items only
- "Resolve later" → Exit with message about editing SPEC.md
- "Proceed anyway" → Continue to next gate with warning

**If SPEC_STATUS == "ACTIVE" (ready):**

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "Spec is ready. How do you want to proceed?"
- options:
  - "Continue" — Proceed to planning (includes research if needed) (Recommended)
  - "Discuss more" — Refine the spec further
  - "Plan without research" — Skip research, plan directly
```

Routing:
- "Continue" → Call `/flow:plan {FEATURE}`
- "Discuss more" → Re-run `/flow:discuss {FEATURE} --force` in refinement mode
- "Plan without research" → Call `/flow:plan {FEATURE} --skip-research`

</process>

## Success Criteria

- [ ] SPEC.md created at correct path
- [ ] Frontmatter complete and valid
- [ ] Context section properly filled (Decisions, Discretion, Deferred)
- [ ] Requirements and Acceptance Criteria present
- [ ] Status is DRAFT or ACTIVE (based on OPEN items)
- [ ] For parent: children listed in Sub-Specs section
- [ ] For child: parent and depends_on set
- [ ] Committed to git (if enabled)
- [ ] Post-discussion gate presented with clear options
- [ ] User knows exactly what to do next
