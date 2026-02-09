---
name: spek:define
description: Create comprehensive SPEC.md through interactive discussion, then route to development flow
argument-hint: "<description or @file>"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Skill
---

<objective>
Transform a feature idea or PROJECT.md into a comprehensive SPEC.md ("base spek state") through adaptive questioning. Then automatically route to development flow.

**How it works:**
1. Analyze input (description or file) to understand what's being built
2. Identify domain-specific gray areas
3. Interactive discussion using AskUserQuestion
4. Detect if feature should split into hierarchical specs
5. Create SPEC.md with all sections ("base spek state")
6. Auto-route to /spek:new-milestone to begin development

**Output:** `specs/{feature}/SPEC.md` + automatic routing to fuckit workflow
</objective>

<execution_context>
@~/.claude/plugins/marketplaces/spek/spek/references/spec-format.md
@~/.claude/plugins/marketplaces/spek/spek/templates/spec.md
</execution_context>

<context>
Input can be:
- Freeform description: "build app for grocery lists"
- File reference: @docs/PROJECT.md
- Detailed specification

The goal is "base spek state" - SPEC.md comprehensive enough to feed into fuckit workflow.
</context>

<process>

### 1. Parse Input

```bash
INPUT="$1"

# Check if input is file reference
if [[ "$INPUT" == @* ]]; then
  FILE_PATH="${INPUT:1}"  # Remove @ prefix

  # Read file content
  if [ -f "$FILE_PATH" ]; then
    CONTENT=$(cat "$FILE_PATH")
    echo "Loaded: $FILE_PATH"
  else
    echo "Error: File not found: $FILE_PATH"
    exit 1
  fi
else
  CONTENT="$INPUT"
fi
```

Output to user:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► Define
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Extract Feature Name

```bash
# Generate feature name from content (simple heuristic)
# User can refine later if needed

FEATURE_NAME=$(echo "$CONTENT" | head -5 | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | awk '{for(i=1;i<=3 && i<=NF;i++) printf "%s%s", (i>1?"-":""), $i}')

# Clean up
FEATURE_NAME=$(echo "$FEATURE_NAME" | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
```

Output extracted feature name to user.

**Present to user via AskUserQuestion:**
- header: "Feature name"
- question: "What should we call this feature?"
- options:
  - "$FEATURE_NAME (Recommended)" — Use extracted name
  - "Other" — I'll provide a different name

If "Other" selected, prompt for custom name via follow-up AskUserQuestion.

Set final FEATURE variable.

```bash
SPEC_PATH="specs/${FEATURE}/SPEC.md"
SPEC_DIR="specs/${FEATURE}"

# Check if spec already exists
if [ -f "$SPEC_PATH" ]; then
```

**Use AskUserQuestion:**
- header: "Existing spec"
- question: "A spec already exists at $SPEC_PATH. How to proceed?"
- options:
  - "Update it" — Re-discuss and update (Recommended)
  - "View it first" — Show me what's there
  - "Abort" — Cancel, I'll handle manually

If "View" → Read and display SPEC.md, then re-ask
If "Update" → Continue with discussion
If "Abort" → Exit

```bash
fi
```

### 3. Analyze Feature & Identify Gray Areas

Analyze the input content to understand:
- **Domain** - What's being built? (UI, API, data, workflow, etc.)
- **Complexity** - Simple single-spec or complex multi-part?
- **Gray areas** - What decisions would change the outcome?

**Generate 3-4 domain-specific gray areas** (NOT generic):

**Domain patterns:**
- Something users SEE (UI/UX): Layout, density, interactions, states, visual feedback
- Something users CALL (API): Responses, errors, auth, versioning, rate limiting
- Something users RUN (CLI/tool): Output format, flags, modes, error handling
- Something users READ (docs/content): Structure, tone, depth, examples
- Something being ORGANIZED (data/workflow): Criteria, grouping, naming, exceptions

**Example (for "trail pages migration"):**
- URL structure and routing approach
- Data fetching and caching strategy
- Page template structure and components
- Authentication and premium content handling

**NOT generic like:**
- ❌ "Technical implementation"
- ❌ "UI/UX decisions"
- ❌ "Error handling"

### 4. Present Gray Areas (Multi-Select)

```
## ▶ Discussion Areas

Based on your feature, these areas need clarification:

{generated_area_1}: {why it matters}
{generated_area_2}: {why it matters}
{generated_area_3}: {why it matters}
{generated_area_4}: {why it matters}
```

**Use AskUserQuestion:**
- header: "Gray areas"
- question: "Which areas do you want to discuss?"
- multiSelect: true
- options:
  - "{area_1}" — {why it matters}
  - "{area_2}" — {why it matters}
  - "{area_3}" — {why it matters}
  - "{area_4}" — {why it matters}

NO "Skip all" option - user invoked this command to discuss.

Store selected areas in array: SELECTED_AREAS

### 5. Deep-Dive Each Selected Area

For each area in SELECTED_AREAS:

Output section header to user:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► {AREA_NAME}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask 4 questions specific to this area. Generate questions dynamically based on area and content.

Present concrete options, include "You decide" when reasonable. Build on previous answers (adaptive, not scripted).

**Question design principles:**
- Present concrete options to react to (not fully open-ended)
- Include "You decide" or "Claude's discretion" option
- Build on previous answers
- Make abstract concrete: "Walk me through...", "Give example..."

**After 4 questions per area:**

**Use AskUserQuestion:**
- header: "Continue?"
- question: "More questions about {area}, or move to next?"
- options:
  - "Move to next area" — Continue (Recommended)
  - "Ask 4 more questions" — I need more clarity

If "Ask 4 more" → ask 4 more questions about same area, check again
If "Move to next" → proceed to next selected area

After all areas discussed, continue to next step.

### 6. Scope Guardrail (Active During Discussion)

**CRITICAL: Feature boundary is FIXED from original input.**

During discussion, watch for scope creep signals:
- "And we should also add..."
- "Plus we need..."
- New capabilities beyond original description

**When detected, redirect:**

```
"That's a great idea, but it sounds like a separate feature.
Let me capture it in Deferred Ideas so we don't lose it,
but keep this spec focused on: {original goal}"
```

Capture in DEFERRED_IDEAS array for later inclusion.

### 7. Split Detection

After discussion, analyze if spec should split:

**Split signals:**
- Multiple distinct domains emerged (API + UI + data)
- >8 acceptance criteria forming
- Natural sub-groupings appearing
- Sequential phases becoming clear

If split detected:

```
## ▶ Feature Structure

This feature has distinct parts that could be separate specs:

- {feature}/api - {description}
- {feature}/ui - {description}
- {feature}/data - {description}

This allows parallel work and clearer ownership.
```

**Use AskUserQuestion:**
- header: "Organization"
- question: "Should we split this into hierarchical specs?"
- options:
  - "Yes, create parent + children" — Recommended for complex features
  - "No, keep as single spec" — I'll manage the complexity

**If "Yes, create parent + children":**
1. Create parent SPEC.md at specs/{feature}/SPEC.md
   - High-level overview
   - Architecture decisions that apply to all children
   - Integration points
   - Phase structure

2. For each identified child:
   - Recursively invoke: `Skill(skill: "spek:define", args: "{feature}/{child}")`
   - Each child gets its own discussion session
   - Children inherit parent architecture decisions

**If "No, keep as single spec":**
- Continue with single SPEC.md

### 8. Create SPEC.md

```bash
# Create specs directory if needed
mkdir -p "specs/${FEATURE}"

# Build SPEC.md content from discussion
```

**SPEC.md structure (from template):**

```markdown
# {Feature Name}

> {One-line summary}

## Status

{DRAFT or ACTIVE - based on OPEN items}

## Context

### Implementation Decisions (Locked)

{Explicit user choices from discussion}
{Technical constraints they specified}
{Specific behaviors they want}
{"Must have" items}

### Claude's Discretion

{"You decide" responses}
{Implementation details user doesn't care about}
{Technical choices delegated to Claude}

### Deferred Ideas

{Captured scope creep - noted but not acted on}
{Features for future versions}
{"Maybe later" items}

## Requirements

### Must Have
- [ ] {From discussion}

### Should Have
- [ ] {From discussion}

### Won't Have (this iteration)
- {Explicitly out of scope}

## Acceptance Criteria

- [ ] Given {precondition}, when {action}, then {expected result}
{Generate from discussion - testable conditions}

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
{From discussion}

## OPEN

{Unresolved questions - only if exist}
{If OPEN section exists → status: DRAFT}
{If no OPEN items → status: ACTIVE}

## Dependencies

{Optional - add if mentioned during discussion}

## Files

{Empty - will be populated during implementation}

## Test Files

{Empty - will be populated during implementation}
```

**Write SPEC.md:**

```bash
cat > "$SPEC_PATH" <<'EOF'
{generated content}
EOF

echo "✓ Created: $SPEC_PATH"
echo ""
```

### 9. Check Ready Gate

**If OPEN items exist (status: DRAFT):**

```
## ▶ Spec Has Unresolved Questions

The spec has OPEN items that need resolution before development.
```

**Use AskUserQuestion:**
- header: "Open items"
- question: "How do you want to proceed?"
- options:
  - "Resolve now" — Let's discuss them (Recommended)
  - "Resolve later" — I'll edit SPEC.md manually
  - "Proceed anyway" — Continue to planning (not recommended)

If "Resolve now" → Loop back to discussion for OPEN items
If "Resolve later" → Continue to commit
If "Proceed anyway" → Continue to commit (warn that planning may be blocked)

### 10. Commit SPEC.md

```bash
git add "$SPEC_PATH"
git commit -m "docs(spek): define ${FEATURE}

Status: $(grep '^## Status' "$SPEC_PATH" | tail -1 | xargs)
Created via /spek:define

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo "✓ Committed: $SPEC_PATH"
echo ""
```

### 11. Present Summary

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 SPEK ► SPEC READY ("Base Spek State")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Spec:** {SPEC_PATH}
**Status:** {ACTIVE | DRAFT}
**Type:** {single | parent with N children}

### What We Captured

**Implementation Decisions (Locked):**
- {list key decisions}

**Claude's Discretion:**
- {list discretion areas}

**Deferred Ideas:** {N} captured

**Requirements:**
- Must: {N}
- Should: {N}
- Won't: {N}

**Acceptance Criteria:** {N} testable conditions

{If OPEN items:}
### ⚠ Needs Resolution
- {list open items}

───────────────────────────────────────────────────────
```

### 12. Auto-Route to Development Flow

**If status == ACTIVE (ready for development):**

```
## ▶ Ready for Development

Your spec is ready! Proceeding to create development roadmap...
```

**Use AskUserQuestion:**
- header: "Next step"
- question: "Start development planning?"
- options:
  - "Yes, create roadmap" — Proceed to /spek:new-milestone (Recommended)
  - "No, I'll review first" — Stop here

If "Yes" → `Skill(skill: "spek:new-milestone")`
If "No" → Exit with message: "Run /spek:new-milestone when ready"

**If status == DRAFT (has OPEN items):**

```
## ▶ Spec Not Ready

The spec has unresolved OPEN items. Resolve them before planning.

You can:
- Edit specs/{FEATURE}/SPEC.md manually
- Re-run /spek:define {FEATURE} --force to re-discuss
- Run /spek:new-milestone when OPEN items are resolved
```

Exit without routing.

</process>

<success_criteria>
- [ ] Input parsed (file or description)
- [ ] Feature name determined
- [ ] Domain-specific gray areas identified
- [ ] Interactive discussion with AskUserQuestion (multi-select + deep-dive)
- [ ] Scope guardrail enforced (deferred ideas captured)
- [ ] Split detection offered (for complex features)
- [ ] SPEC.md created in "base spek state"
- [ ] All sections populated (Context, Requirements, Acceptance Criteria, etc.)
- [ ] Status correct (ACTIVE or DRAFT based on OPEN items)
- [ ] Committed to git
- [ ] Auto-routed to development flow (if ready)
</success_criteria>
