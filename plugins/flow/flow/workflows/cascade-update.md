# Cascade Update Workflow

Propagate parent spec changes to child specs automatically.

## Purpose

When a parent SPEC.md changes, child specs inherit those changes. This workflow:
- Detects affected children
- Shows what changed in parent
- Updates children automatically or with approval
- Flags conflicts requiring manual resolution
- Offers to re-plan if changes are significant

## Triggers

### Automatic Triggers
1. **After parent discussion** - `/flow:discuss parent --force`
2. **Manual spec edit** - User edits parent SPEC.md directly
3. **After parent planning** - New architecture decisions added

### Manual Trigger
```bash
/flow:cascade parent
```

## Process

### 1. Detect Parent Changes

```bash
PARENT="$1"

# Get list of children
CHILDREN=$(find "specs/${PARENT}" -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)

if [ -z "$CHILDREN" ]; then
  echo "No children found for $PARENT"
  exit 0
fi

echo "Found $(echo "$CHILDREN" | wc -l) children"

# Get parent SPEC.md last commit
PARENT_SPEC="specs/${PARENT}/SPEC.md"
LAST_COMMIT=$(git log -1 --format=%H "$PARENT_SPEC")

# Check what changed in parent
PARENT_CHANGES=$(git show "$LAST_COMMIT" "$PARENT_SPEC")
```

### 2. Analyze Changes

Detect what sections changed:

```bash
# Check if Architecture Decisions changed
if echo "$PARENT_CHANGES" | grep -q "^+.*## Architecture Decisions"; then
  ARCH_CHANGED=true
  echo "Architecture Decisions changed"
fi

# Check if Integration Points changed
if echo "$PARENT_CHANGES" | grep -q "^+.*## Integration Points"; then
  INTEGRATION_CHANGED=true
  echo "Integration Points changed"
fi

# Check if Phases changed
if echo "$PARENT_CHANGES" | grep -q "^+.*phases:"; then
  PHASES_CHANGED=true
  echo "Phase labels changed"
fi
```

### 3. Identify Affected Children

For each child, determine impact:

```bash
declare -A affected_children

for CHILD in $CHILDREN; do
  CHILD_SPEC="specs/${PARENT}/${CHILD}/SPEC.md"

  # Check if child exists
  [ ! -f "$CHILD_SPEC" ] && continue

  # Determine impact level
  IMPACT="none"

  if [ "$ARCH_CHANGED" = true ]; then
    # Architecture changes affect all children
    IMPACT="high"
  elif [ "$INTEGRATION_CHANGED" = true ]; then
    # Check if this child is mentioned in integration points
    if grep -q "$CHILD" "specs/${PARENT}/SPEC.md"; then
      IMPACT="medium"
    fi
  elif [ "$PHASES_CHANGED" = true ]; then
    # Phase changes are cosmetic
    IMPACT="low"
  fi

  if [ "$IMPACT" != "none" ]; then
    affected_children["$CHILD"]="$IMPACT"
    echo "  $CHILD: $IMPACT impact"
  fi
done
```

### 4. Present Changes

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► PARENT SPEC UPDATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Parent:** specs/{parent}/SPEC.md

### Changes Detected

{If ARCH_CHANGED:}
**Architecture Decisions:**
{Show added/modified/removed architecture decisions}

{If INTEGRATION_CHANGED:}
**Integration Points:**
{Show changes to integration points}

{If PHASES_CHANGED:}
**Phases:**
{Show phase reorganization}

### Affected Children

**High Impact** (must update):
- {child1} - Architecture decisions changed
- {child2} - New constraints added

**Medium Impact** (should review):
- {child3} - Integration points changed

**Low Impact** (optional):
- {child4} - Phase labels updated

───────────────────────────────────────────────────────
```

### 5. Cascade Update Gate

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

### 6. Update Children

Based on user choice:

#### Option A: Update All Automatically

```bash
for CHILD in "${!affected_children[@]}"; do
  echo ""
  echo "Updating: $PARENT/$CHILD"

  update_child_spec "$PARENT" "$CHILD" "$PARENT_CHANGES"

  if [ $? -eq 0 ]; then
    echo "✓ Updated successfully"
  else
    echo "✗ Conflict detected - needs manual review"
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
  show_proposed_changes "$PARENT" "$CHILD" "$PARENT_CHANGES"

  # Ask for approval
  # AskUserQuestion: Apply | Skip | Edit manually
done
```

### 7. Update Child SPEC.md

Function to update a child spec:

```bash
update_child_spec() {
  local PARENT="$1"
  local CHILD="$2"
  local CHANGES="$3"

  local CHILD_SPEC="specs/${PARENT}/${CHILD}/SPEC.md"
  local BACKUP="${CHILD_SPEC}.backup"

  # Backup current version
  cp "$CHILD_SPEC" "$BACKUP"

  # Extract new architecture decisions from parent
  NEW_ARCH=$(sed -n '/^## Architecture Decisions/,/^## /p' "specs/${PARENT}/SPEC.md" | head -n -1)

  # Check if child has its own architecture section
  if grep -q "^## Architecture" "$CHILD_SPEC"; then
    # Child has architecture - check for conflicts
    CHILD_ARCH=$(sed -n '/^## Architecture/,/^## /p' "$CHILD_SPEC" | head -n -1)

    # Simple conflict detection: if child mentions same topics as parent changes
    if echo "$CHILD_ARCH" | grep -qF "$(echo "$NEW_ARCH" | grep '^-')"; then
      echo "⚠ Potential conflict detected"
      return 1
    fi
  fi

  # Update child spec
  # (Implementation would do smart merge)

  # Commit change
  git add "$CHILD_SPEC"
  git commit -m "docs(flow): cascade update from parent to $PARENT/$CHILD

Parent changes applied:
- Architecture decisions updated
- Integration points refreshed

Impact: ${affected_children[$CHILD]}
"

  # Remove backup
  rm "$BACKUP"

  return 0
}
```

### 8. Detect Conflicts

When automatic update fails:

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

**Options:**
1. Keep parent decision (override child)
2. Keep child decision (ignore parent change)
3. Merge manually (edit child SPEC.md)

───────────────────────────────────────────────────────
```

### 9. Re-planning Check

After updates, check if re-planning needed:

```bash
for CHILD in "${!affected_children[@]}"; do
  IMPACT="${affected_children[$CHILD]}"

  if [ "$IMPACT" = "high" ] && [ -f "specs/${PARENT}/${CHILD}/PLAN.md" ]; then
    echo ""
    echo "⚠ $PARENT/$CHILD has high-impact changes"
    echo "  Existing plan may be invalid"
    echo ""
    # Offer to re-plan
  fi
done
```

```
## ▶ Re-planning Needed?

Some children have high-impact changes and existing plans.
Re-plan to incorporate new architecture?

Use AskUserQuestion:
- header: "Re-planning"
- question: "Re-plan affected children?"
- multiSelect: true
- options:
  - "{child1}" — Re-plan (has high-impact changes)
  - "{child2}" — Re-plan (architecture changed)
  - "Skip" — Keep existing plans
```

### 10. Summary

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

## Smart Merge Logic

### Architecture Decisions

**Parent adds new decision:**
```
Parent: "- Use Redis for caching"
Child: (doesn't mention caching)
Result: Add to child's inherited context
```

**Parent modifies existing decision:**
```
Parent: "- Token expiry: 24h" → "- Token expiry: 1h"
Child: (inherits this)
Result: Update child's context, flag if child has specific implementation
```

**Parent removes decision:**
```
Parent: Removes "- Use sessions"
Child: (was inheriting this)
Result: Remove from child, flag if child references it in implementation
```

### Conflict Resolution

**Child has specific decision that conflicts:**
```
Parent: "Use JWT tokens"
Child: "Implementation Decision: Use sessions for simplicity"
Result: CONFLICT - child explicitly chose different approach
Action: Ask user which to keep
```

**Child builds on parent decision:**
```
Parent: "Use JWT tokens, 1-hour expiry"
Child: "Implementation Decision: Token refresh rotation enabled"
Result: No conflict - child adds specifics
Action: Keep both (child extends parent)
```

## Integration with Discuss

When running `/flow:discuss parent --force`:

1. Discussion completes
2. Check if children exist
3. If yes, automatically trigger cascade update
4. Present cascade gate
5. Update children as directed
6. Continue to post-discussion gate

## Integration with Manual Edits

Git hook (optional) to detect parent SPEC.md changes:

```bash
# In .git/hooks/post-commit
if git diff-tree --no-commit-id --name-only -r HEAD | grep -q "specs/.*/SPEC.md"; then
  # Check if it's a parent spec
  CHANGED_SPEC=$(git diff-tree --no-commit-id --name-only -r HEAD | grep "specs/.*/SPEC.md")

  # If it has children, suggest cascade
  echo "Tip: Parent spec changed. Run: /flow:cascade {parent}"
fi
```

## Success Criteria

- [ ] Parent changes detected
- [ ] Affected children identified
- [ ] Impact levels assigned (high/medium/low)
- [ ] Changes shown clearly
- [ ] User approval obtained
- [ ] Children updated (auto or manual)
- [ ] Conflicts detected and flagged
- [ ] Re-planning offered when needed
- [ ] Summary provided
- [ ] Commits created for updates
