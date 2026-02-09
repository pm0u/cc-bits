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
  - AskUserQuestion
---

# Flow: Discuss

Create or update a SPEC.md through deep, adaptive discussion. Combines FUCKIT's thorough questioning with SENDIT's spec-driven clarity.

## References

@~/.claude/plugins/marketplaces/flow/flow/workflows/discuss.md
@~/.claude/plugins/marketplaces/flow/flow/references/spec-format.md
@~/.claude/plugins/marketplaces/flow/flow/references/gates.md
@~/.claude/plugins/marketplaces/flow/agents/discusser.md

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

### 1. Parse and Validate

```bash
ARGUMENTS="$1"
FORCE=false

# Check for --force flag
if [[ "$ARGUMENTS" == *"--force"* ]]; then
  FORCE=true
  ARGUMENTS=$(echo "$ARGUMENTS" | sed 's/--force//g' | xargs)
fi

# Extract feature name
FEATURE=$(echo "$ARGUMENTS" | awk '{print $1}')
DESCRIPTION=$(echo "$ARGUMENTS" | cut -d' ' -f2-)
if [ "$DESCRIPTION" = "$FEATURE" ]; then
  DESCRIPTION=""
fi

# Validate feature name
if [[ ! "$FEATURE" =~ ^[a-z0-9/-]+$ ]]; then
  echo "Error: Feature name must be lowercase alphanumeric with hyphens/slashes"
  exit 1
fi

# Determine type
if [[ "$FEATURE" == *"/"* ]]; then
  PARENT=$(dirname "$FEATURE")
  TYPE="child"
  SPEC_PATH="specs/${FEATURE}/SPEC.md"

  # Verify parent exists
  if [ ! -f "specs/${PARENT}/SPEC.md" ]; then
    echo "Error: Parent spec not found: specs/${PARENT}/SPEC.md"
    echo "Create parent first: /flow:discuss $PARENT"
    exit 1
  fi
else
  PARENT=""
  TYPE="single"
  SPEC_PATH="specs/${FEATURE}/SPEC.md"
fi
```

### 2. Check Existing Spec

```bash
if [ -f "$SPEC_PATH" ] && [ "$FORCE" != "true" ]; then
  STATUS=$(grep "^status:" "$SPEC_PATH" | awk '{print $2}')
  echo "Spec already exists: $SPEC_PATH (status: $STATUS)"
  echo ""
fi
```

Use AskUserQuestion:
- header: "Existing spec"
- question: "Spec exists. What do you want to do?"
- options:
  - "Update it" — Re-discuss and update
  - "View it" — Show me what's there
  - "Skip" — Use existing spec

Routing:
- "Update" → Continue
- "View" → Read SPEC.md, show, re-ask
- "Skip" → Jump to post-discussion gate

### 3. Load Parent Context

```bash
if [ "$TYPE" = "child" ]; then
  PARENT_SPEC="specs/${PARENT}/SPEC.md"

  # Extract parent context
  PARENT_CONTEXT=$(sed -n '/^## Context/,/^## Requirements/p' "$PARENT_SPEC" | head -n -1)

  echo "Inheriting context from: $PARENT_SPEC"
fi
```

### 4. Analyze and Identify Gray Areas

Analyze the feature based on:
- Feature name and description
- Domain (UI, API, data, etc.)
- Parent context (if child)
- Codebase patterns (read similar specs if they exist)

Generate 3-5 **domain-specific** gray areas:
- UI feature → Layout, interactions, states, responsive behavior
- API feature → Responses, errors, auth, versioning
- Data feature → Schema, validation, migrations, access patterns
- Auth feature → Token management, session handling, security policies

**NOT generic** categories like "technical implementation" or "error handling" - make them specific to THIS feature.

### 5. Present Gray Areas

```
## ▶ What Should We Discuss?

These areas need clarification before we can create a solid spec:

Use AskUserQuestion:
- header: "Gray areas"
- question: "Which areas should we discuss?"
- multiSelect: true
- options:
  - "{gray_area_1}" — {why it matters}
  - "{gray_area_2}" — {why it matters}
  - "{gray_area_3}" — {why it matters}
  - "{gray_area_4}" — {why it matters}
  (NO "Skip all" option - must discuss at least one)
```

### 6. Deep-Dive Each Selected Area

For each selected gray area:

```bash
AREA_NAME="$selected_area"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " FLOW ► $AREA_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask 4 questions specific to this area
# (Generate questions dynamically based on area)

# After 4 questions, check:
```

Use AskUserQuestion:
- header: "Continue?"
- question: "Ready to move on from {area}?"
- options:
  - "Move on" — Next area (Recommended)
  - "Ask more" — I have more to clarify

If "Ask more" → ask 4 more questions, check again
If "Move on" → next area or done

### 7. Scope Guardrail

**During discussion, watch for scope creep:**
- User adds new capabilities beyond original goal
- Feature expanding into multiple domains
- "And also..." or "Plus we need..." signals

When detected:
```
"That's a great idea, but it sounds like its own feature/phase.
Let me capture it in Deferred Ideas so we don't lose it,
but keep this spec focused on: {original goal}"
```

Capture in `DEFERRED_IDEAS` array for later.

### 8. Split Detection

After discussion, check if spec should split:
- Multiple distinct domains emerged
- More than 8 acceptance criteria forming
- Natural groupings (backend/frontend, API/UI/data)
- Sequential phases emerging

If split detected:

```
## ▶ Structure Recommendation

This feature seems to have distinct parts:
- {part1}: {description}
- {part2}: {description}
- {part3}: {description}

Use AskUserQuestion:
- header: "Organization"
- question: "How should we organize this?"
- options:
  - "Split into sub-specs" — Create parent + children (Recommended)
  - "Keep as one" — Single spec for all of this
```

If "Split":
1. Create parent SPEC.md with architecture/integration
2. Create child SPEC stubs
3. For each child, recursively call `/flow:discuss {feature}/{child}`

### 9. Create SPEC.md

```bash
# Build frontmatter
YAML_FRONT="---
name: ${FEATURE}
status: DRAFT
type: ${TYPE}"

if [ "$TYPE" = "child" ]; then
  YAML_FRONT="$YAML_FRONT
parent: ${PARENT}
depends_on: []"
fi

YAML_FRONT="$YAML_FRONT
---"

# Build Context section from discussion
IMPLEMENTATION_DECISIONS="$(format_decisions_from_discussion)"
DISCRETION="$(format_discretion_from_discussion)"
DEFERRED="$(format_deferred_ideas)"

# Build Requirements from discussion
REQUIREMENTS="$(extract_requirements_from_discussion)"

# Build Acceptance Criteria from discussion
ACCEPTANCE="$(generate_acceptance_criteria)"

# Create SPEC.md
cat > "$SPEC_PATH" <<EOF
$YAML_FRONT

## Context

### Implementation Decisions (Locked)

$IMPLEMENTATION_DECISIONS

### Claude's Discretion

$DISCRETION

### Deferred Ideas

$DEFERRED

## Requirements

$REQUIREMENTS

## Acceptance Criteria

$ACCEPTANCE

## Files

(To be added during implementation)

## Tests

(To be added during implementation)

EOF

# Set status based on whether there are OPEN items
if [ -n "$OPEN_ITEMS" ]; then
  sed -i '' 's/status: DRAFT/status: DRAFT/' "$SPEC_PATH"
  # Add OPEN section
  echo "" >> "$SPEC_PATH"
  echo "## OPEN" >> "$SPEC_PATH"
  echo "" >> "$SPEC_PATH"
  echo "$OPEN_ITEMS" >> "$SPEC_PATH"
else
  sed -i '' 's/status: DRAFT/status: ACTIVE/' "$SPEC_PATH"
fi
```

### 10. Commit Spec

```bash
git add "$SPEC_PATH"
git commit -m "docs(flow): discuss ${FEATURE}

Status: $(grep '^status:' "$SPEC_PATH" | awk '{print $2}')
Type: $TYPE

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 11. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 FLOW ► SPEC READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** {SPEC_PATH}
**Status:** {ACTIVE | DRAFT}
**Type:** {single | parent | child}

### What We Captured

**Implementation Decisions:**
{list decisions}

**Claude's Discretion:**
{list discretion areas}

**Deferred Ideas:** {N} captured

{If OPEN items:}
### ⚠ Needs Resolution
{list open items}

───────────────────────────────────────────────────────
```

### 12. Post-Discussion Gate

**If status == DRAFT:**

```
## ▶ Spec Has Open Items

Use AskUserQuestion:
- header: "Open items"
- question: "Spec has unresolved questions. How to proceed?"
- options:
  - "Resolve now" — Let's answer them
  - "Resolve later" — I'll edit manually
  - "Proceed anyway" — Continue (not recommended)
```

**If status == ACTIVE:**

```
## ▶ What's Next?

Use AskUserQuestion:
- header: "Next step"
- question: "How do you want to proceed?"
- options:
  - "Continue" — Proceed to planning (Recommended)
  - "Discuss more" — Refine the spec
  - "Plan without research" — Skip research
```

Routing:
- "Continue" → `/flow:plan {FEATURE}`
- "Discuss more" → Re-run discussion
- "Plan without research" → `/flow:plan {FEATURE} --skip-research`

</process>

## Key Patterns

**Adaptive Questioning:**
- 4 questions per area before checking
- Domain-specific, not generic
- Build on previous answers

**Scope Guardrails:**
- Redirect scope creep to Deferred Ideas
- Keep spec focused on original goal
- Don't lose ideas, don't act on them now

**Split Detection:**
- Offer when natural groupings emerge
- User always chooses (recommended when appropriate)
- Recursively discuss children if split

**Context Inheritance:**
- Child specs inherit parent Architecture Decisions
- Child adds own Implementation Decisions
- Child sets dependencies and phase labels

## Success Criteria

- [ ] Gray areas identified and discussed
- [ ] Scope creep captured, not acted on
- [ ] SPEC.md created with all sections
- [ ] Status is DRAFT (with OPEN) or ACTIVE
- [ ] For parent: children created and discussed
- [ ] For child: parent context inherited
- [ ] Committed to git
- [ ] User knows next steps
