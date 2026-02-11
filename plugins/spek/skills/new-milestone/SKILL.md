---
name: spek:new-milestone
description: Generate roadmap from SPEC.md and initialize development workflow
argument-hint: "[feature name or path to SPEC.md]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

<objective>
Bridge from spec-driven requirements (SPEC.md) to shipit development workflow.

**Reads:** `specs/{feature}/SPEC.md` (created by spek:define)
**Creates:**
- `.planning/` directory structure
- `.planning/PROJECT.md` (derived from SPEC.md)
- `.planning/ROADMAP.md` (phases from SPEC requirements)
- `.planning/STATE.md` (initial state)

**After this command:** Run `/spek:go` to begin phase execution.
</objective>

<execution_context>
@~/.claude/plugins/marketplaces/spek/spek/references/spec-format.md
@~/.claude/plugins/marketplaces/spek/spek/templates/roadmap.md
</execution_context>

<context>
Feature name: $ARGUMENTS (optional - will prompt if not provided)

**Expects:**
- `specs/` directory exists
- At least one SPEC.md file in `specs/{feature}/SPEC.md`
- SPEC.md has status: ACTIVE (not DRAFT)
</context>

<process>

### 1. Find SPEC Files

```bash
INPUT="$1"

# Check if specs/ directory exists
if [ ! -d "specs" ]; then
  echo "Error: No specs/ directory found"
  echo "Run /spek:define first to create your spec"
  exit 1
fi
```

**If INPUT provided:**

```bash
if [[ "$INPUT" == specs/* ]]; then
  # Full path provided: specs/feature/SPEC.md
  SPEC_PATH="$INPUT"
elif [[ -f "specs/${INPUT}/SPEC.md" ]]; then
  # Feature name provided: feature
  SPEC_PATH="specs/${INPUT}/SPEC.md"
else
  echo "Error: SPEC not found at: specs/${INPUT}/SPEC.md"
  exit 1
fi

FEATURE="$INPUT"
```

**If no INPUT provided:**

```bash
# Find all SPEC.md files
SPEC_FILES=($(find specs -name "SPEC.md" -type f))

if [ ${#SPEC_FILES[@]} -eq 0 ]; then
  echo "Error: No SPEC.md files found in specs/"
  echo "Run /spek:define first"
  exit 1
elif [ ${#SPEC_FILES[@]} -eq 1 ]; then
  # Single spec, use it
  SPEC_PATH="${SPEC_FILES[0]}"
  FEATURE=$(dirname "$SPEC_PATH" | sed 's|specs/||')
else
  # Multiple specs - ask user which one
```

**Use AskUserQuestion:**
- header: "Select spec"
- question: "Which spec should we use for the roadmap?"
- options: (list each spec with its summary line)

Store selected in SPEC_PATH and FEATURE variables.

```bash
fi
```

### 2. Validate SPEC Status

```bash
# Read spec status
SPEC_STATUS=$(grep "^## Status" "$SPEC_PATH" | tail -1 | xargs)

if [[ "$SPEC_STATUS" == *"DRAFT"* ]]; then
  echo "Error: SPEC is in DRAFT status (has OPEN items)"
  echo "Resolve OPEN items in $SPEC_PATH before creating roadmap"
  echo ""
  echo "Options:"
  echo "- Edit $SPEC_PATH manually"
  echo "- Run /spek:define $FEATURE --force to re-discuss"
  exit 1
fi

echo "✓ Found SPEC: $SPEC_PATH (status: ACTIVE)"
echo ""
```

### 3. Check for Child Specs

```bash
# Check if this is a parent spec with children
SPEC_DIR=$(dirname "$SPEC_PATH")
CHILDREN=($(find "$SPEC_DIR" -mindepth 1 -maxdepth 1 -type d))

if [ ${#CHILDREN[@]} -gt 0 ]; then
  echo "Detected parent spec with ${#CHILDREN[@]} children"
  echo ""
  HAS_CHILDREN=true
else
  HAS_CHILDREN=false
fi
```

### 4. Read SPEC Content

```bash
# Extract key sections from SPEC.md
SPEC_CONTENT=$(cat "$SPEC_PATH")

# Extract summary
SUMMARY=$(grep "^>" "$SPEC_PATH" | head -1 | sed 's/^> //')

# Extract must-have requirements (for phase breakdown)
MUST_HAVES=$(sed -n '/^### Must Have/,/^### /p' "$SPEC_PATH" | grep "^- \[ \]" | sed 's/^- \[ \] //')

# Extract acceptance criteria (for success metrics)
ACCEPTANCE=$(sed -n '/^## Acceptance Criteria/,/^## /p' "$SPEC_PATH" | grep "^- \[ \]")

# Count for phase estimation
NUM_REQUIREMENTS=$(echo "$MUST_HAVES" | wc -l | tr -d ' ')
NUM_CRITERIA=$(echo "$ACCEPTANCE" | wc -l | tr -d ' ')

echo "Requirements: $NUM_REQUIREMENTS must-haves"
echo "Acceptance Criteria: $NUM_CRITERIA conditions"
echo ""
```

### 5. Initialize .planning Structure

```bash
# Create .planning directory if needed
if [ ! -d ".planning" ]; then
  mkdir -p .planning/phases
  echo "✓ Created .planning/ structure"
fi

# Create or update PROJECT.md from SPEC.md
```

**Generate PROJECT.md content:**

```markdown
# {Feature Name from SPEC}

> {Summary line from SPEC}

## What We're Building

{Context section from SPEC - why this exists, what problem it solves}

## Current Milestone: v1.0 {Feature Name}

**Goal:** {Summary from SPEC}

**Target features:**
{Must-have requirements from SPEC}

## Requirements

### Active

{Must-have requirements from SPEC as checklist}

### Deferred

{Should-have and Won't-have from SPEC}

## Success Criteria

{Acceptance criteria from SPEC}

## Implementation Decisions (From SPEC)

{Implementation Decisions section from SPEC.md Context}

---
*Generated from specs/{feature}/SPEC.md by spek:new-milestone*
*Last updated: {timestamp}*
```

Write to `.planning/PROJECT.md`

### 6. Generate Roadmap from Requirements

Analyze requirements and break into phases:

**Phase estimation heuristics:**
- 1-3 requirements → Single phase
- 4-6 requirements → 2-3 phases (setup/core/polish)
- 7+ requirements → 3-5 phases (logical groupings)

**For parent specs with children:**
- Each child becomes a phase (or phase group)
- Check child SPEC.md files for their requirements
- Order by dependencies

**Phase breakdown principles:**
- Foundation first (data models, core logic)
- Then features (UI, API, workflows)
- Then polish (error handling, edge cases, optimization)

**Use Task tool to spawn roadmapper agent:**

```
Task(
  prompt="Create ROADMAP.md from SPEC.md

<spec_path>$SPEC_PATH</spec_path>

<spec_content>
$SPEC_CONTENT
</spec_content>

<has_children>$HAS_CHILDREN</has_children>

<instructions>
Generate ROADMAP.md by breaking requirements into 3-5 phases.

1. Read must-have requirements from SPEC.md
2. Read acceptance criteria
3. Read design decisions (technical constraints)
4. Group requirements into logical phases
5. For each phase:
   - Clear goal statement
   - List requirements it delivers
   - Success criteria
   - Dependencies on previous phases

Output format:
# Roadmap: {feature}

## Overview

**Milestone:** v1.0 {feature}
**Phases:** {N}

## Phases

### Phase 1: {name}

**Goal:** {one sentence}

**Delivers:**
- {requirement 1}
- {requirement 2}

**Success criteria:**
- {criterion from SPEC}

**Dependencies:** None

...repeat for each phase...
</instructions>

Output file: .planning/ROADMAP.md
",
  subagent_type="spek:roadmapper",
  model="opus",
  description="Generate roadmap from $FEATURE"
)
```

### 7. Initialize STATE.md

```bash
# Get first phase number from ROADMAP
FIRST_PHASE=$(grep "^### Phase [0-9]" .planning/ROADMAP.md | head -1 | grep -o "[0-9]*")

cat > .planning/STATE.md <<EOF
## Current Position

Phase: $FIRST_PHASE
Plan: Not started
Status: Ready to plan

## Milestone

v1.0 ${FEATURE}

## Last Action

\$(date '+%Y-%m-%d %H:%M'): Roadmap created from specs/${FEATURE}/SPEC.md

## History

- Roadmap generated from SPEC.md
- Ready for phase planning

---
*Generated by spek:new-milestone*
EOF

echo "✓ Created STATE.md (starting at Phase $FIRST_PHASE)"
```

### 8. Commit Everything

```bash
git add .planning/ specs/
git commit -m "docs(spek): generate roadmap from ${FEATURE} spec

Created .planning structure and ROADMAP.md from:
- specs/${FEATURE}/SPEC.md

Milestone: v1.0 ${FEATURE}
Phases: $(grep -c "^### Phase" .planning/ROADMAP.md)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo ""
echo "✓ Committed roadmap and planning structure"
```

### 9. Present Summary

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► Roadmap Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** specs/{feature}/SPEC.md
**Roadmap:** .planning/ROADMAP.md
**Phases:** {N} phases

### Phase Breakdown

{List phases with their goals}

───────────────────────────────────────────────────────
```

### 10. Auto-Route to Execution

```
## ▶ Ready for Development

Your roadmap is ready! Let's start building.
```

**Use AskUserQuestion:**
- header: "Next step"
- question: "How do you want to proceed?"
- options:
  - "Start execution" — Run /spek:go to begin Phase 1 (Recommended)
  - "Review roadmap first" — I'll check .planning/ROADMAP.md
  - "Modify roadmap" — I'll edit before starting

If "Start execution" → `Skill(skill: "spek:go")`
If "Review roadmap first" → Exit with message: "Run /spek:go when ready"
If "Modify roadmap" → Exit with instructions for manual editing

</process>

<success_criteria>
- [ ] Found and validated SPEC.md (status: ACTIVE)
- [ ] Created .planning/ structure
- [ ] Generated PROJECT.md from SPEC.md
- [ ] Generated ROADMAP.md with phases from requirements
- [ ] Created STATE.md with initial position
- [ ] Committed all files
- [ ] User knows next step (/spek:go)
</success_criteria>
