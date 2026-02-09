---
name: flow:cascade
description: Cascade parent spec changes to child specs
argument-hint: "<parent-feature>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
---

# Flow: Cascade

Propagate parent SPEC.md changes to child specs automatically.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/cascade-update.md

## Core Principle

**Detect → Analyze → Propose → Update → Verify**

Parent architecture decisions cascade to children with conflict detection.

## Usage

```bash
# Manual cascade trigger
/flow:cascade auth

# Automatic trigger (after parent discussion)
# Happens automatically when parent SPEC.md changes
```

## Process

<process>

### 1. Validate Parent

```bash
PARENT="$1"

# Check parent exists
if [ ! -f "specs/${PARENT}/SPEC.md" ]; then
  echo "Error: Parent spec not found"
  exit 1
fi

# Check it's actually a parent
TYPE=$(grep "^type:" "specs/${PARENT}/SPEC.md" | awk '{print $2}')
if [ "$TYPE" != "parent" ]; then
  echo "Error: $PARENT is not a parent spec"
  exit 1
fi
```

### 2. Find Children

```bash
# Get list of children
CHILDREN=$(find "specs/${PARENT}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)

if [ -z "$CHILDREN" ]; then
  echo "No children found for $PARENT"
  exit 0
fi

CHILD_COUNT=$(echo "$CHILDREN" | wc -l | tr -d ' ')
echo "Found $CHILD_COUNT children"
```

### 3. Detect Parent Changes

```bash
# Get parent SPEC.md last commit
PARENT_SPEC="specs/${PARENT}/SPEC.md"
LAST_COMMIT=$(git log -1 --format=%H "$PARENT_SPEC")

# Check what changed in parent
PARENT_CHANGES=$(git show "$LAST_COMMIT" "$PARENT_SPEC")

# Analyze changes
ARCH_CHANGED=false
INTEGRATION_CHANGED=false
PHASES_CHANGED=false

if echo "$PARENT_CHANGES" | grep -q "^+.*## Architecture Decisions"; then
  ARCH_CHANGED=true
fi

if echo "$PARENT_CHANGES" | grep -q "^+.*## Integration Points"; then
  INTEGRATION_CHANGED=true
fi

if echo "$PARENT_CHANGES" | grep -q "^+.*phase:"; then
  PHASES_CHANGED=true
fi
```

### 4. Identify Affected Children

```bash
declare -A affected_children

for CHILD in $CHILDREN; do
  CHILD_SPEC="specs/${PARENT}/${CHILD}/SPEC.md"

  [ ! -f "$CHILD_SPEC" ] && continue

  IMPACT="none"

  if [ "$ARCH_CHANGED" = true ]; then
    IMPACT="high"
  elif [ "$INTEGRATION_CHANGED" = true ]; then
    if grep -q "$CHILD" "specs/${PARENT}/SPEC.md"; then
      IMPACT="medium"
    fi
  elif [ "$PHASES_CHANGED" = true ]; then
    IMPACT="low"
  fi

  if [ "$IMPACT" != "none" ]; then
    affected_children["$CHILD"]="$IMPACT"
  fi
done
```

### 5. Present Changes

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PARENT SPEC UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Parent:** specs/{parent}/SPEC.md

### Changes Detected

{Show what changed in parent - Architecture Decisions, Integration Points, etc}

### Affected Children

**High Impact** (must update):
{List children with high impact}

**Medium Impact** (should review):
{List children with medium impact}

**Low Impact** (optional):
{List children with low impact}

───────────────────────────────────────────────────────
```

### 6. Cascade Gate

```
## ▶ How to Proceed?

Use AskUserQuestion:
- header: "Cascade updates"
- question: "Parent spec changed. Update children?"
- multiSelect: true
- options:
  - "Update all automatically" — Apply changes to all children (Recommended)
  - "Review each child" — Approve each update individually
  - "High impact only" — Only update high-impact children
  - "Skip for now" — I'll update manually later
```

### 7. Update Children (Based on Choice)

#### Option A: Update All Automatically

```bash
for CHILD in "${!affected_children[@]}"; do
  echo ""
  echo "Updating: $PARENT/$CHILD"

  if update_child_spec "$PARENT" "$CHILD"; then
    echo "✓ Updated successfully"
  else
    echo "⚠ Conflict detected - needs manual review"
    CONFLICTS+=("$CHILD")
  fi
done
```

#### Option B: Review Each Child

```bash
for CHILD in "${!affected_children[@]}"; do
  IMPACT="${affected_children[$CHILD]}"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Child: $PARENT/$CHILD ($IMPACT impact)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Show proposed changes
  show_proposed_changes "$PARENT" "$CHILD"

  # Ask for approval
  # AskUserQuestion: Apply | Skip | Edit manually
done
```

#### Option C: High Impact Only

```bash
for CHILD in "${!affected_children[@]}"; do
  IMPACT="${affected_children[$CHILD]}"

  if [ "$IMPACT" = "high" ]; then
    echo "Updating high-impact: $PARENT/$CHILD"
    update_child_spec "$PARENT" "$CHILD"
  fi
done
```

### 8. Smart Merge Logic

```bash
update_child_spec() {
  local PARENT="$1"
  local CHILD="$2"
  local CHILD_SPEC="specs/${PARENT}/${CHILD}/SPEC.md"

  # Backup current version
  cp "$CHILD_SPEC" "${CHILD_SPEC}.backup"

  # Extract parent context
  PARENT_CONTEXT=$(sed -n '/^## Context/,/^## Requirements/p' "specs/${PARENT}/SPEC.md" | head -n -1)

  # Check for conflicts
  if detect_conflicts "$PARENT" "$CHILD" "$PARENT_CONTEXT"; then
    # Conflict detected
    echo "⚠ Conflict: Child has conflicting decisions"
    rm "${CHILD_SPEC}.backup"
    return 1
  fi

  # Merge parent context into child
  # (Implementation would do smart merge of Context sections)

  # Update "Inherited from parent:" section in child
  update_inherited_context "$CHILD_SPEC" "$PARENT_CONTEXT"

  # Commit change
  git add "$CHILD_SPEC"
  git commit -m "docs(flow): cascade update from parent to $PARENT/$CHILD

Parent changes applied:
- Architecture decisions updated
- Integration points refreshed

Impact: ${affected_children[$CHILD]}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

  # Remove backup
  rm "${CHILD_SPEC}.backup"

  return 0
}

detect_conflicts() {
  local PARENT="$1"
  local CHILD="$2"
  local PARENT_CONTEXT="$3"
  local CHILD_SPEC="specs/${PARENT}/${CHILD}/SPEC.md"

  # Extract child's Implementation Decisions
  CHILD_DECISIONS=$(sed -n '/### Implementation Decisions/,/^### /p' "$CHILD_SPEC" | head -n -1)

  # Check if child's decisions conflict with parent's new decisions
  # (Simple approach: check for overlapping topics)

  # Extract new parent decisions (from git diff)
  NEW_PARENT_DECISIONS=$(echo "$PARENT_CONTEXT" | sed -n '/### Implementation Decisions/,/^### /p')

  # Detect overlap
  # (Would implement more sophisticated conflict detection)

  return 0  # No conflict
}

update_inherited_context() {
  local CHILD_SPEC="$1"
  local PARENT_CONTEXT="$2"

  # Find Context section in child
  # Update or add "Inherited from parent:" subsection
  # (Implementation would use Edit tool to update)

  return 0
}
```

### 9. Handle Conflicts

When conflicts detected:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► CONFLICT DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Child:** specs/{parent}/{child}/SPEC.md

**Conflict:**
Parent architecture change conflicts with child's specific decisions.

**Parent says:**
{parent architecture decision}

**Child says:**
{child specific decision}

───────────────────────────────────────────────────────
```

```
## ▶ How to Resolve?

Use AskUserQuestion:
- header: "Conflict resolution"
- question: "How should we resolve this conflict?"
- options:
  - "Keep parent decision" — Override child (recommended if parent is authoritative)
  - "Keep child decision" — Child remains as-is (ignore parent change)
  - "Edit manually" — Let me resolve this myself
```

### 10. Re-planning Check

After updates complete:

```bash
NEEDS_REPLAN=()

for CHILD in "${!affected_children[@]}"; do
  IMPACT="${affected_children[$CHILD]}"

  if [ "$IMPACT" = "high" ] && [ -f "specs/${PARENT}/${CHILD}/PLAN.md" ]; then
    NEEDS_REPLAN+=("$CHILD")
  fi
done

if [ ${#NEEDS_REPLAN[@]} -gt 0 ]; then
  echo ""
  echo "⚠ Some children have high-impact changes and existing plans"
  echo "  Plans may be invalid and need updating"
fi
```

```
## ▶ Re-planning Needed?

Some children have high-impact changes. Re-plan to incorporate new architecture?

Use AskUserQuestion:
- header: "Re-planning"
- question: "Re-plan affected children?"
- multiSelect: true
- options:
  {for each child in NEEDS_REPLAN:}
  - "{child}" — Re-plan (has high-impact changes)
  - "Skip" — Keep existing plans
```

### 11. Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► CASCADE COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Parent:** {parent}
**Children updated:** {N}/{Total}
**Conflicts:** {N} (resolved or flagged)
**Re-planning:** {N} children

### Updates Applied
✓ {child1} - Architecture decisions updated
✓ {child2} - Integration points refreshed
⚠ {child3} - Conflict flagged for manual review

### Next Steps
{If re-planning needed:}
Re-plan affected children:
  /flow:plan {parent}/{child1}
  /flow:plan {parent}/{child2}

{If conflicts exist:}
Resolve conflicts manually:
  Edit specs/{parent}/{child3}/SPEC.md

───────────────────────────────────────────────────────
```

</process>

## Automatic Trigger Integration

This cascade should automatically trigger:

1. **After parent discussion** - When `/flow:discuss parent --force` completes and changes SPEC.md
2. **After manual edit** - User edits parent SPEC.md directly (detected via git commit)

Integration points in discuss workflow:
- After parent SPEC.md committed
- Before post-discussion gate
- Only if children exist

## Success Criteria

- [ ] Parent changes detected and analyzed
- [ ] Affected children identified with impact levels
- [ ] Changes presented clearly to user
- [ ] Cascade gate offered with options
- [ ] Updates applied (auto or manual approval)
- [ ] Conflicts detected and flagged
- [ ] Re-planning offered when needed
- [ ] Summary provided
- [ ] Commits created for each child update
