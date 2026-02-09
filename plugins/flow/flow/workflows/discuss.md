# Discussion Workflow

Orchestrates the discussion phase that creates SPEC.md files through adaptive questioning.

## Inputs

- `feature` - Feature name/path (e.g., "auth" or "auth/session")
- `force` - Re-discuss even if SPEC.md exists (optional)

## Outputs

- SPEC.md created/updated
- Status: DRAFT or ACTIVE
- Post-discussion gate presented

## Process

### 1. Parse Feature Path

```bash
# Determine if this is parent or child spec
if [[ "$FEATURE" == *"/"* ]]; then
  # Child spec (e.g., "auth/session")
  PARENT=$(dirname "$FEATURE")
  CHILD=$(basename "$FEATURE")
  TYPE="child"
  SPEC_PATH="specs/${FEATURE}/SPEC.md"
else
  # Potential parent or single spec (determined later)
  PARENT=""
  CHILD=""
  TYPE="unknown"
  SPEC_PATH="specs/${FEATURE}/SPEC.md"
fi
```

### 2. Check Existing Spec

```bash
if [ -f "$SPEC_PATH" ] && [ "$FORCE" != "true" ]; then
  # Spec exists
  STATUS=$(grep "^status:" "$SPEC_PATH" | cut -d: -f2 | tr -d ' ')

  Use AskUserQuestion:
  - question: "Spec exists with status: $STATUS. What do you want to do?"
  - options:
    - "Update it" - Re-discuss and update
    - "View it" - Show me what's there
    - "Skip" - Use existing spec
fi
```

**Routing:**
- "Update" → Continue to discussion
- "View" → Display SPEC.md, then re-present options
- "Skip" → Jump to post-discussion gate (step 8)

### 3. Load Context (For Child Specs)

If `TYPE == "child"`:

```bash
# Load parent SPEC.md
PARENT_SPEC="specs/${PARENT}/SPEC.md"
if [ ! -f "$PARENT_SPEC" ]; then
  echo "Error: Parent spec not found: $PARENT_SPEC"
  echo "Create parent spec first: /flow:discuss $PARENT"
  exit 1
fi

# Extract parent architecture decisions
PARENT_ARCH=$(sed -n '/^## Architecture Decisions/,/^##/p' "$PARENT_SPEC" | sed '$d')
```

Pass to discusser agent for context.

### 4. Assess Complexity

Quick heuristic check:

```bash
# Count words in feature description
WORD_COUNT=$(echo "$USER_DESCRIPTION" | wc -w)

# Detect complexity signals
COMPLEXITY="simple"

if [[ $WORD_COUNT -gt 50 ]]; then
  COMPLEXITY="complex"
elif echo "$USER_DESCRIPTION" | grep -qE "and|also|plus|additionally"; then
  COMPLEXITY="complex"
fi
```

Flag for discusser agent (used in split detection).

### 5. Spawn Discusser Agent

```markdown
<objective>
Conduct adaptive discussion to create SPEC.md for: {feature}

Feature description: {user_description}
Type: {single | child | potential_parent}
Complexity: {simple | complex}

{If child:}
Parent spec: {parent_spec_path}
Parent architecture: {parent_architecture_decisions}
</objective>

<context>
**Codebase:** {working_directory}
**Existing specs:** {list of specs in specs/ directory}
</context>

<instructions>
Follow the discusser agent process:
1. Analyze the feature and identify gray areas
2. Present gray areas for selection (multi-select)
3. Deep-dive each area (4 questions, check, repeat)
4. Watch for scope creep (capture in Deferred Ideas)
5. Detect if split needed (multiple domains, >8 criteria)
6. Write SPEC.md with Context section
7. Return DISCUSSION COMPLETE
</instructions>

<output_format>
## DISCUSSION COMPLETE

**Spec created:** {path}
**Status:** {DRAFT | ACTIVE}
**Type:** {parent | child | single}
**Sub-specs:** {N} (if split occurred)
**Deferred ideas:** {N}

### Decisions Captured
- {decisions}

### Discretion Granted
- {freedoms}

{If OPEN:}
### Needs Resolution
- {open items}

{If split occurred:}
### Children Created
- {child1} - {description}
- {child2} - {description}
</output_format>

<quality_gate>
Before returning DISCUSSION COMPLETE:
- [ ] SPEC.md exists at correct path
- [ ] Context section has Decisions, Discretion, Deferred
- [ ] At least one Requirement
- [ ] At least one Acceptance Criterion
- [ ] Status is DRAFT (with OPEN) or ACTIVE (no OPEN)
- [ ] If child: dependencies and parent set correctly
</quality_gate>
```

```
Task(
  prompt="First, read ~/.claude/agents/discusser.md for your role.\n\n" + discussion_prompt,
  subagent_type="general-purpose",
  model="sonnet",  # Deep discussion needs reasoning
  description="Discuss {feature}"
)
```

### 6. Handle Agent Return

Parse discusser output:

**Pattern 1: DISCUSSION COMPLETE (single spec)**
```
**Spec created:** specs/auth/SPEC.md
**Status:** ACTIVE
**Type:** single
```
→ Single spec created, proceed to step 8

**Pattern 2: DISCUSSION COMPLETE (split occurred)**
```
**Spec created:** specs/auth/SPEC.md
**Status:** ACTIVE
**Type:** parent
**Sub-specs:** 3

### Children Created
- session - Session management
- api - API endpoints
- ui - User interface
```
→ Parent + children created, proceed to step 7

**Pattern 3: DISCUSSION INCONCLUSIVE**
```
**Issue:** {description}
**Suggestion:** {what to do}
```
→ Present issue to user, offer to retry or provide more context

### 7. Handle Hierarchical Spec (If Split Occurred)

Discusser created parent + child stubs. Now discuss each child:

```bash
# List children from parent SPEC.md
CHILDREN=$(grep "^- \`.*\/" specs/${FEATURE}/SPEC.md | sed 's/.*`\(.*\)\/.*/\1/')

echo "Parent spec created. Now let's discuss each child:"

for CHILD in $CHILDREN; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " FLOW ► DISCUSSING ${FEATURE}/${CHILD}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Recursively call discussion for child
  # This spawns another discusser agent for the child
  discuss_feature "${FEATURE}/${CHILD}"
done
```

Each child gets full discussion treatment, inheriting parent context.

### 8. Verify Spec Quality

```bash
# Check ready gate conditions
SPEC_PATH="specs/${FEATURE}/SPEC.md"

# Has OPEN section?
HAS_OPEN=$(grep -c "^## OPEN" "$SPEC_PATH" || echo "0")

# Has acceptance criteria?
HAS_CRITERIA=$(grep -c "^- \[ \]" "$SPEC_PATH" || echo "0")

# Has requirements?
HAS_REQS=$(grep -c "^## Requirements" "$SPEC_PATH" || echo "0")

# Determine status
if [ "$HAS_OPEN" -gt 0 ]; then
  STATUS="DRAFT"
  READY="false"
elif [ "$HAS_CRITERIA" -eq 0 ] || [ "$HAS_REQS" -eq 0 ]; then
  STATUS="DRAFT"
  READY="false"
else
  STATUS="ACTIVE"
  READY="true"
fi
```

Update status in SPEC.md if needed.

### 9. Commit Spec

```bash
# Check if git commit is enabled
COMMIT_SPECS=$(cat .flow/config.json 2>/dev/null | grep -o '"commit_specs"[[:space:]]*:[[:space:]]*[^,}]*' | grep -o 'true\|false' || echo "true")

if [ "$COMMIT_SPECS" = "true" ]; then
  git add "$SPEC_PATH"

  if [ "$TYPE" = "parent" ]; then
    MSG="docs(flow): discuss ${FEATURE} (parent spec)"
  elif [ "$TYPE" = "child" ]; then
    MSG="docs(flow): discuss ${FEATURE} (child spec)"
  else
    MSG="docs(flow): discuss ${FEATURE}"
  fi

  git commit -m "$MSG

Status: $STATUS
Type: $TYPE
$([ "$HAS_OPEN" -gt 0 ] && echo "OPEN items: $HAS_OPEN" || echo "Ready for planning")
"
fi
```

### 10. Check for Cascade Updates (Parent Specs Only)

If this is a parent spec being updated (not created fresh):

```bash
if [ "$TYPE" = "parent" ] && [ "$FORCE" = "true" ]; then
  # Parent spec was re-discussed, check for children
  CHILDREN=$(find "specs/${FEATURE}" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)

  if [ -n "$CHILDREN" ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo " FLOW ► CASCADE CHECK"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Parent spec updated with children present."
    echo "Checking if cascade update needed..."
    echo ""

    # Trigger cascade update workflow
    /flow:cascade "$FEATURE"
  fi
fi
```

This automatically propagates parent changes to children with conflict detection.

### 11. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPEC READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** specs/{feature}/SPEC.md
**Status:** {STATUS}
**Type:** {single | parent | child}
{If parent: **Children:** {N} sub-specs}
{If child: **Parent:** {parent}}
**Ready gate:** {✓ PASSED | ⚠ OPEN ITEMS}

### What We Captured

**Implementation Decisions:**
- {decision 1}
- {decision 2}

**Claude's Discretion:**
- {discretion 1}
- {discretion 2}

**Deferred Ideas:** {N} captured for future

{If OPEN items:}
### ⚠ Needs Resolution
- {open item 1}
- {open item 2}

Resolve these to set status: ACTIVE

───────────────────────────────────────────────────────
```

### 12. Post-Discussion Gate

**If status == DRAFT (has OPEN items):**

```
Use AskUserQuestion:
- question: "Spec has unresolved questions. How to proceed?"
- options:
  - "Resolve now" - Let's answer the OPEN items
  - "Resolve later" - I'll update the spec manually
  - "Proceed anyway" - Plan with OPEN items (not recommended)
```

Routing:
- "Resolve now" → Spawn discusser again focused on OPEN items
- "Resolve later" → Exit, user will edit SPEC.md
- "Proceed anyway" → Continue to next gate (with warning)

**If status == ACTIVE (ready):**

```
## ▶ What's Next?

Use AskUserQuestion:
- question: "How do you want to proceed?"
- options:
  - "Continue" - Proceed to planning (includes research if needed) (Recommended)
  - "Discuss more" - Refine the spec further
  - "Plan without research" - Skip research, plan directly
```

Routing:
- "Continue" → `/flow:plan {feature}` with auto-research
- "Discuss more" → Re-spawn discusser in refinement mode
- "Plan without research" → `/flow:plan {feature} --skip-research`

## Edge Cases

### Parent Already Exists, Creating New Child

```bash
# User runs: /flow:discuss auth/recovery
# Parent specs/auth/SPEC.md already exists

# Verify parent exists
if [ ! -f "specs/${PARENT}/SPEC.md" ]; then
  echo "Error: Parent spec not found"
  echo "Create parent first: /flow:discuss $PARENT"
  exit 1
fi

# Load parent context
# Create child spec inheriting parent
# Update parent's Sub-Specs list to include new child
```

### Deep Hierarchy

```bash
# User runs: /flow:discuss app/auth/session
# This is a child of a child

# Validate full hierarchy exists
# Load context from all ancestors
# Create spec with full inheritance chain
```

### Circular References (Should Not Happen in Discussion)

Discussion creates specs, doesn't set dependencies yet.
Dependencies are set during planning, where circular detection happens.

## Success Criteria

- [ ] SPEC.md created at correct path
- [ ] Status is DRAFT or ACTIVE (based on OPEN items)
- [ ] Context section properly filled
- [ ] For hierarchical: parent + all children discussed
- [ ] Committed to git (if enabled)
- [ ] Post-discussion gate presented
- [ ] User knows next steps clearly
